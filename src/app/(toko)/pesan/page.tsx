import type { Metadata } from "next";
import { db } from "@/lib/db";
import { bacaSesi } from "@/lib/auth";
import { ambilPengaturan } from "@/lib/pengaturan";
import { FormPesan } from "@/components/toko/FormPesan";
import { hariIniWib } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Buat Pesanan",
  description:
    "Pilih menu, tentukan tanggal, dan kirim pesanan ke Citarasa Catering.",
};

export default async function HalamanPesan({
  searchParams,
}: {
  searchParams: Promise<{ menu?: string }>;
}) {
  const [param, menu, pengaturan, sesi] = await Promise.all([
    searchParams,
    db.menu.findMany({
      where: { aktif: true },
      orderBy: [{ urutan: "asc" }, { nama: "asc" }],
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
    }),
    ambilPengaturan(),
    bacaSesi(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="max-w-2xl">
        <p className="label-kolom">Buat pesanan</p>
        <h1 className="mt-2 text-4xl sm:text-5xl">Mau pesan apa hari ini?</h1>
        <p className="mt-4 text-lg text-arang-muda">
          Isi dari atas ke bawah. Belum ada uang yang perlu dibayar sekarang.
          Setelah pesanan masuk, kami cek ketersediaan lalu mengabari Anda lewat
          WhatsApp.
        </p>
      </header>

      {menu.length === 0 ? (
        <p className="kartu mt-10 p-8 text-center text-arang-muda">
          Belum ada menu yang bisa dipesan saat ini.
        </p>
      ) : (
        <div className="mt-10">
          <FormPesan
            menu={menu}
            ongkirDefault={pengaturan.ongkirDefault}
            minOrderAntar={pengaturan.minOrderAntar}
            hariIni={hariIniWib()}
            pemesan={
              sesi && sesi.peran === "PELANGGAN"
                ? { nama: sesi.nama, telepon: sesi.telepon }
                : null
            }
            pilihanAwal={param.menu ?? null}
          />
        </div>
      )}
    </div>
  );
}
