"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { bacaSesi, wajibPemilik } from "@/lib/auth";
import { buatKodePesanan, bolehPindahStatus } from "@/lib/pesanan";
import { punyaAksesPesanan, tandaiPesananMilikSaya } from "@/lib/akses-pesanan";
import { dariInputTanggal, kunciHari, normalkanTelepon } from "@/lib/format";
import type { StatusPesanan } from "@/generated/prisma/client";

export type HasilPesanan = { error?: string; sukses?: string };

const skemaItem = z.object({
  menuId: z.string().min(1),
  jumlah: z.number().int().positive().max(10_000),
});

const skemaPesanan = z.object({
  nama: z.string().trim().min(2, "Nama pemesan belum diisi").max(80),
  telepon: z
    .string()
    .trim()
    .transform(normalkanTelepon)
    .refine((n) => /^62\d{8,14}$/.test(n), "Nomor HP tidak sesuai format Indonesia"),
  tanggalAcara: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal belum dipilih"),
  jamAcara: z.string().regex(/^\d{2}:\d{2}$/, "Jam belum dipilih"),
  caraAmbil: z.enum(["AMBIL_SENDIRI", "DIANTAR"]),
  caraBayar: z.enum(["TRANSFER", "TUNAI"]),
  alamatAntar: z.string().trim().max(300).optional(),
  catatan: z.string().trim().max(500).optional(),
  item: z.array(skemaItem).min(1, "Belum ada menu yang dipilih").max(30),
});

export async function buatPesanan(
  _sebelumnya: HasilPesanan,
  data: FormData
): Promise<HasilPesanan> {
  let itemMentah: unknown;
  try {
    itemMentah = JSON.parse(String(data.get("item") ?? "[]"));
  } catch {
    return { error: "Daftar pesanan tidak terbaca. Coba muat ulang halaman." };
  }

  const hasil = skemaPesanan.safeParse({
    nama: data.get("nama"),
    telepon: data.get("telepon"),
    tanggalAcara: data.get("tanggalAcara"),
    jamAcara: data.get("jamAcara"),
    caraAmbil: data.get("caraAmbil"),
    caraBayar: data.get("caraBayar"),
    alamatAntar: data.get("alamatAntar") || undefined,
    catatan: data.get("catatan") || undefined,
    item: itemMentah,
  });

  if (!hasil.success) {
    return { error: hasil.error.issues[0].message };
  }

  const masukan = hasil.data;

  if (masukan.caraAmbil === "DIANTAR" && !masukan.alamatAntar) {
    return { error: "Alamat pengantaran belum diisi." };
  }

  const tanggalAcara = dariInputTanggal(masukan.tanggalAcara);
  const selisih = Math.round(
    (new Date(masukan.tanggalAcara + "T00:00:00Z").getTime() -
      new Date(kunciHari(new Date()) + "T00:00:00Z").getTime()) /
      86_400_000
  );

  if (selisih < 0) {
    return { error: "Tanggal acara sudah lewat. Pilih tanggal hari ini atau setelahnya." };
  }

  const sesi = await bacaSesi();

  try {
    const kode = await db.$transaction(async (trx) => {
      const idMenu = masukan.item.map((i) => i.menuId);
      const daftarMenu = await trx.menu.findMany({
        where: { id: { in: idMenu }, aktif: true },
      });

      if (daftarMenu.length !== new Set(idMenu).size) {
        throw new Error("Ada menu yang sudah tidak tersedia. Silakan pilih ulang.");
      }

      const tutup = await trx.tanggalTutup.findFirst({
        where: {
          tanggal: {
            gte: new Date(masukan.tanggalAcara + "T00:00:00Z"),
            lt: new Date(masukan.tanggalAcara + "T23:59:59Z"),
          },
        },
      });
      if (tutup) {
        throw new Error(
          `Maaf, tanggal itu kami libur${tutup.alasan ? ` (${tutup.alasan})` : ""}. Silakan pilih tanggal lain.`
        );
      }

      const itemTersimpan = [];
      let subtotal = 0;

      for (const dipesan of masukan.item) {
        const menu = daftarMenu.find((m) => m.id === dipesan.menuId);
        if (!menu) {
          throw new Error("Ada menu yang sudah tidak tersedia. Silakan pilih ulang.");
        }

        if (dipesan.jumlah < menu.minPesan) {
          throw new Error(
            `${menu.nama} minimal dipesan ${menu.minPesan} ${menu.satuan}.`
          );
        }

        if (selisih < menu.preorderHari) {
          throw new Error(
            `${menu.nama} perlu dipesan minimal ${menu.preorderHari} hari sebelumnya.`
          );
        }

        if (menu.kapasitasHarian !== null) {
          const terpakai = await trx.itemPesanan.aggregate({
            where: {
              menuId: menu.id,
              pesanan: {
                status: { not: "DIBATALKAN" },
                tanggalAcara: {
                  gte: new Date(masukan.tanggalAcara + "T00:00:00Z"),
                  lt: new Date(masukan.tanggalAcara + "T23:59:59Z"),
                },
              },
            },
            _sum: { jumlah: true },
          });

          const sisa = menu.kapasitasHarian - (terpakai._sum.jumlah ?? 0);
          if (dipesan.jumlah > sisa) {
            throw new Error(
              sisa <= 0
                ? `${menu.nama} sudah penuh di tanggal itu. Silakan pilih tanggal lain.`
                : `${menu.nama} tersisa ${sisa} ${menu.satuan} untuk tanggal itu.`
            );
          }
        }

        // Harga selalu diambil dari database, tidak pernah dari kiriman browser,
        // supaya tidak bisa diubah lewat alat pengembang.
        const subtotalItem = menu.harga * dipesan.jumlah;
        subtotal += subtotalItem;

        itemTersimpan.push({
          menuId: menu.id,
          namaMenu: menu.nama,
          hargaSatuan: menu.harga,
          satuan: menu.satuan,
          jumlah: dipesan.jumlah,
          subtotal: subtotalItem,
        });
      }

      const pengaturan = await trx.pengaturan.findUnique({ where: { id: "utama" } });
      const ongkir =
        masukan.caraAmbil === "DIANTAR" &&
        subtotal < (pengaturan?.minOrderAntar ?? 0)
          ? (pengaturan?.ongkirDefault ?? 0)
          : 0;

      // Kode pesanan dibuat acak, jadi tabrakan mungkin terjadi walau jarang.
      for (let percobaan = 0; percobaan < 5; percobaan++) {
        const kodeBaru = buatKodePesanan();
        const sudahAda = await trx.pesanan.findUnique({
          where: { kode: kodeBaru },
          select: { id: true },
        });
        if (sudahAda) continue;

        await trx.pesanan.create({
          data: {
            kode: kodeBaru,
            penggunaId: sesi?.peran === "PELANGGAN" ? sesi.id : null,
            namaPemesan: masukan.nama,
            teleponPemesan: masukan.telepon,
            alamatAntar: masukan.caraAmbil === "DIANTAR" ? masukan.alamatAntar : null,
            caraAmbil: masukan.caraAmbil,
            tanggalAcara,
            jamAcara: masukan.jamAcara,
            catatan: masukan.catatan,
            caraBayar: masukan.caraBayar,
            subtotal,
            ongkir,
            total: subtotal + ongkir,
            item: { create: itemTersimpan },
            riwayat: { create: { ke: "BARU", catatan: "Pesanan masuk dari website" } },
          },
        });

        return kodeBaru;
      }

      throw new Error("Gagal membuat kode pesanan. Silakan coba lagi.");
    });

    await tandaiPesananMilikSaya(kode);
    revalidatePath("/admin");
    revalidatePath("/admin/pesanan");
    redirect(`/pesanan/${kode}`);
  } catch (e) {
    // redirect() bekerja dengan cara melempar; jangan ditelan sebagai kesalahan.
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    if (
      typeof e === "object" &&
      e !== null &&
      "digest" in e &&
      String((e as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw e;
    }
    return {
      error:
        e instanceof Error
          ? e.message
          : "Pesanan gagal disimpan. Silakan coba lagi.",
    };
  }
}

/**
 * Membuka akses ke satu pesanan setelah pengunjung membuktikan nomor HP-nya.
 * Dipakai halaman lacak untuk tamu yang memesan dari perangkat lain.
 */
export async function cariPesanan(
  _sebelumnya: HasilPesanan,
  data: FormData
): Promise<HasilPesanan> {
  const kode = String(data.get("kode") ?? "").trim().toUpperCase();
  const telepon = normalkanTelepon(String(data.get("telepon") ?? ""));

  if (!kode || !telepon) {
    return { error: "Kode pesanan dan nomor HP harus diisi." };
  }

  const pesanan = await db.pesanan.findUnique({
    where: { kode },
    select: { kode: true, teleponPemesan: true },
  });

  // Pesan yang sama untuk kode salah maupun nomor tidak cocok, supaya halaman
  // ini tidak bisa dipakai menebak kode pesanan orang lain.
  if (!pesanan || pesanan.teleponPemesan !== telepon) {
    return {
      error:
        "Pesanan tidak ditemukan. Periksa lagi kode pesanan dan nomor HP yang dipakai saat memesan.",
    };
  }

  await tandaiPesananMilikSaya(pesanan.kode);
  redirect(`/pesanan/${pesanan.kode}`);
}

/** Pelanggan menekan "saya sudah transfer" dari halaman pesanannya. */
export async function tandaiSudahTransfer(kode: string): Promise<HasilPesanan> {
  const pesanan = await db.pesanan.findUnique({ where: { kode } });
  if (!pesanan) return { error: "Pesanan tidak ditemukan." };

  // Server action bisa dipanggil langsung, jadi izinnya diperiksa ulang di sini
  // dan tidak hanya diandalkan pada halaman yang menampilkan tombolnya.
  const sesi = await bacaSesi();
  const berhak =
    (await punyaAksesPesanan(kode)) ||
    sesi?.peran === "PEMILIK" ||
    (sesi != null && pesanan.penggunaId === sesi.id);

  if (!berhak) return { error: "Pesanan tidak ditemukan." };

  if (pesanan.statusBayar === "LUNAS") return { sukses: "Pembayaran sudah lunas." };

  await db.pesanan.update({
    where: { kode },
    data: { statusBayar: "MENUNGGU_VERIFIKASI" },
  });

  revalidatePath(`/pesanan/${kode}`);
  revalidatePath("/admin");
  revalidatePath("/admin/pesanan");
  return { sukses: "Terima kasih. Pembayaran Anda sedang kami periksa." };
}

export async function ubahStatusPesanan(
  pesananId: string,
  keStatus: StatusPesanan
): Promise<HasilPesanan> {
  const pemilik = await wajibPemilik();

  const pesanan = await db.pesanan.findUnique({ where: { id: pesananId } });
  if (!pesanan) return { error: "Pesanan tidak ditemukan." };

  if (!bolehPindahStatus(pesanan.status, keStatus)) {
    return { error: "Perubahan status itu tidak diizinkan dari tahap sekarang." };
  }

  await db.pesanan.update({
    where: { id: pesananId },
    data: {
      status: keStatus,
      dikonfirmasiPada:
        keStatus === "DIKONFIRMASI" ? new Date() : pesanan.dikonfirmasiPada,
      selesaiPada: keStatus === "SELESAI" ? new Date() : pesanan.selesaiPada,
      riwayat: {
        create: { dari: pesanan.status, ke: keStatus, olehId: pemilik.id },
      },
    },
  });

  segarkanHalamanPesanan(pesanan.kode);
  return { sukses: "Status pesanan diperbarui." };
}

/**
 * Menandai pesanan lunas sekaligus mencatat uang masuk.
 * Catatan kas dikunci pada pesananId yang unik, jadi menekan tombol dua kali
 * tidak akan membuat pemasukan terhitung dobel di laporan.
 */
export async function tandaiLunas(pesananId: string): Promise<HasilPesanan> {
  const pemilik = await wajibPemilik();

  const pesanan = await db.pesanan.findUnique({ where: { id: pesananId } });
  if (!pesanan) return { error: "Pesanan tidak ditemukan." };
  if (pesanan.status === "DIBATALKAN") {
    return { error: "Pesanan yang sudah dibatalkan tidak bisa ditandai lunas." };
  }

  await db.$transaction(async (trx) => {
    await trx.pesanan.update({
      where: { id: pesananId },
      data: { statusBayar: "LUNAS", dibayar: pesanan.total },
    });

    await trx.catatanKas.upsert({
      where: { pesananId },
      update: { jumlah: pesanan.total },
      create: {
        jenis: "MASUK",
        sumber: "PESANAN",
        kategori: "Penjualan pesanan",
        keterangan: `Pesanan ${pesanan.kode} - ${pesanan.namaPemesan}`,
        jumlah: pesanan.total,
        tanggal: new Date(),
        pesananId,
        dicatatOlehId: pemilik.id,
      },
    });
  });

  segarkanHalamanPesanan(pesanan.kode);
  revalidatePath("/admin/keuangan");
  return { sukses: "Pembayaran dicatat sebagai lunas dan masuk ke buku kas." };
}

export async function batalkanPesanan(
  pesananId: string,
  alasan: string,
  uangDikembalikan: boolean
): Promise<HasilPesanan> {
  const pemilik = await wajibPemilik();

  const pesanan = await db.pesanan.findUnique({
    where: { id: pesananId },
    include: { kas: true },
  });
  if (!pesanan) return { error: "Pesanan tidak ditemukan." };
  if (!bolehPindahStatus(pesanan.status, "DIBATALKAN")) {
    return { error: "Pesanan ini sudah selesai dan tidak bisa dibatalkan." };
  }

  await db.$transaction(async (trx) => {
    await trx.pesanan.update({
      where: { id: pesananId },
      data: {
        status: "DIBATALKAN",
        alasanBatal: alasan || null,
        riwayat: {
          create: {
            dari: pesanan.status,
            ke: "DIBATALKAN",
            catatan: alasan || null,
            olehId: pemilik.id,
          },
        },
      },
    });

    // Uang yang sudah masuk tetap tercatat. Kalau benar-benar dikembalikan ke
    // pemesan, dicatat sebagai pengeluaran supaya jejaknya terlihat di buku kas.
    if (uangDikembalikan && pesanan.kas) {
      await trx.catatanKas.create({
        data: {
          jenis: "KELUAR",
          sumber: "MANUAL",
          kategori: "Pengembalian dana",
          keterangan: `Pengembalian pesanan ${pesanan.kode} - ${pesanan.namaPemesan}`,
          jumlah: pesanan.kas.jumlah,
          tanggal: new Date(),
          dicatatOlehId: pemilik.id,
        },
      });
    }
  });

  segarkanHalamanPesanan(pesanan.kode);
  revalidatePath("/admin/keuangan");
  return { sukses: "Pesanan dibatalkan." };
}

function segarkanHalamanPesanan(kode: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/pesanan");
  revalidatePath(`/admin/pesanan/${kode}`);
  revalidatePath(`/pesanan/${kode}`);
  revalidatePath("/riwayat");
}
