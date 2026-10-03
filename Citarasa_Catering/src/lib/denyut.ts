import { db } from "@/lib/db";

/**
 * "Detak" papan dapur: penanda versi data pesanan + jumlah pesanan baru.
 * Sengaja tanpa nama, nomor, atau nominal — endpoint ini dipanggil puluhan
 * kali per jam dari setiap layar dapur.
 */
export async function bacaDenyut(): Promise<{ versi: string; baru: number }> {
  const [terakhir, baru] = await Promise.all([
    db.pesanan.aggregate({ _max: { diubahPada: true }, _count: { _all: true } }),
    db.pesanan.count({ where: { status: "BARU" } }),
  ]);
  // Jumlah baris ikut masuk versi supaya pesanan yang dihapus (jarang) tetap
  // terdeteksi walau waktu ubah terakhirnya tidak bergerak.
  const versi = `${terakhir._max.diubahPada?.getTime() ?? 0}-${terakhir._count._all}`;
  return { versi, baru };
}
