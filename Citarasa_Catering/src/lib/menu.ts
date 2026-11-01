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
> & {
  /** Hanya sampul (maks. satu foto) — untuk gambar kecil di keranjang & checkout. */
  foto: { url: string }[];
};

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
export type UrutanKatalog = "rekomendasi" | "harga-naik" | "harga-turun";

export async function ambilHalamanMenu(opsi: {
  kategori?: KategoriMenu;
  cari?: string;
  halaman: number;
  ukuran: number;
  urut?: UrutanKatalog;
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

  const urut = opsi.urut ?? "rekomendasi";
  // id sebagai pemutus seri: tanpa urutan yang benar-benar unik, menu berharga
  // sama bisa muncul di dua halaman sekaligus (atau tidak sama sekali).
  const orderBy =
    urut === "harga-naik"
      ? [{ harga: "asc" as const }, { id: "asc" as const }]
      : urut === "harga-turun"
      ? [{ harga: "desc" as const }, { id: "asc" as const }]
      : [...URUTAN_KATALOG, { id: "asc" as const }];

  const daftar = await muat(`halaman:${kunci}:${urut}:${halaman}:${opsi.ukuran}`, () =>
    db.menu.findMany({
      where,
      orderBy,
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
 * Dari galeri hanya sampulnya yang ikut (gambar kecil di keranjang): kalau
 * seluruh galeri terbawa, semua barisan foto tiap menu ikut terkirim ke peramban.
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
        foto: { select: { url: true }, orderBy: { urutan: "asc" }, take: 1 },
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

const UMUR_SINGGAHAN_TERJUAL_MS = 10 * 60 * 1000;
let singgahanTerjual: { nilai: Map<string, number>; kedaluwarsa: number } | null = null;
let muatTerjual: Promise<Map<string, number>> | null = null;

/**
 * Jumlah porsi terjual per menu (semua waktu, pesanan batal tidak dihitung) —
 * bukti sosial "120+ terjual" yang jadi kebiasaan pembeli marketplace.
 *
 * Satu kueri agregat untuk seluruh katalog, disinggahkan 10 menit: angka ini
 * tidak perlu tepat per detik, sedangkan menghitungnya per kartu berarti
 * belasan kueri di setiap pembukaan halaman menu.
 */
export async function ambilPetaTerjual(): Promise<Map<string, number>> {
  if (singgahanTerjual && singgahanTerjual.kedaluwarsa > Date.now()) return singgahanTerjual.nilai;
  if (muatTerjual) return muatTerjual;

  muatTerjual = db.itemPesanan
    .groupBy({
      by: ["menuId"],
      where: { menuId: { not: null }, pesanan: { status: { not: "DIBATALKAN" } } },
      _sum: { jumlah: true },
    })
    .then((baris) => {
      const peta = new Map<string, number>();
      for (const b of baris) if (b.menuId) peta.set(b.menuId, b._sum.jumlah ?? 0);
      singgahanTerjual = { nilai: peta, kedaluwarsa: Date.now() + UMUR_SINGGAHAN_TERJUAL_MS };
      return peta;
    })
    .finally(() => {
      muatTerjual = null;
    });
  return muatTerjual;
}

/** Data ringkas yang dibutuhkan keranjang di peramban. */
export function dataKeranjangDariMenu(
  m: Pick<Menu, "id" | "slug" | "nama" | "harga" | "satuan" | "minPesan" | "preorderHari"> & {
    foto?: { url: string }[];
  }
) {
  return {
    menuId: m.id,
    slug: m.slug,
    nama: m.nama,
    harga: m.harga,
    satuan: m.satuan,
    minPesan: m.minPesan,
    preorderHari: m.preorderHari,
    fotoUrl: m.foto?.[0]?.url ?? null,
  };
}
