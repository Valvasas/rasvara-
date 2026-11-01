import Link from "next/link";
import { IlustrasiMasuk } from "@/components/ilustrasi/Ilustrasi";
import { IkonCek } from "@/components/ikon/Ikon";

const MANFAAT = [
  "Riwayat pesanan tersimpan rapi",
  "Nama, nomor, & alamat terisi otomatis",
  "Pesan lagi menu favorit sekali tekan",
];

/**
 * Bingkai halaman Masuk & Daftar: panel ilustrasi + manfaat di kiri (layar
 * lebar), tab Masuk | Daftar di atas formulir. Tab dibuat sebagai tautan biasa
 * (bukan tab JavaScript) supaya tombol "kembali" peramban tetap masuk akal.
 */
export function KerangkaAuth({
  mode,
  ke,
  children,
}: {
  mode: "masuk" | "daftar";
  ke?: string;
  children: React.ReactNode;
}) {
  const kueri = ke ? `?ke=${encodeURIComponent(ke)}` : "";
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-4 pb-10 sm:py-12">
      <div className="grid md:grid-cols-[1fr_1.05fr] rounded-3xl overflow-hidden md:border md:border-krem-gelap md:bg-white md:shadow-[var(--shadow-lembut)]">
        <aside className="permukaan-hangat hidden md:flex flex-col justify-center p-10 border-r border-krem-gelap">
          <IlustrasiMasuk className="w-full max-w-xs mx-auto" />
          <h2 className="mt-4 font-tampil text-2xl font-bold text-kayu leading-snug">
            {mode === "masuk" ? "Selamat datang kembali!" : "Gabung, gratis selamanya."}
          </h2>
          <ul className="mt-4 space-y-2.5">
            {MANFAAT.map((m) => (
              <li key={m} className="flex items-start gap-2.5 text-[15px] text-kayu">
                <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-daun text-white flex items-center justify-center">
                  <IkonCek className="w-3 h-3" strokeWidth={3.5} />
                </span>
                {m}
              </li>
            ))}
          </ul>
        </aside>

        <div className="md:p-10">
          <IlustrasiMasuk className="md:hidden w-40 mx-auto -mb-2" />
          <h1 className="font-tampil text-[1.75rem] sm:text-3xl font-bold text-kayu text-center md:text-left">
            {mode === "masuk" ? "Masuk ke akunmu" : "Buat akun baru"}
          </h1>

          <nav aria-label="Pilih masuk atau daftar" className="mt-5 grid grid-cols-2 rounded-xl bg-krem-tua p-1">
            {(["masuk", "daftar"] as const).map((m) => (
              <Link
                key={m}
                href={`/${m}${kueri}`}
                aria-current={mode === m ? "page" : undefined}
                className={`min-h-[44px] rounded-lg flex items-center justify-center text-[15px] font-semibold transition-colors ${
                  mode === m ? "bg-white text-kayu shadow-sm" : "text-kayu-sedang hover:text-kayu"
                }`}
              >
                {m === "masuk" ? "Masuk" : "Daftar"}
              </Link>
            ))}
          </nav>

          <div className="mt-6 kartu kartu-isi md:border-0 md:p-0 md:shadow-none">{children}</div>

          <p className="mt-6 text-center text-[14px] text-kayu-sedang">
            Cuma mau pesan sekali?{" "}
            <Link href="/menu" className="font-semibold text-bata hover:underline">
              Pesan tanpa akun
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
