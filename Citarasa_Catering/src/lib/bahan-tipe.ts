/** Tipe hasil aksi bahan & resep (di luar berkas "use server", lihat AGENTS.md §9). */
export type HasilBahan = { sukses: boolean; pesan?: string; kesalahan?: Record<string, string[]> };

/** Satuan yang ditawarkan; pemilik tetap boleh mengetik satuan lain. */
export const SATUAN_BAHAN = ["kg", "gram", "liter", "ml", "butir", "ikat", "bungkus", "pcs", "lembar", "botol", "kaleng"] as const;
