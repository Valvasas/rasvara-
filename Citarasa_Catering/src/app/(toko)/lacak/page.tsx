import type { Metadata } from "next";
import Link from "next/link";
import { FormLacak } from "@/components/toko/FormLacak";
import { IlustrasiLacak } from "@/components/ilustrasi/Ilustrasi";
import { kodePesananPerangkatIni } from "@/lib/akses-pesanan";

export const metadata: Metadata = { title: "Lacak pesanan" };

interface HalamanLacakProps {
  searchParams: Promise<{ pesan?: string }>;
}

export default async function HalamanLacak({ searchParams }: HalamanLacakProps) {
  const [params, kodePerangkat] = await Promise.all([searchParams, kodePesananPerangkatIni()]);

  return (
    <div className="mx-auto max-w-md px-4 pt-5 pb-10 sm:py-14">
      <IlustrasiLacak className="w-52 sm:w-60 mx-auto" />
      <h1 className="mt-1 font-tampil text-[1.75rem] sm:text-3xl font-bold text-arang text-center">Lacak pesanan</h1>
      <p className="teks-redup mt-2 text-center">
        Kode pesanan ada di halaman konfirmasi dan di pesan WhatsApp dari dapur.
      </p>
      <div className="kartu kartu-isi mt-6">
        <FormLacak pesanAwal={params.pesan?.slice(0, 160)} />
      </div>
      {kodePerangkat.length > 0 && (
        <Link
          href="/riwayat"
          className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-beras-gelap bg-white px-4 py-3.5 hover:border-pandan/30 transition-colors"
        >
          <span>
            <span className="block font-semibold text-arang">Pesanan di perangkat ini</span>
            <span className="block text-[13px] text-arang-sedang">{kodePerangkat.length} pesanan, tanpa perlu kode</span>
          </span>
          <span className="text-pandan font-semibold">Lihat →</span>
        </Link>
      )}
    </div>
  );
}
