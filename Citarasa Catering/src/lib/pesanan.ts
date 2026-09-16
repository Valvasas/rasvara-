import type {
  CaraAmbil,
  CaraBayar,
  KategoriMenu,
  StatusBayar,
  StatusPesanan,
} from "@/generated/prisma/client";

/**
 * Alur status pesanan. Sengaja satu arah dan pendek: pemilik cukup menekan
 * satu tombol besar untuk maju ke tahap berikutnya, tanpa memilih dari dropdown.
 */
export const ALUR_STATUS: Record<StatusPesanan, StatusPesanan[]> = {
  BARU: ["DIKONFIRMASI", "DIBATALKAN"],
  DIKONFIRMASI: ["DIPROSES", "DIBATALKAN"],
  DIPROSES: ["SIAP", "DIBATALKAN"],
  SIAP: ["SELESAI", "DIBATALKAN"],
  SELESAI: [],
  DIBATALKAN: [],
};

export function bolehPindahStatus(
  dari: StatusPesanan,
  ke: StatusPesanan
): boolean {
  return ALUR_STATUS[dari].includes(ke);
}

type InfoStatus = {
  label: string;
  labelPelanggan: string;
  /** Teks tombol untuk maju ke tahap berikutnya, dilihat dari status ini. */
  aksiLanjut: string | null;
  statusLanjut: StatusPesanan | null;
  kelas: string;
  penjelasan: string;
};

export const INFO_STATUS: Record<StatusPesanan, InfoStatus> = {
  BARU: {
    label: "Pesanan Baru",
    labelPelanggan: "Menunggu dikonfirmasi",
    aksiLanjut: "Terima Pesanan",
    statusLanjut: "DIKONFIRMASI",
    kelas: "bg-kunyit-lembut text-kunyit-tua border-kunyit/40",
    penjelasan: "Pesanan baru masuk dan menunggu jawaban Anda.",
  },
  DIKONFIRMASI: {
    label: "Diterima",
    labelPelanggan: "Pesanan diterima",
    aksiLanjut: "Mulai Masak",
    statusLanjut: "DIPROSES",
    kelas: "bg-kayu-lembut text-kayu-tua border-kayu/40",
    penjelasan: "Sudah Anda terima, menunggu giliran dimasak.",
  },
  DIPROSES: {
    label: "Sedang Dimasak",
    labelPelanggan: "Sedang dimasak",
    aksiLanjut: "Tandai Siap",
    statusLanjut: "SIAP",
    kelas: "bg-bata-lembut text-bata-tua border-bata/40",
    penjelasan: "Dapur sedang mengerjakan pesanan ini.",
  },
  SIAP: {
    label: "Siap",
    labelPelanggan: "Siap diambil / diantar",
    aksiLanjut: "Selesaikan",
    statusLanjut: "SELESAI",
    kelas: "bg-daun-lembut text-daun-tua border-daun/40",
    penjelasan: "Masakan sudah siap, tinggal diserahkan ke pemesan.",
  },
  SELESAI: {
    label: "Selesai",
    labelPelanggan: "Selesai",
    aksiLanjut: null,
    statusLanjut: null,
    kelas: "bg-daun-lembut text-daun-tua border-daun/40",
    penjelasan: "Pesanan sudah diserahkan dan beres.",
  },
  DIBATALKAN: {
    label: "Dibatalkan",
    labelPelanggan: "Dibatalkan",
    aksiLanjut: null,
    statusLanjut: null,
    kelas: "bg-bahaya-lembut text-bahaya border-bahaya/30",
    penjelasan: "Pesanan ini dibatalkan.",
  },
};

/** Urutan kolom papan pesanan, dari kiri ke kanan seperti alur kerja dapur. */
export const KOLOM_PAPAN: StatusPesanan[] = [
  "BARU",
  "DIKONFIRMASI",
  "DIPROSES",
  "SIAP",
];

export const INFO_BAYAR: Record<StatusBayar, { label: string; kelas: string }> = {
  BELUM_BAYAR: {
    label: "Belum bayar",
    kelas: "bg-bahaya-lembut text-bahaya border-bahaya/30",
  },
  MENUNGGU_VERIFIKASI: {
    label: "Cek pembayaran",
    kelas: "bg-kunyit-lembut text-kunyit-tua border-kunyit/40",
  },
  LUNAS: {
    label: "Lunas",
    kelas: "bg-daun-lembut text-daun-tua border-daun/40",
  },
};

export const LABEL_KATEGORI: Record<KategoriMenu, string> = {
  SNACK: "Snack Box",
  NASI_KOTAK: "Nasi Kotak",
  TUMPENG: "Tumpeng",
  NASI_GORENG: "Nasi Goreng",
};

export const URUTAN_KATEGORI: KategoriMenu[] = [
  "NASI_KOTAK",
  "SNACK",
  "TUMPENG",
  "NASI_GORENG",
];

export const LABEL_AMBIL: Record<CaraAmbil, string> = {
  AMBIL_SENDIRI: "Ambil sendiri di toko",
  DIANTAR: "Diantar ke alamat",
};

export const LABEL_BAYAR: Record<CaraBayar, string> = {
  TRANSFER: "Transfer bank",
  TUNAI: "Bayar tunai saat terima",
};

/** Kategori pengeluaran yang lazim di dapur catering, dipakai sebagai pilihan cepat. */
export const KATEGORI_PENGELUARAN = [
  "Belanja bahan",
  "Gas & air",
  "Listrik",
  "Kemasan",
  "Transport",
  "Upah bantu",
  "Sewa",
  "Lain-lain",
];

export const KATEGORI_PEMASUKAN = [
  "Penjualan pesanan",
  "Penjualan langsung",
  "Lain-lain",
];
