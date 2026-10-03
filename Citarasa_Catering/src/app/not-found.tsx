import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

export default function TidakDitemukan() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 text-center">
      <Wordmark href="/" />
      <p className="mt-10 text-sm font-medium text-bata">404</p>
      <h1 className="font-tampil mt-2 text-3xl font-bold text-kayu">Halaman tidak ditemukan</h1>
      <p className="teks-redup mt-3 max-w-sm">
        Alamatnya mungkin salah ketik, atau menunya sudah tidak tersedia.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/menu" className="tombol-utama">
          Lihat menu
        </Link>
        <Link href="/" className="tombol-kedua">
          Beranda
        </Link>
      </div>
    </div>
  );
}
