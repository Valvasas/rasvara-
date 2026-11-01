"use client";

/**
 * Mengecilkan foto di peramban SEBELUM diunggah.
 *
 * Alasan:
 * 1. Vercel menolak badan permintaan di atas 4,5 MB, sementara foto kamera
 *    ponsel lazimnya 3–8 MB (4000 px). Tanpa ini, pembeli mendapat galat
 *    saat mengirim bukti transfer — tepat di langkah yang menyangkut uang.
 * 2. Pembeli sering memakai data seluler: 300 KB terkirim jauh lebih cepat
 *    daripada 5 MB, dan tidak menghabiskan kuota.
 * 3. Penyimpanan & tampilan katalog ikut ringan.
 *
 * 1600 px di sisi terpanjang tetap tajam untuk membaca nominal & nomor
 * rekening di bukti transfer, dan untuk foto menu di layar mana pun.
 * Server tetap memvalidasi tipe (magic bytes) dan ukuran — fungsi ini hanya
 * kenyamanan, bukan pengaman.
 */

const SISI_MAKS = 1600;
const KUALITAS = 0.82;
/** Berkas sekecil ini dan seukuran ini dibiarkan apa adanya. */
const AMBANG_BYTE = 900 * 1024;

async function muatGambar(berkas: File): Promise<{ sumber: CanvasImageSource; lebar: number; tinggi: number; tutup: () => void }> {
  if (typeof createImageBitmap === "function") {
    // imageOrientation: foto ponsel yang diputar lewat metadata EXIF tidak
    // berakhir miring setelah dikecilkan.
    const bmp = await createImageBitmap(berkas, { imageOrientation: "from-image" });
    return { sumber: bmp, lebar: bmp.width, tinggi: bmp.height, tutup: () => bmp.close() };
  }
  const url = URL.createObjectURL(berkas);
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  await img.decode();
  return { sumber: img, lebar: img.naturalWidth, tinggi: img.naturalHeight, tutup: () => URL.revokeObjectURL(url) };
}

export async function kecilkanGambar(berkas: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(berkas.type)) return berkas;

  let gambar: Awaited<ReturnType<typeof muatGambar>>;
  try {
    gambar = await muatGambar(berkas);
  } catch {
    return berkas; // Format tak terbaca peramban: biar server yang menilai.
  }

  try {
    const sisi = Math.max(gambar.lebar, gambar.tinggi);
    if (berkas.size <= AMBANG_BYTE && sisi <= SISI_MAKS) return berkas;

    const skala = Math.min(1, SISI_MAKS / sisi);
    const lebar = Math.max(1, Math.round(gambar.lebar * skala));
    const tinggi = Math.max(1, Math.round(gambar.tinggi * skala));

    const kanvas = document.createElement("canvas");
    kanvas.width = lebar;
    kanvas.height = tinggi;
    const ctx = kanvas.getContext("2d");
    if (!ctx) return berkas;
    // PNG transparan → JPEG akan berlatar hitam; latar putih lebih wajar.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, lebar, tinggi);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(gambar.sumber, 0, 0, lebar, tinggi);

    const blob = await new Promise<Blob | null>((selesai) => kanvas.toBlob(selesai, "image/jpeg", KUALITAS));
    if (!blob || blob.size >= berkas.size) return berkas;

    const nama = berkas.name.replace(/\.[a-z0-9]+$/i, "") || "foto";
    return new File([blob], `${nama}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return berkas;
  } finally {
    gambar.tutup();
  }
}

/**
 * Mengganti isi <input type="file"> dengan versi yang sudah dikecilkan,
 * supaya formulir (Server Action) mengirim berkas kecilnya tanpa mengubah
 * cara formulir dikirim. Mengembalikan berkas yang akhirnya terpasang.
 */
export async function kecilkanIsiInput(input: HTMLInputElement): Promise<File | null> {
  const asli = input.files?.[0];
  if (!asli) return null;
  const kecil = await kecilkanGambar(asli);
  if (kecil !== asli && typeof DataTransfer !== "undefined") {
    try {
      const dt = new DataTransfer();
      dt.items.add(kecil);
      input.files = dt.files;
    } catch {
      return asli; // Peramban lama: kirim aslinya, server tetap membatasi ukuran.
    }
  }
  return input.files?.[0] ?? asli;
}

export function ukuranTerbaca(byte: number): string {
  if (byte < 1024 * 1024) return `${Math.max(1, Math.round(byte / 1024))} KB`;
  return `${(byte / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
