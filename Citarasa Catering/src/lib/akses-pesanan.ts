import { cookies } from "next/headers";
import { bukaTandatangan, tandatangani } from "@/lib/cookie-tertanda";

const NAMA_COOKIE = "pesanan_saya";
const BATAS = 25;

/**
 * Kode pesanan saja tidak dipakai sebagai kunci akses. Kode itu pendek supaya
 * mudah disebutkan lewat telepon, jadi secara teori bisa ditebak. Nomor kode
 * yang benar-benar milik pengunjung disimpan di cookie httpOnly saat ia membuat
 * pesanan atau berhasil mencocokkan nomor HP di halaman lacak.
 *
 * Isinya ditandatangani: tanpa itu, siapa pun cukup menulis kode pesanan orang
 * lain ke cookie ini untuk membuka rinciannya (nama, telepon, alamat antar,
 * titik koordinat, bukti transfer) — `httpOnly` tidak menghalanginya sama sekali.
 */
function rahasia(): string {
  return process.env.SESSION_SECRET ?? "";
}

export async function tandaiPesananMilikSaya(kode: string): Promise<void> {
  const gudang = await cookies();
  const daftar = bacaDaftar(gudang.get(NAMA_COOKIE)?.value);

  if (!daftar.includes(kode)) {
    daftar.unshift(kode);
  }

  const muatan = JSON.stringify(daftar.slice(0, BATAS));

  gudang.set(NAMA_COOKIE, tandatangani(muatan, rahasia()), {
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
  const muatan = bukaTandatangan(mentah, rahasia());
  if (muatan === null) return [];

  try {
    const hasil: unknown = JSON.parse(muatan);
    return Array.isArray(hasil) ? hasil.filter((k) => typeof k === "string") : [];
  } catch {
    return [];
  }
}
