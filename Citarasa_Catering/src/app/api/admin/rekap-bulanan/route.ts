import { NextResponse } from "next/server";
import { bacaSesi } from "@/lib/auth";
import { hariIniWib } from "@/lib/format";
import { POLA_BULAN } from "@/lib/bulan";
import { periksaBatasLaju } from "@/lib/pembatas-laju";
import { kumpulkanDataRekap } from "@/lib/rekap-data";
import { namaBerkasAman, susunWorkbook } from "@/lib/rekap-xlsx";
import { responsWorkbook } from "@/lib/respons-xlsx";
import { ambilPengaturan } from "@/lib/pengaturan";

export const dynamic = "force-dynamic";

/** Rekap bulanan XLSX dari data terbaru (bukan arsip). Hanya pemilik. */
export async function GET(request: Request): Promise<NextResponse> {
  const sesi = await bacaSesi();
  if (sesi?.peran !== "PEMILIK") {
    return new NextResponse("Tidak berwenang. Silakan masuk sebagai pemilik.", { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  // Menyusun rekap memakan beberapa kueri agregat; batasi supaya klik beruntun tidak membebani DB.
  const laju = periksaBatasLaju({ kunci: `rekap-xlsx:${sesi.id}`, maksimal: 10, jendelaDetik: 60 });
  if (!laju.diizinkan) {
    return new NextResponse("Terlalu sering mengunduh. Coba lagi sebentar.", { status: 429, headers: { "Retry-After": String(laju.tungguDetik) } });
  }

  const diminta = new URL(request.url).searchParams.get("bulan") ?? "";
  const bulan = POLA_BULAN.test(diminta) ? diminta : hariIniWib().slice(0, 7);

  const [data, pengaturan] = await Promise.all([kumpulkanDataRekap(bulan), ambilPengaturan()]);
  return responsWorkbook(susunWorkbook(data), `rekap-${namaBerkasAman(pengaturan.namaUsaha)}-${bulan}.xlsx`);
}
