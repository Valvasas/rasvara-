/**
 * Perapian path untuk statistik — sengaja dipisah dari `analitik.ts` supaya
 * tidak ikut menarik koneksi database. Logikanya murni, jadi bisa diuji
 * langsung tanpa menyalakan PostgreSQL.
 *
 * Fungsi ini adalah penjaga privasi: kode pesanan dan slug menu diganti pola
 * sebelum tersimpan, sehingga tabel statistik tidak pernah berubah menjadi
 * daftar pesanan yang bisa dibongkar.
 */
export function rapikanPath(path: string): string | null {
  if (!path.startsWith("/")) return null;
  if (path.startsWith("/admin")) return null;
  if (path.startsWith("/api")) return null;

  if (path.startsWith("/pesanan/")) return "/pesanan/:kode";
  if (path.startsWith("/menu/")) return "/menu/:slug";

  // Batasi panjang supaya URL aneh tidak membengkakkan tabel.
  return path.length > 80 ? path.slice(0, 80) : path;
}
