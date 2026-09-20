import crypto from "crypto";
import path from "path";
import fs from "fs/promises";

export const BATAS_UKURAN_GAMBAR = 5 * 1024 * 1024; // 5 MB

/**
 * Berkas unggahan sengaja TIDAK disimpan di `public/`.
 *
 * Apa pun yang ada di `public/` dilayani apa adanya kepada siapa pun yang tahu
 * URL-nya, tanpa sempat melewati pemeriksaan apa pun — padahal bukti transfer
 * memuat nama, nomor rekening, dan nominal milik pembeli. Berkas di sini hanya
 * bisa dibaca lewat route `/unggahan/[nama]`, yang memeriksa dulu siapa yang
 * meminta. Foto menu pun ikut ke sini supaya hanya ada satu tempat penyimpanan.
 *
 * Selain itu `public/` ikut tersalin ke dalam image Docker saat build; berkas
 * yang diunggah setelah itu akan hilang setiap kali kontainer dibangun ulang,
 * kecuali disimpan di folder terpisah yang bisa dipasangi volume.
 */
export function direktoriUnggahan(): string {
  const disetel = process.env.DIREKTORI_UNGGAHAN?.trim();
  return disetel && disetel.length > 0
    ? path.resolve(disetel)
    : path.join(process.cwd(), "data", "unggahan");
}

/**
 * Bentuk nama berkas yang boleh dilayani: persis seperti yang dihasilkan
 * `buatNamaFileAman`. Dipakai route pelayan berkas untuk menolak apa pun yang
 * tidak pernah ditulis oleh kode ini — termasuk `..` dan pemisah folder.
 */
export const POLA_NAMA_BERKAS = /^(bukti|menu)-\d{13,}-[0-9a-f]{24}\.(jpg|png|webp)$/;

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

const MIME_DARI_EKSTENSI: Record<string, TipeMimeGambar> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** Tipe konten untuk balasan route pelayan berkas. */
export function tipeMimeDariNama(nama: string): TipeMimeGambar | null {
  const ekstensi = nama.split(".").pop()?.toLowerCase() ?? "";
  return MIME_DARI_EKSTENSI[ekstensi] ?? null;
}

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
 * Menyimpan buffer unggahan ke direktori data (di luar `public/`).
 *
 * Yang dikembalikan tetap URL `/unggahan/<nama>` seperti sebelumnya, karena itu
 * yang tersimpan di database dan dipakai di halaman — bedanya sekarang URL itu
 * dilayani oleh route yang memeriksa wewenang, bukan oleh server berkas statis.
 */
export async function simpanBerkasUnggahan(
  buffer: Buffer,
  namaFile: string
): Promise<string> {
  // Hanya ambil nama file tanpa path untuk mencegah directory traversal
  const namaAman = path.basename(namaFile);
  const direktoriUnggah = direktoriUnggahan();

  await fs.mkdir(direktoriUnggah, { recursive: true });

  const pathTujuan = path.join(direktoriUnggah, namaAman);
  await fs.writeFile(pathTujuan, buffer);

  return `/unggahan/${namaAman}`;
}

/**
 * Membaca berkas unggahan untuk dilayani. Mengembalikan null bila namanya tidak
 * berbentuk nama buatan `buatNamaFileAman` atau berkasnya tidak ada.
 */
export async function bacaBerkasUnggahan(nama: string): Promise<Buffer | null> {
  if (!POLA_NAMA_BERKAS.test(nama)) return null;

  try {
    return await fs.readFile(path.join(direktoriUnggahan(), nama));
  } catch {
    return null;
  }
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
    await fs.unlink(path.join(direktoriUnggahan(), namaAman));
  } catch {
    // Abaikan jika file tidak ditemukan
  }
}

