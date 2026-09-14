import Link from "next/link";
import { aksiLacakPesanan } from "@/app/aksi/pesanan";

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
          <div className="w-12 h-12 rounded-2xl bg-kunyit-lembut text-kunyit-tua mx-auto flex items-center justify-center text-2xl font-bold">
            🔍
          </div>
          <h1 className="text-2xl font-extrabold text-kayu">Lacak Pesanan</h1>
          <p className="text-xs text-kayu-sedang">
            Masukkan kode pesanan dan nomor telepon yang Anda pakai saat memesan.
          </p>
        </div>

        {params.pesan && (
          <div className="p-3 bg-bahaya-lembut border border-bahaya/30 text-bahaya rounded-xl text-xs font-medium text-center">
            {params.pesan}
          </div>
        )}

        {/* Formulir Lacak */}
        <form action={async (formData: FormData) => {
          "use server";
          await aksiLacakPesanan(null, formData);
        }} className="space-y-4">
          <div>
            <label
              htmlFor="kode"
              className="block text-xs font-bold uppercase tracking-wider text-kayu-sedang mb-1.5"
            >
              Kode Pesanan
            </label>
            <input
              type="text"
              id="kode"
              name="kode"
              required
              placeholder="Contoh: CR-260914-XXXX"
              className="w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-krem-gelap bg-krem/40 text-kayu font-mono text-sm placeholder:text-kayu-sedang/50 focus:outline-none focus:border-bata focus:ring-1 focus:ring-bata uppercase tracking-wide"
            />
          </div>

          <div>
            <label
              htmlFor="telepon"
              className="block text-xs font-bold uppercase tracking-wider text-kayu-sedang mb-1.5"
            >
              Nomor Telepon / WhatsApp
            </label>
            <input
              type="tel"
              id="telepon"
              name="telepon"
              inputMode="tel"
              required
              placeholder="Contoh: 081234567890"
              className="w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-krem-gelap bg-krem/40 text-kayu text-sm placeholder:text-kayu-sedang/50 focus:outline-none focus:border-bata focus:ring-1 focus:ring-bata"
            />
          </div>

          <button
            type="submit"
            className="w-full min-h-[48px] px-6 py-3 rounded-xl font-bold text-white bg-bata hover:bg-bata-tua transition-colors shadow-sm inline-flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <span>Buka Status Pesanan</span>
            <span aria-hidden="true">&rarr;</span>
          </button>
        </form>

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

