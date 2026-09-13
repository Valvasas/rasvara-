"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { buatSesi, cocokkanSandi, hapusSesi, hashSandi } from "@/lib/auth";
import { normalkanTelepon } from "@/lib/format";

export type HasilForm = { error?: string; sukses?: string };

const teleponSkema = z
  .string()
  .trim()
  .min(9, "Nomor HP terlalu pendek")
  .max(20, "Nomor HP terlalu panjang")
  .transform(normalkanTelepon)
  .refine((n) => /^62\d{8,14}$/.test(n), "Nomor HP tidak sesuai format Indonesia");

const skemaMasuk = z.object({
  telepon: teleponSkema,
  sandi: z.string().min(1, "Kata sandi belum diisi"),
});

const skemaDaftar = z.object({
  nama: z.string().trim().min(2, "Nama terlalu pendek").max(80, "Nama terlalu panjang"),
  telepon: teleponSkema,
  sandi: z
    .string()
    .min(8, "Kata sandi minimal 8 karakter")
    .max(100, "Kata sandi terlalu panjang"),
});

export async function masuk(
  _sebelumnya: HasilForm,
  data: FormData
): Promise<HasilForm> {
  const hasil = skemaMasuk.safeParse({
    telepon: data.get("telepon"),
    sandi: data.get("sandi"),
  });

  if (!hasil.success) {
    return { error: hasil.error.issues[0].message };
  }

  const pengguna = await db.pengguna.findUnique({
    where: { telepon: hasil.data.telepon },
  });

  // Pesan kesalahan sengaja disamakan untuk nomor tidak terdaftar dan sandi salah,
  // supaya tidak bisa dipakai menebak nomor mana yang punya akun.
  const pesanGagal = "Nomor HP atau kata sandi salah.";
  if (!pengguna) return { error: pesanGagal };

  const cocok = await cocokkanSandi(hasil.data.sandi, pengguna.sandiHash);
  if (!cocok) return { error: pesanGagal };

  await buatSesi({
    id: pengguna.id,
    nama: pengguna.nama,
    telepon: pengguna.telepon,
    peran: pengguna.peran,
  });

  redirect(pengguna.peran === "PEMILIK" ? "/admin" : "/riwayat");
}

export async function daftar(
  _sebelumnya: HasilForm,
  data: FormData
): Promise<HasilForm> {
  const hasil = skemaDaftar.safeParse({
    nama: data.get("nama"),
    telepon: data.get("telepon"),
    sandi: data.get("sandi"),
  });

  if (!hasil.success) {
    return { error: hasil.error.issues[0].message };
  }

  const sudahAda = await db.pengguna.findUnique({
    where: { telepon: hasil.data.telepon },
  });

  if (sudahAda) {
    return {
      error: "Nomor HP ini sudah terdaftar. Silakan masuk memakai kata sandi Anda.",
    };
  }

  const pengguna = await db.pengguna.create({
    data: {
      nama: hasil.data.nama,
      telepon: hasil.data.telepon,
      sandiHash: await hashSandi(hasil.data.sandi),
      peran: "PELANGGAN",
    },
  });

  await buatSesi({
    id: pengguna.id,
    nama: pengguna.nama,
    telepon: pengguna.telepon,
    peran: pengguna.peran,
  });

  redirect("/riwayat");
}

export async function keluar(): Promise<void> {
  await hapusSesi();
  redirect("/");
}
