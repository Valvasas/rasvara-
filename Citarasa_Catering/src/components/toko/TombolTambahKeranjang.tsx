"use client";

import { IkonTambah } from "@/components/ikon/Ikon";
import { kabari } from "@/components/Pemberitahuan";
import { KontrolJumlah } from "@/components/toko/KontrolJumlah";
import {
  tambahKeKeranjang,
  ubahJumlahKeranjang,
  useKeranjang,
  type DataMenuKeranjang,
} from "@/lib/keranjang";

/**
 * Tombol "+ Tambah" di kartu menu yang berubah menjadi stepper begitu menunya
 * masuk keranjang — pola GoFood/GrabFood yang sudah jadi kebiasaan jempol.
 * Pembeli bisa menyusun pesanan langsung dari katalog tanpa pindah halaman.
 */
export function TombolTambahKeranjang({ menu, lebar = false }: { menu: DataMenuKeranjang; lebar?: boolean }) {
  const keranjang = useKeranjang();
  const diKeranjang = keranjang.find((i) => i.menuId === menu.menuId);

  if (diKeranjang) {
    return (
      <div className={`relative z-10 anim-masuk-skala ${lebar ? "flex [&>div]:w-full [&>div]:justify-between" : ""}`}>
        <KontrolJumlah
          ukuran="kecil"
          jumlah={diKeranjang.jumlah}
          min={menu.minPesan}
          satuan={menu.satuan}
          nama={menu.nama}
          onUbah={(n) => {
            ubahJumlahKeranjang(menu.menuId, n);
            if (n <= 0) kabari(`${menu.nama} dihapus dari keranjang`, { jenis: "info" });
          }}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        const hasil = tambahKeKeranjang(menu);
        if (hasil === "penuh") {
          kabari("Keranjang sudah berisi 50 menu. Checkout dulu, ya.", { jenis: "galat" });
          return;
        }
        kabari(
          menu.minPesan > 1
            ? `${menu.nama} masuk keranjang (min. ${menu.minPesan} ${menu.satuan})`
            : `${menu.nama} masuk keranjang`,
          { aksi: { label: "Lihat", href: "/keranjang" } }
        );
      }}
      aria-label={`Tambah ${menu.nama} ke keranjang`}
      className={`relative z-10 tombol-garis tombol-kecil ${lebar ? "w-full" : ""}`}
    >
      <IkonTambah className="w-4 h-4" strokeWidth={2.5} />
      Tambah
    </button>
  );
}
