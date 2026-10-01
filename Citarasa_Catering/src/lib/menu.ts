import { db } from "@/lib/db";
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
  singgahanPanjang.clear();
}

export async function ambilMenuAktif(
  kategori?: KategoriMenu
): Promise<MenuDenganFoto[]> {
  // Tidak ada lagi katalog contoh saat database kosong/gagal: menu fiktif yang
  // tampil di toko tapi tidak bisa dipesan lebih merugikan daripada halaman
  // kosong yang jujur atau halaman galat.
  return denganSinggahan(`aktif:${kategori ?? "semua"}`, () =>
    db.menu.findMany({
      where: { aktif: true, ...(kategori ? { kategori } : {}) },
      orderBy: URUTAN_KATALOG,
      include: URUT_FOTO,
    })
  );
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
  cari?: string;
  halaman: number;
  ukuran: number;
}): Promise<{ daftar: MenuDenganFoto[]; total: number }> {
  const where = {
    aktif: true,
    ...(opsi.kategori ? { kategori: opsi.kategori } : {}),
    ...(opsi.cari
      ? {
          OR: [
            { nama: { contains: opsi.cari, mode: "insensitive" as const } },
            { deskripsi: { contains: opsi.cari, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const kunci = opsi.kategori ?? "semua";
  // Hasil pencarian tidak disinggahkan: kata kuncinya bebas diketik siapa saja,
  // jadi menyimpannya sebagai kunci singgahan membuat memori tumbuh tanpa batas.
  const muat: typeof denganSinggahan = opsi.cari ? (_k, f) => f() : denganSinggahan;

  const total = await muat(`jumlah:${kunci}`, () => db.menu.count({ where }));
  if (total === 0) return { daftar: [], total: 0 };

  const halaman = Math.min(
    Math.max(1, opsi.halaman),
    Math.max(1, Math.ceil(total / opsi.ukuran))
  );

  const daftar = await muat(`halaman:${kunci}:${halaman}:${opsi.ukuran}`, () =>
    db.menu.findMany({
      where,
      orderBy: URUTAN_KATALOG,
      include: URUT_FOTO,
      skip: (halaman - 1) * opsi.ukuran,
      take: opsi.ukuran,
    })
  );

  return { daftar, total };
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
  const hasil = await denganSinggahan(`slug:${slug}`, () =>
    db.menu.findUnique({ where: { slug }, include: URUT_FOTO })
  );
  return hasil && hasil.aktif ? hasil : null;
}

const UMUR_SINGGAHAN_PANJANG_MS = 5 * 60 * 1000;
const singgahanPanjang = new Map<string, { nilai: unknown; kedaluwarsa: number }>();

async function denganSinggahanPanjang<T>(kunci: string, muat: () => Promise<T>): Promise<T> {
  const tersimpan = singgahanPanjang.get(kunci);
  if (tersimpan && tersimpan.kedaluwarsa > Date.now()) return tersimpan.nilai as T;
  const nilai = await muat();
  singgahanPanjang.set(kunci, { nilai, kedaluwarsa: Date.now() + UMUR_SINGGAHAN_PANJANG_MS });
  return nilai;
}

/**
 * Menu yang paling banyak dipesan dalam 90 hari terakhir.
 *
 * Label "favorit" di beranda harus jujur: dulu isinya hanya enam menu teratas
 * menurut urutan katalog. Kalau data pesanan belum cukup (usaha baru buka),
 * sisanya diisi menu teratas katalog dan `dariPesanan` bernilai false supaya
 * halaman bisa memilih judul yang tidak berbohong.
 */
export async function ambilMenuFavorit(
  jumlah = 6
): Promise<{ daftar: MenuDenganFoto[]; dariPesanan: boolean }> {
  return denganSinggahanPanjang(`favorit:${jumlah}`, async () => {
    const sejak = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const terlaris = await db.itemPesanan.groupBy({
      by: ["menuId"],
      where: {
        menuId: { not: null },
        menu: { aktif: true },
        pesanan: { status: { not: "DIBATALKAN" }, dibuatPada: { gte: sejak } },
      },
      _sum: { jumlah: true },
      orderBy: { _sum: { jumlah: "desc" } },
      take: jumlah,
    });

    const idTerlaris = terlaris.map((t) => t.menuId).filter((id): id is string => Boolean(id));
    const menuTerlaris = idTerlaris.length
      ? await db.menu.findMany({ where: { id: { in: idTerlaris }, aktif: true }, include: URUT_FOTO })
      : [];
    const urut = idTerlaris
      .map((id) => menuTerlaris.find((m) => m.id === id))
      .filter((m): m is MenuDenganFoto => Boolean(m));

    if (urut.length >= Math.min(3, jumlah)) {
      return { daftar: urut, dariPesanan: true };
    }

    const pengisi = await db.menu.findMany({
      where: { aktif: true, id: { notIn: urut.map((m) => m.id) } },
      orderBy: URUTAN_KATALOG,
      include: URUT_FOTO,
      take: jumlah - urut.length,
    });
    return { daftar: [...urut, ...pengisi], dariPesanan: false };
  });
}

export type RingkasanKategori = {
  kategori: KategoriMenu;
  jumlah: number;
  hargaTermurah: number;
};

/** Jumlah menu aktif & harga termurah per kategori, untuk navigasi kategori. */
export async function ambilRingkasanKategori(): Promise<RingkasanKategori[]> {
  return denganSinggahan("ringkasan-kategori", async () => {
    const baris = await db.menu.groupBy({
      by: ["kategori"],
      where: { aktif: true },
      _count: { _all: true },
      _min: { harga: true },
    });
    return baris.map((b) => ({
      kategori: b.kategori,
      jumlah: b._count._all,
      hargaTermurah: b._min.harga ?? 0,
    }));
  });
}
