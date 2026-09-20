/**
 * Alamat publik situs, dipakai untuk metadataBase, sitemap, robots, dan tautan
 * absolut di pesan WhatsApp. Dipusatkan di sini supaya tidak ada URL yang
 * ditulis ulang manual dan jadi berbeda antar berkas.
 */
export function alamatSitus(): string {
  const mentah = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (!mentah) return "http://localhost:3000";
  return mentah.replace(/\/+$/, "");
}
