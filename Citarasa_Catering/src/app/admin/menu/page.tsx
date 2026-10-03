import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { bacaSesi } from "@/lib/auth";
import { rupiah } from "@/lib/format";
import { LABEL_KATEGORI, URUTAN_KATEGORI } from "@/lib/pesanan";
import { TombolToggleMenu } from "@/components/admin/TombolToggleMenu";
import { KomponenPaginasi } from "@/components/KomponenPaginasi";
import { IkonFoto, IkonTambah } from "@/components/ikon/Ikon";
import type { KategoriMenu, Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Menu" };

const UKURAN_HALAMAN = 25;

interface HalamanAdminMenuProps {
  searchParams: Promise<{ q?: string; kategori?: string; status?: string; halaman?: string }>;
}

export default async function HalamanAdminMenu({ searchParams }: HalamanAdminMenuProps) {
  const sesi = await bacaSesi();
  if (sesi?.peran !== "PEMILIK") redirect("/admin");

  const params = await searchParams;
  const kataKunci = (params.q ?? "").trim().slice(0, 60);
  const kategori = URUTAN_KATEGORI.includes(params.kategori as KategoriMenu)
    ? (params.kategori as KategoriMenu)
    : undefined;
  const status = params.status === "aktif" || params.status === "nonaktif" || params.status === "tanpa-foto"
    ? params.status
    : undefined;

  const where: Prisma.MenuWhereInput = {
    ...(kategori ? { kategori } : {}),
    ...(status === "aktif" ? { aktif: true } : status === "nonaktif" ? { aktif: false } : {}),
    ...(status === "tanpa-foto" ? { foto: { none: {} } } : {}),
    ...(kataKunci
      ? {
          OR: [
            { nama: { contains: kataKunci, mode: "insensitive" } },
            { deskripsi: { contains: kataKunci, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, totalSemua, tanpaFoto] = await Promise.all([
    db.menu.count({ where }),
    db.menu.count(),
    db.menu.count({ where: { aktif: true, foto: { none: {} } } }),
  ]);
  const totalHalaman = Math.max(1, Math.ceil(total / UKURAN_HALAMAN));
  const halaman = Math.min(Math.max(1, Math.floor(Number(params.halaman) || 1)), totalHalaman);

  const daftar = await db.menu.findMany({
    where,
    orderBy: [{ kategori: "asc" }, { urutan: "asc" }, { nama: "asc" }],
    include: { foto: { orderBy: { urutan: "asc" }, take: 1 }, _count: { select: { foto: true } } },
    skip: (halaman - 1) * UKURAN_HALAMAN,
    take: UKURAN_HALAMAN,
  });

  const adaSaringan = Boolean(kataKunci || kategori || status);

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="judul-halaman">Menu</h1>
          <p className="teks-redup mt-1">{totalSemua} menu terdaftar</p>
        </div>
        <Link href="/admin/menu/baru" className="tombol-utama">
          <IkonTambah className="w-4 h-4" />
          Tambah menu
        </Link>
      </header>

      {tanpaFoto > 0 && status !== "tanpa-foto" && (
        <Link
          href="/admin/menu?status=tanpa-foto"
          className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-kunyit/30 bg-kunyit-lembut px-4 py-3 text-sm text-kunyit-tua hover:border-kunyit/60"
        >
          <span className="flex items-center gap-2">
            <IkonFoto className="w-4 h-4" />
            <span>
              <span className="font-semibold">{tanpaFoto} menu aktif belum punya foto.</span> Foto asli paling
              berpengaruh pada keputusan pembeli.
            </span>
          </span>
          <span className="font-medium shrink-0">Tampilkan →</span>
        </Link>
      )}

      <form method="get" className="mt-6 flex flex-wrap gap-2">
        <label htmlFor="q" className="sr-only">Cari menu</label>
        <input id="q" type="search" name="q" defaultValue={kataKunci} maxLength={60} placeholder="Cari menu" className="isian flex-1 min-w-[200px] sm:max-w-xs" />
        <label htmlFor="kategori" className="sr-only">Kategori</label>
        <select id="kategori" name="kategori" defaultValue={kategori ?? ""} className="isian w-auto">
          <option value="">Semua kategori</option>
          {URUTAN_KATEGORI.map((k) => (
            <option key={k} value={k}>{LABEL_KATEGORI[k]}</option>
          ))}
        </select>
        <label htmlFor="status" className="sr-only">Status</label>
        <select id="status" name="status" defaultValue={status ?? ""} className="isian w-auto">
          <option value="">Semua status</option>
          <option value="aktif">Tampil</option>
          <option value="nonaktif">Disembunyikan</option>
          <option value="tanpa-foto">Tanpa foto</option>
        </select>
        <button type="submit" className="tombol-kedua">Terapkan</button>
        {adaSaringan && <Link href="/admin/menu" className="tombol-hantu">Reset</Link>}
      </form>

      {daftar.length === 0 ? (
        <p className="kartu kartu-isi mt-6 text-center teks-redup">
          {adaSaringan ? "Tidak ada menu yang cocok." : "Belum ada menu. Tambahkan menu pertama."}
        </p>
      ) : (
        <div className="kartu mt-6 overflow-x-auto">
          <table className="tabel min-w-[680px]">
            <thead>
              <tr>
                <th scope="col">Menu</th>
                <th scope="col">Kategori</th>
                <th scope="col" className="text-right">Harga</th>
                <th scope="col">Aturan</th>
                <th scope="col">Di katalog</th>
                <th scope="col"><span className="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody>
              {daftar.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="relative w-11 h-11 shrink-0 rounded-lg overflow-hidden bg-krem-tua border border-krem-gelap flex items-center justify-center">
                        {m.foto[0] ? (
                          <Image src={m.foto[0].url} alt="" fill sizes="44px" className="object-cover" />
                        ) : (
                          <IkonFoto className="w-4 h-4 text-kayu-sedang/50" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link href={`/admin/menu/${m.id}`} className="font-medium text-kayu hover:text-bata">
                          {m.nama}
                        </Link>
                        <p className="text-xs text-kayu-sedang">{m._count.foto} foto</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-kayu-sedang whitespace-nowrap">{LABEL_KATEGORI[m.kategori]}</td>
                  <td className="text-right angka-tabel whitespace-nowrap">
                    {rupiah(m.harga)}
                    <span className="text-kayu-sedang text-xs"> /{m.satuan}</span>
                  </td>
                  <td className="text-xs text-kayu-sedang whitespace-nowrap">
                    Min. {m.minPesan}
                    {m.preorderHari > 0 && ` · H-${m.preorderHari}`}
                    {m.kapasitasHarian && ` · ${m.kapasitasHarian}/hari`}
                  </td>
                  <td>
                    <TombolToggleMenu id={m.id} aktif={m.aktif} nama={m.nama} />
                  </td>
                  <td className="text-right">
                    <Link href={`/admin/menu/${m.id}`} className="tombol-hantu tombol-kecil">Ubah</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <KomponenPaginasi
        halamanAktif={halaman}
        totalHalaman={totalHalaman}
        basePath="/admin/menu"
        queryLain={{ q: kataKunci || undefined, kategori, status }}
      />
    </div>
  );
}
