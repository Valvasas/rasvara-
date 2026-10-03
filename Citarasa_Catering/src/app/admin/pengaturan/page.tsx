import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { bacaSesi } from "@/lib/auth";
import { hariIniWib } from "@/lib/format";
import { rentangHari } from "@/lib/laporan";
import { ambilPengaturan } from "@/lib/pengaturan";
import { FormPengaturan } from "@/components/admin/FormPengaturan";
import { DaftarStafDapur } from "@/components/admin/DaftarStafDapur";
import { KelolaTanggalTutup } from "@/components/admin/KelolaTanggalTutup";
import { FormGantiSandi } from "@/components/FormGantiSandi";

export const metadata: Metadata = { title: "Pengaturan" };

export default async function HalamanAdminPengaturan() {
  const sesi = await bacaSesi();
  if (sesi?.peran !== "PEMILIK") redirect("/admin");

  const hariIni = hariIniWib();
  const [pengaturan, daftarStaf, tanggalTutup] = await Promise.all([
    ambilPengaturan(),
    db.pengguna.findMany({
      where: { peran: "STAF_DAPUR" },
      select: { id: true, nama: true, telepon: true, dibuatPada: true },
      orderBy: { dibuatPada: "asc" },
    }),
    db.tanggalTutup.findMany({
      where: { tanggal: { gte: rentangHari(hariIni).gte } },
      orderBy: { tanggal: "asc" },
      take: 60,
    }),
  ]);

  return (
    <div className="max-w-4xl space-y-8">
      <header>
        <h1 className="judul-halaman">Pengaturan</h1>
        <p className="teks-redup mt-1">Data ini tampil ke pembeli di toko dan nota pesanan.</p>
      </header>

      <FormPengaturan awal={pengaturan} />

      <section aria-labelledby="judul-libur" className="kartu kartu-isi">
        <h2 id="judul-libur" className="judul-bagian">Tanggal libur</h2>
        <p className="teks-redup mt-1 mb-4">Pembeli tidak bisa memesan untuk tanggal-tanggal ini.</p>
        <KelolaTanggalTutup daftar={tanggalTutup} hariIni={hariIni} />
      </section>

      <section aria-labelledby="judul-staf" className="kartu kartu-isi">
        <h2 id="judul-staf" className="judul-bagian mb-4">Staf dapur</h2>
        <DaftarStafDapur daftarAwal={daftarStaf} />
      </section>

      <section aria-labelledby="judul-sandi" className="kartu kartu-isi">
        <h2 id="judul-sandi" className="judul-bagian mb-4">Kata sandi Anda</h2>
        <FormGantiSandi untukDapur />
      </section>
    </div>
  );
}
