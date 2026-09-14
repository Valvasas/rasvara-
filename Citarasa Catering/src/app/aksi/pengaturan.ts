"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { wajibPemilik } from "@/lib/auth";
import { normalkanTelepon } from "@/lib/format";

const SkemaPengaturan = z.object({
  namaUsaha: z.string().min(2, "Nama usaha minimal 2 karakter"),
  tagline: z.string().optional(),
  cerita: z.string().optional(),
  whatsapp: z.string().optional(),
  alamat: z.string().optional(),
  jamBuka: z.string().regex(/^\d{2}:\d{2}$/, "Format jam buka tidak valid"),
  jamTutup: z.string().regex(/^\d{2}:\d{2}$/, "Format jam tutup tidak valid"),
  namaBank: z.string().optional(),
  nomorRekening: z.string().optional(),
  namaRekening: z.string().optional(),
  ongkirDefault: z.number().int().min(0),
  minOrderAntar: z.number().int().min(0),
});

export type HasilPengaturan = {
  sukses: boolean;
  pesan?: string;
  kesalahan?: Record<string, string[]>;
};

export async function aksiSimpanPengaturan(
  _prevState: HasilPengaturan | null,
  formData: FormData
): Promise<HasilPengaturan> {
  await wajibPemilik();

  const raw = {
    namaUsaha: formData.get("namaUsaha"),
    tagline: formData.get("tagline") || undefined,
    cerita: formData.get("cerita") || undefined,
    whatsapp: formData.get("whatsapp") ? normalkanTelepon(formData.get("whatsapp") as string) : undefined,
    alamat: formData.get("alamat") || undefined,
    jamBuka: formData.get("jamBuka"),
    jamTutup: formData.get("jamTutup"),
    namaBank: formData.get("namaBank") || undefined,
    nomorRekening: formData.get("nomorRekening") || undefined,
    namaRekening: formData.get("namaRekening") || undefined,
    ongkirDefault: Number(formData.get("ongkirDefault") || 0),
    minOrderAntar: Number(formData.get("minOrderAntar") || 0),
  };

  const parsed = SkemaPengaturan.safeParse(raw);
  if (!parsed.success) {
    return {
      sukses: false,
      kesalahan: parsed.error.flatten().fieldErrors,
      pesan: "Mohon periksa kembali isian pengaturan.",
    };
  }

  const d = parsed.data;

  await db.pengaturan.upsert({
    where: { id: "utama" },
    create: {
      id: "utama",
      namaUsaha: d.namaUsaha.trim(),
      tagline: d.tagline?.trim() || "",
      cerita: d.cerita?.trim() || "",
      whatsapp: d.whatsapp?.trim() || "",
      alamat: d.alamat?.trim() || "",
      jamBuka: d.jamBuka,
      jamTutup: d.jamTutup,
      namaBank: d.namaBank?.trim() || "",
      nomorRekening: d.nomorRekening?.trim() || "",
      namaRekening: d.namaRekening?.trim() || "",
      ongkirDefault: d.ongkirDefault,
      minOrderAntar: d.minOrderAntar,
    },
    update: {
      namaUsaha: d.namaUsaha.trim(),
      tagline: d.tagline?.trim() || "",
      cerita: d.cerita?.trim() || "",
      whatsapp: d.whatsapp?.trim() || "",
      alamat: d.alamat?.trim() || "",
      jamBuka: d.jamBuka,
      jamTutup: d.jamTutup,
      namaBank: d.namaBank?.trim() || "",
      nomorRekening: d.nomorRekening?.trim() || "",
      namaRekening: d.namaRekening?.trim() || "",
      ongkirDefault: d.ongkirDefault,
      minOrderAntar: d.minOrderAntar,
    },
  });

  revalidatePath("/");
  revalidatePath("/menu");
  revalidatePath("/pesan");
  revalidatePath("/admin/pengaturan");
  return { sukses: true, pesan: "Pengaturan berhasil disimpan." };
}

