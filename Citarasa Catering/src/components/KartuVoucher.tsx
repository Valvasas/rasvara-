import type { ReactNode } from "react";
import { rupiah, tanggalPendek } from "@/lib/format";

export type StatusVoucher = "BERJALAN" | "NONAKTIF" | "KEDALUWARSA" | "HABIS";

interface KartuVoucherProps {
  kode: string;
  jenis: "NOMINAL" | "PERSEN";
  nilai: number;
  maksPotongan: number | null;
  minBelanja: number;
  kuota: number | null;
  terpakai: number;
  berakhirPada: Date | null;
  deskripsi: string | null;
  status: StatusVoucher;
  /** Tombol aksi pemilik; dibiarkan kosong saat kartu hanya dipajang. */
  aksi?: ReactNode;
}

const GAYA_STATUS: Record<
  StatusVoucher,
  { label: string; kelas: string; redup: boolean }
> = {
  BERJALAN: {
    label: "Berjalan",
    kelas: "bg-daun-lembut text-daun-tua border-daun/30",
    redup: false,
  },
  NONAKTIF: {
    label: "Nonaktif",
    kelas: "bg-krem-tua text-kayu-sedang border-krem-gelap",
    redup: true,
  },
  KEDALUWARSA: {
    label: "Kedaluwarsa",
    kelas: "bg-bahaya-lembut text-bahaya border-bahaya/30",
    redup: true,
  },
  HABIS: {
    label: "Kuota habis",
    kelas: "bg-kunyit-lembut text-kunyit-tua border-kunyit/30",
    redup: true,
  },
};

/**
 * Voucher digambar sebagai tiket, bukan baris daftar.
 *
 * Bentuk membawa arti: takik di sisi atas-bawah dan garis sobek putus-putus
 * membuat benda ini langsung terbaca sebagai kupon yang bisa ditukar, tanpa
 * perlu kata "voucher" dibaca lebih dulu. Nilai potongan diletakkan sebagai
 * angka terbesar di bonggol kiri karena itulah satu-satunya hal yang dicari
 * mata; syarat dan sisa kuota menyusul di badan tiket.
 */
export function KartuVoucher({
  kode,
  jenis,
  nilai,
  maksPotongan,
  minBelanja,
  kuota,
  terpakai,
  berakhirPada,
  deskripsi,
  status,
  aksi,
}: KartuVoucherProps) {
  const gaya = GAYA_STATUS[status];
  const sisa = kuota !== null ? Math.max(0, kuota - terpakai) : null;

  return (
    <div
      className={`tiket-tegak flex overflow-hidden rounded-2xl bg-white bayangan-kartu ${
        gaya.redup ? "opacity-70 saturate-50" : ""
      }`}
    >
      {/* Bonggol kiri: nilai potongan sebagai pahlawan visual. Lebarnya tetap
          132px supaya sejajar dengan takik yang dipahat di `.tiket-tegak`. */}
      <div className="relative shrink-0 w-[132px] bg-bata-lembut/70 flex flex-col items-center justify-center px-3 py-5 text-center">
        {jenis === "PERSEN" ? (
          <>
            <span className="uang judul-utama text-4xl sm:text-[2.7rem] text-bata-tua leading-none">
              {nilai}
              <span className="text-xl align-top">%</span>
            </span>
            {maksPotongan !== null && (
              <span className="uang text-[10px] text-kayu-sedang mt-1.5 leading-tight">
                maks {rupiah(maksPotongan)}
              </span>
            )}
          </>
        ) : (
          <>
            <span className="label-mikro text-bata-tua/70 mb-0.5">Potongan</span>
            <span className="uang judul-utama text-2xl sm:text-[1.7rem] text-bata-tua leading-none">
              {rupiah(nilai)}
            </span>
          </>
        )}
      </div>

      <div className="garis-sobek" />

      {/* Badan tiket: kode dan syarat */}
      <div className="flex-1 min-w-0 px-4 py-4 sm:px-5 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="kode-cetak text-sm text-kayu">{kode}</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${gaya.kelas}`}
            >
              {gaya.label}
            </span>
          </div>

          {deskripsi && (
            <p className="text-xs text-kayu-sedang truncate">{deskripsi}</p>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-kayu-sedang">
            {minBelanja > 0 && (
              <span className="angka-tabular">
                Min. belanja {rupiah(minBelanja)}
              </span>
            )}
            <span className="angka-tabular">
              {sisa === null
                ? `Dipakai ${terpakai} kali`
                : `Sisa ${sisa} dari ${kuota}`}
            </span>
            {berakhirPada && (
              <span className="angka-tabular">
                s/d {tanggalPendek(berakhirPada)}
              </span>
            )}
          </div>

          {/* Bilah sisa kuota: batas pemakaian jadi terlihat, bukan cuma angka. */}
          {kuota !== null && (
            <div
              className="h-1.5 rounded-full bg-krem-tua overflow-hidden max-w-[220px]"
              role="img"
              aria-label={`Terpakai ${terpakai} dari ${kuota}`}
            >
              <div
                className="h-full rounded-full bg-bata/60"
                style={{
                  width: `${Math.min(100, Math.round((terpakai / kuota) * 100))}%`,
                }}
              />
            </div>
          )}
        </div>

        {/* Boleh membungkus: di lebar HP, bonggol 132px menyisakan ruang yang
            tidak cukup untuk dua tombol sejajar, dan tanpa wrap tombol terakhir
            terpotong oleh tepi tiket. */}
        {aksi && (
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            {aksi}
          </div>
        )}
      </div>
    </div>
  );
}
