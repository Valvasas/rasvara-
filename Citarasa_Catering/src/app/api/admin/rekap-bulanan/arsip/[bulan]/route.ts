import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { bacaSesi } from "@/lib/auth";
import { db } from "@/lib/db";
import { POLA_BULAN } from "@/lib/bulan";
import { berkasArsip } from "@/lib/tugas";
import { responsBerkasXlsx } from "@/lib/respons-xlsx";

export const dynamic = "force-dynamic";

/** Unduh arsip rekap yang dibuat otomatis tiap awal bulan. Hanya pemilik. */
export async function GET(_req: Request, ctx: { params: Promise<{ bulan: string }> }): Promise<NextResponse> {
  const sesi = await bacaSesi();
  if (sesi?.peran !== "PEMILIK") return new NextResponse("Tidak berwenang.", { status: 401, headers: { "Cache-Control": "no-store" } });

  const { bulan } = await ctx.params;
  // Regex ketat sebelum apa pun: path traversal ("../") tidak pernah mencapai sistem berkas,
  // dan path dibentuk ulang dari bulan, bukan dari kolom database.
  if (!POLA_BULAN.test(bulan)) return new NextResponse("Tidak ditemukan.", { status: 404 });
  const baris = await db.rekapBulanan.findUnique({ where: { bulan } });
  if (!baris) return new NextResponse("Tidak ditemukan.", { status: 404 });

  try {
    const isi = await readFile(berkasArsip(bulan));
    return responsBerkasXlsx(isi, `arsip-rekap-${bulan}.xlsx`);
  } catch {
    return new NextResponse("Berkas arsip hilang dari server. Unduh rekap terbaru dari halaman Laporan.", { status: 404 });
  }
}
