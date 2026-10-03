import { db } from "@/lib/db";
import { GalatBisnis } from "@/lib/galat";
import { catatAktivitas } from "@/lib/log-aktivitas";
import { jenisPembayaranUntuk, sisaTagihan, statusBayarDari } from "@/lib/pembayaran";
import type { CaraBayar, Prisma } from "@/generated/prisma/client";

/**
 * Mencatat uang masuk (DP/pelunasan) atau keluar (refund) untuk satu pesanan.
 *
 * Invarian #3: setiap pembayaran melahirkan tepat satu baris kas
 * (`CatatanKas.pembayaranId` unique), dan `Pesanan.dibayar` diubah di
 * transaksi yang sama dengan kunci optimistis — dua klik "Lunas" yang
 * bersamaan tidak akan pernah mencatat uang dua kali.
 *
 * Bukan "use server": pemanggil wajib sudah memeriksa bahwa penggunanya pemilik.
 */
export async function catatPembayaranInti(
  tx: Prisma.TransactionClient,
  o: {
    kode: string;
    jumlah: number;
    metode: CaraBayar;
    refund?: boolean;
    catatan?: string | null;
    olehId: string;
    /** Untuk pesanan yang sedang dibuat di transaksi yang sama (pesanan manual). */
    izinkanDibatalkan?: boolean;
  }
) {
  const p = await tx.pesanan.findUnique({
    where: { kode: o.kode },
    select: { id: true, kode: true, namaPemesan: true, status: true, total: true, dibayar: true, statusBayar: true, buktiBayarUrl: true },
  });
  if (!p) throw new GalatBisnis("Pesanan tidak ditemukan.");
  if (!Number.isInteger(o.jumlah) || o.jumlah <= 0) throw new GalatBisnis("Jumlah harus lebih dari 0.");

  if (o.refund) {
    if (o.jumlah > p.dibayar) {
      throw new GalatBisnis(`Pengembalian melebihi uang yang diterima (${p.dibayar.toLocaleString("id-ID")}).`);
    }
  } else {
    if (p.status === "DIBATALKAN") throw new GalatBisnis("Pesanan yang dibatalkan tidak bisa menerima pembayaran.");
    const sisa = sisaTagihan(p.total, p.dibayar);
    if (sisa === 0) throw new GalatBisnis("Pesanan ini sudah lunas.");
    if (o.jumlah > sisa) {
      throw new GalatBisnis(`Jumlah melebihi sisa tagihan (${sisa.toLocaleString("id-ID")}).`);
    }
  }

  const jenis = o.refund ? "REFUND" : jenisPembayaranUntuk(o.jumlah, p.total, p.dibayar);
  const dibayarBaru = o.refund ? p.dibayar - o.jumlah : p.dibayar + o.jumlah;

  const terkunci = await tx.pesanan.updateMany({
    where: { id: p.id, dibayar: p.dibayar },
    data: {
      dibayar: dibayarBaru,
      // Bukti yang menunggu dianggap sudah diperiksa saat uang dicatat.
      statusBayar: statusBayarDari({ total: p.total, dibayar: dibayarBaru, menungguVerifikasi: false }),
      ...(o.refund ? {} : { buktiBayarUrl: null }),
    },
  });
  if (terkunci.count === 0) {
    throw new GalatBisnis("Pembayaran pesanan ini baru saja dicatat dari perangkat lain. Muat ulang halaman.");
  }

  const pembayaran = await tx.pembayaran.create({
    data: {
      pesananId: p.id,
      jenis,
      metode: o.metode,
      jumlah: o.jumlah,
      // Bukti dipindah ke baris pembayaran supaya unggahan berikutnya (mis.
      // bukti pelunasan) tidak menimpa/menghapus bukti DP.
      buktiUrl: o.refund ? null : p.buktiBayarUrl,
      catatan: o.catatan?.trim().slice(0, 200) || null,
      dicatatOlehId: o.olehId,
    },
  });

  const label = jenis === "DP" ? "DP" : jenis === "PELUNASAN" ? "Pelunasan" : "Pengembalian dana";
  await tx.catatanKas.create({
    data: {
      jenis: o.refund ? "KELUAR" : "MASUK",
      sumber: "PESANAN",
      kategori: o.refund ? "Pengembalian dana" : "Penjualan pesanan",
      jumlah: o.jumlah,
      keterangan: `${label} pesanan ${p.kode} a.n. ${p.namaPemesan}`.slice(0, 200),
      tanggal: new Date(),
      pesananId: p.id,
      pembayaranId: pembayaran.id,
      dicatatOlehId: o.olehId,
    },
  });

  await catatAktivitas(
    { penggunaId: o.olehId, aksi: o.refund ? "refund" : "catat_pembayaran", target: p.kode, rincian: `${label} ${o.jumlah} (${o.metode})` },
    tx
  );

  return { jenis, dibayar: dibayarBaru, total: p.total };
}

/** Pembungkus transaksi untuk pemanggilan tunggal dari Server Action. */
export function catatPembayaran(o: Parameters<typeof catatPembayaranInti>[1]) {
  return db.$transaction((tx) => catatPembayaranInti(tx, o));
}
