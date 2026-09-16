"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  buatSesi,
  cocokkanSandi,
  hapusSesi,
  hashSandi,
} from "@/lib/auth";
import { normalkanTelepon } from "@/lib/format";
import {
  ambilIpKlien,
  periksaBatasLaju,
  resetBatasLaju,
} from "@/lib/pembatas-laju";

const SkemaMasuk = z.object({
  telepon: z.string().min(8, "Nomor telepon minimal 8 digit"),
  sandi: z.string().min(6, "Kata sandi minimal 6 karakter"),
});

const SkemaDaftar = z.object({
  nama: z.string().min(2, "Nama minimal 2 karakter"),
  telepon: z.string().min(8, "Nomor telepon minimal 8 digit"),
  sandi: z.string().min(6, "Kata sandi minimal 6 karakter"),
  alamat: z.string().optional(),
});

export type HasilAuth = {
  sukses: boolean;
  pesan?: string;
  kesalahan?: Record<string, string[]>;
};

export async function aksiMasuk(
  _prevState: HasilAuth | null,
  formData: FormData
): Promise<HasilAuth> {
  const ip = await ambilIpKlien();
  const cekLaju = periksaBatasLaju({
    kunci: `masuk:${ip}`,
    maksimal: 5,
    jendelaDetik: 60,
  });

  if (!cekLaju.diizinkan) {
    return {
      sukses: false,
      pesan: `Terlalu banyak percobaan masuk. Coba lagi dalam ${cekLaju.tungguDetik} detik.`,
    };
  }

  const raw = {
    telepon: formData.get("telepon"),
    sandi: formData.get("sandi"),
  };

  const parsed = SkemaMasuk.safeParse(raw);
  if (!parsed.success) {
    return {
      sukses: false,
      kesalahan: parsed.error.flatten().fieldErrors,
      pesan: "Periksa kembali input Anda.",
    };
  }

  const nomorNorm = normalkanTelepon(parsed.data.telepon);

  // Batas per-IP saja tidak melindungi satu akun tertentu: penyerang dengan
  // beberapa alamat IP tetap bisa menggilir tebakan ke nomor yang sama. Batas
  // kedua ini mengikat ke akunnya, dan dilepas begitu login berhasil.
  const kunciAkun = `masuk-akun:${nomorNorm}`;
  const cekAkun = periksaBatasLaju({
    kunci: kunciAkun,
    maksimal: 10,
    jendelaDetik: 15 * 60,
  });

  if (!cekAkun.diizinkan) {
    return {
      sukses: false,
      pesan: `Terlalu banyak percobaan masuk untuk nomor ini. Coba lagi dalam ${Math.ceil(
        cekAkun.tungguDetik / 60
      )} menit.`,
    };
  }

  const pengguna = await db.pengguna.findUnique({
    where: { telepon: nomorNorm },
  });

  if (!pengguna) {
    return {
      sukses: false,
      pesan: "Nomor telepon atau kata sandi tidak cocok.",
    };
  }

  const cocok = await cocokkanSandi(parsed.data.sandi, pengguna.sandiHash);
  if (!cocok) {
    return {
      sukses: false,
      pesan: "Nomor telepon atau kata sandi tidak cocok.",
    };
  }

  resetBatasLaju(kunciAkun);

  await buatSesi({
    id: pengguna.id,
    nama: pengguna.nama,
    telepon: pengguna.telepon,
    peran: pengguna.peran,
  });

  if (pengguna.peran === "PEMILIK" || pengguna.peran === "STAF_DAPUR") {
    redirect("/admin");
  } else {
    redirect("/riwayat");
  }
}

export async function aksiDaftar(
  _prevState: HasilAuth | null,
  formData: FormData
): Promise<HasilAuth> {
  const ip = await ambilIpKlien();
  const cekLaju = periksaBatasLaju({
    kunci: `daftar:${ip}`,
    maksimal: 5,
    jendelaDetik: 120,
  });

  if (!cekLaju.diizinkan) {
    return {
      sukses: false,
      pesan: `Terlalu banyak percobaan pendaftaran. Coba lagi dalam ${cekLaju.tungguDetik} detik.`,
    };
  }

  const raw = {
    nama: formData.get("nama"),
    telepon: formData.get("telepon"),
    sandi: formData.get("sandi"),
    alamat: formData.get("alamat") || undefined,
  };

  const parsed = SkemaDaftar.safeParse(raw);
  if (!parsed.success) {
    return {
      sukses: false,
      kesalahan: parsed.error.flatten().fieldErrors,
      pesan: "Mohon lengkapi formulir pendaftaran.",
    };
  }

  const nomorNorm = normalkanTelepon(parsed.data.telepon);
  const sudahAda = await db.pengguna.findUnique({
    where: { telepon: nomorNorm },
  });

  if (sudahAda) {
    return {
      sukses: false,
      pesan: "Nomor telepon ini sudah terdaftar. Silakan langsung masuk.",
    };
  }

  const sandiHash = await hashSandi(parsed.data.sandi);

  // Pemeriksaan di atas bisa dilewati dua pendaftaran yang tiba bersamaan;
  // yang kalah ditolak oleh batasan unik di database, dan itu harus tampil
  // sebagai pesan biasa, bukan halaman galat.
  let penggunaBaru;
  try {
    penggunaBaru = await db.pengguna.create({
      data: {
        nama: parsed.data.nama.trim(),
        telepon: nomorNorm,
        sandiHash,
        alamat: parsed.data.alamat?.trim() || null,
        peran: "PELANGGAN",
      },
    });
  } catch {
    return {
      sukses: false,
      pesan: "Nomor telepon ini sudah terdaftar. Silakan langsung masuk.",
    };
  }

  await buatSesi({
    id: penggunaBaru.id,
    nama: penggunaBaru.nama,
    telepon: penggunaBaru.telepon,
    peran: penggunaBaru.peran,
  });

  redirect("/riwayat");
}

export async function aksiKeluar(): Promise<void> {
  await hapusSesi();
  redirect("/masuk");
}

