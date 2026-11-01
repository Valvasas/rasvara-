import { cookies } from "next/headers";
import { db } from "@/lib/db";
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

/**
 * Kode pesanan yang dibuat/dilacak dari perangkat ini, terbaru dulu. Dipakai
 * halaman "Pesanan saya" supaya pembeli tamu (yang tidak pernah membuat akun)
 * tetap bisa menemukan pesanannya tanpa harus menyimpan kodenya.
 */
export async function kodePesananPerangkatIni(): Promise<string[]> {
  const gudang = await cookies();
  return bacaDaftar(gudang.get(NAMA_COOKIE)?.value);
}

/**
 * Menyambungkan pesanan tamu ke akun yang baru login/daftar.
 *
 * Syaratnya dua sekaligus: kodenya ada di cookie bertanda tangan perangkat ini
 * (bukti pesanan itu dibuat atau dilacak dari sini) DAN nomor pemesannya sama
 * dengan nomor akun. Syarat kedua mencegah tablet keluarga atau komputer
 * warnet menempelkan pesanan orang lain ke akun yang kebetulan login di sana.
 * Pesanan yang sudah punya pemilik tidak pernah dipindahkan.
 */
export async function klaimPesananTamu(pengguna: {
  id: string;
  telepon: string;
}): Promise<number> {
  const kode = await kodePesananPerangkatIni();
  if (kode.length === 0) return 0;

  const hasil = await db.pesanan.updateMany({
    where: {
      kode: { in: kode },
      penggunaId: null,
      teleponPemesan: pengguna.telepon,
    },
    data: { penggunaId: pengguna.id },
  });
  return hasil.count;
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
