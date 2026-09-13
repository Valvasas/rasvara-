import { cookies } from "next/headers";

const NAMA_COOKIE = "pesanan_saya";
const BATAS = 25;

/**
 * Kode pesanan saja tidak dipakai sebagai kunci akses. Kode itu pendek supaya
 * mudah disebutkan lewat telepon, jadi secara teori bisa ditebak. Nomor kode
 * yang benar-benar milik pengunjung disimpan di cookie httpOnly saat ia membuat
 * pesanan atau berhasil mencocokkan nomor HP di halaman lacak.
 */
export async function tandaiPesananMilikSaya(kode: string): Promise<void> {
  const gudang = await cookies();
  const daftar = bacaDaftar(gudang.get(NAMA_COOKIE)?.value);

  if (!daftar.includes(kode)) {
    daftar.unshift(kode);
  }

  gudang.set(NAMA_COOKIE, JSON.stringify(daftar.slice(0, BATAS)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
}

export async function punyaAksesPesanan(kode: string): Promise<boolean> {
  const gudang = await cookies();
  return bacaDaftar(gudang.get(NAMA_COOKIE)?.value).includes(kode);
}

function bacaDaftar(mentah: string | undefined): string[] {
  if (!mentah) return [];
  try {
    const hasil: unknown = JSON.parse(mentah);
    return Array.isArray(hasil) ? hasil.filter((k) => typeof k === "string") : [];
  } catch {
    return [];
  }
}
