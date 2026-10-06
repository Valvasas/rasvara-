import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { IlustrasiPiringKosong } from "@/components/ilustrasi/Ilustrasi";

export default function TidakDitemukan() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-16 text-center overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 latar-kawung [mask-image:radial-gradient(circle_at_50%_45%,#000_10%,transparent_65%)]"
      />
      <div className="relative">
        <Wordmark href="/" />
        <IlustrasiPiringKosong className="w-56 sm:w-64 mx-auto mt-10" />
        <p className="mt-4 text-sm font-medium text-bata">404</p>
        <h1 className="font-tampil mt-2 text-3xl font-bold text-kayu">Piringnya masih kosong</h1>
        <p className="teks-redup mt-3 max-w-sm mx-auto">
          Halaman yang kamu cari tidak ada. Alamatnya mungkin salah ketik, atau menunya sudah tidak tersedia.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/menu" className="tombol-utama">
            Lihat menu
          </Link>
          <Link href="/lacak" className="tombol-kedua">
            Lacak pesanan
          </Link>
          <Link href="/" className="tombol-hantu">
            Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
