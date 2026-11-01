import { NextResponse } from "next/server";
import { bacaSesi } from "@/lib/auth";
import { sesiDapur } from "@/lib/kepemilikan";
import { ambilDenyut } from "@/lib/denyut";

export const dynamic = "force-dynamic";

/** Dipantau dashboard dapur untuk notifikasi pesanan baru. Hanya pemilik & staf. */
export async function GET(): Promise<NextResponse> {
  const sesi = await bacaSesi();
  if (!sesi || !sesiDapur(sesi)) {
    return NextResponse.json({ galat: "Tidak berwenang" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const denyut = await ambilDenyut(sesi.peran === "PEMILIK");
  return NextResponse.json(denyut, { headers: { "Cache-Control": "private, no-store" } });
}
