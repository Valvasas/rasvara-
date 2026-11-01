"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { IkonCek, IkonPeringatan, IkonTutup } from "@/components/ikon/Ikon";

/**
 * Toast — kabar singkat di bawah layar ("Ditambahkan ke keranjang").
 *
 * Pola ini sengaja meniru aplikasi belanja yang sudah dikenal pembeli:
 * muncul dari bawah, hilang sendiri, dan bisa membawa satu tombol aksi
 * ("Lihat keranjang"). Diumumkan ke pembaca layar lewat aria-live, tanpa
 * mencuri fokus dari tombol yang baru ditekan.
 */

type Jenis = "sukses" | "info" | "galat";
type Kabar = { id: number; pesan: string; jenis: Jenis; aksi?: { label: string; href: string } };

let daftar: Kabar[] = [];
let idBerikut = 1;
const pendengar = new Set<() => void>();
const KOSONG: Kabar[] = [];

function beri() {
  pendengar.forEach((f) => f());
}

export function kabari(pesan: string, opsi: { jenis?: Jenis; aksi?: { label: string; href: string } } = {}): void {
  const kabar: Kabar = { id: idBerikut++, pesan, jenis: opsi.jenis ?? "sukses", aksi: opsi.aksi };
  // Maksimal dua sekaligus: menekan "+" lima kali tidak boleh menumpuk lima toast.
  daftar = [...daftar.slice(-1), kabar];
  beri();
  window.setTimeout(() => tutup(kabar.id), kabar.aksi ? 4200 : 2800);
}

function tutup(id: number) {
  const sebelum = daftar.length;
  daftar = daftar.filter((k) => k.id !== id);
  if (daftar.length !== sebelum) beri();
}

export function Pemberitahuan() {
  const kabar = useSyncExternalStore(
    (f) => {
      pendengar.add(f);
      return () => pendengar.delete(f);
    },
    () => daftar,
    () => KOSONG
  );

  // Wilayah aria-live harus sudah ada di DOM sebelum isinya berubah, kalau
  // tidak pembaca layar melewatkan pengumuman pertama.
  const [siap, setSiap] = useState(false);
  useEffect(() => setSiap(true), []);
  if (!siap) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] md:bottom-6"
    >
      {kabar.map((k) => (
        <div
          key={k.id}
          role={k.jenis === "galat" ? "alert" : "status"}
          className="pointer-events-auto w-full max-w-md flex items-center gap-3 rounded-2xl bg-kayu text-white pl-4 pr-2 py-2.5 shadow-[0_12px_32px_-8px_rgba(28,21,17,0.45)] animate-[geser-masuk-bawah_0.35s_var(--ease-pegas)_both]"
        >
          <span
            aria-hidden="true"
            className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center ${
              k.jenis === "galat" ? "bg-bahaya" : k.jenis === "info" ? "bg-kunyit" : "bg-daun"
            }`}
          >
            {k.jenis === "galat" ? (
              <IkonPeringatan className="w-4 h-4" />
            ) : (
              <IkonCek className="w-4 h-4" strokeWidth={3} />
            )}
          </span>
          <p className="flex-1 min-w-0 text-[15px] font-medium leading-snug">{k.pesan}</p>
          {k.aksi && (
            <Link
              href={k.aksi.href}
              onClick={() => tutup(k.id)}
              className="shrink-0 rounded-lg px-3 py-2 text-[15px] font-bold text-kunyit-terang hover:bg-white/10"
            >
              {k.aksi.label}
            </Link>
          )}
          <button
            type="button"
            onClick={() => tutup(k.id)}
            aria-label="Tutup pemberitahuan"
            className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <IkonTutup className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
