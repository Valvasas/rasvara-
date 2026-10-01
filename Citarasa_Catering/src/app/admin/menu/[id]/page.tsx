import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { bacaSesi } from "@/lib/auth";
import { FormMenu } from "@/components/admin/FormMenu";
import { KelolaFotoMenu } from "@/components/admin/KelolaFotoMenu";
import { TombolToggleMenu } from "@/components/admin/TombolToggleMenu";
import { IkonPanahKiri } from "@/components/ikon/Ikon";

export const metadata: Metadata = { title: "Ubah menu" };

interface HalamanUbahMenuProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ baru?: string }>;
}

export default async function HalamanUbahMenu({ params, searchParams }: HalamanUbahMenuProps) {
  const sesi = await bacaSesi();
  if (sesi?.peran !== "PEMILIK") redirect("/admin");

  const [{ id }, { baru }] = await Promise.all([params, searchParams]);
  const menu = await db.menu.findUnique({
    where: { id },
    include: { foto: { orderBy: { urutan: "asc" } }, _count: { select: { item: true } } },
  });
  if (!menu) notFound();

  return (
    <div className="max-w-3xl">
      <Link href="/admin/menu" className="inline-flex items-center gap-1.5 text-sm text-kayu-sedang hover:text-kayu">
        <IkonPanahKiri className="w-4 h-4" /> Menu
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="judul-halaman">{menu.nama}</h1>
          <p className="teks-redup mt-1">
            Dipesan {menu._count.item} kali ·{" "}
            <Link href={`/menu/${menu.slug}`} target="_blank" className="text-bata hover:underline">
              lihat di toko ↗
            </Link>
          </p>
        </div>
        <TombolToggleMenu id={menu.id} aktif={menu.aktif} nama={menu.nama} />
      </div>

      {baru === "1" && (
        <p role="status" className="kotak-sukses mt-6">
          Menu ditambahkan. Unggah fotonya di bawah supaya tampil menarik di katalog.
        </p>
      )}

      <section aria-labelledby="judul-foto" className="kartu kartu-isi mt-6">
        <h2 id="judul-foto" className="judul-bagian mb-4">Foto</h2>
        <KelolaFotoMenu
          menuId={menu.id}
          namaMenu={menu.nama}
          foto={menu.foto.map((f) => ({ id: f.id, url: f.url, urutan: f.urutan }))}
        />
      </section>

      <section aria-labelledby="judul-detail" className="kartu kartu-isi mt-6">
        <h2 id="judul-detail" className="judul-bagian mb-4">Detail &amp; harga</h2>
        <FormMenu menu={menu} />
        <p className="petunjuk mt-4">
          Mengubah harga tidak memengaruhi pesanan yang sudah masuk. Menu yang pernah dipesan tidak bisa dihapus,
          cukup disembunyikan.
        </p>
      </section>
    </div>
  );
}
