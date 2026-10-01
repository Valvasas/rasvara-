"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { wajibPemilik } from "@/lib/auth";
import { dariInputTanggal, hariIniWib } from "@/lib/format";
import { ambilIpKlien, periksaBatasLaju } from "@/lib/pembatas-laju";
import type { JenisKas } from "@/generated/prisma/client";

const SkemaKas = z.object({
  jenis: z.enum(["MASUK", "KELUAR"]),
  kategori: z.string().trim().min(1, "Pilih kategori").max(50, "Kategori terlalu panjang"),
  jumlah: z
    .number({ message: "Isi jumlah dalam angka" })
    .int("Jumlah harus bilangan bulat")
    .positive("Jumlah harus lebih dari 0")
    .max(10_000_000_000, "Jumlah terlalu besar"),
  keterangan: z.string().trim().min(2, "Keterangan wajib diisi").max(200, "Keterangan terlalu panjang"),
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

  const ip = await ambilIpKlien();
  const cekLaju = periksaBatasLaju({
    kunci: `kas:${sesi.id}:${ip}`,
    maksimal: 10,
    jendelaDetik: 60,
  });

  if (!cekLaju.diizinkan) {
    return {
      sukses: false,
      pesan: `Terlalu banyak permintaan pencatatan kas. Harap tunggu ${cekLaju.tungguDetik} detik.`,
    };
  }

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


/**
 * Menghapus catatan kas MANUAL yang salah ketik.
 *
 * Catatan yang lahir dari pelunasan pesanan sengaja tidak bisa dihapus di sini:
 * ia terikat ke pesanannya (invarian #3), dan menghapusnya diam-diam membuat
 * pesanan berstatus lunas tanpa jejak uangnya di buku.
 */
export async function aksiHapusKas(id: string): Promise<HasilAksiKas> {
  await wajibPemilik();

  const hasil = await db.catatanKas.deleteMany({ where: { id, sumber: "MANUAL" } });
  if (hasil.count === 0) {
    return {
      sukses: false,
      pesan: "Catatan ini tidak bisa dihapus. Catatan dari pelunasan pesanan terkunci ke pesanannya.",
    };
  }

  revalidatePath("/admin/keuangan");
  revalidatePath("/admin/laporan");
  return { sukses: true, pesan: "Catatan dihapus." };
}
