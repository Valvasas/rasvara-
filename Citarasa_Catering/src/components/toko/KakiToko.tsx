import Link from "next/link";
import { ambilPengaturan } from "@/lib/pengaturan";
import { jamTampil, linkWhatsapp, teleponTampil } from "@/lib/format";
import { Wordmark } from "@/components/Wordmark";
import { IkonJam, IkonLokasi, IkonWhatsapp } from "@/components/ikon/Ikon";

export async function KakiToko() {
  const pengaturan = await ambilPengaturan();

  const waUrl = pengaturan.whatsapp
    ? linkWhatsapp(pengaturan.whatsapp, `Halo ${pengaturan.namaUsaha}, saya mau tanya soal pesanan.`)
    : null;

  return (
    <footer className="mt-auto bg-krem-tua/60">
      <div aria-hidden="true" className="h-1 pita-merek" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-12 grid gap-8 sm:gap-10 grid-cols-2 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="col-span-2 md:col-span-1 space-y-4 max-w-sm">
          <Wordmark href="/" tagline />
          {pengaturan.tagline && (
            <p className="text-sm text-kayu-sedang leading-relaxed">{pengaturan.tagline}</p>
          )}
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="tombol-kedua tombol-kecil min-h-[44px] px-4 text-sm whitespace-normal text-left max-w-full"
            >
              <IkonWhatsapp className="w-4 h-4 text-daun" />
              Tanya dapur via WhatsApp
            </a>
          )}
        </div>

        <div className="space-y-3 text-sm">
          <h2 className="font-semibold text-kayu">Kontak</h2>
          <ul className="space-y-2.5 text-kayu-sedang">
            {waUrl && (
              <li>
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-start gap-2 hover:text-kayu"
                >
                  <IkonWhatsapp className="w-4 h-4 mt-0.5 shrink-0 text-daun" />
                  {teleponTampil(pengaturan.whatsapp)}
                </a>
              </li>
            )}
            <li className="flex items-start gap-2">
              <IkonJam className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Dapur {jamTampil(pengaturan.jamBuka)}–{jamTampil(pengaturan.jamTutup)} WIB
              </span>
            </li>
            {pengaturan.alamat && (
              <li className="flex items-start gap-2">
                <IkonLokasi className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{pengaturan.alamat}</span>
              </li>
            )}
          </ul>
        </div>

        <div className="space-y-3 text-sm">
          <h2 className="font-semibold text-kayu">Pesanan</h2>
          <ul className="space-y-2.5 text-kayu-sedang">
            <li><Link href="/menu" className="hover:text-kayu">Lihat menu</Link></li>
            <li><Link href="/pesan" className="hover:text-kayu">Buat pesanan</Link></li>
            <li><Link href="/lacak" className="hover:text-kayu">Lacak pesanan</Link></li>
            <li><Link href="/riwayat" className="hover:text-kayu">Riwayat pesanan</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-krem-gelap">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-kayu-sedang">
          <p>&copy; {new Date().getFullYear()} {pengaturan.namaUsaha}</p>
          <div className="flex gap-5">
            <Link href="/kebijakan-privasi" className="hover:text-kayu">Kebijakan privasi</Link>
            <Link href="/syarat-ketentuan" className="hover:text-kayu">Syarat &amp; ketentuan</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
