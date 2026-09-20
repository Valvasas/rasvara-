import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Menandatangani isi cookie dengan HMAC.
 *
 * `httpOnly` hanya menghalangi JavaScript di peramban membaca cookie; ia tidak
 * menghalangi siapa pun menyusun header Cookie sendiri. Jadi isi cookie yang
 * menentukan hak akses harus ditandatangani, kalau tidak nilainya sama saja
 * dengan parameter yang diketik pengunjung.
 *
 * Dipisah dari berkas yang menyentuh `next/headers` supaya logikanya bisa diuji
 * sebagai fungsi biasa.
 */

function kunci(rahasia: string): Buffer {
  if (!rahasia || rahasia.length < 32) {
    throw new Error(
      "SESSION_SECRET belum diisi atau terlalu pendek (minimal 32 karakter). Cek berkas .env."
    );
  }
  return Buffer.from(rahasia, "utf8");
}

function tandaUntuk(muatan: string, rahasia: string): string {
  return createHmac("sha256", kunci(rahasia)).update(muatan).digest("base64url");
}

/** "<tanda>.<muatan>" — tanda base64url tidak pernah memuat titik. */
export function tandatangani(muatan: string, rahasia: string): string {
  return `${tandaUntuk(muatan, rahasia)}.${muatan}`;
}

/** Mengembalikan muatan hanya bila tanda tangannya cocok, selain itu null. */
export function bukaTandatangan(
  nilai: string | undefined,
  rahasia: string
): string | null {
  if (!nilai) return null;

  const pemisah = nilai.indexOf(".");
  if (pemisah <= 0) return null;

  const dikirim = Buffer.from(nilai.slice(0, pemisah), "utf8");
  const muatan = nilai.slice(pemisah + 1);
  const benar = Buffer.from(tandaUntuk(muatan, rahasia), "utf8");

  if (dikirim.length !== benar.length || !timingSafeEqual(dikirim, benar)) {
    return null;
  }
  return muatan;
}
