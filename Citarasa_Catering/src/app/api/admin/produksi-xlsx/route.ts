import { NextResponse } from "next/server";
import { bacaSesi } from "@/lib/auth";
import { hariIniWib } from "@/lib/format";
import { periksaBatasLaju } from "@/lib/pembatas-laju";
import { kumpulkanDataProduksi } from "@/lib/rekap-data";
import { susunWorkbookProduksi } from "@/lib/rekap-xlsx";
import { responsWorkbook } from "@/lib/respons-xlsx";

export const dynamic = "force-dynamic";

const POLA_TANGGAL = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** Rekap produksi satu hari (yang dimasak, belanja, jadwal). Staf & pemilik; harga hanya untuk pemilik. */
export async function GET(request: Request): Promise<NextResponse> {
  const sesi = await bacaSesi();
  if (!sesi || (sesi.peran !== "PEMILIK" && sesi.peran !== "STAF_DAPUR")) {
    return new NextResponse("Tidak berwenang.", { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const laju = periksaBatasLaju({ kunci: `produksi-xlsx:${sesi.id}`, maksimal: 20, jendelaDetik: 60 });
  if (!laju.diizinkan) {
    return new NextResponse("Terlalu sering mengunduh. Coba lagi sebentar.", { status: 429, headers: { "Retry-After": String(laju.tungguDetik) } });
  }

  const q = new URL(request.url).searchParams;
  const diminta = q.get("tanggal") ?? "";
  const tanggal = POLA_TANGGAL.test(diminta) ? diminta : hariIniWib();
  const data = await kumpulkanDataProduksi(tanggal, q.get("baru") === "1", sesi.peran === "PEMILIK");
  return responsWorkbook(susunWorkbookProduksi(data), `produksi-${tanggal}.xlsx`);
}
