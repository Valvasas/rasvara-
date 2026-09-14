import { headers } from "next/headers";

type CatatanLaju = {
  hitungan: number;
  kadaluarsa: number;
};

// Penyimpanan in-memory per proses server
const tokoLaju = new Map<string, CatatanLaju>();

// Bersihkan entri basi setiap 5 menit sekali agar memori tetap bersih
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const sekarang = Date.now();
    for (const [kunci, data] of tokoLaju.entries()) {
      if (data.kadaluarsa < sekarang) {
        tokoLaju.delete(kunci);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

/**
 * Mendapatkan IP klien dari header request (mendukung proxy / reverse-proxy).
 */
export async function ambilIpKlien(): Promise<string> {
  try {
    const headerList = await headers();
    const forwarded = headerList.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }
    const realIp = headerList.get("x-real-ip");
    if (realIp) {
      return realIp.trim();
    }
  } catch {
    // Saat dijalankan di luar konteks request (misalnya unit test)
  }
  return "127.0.0.1";
}

export type OpsiBatasan = {
  kunci: string;
  maksimal: number;
  jendelaDetik: number;
};

/**
 * Memeriksa apakah aksi tertentu melewati batas laju (rate limit).
 * Mengembalikan { diizinkan: true } jika masih dalam batas,
 * atau { diizinkan: false, tungguDetik: number } jika terlampaui.
 */
export function periksaBatasLaju({
  kunci,
  maksimal,
  jendelaDetik,
}: OpsiBatasan): { diizinkan: boolean; tungguDetik: number } {
  const sekarang = Date.now();
  const durasiMs = jendelaDetik * 1000;
  const entri = tokoLaju.get(kunci);

  if (!entri || entri.kadaluarsa < sekarang) {
    tokoLaju.set(kunci, {
      hitungan: 1,
      kadaluarsa: sekarang + durasiMs,
    });
    return { diizinkan: true, tungguDetik: 0 };
  }

  if (entri.hitungan >= maksimal) {
    const sisaMs = Math.max(0, entri.kadaluarsa - sekarang);
    return {
      diizinkan: false,
      tungguDetik: Math.ceil(sisaMs / 1000),
    };
  }

  entri.hitungan += 1;
  return { diizinkan: true, tungguDetik: 0 };
}

/**
 * Reset catatan laju jika aksi berhasil (mis. login sukses, tidak perlu menghitung percobaan).
 */
export function resetBatasLaju(kunci: string): void {
  tokoLaju.delete(kunci);
}

