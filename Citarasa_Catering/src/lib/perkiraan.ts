/*
  Perkiraan porsi 7 hari ke depan — fungsi murni, bisa diuji, bisa dijelaskan.

  Dua sumber petunjuk:
  1. Kurva pemesanan. Dari riwayat 8 minggu kita tahu, misalnya, "H-3 biasanya
     baru 55% porsi yang sudah masuk". Bila hari ini sudah ada 110 porsi untuk
     tanggal H-3, petunjuk kurva = 110 / 0,55 = 200 porsi.
  2. Rata-rata hari yang sama. Rata-rata tertimbang 8 minggu terakhir untuk
     hari (Senin, Selasa, ...) yang sama; minggu terbaru berbobot paling besar.

  Hasil akhir = r × kurva + (1 − r) × rata-rata, dengan r = persen yang
  biasanya sudah masuk. Makin dekat ke hari H, makin dipercaya pesanan yang
  sudah ada; makin jauh, makin bersandar pada kebiasaan. Hasil tidak pernah
  lebih kecil dari porsi yang sudah dipesan.
*/

export interface PesananRiwayat {
  /** Tanggal acara, "YYYY-MM-DD" (WIB). */
  tanggal: string;
  /** Tanggal pesanan dibuat, "YYYY-MM-DD" (WIB). */
  dipesanPada: string;
  porsi: number;
}

export interface PerkiraanHari {
  tanggal: string;
  /** Jarak hari dari hari ini (1 = besok). */
  jarak: number;
  sudahDipesan: number;
  perkiraan: number | null;
  /** 0–1: bagian porsi yang biasanya sudah masuk pada jarak ini. */
  biasanyaSudahMasuk: number | null;
  rataRataHariSama: number | null;
}

export interface HasilPerkiraan {
  cukupData: boolean;
  /** Jumlah hari riwayat yang benar-benar terpakai. */
  hariRiwayat: number;
  hari: PerkiraanHari[];
}

export const MINGGU_RIWAYAT = 8;
export const MIN_HARI_RIWAYAT = 28;
export const MIN_PESANAN_RIWAYAT = 10;

const HARI_MS = 86_400_000;

function keUtc(kunci: string): number {
  const [t, b, h] = kunci.split("-").map(Number);
  return Date.UTC(t, b - 1, h);
}

function dariUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function geserTanggal(kunci: string, hari: number): string {
  return dariUtc(keUtc(kunci) + hari * HARI_MS);
}

export function selisihTanggal(a: string, b: string): number {
  return Math.round((keUtc(a) - keUtc(b)) / HARI_MS);
}

/**
 * @param riwayat pesanan tidak batal dengan tanggal acara 8 minggu terakhir (sebelum hari ini)
 * @param mendatang pesanan tidak batal untuk 1..jumlahHari ke depan
 * @param pertamaKali tanggal acara pesanan paling awal di seluruh database (untuk cek "cukup data")
 */
export function hitungPerkiraan(o: {
  riwayat: readonly PesananRiwayat[];
  mendatang: readonly PesananRiwayat[];
  hariIni: string;
  pertamaKali: string | null;
  jumlahHari?: number;
}): HasilPerkiraan {
  const jumlahHari = o.jumlahHari ?? 7;
  const awalRiwayat = geserTanggal(o.hariIni, -MINGGU_RIWAYAT * 7);

  // Volume akhir per hari & porsi per jarak pemesanan (lead time).
  const volume = new Map<string, number>();
  const porsiPerJarak: number[] = [];
  let totalRiwayat = 0;
  let jumlahPesananRiwayat = 0;
  for (const p of o.riwayat) {
    if (p.tanggal < awalRiwayat || p.tanggal >= o.hariIni || p.porsi <= 0) continue;
    volume.set(p.tanggal, (volume.get(p.tanggal) ?? 0) + p.porsi);
    const jarak = Math.max(0, selisihTanggal(p.tanggal, p.dipesanPada));
    porsiPerJarak[jarak] = (porsiPerJarak[jarak] ?? 0) + p.porsi;
    totalRiwayat += p.porsi;
    jumlahPesananRiwayat++;
  }

  const hariRiwayat = o.pertamaKali ? Math.min(MINGGU_RIWAYAT * 7, Math.max(0, selisihTanggal(o.hariIni, o.pertamaKali))) : 0;
  const cukupData = hariRiwayat >= MIN_HARI_RIWAYAT && jumlahPesananRiwayat >= MIN_PESANAN_RIWAYAT && totalRiwayat > 0;

  // Bagian porsi yang sudah dipesan ≥ h hari sebelum acara.
  const sudahMasukPada = (h: number): number | null => {
    if (totalRiwayat <= 0) return null;
    let n = 0;
    for (let j = h; j < porsiPerJarak.length; j++) n += porsiPerJarak[j] ?? 0;
    return n / totalRiwayat;
  };

  // Rata-rata tertimbang hari yang sama: minggu lalu berbobot 8, delapan minggu lalu berbobot 1.
  // Minggu sebelum usaha mulai tidak dihitung (bukan nol, melainkan tidak ada).
  const rataHariSama = (tanggal: string): number | null => {
    let jumlah = 0;
    let bobot = 0;
    for (let w = 1; w <= MINGGU_RIWAYAT; w++) {
      const t = geserTanggal(tanggal, -7 * w);
      if (t >= o.hariIni) continue;
      if (o.pertamaKali && t < o.pertamaKali) break;
      const b = MINGGU_RIWAYAT + 1 - w;
      jumlah += (volume.get(t) ?? 0) * b;
      bobot += b;
    }
    return bobot ? jumlah / bobot : null;
  };

  const dipesan = new Map<string, number>();
  for (const p of o.mendatang) dipesan.set(p.tanggal, (dipesan.get(p.tanggal) ?? 0) + Math.max(0, p.porsi));

  const hari: PerkiraanHari[] = [];
  for (let jarak = 1; jarak <= jumlahHari; jarak++) {
    const tanggal = geserTanggal(o.hariIni, jarak);
    const sudah = dipesan.get(tanggal) ?? 0;
    const r = sudahMasukPada(jarak);
    const rata = rataHariSama(tanggal);

    let perkiraan: number | null = null;
    if (cukupData && rata !== null) {
      const rr = r ?? 0;
      // Di bawah 10% kurva terlalu liar (satu pesanan kecil bisa jadi ×10); pakai rata-rata saja.
      const kurva = rr >= 0.1 ? sudah / rr : rata;
      perkiraan = Math.max(sudah, Math.round(rr * kurva + (1 - rr) * rata));
    }
    hari.push({
      tanggal,
      jarak,
      sudahDipesan: sudah,
      perkiraan,
      biasanyaSudahMasuk: r,
      rataRataHariSama: rata === null ? null : Math.round(rata),
    });
  }

  return { cukupData, hariRiwayat, hari };
}
