"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Peran } from "@/generated/prisma/client";
import { IkonKeranjang, IkonMangkuk, IkonNota, IkonPengguna, IkonRumah } from "@/components/ikon/Ikon";

interface NavBawahTokoProps {
  peran: Peran | null;
}

/**
 * Navigasi bawah untuk ponsel (< 640px).
 *
 * Pembeli memegang HP dengan satu tangan; kepala halaman berada di luar
 * jangkauan jempol, sedangkan bilah bawah tidak. Polanya sama dengan aplikasi
 * belanja & pesan-antar yang sudah akrab bagi pembeli Indonesia, jadi tidak
 * perlu dipelajari. Semua tujuan terlihat — tidak ada yang disembunyikan di
 * balik ikon tiga garis.
 *
 * Disembunyikan di /pesan: formulir itu punya bilah total sendiri di posisi
 * yang sama, dan saat checkout pembeli sebaiknya tidak terdistraksi.
 */
export function NavBawahToko({ peran }: NavBawahTokoProps) {
  const pathname = usePathname();
  if (pathname === "/pesan") return null;

  const akun =
    peran === "PEMILIK" || peran === "STAF_DAPUR"
      ? { href: "/admin", label: "Dapur", cocok: ["/admin"] }
      : peran
      ? { href: "/riwayat", label: "Pesananku", cocok: ["/riwayat"] }
      : { href: "/masuk", label: "Masuk", cocok: ["/masuk", "/daftar"] };

  const cocok = (awalan: string[]) =>
    awalan.some((a) => (a === "/" ? pathname === "/" : pathname === a || pathname.startsWith(`${a}/`)));

  const tautan = [
    { href: "/", label: "Beranda", Ikon: IkonRumah, aktif: cocok(["/"]) },
    { href: "/menu", label: "Menu", Ikon: IkonMangkuk, aktif: cocok(["/menu"]) },
    null, // slot tombol Pesan di tengah
    { href: "/lacak", label: "Lacak", Ikon: IkonNota, aktif: cocok(["/lacak", "/pesanan"]) },
    { href: akun.href, label: akun.label, Ikon: IkonPengguna, aktif: cocok(akun.cocok) },
  ];

  return (
    <>
      {/* Pengganjal setinggi bilah supaya footer tidak tertutup. Di layar
          pendek (HP mendatar, zoom 400%) bilah tidak menempel sehingga
          pengganjalnya juga tidak perlu. */}
      <div aria-hidden="true" className="sm:hidden h-16 aman-bawah box-content [@media(max-height:500px)]:hidden" />
      <nav
        aria-label="Navigasi utama"
        className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-krem-gelap aman-bawah shadow-[0_-4px_16px_-8px_rgba(43,33,27,0.12)] [@media(max-height:500px)]:static"
      >
        <ul className="grid grid-cols-5 h-16 [@media(max-height:500px)]:h-auto [@media(max-height:500px)]:py-1">
          {tautan.map((t) =>
            t === null ? (
              <li key="pesan" className="flex justify-center">
                <Link
                  href="/pesan"
                  className="group -mt-5 flex flex-col items-center gap-1 text-[11px] font-semibold text-bata-tua [@media(max-height:500px)]:mt-1"
                >
                  <span className="w-14 h-14 rounded-full bg-bata text-white flex items-center justify-center shadow-[0_6px_16px_-4px_rgba(194,70,28,0.55)] ring-4 ring-white transition-transform group-active:scale-95">
                    <IkonKeranjang className="w-6 h-6" strokeWidth={2} />
                  </span>
                  Pesan
                </Link>
              </li>
            ) : (
              <li key={t.href}>
                <Link
                  href={t.href}
                  aria-current={t.aktif ? "page" : undefined}
                  className={`relative h-full flex flex-col items-center justify-center gap-1 text-[11px] transition-colors ${
                    t.aktif ? "text-bata-tua font-semibold" : "text-kayu-sedang font-medium active:text-kayu"
                  }`}
                >
                  {/* Penanda aktif berbentuk garis, bukan hanya beda warna:
                      label aktif & tidak aktif nyaris sama bagi pembeli buta
                      warna merah-hijau (WCAG 1.4.1). */}
                  {t.aktif && (
                    <span aria-hidden="true" className="absolute top-0 inset-x-4 h-[3px] rounded-b-full bg-bata" />
                  )}
                  <span
                    className={`flex items-center justify-center w-12 h-7 rounded-full transition-colors ${
                      t.aktif ? "bg-bata-lembut" : ""
                    }`}
                  >
                    <t.Ikon className="w-[22px] h-[22px]" strokeWidth={t.aktif ? 2.1 : 1.75} />
                  </span>
                  {t.label}
                </Link>
              </li>
            )
          )}
        </ul>
      </nav>
    </>
  );
}
