"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { IkonUlangi } from "@/components/ikon/Ikon";
import { kabari } from "@/components/Pemberitahuan";
import {
  kosongkanKeranjang,
  tambahKeKeranjang,
  ubahJumlahKeranjang,
  useKeranjang,
  type DataMenuKeranjang,
} from "@/lib/keranjang";

/**
 * Mengosongkan keranjang setelah pesanan berhasil dibuat. Dipanggil di halaman
 * tujuan redirect (bukan di formulir) karena Server Action mengalihkan halaman
 * sebelum kode klien di formulir sempat berjalan.
 */
export function BersihkanKeranjang() {
  useEffect(() => {
    kosongkanKeranjang();
  }, []);
  return null;
}

/**
 * Memantau perubahan pesanan selama belum selesai — pembeli melihat status
 * berpindah ("Sedang dimasak" → "Siap") tanpa menekan apa pun.
 *
 * Yang ditanyakan berkala hanya "versi" pesanan (endpoint super ringan);
 * halaman baru dimuat ulang bila versinya berubah. Memuat ulang halaman
 * secara buta setiap 45 detik akan merender ulang seluruh layout — termasuk
 * penghitung kunjungan, sehingga statistik pengunjung ikut menggelembung.
 * Berhenti saat tab tidak terlihat.
 */
export function SegarkanOtomatis({ kode, versi, detik = 45 }: { kode: string; versi: string; detik?: number }) {
  const router = useRouter();
  useEffect(() => {
    let berhenti = false;
    const periksa = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/pesanan/${encodeURIComponent(kode)}/versi`, { cache: "no-store" });
        if (!res.ok || berhenti) return;
        const data: { versi?: string } = await res.json();
        if (data.versi && data.versi !== versi) router.refresh();
      } catch {
        // Sinyal hilang sebentar: coba lagi di putaran berikutnya.
      }
    };
    const id = window.setInterval(periksa, detik * 1000);
    document.addEventListener("visibilitychange", periksa);
    return () => {
      berhenti = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", periksa);
    };
  }, [router, kode, versi, detik]);
  return null;
}

/**
 * "Pesan lagi" — mengisi keranjang dengan isi pesanan lama memakai harga &
 * aturan menu TERKINI (bukan harga di nota lama), lalu membuka keranjang.
 */
export function TombolPesanLagi({
  item,
  jumlahTakTersedia,
  kelas = "tombol-kedua",
}: {
  item: { menu: DataMenuKeranjang; jumlah: number }[];
  jumlahTakTersedia: number;
  kelas?: string;
}) {
  const router = useRouter();
  const keranjang = useKeranjang();
  if (item.length === 0) return null;

  return (
    <button
      type="button"
      className={kelas}
      onClick={() => {
        for (const { menu, jumlah } of item) {
          const ada = keranjang.find((k) => k.menuId === menu.menuId);
          if (ada) ubahJumlahKeranjang(menu.menuId, Math.max(ada.jumlah, jumlah));
          else tambahKeKeranjang(menu, jumlah);
        }
        kabari(
          jumlahTakTersedia > 0
            ? `${item.length} menu masuk keranjang. ${jumlahTakTersedia} menu lain sudah tidak dijual.`
            : `${item.length} menu masuk keranjang dengan harga terbaru`,
          { jenis: jumlahTakTersedia > 0 ? "info" : "sukses" }
        );
        router.push("/keranjang");
      }}
    >
      <IkonUlangi className="w-[18px] h-[18px]" />
      Pesan lagi
    </button>
  );
}
