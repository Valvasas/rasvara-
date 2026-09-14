import Link from "next/link";
import { bacaSesi } from "@/lib/auth";
import { ambilPengaturan } from "@/lib/pengaturan";
import { jamTampil, sedangBuka } from "@/lib/format";
import { Wordmark } from "@/components/Wordmark";

export async function KopToko() {
  const [sesi, pengaturan] = await Promise.all([
    bacaSesi(),
    ambilPengaturan(),
  ]);

  const buka = sedangBuka(pengaturan.jamBuka, pengaturan.jamTutup);

  return (
    <header className="sticky top-0 z-40 bg-krem/95 backdrop-blur border-b border-krem-gelap/60 transition-all">
      {/* Baris pengumuman operasional atas */}
      <div className="bg-krem-tua/70 border-b border-krem-gelap/40 py-1.5 px-4 text-xs text-kayu-sedang flex items-center justify-between gap-2">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                buka ? "bg-daun animate-pulse" : "bg-bahaya"
              }`}
            />
            <span className="font-medium">
              {buka
                ? `Dapur Buka (${jamTampil(pengaturan.jamBuka)} - ${jamTampil(
                    pengaturan.jamTutup
                  )} WIB)`
                : `Dapur Istirahat (Buka ${jamTampil(pengaturan.jamBuka)} WIB)`}
            </span>
          </div>

          {pengaturan.whatsapp && (
            <a
              href={`https://wa.me/${pengaturan.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-bata font-medium hidden sm:inline-flex items-center gap-1"
            >
              <span>Tanya Dapur</span>
              <span aria-hidden="true">&rarr;</span>
            </a>
          )}
        </div>
      </div>

      {/* Navigasi Utama: Tanpa Menu Hamburger */}
      <div className="container mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Identitas Logo */}
        <Wordmark href="/" tagline={false} />

        {/* Menu Navigasi Langsung (Mudah disentuh, tanpa tersembunyi) */}
        <nav
          aria-label="Navigasi Utama"
          className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1"
        >
          <Link
            href="/menu"
            className="min-h-[48px] px-3.5 sm:px-4 py-2 rounded-xl text-sm font-semibold text-kayu hover:text-bata hover:bg-krem-tua transition-colors inline-flex items-center"
          >
            Menu
          </Link>

          <Link
            href="/pesan"
            className="min-h-[48px] px-3.5 sm:px-4 py-2 rounded-xl text-sm font-semibold text-white bg-bata hover:bg-bata-tua transition-colors inline-flex items-center shadow-sm"
          >
            Pesan
          </Link>

          <Link
            href="/lacak"
            className="min-h-[48px] px-3.5 sm:px-4 py-2 rounded-xl text-sm font-medium text-kayu hover:text-bata hover:bg-krem-tua transition-colors inline-flex items-center"
          >
            Lacak
          </Link>

          {sesi ? (
            sesi.peran === "PEMILIK" ? (
              <Link
                href="/admin"
                className="min-h-[48px] px-3.5 sm:px-4 py-2 rounded-xl text-sm font-bold text-kunyit-tua bg-kunyit-lembut border border-kunyit/30 hover:bg-kunyit/20 transition-colors inline-flex items-center"
              >
                Dapur Admin
              </Link>
            ) : (
              <Link
                href="/riwayat"
                className="min-h-[48px] px-3.5 sm:px-4 py-2 rounded-xl text-sm font-medium text-kayu hover:bg-krem-tua border border-krem-gelap inline-flex items-center"
              >
                Pesanan Saya
              </Link>
            )
          ) : (
            <Link
              href="/masuk"
              className="min-h-[48px] px-3.5 sm:px-4 py-2 rounded-xl text-sm font-medium text-kayu-sedang hover:text-kayu hover:bg-krem-tua transition-colors inline-flex items-center"
            >
              Masuk
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

