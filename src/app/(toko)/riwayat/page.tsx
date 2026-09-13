import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { bacaSesi } from "@/lib/auth";
import { Lencana } from "@/components/Lencana";
import { TombolKeluar } from "@/components/TombolKeluar";
import { INFO_BAYAR, INFO_STATUS } from "@/lib/pesanan";
import {
  jamTampil,
  labelHari,
  rupiah,
  tanggalPanjang,
  waktuRelatif,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pesanan Saya",
  robots: { index: false, follow: false },
};

export default async function HalamanRiwayat() {
  const sesi = await bacaSesi();
  if (!sesi) redirect("/masuk");
  if (sesi.peran === "PEMILIK") redirect("/admin");

  // Pesanan yang dibuat sebelum punya akun ikut muncul selama nomor HP-nya sama,
  // jadi riwayat tidak terasa kosong bagi pelanggan lama yang baru mendaftar.
  const pesanan = await db.pesanan.findMany({
    where: {
      OR: [{ penggunaId: sesi.id }, { teleponPemesan: sesi.telepon }],
    },
    include: { item: { select: { namaMenu: true, jumlah: true, satuan: true } } },
    orderBy: { dibuatPada: "desc" },
    take: 50,
  });

  const berjalan = pesanan.filter(
    (p) => p.status !== "SELESAI" && p.status !== "DIBATALKAN"
  );
  const lampau = pesanan.filter(
    (p) => p.status === "SELESAI" || p.status === "DIBATALKAN"
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-kolom">Halo, {sesi.nama}</p>
          <h1 className="mt-2 text-4xl">Pesanan saya</h1>
        </div>
        <div className="flex gap-3">
          <Link href="/pesan" className="tombol tombol-utama">
            Pesan Lagi
          </Link>
          <TombolKeluar />
        </div>
      </header>

      {pesanan.length === 0 ? (
        <div className="kartu mt-10 p-10 text-center">
          <p className="font-judul text-xl">Belum ada pesanan</p>
          <p className="mt-2 text-arang-muda">
            Setelah Anda memesan, semua riwayatnya akan tersimpan rapi di sini.
          </p>
          <Link href="/menu" className="tombol tombol-utama mt-6">
            Lihat Menu
          </Link>
        </div>
      ) : (
        <>
          {berjalan.length > 0 ? (
            <section className="mt-10" aria-labelledby="judul-berjalan">
              <h2 id="judul-berjalan" className="text-2xl">
                Sedang berjalan
              </h2>
              <ul className="mt-4 space-y-4">
                {berjalan.map((p) => (
                  <KartuPesanan key={p.id} pesanan={p} />
                ))}
              </ul>
            </section>
          ) : null}

          {lampau.length > 0 ? (
            <section className="mt-12" aria-labelledby="judul-lampau">
              <h2 id="judul-lampau" className="text-2xl">
                Sudah selesai
              </h2>
              <ul className="mt-4 space-y-4">
                {lampau.map((p) => (
                  <KartuPesanan key={p.id} pesanan={p} />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

type PesananRingkas = {
  id: string;
  kode: string;
  status: keyof typeof INFO_STATUS;
  statusBayar: keyof typeof INFO_BAYAR;
  tanggalAcara: Date;
  jamAcara: string;
  total: number;
  dibuatPada: Date;
  item: { namaMenu: string; jumlah: number; satuan: string }[];
};

function KartuPesanan({ pesanan }: { pesanan: PesananRingkas }) {
  return (
    <li className="kartu p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-judul text-lg tracking-wide text-bata">
            {pesanan.kode}
          </p>
          <p className="text-[0.88rem] text-arang-muda">
            Dipesan {waktuRelatif(pesanan.dibuatPada)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Lencana kelas={INFO_STATUS[pesanan.status].kelas}>
            {INFO_STATUS[pesanan.status].labelPelanggan}
          </Lencana>
          <Lencana kelas={INFO_BAYAR[pesanan.statusBayar].kelas}>
            {INFO_BAYAR[pesanan.statusBayar].label}
          </Lencana>
        </div>
      </div>

      <p className="mt-3">
        {pesanan.item
          .map((i) => `${i.namaMenu} (${i.jumlah} ${i.satuan})`)
          .join(", ")}
      </p>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-krem-tua pt-4">
        <div>
          <p className="label-kolom">Dibutuhkan</p>
          <p className="font-medium">
            {tanggalPanjang(pesanan.tanggalAcara)}, {jamTampil(pesanan.jamAcara)}{" "}
            <span className="text-arang-muda">
              ({labelHari(pesanan.tanggalAcara)})
            </span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <p className="font-judul text-xl">{rupiah(pesanan.total)}</p>
          <Link
            href={`/pesanan/${pesanan.kode}`}
            className="tombol tombol-kedua px-4 py-2"
          >
            Lihat
          </Link>
        </div>
      </div>
    </li>
  );
}
