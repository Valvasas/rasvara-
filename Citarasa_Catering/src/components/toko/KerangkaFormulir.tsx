import type { ReactNode } from "react";
import { IlustrasiRantang } from "@/components/ilustrasi/Ilustrasi";
import { IkonCek } from "@/components/ikon/Ikon";

interface KerangkaFormulirProps {
  judul: string;
  keterangan: string;
  /** Alasan singkat kenapa formulir ini berguna; tampil di panel samping. */
  manfaat: string[];
  children: ReactNode;
  /** Isi tambahan di bawah kartu formulir (mis. tautan bantuan). */
  bawah?: ReactNode;
}

/**
 * Kerangka bersama untuk halaman formulir pendek: lacak, masuk, daftar.
 *
 * Di layar lebar ada panel ilustrasi + daftar manfaat supaya halaman tidak
 * terasa seperti formulir kosong di tengah layar; di ponsel panelnya diringkas
 * menjadi ilustrasi kecil agar isian tetap terlihat tanpa menggulir.
 */
export function KerangkaFormulir({ judul, keterangan, manfaat, children, bawah }: KerangkaFormulirProps) {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-6 pb-12 sm:py-14">
      <div className="grid gap-8 lg:gap-12 lg:grid-cols-[1fr_440px] items-center">
        <aside className="hidden lg:flex flex-col items-center relative overflow-hidden rounded-3xl border border-krem-gelap bg-krem-tua/60 latar-kawung px-10 py-12">
          <IlustrasiRantang className="w-52 anim-masuk" />
          <ul className="mt-8 space-y-3 self-stretch max-w-sm mx-auto">
            {manfaat.map((m) => (
              <li key={m} className="flex items-start gap-3 text-kayu">
                <span className="mt-0.5 w-6 h-6 shrink-0 rounded-full bg-daun-lembut text-daun-tua flex items-center justify-center">
                  <IkonCek className="w-3.5 h-3.5" strokeWidth={3} />
                </span>
                {m}
              </li>
            ))}
          </ul>
        </aside>

        <div className="w-full max-w-md mx-auto lg:max-w-none">
          <div className="flex items-center gap-4">
            <IlustrasiRantang className="w-16 shrink-0 lg:hidden" />
            <div>
              <h1 className="font-tampil text-3xl font-bold text-kayu">{judul}</h1>
              <p className="teks-redup mt-1.5">{keterangan}</p>
            </div>
          </div>
          <div className="kartu kartu-isi mt-6 relative overflow-hidden">
            <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 pita-merek" />
            {children}
          </div>
          {bawah}
        </div>
      </div>
    </div>
  );
}
