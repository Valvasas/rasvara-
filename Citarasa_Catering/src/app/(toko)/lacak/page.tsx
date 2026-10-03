import type { Metadata } from "next";
import { FormLacak } from "@/components/toko/FormLacak";

export const metadata: Metadata = { title: "Lacak pesanan" };

interface HalamanLacakProps {
  searchParams: Promise<{ pesan?: string }>;
}

export default async function HalamanLacak({ searchParams }: HalamanLacakProps) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <h1 className="font-tampil text-3xl font-bold text-kayu">Lacak pesanan</h1>
      <p className="teks-redup mt-2">
        Kode pesanan ada di halaman konfirmasi dan pesan WhatsApp dari dapur.
      </p>
      <div className="kartu kartu-isi mt-6">
        <FormLacak pesanAwal={params.pesan?.slice(0, 160)} />
      </div>
    </div>
  );
}
