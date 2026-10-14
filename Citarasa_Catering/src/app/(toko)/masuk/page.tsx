import type { Metadata } from "next";
import { FormMasuk } from "@/components/FormMasuk";
import { KerangkaFormulir } from "@/components/toko/KerangkaFormulir";

export const metadata: Metadata = { title: "Masuk", robots: { index: false } };

export default function HalamanMasuk() {
  return (
    <KerangkaFormulir
      judul="Masuk"
      keterangan="Lihat riwayat pesanan atau buka dashboard dapur."
      manfaat={[
        "Semua pesananmu tersimpan di satu tempat",
        "Nama & nomor terisi otomatis saat memesan",
        "Pemilik & staf dapur masuk dari sini juga",
      ]}
    >
      <FormMasuk />
    </KerangkaFormulir>
  );
}
