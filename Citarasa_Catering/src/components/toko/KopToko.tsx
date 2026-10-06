import { bacaSesi } from "@/lib/auth";
import { ambilPengaturan } from "@/lib/pengaturan";
import { linkWhatsapp } from "@/lib/format";
import { Wordmark } from "@/components/Wordmark";
import { NavToko } from "@/components/toko/NavToko";
import { StatusDapur } from "@/components/toko/StatusDapur";
import { IkonWhatsapp } from "@/components/ikon/Ikon";

export async function KopToko() {
  const [sesi, pengaturan] = await Promise.all([bacaSesi(), ambilPengaturan()]);

  const waUrl = pengaturan.whatsapp
    ? linkWhatsapp(pengaturan.whatsapp, `Halo ${pengaturan.namaUsaha}, saya mau tanya soal pesanan.`)
    : null;

  return (
    <header className="sticky top-0 z-40 bg-krem/90 backdrop-blur-md border-b border-krem-gelap/70">
      <a
        href="#isi"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 tombol-kedua tombol-kecil"
      >
        Lompat ke isi
      </a>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Wordmark href="/" compact />
          <StatusDapur
            jamBuka={pengaturan.jamBuka}
            jamTutup={pengaturan.jamTutup}
            lengkap
            className="hidden md:inline-flex"
          />
        </div>

        {/* Layar lebar: tautan di kanan atas. Ponsel memakai NavBawahToko. */}
        <NavToko peran={sesi?.peran ?? null} className="hidden sm:flex" />

        <div className="flex sm:hidden items-center gap-2">
          <StatusDapur jamBuka={pengaturan.jamBuka} jamTutup={pengaturan.jamTutup} />
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat WhatsApp dapur"
              className="w-10 h-10 rounded-full flex items-center justify-center text-daun bg-white border border-krem-gelap active:bg-daun-lembut"
            >
              <IkonWhatsapp className="w-5 h-5" />
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
