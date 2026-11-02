"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { jamTampil, menitSekarangWib, sedangBuka } from "@/lib/format";
import { jamSiapTercepatHariIni, labelJamMenit } from "@/lib/jadwal";

interface PitaStatusDapurProps {
  jamBuka: string;
  jamTutup: string;
  jedaMenit: number;
  /** Dihitung server saat render — dipakai di render pertama supaya HTML server & klien sama. */
  awal: { buka: boolean; tercepat: number | null };
}

/**
 * Pita tipis di atas kepala toko: status dapur saat ini dan jam siap
 * paling cepat untuk hari ini, dalam huruf monospace.
 *
 * Ini perwujudan janji merek "cepat & tepat" di setiap halaman: pembeli tidak
 * perlu bertanya "bisa siap jam berapa?" — jawabannya tertulis, dihitung
 * dengan aturan yang sama persis dengan validasi pesanan di server.
 *
 * Kepala toko berada di layout (tidak dirender ulang saat berpindah halaman),
 * jadi angkanya dihitung ulang di klien tiap menit agar tidak basi.
 */
export function PitaStatusDapur({ jamBuka, jamTutup, jedaMenit, awal }: PitaStatusDapurProps) {
  const [status, setStatus] = useState(awal);

  useEffect(() => {
    const hitung = () =>
      setStatus({
        buka: sedangBuka(jamBuka, jamTutup),
        tercepat: jamSiapTercepatHariIni({ menitSekarang: menitSekarangWib(), jedaMenit }),
      });
    hitung();
    const id = window.setInterval(hitung, 60_000);
    return () => window.clearInterval(id);
  }, [jamBuka, jamTutup, jedaMenit]);

  return (
    <div className="bg-pandan-gelap text-beras">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-9 flex items-center gap-3 font-presisi text-[12.5px]">
        <p className="flex min-w-0 items-center gap-2 truncate" aria-live="polite">
          <span
            aria-hidden="true"
            className={`w-2 h-2 shrink-0 rounded-full ${status.buka ? "bg-pandan-terang anim-denyut" : "bg-beras/40"}`}
          />
          <span className="truncate">
            {status.buka ? "Dapur buka" : "Dapur tutup"}
            <span className="hidden sm:inline text-beras/65">
              {" "}
              · {jamTampil(jamBuka)}–{jamTampil(jamTutup)} WIB
            </span>
            {status.tercepat !== null ? (
              <>
                <span className="text-beras/50"> · </span>
                <span className="text-beras/80">siap tercepat </span>
                <span className="font-bold text-kunyit-terang">{labelJamMenit(status.tercepat)} WIB</span>
              </>
            ) : (
              <span className="text-beras/65"> · pesan online 24 jam</span>
            )}
          </span>
        </p>
        <Link
          href="/lacak"
          className="ml-auto hidden sm:inline-flex shrink-0 items-center gap-1 text-beras/80 hover:text-kunyit-terang"
        >
          Lacak pesanan →
        </Link>
      </div>
    </div>
  );
}
