import { db } from "@/lib/db";
import { hariIniWib, rupiah } from "@/lib/format";
import { rentangBulan, ringkasanKas } from "@/lib/laporan";

interface HalamanLaporanProps {
  searchParams: Promise<{ bulan?: string }>;
}

export default async function HalamanLaporan({
  searchParams,
}: HalamanLaporanProps) {
  const params = await searchParams;
  const sekarangWib = hariIniWib(); // "2026-09-14"
  const bulanPilihan = params.bulan || sekarangWib.slice(0, 7); // "2026-09"

  let ringkasan = { masuk: 0, keluar: 0, selisih: 0 };
  let jumlahPesananSelesai = 0;
  let breakdownPengeluaran: { kategori: string; _sum: { jumlah: number | null } }[] = [];

  try {
    const rentang = rentangBulan(bulanPilihan);
    const [kas, pesanan, pengeluaran] = await Promise.all([
      ringkasanKas(rentang),
      db.pesanan.count({
        where: {
          status: "SELESAI",
          tanggalAcara: rentang,
        },
      }),
      db.catatanKas.groupBy({
        by: ["kategori"],
        where: {
          jenis: "KELUAR",
          tanggal: rentang,
        },
        _sum: { jumlah: true },
        orderBy: { _sum: { jumlah: "desc" } },
      }),
    ]);

    ringkasan = kas;
    jumlahPesananSelesai = pesanan;
    breakdownPengeluaran = pengeluaran;
  } catch {
    // Fallback jika DB belum aktif saat build
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-krem-gelap flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-kayu">
            Laporan Keuangan & Performa Dapur
          </h1>
          <p className="text-xs text-kayu-sedang mt-0.5">
            Ikhtisar omzet penjualan katering, total biaya bahan, dan laba operasional.
          </p>
        </div>

        {/* Pemilih Bulan & Unduh CSV */}
        <div className="flex flex-wrap items-center gap-2">
          <form method="get" className="flex items-center gap-2">
            <label htmlFor="bulan" className="text-xs font-bold text-kayu-sedang">
              Bulan:
            </label>
            <input
              type="month"
              id="bulan"
              name="bulan"
              defaultValue={bulanPilihan}
              className="min-h-[44px] px-3 py-1.5 rounded-xl border border-krem-gelap bg-krem/40 text-xs font-bold text-kayu focus:outline-none focus:border-bata"
            />
            <button
              type="submit"
              className="min-h-[44px] px-4 py-1.5 rounded-xl font-bold text-xs bg-kayu text-white hover:bg-kayu-sedang cursor-pointer transition-colors"
            >
              Tampilkan
            </button>
          </form>

          <a
            href={`/api/admin/ekspor-laporan?bulan=${bulanPilihan}`}
            download
            className="min-h-[44px] px-4 py-1.5 rounded-xl font-bold text-xs bg-daun-lembut text-daun-tua hover:bg-daun hover:text-white border border-daun/40 transition-colors inline-flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Unduh CSV</span>
          </a>
        </div>
      </div>

      {/* 4 Metrik Kunci */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-krem-gelap shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-daun-tua block">
            Omzet Masuk ({bulanPilihan})
          </span>
          <span className="text-2xl font-extrabold text-daun block mt-1">
            {rupiah(ringkasan.masuk)}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-krem-gelap shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-bahaya block">
            Total Biaya Dapur
          </span>
          <span className="text-2xl font-extrabold text-bahaya block mt-1">
            {rupiah(ringkasan.keluar)}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-krem-gelap shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-kayu block">
            Laba Bersih Dapur
          </span>
          <span
            className={`text-2xl font-extrabold block mt-1 ${
              ringkasan.selisih >= 0 ? "text-kayu" : "text-bahaya"
            }`}
          >
            {rupiah(ringkasan.selisih)}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-krem-gelap shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-bata-tua block">
            Pesanan Selesai
          </span>
          <span className="text-2xl font-extrabold text-bata block mt-1">
            {jumlahPesananSelesai} Acara
          </span>
        </div>
      </div>

      {/* Rincian Pos Pengeluaran */}
      <div className="bg-white rounded-3xl border border-krem-gelap p-6 shadow-sm space-y-4">
        <h2 className="text-base font-extrabold text-kayu">
          Rincian Biaya Operasional per Kategori
        </h2>

        {breakdownPengeluaran.length === 0 ? (
          <p className="text-xs text-kayu-sedang text-center py-6">
            Tidak ada catatan pengeluaran pada bulan ini.
          </p>
        ) : (
          <div className="space-y-3">
            {breakdownPengeluaran.map((item) => {
              const nominal = item._sum.jumlah || 0;
              const persen =
                ringkasan.keluar > 0
                  ? Math.round((nominal / ringkasan.keluar) * 100)
                  : 0;

              return (
                <div key={item.kategori} className="space-y-1 text-xs">
                  <div className="flex justify-between font-bold text-kayu">
                    <span>{item.kategori}</span>
                    <span>
                      {rupiah(nominal)}{" "}
                      <span className="text-kayu-sedang font-normal">
                        ({persen}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-krem-gelap/50 overflow-hidden">
                    <div
                      className="h-full bg-bata rounded-full transition-all"
                      style={{ width: `${persen}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

