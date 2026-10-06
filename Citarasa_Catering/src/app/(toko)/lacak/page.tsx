import type { Metadata } from "next";
import Link from "next/link";
import { FormLacak } from "@/components/toko/FormLacak";
import { KerangkaFormulir } from "@/components/toko/KerangkaFormulir";

export const metadata: Metadata = { title: "Lacak pesanan" };

interface HalamanLacakProps {
  searchParams: Promise<{ pesan?: string }>;
}

export default async function HalamanLacak({ searchParams }: HalamanLacakProps) {
  const params = await searchParams;

  return (
    <KerangkaFormulir
      judul="Lacak pesanan"
      keterangan="Kode pesanan ada di halaman konfirmasi dan pesan WhatsApp dari dapur."
      manfaat={[
        "Lihat apakah pesanan sudah diterima, dimasak, atau siap",
        "Kirim bukti transfer bila belum sempat",
        "Pakai nomor WhatsApp yang sama dengan saat memesan",
      ]}
      bawah={
        <p className="mt-5 text-center text-sm text-kayu-sedang">
          Sering pesan?{" "}
          <Link href="/masuk" className="font-semibold text-bata hover:underline">
            Masuk
          </Link>{" "}
          untuk melihat semua pesananmu tanpa mengetik kode.
        </p>
      }
    >
      <FormLacak pesanAwal={params.pesan?.slice(0, 160)} />
    </KerangkaFormulir>
  );
}
