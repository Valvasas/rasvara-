import type { MetadataRoute } from "next";
import { ambilMenuAktif } from "@/lib/menu";
import { alamatSitus } from "@/lib/situs";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const dasar = alamatSitus();

  const halamanTetap: MetadataRoute.Sitemap = [
    { url: dasar, changeFrequency: "weekly", priority: 1 },
    { url: `${dasar}/menu`, changeFrequency: "daily", priority: 0.9 },
    { url: `${dasar}/pesan`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${dasar}/lacak`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${dasar}/kebijakan-privasi`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${dasar}/syarat-ketentuan`, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Menu ikut dipetakan supaya tiap halaman detail bisa ditemukan mesin
  // pencari. `ambilMenuAktif` sudah punya fallback sendiri saat database
  // belum siap, jadi sitemap tidak pernah menggagalkan build.
  const menu = await ambilMenuAktif();

  return [
    ...halamanTetap,
    ...menu.map((m) => ({
      url: `${dasar}/menu/${m.slug}`,
      lastModified: m.diubahPada,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
