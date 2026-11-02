"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IkonKeranjang, IkonWhatsapp } from "@/components/ikon/Ikon";
import { kabari } from "@/components/Pemberitahuan";
import { KontrolJumlah } from "@/components/toko/KontrolJumlah";
import { rupiah } from "@/lib/format";
import {
  tambahKeKeranjang,
  ubahJumlahKeranjang,
  useKeranjang,
  type DataMenuKeranjang,
} from "@/lib/keranjang";

interface PembelianMenuProps {
  menu: DataMenuKeranjang;
  waUrl: string | null;
}

/**
 * Blok jumlah + tombol beli di halaman detail menu.
 *
 * Di ponsel tombolnya pindah ke bar yang menempel di bawah layar — pola
 * "Chat · Masukkan keranjang · Beli sekarang" yang sudah dihafal pembeli
 * marketplace, dan selalu terjangkau jempol berapa pun panjang deskripsinya.
 */
export function PembelianMenu({ menu, waUrl }: PembelianMenuProps) {
  const router = useRouter();
  const keranjang = useKeranjang();
  const diKeranjang = keranjang.find((i) => i.menuId === menu.menuId);
  // null = belum diubah pembeli; ikuti isi keranjang (yang baru terbaca
  // setelah hidrasi) atau minimal pesan.
  const [jumlahDipilih, setJumlah] = useState<number | null>(null);
  const jumlah = jumlahDipilih ?? diKeranjang?.jumlah ?? menu.minPesan;

  const simpanKeKeranjang = (): boolean => {
    if (diKeranjang) {
      ubahJumlahKeranjang(menu.menuId, jumlah);
      return true;
    }
    return tambahKeKeranjang(menu, jumlah) !== "penuh";
  };

  const keKeranjang = () => {
    const ada = Boolean(diKeranjang);
    if (!simpanKeKeranjang()) {
      kabari("Keranjang sudah berisi 50 menu. Checkout dulu, ya.", { jenis: "galat" });
      return;
    }
    kabari(ada ? `Jumlah ${menu.nama} diperbarui jadi ${jumlah} ${menu.satuan}` : `${menu.nama} masuk keranjang`, {
      aksi: { label: "Lihat", href: "/keranjang" },
    });
  };

  const pesanSekarang = () => {
    if (!simpanKeKeranjang()) {
      kabari("Keranjang sudah berisi 50 menu. Checkout dulu, ya.", { jenis: "galat" });
      return;
    }
    router.push("/pesan");
  };

  return (
    <>
      <div className="mt-6 rounded-2xl border border-beras-gelap bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="label !mb-0">Jumlah</p>
            <p className="text-[13px] text-arang-sedang">
              Min. {menu.minPesan} {menu.satuan}
            </p>
          </div>
          <KontrolJumlah
            jumlah={jumlah}
            min={menu.minPesan}
            satuan={menu.satuan}
            nama={menu.nama}
            onUbah={(n) => setJumlah(Math.max(menu.minPesan, n))}
            bisaHapus={false}
          />
        </div>
        <div className="mt-4 pt-4 border-t border-beras-gelap flex items-baseline justify-between">
          <span className="text-arang-sedang">Subtotal</span>
          <span className="text-xl font-bold text-arang angka-tabel">{rupiah(menu.harga * jumlah)}</span>
        </div>

        <div className="hidden md:grid grid-cols-2 gap-3 mt-5">
          <button type="button" onClick={keKeranjang} className="tombol-garis tombol-besar">
            <IkonKeranjang className="w-5 h-5" />
            {diKeranjang ? "Perbarui keranjang" : "Masukkan keranjang"}
          </button>
          <button type="button" onClick={pesanSekarang} className="tombol-utama tombol-besar">
            Pesan sekarang
          </button>
        </div>
        {diKeranjang && (
          <p className="mt-3 text-[13px] text-pandan-tua font-medium">
            ✓ Sudah ada {diKeranjang.jumlah} {menu.satuan} di keranjangmu
          </p>
        )}
      </div>

      {/* Bar beli menempel di bawah — ponsel */}
      <div aria-hidden="true" className="md:hidden h-24" />
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/97 backdrop-blur-md border-t border-beras-gelap shadow-[var(--shadow-mengambang)] aman-bawah">
        <div className="flex items-stretch gap-2 px-3 pt-2.5">
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Tanya lewat WhatsApp"
              className="shrink-0 w-14 flex flex-col items-center justify-center rounded-xl text-pandan-tua text-[11.5px] font-semibold hover:bg-pandan-lembut"
            >
              <IkonWhatsapp className="w-6 h-6 text-pandan" />
              Chat
            </a>
          )}
          <button type="button" onClick={keKeranjang} className="tombol-garis flex-1 px-2 text-[14.5px]">
            <IkonKeranjang className="w-5 h-5" />
            {diKeranjang ? "Perbarui" : "Keranjang"}
          </button>
          <button type="button" onClick={pesanSekarang} className="tombol-utama flex-[1.3] px-2 text-[14.5px]">
            Pesan sekarang
          </button>
        </div>
      </div>
    </>
  );
}
