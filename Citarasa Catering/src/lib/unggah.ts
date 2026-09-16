import crypto from "crypto";
import path from "path";
import fs from "fs/promises";

export const BATAS_UKURAN_GAMBAR = 5 * 1024 * 1024; // 5 MB

export const TIPE_MIME_DIIZINKAN = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type TipeMimeGambar = (typeof TIPE_MIME_DIIZINKAN)[number];

const EKSTENSI_DARI_MIME: Record<TipeMimeGambar, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Memeriksa header magic bytes file buffer untuk memastikan file benar-benar gambar
 * yang didukung, bukan script berbahaya yang diberi ekstensi palsu.
 */
export function verifikasiHeaderGambar(
  buffer: Buffer
): { valid: boolean; tipe?: TipeMimeGambar } {
  if (buffer.length < 12) {
    return { valid: false };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, tipe: "image/jpeg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, tipe: "image/png" };
  }

  // WebP: RIFF .... WEBP
  // 'RIFF' = 0x52 0x49 0x46 0x46, 'WEBP' = 0x57 0x45 0x42 0x50
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { valid: true, tipe: "image/webp" };
  }

  return { valid: false };
}

/**
 * Menghasilkan nama file acak yang tidak bisa ditebak untuk menghindari path traversal & kolisi.
 * `awalan` hanya menandai asal berkas (bukti transfer vs foto menu); nama tetap
 * ditentukan server, tidak pernah memakai nama asli kiriman pengguna.
 */
export function buatNamaFileAman(
  tipeMime: TipeMimeGambar,
  awalan: "bukti" | "menu" = "bukti"
): string {
  const ekstensi = EKSTENSI_DARI_MIME[tipeMime] || "jpg";
  const acak = crypto.randomBytes(12).toString("hex");
  const timestamp = Date.now();
  return `${awalan}-${timestamp}-${acak}.${ekstensi}`;
}

export interface HasilValidasiUnggah {
  sukses: boolean;
  pesan?: string;
  buffer?: Buffer;
  tipe?: TipeMimeGambar;
}

/**
 * Memvalidasi file upload dari klien.
 */
export async function validasiBerkasUnggahan(
  berkas: File | null | undefined
): Promise<HasilValidasiUnggah> {
  if (!berkas || berkas.size === 0) {
    return { sukses: false, pesan: "Pilih file foto bukti transfer terlebih dahulu." };
  }

  if (berkas.size > BATAS_UKURAN_GAMBAR) {
    return {
      sukses: false,
      pesan: "Ukuran file terlalu besar. Maksimal ukuran adalah 5 MB.",
    };
  }

  const arrayBuffer = await berkas.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const hasilHeader = verifikasiHeaderGambar(buffer);
  if (!hasilHeader.valid || !hasilHeader.tipe) {
    return {
      sukses: false,
      pesan:
        "Format file tidak didukung atau rusak. Harap unggah foto berekstensi JPG, PNG, atau WebP.",
    };
  }

  return {
    sukses: true,
    buffer,
    tipe: hasilHeader.tipe,
  };
}

/**
 * Menyimpan buffer bukti transfer ke disk lokal secara aman (public/unggahan/).
 */
export async function simpanBerkasUnggahan(
  buffer: Buffer,
  namaFile: string
): Promise<string> {
  // Hanya ambil nama file tanpa path untuk mencegah directory traversal
  const namaAman = path.basename(namaFile);
  const direktoriUnggah = path.join(process.cwd(), "public", "unggahan");

  await fs.mkdir(direktoriUnggah, { recursive: true });

  const pathTujuan = path.join(direktoriUnggah, namaAman);
  await fs.writeFile(pathTujuan, buffer);

  return `/unggahan/${namaAman}`;
}

/**
 * Menghapus file lama jika ada saat pengguna mengunggah ulang bukti baru.
 */
export async function hapusBerkasLama(urlRelatif: string | null | undefined): Promise<void> {
  if (!urlRelatif || !urlRelatif.startsWith("/unggahan/")) {
    return;
  }

  try {
    const namaAman = path.basename(urlRelatif);
    const pathFile = path.join(process.cwd(), "public", "unggahan", namaAman);
    await fs.unlink(pathFile);
  } catch {
    // Abaikan jika file tidak ditemukan
  }
}

