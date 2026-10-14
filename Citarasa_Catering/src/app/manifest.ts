import type { MetadataRoute } from "next";
import { ambilPengaturan } from "@/lib/pengaturan";

/**
 * Manifest PWA supaya pemilik dan staf dapur bisa memasang dashboard ke layar
 * utama HP dan membukanya seperti aplikasi — tanpa bilah alamat browser yang
 * memakan ruang saat dipakai berdiri di dapur.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const pengaturan = await ambilPengaturan();

  return {
    name: `${pengaturan.namaUsaha} — Pesan & Kelola Katering`,
    short_name: pengaturan.namaUsaha,
    description: pengaturan.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#FFFCF7", // = --color-krem, supaya layar pembuka tidak berkedip beda warna
    theme_color: "#C2461C", // = --color-bata
    lang: "id",
    orientation: "portrait",
    // URL dari src/app/icon.tsx (generateImageMetadata). Chrome butuh 192 & 512
    // untuk tawaran "Pasang aplikasi" dan layar pembuka yang tajam.
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
