import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { bacaSesi } from "@/lib/auth";
import { hariIniWib, rupiah, tanggalPendek } from "@/lib/format";
import { FormCatatKas } from "@/components/admin/FormCatatKas";
import type { CatatanKas, Pesanan } from "@/generated/prisma/client";

type KasWithPesanan = CatatanKas & { pesanan: Pesanan | null };

export default async function HalamanBukuKas() {
  const sesi = await bacaSesi();
  if (sesi?.peran !== "PEMILIK") {
    redirect("/admin");
  }

  let daftarKas: KasWithPesanan[] = [];
  let totalMasuk = 0;
  let totalKeluar = 0;

  try {
    const data = await db.catatanKas.findMany({
      orderBy: [{ tanggal: "desc" }, { dibuatPada: "desc" }],
      take: 50,
      include: { pesanan: true },
    });
    daftarKas = data;

    const agregat = await db.catatanKas.groupBy({
      by: ["jenis"],
      _sum: { jumlah: true },
    });

    for (const a of agregat) {
      if (a.jenis === "MASUK") totalMasuk = a._sum.jumlah || 0;
      if (a.jenis === "KELUAR") totalKeluar = a._sum.jumlah || 0;
    }
  } catch {
    // Fallback jika DB belum aktif
  }

  const saldoBersih = totalMasuk - totalKeluar;

  return (
    <div className="space-y-6">
      {/* Header & Ringkasan Keuangan */}
      <div className="permukaan-kartu p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="judul-utama text-2xl text-kayu">
            Buku Kas Usaha Catering
          </h1>
          <p className="text-xs text-kayu-sedang mt-0.5">
            Pencatatan uang masuk otomatis dari pesanan yang lunas dan pengeluaran
            belanja dapur harian.
          </p>
        </div>

        <a
          href="/api/admin/ekspor-laporan"
          download
          className="min-h-[44px] px-4 py-2 rounded-xl font-bold text-xs bg-daun-lembut text-daun-tua hover:bg-daun hover:text-white border border-daun/40 transition-colors inline-flex items-center gap-1.5 self-start sm:self-center"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Unduh CSV Kas</span>
        </a>
      </div>

      {/* 3 Kartu Ringkasan Saldo Kas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="permukaan-kartu p-5 rounded-2xl">
          <span className="text-xs font-bold uppercase tracking-wider text-daun-tua block">
            Total Pemasukan
          </span>
          <span className="text-xl font-extrabold text-daun block mt-1">
            {rupiah(totalMasuk)}
          </span>
        </div>

        <div className="permukaan-kartu p-5 rounded-2xl">
          <span className="text-xs font-bold uppercase tracking-wider text-bahaya block">
            Total Pengeluaran
          </span>
          <span className="text-xl font-extrabold text-bahaya block mt-1">
            {rupiah(totalKeluar)}
          </span>
        </div>

        <div className="permukaan-kartu p-5 rounded-2xl">
          <span className="text-xs font-bold uppercase tracking-wider text-kayu block">
            Saldo Kas Bersih
          </span>
          <span
            className={`text-xl font-extrabold block mt-1 ${
              saldoBersih >= 0 ? "text-kayu" : "text-bahaya"
            }`}
          >
            {rupiah(saldoBersih)}
          </span>
        </div>
      </div>

      {/* Grid: Form Catat Baru (kiri) & Tabel Histori (kanan) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Kolom 1: Formulir Pencatatan */}
        <div className="lg:col-span-1">
          <FormCatatKas hariIni={hariIniWib()} />
        </div>

        {/* Kolom 2: Riwayat Transaksi */}
        <div className="lg:col-span-2 permukaan-kartu rounded-3xl p-6 space-y-4">
          <h2 className="text-base font-extrabold text-kayu">
            Catatan Kas Terakhir ({daftarKas.length})
          </h2>

          {daftarKas.length === 0 ? (
            <p className="text-xs text-kayu-sedang text-center py-8">
              Belum ada catatan kas yang terekam.
            </p>
          ) : (
            <div className="divide-y divide-krem-gelap/60">
              {daftarKas.map((kas) => (
                <div
                  key={kas.id}
                  className="py-3 flex items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-kayu">
                        {kas.keterangan}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-krem text-kayu-sedang border border-krem-gelap">
                        {kas.kategori}
                      </span>
                    </div>

                    <div className="text-[11px] text-kayu-sedang flex items-center gap-2">
                      <span>{tanggalPendek(kas.tanggal)}</span>
                      {kas.pesanan && (
                        <>
                          <span>&bull;</span>
                          <span className="font-mono text-bata">
                            Pesanan {kas.pesanan.kode}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <span
                    className={`font-extrabold text-sm whitespace-nowrap ${
                      kas.jenis === "MASUK" ? "text-daun" : "text-bahaya"
                    }`}
                  >
                    {kas.jenis === "MASUK" ? "+" : "-"}
                    {rupiah(kas.jumlah)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

