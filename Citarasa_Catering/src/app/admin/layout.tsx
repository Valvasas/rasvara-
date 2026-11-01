import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { bacaSesi } from "@/lib/auth";
import { ambilDenyut } from "@/lib/denyut";
import { Wordmark } from "@/components/Wordmark";
import { TombolKeluar } from "@/components/TombolKeluar";
import { NavAdmin } from "@/components/admin/NavAdmin";
import { PemantauPesanan, TombolBunyi } from "@/components/admin/PemantauPesanan";

export const metadata: Metadata = {
  title: { default: "Dapur", template: "%s — Dapur Citarasa" },
  robots: { index: false, follow: false },
};

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const sesi = await bacaSesi();

  if (!sesi) redirect("/masuk?ke=/admin");
  if (sesi.peran !== "PEMILIK" && sesi.peran !== "STAF_DAPUR") redirect("/riwayat");

  const labelPeran = sesi.peran === "STAF_DAPUR" ? "Staf dapur" : "Pemilik";
  const denyutAwal = await ambilDenyut(sesi.peran === "PEMILIK");
  const inisial = sesi.nama.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr] bg-krem">
      <PemantauPesanan awal={denyutAwal} />

      {/* Sidebar (layar lebar) */}
      <aside className="jangan-cetak hidden lg:flex lg:flex-col sticky top-0 h-screen border-r border-krem-gelap bg-white px-3 py-5">
        <div className="px-2 flex items-center justify-between">
          <Wordmark href="/admin" compact label="Dapur" />
          <TombolBunyi className="!w-10 !h-10" />
        </div>
        <div className="mt-7 flex-1 overflow-y-auto gulir-tipis -mx-1 px-1">
          <NavAdmin peran={sesi.peran} arah="vertikal" />
        </div>
        <div className="mt-4 pt-4 border-t border-krem-gelap px-2 space-y-3">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="w-9 h-9 shrink-0 rounded-full bg-kunyit-lembut text-kunyit-tua font-bold flex items-center justify-center">
              {inisial}
            </span>
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-kayu truncate">{sesi.nama}</p>
              <p className="text-[13px] text-kayu-sedang">{labelPeran}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Link href="/" className="text-[14px] font-medium text-kayu-sedang hover:text-kayu" target="_blank">
              Lihat toko ↗
            </Link>
            <TombolKeluar className="tombol-kecil -mr-2" />
          </div>
        </div>
      </aside>

      {/* Bar atas (ponsel & tablet) */}
      <header className="jangan-cetak lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-krem-gelap">
        <div className="px-4 h-14 flex items-center justify-between gap-2">
          <Wordmark href="/admin" compact label="Dapur" />
          <div className="flex items-center gap-1">
            <TombolBunyi />
            <TombolKeluar className="tombol-kecil" label="" />
          </div>
        </div>
        <div className="px-3 pb-2.5 overflow-x-auto tanpa-scrollbar">
          <NavAdmin peran={sesi.peran} arah="horizontal" />
        </div>
      </header>

      <main id="isi" className="min-w-0 px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
        <div className="mx-auto max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}
