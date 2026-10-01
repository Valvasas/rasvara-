"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashSandi, lupakanSinggahanPeran, wajibPemilik } from "@/lib/auth";
import { normalkanTelepon } from "@/lib/format";
import { ambilIpKlien, periksaBatasLaju } from "@/lib/pembatas-laju";

const SkemaStaf = z.object({
  nama: z.string().trim().min(2, "Nama staf minimal 2 karakter").max(80, "Nama terlalu panjang"),
  telepon: z.string().min(8, "Nomor HP minimal 8 digit").max(20, "Nomor HP terlalu panjang"),
  sandi: z.string().min(8, "Kata sandi minimal 8 karakter").max(128, "Kata sandi terlalu panjang"),
});

export type HasilAksiStaf = {
  sukses: boolean;
  pesan?: string;
  kesalahan?: Record<string, string[]>;
};

export async function aksiTambahStaf(
  _prevState: HasilAksiStaf | null,
  formData: FormData
): Promise<HasilAksiStaf> {
  await wajibPemilik();

  const ip = await ambilIpKlien();
  const cekLaju = periksaBatasLaju({
    kunci: `staf-tambah:${ip}`,
    maksimal: 5,
    jendelaDetik: 60,
  });

  if (!cekLaju.diizinkan) {
    return {
      sukses: false,
      pesan: `Terlalu banyak permintaan pendaftaran staf. Harap tunggu ${cekLaju.tungguDetik} detik.`,
    };
  }

  const raw = {
    nama: formData.get("nama"),
    telepon: formData.get("telepon"),
    sandi: formData.get("sandi"),
  };

  const validasi = SkemaStaf.safeParse(raw);
  if (!validasi.success) {
    return {
      sukses: false,
      kesalahan: validasi.error.flatten().fieldErrors,
      pesan: "Periksa kembali isian formulir staf.",
    };
  }

  const { nama, telepon, sandi } = validasi.data;
  const nomorNorm = normalkanTelepon(telepon);

  const sudahAda = await db.pengguna.findUnique({
    where: { telepon: nomorNorm },
  });

  if (sudahAda) {
    return {
      sukses: false,
      pesan: "Nomor telepon ini sudah terdaftar di sistem.",
    };
  }

  const sandiHash = await hashSandi(sandi);

  await db.pengguna.create({
    data: {
      nama: nama.trim(),
      telepon: nomorNorm,
      sandiHash,
      peran: "STAF_DAPUR",
    },
  });

  revalidatePath("/admin/pengaturan");
  return {
    sukses: true,
    pesan: `Akun staf dapur "${nama}" berhasil didaftarkan.`,
  };
}

export async function aksiHapusStaf(
  id: string
): Promise<{ sukses: boolean; pesan?: string }> {
  await wajibPemilik();

  const ip = await ambilIpKlien();
  const cekLaju = periksaBatasLaju({
    kunci: `staf-hapus:${ip}`,
    maksimal: 5,
    jendelaDetik: 60,
  });

  if (!cekLaju.diizinkan) {
    return {
      sukses: false,
      pesan: `Terlalu banyak permintaan. Harap tunggu ${cekLaju.tungguDetik} detik.`,
    };
  }

  const target = await db.pengguna.findUnique({
    where: { id },
  });

  if (!target) {
    return { sukses: false, pesan: "Pengguna tidak ditemukan." };
  }

  if (target.peran !== "STAF_DAPUR") {
    return {
      sukses: false,
      pesan: "Hanya akun staf dapur yang dapat dihapus dari halaman ini.",
    };
  }

  await db.pengguna.delete({
    where: { id },
  });
  lupakanSinggahanPeran(id);

  revalidatePath("/admin/pengaturan");
  return { sukses: true };
}

