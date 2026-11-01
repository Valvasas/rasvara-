"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  awalSesiBaru,
  bacaSesi,
  buatSesi,
  cocokkanSandi,
  hapusSesi,
  hashSandi,
  lupakanSinggahanPeran,
} from "@/lib/auth";
import { normalkanTelepon } from "@/lib/format";
import { klaimPesananTamu } from "@/lib/akses-pesanan";
import { tujuanAman } from "@/lib/kepemilikan";
import {
  ambilIpKlien,
  periksaBatasLaju,
  resetBatasLaju,
} from "@/lib/pembatas-laju";

// Akun lama mungkin bersandi 6 karakter (aturan sebelumnya), jadi saat masuk
// cukup dipastikan tidak kosong; aturan panjang hanya berlaku saat membuat sandi.
const SkemaMasuk = z.object({
  telepon: z.string().min(8, "Nomor HP minimal 8 digit").max(20, "Nomor HP terlalu panjang"),
  sandi: z.string().min(1, "Isi kata sandi").max(128, "Kata sandi terlalu panjang"),
});

const SkemaDaftar = z
  .object({
    nama: z.string().trim().min(2, "Nama minimal 2 karakter").max(100, "Nama terlalu panjang"),
    telepon: z.string().min(8, "Nomor HP minimal 8 digit").max(20, "Nomor HP terlalu panjang"),
    sandi: z
      .string()
      .min(8, "Kata sandi minimal 8 karakter")
      .max(128, "Kata sandi terlalu panjang")
      .regex(/\d/, "Kata sandi perlu memuat minimal satu angka"),
    alamat: z.string().max(500, "Alamat terlalu panjang").optional(),
  })
  // Nomor HP adalah tebakan pertama siapa pun yang mencoba masuk ke akun orang
  // lain — dan nomornya justru tertulis di formulir masuk.
  .refine((d) => normalkanTelepon(d.sandi.replace(/\D/g, "")) !== normalkanTelepon(d.telepon), {
    path: ["sandi"],
    message: "Kata sandi tidak boleh sama dengan nomor HP",
  });

/**
 * Hash tiruan berukuran sama dengan hash asli. Saat nomor tidak terdaftar,
 * sandi tetap "dicocokkan" ke hash ini supaya waktu balasannya sama dengan
 * nomor yang terdaftar. Tanpa ini, penyerang cukup mengukur lama balasan
 * (tanpa scrypt ≈ 5 ms, dengan scrypt ≈ 60 ms) untuk mengetahui nomor mana
 * yang punya akun — walau pesan galatnya sudah dibuat seragam.
 */
const HASH_TIRUAN = `${"0".repeat(32)}:${"0".repeat(128)}`;

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
  const cekLaju = await periksaBatasLaju({
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
  const cekAkun = await periksaBatasLaju({
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

  const cocok = await cocokkanSandi(parsed.data.sandi, pengguna?.sandiHash ?? HASH_TIRUAN);
  if (!pengguna || !cocok) {
    return {
      sukses: false,
      pesan: "Nomor telepon atau kata sandi tidak cocok.",
    };
  }

  await resetBatasLaju(kunciAkun);

  await buatSesi({
    id: pengguna.id,
    nama: pengguna.nama,
    telepon: pengguna.telepon,
    peran: pengguna.peran,
  });

  const ke = formData.get("ke");
  if (pengguna.peran === "PEMILIK" || pengguna.peran === "STAF_DAPUR") {
    redirect(tujuanAman(ke, "/admin"));
  }

  // Pesanan yang dibuat sebagai tamu dari perangkat ini ikut masuk ke akun,
  // sehingga muncul di "Pesanan saya" tanpa perlu dilacak satu per satu.
  await klaimPesananTamu(pengguna);
  redirect(tujuanAman(ke, "/riwayat"));
}

export async function aksiDaftar(
  _prevState: HasilAuth | null,
  formData: FormData
): Promise<HasilAuth> {
  const ip = await ambilIpKlien();
  const cekLaju = await periksaBatasLaju({
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

  await klaimPesananTamu(penggunaBaru);
  redirect(tujuanAman(formData.get("ke"), "/riwayat"));
}

export async function aksiKeluar(): Promise<void> {
  await hapusSesi();
  redirect("/masuk");
}


const SkemaGantiSandi = z
  .object({
    sandiLama: z.string().min(1, "Isi kata sandi saat ini"),
    sandiBaru: z
      .string()
      .min(8, "Kata sandi baru minimal 8 karakter")
      .max(128, "Kata sandi terlalu panjang")
      .regex(/\d/, "Kata sandi baru perlu memuat minimal satu angka"),
    ulangiSandi: z.string(),
  })
  .refine((d) => d.sandiBaru === d.ulangiSandi, {
    message: "Pengulangan kata sandi tidak sama",
    path: ["ulangiSandi"],
  })
  .refine((d) => d.sandiBaru !== d.sandiLama, {
    message: "Kata sandi baru harus berbeda dari yang lama",
    path: ["sandiBaru"],
  });

/**
 * Ganti sandi untuk akun yang sedang login (pemilik, staf, maupun pelanggan).
 *
 * Setelah berhasil, `sesiSejak` dimajukan sehingga sesi pemilik/staf di
 * perangkat lain langsung tidak berlaku — penting kalau sandi diganti karena
 * dicurigai bocor. Perangkat yang sedang dipakai mendapat token baru agar
 * tidak ikut terlempar keluar.
 */
export async function aksiGantiSandi(
  _prevState: HasilAuth | null,
  formData: FormData
): Promise<HasilAuth> {
  const sesi = await bacaSesi();
  if (!sesi) {
    return { sukses: false, pesan: "Sesi Anda sudah berakhir. Silakan masuk lagi." };
  }

  const cekLaju = await periksaBatasLaju({
    kunci: `ganti-sandi:${sesi.id}`,
    maksimal: 5,
    jendelaDetik: 15 * 60,
  });
  if (!cekLaju.diizinkan) {
    return {
      sukses: false,
      pesan: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(
        cekLaju.tungguDetik / 60
      )} menit.`,
    };
  }

  const parsed = SkemaGantiSandi.safeParse({
    sandiLama: formData.get("sandiLama") ?? "",
    sandiBaru: formData.get("sandiBaru") ?? "",
    ulangiSandi: formData.get("ulangiSandi") ?? "",
  });
  if (!parsed.success) {
    return {
      sukses: false,
      kesalahan: parsed.error.flatten().fieldErrors,
      pesan: "Periksa kembali isian Anda.",
    };
  }

  const pengguna = await db.pengguna.findUnique({ where: { id: sesi.id } });
  if (!pengguna) {
    return { sukses: false, pesan: "Akun tidak ditemukan." };
  }

  const cocok = await cocokkanSandi(parsed.data.sandiLama, pengguna.sandiHash);
  if (!cocok) {
    return {
      sukses: false,
      kesalahan: { sandiLama: ["Kata sandi saat ini salah"] },
      pesan: "Kata sandi saat ini salah.",
    };
  }

  await db.pengguna.update({
    where: { id: pengguna.id },
    data: {
      sandiHash: await hashSandi(parsed.data.sandiBaru),
      sesiSejak: awalSesiBaru(),
    },
  });
  lupakanSinggahanPeran(pengguna.id);

  await buatSesi({
    id: pengguna.id,
    nama: pengguna.nama,
    telepon: pengguna.telepon,
    peran: pengguna.peran,
  });

  return { sukses: true, pesan: "Kata sandi berhasil diganti." };
}

const SkemaProfil = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 karakter").max(100, "Nama terlalu panjang"),
  alamat: z.string().trim().max(500, "Alamat terlalu panjang"),
});

/**
 * Ubah nama & alamat antar bawaan. Nomor HP sengaja tidak bisa diubah di sini:
 * nomor adalah identitas login, dan menggantinya tanpa verifikasi OTP sama
 * dengan membiarkan akun dipindah ke nomor siapa saja.
 */
export async function aksiUbahProfil(
  _prevState: HasilAuth | null,
  formData: FormData
): Promise<HasilAuth> {
  const sesi = await bacaSesi();
  if (!sesi) {
    return { sukses: false, pesan: "Sesi Anda sudah berakhir. Silakan masuk lagi." };
  }

  const cekLaju = await periksaBatasLaju({ kunci: `profil:${sesi.id}`, maksimal: 10, jendelaDetik: 5 * 60 });
  if (!cekLaju.diizinkan) {
    return { sukses: false, pesan: `Terlalu sering. Coba lagi dalam ${cekLaju.tungguDetik} detik.` };
  }

  const parsed = SkemaProfil.safeParse({
    nama: formData.get("nama") ?? "",
    alamat: formData.get("alamat") ?? "",
  });
  if (!parsed.success) {
    return { sukses: false, kesalahan: parsed.error.flatten().fieldErrors, pesan: "Periksa kembali isian Anda." };
  }

  const pengguna = await db.pengguna.update({
    where: { id: sesi.id },
    data: { nama: parsed.data.nama, alamat: parsed.data.alamat || null },
    select: { id: true, nama: true, telepon: true, peran: true },
  });

  // Nama ikut tertulis di token sesi (dipakai kepala halaman), jadi tokennya
  // diterbitkan ulang supaya nama baru langsung tampil.
  await buatSesi(pengguna);
  revalidatePath("/akun");
  return { sukses: true, pesan: "Profil tersimpan." };
}
