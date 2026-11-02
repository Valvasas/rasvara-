"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Peran } from "@/generated/prisma/client";
import { useDenyut } from "@/components/admin/PemantauPesanan";
import {
  IkonArsip,
  IkonDompet,
  IkonGrafik,
  IkonLaporan,
  IkonMangkuk,
  IkonOrang,
  IkonPapan,
  IkonPengaturan,
  IkonRumah,
  IkonTiket,
  IkonWajan,
} from "@/components/ikon/Ikon";

type Tautan = {
  href: string;
  label: string;
  Ikon: typeof IkonPapan;
  persis?: boolean;
  hanyaPemilik?: boolean;
  lencana?: "baru" | "cekBayar";
};

/**
 * Dikelompokkan seperti Seller Centre marketplace: pekerjaan harian di atas,
 * pengaturan toko & uang di bawah. Penjual yang membuka dashboard di sela
 * memasak langsung menemukan tiga tombol yang paling sering ia tekan.
 */
const KELOMPOK: { judul: string; tautan: Tautan[] }[] = [
  {
    judul: "Operasional",
    tautan: [
      { href: "/admin", label: "Beranda", Ikon: IkonRumah, persis: true },
      { href: "/admin/papan", label: "Papan pesanan", Ikon: IkonPapan, lencana: "baru" },
      { href: "/admin/produksi", label: "Rekap masak", Ikon: IkonWajan },
      { href: "/admin/pesanan", label: "Semua pesanan", Ikon: IkonArsip, lencana: "cekBayar" },
    ],
  },
  {
    judul: "Toko",
    tautan: [
      { href: "/admin/menu", label: "Menu", Ikon: IkonMangkuk, hanyaPemilik: true },
      { href: "/admin/pelanggan", label: "Pelanggan", Ikon: IkonOrang, hanyaPemilik: true },
      { href: "/admin/voucher", label: "Voucher", Ikon: IkonTiket, hanyaPemilik: true },
    ],
  },
  {
    judul: "Keuangan",
    tautan: [
      { href: "/admin/keuangan", label: "Buku kas", Ikon: IkonDompet, hanyaPemilik: true },
      { href: "/admin/laporan", label: "Laporan", Ikon: IkonLaporan, hanyaPemilik: true },
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

/**
 * Navigasi dashboard. Satu daftar tautan dipakai dua kali: sebagai sidebar
 * berkelompok di layar lebar dan sebagai baris geser di ponsel.
 */
export function NavAdmin({ peran, arah }: { peran?: Peran; arah: "vertikal" | "horizontal" }) {
  const pathname = usePathname();
  const denyut = useDenyut();
  const boleh = (t: Tautan) => (peran === "STAF_DAPUR" ? !t.hanyaPemilik : true);
  const aktifkah = (t: Tautan) => (t.persis ? pathname === t.href : pathname === t.href || pathname.startsWith(`${t.href}/`));

  const Lencana = ({ jenis }: { jenis?: Tautan["lencana"] }) => {
    const n = jenis ? denyut[jenis] : 0;
    if (!n) return null;
    return (
      <span
        className={`ml-auto min-w-[22px] h-[22px] px-1.5 rounded-full font-presisi text-[12px] font-bold leading-[22px] text-center ${
          jenis === "baru" ? "bg-cabai text-white anim-masuk-skala" : "bg-kunyit text-arang"
        }`}
        aria-label={jenis === "baru" ? `${n} pesanan baru` : `${n} pembayaran perlu dicek`}
      >
        {n > 99 ? "99+" : n}
      </span>
    );
  };

  if (arah === "horizontal") {
    const semua = KELOMPOK.flatMap((k) => k.tautan).filter(boleh);
    return (
      <nav aria-label="Navigasi dashboard">
        <ul className="flex gap-1.5 w-max">
          {semua.map((t) => {
            const aktif = aktifkah(t);
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  aria-current={aktif ? "page" : undefined}
                  className={`flex items-center gap-2 min-h-[40px] px-3 rounded-full text-[14px] font-semibold whitespace-nowrap transition-colors ${
                    aktif ? "bg-pandan-gelap text-beras" : "bg-white border border-beras-gelap text-arang-sedang hover:text-arang"
                  }`}
                >
                  <t.Ikon className="w-[18px] h-[18px] shrink-0" />
                  {t.label}
                  <Lencana jenis={t.lencana} />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label="Navigasi dashboard" className="space-y-5">
      {KELOMPOK.map((k) => {
        const tautan = k.tautan.filter(boleh);
        if (tautan.length === 0) return null;
        return (
          <div key={k.judul}>
            <p className="px-3 mb-1.5 font-presisi text-[11px] font-medium uppercase tracking-[0.16em] text-kunyit-terang/85">{k.judul}</p>
            <ul className="space-y-0.5">
              {tautan.map((t) => {
                const aktif = aktifkah(t);
                return (
                  <li key={t.href}>
                    <Link
                      href={t.href}
                      aria-current={aktif ? "page" : undefined}
                      className={`relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[15px] font-semibold transition-colors ${
                        aktif ? "bg-white/12 text-beras" : "text-beras/70 hover:text-beras hover:bg-white/6"
                      }`}
                    >
                      {aktif && <span aria-hidden="true" className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-kunyit-terang" />}
                      <t.Ikon className="w-5 h-5 shrink-0" />
                      {t.label}
                      <Lencana jenis={t.lencana} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
