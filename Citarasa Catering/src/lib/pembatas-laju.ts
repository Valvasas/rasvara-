import { headers } from "next/headers";

type CatatanLaju = {
  hitungan: number;
  kadaluarsa: number;
};

// Penyimpanan in-memory per proses server
const tokoLaju = new Map<string, CatatanLaju>();

/**
 * Tiap kunci baru memakan satu entri peta. Kunci dibentuk dari alamat IP, dan
 * alamat IP datang dari header — artinya jumlah kunci yang bisa dibuat penyerang
 * tidak terbatas kalau tidak dibatasi di sini. Begitu penuh, entri terlama
 * (yang paling dekat kedaluwarsa) dibuang lebih dulu.
 */
const MAKS_ENTRI = 20_000;

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

function sisakanRuang(): void {
  if (tokoLaju.size < MAKS_ENTRI) return;

  const sekarang = Date.now();
  for (const [kunci, data] of tokoLaju.entries()) {
    if (data.kadaluarsa < sekarang) tokoLaju.delete(kunci);
  }

  // Map menjaga urutan penyisipan, jadi entri terdepan adalah yang tertua.
  while (tokoLaju.size >= MAKS_ENTRI) {
    const tertua = tokoLaju.keys().next();
    if (tertua.done) break;
    tokoLaju.delete(tertua.value);
  }
}

/**
 * Berapa banyak reverse-proxy tepercaya yang berdiri di depan aplikasi ini.
 *
 * Header `x-forwarded-for` dan `x-real-ip` bisa ditulis siapa saja yang mengirim
 * permintaan. Yang membuatnya dapat dipercaya hanyalah proxy di depan yang
 * menimpanya. Kalau aplikasi diakses langsung (tanpa proxy), header itu murni
 * karangan klien: penyerang cukup mengganti-ganti isinya untuk mendapat jatah
 * percobaan login baru setiap permintaan, dan pembatas laju jadi tidak berguna.
 *
 * Nilai 1 cocok untuk susunan lazim "nginx -> aplikasi" seperti di PRODUCTION.md.
 * Isi 0 kalau aplikasi benar-benar terbuka langsung ke internet.
 */
function jumlahProxyTepercaya(): number {
  const mentah = Number(process.env.PROXY_TEPERCAYA ?? "1");
  return Number.isInteger(mentah) && mentah >= 0 ? mentah : 1;
}

/** Nilai yang dipakai saat tidak ada satu pun header yang boleh dipercaya. */
export const IP_TAK_DIPERCAYA = "tanpa-proxy";

/**
 * Memilih alamat klien dari rantai header penerusan.
 *
 * Proxy menambahkan alamat yang benar-benar dilihatnya di ujung kanan, jadi
 * dengan `hop` proxy tepercaya alamat klien asli berada `hop` langkah dari
 * kanan. Apa pun di sebelah kirinya masih boleh dikarang pengirim permintaan
 * dan tidak boleh dijadikan kunci pembatas laju.
 */
export function pilihIpKlien(
  forwarded: string | null,
  realIp: string | null,
  hop: number
): string {
  if (hop === 0) return IP_TAK_DIPERCAYA;

  if (forwarded) {
    const daftarIp = forwarded
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const indeks = daftarIp.length - hop;
    if (indeks >= 0 && daftarIp[indeks]) {
      return daftarIp[indeks];
    }
  }

  if (realIp?.trim()) {
    return realIp.trim();
  }

  return "127.0.0.1";
}

/**
 * Mendapatkan IP klien dari header request (mendukung proxy / reverse-proxy).
 */
export async function ambilIpKlien(): Promise<string> {
  const hop = jumlahProxyTepercaya();
  if (hop === 0) {
    // Tidak ada yang bisa dipercaya dari header; semua permintaan dihitung
    // dalam satu ember supaya batasnya tetap berlaku walau jadi lebih ketat.
    return IP_TAK_DIPERCAYA;
  }

  try {
    const headerList = await headers();
    return pilihIpKlien(
      headerList.get("x-forwarded-for"),
      headerList.get("x-real-ip"),
      hop
    );
  } catch {
    // Saat dijalankan di luar konteks request (misalnya unit test)
    return "127.0.0.1";
  }
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
    sisakanRuang();
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
