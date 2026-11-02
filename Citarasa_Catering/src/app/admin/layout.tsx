import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { bacaSesi, sandiDitandaiLemah } from "@/lib/auth";
import { ambilDenyut } from "@/lib/denyut";
import { ambilPengaturan } from "@/lib/pengaturan";
import { Wordmark } from "@/components/Wordmark";
import { TombolKeluar } from "@/components/TombolKeluar";
import { NavAdmin } from "@/components/admin/NavAdmin";
import { PemantauPesanan, TombolBunyi } from "@/components/admin/PemantauPesanan";
import { IkonCari, IkonPeringatan } from "@/components/ikon/Ikon";

export const metadata: Metadata = {
  title: { default: "Dapur", template: "%s — Dapur Citarasa" },
  robots: { index: false, follow: false },
};

/** Cari pesanan dari mana saja di dashboard — jalan pintas ke Semua pesanan. */
function CariPesanan({ id, gelap = false }: { id: string; gelap?: boolean }) {
  return (
    <form method="get" action="/admin/pesanan" role="search" className="relative">
      <label htmlFor={id} className="sr-only">
        Cari pesanan
      </label>
      <IkonCari
        className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${gelap ? "text-beras/55" : "text-arang-sedang"}`}
      />
      <input
        id={id}
        type="search"
        name="q"
        maxLength={60}
        enterKeyHint="search"
        autoComplete="off"
        placeholder="Cari kode, nama, nomor HP"
        className={`w-full h-10 pl-9 pr-3 rounded-[9px] text-[15px] focus:outline-none focus:ring-2 ${
          gelap
            ? "bg-white/8 border border-white/15 text-beras placeholder:text-beras/45 focus:border-kunyit-terang focus:ring-kunyit-terang/25"
            : "bg-beras border border-beras-gelap text-arang placeholder:text-arang-sedang/60 focus:border-pandan focus:ring-pandan/15"
        }`}
      />
    </form>
  );
}

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const sesi = await bacaSesi();

  if (!sesi) redirect("/masuk?ke=/admin");
  if (sesi.peran !== "PEMILIK" && sesi.peran !== "STAF_DAPUR") redirect("/riwayat");

  const pemilik = sesi.peran === "PEMILIK";
  const labelPeran = pemilik ? "Pemilik" : "Staf dapur";
  const [denyutAwal, pengaturan, sandiLemah] = await Promise.all([
    ambilDenyut(pemilik),
    ambilPengaturan(),
    sandiDitandaiLemah(),
  ]);
  const inisial = sesi.nama.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[256px_1fr] bg-beras">
      <PemantauPesanan awal={denyutAwal} />

      {/* Sidebar (layar lebar): ruang kerja dapur berwarna merek, terpisah jelas dari toko */}
      <aside className="jangan-cetak hidden lg:flex lg:flex-col sticky top-0 h-screen permukaan-pandan px-3 py-5">
        <div className="px-2 flex items-center justify-between gap-2">
          <Wordmark href="/admin" nama={pengaturan.namaUsaha} compact label="Dapur" terbalik kelasTeks="flex" />
          <TombolBunyi className="!w-9 !h-9 !text-beras/75 hover:!text-beras hover:!bg-white/10" />
        </div>
        <div className="mt-5 px-1">
          <CariPesanan id="cari-pesanan-samping" gelap />
        </div>
        <div className="mt-5 flex-1 overflow-y-auto gulir-tipis -mx-1 px-1">
          <NavAdmin peran={sesi.peran} arah="vertikal" />
        </div>
        <div className="mt-4 pt-4 border-t border-white/12 px-2 space-y-3">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="w-9 h-9 shrink-0 rounded-full bg-kunyit-terang text-arang font-tampil font-extrabold flex items-center justify-center"
            >
              {inisial}
            </span>
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-beras truncate">{sesi.nama}</p>
              <p className="font-presisi text-[11.5px] uppercase tracking-[0.1em] text-beras/60">{labelPeran}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Link href="/" className="text-[14px] font-medium text-beras/70 hover:text-kunyit-terang" target="_blank">
              Lihat toko ↗
            </Link>
            <TombolKeluar className="tombol-kecil -mr-2 !text-beras/75 hover:!text-beras hover:!bg-white/10" />
          </div>
        </div>
      </aside>

      {/* Bar atas (ponsel & tablet) */}
      <header className="jangan-cetak lg:hidden sticky top-0 z-40">
        <div className="permukaan-pandan px-4 h-14 flex items-center justify-between gap-2">
          <Wordmark href="/admin" nama={pengaturan.namaUsaha} compact label="Dapur" terbalik kelasTeks="hidden min-[380px]:flex" />
          <div className="flex items-center gap-1">
            <TombolBunyi className="!text-beras/80 hover:!text-beras hover:!bg-white/10" />
            <TombolKeluar className="tombol-kecil !text-beras/80 hover:!text-beras hover:!bg-white/10" label="" />
          </div>
        </div>
        <div className="bg-white/95 backdrop-blur border-b border-beras-gelap">
          <div className="px-3 pt-2.5">
            <CariPesanan id="cari-pesanan-atas" />
          </div>
          <div className="px-3 py-2.5 overflow-x-auto tanpa-scrollbar">
            <NavAdmin peran={sesi.peran} arah="horizontal" />
          </div>
        </div>
      </header>

      <main id="isi" className="min-w-0 px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
        <div className="mx-auto max-w-[1400px]">
          {sandiLemah && (
            <div role="alert" className="jangan-cetak mb-6 kotak-galat flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-start gap-2">
                <IkonPeringatan className="w-5 h-5 mt-0.5 shrink-0" />
                <span>
                  <span className="font-bold">Kata sandi akun ini mudah ditebak</span> (sandi contoh atau nomor HP). Siapa pun
                  yang membaca dokumentasi bisa masuk ke dashboard ini.
                </span>
              </p>
              <Link href={pemilik ? "/admin/pengaturan#ganti-sandi" : "/akun"} className="tombol-bahaya tombol-kecil">
                Ganti sekarang
              </Link>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
