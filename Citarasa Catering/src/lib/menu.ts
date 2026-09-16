import { db } from "@/lib/db";
import { MENU_BAWAAN } from "@/lib/menu-bawaan";
import type { FotoMenu, KategoriMenu, Menu } from "@/generated/prisma/client";

/** Menu beserta galerinya, sudah urut dari sampul. Bentuk ini yang dipakai seluruh katalog. */
export type MenuDenganFoto = Menu & { foto: FotoMenu[] };

/** Bidang yang benar-benar dipakai formulir pemesanan — tanpa galeri foto. */
export type MenuUntukPemesanan = Pick<
  Menu,
  | "id"
  | "nama"
  | "slug"
  | "deskripsi"
  | "kategori"
  | "harga"
  | "satuan"
  | "minPesan"
  | "preorderHari"
>;

const URUT_FOTO = { foto: { orderBy: { urutan: "asc" as const } } };
const URUTAN_KATALOG = [
  { kategori: "asc" as const },
  { urutan: "asc" as const },
  { nama: "asc" as const },
];

/**
 * Katalog berubah paling banyak beberapa kali sehari, tapi dibaca tiap kali ada
 * yang membuka halaman. Menyinggahkannya sebentar membuat lonjakan pengunjung
 * tidak diteruskan satu-satu ke database.
 */
const UMUR_SINGGAHAN_MS = 30 * 1000;

const singgahan = new Map<string, { nilai: unknown; kedaluwarsa: number }>();
const sedangMuat = new Map<string, Promise<unknown>>();

async function denganSinggahan<T>(
  kunci: string,
  muat: () => Promise<T>
): Promise<T> {
  const tersimpan = singgahan.get(kunci);
  if (tersimpan && tersimpan.kedaluwarsa > Date.now()) {
    return tersimpan.nilai as T;
  }

  // Saat singgahan kedaluwarsa di tengah lonjakan pengunjung, tanpa penjaga ini
  // semua permintaan yang tiba bersamaan akan menembak kueri yang sama.
  const berjalan = sedangMuat.get(kunci);
  if (berjalan) return berjalan as Promise<T>;

  const promise = muat()
    .then((nilai) => {
      singgahan.set(kunci, { nilai, kedaluwarsa: Date.now() + UMUR_SINGGAHAN_MS });
      return nilai;
    })
    .finally(() => {
      sedangMuat.delete(kunci);
    });

  sedangMuat.set(kunci, promise);
  return promise;
}

/** Dipanggil setelah menu diubah pemilik supaya katalog langsung menyesuaikan. */
export function lupakanSinggahanMenu(): void {
  singgahan.clear();
}

export async function ambilMenuAktif(
  kategori?: KategoriMenu
): Promise<MenuDenganFoto[]> {
  try {
    const hasil = await denganSinggahan(`aktif:${kategori ?? "semua"}`, () =>
      db.menu.findMany({
        where: { aktif: true, ...(kategori ? { kategori } : {}) },
        orderBy: URUTAN_KATALOG,
        include: URUT_FOTO,
      })
    );
    if (hasil.length > 0) return hasil;
  } catch {
    // Database belum siap: tampilkan contoh katalog di bawah.
  }

  // Hanya untuk pemasangan baru yang databasenya belum di-seed, supaya halaman
  // depan tidak kosong melompong. Menu contoh ini TIDAK boleh dipakai formulir
  // pemesanan — lihat catatan di ambilMenuUntukPemesanan().
  return kategori
    ? MENU_BAWAAN.filter((m) => m.kategori === kategori)
    : MENU_BAWAAN;
}

/**
 * Satu halaman katalog, dipotong di database.
 *
 * Memotong di JavaScript berarti seluruh menu (berikut seluruh barisan fotonya)
 * tetap ditarik dari database dan dibuang lagi — makin banyak menu, makin besar
 * kerja yang terbuang untuk menampilkan sembilan kartu yang sama.
 */
export async function ambilHalamanMenu(opsi: {
  kategori?: KategoriMenu;
  halaman: number;
  ukuran: number;
}): Promise<{ daftar: MenuDenganFoto[]; total: number }> {
  const where = { aktif: true, ...(opsi.kategori ? { kategori: opsi.kategori } : {}) };

  try {
    const total = await denganSinggahan(`jumlah:${opsi.kategori ?? "semua"}`, () =>
      db.menu.count({ where })
    );

    if (total === 0) throw new Error("KOSONG");

    const halaman = Math.min(
      Math.max(1, opsi.halaman),
      Math.max(1, Math.ceil(total / opsi.ukuran))
    );

    const daftar = await denganSinggahan(
      `halaman:${opsi.kategori ?? "semua"}:${halaman}:${opsi.ukuran}`,
      () =>
        db.menu.findMany({
          where,
          orderBy: URUTAN_KATALOG,
          include: URUT_FOTO,
          skip: (halaman - 1) * opsi.ukuran,
          take: opsi.ukuran,
        })
    );

    return { daftar, total };
  } catch {
    const semua = opsi.kategori
      ? MENU_BAWAAN.filter((m) => m.kategori === opsi.kategori)
      : MENU_BAWAAN;
    const mulai = (Math.max(1, opsi.halaman) - 1) * opsi.ukuran;
    return { daftar: semua.slice(mulai, mulai + opsi.ukuran), total: semua.length };
  }
}

/**
 * Menu untuk formulir pemesanan.
 *
 * Sengaja TIDAK punya jalur cadangan ke MENU_BAWAAN: id menu contoh itu tidak
 * ada di database, jadi setiap pesanan yang disusun darinya pasti ditolak saat
 * dikirim ("menu tidak ditemukan") — pembeli mengisi formulir panjang untuk
 * kemudian gagal. Lebih jujur membiarkan halaman ini menyatakan katalog sedang
 * tidak bisa dimuat.
 *
 * Galeri foto juga tidak ikut diambil: formulir tidak menampilkannya, tapi kalau
 * ikut terbawa, seluruh barisan foto tiap menu ikut terkirim ke peramban.
 */
export async function ambilMenuUntukPemesanan(): Promise<MenuUntukPemesanan[]> {
  return denganSinggahan("pemesanan", () =>
    db.menu.findMany({
      where: { aktif: true },
      orderBy: URUTAN_KATALOG,
      select: {
        id: true,
        nama: true,
        slug: true,
        deskripsi: true,
        kategori: true,
        harga: true,
        satuan: true,
        minPesan: true,
        preorderHari: true,
      },
    })
  );
}

/** Satu menu aktif berdasarkan slug, untuk halaman detail. Null jika tidak ada/nonaktif. */
export async function ambilMenuBerdasarkanSlug(
  slug: string
): Promise<MenuDenganFoto | null> {
  try {
    const hasil = await denganSinggahan(`slug:${slug}`, () =>
      db.menu.findUnique({ where: { slug }, include: URUT_FOTO })
    );
    if (hasil) return hasil.aktif ? hasil : null;
  } catch {
    // Database belum siap: pakai contoh katalog di bawah.
  }

  const bawaan = MENU_BAWAAN.find((m) => m.slug === slug);
  return bawaan && bawaan.aktif ? bawaan : null;
}
