"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { bacaSesi, wajibPemilik, wajibStafAtauPemilik } from "@/lib/auth";
import { punyaAksesPesanan, tandaiPesananMilikSaya } from "@/lib/akses-pesanan";
import { bolehPindahStatus } from "@/lib/pesanan";
import { SkemaIsiPesanan, buatPesananBaru } from "@/lib/pesanan-server";
import { pesanGalat } from "@/lib/galat";
import { catatPembayaran } from "@/lib/pembayaran-server";
import { sisaTagihan } from "@/lib/pembayaran";
import { catatAktivitas } from "@/lib/log-aktivitas";
import { normalkanTelepon } from "@/lib/format";
import { catatPeristiwa } from "@/lib/analitik";
import { ambilIpKlien, periksaBatasLaju } from "@/lib/pembatas-laju";
import {
  buatNamaFileAman,
  hapusBerkasLama,
  simpanBerkasUnggahan,
  validasiBerkasUnggahan,
} from "@/lib/unggah";
import type { StatusPesanan } from "@/generated/prisma/client";

/** Field peta dikirim sebagai teks dari formulir; kosong berarti tidak diisi. */
function angkaAtauUndefined(nilai: FormDataEntryValue | null): number | undefined {
  if (typeof nilai !== "string" || nilai.trim() === "") return undefined;
  const angka = Number(nilai);
  return Number.isFinite(angka) ? angka : undefined;
}

export type HasilAksiPesanan = {
  sukses: boolean;
  pesan?: string;
  kodePesanan?: string;
  kesalahan?: Record<string, string[]>;
};

/** Membaca isian pesanan dari FormData; dipakai formulir pembeli & dashboard. */
function bacaIsiPesanan(formData: FormData) {
  let items: unknown = [];
  try {
    const mentah = formData.get("itemsJson");
    if (typeof mentah === "string" && mentah.length <= 20_000) items = JSON.parse(mentah);
  } catch {
    items = null;
  }
  return SkemaIsiPesanan.safeParse({
    namaPemesan: formData.get("namaPemesan") ?? "",
    teleponPemesan: formData.get("teleponPemesan") ?? "",
    tanggalAcara: formData.get("tanggalAcara") ?? "",
    jamAcara: formData.get("jamAcara") ?? "",
    caraAmbil: formData.get("caraAmbil"),
    alamatAntar: formData.get("alamatAntar") || undefined,
    caraBayar: formData.get("caraBayar"),
    catatanPesanan: formData.get("catatanPesanan") || undefined,
    kodeVoucher: formData.get("kodeVoucher") || undefined,
    latitude: angkaAtauUndefined(formData.get("latitude")),
    longitude: angkaAtauUndefined(formData.get("longitude")),
    items,
  });
}

export async function aksiBuatPesanan(
  _prevState: HasilAksiPesanan | null,
  formData: FormData
): Promise<HasilAksiPesanan> {
  const ip = await ambilIpKlien();
  const cekLaju = periksaBatasLaju({ kunci: `pesan:${ip}`, maksimal: 10, jendelaDetik: 60 });
  if (!cekLaju.diizinkan) {
    return { sukses: false, pesan: `Terlalu banyak permintaan. Silakan tunggu ${cekLaju.tungguDetik} detik.` };
  }

  const validasi = bacaIsiPesanan(formData);
  if (!validasi.success) {
    return {
      sukses: false,
      kesalahan: validasi.error.flatten().fieldErrors,
      pesan: "Periksa kembali isian formulir pemesanan.",
    };
  }

  // Item dari pembeli hanya boleh merujuk menu, bukan item pesanan lain.
  if (validasi.data.items.some((i) => i.itemId)) {
    return { sukses: false, pesan: "Format item pesanan tidak valid." };
  }

  const sesi = await bacaSesi();
  let pesanan;
  try {
    pesanan = await buatPesananBaru(validasi.data, {
      sumber: "WEBSITE",
      penggunaId: sesi?.id ?? null,
      catatanRiwayat: "Pesanan dibuat oleh pemesan.",
    });
  } catch (err) {
    return { sukses: false, pesan: pesanGalat(err) };
  }

  await tandaiPesananMilikSaya(pesanan.kode);
  await catatPeristiwa("PESANAN_DIBUAT");
  redirect(`/pesanan/${pesanan.kode}?baru=1`);
}

export async function aksiLacakPesanan(
  _prevState: HasilAksiPesanan | null,
  formData: FormData
): Promise<HasilAksiPesanan> {
  const ip = await ambilIpKlien();
  const cekLaju = periksaBatasLaju({
    kunci: `lacak:${ip}`,
    maksimal: 10,
    jendelaDetik: 60,
  });

  if (!cekLaju.diizinkan) {
    return {
      sukses: false,
      pesan: `Terlalu banyak percobaan. Silakan coba lagi dalam ${cekLaju.tungguDetik} detik.`,
    };
  }

  const kode = (formData.get("kode") as string)?.trim().toUpperCase();
  const telepon = (formData.get("telepon") as string)?.trim();

  if (!kode || !telepon) {
    return {
      sukses: false,
      pesan: "Kode pesanan dan nomor telepon wajib diisi.",
    };
  }

  const nomorNorm = normalkanTelepon(telepon);
  const pesanan = await db.pesanan.findUnique({
    where: { kode },
  });

  if (!pesanan) {
    return {
      sukses: false,
      pesan: "Pesanan dengan kode tersebut tidak ditemukan.",
    };
  }

  if (pesanan.teleponPemesan !== nomorNorm) {
    return {
      sukses: false,
      pesan: "Nomor telepon tidak cocok dengan data pemesan.",
    };
  }

  // Berikan akses cookie
  await tandaiPesananMilikSaya(kode);
  await catatPeristiwa("LACAK_DIPAKAI");
  redirect(`/pesanan/${kode}`);
}

export async function aksiKonfirmasiBayar(kode: string): Promise<HasilAksiPesanan> {
  const pesanan = await db.pesanan.findUnique({ where: { kode } });
  if (!pesanan) {
    return { sukses: false, pesan: "Pesanan tidak ditemukan." };
  }

  // Otorisasi: pemanggil harus memiliki cookie akses pesanan atau nomor telepon cocok / staf / pemilik
  const sesi = await bacaSesi();
  const punyaAkses =
    (await punyaAksesPesanan(kode)) ||
    Boolean(
      sesi &&
        (sesi.peran === "PEMILIK" ||
          sesi.peran === "STAF_DAPUR" ||
          sesi.telepon === pesanan.teleponPemesan)
    );

  if (!punyaAkses) {
    return {
      sukses: false,
      pesan: "Anda tidak memiliki wewenang untuk mengakses pesanan ini.",
    };
  }

  if (pesanan.statusBayar === "LUNAS") {
    return { sukses: true, pesan: "Pesanan ini sudah lunas." };
  }
  if (pesanan.status === "DIBATALKAN") {
    return { sukses: false, pesan: "Pesanan ini sudah dibatalkan." };
  }

  await db.pesanan.update({
    where: { kode },
    data: {
      statusBayar: "MENUNGGU_VERIFIKASI",
    },
  });

  revalidatePath(`/pesanan/${kode}`);
  revalidatePath("/admin/pesanan");
  return {
    sukses: true,
    pesan: "Konfirmasi pembayaran terkirim. Dapur akan segera memeriksa.",
  };
}

export async function aksiUnggahBuktiBayar(
  _prevState: HasilAksiPesanan | null,
  formData: FormData
): Promise<HasilAksiPesanan> {
  const ip = await ambilIpKlien();
  const cekLaju = periksaBatasLaju({
    kunci: `unggah:${ip}`,
    maksimal: 5,
    jendelaDetik: 300,
  });

  if (!cekLaju.diizinkan) {
    return {
      sukses: false,
      pesan: `Terlalu banyak permintaan unggah bukti transfer. Silakan tunggu ${cekLaju.tungguDetik} detik lagi.`,
    };
  }

  const kode = (formData.get("kode") as string)?.trim().toUpperCase();
  const berkas = formData.get("berkas") as File | null;

  if (!kode) {
    return { sukses: false, pesan: "Kode pesanan tidak valid." };
  }

  const pesanan = await db.pesanan.findUnique({ where: { kode } });
  if (!pesanan) {
    return { sukses: false, pesan: "Pesanan tidak ditemukan." };
  }

  // Otorisasi: hanya pemegang akses pesanan sah yang dapat mengunggah bukti bayar
  const sesi = await bacaSesi();
  const punyaAkses =
    (await punyaAksesPesanan(kode)) ||
    Boolean(
      sesi &&
        (sesi.peran === "PEMILIK" ||
          sesi.peran === "STAF_DAPUR" ||
          sesi.telepon === pesanan.teleponPemesan)
    );

  if (!punyaAkses) {
    return {
      sukses: false,
      pesan: "Anda tidak memiliki wewenang untuk mengunggah bukti pada pesanan ini.",
    };
  }

  if (pesanan.statusBayar === "LUNAS") {
    return { sukses: false, pesan: "Pesanan ini sudah dinyatakan lunas oleh dapur." };
  }
  if (pesanan.status === "DIBATALKAN") {
    return { sukses: false, pesan: "Pesanan ini sudah dibatalkan." };
  }

  const hasilValidasi = await validasiBerkasUnggahan(berkas);
  if (!hasilValidasi.sukses || !hasilValidasi.buffer || !hasilValidasi.tipe) {
    return { sukses: false, pesan: hasilValidasi.pesan || "Unggahan tidak valid." };
  }

  try {
    const namaFileAman = buatNamaFileAman(hasilValidasi.tipe);
    const urlBukti = await simpanBerkasUnggahan(hasilValidasi.buffer, namaFileAman);

    // Hapus bukti lama jika sebelumnya sudah ada
    if (pesanan.buktiBayarUrl) {
      await hapusBerkasLama(pesanan.buktiBayarUrl);
    }

    await db.pesanan.update({
      where: { kode },
      data: {
        buktiBayarUrl: urlBukti,
        statusBayar: "MENUNGGU_VERIFIKASI",
      },
    });

    revalidatePath(`/pesanan/${kode}`);
    revalidatePath("/admin");
    revalidatePath("/admin/pesanan");

    return {
      sukses: true,
      pesan: "Bukti transfer berhasil diunggah! Dapur sedang memverifikasi pembayaran Anda.",
    };
  } catch (err: unknown) {
    return { sukses: false, pesan: pesanGalat(err, "Gagal menyimpan berkas bukti transfer. Coba lagi.") };
  }
}

// Aksi Dapur (Pemilik atau Staf Dapur)
export async function aksiPindahStatus(
  kode: string,
  statusBaru: StatusPesanan
): Promise<{ sukses: boolean; pesan?: string }> {
  const sesi = await wajibStafAtauPemilik();

  // Pemeriksaan alur status dan penulisannya harus berada di dalam transaksi
  // yang sama. Papan dapur dibuka pemilik dan staf sekaligus di perangkat
  // berbeda: kalau statusnya dibaca lebih dulu di luar transaksi, dua orang
  // yang menekan tombol hampir bersamaan sama-sama lolos pemeriksaan, dan
  // riwayat pesanan mencatat dua perpindahan dari status yang sama — termasuk
  // kemungkinan "Mulai Masak" dan "Batalkan" sekaligus.
  const hasil = await db.$transaction(async (tx) => {
    const pesanan = await tx.pesanan.findUnique({
      where: { kode },
      select: { id: true, status: true, total: true, dibayar: true },
    });
    if (!pesanan) {
      return { sukses: false, pesan: "Pesanan tidak ditemukan." };
    }

    // Pembatalan punya jalurnya sendiri (wajib alasan, mengembalikan kuota
    // voucher) — lihat aksiBatalkanPesanan.
    if (statusBaru === "DIBATALKAN") {
      return { sukses: false, pesan: "Gunakan tombol Batalkan untuk membatalkan pesanan." };
    }

    // Pesanan yang ditutup sebelum lunas tidak pernah tercatat di Buku Kas,
    // sehingga omzet di laporan diam-diam lebih kecil dari kenyataan.
    if (statusBaru === "SELESAI" && pesanan.dibayar < pesanan.total) {
      return {
        sukses: false,
        pesan:
          "Pesanan belum lunas. Tandai lunas dulu (oleh pemilik) supaya uangnya tercatat di Buku Kas.",
      };
    }

    if (!bolehPindahStatus(pesanan.status, statusBaru)) {
      return {
        sukses: false,
        pesan: `Status tidak dapat dipindah dari ${pesanan.status} ke ${statusBaru}.`,
      };
    }

    // Kunci optimistis, seperti pada kuota voucher: perpindahan hanya berlaku
    // bila statusnya masih sama dengan yang barusan dibaca.
    const terpindah = await tx.pesanan.updateMany({
      where: { id: pesanan.id, status: pesanan.status },
      data: {
        status: statusBaru,
        ...(statusBaru === "DIKONFIRMASI" ? { dikonfirmasiPada: new Date() } : {}),
        ...(statusBaru === "SELESAI" ? { selesaiPada: new Date() } : {}),
      },
    });
    if (terpindah.count === 0) {
      return {
        sukses: false,
        pesan:
          "Status pesanan ini baru saja diubah dari perangkat lain. Muat ulang halaman dulu.",
      };
    }

    await tx.riwayatStatus.create({
      data: {
        pesananId: pesanan.id,
        dari: pesanan.status,
        ke: statusBaru,
        olehId: sesi.id,
        catatan: `Status diubah menjadi ${statusBaru} oleh ${sesi.nama}.`,
      },
    });

    return { sukses: true };
  });

  if (!hasil.sukses) return hasil;

  revalidatePath(`/pesanan/${kode}`);
  revalidatePath("/admin/pesanan");
  revalidatePath("/admin");
  return hasil;
}

const SkemaBatal = z
  .string()
  .trim()
  .min(3, "Tulis alasan pembatalan (minimal 3 huruf).")
  .max(200, "Alasan terlalu panjang.");

/**
 * Membatalkan pesanan yang belum selesai.
 *
 * Alasan wajib diisi karena pembeli melihatnya di halaman lacak — pesanan yang
 * tiba-tiba "Dibatalkan" tanpa penjelasan memancing chat bertubi-tubi.
 * Pesanan yang sudah lunas hanya boleh dibatalkan pemilik: uangnya sudah masuk
 * Buku Kas, jadi pengembalian dana harus dicatat oleh orang yang memegang kas.
 */
export async function aksiBatalkanPesanan(
  kode: string,
  alasan: string
): Promise<{ sukses: boolean; pesan?: string }> {
  const sesi = await wajibStafAtauPemilik();

  const alasanValid = SkemaBatal.safeParse(alasan);
  if (!alasanValid.success) {
    return { sukses: false, pesan: alasanValid.error.issues[0]?.message };
  }

  const hasil = await db.$transaction(async (tx) => {
    const pesanan = await tx.pesanan.findUnique({
      where: { kode },
      select: { id: true, status: true, dibayar: true, voucherId: true },
    });
    if (!pesanan) return { sukses: false, pesan: "Pesanan tidak ditemukan." };

    if (!bolehPindahStatus(pesanan.status, "DIBATALKAN")) {
      return { sukses: false, pesan: "Pesanan ini sudah ditutup dan tidak bisa dibatalkan." };
    }

    if (pesanan.dibayar > 0 && sesi.peran !== "PEMILIK") {
      return {
        sukses: false,
        pesan: "Pesanan ini sudah dibayar. Hanya pemilik yang bisa membatalkannya.",
      };
    }

    const terpindah = await tx.pesanan.updateMany({
      where: { id: pesanan.id, status: pesanan.status },
      data: { status: "DIBATALKAN", alasanBatal: alasanValid.data },
    });
    if (terpindah.count === 0) {
      return {
        sukses: false,
        pesan: "Status pesanan ini baru saja diubah dari perangkat lain. Muat ulang halaman dulu.",
      };
    }

    // Kuota voucher dikembalikan supaya promo terbatas tidak "habis" oleh
    // pesanan yang tidak pernah terjadi.
    if (pesanan.voucherId) {
      await tx.voucher.updateMany({
        where: { id: pesanan.voucherId, terpakai: { gt: 0 } },
        data: { terpakai: { decrement: 1 } },
      });
    }

    await tx.riwayatStatus.create({
      data: {
        pesananId: pesanan.id,
        dari: pesanan.status,
        ke: "DIBATALKAN",
        olehId: sesi.id,
        catatan: `Dibatalkan oleh ${sesi.nama}: ${alasanValid.data}`,
      },
    });
    await catatAktivitas(
      { penggunaId: sesi.id, aksi: "batal_pesanan", target: kode, rincian: alasanValid.data },
      tx
    );

    return {
      sukses: true,
      pesan:
        pesanan.dibayar > 0
          ? "Pesanan dibatalkan. Catat pengembalian dana di halaman detail pesanan."
          : undefined,
    };
  });

  if (!hasil.sukses) return hasil;

  revalidatePath(`/pesanan/${kode}`);
  revalidatePath("/admin");
  revalidatePath("/admin/pesanan");
  return hasil;
}

/**
 * "Tandai lunas" = mencatat seluruh sisa tagihan sebagai pelunasan, dengan
 * metode sesuai pilihan pembeli. Dipertahankan demi tombol yang sudah dikenal
 * pemilik; aturan uangnya ada di catatPembayaran (invarian #3).
 */
export async function aksiTandaiLunas(kode: string): Promise<{ sukses: boolean; pesan?: string }> {
  const sesi = await wajibPemilik();
  const pesanan = await db.pesanan.findUnique({
    where: { kode },
    select: { total: true, dibayar: true, caraBayar: true, status: true },
  });
  if (!pesanan) return { sukses: false, pesan: "Pesanan tidak ditemukan." };
  if (pesanan.status === "DIBATALKAN") {
    return { sukses: false, pesan: "Pesanan yang sudah dibatalkan tidak bisa ditandai lunas." };
  }
  const sisa = sisaTagihan(pesanan.total, pesanan.dibayar);
  if (sisa === 0) return { sukses: true };

  try {
    await catatPembayaran({ kode, jumlah: sisa, metode: pesanan.caraBayar, olehId: sesi.id });
  } catch (err) {
    return { sukses: false, pesan: pesanGalat(err) };
  }

  revalidatePath(`/pesanan/${kode}`);
  revalidatePath(`/admin/pesanan/${kode}`);
  revalidatePath("/admin/pesanan");
  revalidatePath("/admin/keuangan");
  revalidatePath("/admin");
  return { sukses: true };
}
