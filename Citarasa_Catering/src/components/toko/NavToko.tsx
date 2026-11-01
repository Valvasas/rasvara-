"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { Peran } from "@/generated/prisma/client";
import { Wordmark } from "@/components/Wordmark";
import {
  IkonCari,
  IkonKeranjang,
  IkonPengguna,
  IkonRumah,
  IkonStruk,
  IkonMangkuk,
  IkonPapan,
} from "@/components/ikon/Ikon";
import { useJumlahBarisKeranjang } from "@/lib/keranjang";

interface NavTokoProps {
  peran: Peran | null;
  nama: string | null;
}

const RUTE_DENGAN_CARI = (p: string) => p === "/" || p === "/menu" || p.startsWith("/menu/");

/** Kolom cari ala marketplace — terhubung ke katalog lewat ?q=. */
function KolomCari({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const nilaiAwal = pathname === "/menu" ? (params.get("q") ?? "") : "";

  return (
    <form method="get" action="/menu" role="search" className={`relative ${className}`}>
      <label htmlFor="cari-global" className="sr-only">
        Cari menu
      </label>
      <IkonCari className="w-[18px] h-[18px] text-kayu-sedang absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        // key: kolom ikut berganti isi saat pembeli berpindah pencarian lewat tombol kembali.
        key={nilaiAwal}
        id="cari-global"
        type="search"
        name="q"
        defaultValue={nilaiAwal}
        maxLength={60}
        enterKeyHint="search"
        autoComplete="off"
        placeholder="Cari nasi kotak, tumpeng…"
        className="w-full h-11 pl-10 pr-4 rounded-full border-[1.5px] border-krem-gelap bg-white text-base text-kayu placeholder:text-kayu-sedang/60 transition-colors hover:border-kayu-sedang/30 focus:outline-none focus:border-bata focus:ring-4 focus:ring-bata/12"
      />
    </form>
  );
}

/** Ikon keranjang dengan lencana yang "melompat" setiap kali isinya bertambah. */
function TombolKeranjang() {
  const jumlah = useJumlahBarisKeranjang();
  const pathname = usePathname();
  const sebelumnya = useRef(jumlah);
  const [denyut, setDenyut] = useState(0);

  useEffect(() => {
    if (jumlah > sebelumnya.current) setDenyut((d) => d + 1);
    sebelumnya.current = jumlah;
  }, [jumlah]);

  const aktif = pathname === "/keranjang";
  return (
    <Link
      href="/keranjang"
      aria-label={jumlah > 0 ? `Keranjang, ${jumlah} menu` : "Keranjang, kosong"}
      aria-current={aktif ? "page" : undefined}
      className={`relative tombol-ikon ${aktif ? "text-bata bg-bata-lembut" : ""}`}
    >
      <span key={`ikon-${denyut}`} className={denyut ? "anim-goyang inline-flex" : "inline-flex"}>
        <IkonKeranjang className="w-6 h-6" />
      </span>
      {jumlah > 0 && (
        <span key={`angka-${denyut}`} className={`lencana-angka ${denyut ? "anim-lompat" : ""}`}>
          {jumlah > 99 ? "99+" : jumlah}
        </span>
      )}
    </Link>
  );
}

function TautanAkun({ peran, nama }: NavTokoProps) {
  const pathname = usePathname();
  if (peran === "PEMILIK" || peran === "STAF_DAPUR") {
    return (
      <Link href="/admin" className="tombol-utama tombol-kecil">
        <IkonPapan className="w-4 h-4" />
        Dashboard
      </Link>
    );
  }
  if (peran) {
    const inisial = (nama ?? "?").trim().charAt(0).toUpperCase() || "?";
    return (
      <Link
        href="/akun"
        aria-current={pathname === "/akun" ? "page" : undefined}
        className="inline-flex items-center gap-2 min-h-[44px] pl-1.5 pr-3 rounded-full hover:bg-krem-tua transition-colors"
      >
        <span aria-hidden="true" className="w-8 h-8 rounded-full bg-kunyit-lembut text-kunyit-tua font-bold flex items-center justify-center">
          {inisial}
        </span>
        <span className="text-[15px] font-semibold text-kayu">Akun</span>
      </Link>
    );
  }
  const ke = pathname && !/^\/(masuk|daftar)/.test(pathname) ? `?ke=${encodeURIComponent(pathname)}` : "";
  return (
    <span className="flex items-center gap-2">
      <Link href={`/masuk${ke}`} className="tombol-kedua tombol-kecil">
        Masuk
      </Link>
      <Link href={`/daftar${ke}`} className="tombol-utama tombol-kecil hidden lg:inline-flex">
        Daftar
      </Link>
    </span>
  );
}

/**
 * Kepala toko. Susunannya sengaja meniru marketplace yang sudah dihafal jempol
 * pembeli Indonesia: logo di kiri, kolom cari lebar di tengah, keranjang &
 * akun di kanan. Di ponsel, navigasi utama pindah ke bar bawah (NavBawah).
 */
export function NavToko({ peran, nama }: NavTokoProps) {
  const pathname = usePathname();
  const cariDiPonsel = RUTE_DENGAN_CARI(pathname);
  const aktif = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const kelasTautan = (href: string) =>
    `inline-flex items-center min-h-[44px] px-3 rounded-lg text-[15px] font-semibold transition-colors ${
      aktif(href) ? "text-bata-tua bg-bata-lembut" : "text-kayu-sedang hover:text-kayu hover:bg-krem-tua"
    }`;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center gap-2 sm:gap-4">
      <Wordmark href="/" compact kelasTeks={cariDiPonsel ? "hidden sm:flex" : "flex"} />

      <Suspense fallback={<div className={`flex-1 h-11 ${cariDiPonsel ? "" : "hidden md:block"}`} />}>
        <KolomCari className={`flex-1 md:max-w-md lg:max-w-lg md:mx-auto ${cariDiPonsel ? "" : "hidden md:block"}`} />
      </Suspense>
      {!cariDiPonsel && <span className="flex-1 md:hidden" />}

      <nav aria-label="Navigasi utama" className="hidden md:flex items-center gap-1">
        <Link href="/menu" aria-current={aktif("/menu") ? "page" : undefined} className={kelasTautan("/menu")}>
          Menu
        </Link>
        <Link href="/lacak" aria-current={aktif("/lacak") ? "page" : undefined} className={kelasTautan("/lacak")}>
          Lacak pesanan
        </Link>
        {peran === "PELANGGAN" && (
          <Link href="/riwayat" aria-current={aktif("/riwayat") ? "page" : undefined} className={kelasTautan("/riwayat")}>
            Pesanan saya
          </Link>
        )}
      </nav>

      <TombolKeranjang />

      <div className="hidden md:block">
        <TautanAkun peran={peran} nama={nama} />
      </div>
    </div>
  );
}

/** Halaman yang punya bar aksi sendiri di bawah — bar navigasi disembunyikan di sana. */
function punyaBarAksiSendiri(p: string) {
  return p === "/pesan" || p === "/keranjang" || (p.startsWith("/menu/") && p.length > 6);
}

/**
 * Bar navigasi bawah untuk ponsel — lima tab dengan ikon + label, persis pola
 * aplikasi belanja. Label selalu tampil (bukan ikon saja) karena pembeli yang
 * lebih tua tidak boleh dipaksa menebak arti ikon.
 */
export function NavBawah({ peran }: { peran: Peran | null }) {
  const pathname = usePathname();
  const jumlah = useJumlahBarisKeranjang();
  if (punyaBarAksiSendiri(pathname)) return null;

  const dapur = peran === "PEMILIK" || peran === "STAF_DAPUR";
  const tab = [
    { href: "/", label: "Beranda", Ikon: IkonRumah, persis: true },
    { href: "/menu", label: "Menu", Ikon: IkonMangkuk, persis: false },
    { href: "/keranjang", label: "Keranjang", Ikon: IkonKeranjang, persis: true },
    { href: "/riwayat", label: "Pesanan", Ikon: IkonStruk, persis: false },
    dapur
      ? { href: "/admin", label: "Dashboard", Ikon: IkonPapan, persis: false }
      : { href: "/akun", label: "Akun", Ikon: IkonPengguna, persis: false },
  ];

  return (
    <>
      {/* Pengganjal: konten terbawah tidak boleh tertutup bar. */}
      <div aria-hidden="true" className="md:hidden h-[calc(4.25rem+env(safe-area-inset-bottom))]" />
      <nav
        aria-label="Navigasi bawah"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-krem-gelap shadow-[var(--shadow-mengambang)] aman-bawah"
        style={{ viewTransitionName: "nav-bawah" }}
      >
        <ul className="grid grid-cols-5">
          {tab.map(({ href, label, Ikon, persis }) => {
            const aktif = persis ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={aktif ? "page" : undefined}
                  className={`relative flex flex-col items-center justify-center gap-0.5 h-[3.75rem] text-[12.5px] transition-colors active:scale-95 ${
                    aktif ? "text-bata-tua font-bold" : "text-kayu-sedang font-medium"
                  }`}
                >
                  {aktif && (
                    <span aria-hidden="true" className="absolute top-0 h-[3px] w-8 rounded-b-full bg-bata anim-masuk-skala" />
                  )}
                  <span className={`relative flex items-center justify-center w-12 h-7 rounded-full transition-colors ${aktif ? "bg-bata-lembut" : ""}`}>
                    <Ikon className="w-[22px] h-[22px]" strokeWidth={aktif ? 2.2 : 1.75} />
                    {href === "/keranjang" && jumlah > 0 && (
                      <span className="lencana-angka !top-[-6px] !right-0">{jumlah > 99 ? "99+" : jumlah}</span>
                    )}
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
