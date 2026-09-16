import type { JenisPotongan } from "@/generated/prisma/client";

/**
 * Aturan voucher, ditulis sebagai fungsi murni tanpa akses database supaya bisa
 * diuji langsung dan dipakai ulang di dua tempat yang wajib sepakat: pratinjau
 * di formulir pembeli dan perhitungan final saat pesanan dibuat.
 *
 * Besar potongan TIDAK PERNAH datang dari browser. Yang dikirim pembeli hanya
 * kode; nilainya selalu dibaca ulang dari database lalu dihitung di sini
 * (invarian #1).
 */

/** Bentuk minimal voucher yang dibutuhkan untuk menghitung. */
export interface VoucherUntukHitung {
  jenis: JenisPotongan;
  nilai: number;
  maksPotongan: number | null;
  minBelanja: number;
  kuota: number | null;
  terpakai: number;
  mulaiPada: Date | null;
  berakhirPada: Date | null;
  aktif: boolean;
}

export type AlasanTolak =
  | "TIDAK_DITEMUKAN"
  | "NONAKTIF"
  | "BELUM_BERLAKU"
  | "KEDALUWARSA"
  | "KUOTA_HABIS"
  | "MIN_BELANJA";

export type HasilVoucher =
  | { berlaku: true; potongan: number }
  | { berlaku: false; alasan: AlasanTolak; pesan: string };

/** Pesan untuk pembeli — menjelaskan apa yang harus dilakukan, bukan sekadar menolak. */
export function pesanTolak(alasan: AlasanTolak, minBelanja = 0): string {
  switch (alasan) {
    case "TIDAK_DITEMUKAN":
      return "Kode voucher tidak ditemukan. Periksa lagi penulisannya.";
    case "NONAKTIF":
      return "Voucher ini sedang tidak berlaku.";
    case "BELUM_BERLAKU":
      return "Voucher ini belum bisa dipakai pada tanggal ini.";
    case "KEDALUWARSA":
      return "Masa berlaku voucher ini sudah habis.";
    case "KUOTA_HABIS":
      return "Kuota voucher ini sudah habis dipakai.";
    case "MIN_BELANJA":
      return `Voucher ini berlaku untuk belanja minimal Rp${minBelanja.toLocaleString("id-ID")}.`;
  }
}

/**
 * Menghitung potongan untuk sebuah subtotal.
 *
 * `subtotal` adalah nilai barang saja, tanpa ongkir — supaya potongan tidak
 * pernah ikut memakan ongkos kirim yang harus tetap dibayarkan ke pengantar.
 */
export function hitungPotongan(
  voucher: VoucherUntukHitung,
  subtotal: number,
  sekarang: Date = new Date()
): HasilVoucher {
  if (!voucher.aktif) {
    return { berlaku: false, alasan: "NONAKTIF", pesan: pesanTolak("NONAKTIF") };
  }

  if (voucher.mulaiPada && sekarang < voucher.mulaiPada) {
    return {
      berlaku: false,
      alasan: "BELUM_BERLAKU",
      pesan: pesanTolak("BELUM_BERLAKU"),
    };
  }

  if (voucher.berakhirPada && sekarang > voucher.berakhirPada) {
    return {
      berlaku: false,
      alasan: "KEDALUWARSA",
      pesan: pesanTolak("KEDALUWARSA"),
    };
  }

  if (voucher.kuota !== null && voucher.terpakai >= voucher.kuota) {
    return {
      berlaku: false,
      alasan: "KUOTA_HABIS",
      pesan: pesanTolak("KUOTA_HABIS"),
    };
  }

  if (subtotal < voucher.minBelanja) {
    return {
      berlaku: false,
      alasan: "MIN_BELANJA",
      pesan: pesanTolak("MIN_BELANJA", voucher.minBelanja),
    };
  }

  let potongan =
    voucher.jenis === "PERSEN"
      ? Math.floor((subtotal * voucher.nilai) / 100)
      : voucher.nilai;

  if (voucher.jenis === "PERSEN" && voucher.maksPotongan !== null) {
    potongan = Math.min(potongan, voucher.maksPotongan);
  }

  // Potongan tidak boleh melebihi belanja: total pesanan tidak pernah negatif,
  // dan usaha tidak pernah "berutang" ke pembeli karena salah ketik nominal.
  potongan = Math.min(potongan, subtotal);

  return { berlaku: true, potongan: Math.max(0, potongan) };
}

/** Kode disimpan dan dicocokkan dalam huruf besar tanpa spasi tepi. */
export function normalkanKodeVoucher(kode: string): string {
  return kode.trim().toUpperCase();
}
