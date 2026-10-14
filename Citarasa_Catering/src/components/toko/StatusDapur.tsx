"use client";

import { useEffect, useState } from "react";
import { jamTampil, sedangBuka } from "@/lib/format";

interface StatusDapurProps {
  jamBuka: string;
  jamTutup: string;
  /** Status saat halaman dirender di server; menjadi nilai awal di browser. */
  bukaAwal: boolean;
  /** Tampilkan jam tutup juga ("· s/d 23.00"). Dimatikan di layar sempit. */
  lengkap?: boolean;
  /**
   * Wajib membawa nilai display-nya sendiri (bawaan "inline-flex"). Kalau
   * display ditanam di kelas dasar, `hidden md:inline-flex` dari pemanggil
   * kalah urutan CSS dan lencananya muncul dobel di ponsel.
   */
  className?: string;
}

/**
 * Lencana "Dapur buka / Buka pukul 16.00" di kepala halaman.
 *
 * Pembeli catering memesan untuk hari lain, jadi status ini bukan penghalang
 * memesan — gunanya memberi tahu kapan chat WhatsApp akan dibalas. Karena itu
 * saat tutup nadanya netral (abu hangat), bukan merah yang terbaca "jangan".
 *
 * Komponen klien yang menghitung ulang tiap menit: lencana ini hidup di layout
 * toko, dan layout TIDAK dirender ulang saat pembeli berpindah halaman lewat
 * tautan. Kalau hanya dihitung di server, lencana yang dimuat pukul 22.50
 * tetap berbunyi "Dapur buka" lewat pukul 23.00. Nilai awal datang dari server
 * supaya HTML awal & hidrasi selalu sama; `sedangBuka` memakai WIB lewat Intl,
 * jadi hasilnya sama di server maupun di HP pembeli di zona mana pun.
 */
export function StatusDapur({
  jamBuka,
  jamTutup,
  bukaAwal,
  lengkap = false,
  className = "inline-flex",
}: StatusDapurProps) {
  const [buka, setBuka] = useState(bukaAwal);

  useEffect(() => {
    const perbarui = () => setBuka(sedangBuka(jamBuka, jamTutup));
    perbarui();
    const pewaktu = setInterval(perbarui, 60_000);
    return () => clearInterval(pewaktu);
  }, [jamBuka, jamTutup]);

  const nonstop = jamBuka === jamTutup;
  // Versi ringkas untuk kepala ponsel: di layar 320px teks panjang
  // "Buka pukul 16.00" bertabrakan dengan nama toko.
  const teks = nonstop
    ? "Buka 24 jam"
    : buka
    ? `Dapur buka${lengkap ? ` · s/d ${jamTampil(jamTutup)}` : ""}`
    : `${lengkap ? "Buka pukul" : "Buka"} ${jamTampil(jamBuka)}`;

  return (
    <span
      className={`min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        buka ? "bg-daun-lembut text-daun-tua" : "bg-krem-tua text-kayu-sedang"
      } ${className}`}
      title={
        buka
          ? `Dapur buka ${jamTampil(jamBuka)}–${jamTampil(jamTutup)} WIB. Chat WhatsApp dibalas cepat.`
          : `Dapur sedang tutup, buka lagi pukul ${jamTampil(jamBuka)} WIB. Pesanan tetap bisa dikirim dan dikonfirmasi saat dapur buka.`
      }
    >
      <span aria-hidden="true" className="relative flex w-2 h-2 shrink-0">
        {/* key: denyut diputar ulang setiap kali dapur berubah menjadi buka. */}
        {buka && <span key="denyut" className="absolute inset-0 rounded-full bg-daun opacity-60 denyut-singkat" />}
        <span className={`relative w-2 h-2 rounded-full ${buka ? "bg-daun" : "bg-kayu-sedang/50"}`} />
      </span>
      <span className="truncate">{teks}</span>
    </span>
  );
}
