import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bacaSesi } from "@/lib/auth";
import { punyaAksesPesanan } from "@/lib/akses-pesanan";
import { pesananMilikAkun, sesiDapur } from "@/lib/kepemilikan";

export const dynamic = "force-dynamic";

/**
 * "Versi" sebuah pesanan (waktu terakhir diubah) — dipakai halaman status
 * pembeli untuk tahu kapan perlu memuat ulang, tanpa merender ulang seluruh
 * halaman setiap 45 detik. Satu kueri primary-key, tanpa data pribadi.
 *
 * Aturan aksesnya sama dengan halaman pesanan (invarian #5): pemegang cookie
 * perangkat, akun pemilik pesanan, atau dapur. Selain itu 404 — tidak
 * membocorkan apakah sebuah kode pesanan ada.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kode: string }> }
): Promise<NextResponse> {
  const { kode } = await params;
  const tolak = () => NextResponse.json({ ada: false }, { status: 404, headers: { "Cache-Control": "no-store" } });

  if (!/^[A-Z0-9-]{4,40}$/.test(kode)) return tolak();

  const [pesanan, sesi, aksesCookie] = await Promise.all([
    db.pesanan.findUnique({ where: { kode }, select: { penggunaId: true, diubahPada: true } }),
    bacaSesi(),
    punyaAksesPesanan(kode),
  ]);
  if (!pesanan) return tolak();
  if (!aksesCookie && !sesiDapur(sesi) && !pesananMilikAkun(sesi, pesanan)) return tolak();

  return NextResponse.json(
    { versi: pesanan.diubahPada.toISOString() },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
