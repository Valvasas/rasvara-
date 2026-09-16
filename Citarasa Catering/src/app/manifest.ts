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
    background_color: "#FBF7EE",
    theme_color: "#C2410C",
    lang: "id",
    orientation: "portrait",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
