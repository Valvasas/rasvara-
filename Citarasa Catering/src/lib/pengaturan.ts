import { db } from "@/lib/db";
import type { Pengaturan } from "@/generated/prisma/client";

const BAWAAN: Pengaturan = {
  id: "utama",
  namaUsaha: "Citarasa Catering",
  tagline: "Masakan hangat, siap tepat waktu.",
  cerita: "",
  whatsapp: "",
  alamat: "",
  jamBuka: "16:00",
  jamTutup: "23:00",
  namaBank: "",
  nomorRekening: "",
  namaRekening: "",
  ongkirDefault: 0,
  minOrderAntar: 0,
  diubahPada: new Date(),
};

/**
 * Pengaturan nyaris tidak pernah berubah tapi dibaca di hampir setiap halaman,
 * jadi hasilnya disimpan di memori proses selama beberapa detik. Tanpa ini,
 * seratus pengunjung berarti seratus kueri untuk satu baris yang sama.
 */
const UMUR_SINGGAHAN_MS = 60 * 1000;

let singgahan: { nilai: Pengaturan; kedaluwarsa: number } | null = null;
let sedangMuat: Promise<Pengaturan> | null = null;

/** Dipanggil setelah pemilik menyimpan pengaturan supaya perubahannya langsung terlihat. */
export function lupakanSinggahanPengaturan(): void {
  singgahan = null;
}

/**
 * Nilai bawaan hanya untuk pemasangan baru yang barisnya memang belum ada.
 *
 * Dulu fungsi ini memakai `Promise.race` dengan tenggat 500 ms, sehingga saat
 * database sedang sibuk ia diam-diam mengembalikan bawaan — dan karena
 * `ongkirDefault` bawaannya 0, pesanan yang dibuat pada saat itu tercatat gratis
 * ongkir serta menampilkan nomor rekening kosong. Sekarang kueri ditunggu sampai
 * selesai, dan kalau gagal yang dipakai adalah nilai terakhir yang benar-benar
 * pernah terbaca dari database.
 */
export async function ambilPengaturan(): Promise<Pengaturan> {
  if (singgahan && singgahan.kedaluwarsa > Date.now()) {
    return singgahan.nilai;
  }

  // Saat singgahan baru kedaluwarsa, banyak permintaan bisa tiba bersamaan.
  // Tanpa penjaga ini semuanya menembak database untuk baris yang sama.
  if (sedangMuat) return sedangMuat;

  sedangMuat = (async () => {
    try {
      const tersimpan = await db.pengaturan.findUnique({ where: { id: "utama" } });
      const nilai = tersimpan ?? singgahan?.nilai ?? BAWAAN;
      singgahan = { nilai, kedaluwarsa: Date.now() + UMUR_SINGGAHAN_MS };
      return nilai;
    } catch {
      return singgahan?.nilai ?? BAWAAN;
    } finally {
      sedangMuat = null;
    }
  })();

  return sedangMuat;
}
