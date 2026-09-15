import { db } from "@/lib/db";
import { MENU_BAWAAN } from "@/lib/menu-bawaan";
import type { KategoriMenu, Menu } from "@/generated/prisma/client";

export async function ambilMenuAktif(kategori?: KategoriMenu): Promise<Menu[]> {
  try {
    const promise = db.menu.findMany({
      where: {
        aktif: true,
        ...(kategori ? { kategori } : {}),
      },
      orderBy: [{ kategori: "asc" }, { urutan: "asc" }, { nama: "asc" }],
    });

    // Timeout 1 detik jika database offline
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("DB_TIMEOUT")), 1000)
    );

    const hasil = (await Promise.race([promise, timeout])) as Menu[];
    if (hasil && hasil.length > 0) return hasil;
  } catch {
    // Database offline atau belum ada data: gunakan menu bawaan
  }

  if (kategori) {
    return MENU_BAWAAN.filter((m) => m.kategori === kategori);
  }
  return MENU_BAWAAN;
}

/** Satu menu aktif berdasarkan slug, untuk halaman detail. Null jika tidak ada/nonaktif. */
export async function ambilMenuBerdasarkanSlug(slug: string): Promise<Menu | null> {
  try {
    const promise = db.menu.findUnique({ where: { slug } });

    // Timeout 1 detik jika database offline
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("DB_TIMEOUT")), 1000)
    );

    const hasil = (await Promise.race([promise, timeout])) as Menu | null;
    if (hasil) return hasil.aktif ? hasil : null;
  } catch {
    // Database offline atau belum ada data: gunakan menu bawaan
  }

  const bawaan = MENU_BAWAAN.find((m) => m.slug === slug);
  return bawaan && bawaan.aktif ? bawaan : null;
}

