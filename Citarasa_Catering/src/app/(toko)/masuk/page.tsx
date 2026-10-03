import type { Metadata } from "next";
import { FormMasuk } from "@/components/FormMasuk";

export const metadata: Metadata = { title: "Masuk", robots: { index: false } };

export default function HalamanMasuk() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <h1 className="font-tampil text-3xl font-bold text-kayu">Masuk</h1>
      <p className="teks-redup mt-2">Lihat riwayat pesanan atau buka dashboard dapur.</p>
      <div className="kartu kartu-isi mt-6">
        <FormMasuk />
      </div>
    </div>
  );
}
