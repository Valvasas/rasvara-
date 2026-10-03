"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { wajibPemilik } from "@/lib/auth";
import { pesanGalat } from "@/lib/galat";
import type { HasilBahan } from "@/lib/bahan-tipe";

const SkemaBahan = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 huruf").max(60, "Nama terlalu panjang"),
  satuan: z.string().trim().min(1, "Isi satuan").max(15, "Satuan terlalu panjang"),
  hargaPerSatuan: z.coerce
    .number({ message: "Isi harga dalam angka" })
    .int("Harga harus bilangan bulat")
    .min(0, "Harga tidak boleh negatif")
    .max(100_000_000, "Harga terlalu besar"),
});

function segarkan() {
  revalidatePath("/admin/bahan");
  revalidatePath("/admin/produksi");
  revalidatePath("/admin/menu", "layout");
}

/** Tambah bahan, atau ubah bila `id` dikirim. Nama unik tanpa membedakan huruf besar/kecil. */
export async function aksiSimpanBahan(_prev: HasilBahan | null, formData: FormData): Promise<HasilBahan> {
  await wajibPemilik();
  const id = String(formData.get("id") ?? "").trim() || null;
  const v = SkemaBahan.safeParse({
    nama: formData.get("nama") ?? "",
    satuan: formData.get("satuan") ?? "",
    hargaPerSatuan: formData.get("hargaPerSatuan") ?? "",
  });
  if (!v.success) return { sukses: false, pesan: "Periksa isian yang ditandai.", kesalahan: v.error.flatten().fieldErrors };

  const kembar = await db.bahan.findFirst({
    where: { nama: { equals: v.data.nama, mode: "insensitive" }, ...(id ? { id: { not: id } } : {}) },
    select: { id: true },
  });
  if (kembar) return { sukses: false, kesalahan: { nama: ["Bahan dengan nama ini sudah ada"] }, pesan: "Nama bahan sudah dipakai." };

  try {
    if (id) await db.bahan.update({ where: { id }, data: v.data });
    else await db.bahan.create({ data: v.data });
  } catch (err) {
    return { sukses: false, pesan: pesanGalat(err) };
  }
  segarkan();
  return { sukses: true, pesan: id ? "Bahan diperbarui." : "Bahan ditambahkan." };
}

/** Ubah harga saja — dipakai isian cepat di daftar bahan saat harga pasar berubah. */
export async function aksiUbahHargaBahan(id: string, harga: number): Promise<HasilBahan> {
  await wajibPemilik();
  const v = SkemaBahan.shape.hargaPerSatuan.safeParse(harga);
  if (!v.success) return { sukses: false, pesan: v.error.issues[0]?.message };
  const hasil = await db.bahan.updateMany({ where: { id }, data: { hargaPerSatuan: v.data } });
  if (!hasil.count) return { sukses: false, pesan: "Bahan tidak ditemukan." };
  segarkan();
  return { sukses: true };
}

/** Bahan yang dipakai resep tidak dihapus, hanya disembunyikan dari pilihan resep baru. */
export async function aksiToggleBahan(id: string, aktif: boolean): Promise<HasilBahan> {
  await wajibPemilik();
  await db.bahan.updateMany({ where: { id }, data: { aktif } });
  segarkan();
  return { sukses: true };
}

const SkemaResep = z
  .array(
    z.object({
      bahanId: z.string().min(1).max(64),
      jumlahPerPorsi: z.number().positive("Takaran harus lebih dari 0").max(1000, "Takaran terlalu besar"),
    })
  )
  .max(40, "Terlalu banyak bahan dalam satu resep");

/**
 * Mengganti seluruh resep satu menu dalam satu transaksi. Pesanan lama tidak
 * terpengaruh: HPP-nya sudah dibekukan di `ItemPesanan.hppSatuan`.
 */
export async function aksiSimpanResep(menuId: string, baris: { bahanId: string; jumlahPerPorsi: number }[]): Promise<HasilBahan> {
  await wajibPemilik();
  const v = SkemaResep.safeParse(baris);
  if (!v.success) return { sukses: false, pesan: v.error.issues[0]?.message ?? "Resep tidak valid." };
  if (new Set(v.data.map((b) => b.bahanId)).size !== v.data.length) {
    return { sukses: false, pesan: "Ada bahan yang tercantum dua kali." };
  }

  try {
    await db.$transaction(async (tx) => {
      const menu = await tx.menu.findUnique({ where: { id: menuId }, select: { id: true } });
      if (!menu) throw new Error("menu");
      const jumlahBahan = await tx.bahan.count({ where: { id: { in: v.data.map((b) => b.bahanId) } } });
      if (jumlahBahan !== v.data.length) throw new Error("bahan");
      await tx.resepMenu.deleteMany({ where: { menuId } });
      if (v.data.length) await tx.resepMenu.createMany({ data: v.data.map((b) => ({ ...b, menuId })) });
    });
  } catch {
    return { sukses: false, pesan: "Resep gagal disimpan: menu atau bahan sudah tidak ada. Muat ulang halaman." };
  }

  segarkan();
  revalidatePath(`/admin/menu/${menuId}`);
  return { sukses: true, pesan: "Resep disimpan." };
}
