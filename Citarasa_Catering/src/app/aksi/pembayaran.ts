"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { wajibPemilik } from "@/lib/auth";
import { pesanGalat } from "@/lib/galat";
import { catatPembayaran } from "@/lib/pembayaran-server";
import { periksaBatasLaju } from "@/lib/pembatas-laju";

const SkemaBayar = z.object({
  kode: z.string().trim().min(5).max(40),
  jumlah: z.number().int().positive("Jumlah harus lebih dari 0").max(10_000_000_000),
  metode: z.enum(["TRANSFER", "TUNAI"]),
  catatan: z.string().max(200).optional(),
});

function segarkan(kode: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/pesanan");
  revalidatePath(`/admin/pesanan/${kode}`);
  revalidatePath(`/pesanan/${kode}`);
  revalidatePath("/admin/keuangan");
  revalidatePath("/admin/laporan");
}

/** Catat DP / cicilan / pelunasan. Jenisnya ditentukan dari jumlah terhadap sisa. */
export async function aksiCatatPembayaran(masukan: {
  kode: string;
  jumlah: number;
  metode: "TRANSFER" | "TUNAI";
  catatan?: string;
}): Promise<{ sukses: boolean; pesan?: string }> {
  const sesi = await wajibPemilik();
  const laju = periksaBatasLaju({ kunci: `bayar:${sesi.id}`, maksimal: 30, jendelaDetik: 60 });
  if (!laju.diizinkan) return { sukses: false, pesan: "Terlalu banyak permintaan. Tunggu sebentar." };

  const v = SkemaBayar.safeParse(masukan);
  if (!v.success) return { sukses: false, pesan: v.error.issues[0]?.message ?? "Isian tidak valid." };

  try {
    const hasil = await catatPembayaran({ ...v.data, olehId: sesi.id });
    segarkan(v.data.kode);
    return {
      sukses: true,
      pesan: hasil.jenis === "PELUNASAN" ? "Lunas. Uang tercatat di Buku Kas." : "DP tercatat di Buku Kas.",
    };
  } catch (err) {
    return { sukses: false, pesan: pesanGalat(err) };
  }
}

/** Pengembalian dana (mis. pesanan lunas yang dibatalkan). Tercatat sebagai kas keluar. */
export async function aksiCatatRefund(masukan: {
  kode: string;
  jumlah: number;
  metode: "TRANSFER" | "TUNAI";
  catatan?: string;
}): Promise<{ sukses: boolean; pesan?: string }> {
  const sesi = await wajibPemilik();
  const v = SkemaBayar.safeParse(masukan);
  if (!v.success) return { sukses: false, pesan: v.error.issues[0]?.message ?? "Isian tidak valid." };
  try {
    await catatPembayaran({ ...v.data, refund: true, olehId: sesi.id });
    segarkan(v.data.kode);
    return { sukses: true, pesan: "Pengembalian dana tercatat sebagai pengeluaran." };
  } catch (err) {
    return { sukses: false, pesan: pesanGalat(err) };
  }
}
