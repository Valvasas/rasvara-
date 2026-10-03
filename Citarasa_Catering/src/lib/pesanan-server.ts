import { z } from "zod";
import { db } from "@/lib/db";
import { GalatBisnis } from "@/lib/galat";
import { buatKodePesanan } from "@/lib/kode-pesanan";
import { ambilPengaturan, rekeningLengkap } from "@/lib/pengaturan";
import { hitungPotongan, normalkanKodeVoucher, pesanTolak } from "@/lib/voucher";
import { hitungMinimalDp, statusBayarDari } from "@/lib/pembayaran";
import {
  dariInputTanggal,
  menitDariJam,
  menitSekarangWib,
  normalkanTelepon,
  selisihHari,
} from "@/lib/format";
import type {
  CaraAmbil,
  CaraBayar,
  Pengaturan,
  Prisma,
  StatusPesanan,
  SumberPesanan,
} from "@/generated/prisma/client";

/**
 * Inti aturan pesanan, dipakai bersama oleh formulir pembeli, pesanan manual
 * dari dashboard, dan pengubahan pesanan. Sebelumnya seluruh aturan ini hanya
 * hidup di dalam satu Server Action; menyalinnya ke jalur lain berarti dua
 * versi aturan harga yang pelan-pelan berbeda.
 *
 * Berkas ini BUKAN "use server": ia hanya boleh dipanggil dari Server Action
 * yang sudah memeriksa wewenang pemanggilnya.
 */

/** Batas atas tiap isian — Server Action bisa dipanggil tanpa lewat formulir. */
export const SkemaItemPesanan = z.object({
  /** Item yang sudah ada (khusus pengubahan): mempertahankan harga snapshot. */
  itemId: z.string().min(1).max(64).optional(),
  menuId: z.string().min(1).max(64).optional(),
  jumlah: z
    .number()
    .int()
    .positive("Jumlah pesanan harus lebih dari 0")
    .max(5000, "Jumlah pesanan terlalu besar. Hubungi dapur untuk pesanan sebesar ini."),
  catatan: z.string().max(300, "Catatan menu terlalu panjang").optional(),
});

export const SkemaIsiPesanan = z
  .object({
    namaPemesan: z.string().trim().min(2, "Nama pemesan minimal 2 karakter").max(100, "Nama pemesan terlalu panjang"),
    teleponPemesan: z.string().min(8, "Nomor telepon minimal 8 digit").max(20, "Nomor telepon terlalu panjang"),
    tanggalAcara: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid"),
    jamAcara: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format jam tidak valid"),
    caraAmbil: z.enum(["AMBIL_SENDIRI", "DIANTAR"]),
    alamatAntar: z.string().max(500, "Alamat antar terlalu panjang").optional(),
    caraBayar: z.enum(["TRANSFER", "TUNAI"]),
    catatanPesanan: z.string().max(1000, "Catatan pesanan terlalu panjang").optional(),
    kodeVoucher: z.string().max(32, "Kode voucher terlalu panjang").optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    items: z
      .array(SkemaItemPesanan)
      .min(1, "Pilih minimal satu menu")
      .max(50, "Terlalu banyak jenis menu dalam satu pesanan"),
  })
  // Peta hanyalah pelengkap; alamat tertulis tetap yang dipakai pengantar.
  .refine((n) => n.caraAmbil !== "DIANTAR" || (n.alamatAntar?.trim().length ?? 0) >= 10, {
    path: ["alamatAntar"],
    message: "Alamat antar wajib diisi lengkap (minimal 10 karakter).",
  })
  .refine((n) => n.items.every((i) => i.itemId || i.menuId), {
    path: ["items"],
    message: "Format item pesanan tidak valid.",
  });

export type IsiPesanan = z.infer<typeof SkemaIsiPesanan>;

export type OpsiPesanan = {
  sumber: SumberPesanan;
  /** Pembeli yang login (atau null untuk tamu / pesanan manual). */
  penggunaId?: string | null;
  /** Pelaku dari dashboard, untuk riwayat status. */
  olehId?: string | null;
  statusAwal?: Extract<StatusPesanan, "BARU" | "DIKONFIRMASI">;
  /**
   * Hanya untuk pemilik/staf: menerima pesanan yang melanggar batas H-, jam
   * lewat, tanggal libur, atau kuota harian — mis. pelanggan tetap yang sudah
   * dijanjikan lewat telepon. Selalu dengan persetujuan eksplisit di formulir.
   */
  abaikanBatas?: boolean;
  catatanRiwayat: string;
};

type MenuDenganResep = Prisma.MenuGetPayload<{ include: { resep: { include: { bahan: true } } } }>;

/** Biaya bahan per satuan menu dari resepnya; null bila belum punya resep. */
export function hppDariResep(menu: Pick<MenuDenganResep, "resep">): number | null {
  if (!menu.resep.length) return null;
  return Math.round(menu.resep.reduce((n, r) => n + r.jumlahPerPorsi * r.bahan.hargaPerSatuan, 0));
}

function hitungOngkir(p: Pengaturan, caraAmbil: CaraAmbil, subtotal: number): number {
  if (caraAmbil !== "DIANTAR") return 0;
  if (p.minOrderAntar > 0 && subtotal >= p.minOrderAntar) return 0;
  return p.ongkirDefault;
}

/** Pemeriksaan jadwal yang tidak butuh transaksi. */
async function periksaJadwal(isi: IsiPesanan, abaikan: boolean): Promise<{ tanggal: Date; selisih: number }> {
  const tanggal = dariInputTanggal(isi.tanggalAcara);
  const selisih = selisihHari(tanggal);
  if (abaikan) return { tanggal, selisih };

  if (selisih < 0) throw new GalatBisnis("Tanggal acara tidak boleh di masa lalu.");

  // Pesanan pukul 08.00 tidak boleh masuk pada pukul 20.00 hari yang sama.
  if (selisih === 0 && menitDariJam(isi.jamAcara) <= menitSekarangWib()) {
    throw new GalatBisnis(
      "Jam acara untuk hari ini sudah lewat. Pilih jam yang lebih malam, atau ganti ke tanggal berikutnya."
    );
  }

  const libur = await db.tanggalTutup.findUnique({ where: { tanggal } });
  if (libur) {
    throw new GalatBisnis(
      `Dapur libur pada tanggal tersebut (${libur.alasan || "Tutup"}). Silakan pilih tanggal lain.`
    );
  }
  return { tanggal, selisih };
}

/**
 * Kuota harian per menu, dihitung dalam transaksi pembuatan/pengubahan.
 * `kecualiPesananId` membuat pesanan yang sedang diubah tidak menghitung porsinya sendiri.
 */
async function periksaKuota(
  tx: Prisma.TransactionClient,
  baris: { menuId: string | null; jumlah: number }[],
  petaMenu: Map<string, MenuDenganResep>,
  tanggal: Date,
  kecualiPesananId?: string
) {
  const kebutuhan = new Map<string, number>();
  for (const b of baris) {
    if (!b.menuId) continue;
    const m = petaMenu.get(b.menuId);
    if (!m?.kapasitasHarian) continue;
    kebutuhan.set(b.menuId, (kebutuhan.get(b.menuId) ?? 0) + b.jumlah);
  }
  if (kebutuhan.size === 0) return;

  const terpakai = await tx.itemPesanan.groupBy({
    by: ["menuId"],
    _sum: { jumlah: true },
    where: {
      menuId: { in: [...kebutuhan.keys()] },
      pesanan: {
        tanggalAcara: tanggal,
        status: { not: "DIBATALKAN" },
        ...(kecualiPesananId ? { id: { not: kecualiPesananId } } : {}),
      },
    },
  });
  const peta = new Map(terpakai.map((t) => [t.menuId, t._sum.jumlah ?? 0]));

  for (const [menuId, butuh] of kebutuhan) {
    const m = petaMenu.get(menuId)!;
    const sudah = peta.get(menuId) ?? 0;
    if (sudah + butuh > m.kapasitasHarian!) {
      const sisa = Math.max(0, m.kapasitasHarian! - sudah);
      throw new GalatBisnis(`Kuota harian "${m.nama}" pada tanggal tersebut tersisa ${sisa} ${m.satuan}.`);
    }
  }
}

async function bacaMenu(klien: Prisma.TransactionClient | typeof db, ids: string[]) {
  const daftar = await klien.menu.findMany({
    where: { id: { in: ids } },
    include: { resep: { include: { bahan: true } } },
  });
  return new Map(daftar.map((m) => [m.id, m]));
}

/** Membuat pesanan baru. Melempar GalatBisnis untuk penolakan yang sah. */
export async function buatPesananBaru(isi: IsiPesanan, opsi: OpsiPesanan) {
  const abaikan = Boolean(opsi.abaikanBatas);
  const { tanggal, selisih } = await periksaJadwal(isi, abaikan);

  if (isi.items.some((i) => !i.menuId || i.itemId)) {
    throw new GalatBisnis("Format item pesanan tidak valid.");
  }
  const menuIds = [...new Set(isi.items.map((i) => i.menuId!))];
  if (menuIds.length !== isi.items.length) {
    throw new GalatBisnis("Menu yang sama tercantum dua kali. Gabungkan jumlahnya.");
  }

  // Invarian #1: harga dibaca ulang dari database, bukan dari peramban.
  const petaMenu = await bacaMenu(db, menuIds);
  for (const id of menuIds) {
    const m = petaMenu.get(id);
    if (!m || !m.aktif) throw new GalatBisnis("Sebagian menu yang dipilih sudah tidak tersedia.");
  }

  for (const it of isi.items) {
    const m = petaMenu.get(it.menuId!)!;
    if (it.jumlah < m.minPesan && !abaikan) {
      throw new GalatBisnis(`Menu "${m.nama}" minimal dipesan ${m.minPesan} ${m.satuan}.`);
    }
    if (m.preorderHari > selisih && !abaikan) {
      throw new GalatBisnis(`Menu "${m.nama}" perlu dipesan paling lambat ${m.preorderHari} hari sebelum acara.`);
    }
  }

  const pengaturan = await ambilPengaturan();
  if (isi.caraBayar === "TRANSFER" && !rekeningLengkap(pengaturan) && opsi.sumber === "WEBSITE") {
    throw new GalatBisnis("Pembayaran transfer belum tersedia saat ini. Silakan pilih bayar tunai.");
  }

  const subtotal = isi.items.reduce((n, it) => n + petaMenu.get(it.menuId!)!.harga * it.jumlah, 0);
  const ongkir = hitungOngkir(pengaturan, isi.caraAmbil, subtotal);
  const kodeVoucher = isi.kodeVoucher?.trim() ? normalkanKodeVoucher(isi.kodeVoucher) : null;

  return db.$transaction(async (tx) => {
    if (!abaikan) {
      await periksaKuota(tx, isi.items.map((i) => ({ menuId: i.menuId!, jumlah: i.jumlah })), petaMenu, tanggal);
    }

    // Voucher dihitung & kuotanya dikunci di transaksi yang sama.
    let diskon = 0;
    let voucherId: string | null = null;
    let kodeVoucherTersimpan: string | null = null;
    if (kodeVoucher) {
      const voucher = await tx.voucher.findUnique({ where: { kode: kodeVoucher } });
      if (!voucher) throw new GalatBisnis(pesanTolak("TIDAK_DITEMUKAN"));
      const hasil = hitungPotongan(voucher, subtotal);
      if (!hasil.berlaku) throw new GalatBisnis(hasil.pesan);
      const terkunci = await tx.voucher.updateMany({
        where: { id: voucher.id, terpakai: voucher.terpakai },
        data: { terpakai: { increment: 1 } },
      });
      if (terkunci.count === 0) {
        throw new GalatBisnis("Voucher sedang dipakai pemesan lain. Silakan kirim ulang pesanan Anda.");
      }
      diskon = hasil.potongan;
      voucherId = voucher.id;
      kodeVoucherTersimpan = voucher.kode;
    }

    // Potongan hanya memakan harga menu, tidak pernah ongkir.
    const total = subtotal - diskon + ongkir;

    let kode = "";
    for (let percobaan = 0; percobaan < 5 && !kode; percobaan++) {
      const kandidat = buatKodePesanan(new Date());
      if (!(await tx.pesanan.findUnique({ where: { kode: kandidat }, select: { id: true } }))) kode = kandidat;
    }
    if (!kode) throw new GalatBisnis("Gagal membuat kode pesanan unik. Silakan coba lagi.");

    const statusAwal = opsi.statusAwal ?? "BARU";
    return tx.pesanan.create({
      data: {
        kode,
        penggunaId: opsi.penggunaId ?? null,
        sumber: opsi.sumber,
        namaPemesan: isi.namaPemesan.trim(),
        teleponPemesan: normalkanTelepon(isi.teleponPemesan),
        tanggalAcara: tanggal,
        jamAcara: isi.jamAcara,
        caraAmbil: isi.caraAmbil as CaraAmbil,
        alamatAntar: isi.caraAmbil === "DIANTAR" ? isi.alamatAntar?.trim() || "" : null,
        latitude: isi.caraAmbil === "DIANTAR" ? isi.latitude ?? null : null,
        longitude: isi.caraAmbil === "DIANTAR" ? isi.longitude ?? null : null,
        caraBayar: isi.caraBayar as CaraBayar,
        catatan: isi.catatanPesanan?.trim() || null,
        subtotal,
        ongkir,
        diskon,
        total,
        minimalDp: isi.caraBayar === "TRANSFER" ? hitungMinimalDp(total, pengaturan.persenDp) : 0,
        voucherId,
        kodeVoucher: kodeVoucherTersimpan,
        status: statusAwal,
        statusBayar: "BELUM_BAYAR",
        dikonfirmasiPada: statusAwal === "DIKONFIRMASI" ? new Date() : null,
        item: {
          create: isi.items.map((it) => {
            const m = petaMenu.get(it.menuId!)!;
            return {
              menuId: m.id,
              namaMenu: m.nama,
              hargaSatuan: m.harga,
              satuan: m.satuan,
              jumlah: it.jumlah,
              catatan: it.catatan?.trim() || null,
              subtotal: m.harga * it.jumlah,
              hppSatuan: hppDariResep(m),
            };
          }),
        },
        riwayat: { create: { ke: statusAwal, catatan: opsi.catatanRiwayat, olehId: opsi.olehId ?? null } },
      },
    });
  });
}

/**
 * Mengubah isi & jadwal pesanan yang belum dimasak.
 *
 * Item lama (dirujuk lewat `itemId`) mempertahankan nama & harga snapshot-nya;
 * item baru memakai harga menu saat ini. Voucher dihitung ulang tanpa memakan
 * kuota lagi. Total baru tidak boleh lebih kecil dari uang yang sudah diterima.
 */
export async function ubahPesanan(kode: string, isi: IsiPesanan, opsi: { olehId: string; abaikanBatas?: boolean }) {
  const abaikan = Boolean(opsi.abaikanBatas);
  const lama = await db.pesanan.findUnique({ where: { kode }, include: { item: true, voucher: true } });
  if (!lama) throw new GalatBisnis("Pesanan tidak ditemukan.");
  if (lama.status !== "BARU" && lama.status !== "DIKONFIRMASI") {
    throw new GalatBisnis("Pesanan yang sudah mulai dimasak atau ditutup tidak bisa diubah.");
  }

  const { tanggal, selisih } = await periksaJadwal(isi, abaikan);
  const itemLama = new Map(lama.item.map((i) => [i.id, i]));
  const menuIdBaru = isi.items.filter((i) => !i.itemId).map((i) => i.menuId!);
  const semuaMenuId = [...new Set([...menuIdBaru, ...lama.item.map((i) => i.menuId).filter((x): x is string => !!x)])];
  const petaMenu = await bacaMenu(db, semuaMenuId);

  const baris = isi.items.map((it) => {
    if (it.itemId) {
      const l = itemLama.get(it.itemId);
      if (!l) throw new GalatBisnis("Ada item yang sudah tidak ada di pesanan ini. Muat ulang halaman.");
      return {
        menuId: l.menuId,
        namaMenu: l.namaMenu,
        hargaSatuan: l.hargaSatuan,
        satuan: l.satuan,
        jumlah: it.jumlah,
        catatan: it.catatan?.trim() || l.catatan,
        subtotal: l.hargaSatuan * it.jumlah,
        hppSatuan: l.hppSatuan,
        baru: false,
      };
    }
    const m = petaMenu.get(it.menuId!);
    if (!m || !m.aktif) throw new GalatBisnis("Sebagian menu yang ditambahkan sudah tidak tersedia.");
    if (!abaikan && it.jumlah < m.minPesan) {
      throw new GalatBisnis(`Menu "${m.nama}" minimal dipesan ${m.minPesan} ${m.satuan}.`);
    }
    if (!abaikan && m.preorderHari > selisih) {
      throw new GalatBisnis(`Menu "${m.nama}" perlu dipesan paling lambat ${m.preorderHari} hari sebelum acara.`);
    }
    return {
      menuId: m.id,
      namaMenu: m.nama,
      hargaSatuan: m.harga,
      satuan: m.satuan,
      jumlah: it.jumlah,
      catatan: it.catatan?.trim() || null,
      subtotal: m.harga * it.jumlah,
      hppSatuan: hppDariResep(m),
      baru: true,
    };
  });

  const menuTerpakai = baris.map((b) => b.menuId).filter(Boolean);
  if (new Set(menuTerpakai).size !== menuTerpakai.length) {
    throw new GalatBisnis("Menu yang sama tercantum dua kali. Gabungkan jumlahnya.");
  }

  const pengaturan = await ambilPengaturan();
  const subtotal = baris.reduce((n, b) => n + b.subtotal, 0);
  const ongkir = hitungOngkir(pengaturan, isi.caraAmbil, subtotal);

  // Voucher: kuotanya sudah terpakai saat pesanan dibuat; di sini hanya
  // dihitung ulang terhadap subtotal baru. Voucher yang sudah dihapus tetap
  // memberi potongan lama, dibatasi subtotal.
  let diskon = 0;
  if (lama.voucher) {
    const hasil = hitungPotongan({ ...lama.voucher, aktif: true, berakhirPada: null, mulaiPada: null, kuota: null }, subtotal);
    diskon = hasil.berlaku ? hasil.potongan : 0;
  } else if (lama.diskon > 0) {
    diskon = Math.min(lama.diskon, subtotal);
  }
  const total = subtotal - diskon + ongkir;

  if (total < lama.dibayar) {
    throw new GalatBisnis(
      `Total baru (${total.toLocaleString("id-ID")}) lebih kecil dari uang yang sudah diterima. Catat pengembalian dana dulu.`
    );
  }

  return db.$transaction(async (tx) => {
    if (!abaikan) {
      await periksaKuota(tx, baris, petaMenu, tanggal, lama.id);
    }

    // Kunci optimistis: perubahan dibatalkan bila pesanan baru saja diubah orang lain.
    const terkunci = await tx.pesanan.updateMany({
      where: { id: lama.id, diubahPada: lama.diubahPada },
      data: {
        namaPemesan: isi.namaPemesan.trim(),
        teleponPemesan: normalkanTelepon(isi.teleponPemesan),
        tanggalAcara: tanggal,
        jamAcara: isi.jamAcara,
        caraAmbil: isi.caraAmbil as CaraAmbil,
        alamatAntar: isi.caraAmbil === "DIANTAR" ? isi.alamatAntar?.trim() || "" : null,
        latitude: isi.caraAmbil === "DIANTAR" ? lama.latitude : null,
        longitude: isi.caraAmbil === "DIANTAR" ? lama.longitude : null,
        caraBayar: isi.caraBayar as CaraBayar,
        catatan: isi.catatanPesanan?.trim() || null,
        subtotal,
        ongkir,
        diskon,
        total,
        minimalDp: isi.caraBayar === "TRANSFER" ? hitungMinimalDp(total, pengaturan.persenDp) : 0,
        statusBayar: statusBayarDari({ total, dibayar: lama.dibayar, menungguVerifikasi: lama.statusBayar === "MENUNGGU_VERIFIKASI" }),
      },
    });
    if (terkunci.count === 0) {
      throw new GalatBisnis("Pesanan ini baru saja diubah dari perangkat lain. Muat ulang halaman.");
    }

    await tx.itemPesanan.deleteMany({ where: { pesananId: lama.id } });
    await tx.itemPesanan.createMany({
      data: baris.map(({ baru: _baru, ...b }) => ({ ...b, pesananId: lama.id })),
    });

    const ringkas = baris.map((b) => `${b.namaMenu} ×${b.jumlah}`).join(", ");
    await tx.riwayatStatus.create({
      data: {
        pesananId: lama.id,
        dari: lama.status,
        ke: lama.status,
        olehId: opsi.olehId,
        catatan: `Pesanan diubah. Total ${lama.total.toLocaleString("id-ID")} → ${total.toLocaleString("id-ID")}. Isi: ${ringkas}`.slice(0, 500),
      },
    });

    return { kode, total, totalLama: lama.total };
  });
}
