/**
 * Galat yang pesannya memang ditulis untuk dibaca pengguna ("Kuota menu habis",
 * "Pesanan sudah dibatalkan"). Galat lain — dari Prisma, jaringan, atau bug —
 * tidak boleh diteruskan apa adanya ke layar: pesannya bisa membocorkan nama
 * tabel, struktur kueri, atau isi data, dan tidak berguna bagi pembeli.
 */
export class GalatBisnis extends Error {
  constructor(pesan: string) {
    super(pesan);
    this.name = "GalatBisnis";
  }
}

/** Pesan aman untuk ditampilkan; galat tak terduga dicatat di log server. */
export function pesanGalat(err: unknown, cadangan = "Terjadi gangguan di server. Silakan coba lagi."): string {
  if (err instanceof GalatBisnis) return err.message;
  console.error(err);
  return cadangan;
}
