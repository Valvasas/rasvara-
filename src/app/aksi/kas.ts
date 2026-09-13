"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { wajibPemilik } from "@/lib/auth";
import { dariInputTanggal } from "@/lib/format";

export type HasilKas = { error?: string; sukses?: string };

const skemaKas = z.object({
  jenis: z.enum(["MASUK", "KELUAR"]),
  kategori: z.string().trim().min(1, "Kategori belum dipilih").max(50),
  keterangan: z.string().trim().min(1, "Keterangan belum diisi").max(200),
  // Pemilik terbiasa mengetik "150.000", jadi titik dan spasi dibersihkan dulu
  // sebelum diubah menjadi angka.
  jumlah: z
    .string()
    .transform((t) => Number(t.replace(/[^\d]/g, "")))
    .refine((n) => Number.isFinite(n) && n > 0, "Jumlah uang belum diisi")
    .refine((n) => n <= 2_000_000_000, "Jumlah uang terlalu besar"),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal belum dipilih"),
});

export async function catatKas(
  _sebelumnya: HasilKas,
  data: FormData
): Promise<HasilKas> {
  const pemilik = await wajibPemilik();

  const hasil = skemaKas.safeParse({
    jenis: data.get("jenis"),
    kategori: data.get("kategori"),
    keterangan: data.get("keterangan"),
    jumlah: String(data.get("jumlah") ?? ""),
    tanggal: data.get("tanggal"),
  });

  if (!hasil.success) {
    return { error: hasil.error.issues[0].message };
  }

  await db.catatanKas.create({
    data: {
      jenis: hasil.data.jenis,
      sumber: "MANUAL",
      kategori: hasil.data.kategori,
      keterangan: hasil.data.keterangan,
      jumlah: hasil.data.jumlah,
      tanggal: dariInputTanggal(hasil.data.tanggal),
      dicatatOlehId: pemilik.id,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/keuangan");
  revalidatePath("/admin/laporan");

  return {
    sukses:
      hasil.data.jenis === "MASUK"
        ? "Uang masuk sudah dicatat."
        : "Pengeluaran sudah dicatat.",
  };
}

export async function hapusKas(id: string): Promise<HasilKas> {
  await wajibPemilik();

  const catatan = await db.catatanKas.findUnique({ where: { id } });
  if (!catatan) return { error: "Catatan tidak ditemukan." };

  // Pemasukan yang lahir dari pesanan tidak boleh dihapus lepas dari pesanannya,
  // supaya angka di buku kas selalu bisa ditelusuri balik ke nota aslinya.
  if (catatan.sumber === "PESANAN") {
    return {
      error:
        "Catatan ini berasal dari pesanan. Ubah status pembayaran pesanannya kalau memang keliru.",
    };
  }

  await db.catatanKas.delete({ where: { id } });

  revalidatePath("/admin");
  revalidatePath("/admin/keuangan");
  revalidatePath("/admin/laporan");
  return { sukses: "Catatan dihapus." };
}
