import type { NextConfig } from "next";

/**
 * Daftar sumber yang boleh dimuat halaman ini.
 *
 * Tanpa ini, satu celah penyisipan skrip di mana pun bebas menarik kode dari
 * domain mana pun dan mengirim isi halaman (rincian pesanan, nomor telepon
 * pembeli) ke luar. Peta memakai ubin OpenStreetMap, jadi hanya domain itu yang
 * dibuka untuk gambar.
 *
 * `'unsafe-inline'` pada skrip masih diperlukan karena Next.js menyisipkan skrip
 * bootstrap-nya secara inline; menggantinya dengan nonce mengharuskan setiap
 * halaman dirender dinamis, dan itu justru membuang keuntungan cache yang baru
 * saja dikejar.
 */
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://tile.openstreetmap.org",
  "font-src 'self' data:",
  "connect-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "*": ["./legacy/**"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: CSP,
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
      {
        // Bukti transfer dan foto menu adalah berkas kiriman pengguna. Sudah
        // diperiksa magic bytes-nya saat diunggah, tapi kalau toh ada yang lolos,
        // header ini memastikan peramban menampilkannya sebagai gambar saja dan
        // tidak menjalankan apa pun di dalamnya.
        source: "/unggahan/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'none'; img-src 'self'; sandbox",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
