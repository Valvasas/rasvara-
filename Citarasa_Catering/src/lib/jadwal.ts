/**
 * Aturan jam siap untuk pesanan HARI INI — fungsi murni, dipakai bersama oleh
 * formulir (supaya pembeli langsung tahu) dan server (yang memutuskan).
 * Keduanya memanggil fungsi yang sama sehingga pesannya tidak pernah berbeda.
 */

function jamDariMenit(menit: number): string {
  const j = Math.floor(menit / 60);
  const m = menit % 60;
  return `${String(j).padStart(2, "0")}.${String(m).padStart(2, "0")}`;
}

/** "3 jam", "1 jam 30 menit", "45 menit" */
export function labelDurasi(menit: number): string {
  const j = Math.floor(menit / 60);
  const m = menit % 60;
  if (j && m) return `${j} jam ${m} menit`;
  if (j) return `${j} jam`;
  return `${m} menit`;
}

/**
 * Mengembalikan alasan penolakan, atau null bila jamnya boleh.
 *
 * - Pesanan untuk hari lain selalu lolos aturan ini (H-n per menu diatur terpisah).
 * - Jam yang sudah lewat selalu ditolak.
 * - Bila pemilik mengisi jeda minimum (mis. 180 menit), jam siap harus
 *   setidaknya sejauh itu dari sekarang.
 */
export function alasanJamDitolak(opsi: {
  selisihHari: number;
  menitAcara: number;
  menitSekarang: number;
  jedaMenit: number;
}): string | null {
  if (opsi.selisihHari !== 0) return null;
  if (opsi.menitAcara <= opsi.menitSekarang) {
    return "Jam siap untuk hari ini sudah lewat. Pilih jam yang lebih malam, atau ganti ke tanggal berikutnya.";
  }
  const jeda = Math.max(0, Math.floor(opsi.jedaMenit));
  if (jeda > 0 && opsi.menitAcara < opsi.menitSekarang + jeda) {
    const tercepat = opsi.menitSekarang + jeda;
    return tercepat >= 24 * 60
      ? `Dapur butuh minimal ${labelDurasi(jeda)} untuk menyiapkan pesanan, jadi hari ini sudah tidak bisa. Pilih tanggal berikutnya.`
      : `Dapur butuh minimal ${labelDurasi(jeda)} untuk menyiapkan pesanan. Untuk hari ini, pilih jam siap mulai pukul ${jamDariMenit(tercepat)}, atau ganti ke tanggal berikutnya.`;
  }
  return null;
}

/** "HH.MM" dari menit sejak tengah malam. */
export function labelJamMenit(menit: number): string {
  return jamDariMenit(menit);
}

/**
 * Jam siap paling cepat untuk pesanan HARI INI, dibulatkan ke atas ke
 * kelipatan 15 menit (jam yang dipilih pembeli di formulir juga lazim bulat).
 *
 * Mengembalikan null bila:
 *  - pemilik belum mengisi jeda persiapan (0) — tanpa angka itu, "tercepat"
 *    secara teknis berarti "sekarang", janji yang tidak bisa ditepati dapur
 *    mana pun, jadi lebih jujur tidak menampilkan apa-apa;
 *  - jam tercepat sudah melewati tengah malam — hari ini sudah tidak bisa.
 *
 * Aturannya identik dengan `alasanJamDitolak`: jam yang dikembalikan di sini
 * dijamin lolos validasi server.
 */
export function jamSiapTercepatHariIni(opsi: { menitSekarang: number; jedaMenit: number }): number | null {
  const jeda = Math.max(0, Math.floor(opsi.jedaMenit));
  if (jeda === 0) return null;
  // Dibulatkan KE ATAS, jadi selalu ≥ sekarang + jeda (syarat server).
  const tercepat = Math.ceil((opsi.menitSekarang + jeda) / 15) * 15;
  if (tercepat >= 24 * 60) return null;
  return tercepat;
}
