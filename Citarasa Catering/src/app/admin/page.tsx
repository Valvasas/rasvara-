import Link from "next/link";
import { db } from "@/lib/db";
import { bacaSesi } from "@/lib/auth";
import {
  jamTampil,
  linkWhatsapp,
  rupiah,
  tanggalPendek,
  teleponTampil,
} from "@/lib/format";
import {
  INFO_STATUS,
  KOLOM_PAPAN,
  LABEL_AMBIL,
  LABEL_BAYAR,
} from "@/lib/pesanan";
import { LencanaBayar } from "@/components/Lencana";
import { TombolAksiStatus } from "@/components/admin/TombolAksiStatus";
import { TombolAksiLunas } from "@/components/admin/TombolAksiLunas";
import { TombolCetakPesanan } from "@/components/admin/TombolCetakPesanan";
import type { CaraAmbil, ItemPesanan, Pesanan, StatusPesanan } from "@/generated/prisma/client";

type PesananWithItem = Pesanan & { item: ItemPesanan[] };

interface HalamanPapanDapurProps {
  searchParams: Promise<{ q?: string; caraAmbil?: string }>;
}

export default async function HalamanPapanDapur({
  searchParams,
}: HalamanPapanDapurProps) {
  const [params, sesi] = await Promise.all([
    searchParams,
    bacaSesi(),
  ]);
  const adalahStaf = sesi?.peran === "STAF_DAPUR";
  const kataKunci = params.q?.trim() || "";
  const filterAmbil = params.caraAmbil || "";

  const filterCaraAmbil =
    filterAmbil === "AMBIL_SENDIRI" || filterAmbil === "DIANTAR"
      ? (filterAmbil as CaraAmbil)
      : undefined;

  const kondisiPencarian = kataKunci
    ? [
        { namaPemesan: { contains: kataKunci, mode: "insensitive" as const } },
        { kode: { contains: kataKunci, mode: "insensitive" as const } },
        { teleponPemesan: { contains: kataKunci } },
      ]
    : undefined;

  let daftarPesanan: PesananWithItem[] = [];
  let hitunganSelesai = 0;
  let hitunganBatal = 0;

  try {
    const [pesanan, selesai, batal] = await Promise.all([
      db.pesanan.findMany({
        where: {
          status: { in: KOLOM_PAPAN },
          ...(filterCaraAmbil ? { caraAmbil: filterCaraAmbil } : {}),
          ...(kondisiPencarian ? { OR: kondisiPencarian } : {}),
        },
        include: { item: true },
        orderBy: [{ tanggalAcara: "asc" }, { jamAcara: "asc" }],
      }),
      db.pesanan.count({ where: { status: "SELESAI" } }),
      db.pesanan.count({ where: { status: "DIBATALKAN" } }),
    ]);

    daftarPesanan = pesanan;
    hitunganSelesai = selesai;
    hitunganBatal = batal;
  } catch {
    // Fallback jika DB belum running saat build/typecheck
  }

  // Kelompokkan per status papan
  const papan = KOLOM_PAPAN.reduce(
    (acc, status) => {
      acc[status] = daftarPesanan.filter((p) => p.status === status);
      return acc;
    },
    {} as Record<StatusPesanan, typeof daftarPesanan>
  );

  return (
    <div className="space-y-6">
      {/* Header Papan Dapur & Ringkasan */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-krem-gelap shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-kayu">
            Papan Pesanan Dapur
          </h1>
          <p className="text-xs text-kayu-sedang mt-0.5">
            Pantau dan majukan status masakan secara berurutan sesuai alur kerja dapur.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className="px-3 py-1.5 rounded-xl bg-daun-lembut text-daun-tua border border-daun/30">
            ✓ {hitunganSelesai} Pesanan Selesai
          </span>
          {hitunganBatal > 0 && (
            <span className="px-3 py-1.5 rounded-xl bg-bahaya-lembut text-bahaya border border-bahaya/30">
              ✕ {hitunganBatal} Dibatalkan
            </span>
          )}
        </div>
      </div>

      {/* Baris Pencarian & Filter Pesanan */}
      <form method="get" className="bg-white p-4 rounded-2xl border border-krem-gelap flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex-1 min-w-[240px] flex items-center gap-2">
          <span className="text-sm">🔍</span>
          <input
            type="text"
            name="q"
            defaultValue={kataKunci}
            placeholder="Cari nama pemesan, kode pesanan, atau nomor HP..."
            className="w-full min-h-[44px] px-3 py-1.5 rounded-xl border border-krem-gelap bg-krem/30 text-xs font-medium text-kayu placeholder:text-kayu-sedang/60 focus:outline-none focus:border-bata"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            name="caraAmbil"
            defaultValue={filterAmbil}
            className="min-h-[44px] px-3 py-1.5 rounded-xl border border-krem-gelap bg-krem/30 text-xs font-medium text-kayu focus:outline-none focus:border-bata"
          >
            <option value="">Semua Cara Ambil</option>
            <option value="AMBIL_SENDIRI">Ambil Sendiri</option>
            <option value="DIANTAR">Diantar Kurir</option>
          </select>

          <button
            type="submit"
            className="min-h-[44px] px-4 py-2 rounded-xl font-bold text-xs bg-kayu text-white hover:bg-kayu-sedang transition-colors cursor-pointer"
          >
            Filter
          </button>

          {(kataKunci || filterAmbil) && (
            <Link
              href="/admin"
              className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold text-bahaya bg-bahaya-lembut hover:bg-bahaya hover:text-white transition-colors inline-flex items-center"
            >
              Reset
            </Link>
          )}
        </div>
      </form>

      {/* Grid 4 Kolom Kanban Alur Dapur */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
        {KOLOM_PAPAN.map((status) => {
          const info = INFO_STATUS[status];
          const daftar = papan[status] || [];

          return (
            <div
              key={status}
              className="bg-krem-tua/50 rounded-3xl border border-krem-gelap/80 p-4 space-y-4 flex flex-col"
            >
              {/* Header Kolom */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      status === "BARU"
                        ? "bg-kunyit"
                        : status === "DIKONFIRMASI"
                        ? "bg-kayu-sedang"
                        : status === "DIPROSES"
                        ? "bg-bata animate-pulse"
                        : "bg-daun"
                    }`}
                  />
                  <h2 className="font-bold text-sm text-kayu">{info.label}</h2>
                </div>
                <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-white text-kayu border border-krem-gelap">
                  {daftar.length}
                </span>
              </div>

              {/* Daftar Kartu Pesanan */}
              <div className="space-y-3">
                {daftar.length === 0 ? (
                  <div className="p-8 text-center bg-white/60 rounded-2xl border border-dashed border-krem-gelap text-xs text-kayu-sedang/80">
                    Tidak ada antrean
                  </div>
                ) : (
                  daftar.map((pesanan) => {
                    const waUrl = linkWhatsapp(
                      pesanan.teleponPemesan,
                      `Halo ${pesanan.namaPemesan}, mengenai pesanan ${pesanan.kode}...`
                    );

                    return (
                      <div
                        key={pesanan.id}
                        className="bg-white rounded-2xl border border-krem-gelap p-4 shadow-sm hover:shadow-md transition-all space-y-3"
                      >
                        {/* Waktu Jam Acara yang Sangat Jelas */}
                        <div className="flex items-center justify-between border-b border-krem-gelap/60 pb-2.5">
                          <div className="bg-kayu text-krem px-2.5 py-1 rounded-lg text-xs font-mono font-bold">
                            🕒 {jamTampil(pesanan.jamAcara)} WIB
                          </div>
                          <span className="text-[11px] font-semibold text-kayu-sedang">
                            {tanggalPendek(pesanan.tanggalAcara)}
                          </span>
                        </div>

                        {/* Nama Pemesan & Kode */}
                        <div>
                          <div className="flex items-center justify-between">
                            <h3 className="font-extrabold text-sm text-kayu">
                              {pesanan.namaPemesan}
                            </h3>
                            <span className="font-mono text-[11px] text-kayu-sedang">
                              {pesanan.kode}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-xs">
                            <span className="text-kayu-sedang">
                              {teleponTampil(pesanan.teleponPemesan)}
                            </span>
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-daun font-bold hover:underline"
                            >
                              WA
                            </a>
                          </div>
                        </div>

                        {/* Pengambilan */}
                        <div className="text-[11px] text-kayu-sedang">
                          <span className="font-semibold text-kayu">
                            {LABEL_AMBIL[pesanan.caraAmbil as keyof typeof LABEL_AMBIL]}
                          </span>
                          {pesanan.alamatAntar && (
                            <p className="line-clamp-1 mt-0.5 italic">
                              {pesanan.alamatAntar}
                            </p>
                          )}
                          {pesanan.latitude != null && pesanan.longitude != null && (
                            // Tautan koordinat: pengantar membukanya dengan
                            // aplikasi peta di ponselnya sendiri, jadi navigasi
                            // penuh tetap didapat tanpa biaya API peta.
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${pesanan.latitude},${pesanan.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-flex items-center gap-1 font-bold text-bata hover:underline"
                            >
                              <span aria-hidden="true">📍</span>
                              <span>Buka titik antar di peta</span>
                            </a>
                          )}
                        </div>

                        {/* Daftar Masakan */}
                        <div className="p-2.5 bg-krem/40 rounded-xl text-xs space-y-1 border border-krem-gelap/60">
                          {pesanan.item.map((it) => (
                            <div
                              key={it.id}
                              className="flex justify-between font-medium text-kayu"
                            >
                              <span>{it.namaMenu}</span>
                              <span className="font-bold text-bata">
                                &times; {it.jumlah}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Catatan Dapur */}
                        {pesanan.catatan && (
                          <div className="p-2 bg-kunyit-lembut/70 text-kunyit-tua rounded-xl text-[11px] font-medium border border-kunyit/30">
                            <strong>Catatan:</strong> {pesanan.catatan}
                          </div>
                        )}

                        {/* Status Pembayaran & Nominal */}
                        <div className="flex items-center justify-between pt-1 text-xs">
                          {!adalahStaf ? (
                            <span className="font-extrabold text-kayu">
                              {rupiah(pesanan.total)}
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-kayu-sedang">
                              {LABEL_BAYAR[pesanan.caraBayar as keyof typeof LABEL_BAYAR]}
                            </span>
                          )}
                          <LencanaBayar statusBayar={pesanan.statusBayar} />
                        </div>

                        {/* Tautan Bukti Transfer dari Pembeli (Khusus Pemilik) */}
                        {!adalahStaf && pesanan.buktiBayarUrl && (
                          <div className="p-2 bg-krem-tua/60 rounded-xl border border-krem-gelap flex items-center justify-between text-xs">
                            <span className="font-semibold text-kayu flex items-center gap-1.5">
                              <span>📎</span> Bukti Transfer
                            </span>
                            <a
                              href={pesanan.buktiBayarUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-bold text-bata hover:underline inline-flex items-center gap-1"
                            >
                              Buka Foto &rarr;
                            </a>
                          </div>
                        )}

                        {/* Tombol Aksi Dapur & Cetak */}
                        <div className="space-y-2 pt-2 border-t border-krem-gelap/60">
                          {info.aksiLanjut && info.statusLanjut && (
                            <TombolAksiStatus
                              kode={pesanan.kode}
                              statusBaru={info.statusLanjut}
                              label={info.aksiLanjut}
                              warna={status === "DIPROSES" ? "daun" : "bata"}
                            />
                          )}

                          {/* Tombol Cetak Lembar Dapur / Nota */}
                          <TombolCetakPesanan kode={pesanan.kode} />

                          {/* Verifikasi Pelunasan Kas (Eksklusif Pemilik - Invarian #3) */}
                          {!adalahStaf && pesanan.statusBayar !== "LUNAS" && (
                            <TombolAksiLunas kode={pesanan.kode} />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

