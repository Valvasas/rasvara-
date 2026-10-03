import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { bacaSesi } from "@/lib/auth";
import { KomponenPaginasi } from "@/components/KomponenPaginasi";
import { FormBahan } from "@/components/admin/FormBahan";
import { HargaBahan } from "@/components/admin/HargaBahan";
import { SaklarBahan } from "@/components/admin/SaklarBahan";
import type { Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Bahan & resep" };

const UKURAN_HALAMAN = 30;

interface HalamanBahanProps {
  searchParams: Promise<{ q?: string; halaman?: string }>;
}

export default async function HalamanBahan({ searchParams }: HalamanBahanProps) {
  const sesi = await bacaSesi();
  if (sesi?.peran !== "PEMILIK") redirect("/admin");

  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 60);
  const where: Prisma.BahanWhereInput = q ? { nama: { contains: q, mode: "insensitive" } } : {};

  const [total, menuTanpaResep] = await Promise.all([
    db.bahan.count({ where }),
    db.menu.count({ where: { aktif: true, resep: { none: {} } } }),
  ]);
  const totalHalaman = Math.max(1, Math.ceil(total / UKURAN_HALAMAN));
  const halaman = Math.min(Math.max(1, Math.floor(Number(params.halaman) || 1)), totalHalaman);
  const daftar = await db.bahan.findMany({
    where,
    orderBy: [{ aktif: "desc" }, { nama: "asc" }],
    include: { _count: { select: { resep: true } } },
    skip: (halaman - 1) * UKURAN_HALAMAN,
    take: UKURAN_HALAMAN,
  });

  return (
    <div className="max-w-5xl">
      <h1 className="judul-halaman">Bahan &amp; resep</h1>
      <p className="teks-redup mt-1 max-w-2xl">
        Isi harga bahan sekali, lalu pasang takarannya di tiap menu. Dari sini dihitung daftar belanja harian dan
        laba per menu (HPP).
      </p>

      {menuTanpaResep > 0 && (
        <Link
          href="/admin/menu?status=tanpa-resep"
          className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-kunyit/30 bg-kunyit-lembut px-4 py-3 text-sm text-kunyit-tua hover:border-kunyit/60"
        >
          <span>
            <span className="font-semibold">{menuTanpaResep} menu aktif belum punya resep</span> — belum ikut daftar belanja & laba per menu.
          </span>
          <span className="font-medium shrink-0">Tampilkan →</span>
        </Link>
      )}

      <section aria-labelledby="judul-tambah-bahan" className="kartu kartu-isi mt-6">
        <h2 id="judul-tambah-bahan" className="judul-bagian mb-4">Tambah bahan</h2>
        <FormBahan />
      </section>

      <section aria-labelledby="judul-daftar-bahan" className="kartu mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-krem-gelap">
          <h2 id="judul-daftar-bahan" className="judul-bagian">
            Daftar bahan <span className="text-sm font-normal text-kayu-sedang">({total})</span>
          </h2>
          <form method="get" className="flex gap-2">
            <label htmlFor="cari-bahan" className="sr-only">Cari bahan</label>
            <input id="cari-bahan" type="search" name="q" defaultValue={q} maxLength={60} placeholder="Cari bahan" className="isian min-h-[40px] w-48" />
            <button type="submit" className="tombol-kedua tombol-kecil min-h-[40px]">Cari</button>
          </form>
        </div>
        {daftar.length === 0 ? (
          <p className="px-5 py-10 text-center teks-redup">{q ? "Bahan tidak ditemukan." : "Belum ada bahan. Tambahkan bahan pertama di atas."}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabel min-w-[600px]">
              <thead>
                <tr>
                  <th scope="col">Bahan</th>
                  <th scope="col">Satuan</th>
                  <th scope="col">Harga / satuan (Rp)</th>
                  <th scope="col">Dipakai</th>
                  <th scope="col">Aktif</th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((b) => (
                  <tr key={b.id} className={b.aktif ? "" : "opacity-60"}>
                    <td className="font-medium text-kayu">{b.nama}</td>
                    <td className="text-kayu-sedang">{b.satuan}</td>
                    <td><HargaBahan id={b.id} harga={b.hargaPerSatuan} nama={b.nama} /></td>
                    <td className="text-kayu-sedang whitespace-nowrap">{b._count.resep} menu</td>
                    <td><SaklarBahan id={b.id} aktif={b.aktif} nama={b.nama} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-5 pb-5">
          <KomponenPaginasi halamanAktif={halaman} totalHalaman={totalHalaman} basePath="/admin/bahan" queryLain={{ q: q || undefined }} />
        </div>
      </section>
    </div>
  );
}
