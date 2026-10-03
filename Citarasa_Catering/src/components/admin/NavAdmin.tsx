"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Peran } from "@/generated/prisma/client";
import {
  IkonArsip,
  IkonDompet,
  IkonGrafik,
  IkonKeranjang,
  IkonLaporan,
  IkonMangkuk,
  IkonMenuGaris,
  IkonPanci,
  IkonPapan,
  IkonPengaturan,
  IkonTiket,
  IkonTutup,
} from "@/components/ikon/Ikon";

type Tautan = { href: string; label: string; Ikon: typeof IkonPapan; persis?: boolean; hanyaPemilik?: boolean };

const KELOMPOK: { judul: string; tautan: Tautan[] }[] = [
  {
    judul: "Operasional",
    tautan: [
      { href: "/admin", label: "Papan pesanan", Ikon: IkonPapan, persis: true },
      { href: "/admin/pesanan", label: "Semua pesanan", Ikon: IkonArsip },
      { href: "/admin/produksi", label: "Produksi & belanja", Ikon: IkonPanci },
    ],
  },
  {
    judul: "Usaha",
    tautan: [
      { href: "/admin/menu", label: "Menu", Ikon: IkonMangkuk, hanyaPemilik: true },
      { href: "/admin/bahan", label: "Bahan & resep", Ikon: IkonKeranjang, hanyaPemilik: true },
      { href: "/admin/voucher", label: "Voucher", Ikon: IkonTiket, hanyaPemilik: true },
    ],
  },
  {
    judul: "Keuangan",
    tautan: [
      { href: "/admin/keuangan", label: "Buku kas", Ikon: IkonDompet, hanyaPemilik: true },
      { href: "/admin/laporan", label: "Laporan & insight", Ikon: IkonLaporan, hanyaPemilik: true },
    ],
  },
  {
    judul: "Lainnya",
    tautan: [
      { href: "/admin/analitik", label: "Pengunjung", Ikon: IkonGrafik, hanyaPemilik: true },
      { href: "/admin/pengaturan", label: "Pengaturan", Ikon: IkonPengaturan, hanyaPemilik: true },
    ],
  },
];

function aktifUntuk(pathname: string, t: Tautan) {
  if (t.persis) return pathname === t.href;
  return pathname === t.href || pathname.startsWith(`${t.href}/`);
}

function saring(peran?: Peran) {
  return KELOMPOK.map((k) => ({ ...k, tautan: k.tautan.filter((t) => peran !== "STAF_DAPUR" || !t.hanyaPemilik) })).filter(
    (k) => k.tautan.length > 0
  );
}

/** Sidebar vertikal untuk layar lebar, dikelompokkan per area kerja. */
export function NavAdmin({ peran }: { peran?: Peran }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigasi dashboard" className="space-y-6">
      {saring(peran).map((k) => (
        <div key={k.judul}>
          <p className="px-3 mb-1.5 text-[11px] font-medium uppercase tracking-wide text-kayu-sedang/70">{k.judul}</p>
          <ul className="space-y-0.5">
            {k.tautan.map((t) => {
              const aktif = aktifUntuk(pathname, t);
              return (
                <li key={t.href}>
                  <Link
                    href={t.href}
                    aria-current={aktif ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      aktif ? "bg-bata-lembut text-bata-tua" : "text-kayu-sedang hover:text-kayu hover:bg-krem-tua"
                    }`}
                  >
                    <t.Ikon className="w-[18px] h-[18px] shrink-0" />
                    {t.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/**
 * Bilah tab bawah untuk ponsel: tiga tujuan harian + "Lainnya" yang membuka
 * lembar berisi semua menu. Baris geser horizontal dengan sepuluh tautan
 * menyembunyikan sebagian besar menu di luar layar.
 */
export function NavBawahAdmin({ peran }: { peran?: Peran }) {
  const pathname = usePathname();
  const [terbuka, setTerbuka] = useState(false);
  const utama = KELOMPOK[0].tautan;
  const lainnyaAktif = !utama.some((t) => aktifUntuk(pathname, t));

  useEffect(() => setTerbuka(false), [pathname]);
  useEffect(() => {
    if (!terbuka) return;
    const tutup = (e: KeyboardEvent) => e.key === "Escape" && setTerbuka(false);
    window.addEventListener("keydown", tutup);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", tutup);
      document.body.style.overflow = "";
    };
  }, [terbuka]);

  return (
    <>
      <nav
        aria-label="Navigasi utama dashboard"
        className="lg:hidden print:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-krem-gelap"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-4">
          {utama.map((t) => {
            const aktif = aktifUntuk(pathname, t);
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  aria-current={aktif ? "page" : undefined}
                  className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${aktif ? "text-bata-tua" : "text-kayu-sedang"}`}
                >
                  <t.Ikon className="w-5 h-5" />
                  {t.label.split(" ")[0]}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setTerbuka(true)}
              aria-expanded={terbuka}
              aria-controls="lembar-menu-admin"
              className={`w-full flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium cursor-pointer ${lainnyaAktif ? "text-bata-tua" : "text-kayu-sedang"}`}
            >
              <IkonMenuGaris className="w-5 h-5" />
              Lainnya
            </button>
          </li>
        </ul>
      </nav>

      {terbuka && (
        <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Semua menu dashboard" id="lembar-menu-admin">
          <button type="button" aria-label="Tutup" onClick={() => setTerbuka(false)} className="absolute inset-0 bg-kayu/30" />
          <div className="absolute bottom-0 inset-x-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-5 anim-masuk" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
            <div className="flex items-center justify-between mb-4">
              <p className="judul-bagian">Menu</p>
              <button type="button" onClick={() => setTerbuka(false)} className="tombol-hantu tombol-kecil" aria-label="Tutup menu">
                <IkonTutup className="w-5 h-5" />
              </button>
            </div>
            <NavAdmin peran={peran} />
          </div>
        </div>
      )}
    </>
  );
}
