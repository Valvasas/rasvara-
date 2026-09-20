import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const mulai = Date.now();

  try {
    // Uji koneksi database dengan kueri ringan
    await db.pengaturan.count();
    const latensiMs = Date.now() - mulai;

    return NextResponse.json(
      {
        status: "ok",
        pesan: "Citarasa Catering berjalan normal",
        lingkungan: process.env.NODE_ENV ?? "unknown",
        uptimeDetik: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        database: {
          status: "terhubung",
          latensiMs,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
        },
      }
    );
  } catch (error) {
    const pesanError = error instanceof Error ? error.message : "Kesalahan tidak diketahui";
    console.error("[HealthCheck] Database tidak merespons:", pesanError);

    return NextResponse.json(
      {
        status: "error",
        pesan: "Layanan mengalami degradasi koneksi database",
        lingkungan: process.env.NODE_ENV ?? "unknown",
        uptimeDetik: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        database: {
          status: "terputus",
          error: pesanError,
        },
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
        },
      }
    );
  }
}

