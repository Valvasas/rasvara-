import type { Metadata } from "next";
import Link from "next/link";
import { ambilHalamanMenu, ambilPetaTerjual, ambilRingkasanKategori, type UrutanKatalog } from "@/lib/menu";
import { LABEL_KATEGORI, URUTAN_KATEGORI } from "@/lib/pesanan";
import { KartuMenu } from "@/components/toko/KartuMenu";
import { Muncul } from "@/components/Muncul";
import { KomponenPaginasi } from "@/components/KomponenPaginasi";
import { Ilustrasi404 } from "@/components/ilustrasi/Ilustrasi";
import { IkonTutup } from "@/components/ikon/Ikon";
import type { KategoriMenu } from "@/generated/prisma/client";

export const metadata: Metadata = {
  title: "Menu",
  description: "Daftar lengkap nasi kotak, snack box, tumpeng, dan nasi goreng beserta harganya.",
};

/** 12 habis dibagi 2, 3, dan 4 kolom — baris terakhir grid tidak bolong. */
const UKURAN_HALAMAN = 12;

const PILIHAN_URUT: { kunci: UrutanKatalog; label: string }[] = [
  { kunci: "rekomendasi", label: "Rekomendasi" },
  { kunci: "harga-naik", label: "Termurah" },
  { kunci: "harga-turun", label: "Termahal" },
];

interface HalamanMenuProps {
  searchParams: Promise<{ kategori?: string; halaman?: string; q?: string; urut?: string }>;
}

export default async function HalamanMenu({ searchParams }: HalamanMenuProps) {
  const params = await searchParams;
  // Nilai dari URL tidak pernah langsung dianggap sah: Prisma melempar kalau
  // enumnya asing, dan halaman ini jadi galat 500 hanya karena ada yang
  // mengetik ?kategori=apa-saja.
  const filterKategori = URUTAN_KATEGORI.includes(params.kategori as KategoriMenu)
    ? (params.kategori as KategoriMenu)
    : undefined;
  const cari = (params.q ?? "").trim().slice(0, 60);
  const urut: UrutanKatalog = PILIHAN_URUT.some((p) => p.kunci === params.urut)
    ? (params.urut as UrutanKatalog)
    : "rekomendasi";

  const halamanDiminta = Number(params.halaman ?? "1");
  const halamanAman =
    Number.isFinite(halamanDiminta) && halamanDiminta >= 1 ? Math.floor(halamanDiminta) : 1;

  const [{ daftar, total }, ringkasan, terjual] = await Promise.all([
    ambilHalamanMenu({
      kategori: filterKategori,
      cari: cari || undefined,
      halaman: halamanAman,
      ukuran: UKURAN_HALAMAN,
      urut,
    }),
    ambilRingkasanKategori(),
    ambilPetaTerjual(),
  ]);

  const totalHalaman = Math.max(1, Math.ceil(total / UKURAN_HALAMAN));
  const halamanAktif = Math.min(halamanAman, totalHalaman);
  const totalSemua = ringkasan.reduce((n, r) => n + r.jumlah, 0);

  const href = (ubah: { kategori?: KategoriMenu | null; urut?: UrutanKatalog; q?: string | null }) => {
    const q = new URLSearchParams();
    const kategori = ubah.kategori === null ? undefined : ubah.kategori ?? filterKategori;
    const kataCari = ubah.q === null ? "" : ubah.q ?? cari;
    const urutan = ubah.urut ?? urut;
    if (kategori) q.set("kategori", kategori);
    if (kataCari) q.set("q", kataCari);
    if (urutan !== "rekomendasi") q.set("urut", urutan);
    const s = q.toString();
    return s ? `/menu?${s}` : "/menu";
  };

  const judul = cari
    ? `Hasil untuk “${cari}”`
    : filterKategori
    ? LABEL_KATEGORI[filterKategori]
    : "Semua menu";

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-5 pb-12 sm:pt-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-tampil text-[1.75rem] sm:text-4xl font-bold text-kayu leading-tight break-words">{judul}</h1>
          <p className="teks-redup mt-1" aria-live="polite">
            {total} menu · harga per satuan, semua bisa digabung dalam satu pesanan
          </p>
        </div>
      </header>

      {/* Kategori — menempel di bawah kepala saat digulir, seperti tab marketplace */}
      <nav
        aria-label="Kategori menu"
        className="sticky top-16 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 mt-4 py-2.5 bg-krem/95 backdrop-blur-md border-b border-krem-gelap/60"
      >
        <ul className="flex gap-2 overflow-x-auto tanpa-scrollbar">
          <li className="shrink-0">
            <Link
              href={href({ kategori: null })}
              aria-current={!filterKategori ? "page" : undefined}
              className={`pil ${!filterKategori ? "pil-aktif" : ""}`}
            >
              Semua <span className="opacity-70 angka-tabel">{totalSemua}</span>
            </Link>
          </li>
          {URUTAN_KATEGORI.map((k) => {
            const jumlah = ringkasan.find((r) => r.kategori === k)?.jumlah ?? 0;
            if (jumlah === 0) return null;
            const aktif = filterKategori === k;
            return (
              <li key={k} className="shrink-0">
                <Link
                  href={href({ kategori: k })}
                  aria-current={aktif ? "page" : undefined}
                  className={`pil ${aktif ? "pil-aktif" : ""}`}
                >
                  {LABEL_KATEGORI[k]} <span className="opacity-70 angka-tabel">{jumlah}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {cari ? (
          <Link href={href({ q: null })} className="inline-flex items-center gap-1.5 rounded-full bg-kayu-lembut pl-3 pr-2 py-1.5 text-[15px] text-kayu hover:bg-krem-gelap">
            Cari: <span className="font-semibold">{cari}</span>
            <IkonTutup className="w-4 h-4" />
            <span className="sr-only">Hapus pencarian</span>
          </Link>
        ) : (
          <span />
        )}
        <div role="group" aria-label="Urutkan menu" className="flex items-center gap-1 text-[14px]">
          <span className="text-kayu-sedang mr-1 hidden sm:inline">Urutkan:</span>
          {PILIHAN_URUT.map((p) => (
            <Link
              key={p.kunci}
              href={href({ urut: p.kunci })}
              aria-current={urut === p.kunci ? "true" : undefined}
              className={`inline-flex items-center min-h-[40px] px-3 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                urut === p.kunci ? "bg-bata-lembut text-bata-tua" : "text-kayu-sedang hover:text-kayu hover:bg-krem-tua"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      {daftar.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
          {daftar.map((menu, i) => (
            <Muncul key={menu.id} tunda={(i % 4) * 50}>
              <KartuMenu menu={menu} prioritas={i < 4} terjual={terjual.get(menu.id) ?? 0} />
            </Muncul>
          ))}
        </div>
      ) : (
        <div className="mt-8 kartu kartu-isi text-center max-w-md mx-auto">
          <Ilustrasi404 className="w-48 mx-auto" />
          <p className="mt-2 text-lg font-bold text-kayu">
            {cari ? "Menu tidak ditemukan" : "Belum ada menu di sini"}
          </p>
          <p className="teks-redup mt-1">
            {cari ? "Coba kata lain, mis. “ayam”, “tumpeng”, atau “snack”." : "Menu sedang disiapkan dapur."}
          </p>
          <Link href="/menu" className="tombol-utama mt-5">
            Lihat semua menu
          </Link>
        </div>
      )}

      <KomponenPaginasi
        halamanAktif={halamanAktif}
        totalHalaman={totalHalaman}
        basePath="/menu"
        queryLain={{ kategori: filterKategori, q: cari || undefined, urut: urut === "rekomendasi" ? undefined : urut }}
      />
    </div>
  );
}
