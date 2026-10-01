import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { bacaSesi } from "@/lib/auth";
import { Wordmark } from "@/components/Wordmark";
import { TombolKeluar } from "@/components/TombolKeluar";
import { NavAdmin } from "@/components/admin/NavAdmin";

export const metadata: Metadata = {
  title: { default: "Dapur", template: "%s — Dapur Citarasa" },
  robots: { index: false, follow: false },
};

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const sesi = await bacaSesi();

  if (!sesi) redirect("/masuk");
  if (sesi.peran !== "PEMILIK" && sesi.peran !== "STAF_DAPUR") redirect("/riwayat");

  const labelPeran = sesi.peran === "STAF_DAPUR" ? "Staf dapur" : "Pemilik";

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[232px_1fr]">
      {/* Sidebar (layar lebar) */}
      <aside className="hidden lg:flex lg:flex-col sticky top-0 h-screen border-r border-krem-gelap bg-white px-3 py-5">
        <div className="px-2">
          <Wordmark href="/admin" compact label="Dapur" />
        </div>
        <div className="mt-8 flex-1 overflow-y-auto gulir-tipis">
          <NavAdmin peran={sesi.peran} arah="vertikal" />
        </div>
        <div className="mt-4 pt-4 border-t border-krem-gelap px-2 space-y-3">
          <div className="text-sm">
            <p className="font-medium text-kayu truncate">{sesi.nama}</p>
            <p className="text-xs text-kayu-sedang">{labelPeran}</p>
          </div>
          <div className="flex items-center justify-between">
            <Link href="/" className="text-xs text-kayu-sedang hover:text-kayu" target="_blank">
              Lihat toko ↗
            </Link>
            <TombolKeluar className="tombol-kecil -mr-2" />
          </div>
        </div>
      </aside>

      {/* Bar atas (ponsel & tablet) */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-krem-gelap">
        <div className="px-4 h-14 flex items-center justify-between">
          <Wordmark href="/admin" compact label="Dapur" />
          <TombolKeluar className="tombol-kecil" />
        </div>
        <div className="px-3 pb-2 overflow-x-auto tanpa-scrollbar">
          <NavAdmin peran={sesi.peran} arah="horizontal" />
        </div>
      </header>

      <main className="min-w-0 px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
        <div className="mx-auto max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}
