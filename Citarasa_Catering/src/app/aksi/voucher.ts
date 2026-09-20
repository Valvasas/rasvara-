"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { wajibPemilik } from "@/lib/auth";
import { ambilIpKlien, periksaBatasLaju } from "@/lib/pembatas-laju";
import {
  hitungPotongan,
  normalkanKodeVoucher,
  pesanTolak,
} from "@/lib/voucher";
import type { HasilCekVoucher, HasilKelolaVoucher } from "@/lib/voucher-tipe";

/**
 * Memeriksa kode voucher untuk pratinjau di formulir pembeli.
 *
 * Hasilnya hanya untuk ditampilkan — potongan yang benar-benar dipakai tetap
 * dihitung ulang saat pesanan dibuat. Dibatasi lajunya karena endpoint ini bisa
 * dipakai menebak kode voucher secara beruntun.
 */
export async function aksiCekVoucher(
  kodeMentah: string,
  subtotal: number
): Promise<HasilCekVoucher> {
  const ip = await ambilIpKlien();
  const cekLaju = periksaBatasLaju({
    kunci: `cek-voucher:${ip}`,
    maksimal: 15,
    jendelaDetik: 60,
  });
  if (!cekLaju.diizinkan) {
    return {
      berlaku: false,
      pesan: `Terlalu banyak percobaan kode. Coba lagi dalam ${cekLaju.tungguDetik} detik.`,
    };
  }

  const kode = normalkanKodeVoucher(kodeMentah ?? "");
  if (!kode) {
    return { berlaku: false, pesan: "Masukkan kode voucher terlebih dahulu." };
  }

  const aman = Number.isFinite(subtotal) && subtotal >= 0 ? Math.floor(subtotal) : 0;

  const voucher = await db.voucher.findUnique({ where: { kode } });
  if (!voucher) {
    return { berlaku: false, pesan: pesanTolak("TIDAK_DITEMUKAN") };
  }

  const hasil = hitungPotongan(voucher, aman);
  if (!hasil.berlaku) {
    return { berlaku: false, pesan: hasil.pesan };
  }

  return {
    berlaku: true,
    kode: voucher.kode,
    potongan: hasil.potongan,
    deskripsi: voucher.deskripsi,
    pesan: "Voucher berhasil dipakai.",
  };
}

const SkemaVoucher = z.object({
  kode: z
    .string()
    .min(3, "Kode minimal 3 karakter")
    .max(24, "Kode maksimal 24 karakter")
    .regex(/^[A-Za-z0-9-]+$/, "Kode hanya boleh huruf, angka, dan tanda hubung"),
  deskripsi: z.string().max(120).optional(),
  jenis: z.enum(["NOMINAL", "PERSEN"]),
  nilai: z.coerce.number().int().positive("Nilai potongan harus lebih dari 0"),
  maksPotongan: z.coerce.number().int().positive().optional(),
  minBelanja: z.coerce.number().int().min(0).default(0),
  kuota: z.coerce.number().int().positive().optional(),
  berakhirPada: z.string().optional(),
});

export async function aksiBuatVoucher(
  _prevState: HasilKelolaVoucher | null,
  formData: FormData
): Promise<HasilKelolaVoucher> {
  await wajibPemilik();

  const hasil = SkemaVoucher.safeParse({
    kode: formData.get("kode"),
    deskripsi: formData.get("deskripsi") || undefined,
    jenis: formData.get("jenis"),
    nilai: formData.get("nilai"),
    maksPotongan: formData.get("maksPotongan") || undefined,
    minBelanja: formData.get("minBelanja") || 0,
    kuota: formData.get("kuota") || undefined,
    berakhirPada: formData.get("berakhirPada") || undefined,
  });

  if (!hasil.success) {
    const pertama = Object.values(hasil.error.flatten().fieldErrors)[0]?.[0];
    return { sukses: false, pesan: pertama ?? "Periksa kembali isian voucher." };
  }

  const data = hasil.data;

  if (data.jenis === "PERSEN" && data.nilai > 100) {
    return { sukses: false, pesan: "Potongan persen tidak boleh lebih dari 100%." };
  }

  const kode = normalkanKodeVoucher(data.kode);

  const sudahAda = await db.voucher.findUnique({ where: { kode } });
  if (sudahAda) {
    return { sukses: false, pesan: `Kode "${kode}" sudah dipakai voucher lain.` };
  }

  await db.voucher.create({
    data: {
      kode,
      deskripsi: data.deskripsi?.trim() || null,
      jenis: data.jenis,
      nilai: data.nilai,
      maksPotongan: data.jenis === "PERSEN" ? data.maksPotongan ?? null : null,
      minBelanja: data.minBelanja,
      kuota: data.kuota ?? null,
      // Voucher berlaku sampai akhir hari tanggal yang dipilih, bukan sampai
      // tengah malam awal harinya.
      berakhirPada: data.berakhirPada
        ? new Date(`${data.berakhirPada}T23:59:59+07:00`)
        : null,
    },
  });

  revalidatePath("/admin/voucher");
  return { sukses: true, pesan: `Voucher ${kode} dibuat.` };
}

export async function aksiToggleVoucher(
  id: string,
  aktifBaru: boolean
): Promise<HasilKelolaVoucher> {
  await wajibPemilik();

  await db.voucher.update({ where: { id }, data: { aktif: aktifBaru } });

  revalidatePath("/admin/voucher");
  return {
    sukses: true,
    pesan: aktifBaru ? "Voucher diaktifkan." : "Voucher dinonaktifkan.",
  };
}

/**
 * Voucher yang sudah pernah dipakai tidak dihapus, hanya dinonaktifkan —
 * menghapusnya akan memutus rujukan pada pesanan lama (lihat invarian #7 yang
 * berlaku sama untuk menu).
 */
export async function aksiHapusVoucher(id: string): Promise<HasilKelolaVoucher> {
  await wajibPemilik();

  const voucher = await db.voucher.findUnique({
    where: { id },
    select: { terpakai: true, kode: true },
  });
  if (!voucher) {
    return { sukses: false, pesan: "Voucher tidak ditemukan." };
  }

  if (voucher.terpakai > 0) {
    await db.voucher.update({ where: { id }, data: { aktif: false } });
    revalidatePath("/admin/voucher");
    return {
      sukses: true,
      pesan: `Voucher ${voucher.kode} sudah pernah dipakai, jadi dinonaktifkan saja supaya nota lama tetap utuh.`,
    };
  }

  await db.voucher.delete({ where: { id } });
  revalidatePath("/admin/voucher");
  return { sukses: true, pesan: `Voucher ${voucher.kode} dihapus.` };
}
