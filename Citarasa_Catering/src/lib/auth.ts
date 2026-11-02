import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cache } from "react";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/db";
import type { Peran } from "@/generated/prisma/client";

const scryptAsync = promisify(scrypt);

const NAMA_COOKIE = "sesi_citarasa";
const UMUR_SESI_DETIK = 60 * 60 * 24 * 30; // 30 hari: pemilik tidak mau login ulang tiap hari.
/**
 * "Ingat saya" tidak dicentang (HP pinjaman, komputer warnet): cookie sesi
 * peramban (hilang saat peramban ditutup) dan token berumur pendek, supaya
 * peramban yang tidak pernah ditutup tetap tidak menyimpan akses berhari-hari.
 */
const UMUR_SESI_SINGKAT_DETIK = 60 * 60 * 12;

/**
 * Peran ikut tertulis di dalam token yang berumur 30 hari. Kalau peran hanya
 * dibaca dari token, staf yang dipecat (akunnya dihapus) atau diturunkan
 * perannya tetap memegang akses dapur sampai tokennya kedaluwarsa. Karena itu
 * setiap sesi dicocokkan ulang ke database — disinggahkan sebentar supaya
 * tiap permintaan tidak menambah satu kueri.
 */
const UMUR_SINGGAHAN_PERAN_MS = 30 * 1000;
type AkunTerkini = { peran: Peran; sesiSejak: number } | null;
const singgahanPeran = new Map<string, { akun: AkunTerkini; kedaluwarsa: number }>();

async function akunTerkini(id: string): Promise<AkunTerkini> {
  const tersimpan = singgahanPeran.get(id);
  if (tersimpan && tersimpan.kedaluwarsa > Date.now()) {
    return tersimpan.akun;
  }

  const pengguna = await db.pengguna.findUnique({
    where: { id },
    select: { peran: true, sesiSejak: true },
  });

  const akun = pengguna
    ? { peran: pengguna.peran, sesiSejak: pengguna.sesiSejak.getTime() }
    : null;
  singgahanPeran.set(id, {
    akun,
    kedaluwarsa: Date.now() + UMUR_SINGGAHAN_PERAN_MS,
  });
  return akun;
}

/**
 * Batas waktu terbit token baru setelah sandi diganti. Dibulatkan ke detik
 * karena klaim `iat` di JWT bersatuan detik — tanpa pembulatan, token yang
 * diterbitkan pada detik yang sama ikut tertolak.
 */
export function awalSesiBaru(): Date {
  return new Date(Math.floor(Date.now() / 1000) * 1000);
}

/** Dipanggil saat peran/akun berubah supaya perubahannya langsung berlaku. */
export function lupakanSinggahanPeran(id: string): void {
  singgahanPeran.delete(id);
}

/**
 * Token berlaku bila terbit pada/sesudah batas `sesiSejak`, dibandingkan per
 * DETIK: `iat` JWT bersatuan detik, sedangkan sesiSejak akun baru terisi now()
 * bermilidetik. Tanpa pembulatan, token yang terbit di detik yang sama saat
 * mendaftar langsung dianggap kedaluwarsa dan pendaftar baru ter-logout.
 */
export function tokenMasihBerlaku(terbitPadaMs: number, sesiSejakMs: number): boolean {
  return terbitPadaMs >= Math.floor(sesiSejakMs / 1000) * 1000;
}

export type DataSesi = {
  id: string;
  nama: string;
  telepon: string;
  peran: Peran;
};

function kunciRahasia(): Uint8Array {
  const rahasia = process.env.SESSION_SECRET;
  if (!rahasia || rahasia.length < 32) {
    throw new Error(
      "SESSION_SECRET belum diisi atau terlalu pendek (minimal 32 karakter). Cek berkas .env."
    );
  }
  return new TextEncoder().encode(rahasia);
}

/**
 * scrypt bawaan Node: tidak perlu dependensi native, dan salt acak per pengguna
 * membuat dua orang dengan sandi sama tetap menghasilkan hash berbeda.
 */
export async function hashSandi(sandi: string): Promise<string> {
  const salt = randomBytes(16);
  const turunan = (await scryptAsync(sandi, salt, 64)) as Buffer;
  return `${salt.toString("hex")}:${turunan.toString("hex")}`;
}

export async function cocokkanSandi(
  sandi: string,
  hashTersimpan: string
): Promise<boolean> {
  const [saltHex, kunciHex] = hashTersimpan.split(":");
  if (!saltHex || !kunciHex) return false;

  const kunciTersimpan = Buffer.from(kunciHex, "hex");
  const kunciUji = (await scryptAsync(
    sandi,
    Buffer.from(saltHex, "hex"),
    kunciTersimpan.length
  )) as Buffer;

  // timingSafeEqual mencegah penyerang menebak sandi dari selisih waktu balasan.
  return timingSafeEqual(kunciTersimpan, kunciUji);
}

export async function buatSesi(data: DataSesi, opsi: { ingat?: boolean } = {}): Promise<void> {
  const ingat = opsi.ingat ?? true;
  const umur = ingat ? UMUR_SESI_DETIK : UMUR_SESI_SINGKAT_DETIK;
  const token = await new SignJWT({ id: data.id, nama: data.nama, telepon: data.telepon, peran: data.peran, ingat })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${umur}s`)
    .sign(kunciRahasia());

  const gudangCookie = await cookies();
  gudangCookie.set(NAMA_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Tanpa maxAge = cookie sesi peramban.
    ...(ingat ? { maxAge: UMUR_SESI_DETIK } : {}),
  });
}

/**
 * Menerbitkan ulang token untuk perangkat ini (mis. setelah ganti sandi atau
 * ganti nama) dengan pilihan "Ingat saya" yang sama seperti saat masuk.
 */
export async function perbaruiSesi(data: DataSesi): Promise<void> {
  const gudangCookie = await cookies();
  const token = gudangCookie.get(NAMA_COOKIE)?.value;
  let ingat = true;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, kunciRahasia());
      ingat = payload.ingat !== false;
    } catch {
      // Token lama tidak terbaca: anggap "ingat" seperti perilaku sebelumnya.
    }
  }
  await buatSesi(data, { ingat });
}

export async function hapusSesi(): Promise<void> {
  const gudangCookie = await cookies();
  gudangCookie.delete(NAMA_COOKIE);
}

export const bacaSesi = cache(async (): Promise<DataSesi | null> => {
  const gudangCookie = await cookies();
  const token = gudangCookie.get(NAMA_COOKIE)?.value;
  if (!token) return null;

  let sesi: DataSesi;
  let terbitPada: number;
  try {
    const { payload } = await jwtVerify(token, kunciRahasia());
    sesi = {
      id: payload.id as string,
      nama: payload.nama as string,
      telepon: payload.telepon as string,
      peran: payload.peran as Peran,
    };
    terbitPada = (payload.iat ?? 0) * 1000;
  } catch {
    // Token kedaluwarsa atau tanda tangannya tidak cocok: perlakukan sebagai belum login.
    return null;
  }

  // Dulu hanya sesi pemilik/staf yang dicocokkan ke database; sesi pelanggan
  // dipercaya apa adanya. Akibatnya "ganti sandi", "keluar dari perangkat
  // lain", dan reset sandi oleh dapur tidak berlaku untuk pelanggan — padahal
  // akun pelanggan memuat alamat rumah dan riwayat pesanannya. Biayanya satu
  // kueri kunci-utama per pengguna per 30 detik per instans.
  try {
    const akun = await akunTerkini(sesi.id);
    if (!akun) return null; // Akunnya sudah dihapus.
    // Sandi diganti / semua perangkat dikeluarkan setelah token ini terbit.
    if (!tokenMasihBerlaku(terbitPada, akun.sesiSejak)) return null;
    return { ...sesi, peran: akun.peran };
  } catch {
    // Database tidak terjangkau: perlakukan sebagai belum masuk daripada
    // memberi akses hanya berdasarkan token lama.
    return null;
  }
});

/** Dipakai di halaman admin: memastikan yang membuka benar-benar pemilik. */
export async function wajibPemilik(): Promise<DataSesi> {
  const sesi = await bacaSesi();
  if (!sesi || sesi.peran !== "PEMILIK") {
    throw new Error("TIDAK_BERWENANG");
  }
  return sesi;
}

/** Dipakai di area operasional dapur: boleh dibuka oleh pemilik atau staf dapur. */
export async function wajibStafAtauPemilik(): Promise<DataSesi> {
  const sesi = await bacaSesi();
  if (!sesi || (sesi.peran !== "PEMILIK" && sesi.peran !== "STAF_DAPUR")) {
    throw new Error("TIDAK_BERWENANG");
  }
  return sesi;
}

export function apakahBolehAksesDapur(sesi: DataSesi | null): boolean {
  return Boolean(sesi && (sesi.peran === "PEMILIK" || sesi.peran === "STAF_DAPUR"));
}

/**
 * Penanda "sandi akun ini lemah/bawaan", dipasang saat login (satu-satunya
 * saat server melihat sandi asli) dan dilepas saat sandi diganti. Dashboard
 * memakainya untuk menagih penggantian sandi. httpOnly: tidak terbaca skrip,
 * dan isinya hanya "1" — tidak membocorkan apa pun.
 */
const NAMA_COOKIE_SANDI_LEMAH = "sandi_perlu_diganti";

export async function tandaiSandiLemah(lemah: boolean): Promise<void> {
  const gudangCookie = await cookies();
  if (lemah) {
    gudangCookie.set(NAMA_COOKIE_SANDI_LEMAH, "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: UMUR_SESI_DETIK,
    });
  } else {
    gudangCookie.delete(NAMA_COOKIE_SANDI_LEMAH);
  }
}

export async function sandiDitandaiLemah(): Promise<boolean> {
  const gudangCookie = await cookies();
  return gudangCookie.get(NAMA_COOKIE_SANDI_LEMAH)?.value === "1";
}
