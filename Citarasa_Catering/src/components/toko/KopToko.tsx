import { bacaSesi } from "@/lib/auth";
import { ambilPengaturan } from "@/lib/pengaturan";
import { linkWhatsapp, sedangBuka } from "@/lib/format";
import { Wordmark } from "@/components/Wordmark";
import { NavToko } from "@/components/toko/NavToko";
import { StatusDapur } from "@/components/toko/StatusDapur";
import { IkonWhatsapp } from "@/components/ikon/Ikon";

export async function KopToko() {
  const [sesi, pengaturan] = await Promise.all([bacaSesi(), ambilPengaturan()]);

  const waUrl = pengaturan.whatsapp
    ? linkWhatsapp(pengaturan.whatsapp, `Halo ${pengaturan.namaUsaha}, saya mau tanya soal pesanan.`)
    : null;
  const bukaAwal = sedangBuka(pengaturan.jamBuka, pengaturan.jamTutup);

  return (
    // Di layar pendek (HP mendatar, zoom 400%) kepala tidak menempel: tiga
    // bilah menempel bisa memakan tiga perempat tinggi layar.
    <header className="sticky top-0 z-40 bg-krem/90 backdrop-blur-md border-b border-krem-gelap/70 [@media(max-height:500px)]:static">
      {/* Utilitas fokus ditulis eksplisit: `not-sr-only` (lapisan utilities)
          mereset padding & white-space milik kelas tombol (lapisan components). */}
      <a
        href="#isi"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:inline-flex focus:items-center focus:min-h-[40px] focus:px-4 focus:rounded-lg focus:whitespace-nowrap focus:bg-white focus:border focus:border-krem-gelap focus:text-sm focus:font-semibold focus:text-kayu focus:shadow-[var(--shadow-angkat)]"
      >
        Lompat ke isi
      </a>
      {/* min-h + flex-wrap: dengan teks diperbesar (setelan aksesibilitas HP)
          baris ini turun dua baris alih-alih meluber ke samping. */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 min-h-16 py-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex items-center gap-3 shrink-0">
          <Wordmark href="/" compact />
          <StatusDapur
            jamBuka={pengaturan.jamBuka}
            jamTutup={pengaturan.jamTutup}
            bukaAwal={bukaAwal}
            lengkap
            className="hidden md:inline-flex"
          />
        </div>

        {/* Layar lebar: tautan di kanan atas. Ponsel memakai NavBawahToko. */}
        <NavToko peran={sesi?.peran ?? null} className="hidden sm:flex" />

        {/* Ponsel: grup kanan yang boleh menyusut — lencana memotong teksnya
            sendiri (…) daripada menabrak nama toko di layar 320px. */}
        <div className="flex sm:hidden min-w-0 items-center justify-end gap-2">
          <StatusDapur jamBuka={pengaturan.jamBuka} jamTutup={pengaturan.jamTutup} bukaAwal={bukaAwal} />
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat WhatsApp dapur"
              className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-daun bg-white border border-krem-gelap active:bg-daun-lembut"
            >
              <IkonWhatsapp className="w-5 h-5" />
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
