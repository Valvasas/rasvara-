/**
 * Konstanta dan tipe galeri foto menu.
 *
 * Dipisah dari `aksi/menu.ts` karena berkas bertanda `"use server"` hanya boleh
 * mengekspor fungsi async — mengekspor konstanta dari sana membuat seluruh
 * modul kehilangan ekspornya saat dibundel.
 */

/** Cukup untuk menampilkan isi box, porsi, dan penyajian tanpa membengkakkan penyimpanan. */
export const MAKS_FOTO_PER_MENU = 5;

export type HasilFotoMenu = { sukses: boolean; pesan?: string };
