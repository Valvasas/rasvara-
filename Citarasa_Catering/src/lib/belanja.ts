/**
 * Rekap produksi & daftar belanja sebagai fungsi murni.
 *
 * Masukan sudah berupa angka hasil agregasi database (porsi per menu dan resep
 * per menu), jadi fungsi ini tetap ringan walau pesanannya ribuan.
 */

export type PorsiMenu = { menuId: string | null; namaMenu: string; satuan: string; jumlah: number };
export type BarisResep = {
  menuId: string;
  bahanId: string;
  namaBahan: string;
  satuan: string;
  hargaPerSatuan: number;
  jumlahPerPorsi: number;
};
export type BarisBelanja = {
  bahanId: string;
  namaBahan: string;
  satuan: string;
  jumlah: number;
  /** Jumlah yang disarankan dibeli setelah dibulatkan wajar per satuan. */
  jumlahBeli: number;
  perkiraanBiaya: number;
  dipakaiUntuk: string[];
};

/** Satuan yang dibeli utuh (tidak ada setengah butir telur). */
const SATUAN_UTUH = /^(pcs|buah|butir|ikat|bungkus|pak|kaleng|botol|lembar|biji|potong|ekor|sisir|bks|box|dus)$/i;

/** Pembulatan ke atas yang masuk akal di pasar: utuh, atau kelipatan 0,1 (kg/liter). */
export function bulatkanBelanja(jumlah: number, satuan: string): number {
  if (jumlah <= 0) return 0;
  if (SATUAN_UTUH.test(satuan.trim())) return Math.ceil(jumlah - 1e-9);
  return Math.ceil(jumlah * 10 - 1e-9) / 10;
}

/** Menggabungkan baris porsi yang sama (nama snapshot bisa berasal dari banyak pesanan). */
export function rekapProduksi(baris: PorsiMenu[]): PorsiMenu[] {
  const peta = new Map<string, PorsiMenu>();
  for (const b of baris) {
    const kunci = b.menuId ?? `nama:${b.namaMenu}`;
    const ada = peta.get(kunci);
    if (ada) ada.jumlah += b.jumlah;
    else peta.set(kunci, { ...b });
  }
  return [...peta.values()].sort((a, b) => b.jumlah - a.jumlah || a.namaMenu.localeCompare(b.namaMenu, "id"));
}

/**
 * Σ (porsi menu × takaran per porsi) untuk tiap bahan. Menu tanpa resep
 * dikembalikan terpisah supaya pemilik tahu daftar belanjanya belum lengkap.
 */
export function daftarBelanja(
  porsi: PorsiMenu[],
  resep: BarisResep[]
): { baris: BarisBelanja[]; tanpaResep: string[]; totalBiaya: number } {
  const resepPerMenu = new Map<string, BarisResep[]>();
  for (const r of resep) {
    const daftar = resepPerMenu.get(r.menuId) ?? [];
    daftar.push(r);
    resepPerMenu.set(r.menuId, daftar);
  }

  const peta = new Map<string, BarisBelanja>();
  const tanpaResep: string[] = [];
  for (const p of porsi) {
    const daftar = p.menuId ? resepPerMenu.get(p.menuId) : undefined;
    if (!daftar?.length) {
      tanpaResep.push(p.namaMenu);
      continue;
    }
    for (const r of daftar) {
      const ada = peta.get(r.bahanId) ?? {
        bahanId: r.bahanId,
        namaBahan: r.namaBahan,
        satuan: r.satuan,
        jumlah: 0,
        jumlahBeli: 0,
        perkiraanBiaya: 0,
        dipakaiUntuk: [],
      };
      ada.jumlah += p.jumlah * r.jumlahPerPorsi;
      if (!ada.dipakaiUntuk.includes(p.namaMenu)) ada.dipakaiUntuk.push(p.namaMenu);
      peta.set(r.bahanId, ada);
    }
  }

  const hargaPer = new Map(resep.map((r) => [r.bahanId, r.hargaPerSatuan]));
  const baris = [...peta.values()]
    .map((b) => {
      const jumlahBeli = bulatkanBelanja(b.jumlah, b.satuan);
      return { ...b, jumlahBeli, perkiraanBiaya: Math.round(jumlahBeli * (hargaPer.get(b.bahanId) ?? 0)) };
    })
    .sort((a, b) => b.perkiraanBiaya - a.perkiraanBiaya || a.namaBahan.localeCompare(b.namaBahan, "id"));

  return { baris, tanpaResep, totalBiaya: baris.reduce((n, b) => n + b.perkiraanBiaya, 0) };
}

/** "1,5" atau "12" — angka takaran yang enak dibaca di dapur. */
export function angkaTakaran(n: number): string {
  return n.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}
