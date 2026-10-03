export const POLA_BULAN = /^\d{4}-(0[1-9]|1[0-2])$/;
const NAMA_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export function bulanSebelumnya(kunci: string): string {
  const [t, b] = kunci.split("-").map(Number);
  return b === 1 ? `${t - 1}-12` : `${t}-${String(b - 1).padStart(2, "0")}`;
}

export function labelBulan(kunci: string): string {
  const [t, b] = kunci.split("-").map(Number);
  return `${NAMA_BULAN[b - 1]} ${t}`;
}
