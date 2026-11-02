import type { Metadata } from "next";
import { ambilMenuUntukPemesanan, dataKeranjangDariMenu } from "@/lib/menu";
import { IsiKeranjang } from "@/components/toko/IsiKeranjang";
import { LangkahPesan } from "@/components/toko/LangkahPesan";

export const metadata: Metadata = {
  title: "Keranjang",
  robots: { index: false },
};

export default async function HalamanKeranjang() {
  // Katalog terbaru dikirim supaya harga di keranjang (yang tersimpan di
  // peramban, bisa berhari-hari lalu) diselaraskan sebelum pembeli melihat total.
  const menu = await ambilMenuUntukPemesanan();

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-5 pb-10 sm:pt-10 sm:pb-14">
      <LangkahPesan aktif={1} />
      <h1 className="mt-5 font-tampil text-[1.75rem] sm:text-4xl font-bold text-arang">Keranjang</h1>
      <div className="mt-5">
        <IsiKeranjang menuTerbaru={menu.map(dataKeranjangDariMenu)} />
      </div>
    </div>
  );
}
