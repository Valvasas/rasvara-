import type { Instrumentation } from "next";

/**
 * Pencatat galat server terpusat.
 *
 * Setiap galat yang ditangkap Next.js (Server Component, Server Action, Route
 * Handler) ditulis sebagai SATU baris JSON ke log. Di Vercel baris ini muncul
 * di Logs/Observability dan bisa dicari; `digest` sama dengan "Kode galat"
 * yang tampil di halaman galat pembeli, jadi laporan "kodenya 12345" langsung
 * bisa ditelusuri.
 *
 * Sengaja tanpa layanan pihak ketiga (Sentry dsb.): tidak ada data pembeli
 * yang dikirim ke luar (lihat invarian #8). Yang dicatat juga dibatasi —
 * header (berisi cookie sesi) tidak pernah ikut, dan kode pesanan di path
 * disamarkan.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const pesan = err instanceof Error ? err.message : String(err);
  const digest =
    typeof err === "object" && err !== null && "digest" in err ? String((err as { digest: unknown }).digest) : undefined;
  const path = request.path.split("?")[0].replace(/\/pesanan\/[^/]+/, "/pesanan/[kode]");

  console.error(
    JSON.stringify({
      tingkat: "galat",
      digest,
      pesan: pesan.slice(0, 500),
      metode: request.method,
      path,
      rute: context.routePath,
      jenis: context.routeType,
      waktu: new Date().toISOString(),
    })
  );
};
