import type { Metadata } from "next";
import { db } from "@/lib/db";
import { KelolaMenu } from "@/components/admin/KelolaMenu";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Kelola Menu" };

export default async function HalamanKelolaMenu() {
  const daftar = await db.menu.findMany({
    orderBy: [{ kategori: "asc" }, { urutan: "asc" }],
    select: {
      id: true,
      nama: true,
      deskripsi: true,
      kategori: true,
      harga: true,
      satuan: true,
      minPesan: true,
      preorderHari: true,
      kapasitasHarian: true,
      aktif: true,
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header>
        <p className="label-kolom">Menu</p>
        <h1 className="mt-1 text-3xl sm:text-4xl">Kelola menu &amp; harga</h1>
        <p className="mt-2 max-w-2xl text-arang-muda">
          Menu yang Anda ubah di sini langsung berubah di website pelanggan.
          Kalau suatu menu sedang kosong, sembunyikan saja supaya tidak bisa
          dipesan, tanpa menghapus riwayatnya.
        </p>
      </header>

      <div className="mt-7">
        <KelolaMenu daftar={daftar} />
      </div>
    </div>
  );
}
