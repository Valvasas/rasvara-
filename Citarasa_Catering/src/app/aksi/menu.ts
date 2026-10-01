"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { wajibPemilik } from "@/lib/auth";
import { ambilIpKlien, periksaBatasLaju } from "@/lib/pembatas-laju";
import {
  buatNamaFileAman,
  hapusBerkasLama,
  simpanBerkasUnggahan,
  validasiBerkasUnggahan,
} from "@/lib/unggah";
import { MAKS_FOTO_PER_MENU, type HasilFotoMenu } from "@/lib/foto-menu";
import { lupakanSinggahanMenu } from "@/lib/menu";
import { buatSlug, type HasilSimpanMenu } from "@/lib/menu-tipe";
import type { KategoriMenu } from "@/generated/prisma/client";

function segarkanHalamanMenu(slug?: string) {
  lupakanSinggahanMenu();
  revalidatePath("/admin/menu");
  revalidatePath("/menu");
  revalidatePath("/");
  if (slug) revalidatePath(`/menu/${slug}`);
}

export async function aksiUnggahFotoMenu(
  _prevState: HasilFotoMenu | null,
  formData: FormData
): Promise<HasilFotoMenu> {
  await wajibPemilik();

  const ip = await ambilIpKlien();
  const cekLaju = periksaBatasLaju({
    kunci: `unggah-foto-menu:${ip}`,
    maksimal: 20,
    jendelaDetik: 60,
  });
  if (!cekLaju.diizinkan) {
    return {
      sukses: false,
      pesan: `Terlalu banyak unggahan berturut-turut. Coba lagi dalam ${cekLaju.tungguDetik} detik.`,
    };
  }

  const menuId = formData.get("menuId");
  if (typeof menuId !== "string" || !menuId) {
    return { sukses: false, pesan: "Menu tidak dikenali." };
  }

  const menu = await db.menu.findUnique({
    where: { id: menuId },
    select: { id: true, slug: true, _count: { select: { foto: true } } },
  });
  if (!menu) {
    return { sukses: false, pesan: "Menu tidak ditemukan." };
  }

  if (menu._count.foto >= MAKS_FOTO_PER_MENU) {
    return {
      sukses: false,
      pesan: `Maksimal ${MAKS_FOTO_PER_MENU} foto per menu. Hapus salah satu foto lama dulu.`,
    };
  }

  const berkas = formData.get("berkas");
  const hasil = await validasiBerkasUnggahan(
    berkas instanceof File ? berkas : null
  );
  if (!hasil.sukses || !hasil.buffer || !hasil.tipe) {
    return { sukses: false, pesan: hasil.pesan };
  }

  const namaFile = buatNamaFileAman(hasil.tipe, "menu");
  const url = await simpanBerkasUnggahan(hasil.buffer, namaFile);

  const fotoTerakhir = await db.fotoMenu.findFirst({
    where: { menuId },
    orderBy: { urutan: "desc" },
    select: { urutan: true },
  });

  const keteranganMentah = formData.get("keterangan");
  const keterangan =
    typeof keteranganMentah === "string" && keteranganMentah.trim()
      ? keteranganMentah.trim().slice(0, 120)
      : null;

  await db.fotoMenu.create({
    data: {
      menuId,
      url,
      keterangan,
      urutan: fotoTerakhir ? fotoTerakhir.urutan + 1 : 0,
    },
  });

  segarkanHalamanMenu(menu.slug);
  return { sukses: true, pesan: "Foto berhasil ditambahkan." };
}

export async function aksiHapusFotoMenu(fotoId: string): Promise<HasilFotoMenu> {
  await wajibPemilik();

  const foto = await db.fotoMenu.findUnique({
    where: { id: fotoId },
    select: { id: true, url: true, menu: { select: { slug: true } } },
  });
  if (!foto) {
    return { sukses: false, pesan: "Foto tidak ditemukan." };
  }

  await db.fotoMenu.delete({ where: { id: fotoId } });
  await hapusBerkasLama(foto.url);

  segarkanHalamanMenu(foto.menu.slug);
  return { sukses: true, pesan: "Foto dihapus." };
}

/**
 * Menjadikan sebuah foto sebagai sampul dengan menukar urutannya ke paling depan.
 * Urutan ditulis ulang berurutan supaya tidak ada celah angka yang membingungkan
 * saat foto lain dihapus.
 */
export async function aksiJadikanSampulFotoMenu(
  fotoId: string
): Promise<HasilFotoMenu> {
  await wajibPemilik();

  const foto = await db.fotoMenu.findUnique({
    where: { id: fotoId },
    select: { id: true, menuId: true, menu: { select: { slug: true } } },
  });
  if (!foto) {
    return { sukses: false, pesan: "Foto tidak ditemukan." };
  }

  const semua = await db.fotoMenu.findMany({
    where: { menuId: foto.menuId },
    orderBy: { urutan: "asc" },
    select: { id: true },
  });

  const urutanBaru = [
    foto.id,
    ...semua.map((f) => f.id).filter((id) => id !== foto.id),
  ];

  await db.$transaction(
    urutanBaru.map((id, index) =>
      db.fotoMenu.update({ where: { id }, data: { urutan: index } })
    )
  );

  segarkanHalamanMenu(foto.menu.slug);
  return { sukses: true, pesan: "Foto dijadikan sampul." };
}

export async function aksiToggleAktifMenu(id: string, aktifBaru: boolean) {
  await wajibPemilik();

  await db.menu.update({
    where: { id },
    data: { aktif: aktifBaru },
  });

  segarkanHalamanMenu();
  return { sukses: true };
}

const angkaBulat = (min: number, max: number, nama: string) =>
  z.coerce
    .number({ message: `${nama} harus berupa angka` })
    .int(`${nama} harus bilangan bulat`)
    .min(min, `${nama} minimal ${min.toLocaleString("id-ID")}`)
    .max(max, `${nama} maksimal ${max.toLocaleString("id-ID")}`);

const SkemaMenu = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 huruf").max(80, "Nama terlalu panjang"),
  deskripsi: z.string().trim().min(10, "Ceritakan isi menu minimal 10 huruf").max(600, "Deskripsi terlalu panjang"),
  kategori: z.enum(["NASI_KOTAK", "SNACK", "TUMPENG", "NASI_GORENG"], { message: "Pilih kategori" }),
  harga: angkaBulat(500, 100_000_000, "Harga"),
  satuan: z.string().trim().min(1, "Isi satuan, mis. kotak").max(20, "Satuan terlalu panjang"),
  minPesan: angkaBulat(1, 5000, "Minimal pesan"),
  preorderHari: angkaBulat(0, 30, "Waktu pesan"),
  // Kosong = tanpa batas harian.
  kapasitasHarian: z.union([z.literal(""), angkaBulat(1, 100_000, "Kuota harian")]),
});

/**
 * Membuat atau mengubah menu.
 *
 * Mengubah harga tidak menyentuh pesanan lama: isi pesanan adalah salinan
 * (invarian #2). Slug sengaja tidak ikut berubah saat nama diganti supaya
 * tautan menu yang sudah dibagikan ke grup WhatsApp tetap hidup.
 */
export async function aksiSimpanMenu(
  _prev: HasilSimpanMenu | null,
  formData: FormData
): Promise<HasilSimpanMenu> {
  await wajibPemilik();

  const id = String(formData.get("id") ?? "").trim() || null;
  const parsed = SkemaMenu.safeParse({
    nama: formData.get("nama") ?? "",
    deskripsi: formData.get("deskripsi") ?? "",
    kategori: formData.get("kategori") ?? "",
    harga: formData.get("harga") ?? "",
    satuan: formData.get("satuan") ?? "",
    minPesan: formData.get("minPesan") ?? "",
    preorderHari: formData.get("preorderHari") ?? "0",
    kapasitasHarian: String(formData.get("kapasitasHarian") ?? "").trim(),
  });

  if (!parsed.success) {
    return {
      sukses: false,
      pesan: "Periksa kembali isian yang ditandai.",
      kesalahan: parsed.error.flatten().fieldErrors,
    };
  }

  const d = parsed.data;
  const data = {
    nama: d.nama,
    deskripsi: d.deskripsi,
    kategori: d.kategori as KategoriMenu,
    harga: d.harga,
    satuan: d.satuan,
    minPesan: d.minPesan,
    preorderHari: d.preorderHari,
    kapasitasHarian: d.kapasitasHarian === "" ? null : d.kapasitasHarian,
  };

  if (id) {
    const lama = await db.menu.findUnique({ where: { id }, select: { slug: true } });
    if (!lama) return { sukses: false, pesan: "Menu tidak ditemukan. Mungkin sudah dihapus." };
    await db.menu.update({ where: { id }, data });
    segarkanHalamanMenu(lama.slug);
    revalidatePath(`/admin/menu/${id}`);
    return { sukses: true, pesan: "Perubahan disimpan." };
  }

  // Slug unik: tambahkan angka bila nama yang mirip sudah ada.
  const dasar = buatSlug(d.nama);
  const bentrok = await db.menu.findMany({
    where: { slug: { startsWith: dasar } },
    select: { slug: true },
  });
  const terpakai = new Set(bentrok.map((m) => m.slug));
  let slug = dasar;
  for (let n = 2; terpakai.has(slug); n++) slug = `${dasar}-${n}`;

  const urutanTerakhir = await db.menu.aggregate({
    where: { kategori: data.kategori },
    _max: { urutan: true },
  });

  const baru = await db.menu.create({
    data: { ...data, slug, urutan: (urutanTerakhir._max.urutan ?? 0) + 1 },
  });

  segarkanHalamanMenu(slug);
  redirect(`/admin/menu/${baru.id}?baru=1`);
}
