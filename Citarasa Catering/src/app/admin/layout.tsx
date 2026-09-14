import { redirect } from "next/navigation";
import Link from "next/link";
import { bacaSesi } from "@/lib/auth";
import { Wordmark } from "@/components/Wordmark";
import { TombolKeluar } from "@/components/TombolKeluar";

export default async function LayoutAdmin({
  children,
}: {
  children: React.ReactNode;
}) {
  const sesi = await bacaSesi();

  if (!sesi) {
    redirect("/masuk");
  }

  if (sesi.peran !== "PEMILIK") {
    redirect("/riwayat");
  }

  return (
    <div className="min-h-screen bg-krem flex flex-col">
      {/* Header Dapur Admin */}
      <header className="sticky top-0 z-40 bg-kayu text-krem border-b border-kayu-sedang shadow-md">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Wordmark href="/admin" compact={true} className="text-white" />
            <span className="text-xs font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-kunyit text-kayu">
              Dapur
            </span>
          </div>

          {/* Navigasi Admin Dapur - Tombol Besar & Jelas */}
          <nav
            aria-label="Navigasi Admin"
            className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1"
          >
            <Link
              href="/admin"
              className="min-h-[48px] px-3.5 sm:px-4 py-2 rounded-xl text-sm font-semibold text-krem hover:bg-kayu-sedang hover:text-white transition-colors inline-flex items-center"
            >
              🍳 Papan Pesanan
            </Link>

            <Link
              href="/admin/menu"
              className="min-h-[48px] px-3.5 sm:px-4 py-2 rounded-xl text-sm font-semibold text-krem hover:bg-kayu-sedang hover:text-white transition-colors inline-flex items-center"
            >
              🍱 Menu
            </Link>

            <Link
              href="/admin/keuangan"
              className="min-h-[48px] px-3.5 sm:px-4 py-2 rounded-xl text-sm font-semibold text-krem hover:bg-kayu-sedang hover:text-white transition-colors inline-flex items-center"
            >
              💰 Buku Kas
            </Link>

            <Link
              href="/admin/laporan"
              className="min-h-[48px] px-3.5 sm:px-4 py-2 rounded-xl text-sm font-semibold text-krem hover:bg-kayu-sedang hover:text-white transition-colors inline-flex items-center"
            >
              📊 Laporan
            </Link>

            <Link
              href="/admin/pengaturan"
              className="min-h-[48px] px-3.5 sm:px-4 py-2 rounded-xl text-sm font-semibold text-krem hover:bg-kayu-sedang hover:text-white transition-colors inline-flex items-center"
            >
              ⚙️ Pengaturan
            </Link>

            <div className="ml-2 pl-2 border-l border-kayu-sedang">
              <TombolKeluar label="Keluar" className="min-h-[42px] text-xs py-1.5" />
            </div>
          </nav>
        </div>
      </header>

      {/* Konten Utama Admin */}
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        {children}
      </main>
    </div>
  );
}

