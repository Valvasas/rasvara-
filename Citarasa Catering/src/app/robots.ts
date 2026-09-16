import type { MetadataRoute } from "next";
import { alamatSitus } from "@/lib/situs";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Halaman di balik login dan halaman bertanda pesanan tidak boleh
      // diindeks: isinya data pemesan, bukan etalase.
      disallow: ["/admin", "/admin/", "/pesanan/", "/riwayat", "/masuk", "/daftar"],
    },
    sitemap: `${alamatSitus()}/sitemap.xml`,
  };
}
