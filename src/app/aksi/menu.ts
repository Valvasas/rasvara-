"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { wajibPemilik } from "@/lib/auth";

export type HasilMenu = { error?: string; sukses?: string };

const skemaMenu = z.object({
  id: z.string().optional(),
  nama: z.string().trim().min(2, "Nama menu belum diisi").max(80),
  deskripsi: z.string().trim().min(5, "Keterangan menu belum diisi").max(400),
  kategori: z.enum(["SNACK", "NASI_KOTAK", "TUMPENG", "NASI_GORENG"]),
  harga: z
    .string()
    .transform((t) => Number(t.replace(/[^\d]/g, "")))
    .refine((n) => n > 0, "Harga belum diisi")
    .refine((n) => n <= 100_000_000, "Harga terlalu besar"),
  satuan: z.string().trim().min(1, "Satuan belum diisi").max(20),
  minPesan: z
    .string()
    .transform((t) => Number(t.replace(/[^\d]/g, "")) || 1)
    .refine((n) => n >= 1, "Jumlah minimum tidak boleh nol"),
  preorderHari: z
    .string()
    .transform((t) => Number(t.replace(/[^\d]/g, "")) || 0)
    .refine((n) => n <= 30, "Maksimal 30 hari sebelumnya"),
  kapasitasHarian: z.string().transform((t) => {
    const n = Number(t.replace(/[^\d]/g, ""));
    return n > 0 ? n : null;
  }),
});

/** Membuat slug dari nama menu: "Nasi Kotak Ayam" -> "nasi-kotak-ayam" */
function buatSlug(nama: string): string {
  return nama
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function simpanMenu(
  _sebelumnya: HasilMenu,
  data: FormData
): Promise<HasilMenu> {
  await wajibPemilik();

  const hasil = skemaMenu.safeParse({
    id: data.get("id") || undefined,
    nama: data.get("nama"),
    deskripsi: data.get("deskripsi"),
    kategori: data.get("kategori"),
    harga: String(data.get("harga") ?? ""),
    satuan: data.get("satuan"),
    minPesan: String(data.get("minPesan") ?? "1"),
    preorderHari: String(data.get("preorderHari") ?? "0"),
    kapasitasHarian: String(data.get("kapasitasHarian") ?? ""),
  });

  if (!hasil.success) {
    return { error: hasil.error.issues[0].message };
  }

  const { id, ...isi } = hasil.data;

  // Slug harus unik. Kalau nama menu bertabrakan, angka ditambahkan di belakang.
  let slug = buatSlug(isi.nama);
  for (let i = 2; i < 50; i++) {
    const bentrok = await db.menu.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!bentrok || bentrok.id === id) break;
    slug = `${buatSlug(isi.nama)}-${i}`;
  }

  if (id) {
    await db.menu.update({ where: { id }, data: { ...isi, slug } });
  } else {
    const terakhir = await db.menu.findFirst({
      where: { kategori: isi.kategori },
      orderBy: { urutan: "desc" },
      select: { urutan: true },
    });
    await db.menu.create({
      data: { ...isi, slug, urutan: (terakhir?.urutan ?? 0) + 1 },
    });
  }

  segarkan();
  return { sukses: id ? "Menu diperbarui." : "Menu baru ditambahkan." };
}

export async function ubahAktifMenu(
  id: string,
  aktif: boolean
): Promise<HasilMenu> {
  await wajibPemilik();
  await db.menu.update({ where: { id }, data: { aktif } });
  segarkan();
  return {
    sukses: aktif
      ? "Menu ditampilkan kembali di website."
      : "Menu disembunyikan dari website.",
  };
}

export async function hapusMenu(id: string): Promise<HasilMenu> {
  await wajibPemilik();

  const pernahDipesan = await db.itemPesanan.count({ where: { menuId: id } });
  if (pernahDipesan > 0) {
    return {
      error:
        "Menu ini pernah dipesan, jadi tidak bisa dihapus. Sembunyikan saja supaya riwayat pesanan lama tetap utuh.",
    };
  }

  await db.menu.delete({ where: { id } });
  segarkan();
  return { sukses: "Menu dihapus." };
}

function segarkan() {
  revalidatePath("/");
  revalidatePath("/menu");
  revalidatePath("/pesan");
  revalidatePath("/admin/menu");
}
