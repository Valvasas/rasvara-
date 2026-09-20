"use server";

import { revalidatePath } from "next/cache";
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

export async function aksiUpdateKapasitasMenu(
  id: string,
  kapasitas: number | null
) {
  await wajibPemilik();

  if (
    kapasitas !== null &&
    (!Number.isInteger(kapasitas) || kapasitas < 0)
  ) {
    return { sukses: false, pesan: "Kuota harian harus bilangan bulat 0 atau lebih." };
  }

  await db.menu.update({
    where: { id },
    data: { kapasitasHarian: kapasitas },
  });

  segarkanHalamanMenu();
  return { sukses: true };
}

