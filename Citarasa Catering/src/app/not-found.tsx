import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

export default function TidakDitemukan() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 text-center bg-krem">
      <div className="anim-masuk space-y-6 max-w-md">
        <div className="mb-2">
          <Wordmark href="/" tagline={false} className="justify-center" />
        </div>

        <div className="text-6xl anim-mengambang">🍲</div>

        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-extrabold text-kayu">
            Halaman Tidak Ditemukan
          </h1>
          <p className="text-sm text-kayu-sedang leading-relaxed">
            Sepertinya menu atau halaman yang Anda cari sudah pindah, atau
            alamatnya keliru. Mari kembali ke dapur kami.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="min-h-[48px] w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-white bg-bata hover:bg-bata-tua transition-colors inline-flex items-center justify-center gap-2"
          >
            <span>Kembali ke Beranda</span>
          </Link>
          <Link
            href="/menu"
            className="min-h-[48px] w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-kayu bg-krem-tua hover:bg-krem-gelap border border-krem-gelap transition-colors inline-flex items-center justify-center"
          >
            Lihat Menu
          </Link>
        </div>
      </div>
    </div>
  );
}
