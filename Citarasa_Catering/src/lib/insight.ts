/*
  Insight usaha — fungsi murni (tanpa database) supaya bisa diuji dan, yang
  lebih penting, bisa DIJELASKAN ke pemilik. Tidak ada "AI" di sini: tiap
  angka punya aturan yang bisa ditulis di satu kalimat.
*/

// ---------------------------------------------------------------- Pelanggan

export type Segmen = "ANDALAN" | "SETIA" | "BARU" | "PERLU_DISAPA" | "HILANG";

export interface DataPelanggan {
  telepon: string;
  /** Hari sejak acara terakhir (0 = hari ini). */
  hariSejakTerakhir: number;
  /** Jumlah pesanan dalam jendela pengamatan. */
  frekuensi: number;
  /** Total nilai pesanan dalam jendela pengamatan. */
  nilai: number;
}

export interface PelangganBersegmen extends DataPelanggan {
  segmen: Segmen;
  /** 1–5: posisi nilai belanja dibanding pelanggan lain (5 = 20% teratas). */
  skorNilai: number;
}

export const INFO_SEGMEN: Record<Segmen, { label: string; arti: string; saran: string; nada: "daun" | "bata" | "kunyit" | "netral" }> = {
  ANDALAN: {
    label: "Andalan",
    arti: "Sering pesan, nilai besar, masih aktif",
    saran: "Jaga baik-baik: prioritaskan jadwalnya dan beri ucapan terima kasih.",
    nada: "daun",
  },
  SETIA: {
    label: "Setia",
    arti: "Pesan berulang dalam 3 bulan terakhir",
    saran: "Tawarkan menu baru atau paket langganan.",
    nada: "daun",
  },
  BARU: {
    label: "Baru",
    arti: "Baru sekali pesan, belum lama",
    saran: "Tanyakan kesan pertamanya — pesanan kedua menentukan.",
    nada: "netral",
  },
  PERLU_DISAPA: {
    label: "Perlu disapa",
    arti: "Terakhir pesan 2–6 bulan lalu",
    saran: "Sapa lewat WA sebelum mereka benar-benar pindah.",
    nada: "kunyit",
  },
  HILANG: {
    label: "Hilang",
    arti: "Lebih dari 6 bulan tidak pesan",
    saran: "Cukup sapa sesekali; jangan habiskan promo di sini.",
    nada: "bata",
  },
};

export const URUTAN_SEGMEN: Segmen[] = ["ANDALAN", "SETIA", "BARU", "PERLU_DISAPA", "HILANG"];

/**
 * Skor 1–5 berdasarkan peringkat tengah (mid-rank). Nilai yang sama mendapat
 * skor yang sama, jadi urutan input tidak memengaruhi hasil.
 */
export function skorKuintil(nilai: number, semua: readonly number[]): number {
  if (semua.length === 0) return 3;
  let lebihKecil = 0;
  let sama = 0;
  for (const v of semua) {
    if (v < nilai) lebihKecil++;
    else if (v === nilai) sama++;
  }
  const persentil = (lebihKecil + sama / 2) / semua.length;
  return Math.min(5, Math.floor(persentil * 5) + 1);
}

/**
 * Segmen pelanggan model RFM, disederhanakan.
 *
 * Kebaruan (R) dan frekuensi (F) memakai ambang hari/kali yang mudah dipahami
 * ("terakhir pesan 45 hari lalu"), bukan kuintil: di usaha katering, mayoritas
 * pelanggan hanya pesan sekali, sehingga kuintil frekuensi akan menganggap
 * "sekali pesan" sebagai rata-rata — menyesatkan. Nilai belanja (M) memakai
 * kuintil karena sebarannya kontinu dan beda tiap usaha.
 */
export function segmenkanPelanggan(daftar: readonly DataPelanggan[]): PelangganBersegmen[] {
  const semuaNilai = daftar.map((p) => p.nilai);
  return daftar.map((p) => {
    const skorNilai = skorKuintil(p.nilai, semuaNilai);
    const r = p.hariSejakTerakhir;
    let segmen: Segmen;
    if (r > 180) segmen = "HILANG";
    else if (p.frekuensi >= 3 && r <= 90 && skorNilai >= 4) segmen = "ANDALAN";
    else if (p.frekuensi >= 2 && r <= 90) segmen = "SETIA";
    else if (p.frekuensi === 1 && r <= 60) segmen = "BARU";
    else segmen = "PERLU_DISAPA";
    return { ...p, segmen, skorNilai };
  });
}

// ------------------------------------------------------------------ Piutang

export type UmurPiutang = "BELUM_JATUH_TEMPO" | "H0_7" | "H8_30" | "LEBIH_30";

export const INFO_UMUR: Record<UmurPiutang, { label: string; arti: string }> = {
  BELUM_JATUH_TEMPO: { label: "Belum jatuh tempo", arti: "Acara hari ini atau mendatang" },
  H0_7: { label: "1–7 hari", arti: "Acara lewat 1–7 hari" },
  H8_30: { label: "8–30 hari", arti: "Acara lewat 8–30 hari" },
  LEBIH_30: { label: "> 30 hari", arti: "Acara lewat lebih dari sebulan" },
};

export const URUTAN_UMUR: UmurPiutang[] = ["LEBIH_30", "H8_30", "H0_7", "BELUM_JATUH_TEMPO"];

/**
 * Kelompok umur dari selisih hari tanggal acara terhadap hari ini (negatif = lewat).
 * Jatuh tempo = sehari setelah acara: pesanan hari ini masih bisa dilunasi saat diambil.
 */
export function umurPiutang(selisihHariAcara: number): UmurPiutang {
  if (selisihHariAcara >= 0) return "BELUM_JATUH_TEMPO";
  const lewat = -selisihHariAcara;
  if (lewat <= 7) return "H0_7";
  if (lewat <= 30) return "H8_30";
  return "LEBIH_30";
}

/**
 * Batas tanggal (selisih hari dari hari ini) tiap kelompok, untuk kueri
 * database: acara pada [dari, sampai) hari relatif terhadap hari ini.
 */
export function rentangUmur(umur: UmurPiutang): { dari: number | null; sampai: number | null } {
  switch (umur) {
    case "BELUM_JATUH_TEMPO":
      return { dari: 0, sampai: null };
    case "H0_7":
      return { dari: -7, sampai: 0 };
    case "H8_30":
      return { dari: -30, sampai: -7 };
    case "LEBIH_30":
      return { dari: null, sampai: -30 };
  }
}

// ------------------------------------------------------------ Menu & margin

export const BATAS_MARGIN_TIPIS = 20;

export interface BarisMargin {
  menuId: string;
  nama: string;
  porsi: number;
  omzet: number;
  /** Omzet dari item yang HPP-nya diketahui (snapshot atau resep kini). */
  omzetBerHpp: number;
  hpp: number;
  /** Ada item yang HPP-nya diambil dari resep kini, bukan snapshot. */
  hppPerkiraan: boolean;
}

export interface BarisMarginHasil extends BarisMargin {
  laba: number | null;
  margin: number | null;
  /** Laku (porsi ≥ median) tapi margin di bawah batas. */
  lakuTapiTipis: boolean;
}

/** Hitung laba & margin per menu; margin hanya dari bagian omzet yang HPP-nya diketahui. */
export function hitungMargin(daftar: readonly BarisMargin[]): BarisMarginHasil[] {
  const porsiUrut = daftar.map((d) => d.porsi).sort((a, b) => a - b);
  const median = porsiUrut.length ? porsiUrut[Math.floor((porsiUrut.length - 1) / 2)] : 0;
  return daftar.map((d) => {
    if (d.omzetBerHpp <= 0) return { ...d, laba: null, margin: null, lakuTapiTipis: false };
    const laba = d.omzetBerHpp - d.hpp;
    const margin = (laba / d.omzetBerHpp) * 100;
    return { ...d, laba, margin, lakuTapiTipis: d.porsi >= median && d.porsi > 0 && margin < BATAS_MARGIN_TIPIS };
  });
}
