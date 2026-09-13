"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { wajibPemilik, hashSandi, cocokkanSandi } from "@/lib/auth";
import { normalkanTelepon } from "@/lib/format";

export type HasilPengaturan = { error?: string; sukses?: string };

const skema = z.object({
  namaUsaha: z.string().trim().min(2, "Nama usaha belum diisi").max(80),
  tagline: z.string().trim().max(120),
  cerita: z.string().trim().max(2000),
  whatsapp: z
    .string()
    .trim()
    .transform(normalkanTelepon)
    .refine(
      (n) => n === "" || /^62\d{8,14}$/.test(n),
      "Nomor WhatsApp tidak sesuai format Indonesia"
    ),
  alamat: z.string().trim().max(200),
  jamBuka: z.string().regex(/^\d{2}:\d{2}$/, "Jam buka belum diisi"),
  jamTutup: z.string().regex(/^\d{2}:\d{2}$/, "Jam tutup belum diisi"),
  namaBank: z.string().trim().max(40),
  nomorRekening: z.string().trim().max(40),
  namaRekening: z.string().trim().max(80),
  ongkirDefault: z
    .string()
    .transform((t) => Number(t.replace(/[^\d]/g, "")) || 0),
  minOrderAntar: z
    .string()
    .transform((t) => Number(t.replace(/[^\d]/g, "")) || 0),
});

export async function simpanPengaturan(
  _sebelumnya: HasilPengaturan,
  data: FormData
): Promise<HasilPengaturan> {
  await wajibPemilik();

  const hasil = skema.safeParse({
    namaUsaha: data.get("namaUsaha"),
    tagline: data.get("tagline"),
    cerita: data.get("cerita"),
    whatsapp: data.get("whatsapp"),
    alamat: data.get("alamat"),
    jamBuka: data.get("jamBuka"),
    jamTutup: data.get("jamTutup"),
    namaBank: data.get("namaBank"),
    nomorRekening: data.get("nomorRekening"),
    namaRekening: data.get("namaRekening"),
    ongkirDefault: String(data.get("ongkirDefault") ?? "0"),
    minOrderAntar: String(data.get("minOrderAntar") ?? "0"),
  });

  if (!hasil.success) {
    return { error: hasil.error.issues[0].message };
  }

  await db.pengaturan.upsert({
    where: { id: "utama" },
    update: hasil.data,
    create: { id: "utama", ...hasil.data },
  });

  revalidatePath("/", "layout");
  return { sukses: "Pengaturan tersimpan." };
}

const skemaSandi = z
  .object({
    sandiLama: z.string().min(1, "Kata sandi lama belum diisi"),
    sandiBaru: z.string().min(8, "Kata sandi baru minimal 8 karakter").max(100),
    ulangiSandi: z.string(),
  })
  .refine((d) => d.sandiBaru === d.ulangiSandi, {
    message: "Ulangan kata sandi tidak sama.",
  });

export async function gantiSandi(
  _sebelumnya: HasilPengaturan,
  data: FormData
): Promise<HasilPengaturan> {
  const pemilik = await wajibPemilik();

  const hasil = skemaSandi.safeParse({
    sandiLama: data.get("sandiLama"),
    sandiBaru: data.get("sandiBaru"),
    ulangiSandi: data.get("ulangiSandi"),
  });

  if (!hasil.success) {
    return { error: hasil.error.issues[0].message };
  }

  const akun = await db.pengguna.findUnique({ where: { id: pemilik.id } });
  if (!akun) return { error: "Akun tidak ditemukan." };

  const cocok = await cocokkanSandi(hasil.data.sandiLama, akun.sandiHash);
  if (!cocok) return { error: "Kata sandi lama tidak cocok." };

  await db.pengguna.update({
    where: { id: pemilik.id },
    data: { sandiHash: await hashSandi(hasil.data.sandiBaru) },
  });

  return { sukses: "Kata sandi berhasil diganti." };
}
