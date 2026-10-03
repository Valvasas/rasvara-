import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { jalankanTugas } from "@/lib/tugas";
import { ambilIpKlien, periksaBatasLaju } from "@/lib/pembatas-laju";

export const dynamic = "force-dynamic";

const TANPA_CACHE = { "Cache-Control": "no-store" };

/** Bandingkan rahasia dalam waktu konstan; hash dulu supaya panjang berbeda pun tidak bocor lewat waktu. */
function rahasiaCocok(diberikan: string, seharusnya: string): boolean {
  const a = createHash("sha256").update(diberikan).digest();
  const b = createHash("sha256").update(seharusnya).digest();
  return timingSafeEqual(a, b);
}

/**
 * Dipanggil cron server tiap 15 menit:
 *   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://situs/api/tugas/jalankan
 * Hanya POST + bearer (bukan cookie) → tidak bisa dipicu lewat CSRF dari peramban.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const rahasia = process.env.CRON_SECRET ?? "";
  if (rahasia.length < 32) {
    return NextResponse.json({ galat: "CRON_SECRET belum disetel (minimal 32 karakter)" }, { status: 503, headers: TANPA_CACHE });
  }

  const laju = periksaBatasLaju({ kunci: `tugas:${await ambilIpKlien()}`, maksimal: 10, jendelaDetik: 60 });
  if (!laju.diizinkan) {
    return NextResponse.json({ galat: "terlalu sering" }, { status: 429, headers: { ...TANPA_CACHE, "Retry-After": String(laju.tungguDetik) } });
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || !rahasiaCocok(token, rahasia)) {
    return NextResponse.json({ galat: "tidak berwenang" }, { status: 401, headers: TANPA_CACHE });
  }

  try {
    return NextResponse.json(await jalankanTugas(), { headers: TANPA_CACHE });
  } catch (e) {
    console.error("[tugas] gagal", e);
    return NextResponse.json({ galat: "tugas gagal, lihat log server" }, { status: 500, headers: TANPA_CACHE });
  }
}
