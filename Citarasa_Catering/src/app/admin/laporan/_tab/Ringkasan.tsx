import Link from "next/link";
import { db } from "@/lib/db";
import { angka, rupiah } from "@/lib/format";
import { rentangBulan, ringkasanKas } from "@/lib/laporan";
import { bulanSebelumnya } from "@/lib/bulan";

/** "+12%" dibanding bulan lalu; kosong bila bulan lalu nol (persentase tak bermakna). */
function perubahan(sekarang: number, lalu: number): string | null {
  if (lalu === 0) return null;
  const persen = Math.round(((sekarang - lalu) / Math.abs(lalu)) * 100);
  return `${persen >= 0 ? "+" : ""}${persen}% dari bulan lalu`;
}

export async function TabRingkasan({ bulan }: { bulan: string }) {
  const rentang = rentangBulan(bulan);
  const rentangLalu = rentangBulan(bulanSebelumnya(bulan));

  const [kas, kasLalu, pesananSelesai, pesananBatal, pengeluaran, terlaris] = await Promise.all([
    ringkasanKas(rentang),
    ringkasanKas(rentangLalu),
    db.pesanan.count({ where: { status: "SELESAI", tanggalAcara: rentang } }),
    db.pesanan.count({ where: { status: "DIBATALKAN", tanggalAcara: rentang } }),
    db.catatanKas.groupBy({
      by: ["kategori"],
      where: { jenis: "KELUAR", tanggal: rentang },
      _sum: { jumlah: true },
      orderBy: { _sum: { jumlah: "desc" } },
    }),
    db.itemPesanan.groupBy({
      by: ["namaMenu"],
      where: { pesanan: { status: "SELESAI", tanggalAcara: rentang } },
      _sum: { jumlah: true, subtotal: true },
      orderBy: { _sum: { subtotal: "desc" } },
      take: 5,
    }),
  ]);

  const kartu = [
    { label: "Pemasukan", nilai: rupiah(kas.masuk), catatan: perubahan(kas.masuk, kasLalu.masuk), kelas: "text-daun-tua" },
    { label: "Pengeluaran", nilai: rupiah(kas.keluar), catatan: perubahan(kas.keluar, kasLalu.keluar), kelas: "text-kayu" },
    { label: "Selisih kas", nilai: rupiah(kas.selisih), catatan: perubahan(kas.selisih, kasLalu.selisih), kelas: kas.selisih < 0 ? "text-bahaya" : "text-kayu" },
    { label: "Pesanan selesai", nilai: angka(pesananSelesai), catatan: pesananBatal ? `${pesananBatal} dibatalkan` : null, kelas: "text-kayu" },
  ];
  const maksPengeluaran = Math.max(1, ...pengeluaran.map((p) => p._sum.jumlah ?? 0));

  return (
    <>
      <dl className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {kartu.map((k) => (
          <div key={k.label} className="kartu p-5">
            <dt className="teks-redup">{k.label}</dt>
            <dd className={`mt-1 text-xl sm:text-2xl font-semibold angka-tabel ${k.kelas}`}>{k.nilai}</dd>
            {k.catatan && <dd className="mt-1 text-xs text-kayu-sedang">{k.catatan}</dd>}
          </div>
        ))}
      </dl>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 items-start">
        <section aria-labelledby="judul-terlaris" className="kartu kartu-isi">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="judul-terlaris" className="judul-bagian">Menu terlaris</h2>
            <Link href={`/admin/laporan?tab=menu&bulan=${bulan}`} className="text-sm font-medium text-bata hover:underline">
              Lihat margin
            </Link>
          </div>
          {terlaris.length === 0 ? (
            <p className="mt-3 teks-redup">Belum ada pesanan selesai di bulan ini.</p>
          ) : (
            <ol className="mt-4 divide-y divide-krem-gelap">
              {terlaris.map((m, i) => (
                <li key={m.namaMenu} className="flex items-center gap-3 py-3 text-sm">
                  <span className="w-5 text-kayu-sedang angka-tabel">{i + 1}</span>
                  <span className="flex-1 min-w-0 truncate text-kayu">{m.namaMenu}</span>
                  <span className="text-kayu-sedang angka-tabel whitespace-nowrap">{angka(m._sum.jumlah ?? 0)} porsi</span>
                  <span className="w-28 text-right font-medium text-kayu angka-tabel">{rupiah(m._sum.subtotal ?? 0)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="judul-pengeluaran" className="kartu kartu-isi">
          <h2 id="judul-pengeluaran" className="judul-bagian">Pengeluaran per kategori</h2>
          {pengeluaran.length === 0 ? (
            <p className="mt-3 teks-redup">Belum ada pengeluaran tercatat.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {pengeluaran.map((p) => {
                const jumlah = p._sum.jumlah ?? 0;
                return (
                  <li key={p.kategori} className="text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-kayu">{p.kategori}</span>
                      <span className="text-kayu angka-tabel">
                        {rupiah(jumlah)}
                        <span className="text-kayu-sedang"> · {kas.keluar ? Math.round((jumlah / kas.keluar) * 100) : 0}%</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-krem-tua overflow-hidden" aria-hidden="true">
                      <div className="h-full rounded-full bg-bata/70" style={{ width: `${(jumlah / maksPengeluaran) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <p className="petunjuk mt-6">
        Pemasukan &amp; pengeluaran diambil dari Buku Kas menurut tanggal transaksinya. Pesanan dihitung menurut tanggal acaranya.
      </p>
    </>
  );
}
