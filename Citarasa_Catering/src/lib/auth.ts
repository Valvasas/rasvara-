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
 * Peran ikut tertulis di dalam token yang berumur 30 hari. Kalau peran hanya
 * dibaca dari token, staf yang dipecat (akunnya dihapus) atau diturunkan
 * perannya tetap memegang akses dapur sampai tokennya kedaluwarsa. Karena itu
 * peran istimewa selalu dicocokkan ulang ke database — disinggahkan sebentar
 * supaya tiap permintaan tidak menambah satu kueri.
 */
const UMUR_SINGGAHAN_PERAN_MS = 30 * 1000;
const singgahanPeran = new Map<string, { peran: Peran | null; kedaluwarsa: number }>();

async function peranTerkini(id: string): Promise<Peran | null> {
  const tersimpan = singgahanPeran.get(id);
  if (tersimpan && tersimpan.kedaluwarsa > Date.now()) {
    return tersimpan.peran;
  }

  const pengguna = await db.pengguna.findUnique({
    where: { id },
    select: { peran: true },
  });

  const peran = pengguna?.peran ?? null;
  singgahanPeran.set(id, {
    peran,
    kedaluwarsa: Date.now() + UMUR_SINGGAHAN_PERAN_MS,
  });
  return peran;
}

/** Dipanggil saat peran/akun berubah supaya perubahannya langsung berlaku. */
export function lupakanSinggahanPeran(id: string): void {
  singgahanPeran.delete(id);
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

export async function buatSesi(data: DataSesi): Promise<void> {
  const token = await new SignJWT({ ...data })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${UMUR_SESI_DETIK}s`)
    .sign(kunciRahasia());

  const gudangCookie = await cookies();
  gudangCookie.set(NAMA_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: UMUR_SESI_DETIK,
  });
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
  try {
    const { payload } = await jwtVerify(token, kunciRahasia());
    sesi = {
      id: payload.id as string,
      nama: payload.nama as string,
      telepon: payload.telepon as string,
      peran: payload.peran as Peran,
    };
  } catch {
    // Token kedaluwarsa atau tanda tangannya tidak cocok: perlakukan sebagai belum login.
    return null;
  }

  // Pelanggan tidak bisa menyentuh apa pun milik orang lain, jadi tokennya
  // dipercaya apa adanya dan halaman publik tetap bebas kueri tambahan.
  if (sesi.peran !== "PEMILIK" && sesi.peran !== "STAF_DAPUR") {
    return sesi;
  }

  try {
    const peran = await peranTerkini(sesi.id);
    if (!peran) return null; // Akunnya sudah dihapus.
    return { ...sesi, peran };
  } catch {
    // Database tidak terjangkau: tolak akses istimewa daripada memberikannya
    // hanya berdasarkan token lama.
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
