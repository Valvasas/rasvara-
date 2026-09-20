/*
  Semua tanggal disimpan di database sebagai UTC, tetapi usaha ini hidup di WIB.
  Server bisa saja berjalan di zona lain, jadi setiap kali tanggal ditampilkan
  atau dibandingkan per hari, perhitungannya dipaksa ke Asia/Jakarta. Tanpa ini,
  pesanan jam 7 malam bisa tercatat sebagai pesanan besok di laporan harian.
*/
export const ZONA = "Asia/Jakarta";

const NAMA_HARI = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

const NAMA_BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

type BagianWaktu = {
  tahun: number;
  bulan: number; // 1-12
  hari: number;
  jam: number;
  menit: number;
  hariMinggu: number; // 0 = Minggu
};

const PEMFORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  weekday: "short",
  hour12: false,
});

const INDEKS_HARI: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function bagian(tanggal: Date | string): BagianWaktu {
  const bagianFormat = PEMFORMAT.formatToParts(new Date(tanggal));
  const ambil = (tipe: string) =>
    bagianFormat.find((b) => b.type === tipe)?.value ?? "0";

  return {
    tahun: Number(ambil("year")),
    bulan: Number(ambil("month")),
    hari: Number(ambil("day")),
    // Tengah malam di Asia/Jakarta dilaporkan sebagai "24" oleh sebagian runtime.
    jam: Number(ambil("hour")) % 24,
    menit: Number(ambil("minute")),
    hariMinggu: INDEKS_HARI[ambil("weekday")] ?? 0,
  };
}

/** 45000 -> "Rp45.000", -235000 -> "-Rp235.000" */
export function rupiah(jumlah: number): string {
  const bulat = Math.round(jumlah);
  // Tanda minus ditaruh di depan "Rp", bukan di antara "Rp" dan angka,
  // supaya tidak terbaca sebagai tanda hubung.
  const tanda = bulat < 0 ? "-" : "";
  return tanda + "Rp" + Math.abs(bulat).toLocaleString("id-ID");
}

/** 45000 -> "45.000" (untuk kolom yang sudah berlabel Rp) */
export function angka(jumlah: number): string {
  return Math.round(jumlah).toLocaleString("id-ID");
}

/** -> "Sabtu, 12 September 2026" */
export function tanggalPanjang(tanggal: Date | string): string {
  const b = bagian(tanggal);
  return `${NAMA_HARI[b.hariMinggu]}, ${b.hari} ${NAMA_BULAN[b.bulan - 1]} ${b.tahun}`;
}

/** -> "12 Sep 2026" */
export function tanggalPendek(tanggal: Date | string): string {
  const b = bagian(tanggal);
  return `${b.hari} ${NAMA_BULAN[b.bulan - 1].slice(0, 3)} ${b.tahun}`;
}

/** -> "12 September" */
export function tanggalTanpaTahun(tanggal: Date | string): string {
  const b = bagian(tanggal);
  return `${b.hari} ${NAMA_BULAN[b.bulan - 1]}`;
}

/** -> "2026-09-12", format untuk <input type="date"> dan kunci pengelompokan harian */
export function kunciHari(tanggal: Date | string): string {
  const b = bagian(tanggal);
  return `${b.tahun}-${String(b.bulan).padStart(2, "0")}-${String(b.hari).padStart(2, "0")}`;
}

/** -> "19:45" waktu WIB */
export function jam(tanggal: Date | string): string {
  const b = bagian(tanggal);
  return `${String(b.jam).padStart(2, "0")}.${String(b.menit).padStart(2, "0")}`;
}

/**
 * Ubah "2026-09-13" dari <input type="date"> menjadi Date yang menunjuk
 * tengah hari WIB. Dipakai tengah hari, bukan tengah malam, supaya pergeseran
 * zona waktu tidak pernah menggeser tanggalnya ke hari sebelumnya.
 */
export function dariInputTanggal(nilai: string): Date {
  const [tahun, bulan, hari] = nilai.split("-").map(Number);
  // WIB = UTC+7, jadi pukul 12.00 WIB sama dengan pukul 05.00 UTC.
  return new Date(Date.UTC(tahun, bulan - 1, hari, 5, 0, 0));
}

/** Tanggal hari ini di WIB dalam bentuk "2026-09-12". */
export function hariIniWib(): string {
  return kunciHari(new Date());
}

/** Jam sekarang di WIB dalam menit sejak tengah malam. */
export function menitSekarangWib(): number {
  const b = bagian(new Date());
  return b.jam * 60 + b.menit;
}

/** "16:00" -> 960 */
export function menitDariJam(teks: string): number {
  const [j, m] = teks.split(":").map(Number);
  return (j || 0) * 60 + (m || 0);
}

/** "16:00" -> "16.00" (gaya penulisan jam Indonesia) */
export function jamTampil(teks: string): string {
  return teks.replace(":", ".");
}

/**
 * Apakah toko sedang buka? Menangani jam tutup yang melewati tengah malam,
 * misalnya buka 16.00 sampai 01.00.
 */
export function sedangBuka(jamBuka: string, jamTutup: string): boolean {
  const sekarang = menitSekarangWib();
  const buka = menitDariJam(jamBuka);
  const tutup = menitDariJam(jamTutup);
  if (buka === tutup) return true;
  if (buka < tutup) return sekarang >= buka && sekarang < tutup;
  return sekarang >= buka || sekarang < tutup;
}

/** Jarak waktu dalam bahasa sehari-hari: "baru saja", "5 menit lalu". */
export function waktuRelatif(tanggal: Date | string): string {
  const detik = Math.floor((Date.now() - new Date(tanggal).getTime()) / 1000);
  if (detik < 60) return "baru saja";
  const menit = Math.floor(detik / 60);
  if (menit < 60) return `${menit} menit lalu`;
  const jamLalu = Math.floor(menit / 60);
  if (jamLalu < 24) return `${jamLalu} jam lalu`;
  const hari = Math.floor(jamLalu / 24);
  if (hari < 30) return `${hari} hari lalu`;
  return tanggalPendek(tanggal);
}

/** Selisih hari kalender WIB dari hari ini. Negatif = sudah lewat. */
export function selisihHari(tanggal: Date | string): number {
  const target = kunciHari(tanggal);
  const sekarang = hariIniWib();
  const [ty, tm, td] = target.split("-").map(Number);
  const [sy, sm, sd] = sekarang.split("-").map(Number);
  const a = Date.UTC(ty, tm - 1, td);
  const b = Date.UTC(sy, sm - 1, sd);
  return Math.round((a - b) / 86_400_000);
}

/** "0 hari lagi" terdengar aneh; ini menerjemahkannya ke bahasa manusia. */
export function labelHari(tanggal: Date | string): string {
  const selisih = selisihHari(tanggal);
  if (selisih === 0) return "Hari ini";
  if (selisih === 1) return "Besok";
  if (selisih === 2) return "Lusa";
  if (selisih === -1) return "Kemarin";
  if (selisih < 0) return `${Math.abs(selisih)} hari lalu`;
  return `${selisih} hari lagi`;
}

/**
 * Normalkan nomor HP Indonesia ke format 62xxx supaya tautan WhatsApp selalu
 * jalan dan satu orang tidak punya dua akun gara-gara menulis 0812 vs +62812.
 */
export function normalkanTelepon(input: string): string {
  const bersih = input.replace(/[^\d+]/g, "");
  if (bersih.startsWith("+62")) return bersih.slice(1);
  if (bersih.startsWith("62")) return bersih;
  if (bersih.startsWith("0")) return "62" + bersih.slice(1);
  if (bersih.startsWith("8")) return "62" + bersih;
  return bersih;
}

/** 6281234567890 -> "0812-3456-7890" */
export function teleponTampil(nomor: string): string {
  const n = normalkanTelepon(nomor);
  const lokal = n.startsWith("62") ? "0" + n.slice(2) : n;
  return lokal.replace(/(\d{4})(\d{4})(\d+)/, "$1-$2-$3");
}

// Sapaan yang lazim ditulis pemesan di depan namanya.
const SAPAAN = new Set([
  "ibu", "bu", "bapak", "pak", "bpk", "mas", "mbak", "mba",
  "kak", "kakak", "adik", "dik", "haji", "hj", "h", "dr", "drs",
]);

/**
 * Mengambil nama panggilan untuk menyapa pemesan.
 * "Ibu Ratna Kusuma" -> "Ibu Ratna", bukan "Ibu" saja.
 */
export function namaPanggilan(namaLengkap: string): string {
  const kata = namaLengkap.trim().split(/\s+/).filter(Boolean);
  if (kata.length === 0) return namaLengkap;

  const awal = kata[0].toLowerCase().replace(/\./g, "");
  if (SAPAAN.has(awal) && kata.length > 1) {
    return `${kata[0]} ${kata[1]}`;
  }
  return kata[0];
}

export function linkWhatsapp(nomor: string, pesan: string): string {
  return `https://wa.me/${normalkanTelepon(nomor)}?text=${encodeURIComponent(pesan)}`;
}

/**
 * Membersihkan nilai sel CSV dari potensi Formula Injection
 * pada aplikasi spreadsheet seperti Microsoft Excel atau LibreOffice.
 */
export function amankanCsv(nilai: string | null | undefined): string {
  if (!nilai) return "-";
  let teks = nilai;
  // Jika nilai diawali dengan karakter operator formula (=, +, -, @, \t, \r),
  // sisipkan petik tunggal di depannya agar dievaluasi murni sebagai teks literal.
  if (/^[=+\-@\t\r]/.test(teks)) {
    teks = `'${teks}`;
  }
  return `"${teks.replace(/"/g, '""')}"`;
}
