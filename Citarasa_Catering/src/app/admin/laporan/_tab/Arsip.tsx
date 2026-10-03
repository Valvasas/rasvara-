import { db } from "@/lib/db";
import { jam, tanggalPendek } from "@/lib/format";
import { labelBulan } from "@/lib/bulan";
import { waktuTugasTerakhir } from "@/lib/pengaturan";
import { KomponenPaginasi } from "@/components/KomponenPaginasi";
import { IkonUnduh } from "@/components/ikon/Ikon";

const UKURAN = 24;

function ukuranBerkas(b: number) {
  return b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export async function TabArsip({ bulanIni, halaman }: { bulanIni: string; halaman: number }) {
  const [total, tugasTerakhir] = await Promise.all([db.rekapBulanan.count(), waktuTugasTerakhir()]);
  const totalHalaman = Math.max(1, Math.ceil(total / UKURAN));
  const hal = Math.min(halaman, totalHalaman);
  const arsip = await db.rekapBulanan.findMany({ orderBy: { bulan: "desc" }, skip: (hal - 1) * UKURAN, take: UKURAN });

  return (
    <>
      <div className="kartu kartu-isi flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="judul-bagian">Rekap {labelBulan(bulanIni)}</h2>
          <p className="teks-redup mt-1">Bulan berjalan — angkanya selalu dari data terbaru saat diunduh.</p>
        </div>
        <a href={`/api/admin/rekap-bulanan?bulan=${bulanIni}`} className="tombol-utama">
          <IkonUnduh className="w-4 h-4" /> Unduh Excel
        </a>
      </div>

      <section aria-labelledby="judul-arsip" className="mt-6">
        <h2 id="judul-arsip" className="judul-bagian">Arsip otomatis</h2>
        <p className="teks-redup mt-1">
          Tiap awal bulan, rekap bulan sebelumnya disimpan apa adanya — cocok untuk pembukuan karena tidak ikut berubah bila data lama diedit.
        </p>

        {arsip.length === 0 ? (
          <p className="kartu kartu-isi mt-4 text-center teks-redup">
            {tugasTerakhir
              ? "Belum ada arsip. Arsip pertama dibuat otomatis setelah pergantian bulan."
              : "Belum ada arsip, dan tugas otomatis belum pernah berjalan. Pasang cron di server (lihat panduan deployment)."}
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {arsip.map((a) => (
              <li key={a.bulan} className="kartu flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-medium text-kayu">{labelBulan(a.bulan)}</p>
                  <p className="text-xs text-kayu-sedang">
                    Diarsipkan {tanggalPendek(a.dibuatPada)} {jam(a.dibuatPada)} · {ukuranBerkas(a.ukuran)}
                  </p>
                </div>
                <a href={`/api/admin/rekap-bulanan/arsip/${a.bulan}`} className="tombol-kedua tombol-kecil shrink-0" aria-label={`Unduh arsip ${labelBulan(a.bulan)}`}>
                  <IkonUnduh className="w-4 h-4" /> Unduh
                </a>
              </li>
            ))}
          </ul>
        )}
        <KomponenPaginasi halamanAktif={hal} totalHalaman={totalHalaman} basePath="/admin/laporan" queryLain={{ tab: "arsip" }} />
      </section>
    </>
  );
}
