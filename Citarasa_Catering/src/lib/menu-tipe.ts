/**
 * Tipe hasil aksi kelola menu. Sengaja di luar berkas "use server": berkas itu
 * hanya boleh mengekspor fungsi async (lihat AGENTS.md bagian 9).
 */
export type HasilSimpanMenu = {
  sukses: boolean;
  pesan?: string;
  kesalahan?: Record<string, string[]>;
};

/** "Nasi Kotak Ayam Bakar!" -> "nasi-kotak-ayam-bakar" */
export function buatSlug(nama: string): string {
  return (
    nama
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "menu"
  );
}
