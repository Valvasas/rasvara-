import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { bacaSesi } from "@/lib/auth";
import { hariIniWib, jam, tanggalPendek } from "@/lib/format";
import { rentangHari } from "@/lib/laporan";
import { ambilPengaturan } from "@/lib/pengaturan";
import { FormPengaturan } from "@/components/admin/FormPengaturan";
import { DaftarStafDapur } from "@/components/admin/DaftarStafDapur";
import { KelolaTanggalTutup } from "@/components/admin/KelolaTanggalTutup";
import { FormGantiSandi } from "@/components/FormGantiSandi";

export const metadata: Metadata = { title: "Pengaturan" };

const LABEL_AKTIVITAS: Record<string, string> = {
  masuk: "Masuk ke dashboard",
  ganti_sandi: "Mengganti kata sandi",
  catat_pembayaran: "Mencatat pembayaran",
  refund: "Mencatat pengembalian dana",
  batal_pesanan: "Membatalkan pesanan",
  batal_otomatis: "Pembatalan otomatis",
  hapus_kas: "Menghapus catatan kas",
  ubah_pengaturan: "Mengubah pengaturan",
  pesanan_manual: "Mencatat pesanan manual",
  ubah_pesanan: "Mengubah pesanan",
  arsip_rekap: "Mengarsipkan rekap bulanan",
};

export default async function HalamanAdminPengaturan() {
  const sesi = await bacaSesi();
  if (sesi?.peran !== "PEMILIK") redirect("/admin");

  const hariIni = hariIniWib();
  const [pengaturan, daftarStaf, tanggalTutup, aktivitas] = await Promise.all([
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
    db.logAktivitas.findMany({
      orderBy: { dibuatPada: "desc" },
      take: 30,
      include: { pengguna: { select: { nama: true } } },
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

      <section aria-labelledby="judul-otomasi" className="kartu kartu-isi">
        <h2 id="judul-otomasi" className="judul-bagian">Otomasi</h2>
        <p className="teks-redup mt-1">
          {pengaturan.tugasTerakhir
            ? `Tugas otomatis terakhir berjalan ${tanggalPendek(pengaturan.tugasTerakhir)} pukul ${jam(pengaturan.tugasTerakhir)}.`
            : "Tugas otomatis belum pernah berjalan. Pasang cron di server (lihat DEPLOYMENT.md) agar rekap bulanan diarsipkan dan pesanan tak dibayar dibatalkan otomatis."}
        </p>
      </section>

      <section aria-labelledby="judul-aktivitas" className="kartu overflow-hidden">
        <h2 id="judul-aktivitas" className="judul-bagian px-5 sm:px-6 pt-5 sm:pt-6">Aktivitas terakhir</h2>
        <p className="teks-redup px-5 sm:px-6 mt-1 mb-4">Jejak tindakan penting di dashboard, untuk menelusuri kesalahan atau akses yang mencurigakan.</p>
        {aktivitas.length === 0 ? (
          <p className="px-5 sm:px-6 pb-6 teks-redup">Belum ada catatan.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabel min-w-[560px]">
              <thead>
                <tr>
                  <th scope="col">Waktu</th>
                  <th scope="col">Oleh</th>
                  <th scope="col">Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {aktivitas.map((a) => (
                  <tr key={a.id}>
                    <td className="whitespace-nowrap text-kayu-sedang">{tanggalPendek(a.dibuatPada)} {jam(a.dibuatPada)}</td>
                    <td className="whitespace-nowrap">{a.pengguna?.nama ?? "Sistem"}</td>
                    <td>
                      {LABEL_AKTIVITAS[a.aksi] ?? a.aksi}
                      {a.target && <span className="font-mono text-xs text-kayu-sedang"> · {a.target}</span>}
                      {a.rincian && <span className="block text-xs text-kayu-sedang break-words">{a.rincian}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
