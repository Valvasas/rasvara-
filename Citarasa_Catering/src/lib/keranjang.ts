"use client";

import { useSyncExternalStore } from "react";

/**
 * Keranjang belanja — hidup sepenuhnya di peramban.
 *
 * Kenapa tidak disimpan di database: keranjang hanyalah daftar niat, bukan
 * transaksi. Menyimpannya di server berarti satu baris database per pengunjung
 * yang iseng menekan "+", plus urusan menggabungkan keranjang tamu & akun.
 * Di localStorage, keranjang tetap ada walau tab ditutup (kebiasaan pembeli
 * marketplace: "nanti saja checkout-nya") tanpa membebani server sama sekali.
 *
 * Keamanan: isi keranjang TIDAK PERNAH dipercaya. Yang dikirim ke server saat
 * checkout hanya `menuId` + `jumlah`; harga, status aktif, minimal pesan, dan
 * kuota dihitung ulang dari database (invarian #1). Nama & harga di sini hanya
 * salinan tampilan, dan halaman keranjang/checkout menimpanya dengan data
 * terbaru dari server.
 */

export type ItemKeranjang = {
  menuId: string;
  slug: string;
  nama: string;
  harga: number;
  satuan: string;
  minPesan: number;
  preorderHari: number;
  fotoUrl: string | null;
  jumlah: number;
};

const KUNCI = "citarasa:keranjang:v1";
const MAKS_ITEM = 50; // sama dengan batas server per pesanan
export const MAKS_JUMLAH = 5000;

const KOSONG: ItemKeranjang[] = [];
let isi: ItemKeranjang[] = KOSONG;
let sudahDimuat = false;
const pendengar = new Set<() => void>();

function angkaBulat(n: unknown, min: number, maks: number): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return Math.min(maks, Math.max(min, Math.floor(n)));
}

/** localStorage bisa diubah lewat DevTools atau ekstensi — validasi setiap baris. */
function bersihkan(mentah: unknown): ItemKeranjang[] {
  if (!Array.isArray(mentah)) return KOSONG;
  const hasil: ItemKeranjang[] = [];
  const terlihat = new Set<string>();
  for (const b of mentah) {
    if (!b || typeof b !== "object") continue;
    const r = b as Record<string, unknown>;
    if (typeof r.menuId !== "string" || r.menuId.length > 64 || terlihat.has(r.menuId)) continue;
    const jumlah = angkaBulat(r.jumlah, 1, MAKS_JUMLAH);
    const harga = angkaBulat(r.harga, 0, 1_000_000_000);
    if (jumlah === null || harga === null) continue;
    terlihat.add(r.menuId);
    hasil.push({
      menuId: r.menuId,
      slug: typeof r.slug === "string" ? r.slug.slice(0, 120) : "",
      nama: typeof r.nama === "string" ? r.nama.slice(0, 120) : "Menu",
      harga,
      satuan: typeof r.satuan === "string" ? r.satuan.slice(0, 30) : "porsi",
      minPesan: angkaBulat(r.minPesan, 1, MAKS_JUMLAH) ?? 1,
      preorderHari: angkaBulat(r.preorderHari, 0, 365) ?? 0,
      fotoUrl: typeof r.fotoUrl === "string" && r.fotoUrl.startsWith("/") ? r.fotoUrl : null,
      jumlah,
    });
    if (hasil.length >= MAKS_ITEM) break;
  }
  return hasil;
}

function muat(): void {
  if (sudahDimuat || typeof window === "undefined") return;
  sudahDimuat = true;
  try {
    const teks = window.localStorage.getItem(KUNCI);
    isi = teks ? bersihkan(JSON.parse(teks)) : KOSONG;
  } catch {
    isi = KOSONG;
  }
  // Keranjang di tab lain ikut berubah — pembeli sering membuka menu di
  // beberapa tab sekaligus lalu checkout dari salah satunya.
  window.addEventListener("storage", (e) => {
    if (e.key !== KUNCI) return;
    try {
      isi = e.newValue ? bersihkan(JSON.parse(e.newValue)) : KOSONG;
    } catch {
      isi = KOSONG;
    }
    pendengar.forEach((f) => f());
  });
}

function simpan(baru: ItemKeranjang[]): void {
  isi = baru;
  try {
    if (baru.length === 0) window.localStorage.removeItem(KUNCI);
    else window.localStorage.setItem(KUNCI, JSON.stringify(baru));
  } catch {
    // Penyimpanan penuh/diblokir: keranjang tetap jalan selama tab terbuka.
  }
  pendengar.forEach((f) => f());
}

function langganan(f: () => void): () => void {
  muat();
  pendengar.add(f);
  return () => pendengar.delete(f);
}

function ambil(): ItemKeranjang[] {
  muat();
  return isi;
}

/** Saat render di server keranjang selalu kosong; isinya muncul setelah hidrasi. */
export function useKeranjang(): ItemKeranjang[] {
  return useSyncExternalStore(langganan, ambil, () => KOSONG);
}

/** Jumlah baris menu (bukan jumlah porsi) — angka yang lazim di lencana keranjang. */
export function useJumlahBarisKeranjang(): number {
  return useKeranjang().length;
}

export type DataMenuKeranjang = Omit<ItemKeranjang, "jumlah">;

/**
 * Menambah menu. Jumlah awal otomatis mengikuti minimal pesan, karena menambah
 * 1 porsi untuk menu bermin. 20 hanya akan ditolak di akhir.
 */
export function tambahKeKeranjang(menu: DataMenuKeranjang, jumlah?: number): "baru" | "bertambah" | "penuh" {
  const sekarang = ambil();
  const ada = sekarang.find((i) => i.menuId === menu.menuId);
  if (ada) {
    const tambahan = jumlah ?? 1;
    simpan(
      sekarang.map((i) =>
        i.menuId === menu.menuId
          ? { ...i, ...menu, jumlah: Math.min(MAKS_JUMLAH, i.jumlah + tambahan) }
          : i
      )
    );
    return "bertambah";
  }
  if (sekarang.length >= MAKS_ITEM) return "penuh";
  const awal = Math.min(MAKS_JUMLAH, Math.max(menu.minPesan, jumlah ?? menu.minPesan));
  simpan([...sekarang, { ...menu, jumlah: awal }]);
  return "baru";
}

/** Jumlah ≤ 0 menghapus baris. Di bawah minimal pesan dibulatkan ke minimal. */
export function ubahJumlahKeranjang(menuId: string, jumlah: number): void {
  const sekarang = ambil();
  if (jumlah <= 0) {
    simpan(sekarang.filter((i) => i.menuId !== menuId));
    return;
  }
  simpan(
    sekarang.map((i) =>
      i.menuId === menuId
        ? { ...i, jumlah: Math.min(MAKS_JUMLAH, Math.max(i.minPesan, Math.floor(jumlah))) }
        : i
    )
  );
}

/**
 * Menambah menu hanya bila belum ada (tidak menambah jumlah). Dipakai tautan
 * lama `/pesan?menu=slug` — aman dipanggil dua kali oleh efek React.
 */
export function pastikanDiKeranjang(menu: DataMenuKeranjang): void {
  if (ambil().some((i) => i.menuId === menu.menuId)) return;
  tambahKeKeranjang(menu);
}

export function hapusDariKeranjang(menuId: string): void {
  simpan(ambil().filter((i) => i.menuId !== menuId));
}

export function kosongkanKeranjang(): void {
  simpan(KOSONG);
}

/**
 * Menimpa data tampilan (nama, harga, foto) dengan data terbaru dari server
 * dan membuang menu yang sudah tidak dijual. Dipanggil halaman keranjang &
 * checkout. Mengembalikan nama menu yang dibuang supaya pembeli diberi tahu.
 */
export function selaraskanKeranjang(terbaru: Map<string, DataMenuKeranjang>): string[] {
  const sekarang = ambil();
  const dibuang: string[] = [];
  let berubah = false;
  const baru: ItemKeranjang[] = [];
  for (const i of sekarang) {
    const m = terbaru.get(i.menuId);
    if (!m) {
      dibuang.push(i.nama);
      berubah = true;
      continue;
    }
    const jumlah = Math.max(m.minPesan, i.jumlah);
    if (
      m.harga !== i.harga ||
      m.nama !== i.nama ||
      m.minPesan !== i.minPesan ||
      m.preorderHari !== i.preorderHari ||
      m.fotoUrl !== i.fotoUrl ||
      m.satuan !== i.satuan ||
      jumlah !== i.jumlah
    ) {
      berubah = true;
    }
    baru.push({ ...i, ...m, jumlah });
  }
  if (berubah) simpan(baru);
  return dibuang;
}
