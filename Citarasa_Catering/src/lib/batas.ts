/**
 * Batas atas nominal rupiah yang boleh disimpan.
 *
 * Kolom uang di database (`Pesanan.total`, `ItemPesanan.subtotal`,
 * `CatatanKas.jumlah`, `Voucher.nilai`, dst.) bertipe `Int`, yaitu integer
 * 32-bit PostgreSQL dengan nilai maksimal 2.147.483.647. Nilai yang lebih besar
 * ditolak database ("value out of range"). Tanpa batas ini, catatan kas Rp3
 * miliar membuat halaman admin gagal dimuat, dan pesanan 5.000 paket menu mahal
 * memperlihatkan pesan galat Prisma mentah kepada pembeli.
 *
 * Angkanya dibulatkan ke bawah supaya enak dibaca di pesan galat. Totalnya
 * (jumlah seluruh kas setahun, dsb.) tetap aman karena PostgreSQL menjumlahkan
 * kolom `Int` sebagai `bigint`.
 */
export const MAKS_NOMINAL = 2_000_000_000;
