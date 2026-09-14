"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { bacaSesi, wajibPemilik } from "@/lib/auth";
import { tandaiPesananMilikSaya } from "@/lib/akses-pesanan";
import {
  bolehPindahStatus,
  buatKodePesanan,
} from "@/lib/pesanan";
import {
  dariInputTanggal,
  normalkanTelepon,
  selisihHari,
} from "@/lib/format";
import { ambilPengaturan } from "@/lib/pengaturan";
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

const SkemaItem = z.object({
  menuId: z.string().min(1),
  jumlah: z.number().int().positive("Jumlah pesanan harus lebih dari 0"),
  catatan: z.string().optional(),
});

const SkemaBuatPesanan = z.object({
  namaPemesan: z.string().min(2, "Nama pemesan minimal 2 karakter"),
  teleponPemesan: z.string().min(8, "Nomor telepon minimal 8 digit"),
  tanggalAcara: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid"),
  jamAcara: z.string().regex(/^\d{2}:\d{2}$/, "Format jam tidak valid"),
  caraAmbil: z.enum(["AMBIL_SENDIRI", "DIANTAR"]),
  alamatAntar: z.string().optional(),
  caraBayar: z.enum(["TRANSFER", "TUNAI"]),
  catatanPesanan: z.string().optional(),
  items: z.array(SkemaItem).min(1, "Pilih minimal satu menu"),
});

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

  const total = subtotal + ongkir;

  // Cek sesi pembeli jika sedang login
  const sesi = await bacaSesi();
  const penggunaId = sesi?.id || null;

  // Jalankan transaksi pembuatan pesanan
  let pesananHasil;
  try {
    pesananHasil = await db.$transaction(async (tx) => {
      // Cek kapasitas harian untuk menu tertentu
      for (const item of data.items) {
        const menu = petaMenu.get(item.menuId)!;
        if (menu.kapasitasHarian && menu.kapasitasHarian > 0) {
          const agregat = await tx.itemPesanan.aggregate({
            _sum: { jumlah: true },
            where: {
              menuId: menu.id,
              pesanan: {
                tanggalAcara: tanggalAcaraWib,
                status: { not: "DIBATALKAN" },
              },
            },
          });
          const sudahDipesan = agregat._sum.jumlah || 0;
          if (sudahDipesan + item.jumlah > menu.kapasitasHarian) {
            const sisa = Math.max(0, menu.kapasitasHarian - sudahDipesan);
            throw new Error(
              `Kapasitas harian untuk "${menu.nama}" pada tanggal tersebut tersisa ${sisa} ${menu.satuan}.`
            );
          }
        }
      }

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
          caraBayar: data.caraBayar as CaraBayar,
          catatan: data.catatanPesanan?.trim() || null,
          subtotal,
          ongkir,
          total,
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

  redirect(`/pesanan/${pesananHasil.kode}`);
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
  redirect(`/pesanan/${kode}`);
}

export async function aksiKonfirmasiBayar(kode: string): Promise<HasilAksiPesanan> {
  const pesanan = await db.pesanan.findUnique({ where: { kode } });
  if (!pesanan) {
    return { sukses: false, pesan: "Pesanan tidak ditemukan." };
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

// Aksi Khusus Pemilik / Admin
export async function aksiPindahStatus(
  kode: string,
  statusBaru: StatusPesanan
): Promise<{ sukses: boolean; pesan?: string }> {
  const sesi = await wajibPemilik();

  const pesanan = await db.pesanan.findUnique({ where: { kode } });
  if (!pesanan) {
    return { sukses: false, pesan: "Pesanan tidak ditemukan." };
  }

  if (!bolehPindahStatus(pesanan.status, statusBaru)) {
    return {
      sukses: false,
      pesan: `Status tidak dapat dipindah dari ${pesanan.status} ke ${statusBaru}.`,
    };
  }

  await db.$transaction([
    db.pesanan.update({
      where: { kode },
      data: { status: statusBaru },
    }),
    db.riwayatStatus.create({
      data: {
        pesananId: pesanan.id,
        dari: pesanan.status,
        ke: statusBaru,
        olehId: sesi.id,
        catatan: `Status diubah menjadi ${statusBaru} oleh ${sesi.nama}.`,
      },
    }),
  ]);

  revalidatePath(`/pesanan/${kode}`);
  revalidatePath("/admin/pesanan");
  revalidatePath("/admin");
  return { sukses: true };
}

export async function aksiTandaiLunas(
  kode: string
): Promise<{ sukses: boolean; pesan?: string }> {
  const sesi = await wajibPemilik();

  const pesanan = await db.pesanan.findUnique({
    where: { kode },
    include: { kas: true },
  });

  if (!pesanan) {
    return { sukses: false, pesan: "Pesanan tidak ditemukan." };
  }

  if (pesanan.statusBayar === "LUNAS") {
    return { sukses: true };
  }

  // Invarian #3: Satu pesanan maksimal satu baris kas (unique constraint pesananId)
  await db.$transaction(async (tx) => {
    await tx.pesanan.update({
      where: { kode },
      data: { statusBayar: "LUNAS" },
    });

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
  });

  revalidatePath(`/pesanan/${kode}`);
  revalidatePath("/admin/pesanan");
  revalidatePath("/admin/keuangan");
  revalidatePath("/admin");
  return { sukses: true };
}

