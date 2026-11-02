import { cookies } from "next/headers";

/**
 * Kabar sekali-tampil dari server ke toast di peramban ("flash message").
 *
 * Aksi seperti masuk, daftar, dan keluar diakhiri `redirect()`, jadi tidak
 * ada nilai balikan yang bisa ditampilkan formulir. Tanpa konfirmasi, pembeli
 * tidak yakin apakah ia sudah benar-benar masuk/keluar. Kabarnya dititipkan di
 * cookie berumur pendek, lalu dibaca & langsung dihapus oleh <KabarServer>.
 *
 * Cookie ini sengaja TIDAK httpOnly (harus dibaca skrip) — jadi isinya hanya
 * kalimat sapaan, tidak pernah data rahasia.
 */
export const NAMA_COOKIE_KABAR = "kabar_citarasa";

export type JenisKabar = "sukses" | "info" | "galat";

export async function titipKabar(pesan: string, jenis: JenisKabar = "sukses"): Promise<void> {
  const gudang = await cookies();
  // Tanpa encodeURIComponent di sini: Next.js sudah meng-encode nilai cookie
  // sendiri. Meng-encode dua kali membuat JSON-nya gagal dibaca di peramban.
  gudang.set(NAMA_COOKIE_KABAR, JSON.stringify({ p: pesan.slice(0, 160), j: jenis }), {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30,
  });
}
