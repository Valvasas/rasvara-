import Link from "next/link";
import { FormLacak } from "@/components/toko/FormLacak";
import { IkonCari } from "@/components/ikon/Ikon";

interface HalamanLacakProps {
  searchParams: Promise<{ pesan?: string }>;
}

export default async function HalamanLacak({ searchParams }: HalamanLacakProps) {
  const params = await searchParams;

  return (
    <div className="container mx-auto px-4 py-12 max-w-lg">
      <div className="bg-white rounded-3xl border border-krem-gelap p-6 sm:p-10 shadow-sm space-y-6">
        {/* Header Form */}
        <div className="text-center space-y-2">
          <img
            src="/ilustrasi/lacak-pesanan.png"
            alt=""
            aria-hidden="true"
            width={274}
            height={356}
            className="h-32 w-auto mx-auto mb-1"
          />
          <div className="w-12 h-12 rounded-2xl bg-kunyit-lembut text-kunyit-tua mx-auto flex items-center justify-center">
            <IkonCari className="w-6 h-6" />
          </div>
          <h1 className="font-tampil text-2xl font-bold text-kayu">Lacak Pesanan</h1>
          <p className="text-xs text-kayu-sedang">
            Masukkan kode pesanan dan nomor telepon yang Anda pakai saat memesan.
          </p>
        </div>

        {/* Formulir Lacak Interaktif */}
        <FormLacak pesanAwal={params.pesan} />

        {/* Petunjuk Tambahan */}
        <div className="pt-4 border-t border-krem-gelap/60 text-center space-y-3">
          <p className="text-xs text-kayu-sedang">
            Lupa kode pesanan Anda? Cek pesan konfirmasi di WhatsApp atau hubungi
            dapur kami langsung.
          </p>
          <div className="flex justify-center gap-4 text-xs font-semibold text-bata">
            <Link href="/menu" className="hover:underline">
              Lihat Menu
            </Link>
            <span>&bull;</span>
            <Link href="/pesan" className="hover:underline">
              Pesan Baru
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

