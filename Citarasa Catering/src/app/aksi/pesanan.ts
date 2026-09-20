"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { bacaSesi, wajibPemilik, wajibStafAtauPemilik } from "@/lib/auth";
import { punyaAksesPesanan, tandaiPesananMilikSaya } from "@/lib/akses-pesanan";
import { bolehPindahStatus } from "@/lib/pesanan";
import { buatKodePesanan } from "@/lib/kode-pesanan";
import {
  dariInputTanggal,
  menitDariJam,
  menitSekarangWib,
  normalkanTelepon,
  selisihHari,
} from "@/lib/format";
import { ambilPengaturan } from "@/lib/pengaturan";
import { catatPeristiwa } from "@/lib/analitik";
import { hitungPotongan, normalkanKodeVoucher, pesanTolak } from "@/lib/voucher";
import { ambilIpKlien, periksaBatasLaju } from "@/lib/pembatas-laju";
import {
  buatNamaFileAman,
  hapusBerkasLama,
  simpanBerkasUnggahan,
  validasiBerkasUnggahan,
} from "@/lib/unggah";
import type {
  CaraAmbil,
  CaraBayar,
  StatusPesanan,
} from "@/generated/prisma/client";

/**
 * Batas atas tiap isian.
 *
 * Formulir di peramban memang sudah membatasi panjangnya, tapi Server Action
 * ini bisa dipanggil langsung tanpa lewat formulir. Tanpa batas di sini, satu
 * permintaan bisa menitipkan catatan sepanjang berapa pun ke database, dan
 * seluruh isinya ikut terbaca ulang setiap kali papan dapur dibuka. Angkanya
 * dipilih jauh di atas pemakaian wajar supaya tidak pernah mengganggu pemesan
 * sungguhan.
 */
const SkemaItem = z.object({
  menuId: z.string().min(1).max(64),
  jumlah: z
    .number()
    .int()
    .positive("Jumlah pesanan harus lebih dari 0")
    .max(5000, "Jumlah pesanan terlalu besar. Hubungi dapur untuk pesanan sebesar ini."),
  catatan: z.string().max(300, "Catatan menu terlalu panjang").optional(),
});

const SkemaBuatPesanan = z
  .object({
    namaPemesan: z
      .string()
      .min(2, "Nama pemesan minimal 2 karakter")
      .max(100, "Nama pemesan terlalu panjang"),
    teleponPemesan: z
      .string()
      .min(8, "Nomor telepon minimal 8 digit")
      .max(20, "Nomor telepon terlalu panjang"),
    tanggalAcara: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid"),
    jamAcara: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format jam tidak valid"),
    caraAmbil: z.enum(["AMBIL_SENDIRI", "DIANTAR"]),
    alamatAntar: z.string().max(500, "Alamat antar terlalu panjang").optional(),
    caraBayar: z.enum(["TRANSFER", "TUNAI"]),
    catatanPesanan: z.string().max(1000, "Catatan pesanan terlalu panjang").optional(),
    kodeVoucher: z.string().max(32, "Kode voucher terlalu panjang").optional(),
    // Koordinat titik antar dari peta. Rentangnya dibatasi supaya nilai ngawur
    // tidak pernah tersimpan dan membuat peta di dashboard melompat.
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    items: z
      .array(SkemaItem)
      .min(1, "Pilih minimal satu menu")
      .max(50, "Terlalu banyak jenis menu dalam satu pesanan"),
  })
  // Peta hanyalah pelengkap; alamat tertulis tetap yang dipakai pengantar, jadi
  // pesanan diantar tanpa alamat tidak boleh masuk ke dapur sama sekali.
  .refine(
    (nilai) =>
      nilai.caraAmbil !== "DIANTAR" || (nilai.alamatAntar?.trim().length ?? 0) >= 10,
    {
      path: ["alamatAntar"],
      message: "Alamat antar wajib diisi lengkap (minimal 10 karakter).",
    }
  );

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

export async function aksiBuatPesanan(
  _prevState: HasilAksiPesanan | null,
  formData: FormData
): Promise<HasilAksiPesanan> {
  const ip = await ambilIpKlien();
  const cekLaju = periksaBatasLaju({
    kunci: `pesan:${ip}`,
    maksimal: 10,
    jendelaDetik: 60,
  });

  if (!cekLaju.diizinkan) {
    return {
      sukses: false,
      pesan: `Terlalu banyak permintaan. Silakan tunggu ${cekLaju.tungguDetik} detik.`,
    };
  }

  // Parse item dari string JSON
  let itemsParsed: unknown = [];
  try {
    const rawItems = formData.get("itemsJson");
    if (typeof rawItems === "string") {
      itemsParsed = JSON.parse(rawItems);
    }
  } catch {
    return {
      sukses: false,
      pesan: "Format item pesanan tidak valid.",
    };
  }

  const raw = {
    namaPemesan: formData.get("namaPemesan"),
    teleponPemesan: formData.get("teleponPemesan"),
    tanggalAcara: formData.get("tanggalAcara"),
    jamAcara: formData.get("jamAcara"),
    caraAmbil: formData.get("caraAmbil"),
    alamatAntar: formData.get("alamatAntar") || undefined,
    caraBayar: formData.get("caraBayar"),
    catatanPesanan: formData.get("catatanPesanan") || undefined,
    kodeVoucher: formData.get("kodeVoucher") || undefined,
    latitude: angkaAtauUndefined(formData.get("latitude")),
    longitude: angkaAtauUndefined(formData.get("longitude")),
    items: itemsParsed,
  };

  const validasi = SkemaBuatPesanan.safeParse(raw);
  if (!validasi.success) {
    return {
      sukses: false,
      kesalahan: validasi.error.flatten().fieldErrors,
      pesan: "Periksa kembali isian formulir pemesanan.",
    };
  }

  const data = validasi.data;
  const nomorNorm = normalkanTelepon(data.teleponPemesan);
  const tanggalAcaraWib = dariInputTanggal(data.tanggalAcara);
  const selisihHariAcara = selisihHari(tanggalAcaraWib);

  if (selisihHariAcara < 0) {
    return {
      sukses: false,
      pesan: "Tanggal acara tidak boleh di masa lalu.",
    };
  }

  // Tanggal hari ini saja tidak cukup: tanpa cek jam, pesanan untuk pukul 08.00
  // masih bisa masuk pada pukul 20.00 dan dapur menerima pesanan yang waktunya
  // sudah lewat. Batas jam operasional sengaja TIDAK dipakai di sini karena
  // jamBuka/jamTutup adalah jam layanan, bukan jam antar — pesanan pagi memang
  // lazim dimasak dini hari.
  if (selisihHariAcara === 0 && menitDariJam(data.jamAcara) <= menitSekarangWib()) {
    return {
      sukses: false,
      pesan:
        "Jam acara untuk hari ini sudah lewat. Pilih jam yang lebih malam, atau ganti ke tanggal berikutnya.",
    };
  }

  // 1. Cek tanggal libur toko
  const tanggalLibur = await db.tanggalTutup.findUnique({
    where: { tanggal: tanggalAcaraWib },
  });
  if (tanggalLibur) {
    return {
      sukses: false,
      pesan: `Dapur libur pada tanggal tersebut (${tanggalLibur.alasan || "Tutup"}). Silakan pilih tanggal lain.`,
    };
  }

  // 2. Baca ulang menu dari DB (Invarian #1: Harga tidak dipercaya dari browser)
  const menuIds = data.items.map((i) => i.menuId);
  const daftarMenuDb = await db.menu.findMany({
    where: { id: { in: menuIds }, aktif: true },
  });

  const petaMenu = new Map(daftarMenuDb.map((m) => [m.id, m]));
  if (petaMenu.size !== menuIds.length) {
    return {
      sukses: false,
      pesan: "Sebagian menu yang dipilih sudah tidak aktif atau tidak ditemukan.",
    };
  }

  // Validasi aturan bisnis: minPesan & preorderHari
  for (const item of data.items) {
    const menu = petaMenu.get(item.menuId)!;
    if (item.jumlah < menu.minPesan) {
      return {
        sukses: false,
        pesan: `Menu "${menu.nama}" memiliki batas minimal pesan ${menu.minPesan} ${menu.satuan}.`,
      };
    }
    if (menu.preorderHari > selisihHariAcara) {
      return {
        sukses: false,
        pesan: `Menu "${menu.nama}" butuh waktu persiapan minimal ${menu.preorderHari} hari sebelum acara.`,
      };
    }
  }

  // Ambil pengaturan ongkir
  const pengaturan = await ambilPengaturan();
  let ongkir = 0;
  if (data.caraAmbil === "DIANTAR") {
    ongkir = pengaturan.ongkirDefault;
  }

  // Hitung subtotal
  let subtotal = 0;
  for (const item of data.items) {
    const menu = petaMenu.get(item.menuId)!;
    subtotal += menu.harga * item.jumlah;
  }

  // Gratis ongkir jika melewati batas minimal
  if (
    data.caraAmbil === "DIANTAR" &&
    pengaturan.minOrderAntar > 0 &&
    subtotal >= pengaturan.minOrderAntar
  ) {
    ongkir = 0;
  }

  const kodeVoucherDiminta = data.kodeVoucher?.trim()
    ? normalkanKodeVoucher(data.kodeVoucher)
    : null;

  // Cek sesi pembeli jika sedang login
  const sesi = await bacaSesi();
  const penggunaId = sesi?.id || null;

  // Jalankan transaksi pembuatan pesanan
  let pesananHasil;
  try {
    pesananHasil = await db.$transaction(async (tx) => {
      // Cek kapasitas harian untuk menu tertentu. Dikumpulkan dalam satu kueri
      // agregat: pesanan berisi sepuluh menu sebelumnya berarti sepuluh kueri
      // berurutan, dan semuanya terjadi sementara transaksi ini menahan kunci
      // barisnya.
      const berkuota = data.items.filter((item) => {
        const menu = petaMenu.get(item.menuId)!;
        return menu.kapasitasHarian !== null && menu.kapasitasHarian > 0;
      });

      if (berkuota.length > 0) {
        const terpakaiPerMenu = await tx.itemPesanan.groupBy({
          by: ["menuId"],
          _sum: { jumlah: true },
          where: {
            menuId: { in: berkuota.map((i) => i.menuId) },
            pesanan: {
              tanggalAcara: tanggalAcaraWib,
              status: { not: "DIBATALKAN" },
            },
          },
        });

        const petaTerpakai = new Map(
          terpakaiPerMenu.map((b) => [b.menuId, b._sum.jumlah ?? 0])
        );

        for (const item of berkuota) {
          const menu = petaMenu.get(item.menuId)!;
          const sudahDipesan = petaTerpakai.get(item.menuId) ?? 0;
          if (sudahDipesan + item.jumlah > menu.kapasitasHarian!) {
            const sisa = Math.max(0, menu.kapasitasHarian! - sudahDipesan);
            throw new Error(
              `Kapasitas harian untuk "${menu.nama}" pada tanggal tersebut tersisa ${sisa} ${menu.satuan}.`
            );
          }
        }
      }

      // Voucher: dibaca ulang dan dihitung di sini, di dalam transaksi yang
      // sama dengan pembuatan pesanan. Browser hanya mengirim kodenya.
      let diskon = 0;
      let voucherId: string | null = null;
      let kodeVoucherTersimpan: string | null = null;

      if (kodeVoucherDiminta) {
        const voucher = await tx.voucher.findUnique({
          where: { kode: kodeVoucherDiminta },
        });
        if (!voucher) {
          throw new Error(pesanTolak("TIDAK_DITEMUKAN"));
        }

        const hasilVoucher = hitungPotongan(voucher, subtotal);
        if (!hasilVoucher.berlaku) {
          throw new Error(hasilVoucher.pesan);
        }

        // Kunci optimistis: pemakaian hanya bertambah bila `terpakai` masih sama
        // dengan yang barusan dibaca. Tanpa ini, dua pemesan yang menekan kirim
        // bersamaan bisa sama-sama memakai kuota terakhir.
        const terkunci = await tx.voucher.updateMany({
          where: { id: voucher.id, terpakai: voucher.terpakai },
          data: { terpakai: { increment: 1 } },
        });
        if (terkunci.count === 0) {
          throw new Error(
            "Voucher sedang dipakai pemesan lain. Silakan kirim ulang pesanan Anda."
          );
        }

        diskon = hasilVoucher.potongan;
        voucherId = voucher.id;
        kodeVoucherTersimpan = voucher.kode;
      }

      // Potongan hanya memakan harga barang, tidak pernah ongkos kirim —
      // ongkir tetap harus dibayarkan ke pengantar.
      const total = subtotal - diskon + ongkir;

      // Generate kode unik dengan retry jika tabrakan
      let kode = "";
      for (let percobaan = 0; percobaan < 5; percobaan++) {
        const kandidat = buatKodePesanan(new Date());
        const ada = await tx.pesanan.findUnique({ where: { kode: kandidat } });
        if (!ada) {
          kode = kandidat;
          break;
        }
      }
      if (!kode) {
        throw new Error("Gagal membuat kode pesanan unik. Silakan coba lagi.");
      }

      // Buat entri pesanan
      const pesanan = await tx.pesanan.create({
        data: {
          kode,
          penggunaId,
          namaPemesan: data.namaPemesan.trim(),
          teleponPemesan: nomorNorm,
          tanggalAcara: tanggalAcaraWib,
          jamAcara: data.jamAcara,
          caraAmbil: data.caraAmbil as CaraAmbil,
          alamatAntar:
            data.caraAmbil === "DIANTAR" ? data.alamatAntar?.trim() || "" : null,
          // Koordinat hanya berarti untuk pesanan yang diantar.
          latitude: data.caraAmbil === "DIANTAR" ? data.latitude ?? null : null,
          longitude: data.caraAmbil === "DIANTAR" ? data.longitude ?? null : null,
          caraBayar: data.caraBayar as CaraBayar,
          catatan: data.catatanPesanan?.trim() || null,
          subtotal,
          ongkir,
          diskon,
          total,
          voucherId,
          kodeVoucher: kodeVoucherTersimpan,
          status: "BARU",
          statusBayar: "BELUM_BAYAR",
          item: {
            create: data.items.map((it) => {
              const menu = petaMenu.get(it.menuId)!;
              return {
                menuId: menu.id,
                namaMenu: menu.nama,
                hargaSatuan: menu.harga,
                satuan: menu.satuan,
                jumlah: it.jumlah,
                catatan: it.catatan?.trim() || null,
                subtotal: menu.harga * it.jumlah,
              };
            }),
          },
          riwayat: {
            create: {
              ke: "BARU",
              catatan: "Pesanan dibuat oleh pemesan.",
            },
          },
        },
      });

      return pesanan;
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return { sukses: false, pesan: msg };
  }

  // Tandai cookie pesanan_saya di peramban
  await tandaiPesananMilikSaya(pesananHasil.kode);
  await catatPeristiwa("PESANAN_DIBUAT");

  redirect(`/pesanan/${pesananHasil.kode}?baru=1`);
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
    const msg = err instanceof Error ? err.message : "Gagal menyimpan berkas bukti transfer.";
    return { sukses: false, pesan: msg };
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
      select: { id: true, status: true },
    });
    if (!pesanan) {
      return { sukses: false, pesan: "Pesanan tidak ditemukan." };
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
      data: { status: statusBaru },
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

export async function aksiTandaiLunas(
  kode: string
): Promise<{ sukses: boolean; pesan?: string }> {
  const sesi = await wajibPemilik();

  // Invarian #3: satu pesanan maksimal satu baris kas.
  //
  // Pesanan dibaca di dalam transaksi dan pelunasannya dikunci secara optimistis
  // (`statusBayar` harus masih bukan LUNAS). Dulu pembacaan terjadi di luar
  // transaksi, sehingga dua klik beruntun pada tombol "Tandai Lunas" — hal yang
  // lumrah saat jaringan lambat — bisa sama-sama melihat `kas` masih kosong dan
  // dua-duanya mencoba membuat catatan kas. Yang kalah ditolak batasan unik di
  // database dan muncul sebagai halaman galat, bukan pesan biasa; lebih buruk
  // lagi, omzet hari itu berisiko terhitung dua kali kalau batasan itu tidak ada.
  const hasil = await db.$transaction(async (tx) => {
    const pesanan = await tx.pesanan.findUnique({
      where: { kode },
      include: { kas: { select: { id: true } } },
    });

    if (!pesanan) {
      return { sukses: false, pesan: "Pesanan tidak ditemukan." };
    }

    if (pesanan.statusBayar === "LUNAS") {
      return { sukses: true };
    }

    const terkunci = await tx.pesanan.updateMany({
      where: { id: pesanan.id, statusBayar: { not: "LUNAS" } },
      data: { statusBayar: "LUNAS" },
    });

    // Pelunasan sudah dikerjakan permintaan lain yang menang balapan; catatan
    // kasnya menjadi tanggung jawab permintaan itu.
    if (terkunci.count === 0) {
      return { sukses: true };
    }

    if (!pesanan.kas) {
      await tx.catatanKas.create({
        data: {
          pesananId: pesanan.id,
          dicatatOlehId: sesi.id,
          jenis: "MASUK",
          sumber: "PESANAN",
          kategori: "Penjualan pesanan",
          jumlah: pesanan.total,
          keterangan: `Pelunasan pesanan ${pesanan.kode} a.n. ${pesanan.namaPemesan}`,
          tanggal: new Date(),
        },
      });
    }

    return { sukses: true };
  });

  if (!hasil.sukses) return hasil;

  revalidatePath(`/pesanan/${kode}`);
  revalidatePath("/admin/pesanan");
  revalidatePath("/admin/keuangan");
  revalidatePath("/admin");
  return hasil;
}

