import Link from "next/link";
import { ambilPengaturan } from "@/lib/pengaturan";
import { jamTampil, linkWhatsapp, teleponTampil } from "@/lib/format";
import { Wordmark } from "@/components/Wordmark";
import { SakelarTeks } from "@/components/toko/PengaturanAkun";
import { IkonJam, IkonLokasi, IkonWhatsapp } from "@/components/ikon/Ikon";

export async function KakiToko() {
  const pengaturan = await ambilPengaturan();

  const waUrl = pengaturan.whatsapp
    ? linkWhatsapp(pengaturan.whatsapp, `Halo ${pengaturan.namaUsaha}, saya mau tanya soal pesanan.`)
    : null;

  return (
    <footer className="mt-auto border-t border-krem-gelap bg-krem-tua/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-4 max-w-sm">
          <Wordmark href="/" tagline />
          {pengaturan.tagline && <p className="text-[15px] text-kayu-sedang leading-relaxed">{pengaturan.tagline}</p>}
          {waUrl && (
            <a href={waUrl} target="_blank" rel="noopener noreferrer" className="tombol-wa tombol-kecil">
              <IkonWhatsapp className="w-4 h-4" />
              Chat dapur
            </a>
          )}
        </div>

        <div className="space-y-3 text-[15px]">
          <h2 className="font-bold text-kayu">Kontak</h2>
          <ul className="space-y-2.5 text-kayu-sedang">
            {waUrl && (
              <li>
                <a href={waUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-kayu">
                  <IkonWhatsapp className="w-4 h-4 text-daun" />
                  {teleponTampil(pengaturan.whatsapp)}
                </a>
              </li>
            )}
            <li className="flex items-start gap-2">
              <IkonJam className="w-4 h-4 mt-1 shrink-0" />
              <span>
                Dapur {jamTampil(pengaturan.jamBuka)}–{jamTampil(pengaturan.jamTutup)} WIB
              </span>
            </li>
            {pengaturan.alamat && (
              <li className="flex items-start gap-2">
                <IkonLokasi className="w-4 h-4 mt-1 shrink-0" />
                <span>{pengaturan.alamat}</span>
              </li>
            )}
          </ul>
        </div>

        <div className="space-y-3 text-[15px]">
          <h2 className="font-bold text-kayu">Belanja</h2>
          <ul className="space-y-2.5 text-kayu-sedang">
            <li><Link href="/menu" className="hover:text-kayu">Semua menu</Link></li>
            <li><Link href="/keranjang" className="hover:text-kayu">Keranjang</Link></li>
            <li><Link href="/lacak" className="hover:text-kayu">Lacak pesanan</Link></li>
          </ul>
        </div>

        <div className="space-y-3 text-[15px]">
          <h2 className="font-bold text-kayu">Akun</h2>
          <ul className="space-y-2.5 text-kayu-sedang">
            <li><Link href="/riwayat" className="hover:text-kayu">Pesanan saya</Link></li>
            <li><Link href="/akun" className="hover:text-kayu">Akun &amp; pengaturan</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-krem-gelap">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 flex flex-col lg:flex-row items-center justify-between gap-4 text-[14px] text-kayu-sedang">
          <SakelarTeks ringkas />
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            <span>&copy; {new Date().getFullYear()} {pengaturan.namaUsaha}</span>
            <Link href="/kebijakan-privasi" className="hover:text-kayu">Kebijakan privasi</Link>
            <Link href="/syarat-ketentuan" className="hover:text-kayu">Syarat &amp; ketentuan</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
