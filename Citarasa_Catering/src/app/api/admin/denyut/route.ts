import { NextResponse } from "next/server";
import { bacaSesi } from "@/lib/auth";
import { bacaDenyut } from "@/lib/denyut";
import { periksaBatasLaju } from "@/lib/pembatas-laju";

export const dynamic = "force-dynamic";

const TANPA_CACHE = { "Cache-Control": "private, no-store" };

export async function GET(): Promise<NextResponse> {
  const sesi = await bacaSesi();
  if (!sesi || (sesi.peran !== "PEMILIK" && sesi.peran !== "STAF_DAPUR")) {
    return NextResponse.json({ galat: "tidak berwenang" }, { status: 401, headers: TANPA_CACHE });
  }

  // Satu layar memanggil tiap 20 detik; batas ini longgar untuk beberapa tab,
  // tetapi menghentikan skrip yang memukul endpoint tanpa henti.
  const laju = periksaBatasLaju({ kunci: `denyut:${sesi.id}`, maksimal: 30, jendelaDetik: 60 });
  if (!laju.diizinkan) {
    return NextResponse.json({ galat: "terlalu sering" }, { status: 429, headers: { ...TANPA_CACHE, "Retry-After": String(laju.tungguDetik) } });
  }

  return NextResponse.json(await bacaDenyut(), { headers: TANPA_CACHE });
}
