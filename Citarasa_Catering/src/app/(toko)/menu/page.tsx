import type { Metadata } from "next";
import Link from "next/link";
import { ambilHalamanMenu, ambilRingkasanKategori } from "@/lib/menu";
import { LABEL_KATEGORI, URUTAN_KATEGORI } from "@/lib/pesanan";
import { KartuMenu } from "@/components/toko/KartuMenu";
import { KomponenPaginasi } from "@/components/KomponenPaginasi";
import { IkonCari } from "@/components/ikon/Ikon";
import type { KategoriMenu } from "@/generated/prisma/client";

export const metadata: Metadata = {
  title: "Menu",
  description: "Daftar lengkap nasi kotak, snack box, tumpeng, dan nasi goreng beserta harganya.",
};

/** 12 habis dibagi 2, 3, dan 4 kolom — baris terakhir grid tidak bolong. */
const UKURAN_HALAMAN = 12;

interface HalamanMenuProps {
  searchParams: Promise<{ kategori?: string; halaman?: string; q?: string }>;
}

export default async function HalamanMenu({ searchParams }: HalamanMenuProps) {
  const params = await searchParams;
  // Nilai dari URL tidak pernah langsung dianggap kategori yang sah: Prisma
  // melempar kalau enumnya asing, dan halaman ini jadi galat 500 hanya karena
  // ada yang mengetik ?kategori=apa-saja.
  const filterKategori = URUTAN_KATEGORI.includes(params.kategori as KategoriMenu)
    ? (params.kategori as KategoriMenu)
    : undefined;
  const cari = (params.q ?? "").trim().slice(0, 60);

  const halamanDiminta = Number(params.halaman ?? "1");
  const halamanAman =
    Number.isFinite(halamanDiminta) && halamanDiminta >= 1 ? Math.floor(halamanDiminta) : 1;

  const [{ daftar, total }, ringkasan] = await Promise.all([
    ambilHalamanMenu({
      kategori: filterKategori,
      cari: cari || undefined,
      halaman: halamanAman,
      ukuran: UKURAN_HALAMAN,
    }),
    ambilRingkasanKategori(),
  ]);

  const totalHalaman = Math.max(1, Math.ceil(total / UKURAN_HALAMAN));
  const halamanAktif = Math.min(halamanAman, totalHalaman);
  const totalSemua = ringkasan.reduce((n, r) => n + r.jumlah, 0);

  const hrefKategori = (k?: KategoriMenu) => {
    const q = new URLSearchParams();
    if (k) q.set("kategori", k);
    if (cari) q.set("q", cari);
    const s = q.toString();
    return s ? `/menu?${s}` : "/menu";
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <div>
          <h1 className="font-tampil text-3xl sm:text-4xl font-bold text-kayu">Menu</h1>
          <p className="teks-redup mt-1.5">
            Harga per satuan. Semua menu bisa digabung dalam satu pesanan.
          </p>
        </div>

        <form method="get" action="/menu" role="search" className="relative w-full sm:w-72">
          {filterKategori && <input type="hidden" name="kategori" value={filterKategori} />}
          <label htmlFor="cari-menu" className="sr-only">
            Cari menu
          </label>
          <IkonCari className="w-4 h-4 text-kayu-sedang absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="cari-menu"
            type="search"
            name="q"
            defaultValue={cari}
            maxLength={60}
            placeholder="Cari menu, mis. rendang"
            className="isian pl-10"
          />
        </form>
      </header>

      <nav aria-label="Kategori menu" className="mt-6 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto tanpa-scrollbar">
        <ul className="flex gap-2 w-max">
          <li>
            <Link
              href={hrefKategori()}
              aria-current={!filterKategori ? "page" : undefined}
              className={`pil ${!filterKategori ? "pil-aktif" : ""}`}
            >
              Semua <span className="opacity-60 angka-tabel">{totalSemua}</span>
            </Link>
          </li>
          {URUTAN_KATEGORI.map((k) => {
            const jumlah = ringkasan.find((r) => r.kategori === k)?.jumlah ?? 0;
            if (jumlah === 0) return null;
            const aktif = filterKategori === k;
            return (
              <li key={k}>
                <Link
                  href={hrefKategori(k)}
                  aria-current={aktif ? "page" : undefined}
                  className={`pil ${aktif ? "pil-aktif" : ""}`}
                >
                  {LABEL_KATEGORI[k]} <span className="opacity-60 angka-tabel">{jumlah}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {cari && (
        <p className="mt-5 text-sm text-kayu-sedang" aria-live="polite">
          {total} hasil untuk “<span className="font-medium text-kayu">{cari}</span>”.{" "}
          <Link href={filterKategori ? `/menu?kategori=${filterKategori}` : "/menu"} className="font-medium text-bata hover:underline">
            Hapus pencarian
          </Link>
        </p>
      )}

      {daftar.length > 0 ? (
        <div className="mt-6 grid gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {daftar.map((menu, i) => (
            <KartuMenu key={menu.id} menu={menu} prioritas={i < 4} />
          ))}
        </div>
      ) : (
        <div className="mt-10 kartu kartu-isi text-center max-w-md mx-auto">
          <p className="font-semibold text-kayu">
            {cari ? "Menu tidak ditemukan" : "Belum ada menu di sini"}
          </p>
          <p className="teks-redup mt-1">
            {cari ? "Coba kata lain atau lihat semua kategori." : "Menu sedang disiapkan dapur."}
          </p>
          <Link href="/menu" className="tombol-kedua mt-5">
            Lihat semua menu
          </Link>
        </div>
      )}

      <KomponenPaginasi
        halamanAktif={halamanAktif}
        totalHalaman={totalHalaman}
        basePath="/menu"
        queryLain={{ kategori: filterKategori, q: cari || undefined }}
      />
    </div>
  );
}
