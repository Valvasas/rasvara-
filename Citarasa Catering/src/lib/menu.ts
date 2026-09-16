import { db } from "@/lib/db";
import { MENU_BAWAAN } from "@/lib/menu-bawaan";
import type { FotoMenu, KategoriMenu, Menu } from "@/generated/prisma/client";

/** Menu beserta galerinya, sudah urut dari sampul. Bentuk ini yang dipakai seluruh katalog. */
export type MenuDenganFoto = Menu & { foto: FotoMenu[] };

const URUT_FOTO = { foto: { orderBy: { urutan: "asc" as const } } };

export async function ambilMenuAktif(
  kategori?: KategoriMenu
): Promise<MenuDenganFoto[]> {
  try {
    const promise = db.menu.findMany({
      where: {
        aktif: true,
        ...(kategori ? { kategori } : {}),
      },
      orderBy: [{ kategori: "asc" }, { urutan: "asc" }, { nama: "asc" }],
      include: URUT_FOTO,
    });

    // Timeout 1 detik jika database offline
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("DB_TIMEOUT")), 1000)
    );

    const hasil = (await Promise.race([promise, timeout])) as MenuDenganFoto[];
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
export async function ambilMenuBerdasarkanSlug(
  slug: string
): Promise<MenuDenganFoto | null> {
  try {
    const promise = db.menu.findUnique({
      where: { slug },
      include: URUT_FOTO,
    });

    // Timeout 1 detik jika database offline
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("DB_TIMEOUT")), 1000)
    );

    const hasil = (await Promise.race([promise, timeout])) as MenuDenganFoto | null;
    if (hasil) return hasil.aktif ? hasil : null;
  } catch {
    // Database offline atau belum ada data: gunakan menu bawaan
  }

  const bawaan = MENU_BAWAAN.find((m) => m.slug === slug);
  return bawaan && bawaan.aktif ? bawaan : null;
}

