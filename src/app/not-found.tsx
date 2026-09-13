import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

export default function TidakDitemukan() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-krem-tua px-4 py-4">
        <div className="mx-auto max-w-6xl">
          <Wordmark />
        </div>
      </header>

      <main
        id="isi-utama"
        className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-20 text-center"
      >
        <p className="label-kolom">Halaman tidak ditemukan</p>
        <h1 className="mt-3 text-4xl">Sepertinya alamatnya keliru</h1>
        <p className="mt-4 text-lg text-arang-muda">
          Halaman yang Anda cari tidak ada atau sudah dipindahkan. Kalau Anda
          sedang mencari pesanan, coba lacak memakai kode pesanannya.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="tombol tombol-utama">
            Kembali ke Beranda
          </Link>
          <Link href="/lacak" className="tombol tombol-kedua">
            Lacak Pesanan
          </Link>
        </div>
      </main>
    </div>
  );
}
