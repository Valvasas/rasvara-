"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { wajibPemilik } from "@/lib/auth";
import { dariInputTanggal, hariIniWib } from "@/lib/format";
import type { JenisKas } from "@/generated/prisma/client";

const SkemaKas = z.object({
  jenis: z.enum(["MASUK", "KELUAR"]),
  kategori: z.string().min(1, "Pilih kategori kas"),
  jumlah: z.number().int().positive("Jumlah harus lebih dari 0"),
  keterangan: z.string().min(2, "Keterangan wajib diisi"),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid"),
});

export type HasilAksiKas = {
  sukses: boolean;
  pesan?: string;
  kesalahan?: Record<string, string[]>;
};

export async function aksiTambahKas(
  _prevState: HasilAksiKas | null,
  formData: FormData
): Promise<HasilAksiKas> {
  const sesi = await wajibPemilik();

  const raw = {
    jenis: formData.get("jenis"),
    kategori: formData.get("kategori"),
    jumlah: Number(formData.get("jumlah")),
    keterangan: formData.get("keterangan"),
    tanggal: formData.get("tanggal") || hariIniWib(),
  };

  const parsed = SkemaKas.safeParse(raw);
  if (!parsed.success) {
    return {
      sukses: false,
      kesalahan: parsed.error.flatten().fieldErrors,
      pesan: "Mohon periksa kembali isian catatan kas.",
    };
  }

  const data = parsed.data;

  await db.catatanKas.create({
    data: {
      dicatatOlehId: sesi.id,
      jenis: data.jenis as JenisKas,
      sumber: "MANUAL",
      kategori: data.kategori,
      jumlah: data.jumlah,
      keterangan: data.keterangan.trim(),
      tanggal: dariInputTanggal(data.tanggal),
    },
  });

  revalidatePath("/admin/keuangan");
  revalidatePath("/admin/laporan");
  return { sukses: true, pesan: "Catatan kas berhasil ditambahkan." };
}

