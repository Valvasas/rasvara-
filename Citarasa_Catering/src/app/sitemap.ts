import type { MetadataRoute } from "next";
import { ambilMenuAktif } from "@/lib/menu";
import { alamatSitus } from "@/lib/situs";

/**
 * Tanpa ini sitemap dirender SEKALI saat build lalu dibekukan: menu yang
 * ditambah pemilik sesudah deploy tidak pernah muncul di mesin pencari sampai
 * deploy berikutnya. Diperbarui paling lambat tiap jam.
 */
export const revalidate = 3600;

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
  // pencari. `ambilMenuAktif` sengaja TIDAK punya katalog cadangan, jadi galat
  // database ditangkap di sini: sitemap dirender juga saat build, dan database
  // yang sesaat tak terjangkau (atau dijeda) tidak boleh menggagalkan deploy.
  // Halaman tetap tetap dipetakan; menu menyusul pada revalidasi berikutnya.
  let menu: Awaited<ReturnType<typeof ambilMenuAktif>> = [];
  try {
    menu = await ambilMenuAktif();
  } catch (galat) {
    console.error(
      "[sitemap] Menu tidak bisa dimuat, sitemap memuat halaman tetap saja:",
      galat instanceof Error ? galat.message || galat.name : String(galat)
    );
  }

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
