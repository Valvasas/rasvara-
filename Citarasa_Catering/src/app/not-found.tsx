import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { Ilustrasi404 } from "@/components/ilustrasi/Ilustrasi";

export default function TidakDitemukan() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 text-center permukaan-hangat">
      <Wordmark href="/" />
      <Ilustrasi404 className="mt-6 w-64 sm:w-72" />
      <p className="font-presisi text-sm font-bold text-pandan tracking-[0.3em]">GALAT 404</p>
      <h1 className="font-tampil mt-2 text-3xl font-bold text-arang">Waduh, halamannya tumpah!</h1>
      <p className="teks-redup mt-3 max-w-sm">
        Alamatnya mungkin salah ketik, atau menunya sudah tidak tersedia. Yuk balik ke menu.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3 w-full max-w-xs sm:max-w-none">
        <Link href="/menu" className="tombol-utama tombol-besar">
          Lihat menu
        </Link>
        <Link href="/" className="tombol-kedua tombol-besar">
          Ke beranda
        </Link>
      </div>
    </div>
  );
}
