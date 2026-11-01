"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { kabari } from "@/components/Pemberitahuan";
import { IkonLonceng } from "@/components/ikon/Ikon";
import type { DenyutDapur } from "@/lib/denyut";

/**
 * Pemantau pesanan baru untuk dashboard dapur.
 *
 * Penjual tidak duduk menatap layar; ia sedang menggoreng. Begitu pesanan
 * masuk, dashboard (1) berbunyi pendek bila diizinkan, (2) menampilkan kabar
 * di bawah layar, (3) menaruh angka di judul tab — "(2) Dapur" terlihat
 * walau tab sedang tidak dibuka — dan (4) menyegarkan papan pesanan.
 *
 * Yang ditanyakan ke server hanya angka ringkas (/api/admin/denyut) setiap
 * 30 detik, dan berhenti saat tab tersembunyi.
 */

const KOSONG: DenyutDapur = { baru: 0, cekBayar: 0, siap: 0, terbaru: null };
let denyut: DenyutDapur = KOSONG;
const pendengar = new Set<() => void>();
function setel(baru: DenyutDapur) {
  denyut = baru;
  pendengar.forEach((f) => f());
}

export function useDenyut(): DenyutDapur {
  return useSyncExternalStore(
    (f) => {
      pendengar.add(f);
      return () => pendengar.delete(f);
    },
    () => denyut,
    () => denyut
  );
}

const KUNCI_BUNYI = "citarasa:bunyi-dapur";
function bunyiAktif(): boolean {
  try {
    return localStorage.getItem(KUNCI_BUNYI) !== "mati";
  } catch {
    return true;
  }
}

let konteksAudio: AudioContext | null = null;
/** Dua nada pendek naik — terdengar dari dapur, tidak mengagetkan. Tanpa berkas audio. */
function bunyikan() {
  try {
    konteksAudio ??= new AudioContext();
    const ctx = konteksAudio;
    if (ctx.state === "suspended") void ctx.resume();
    [880, 1318.5].forEach((frek, i) => {
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      const mulai = ctx.currentTime + i * 0.18;
      osc.type = "sine";
      osc.frequency.value = frek;
      vol.gain.setValueAtTime(0.0001, mulai);
      vol.gain.exponentialRampToValueAtTime(0.25, mulai + 0.02);
      vol.gain.exponentialRampToValueAtTime(0.0001, mulai + 0.32);
      osc.connect(vol).connect(ctx.destination);
      osc.start(mulai);
      osc.stop(mulai + 0.35);
    });
  } catch {
    // Peramban tanpa Web Audio: cukup kabar visual.
  }
}

function pasangJudul(baru: number) {
  const bersih = document.title.replace(/^\(\d+\)\s+/, "");
  document.title = baru > 0 ? `(${baru}) ${bersih}` : bersih;
}

export function PemantauPesanan({ awal }: { awal: DenyutDapur }) {
  const pathname = usePathname();
  const terakhir = useRef<string | null>(awal.terbaru?.pada ?? null);
  // `awal` hanya dipakai sekali saat dashboard pertama dibuka.
  const awalRef = useRef(awal);

  useEffect(() => {
    setel(awalRef.current);
    pasangJudul(awalRef.current.baru);
  }, []);

  useEffect(() => {
    let batal = false;
    const periksa = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/admin/denyut", { cache: "no-store" });
        if (batal) return;
        // Sesi dicabut (sandi diganti di perangkat lain, akses staf dicabut):
        // perangkat ini langsung diarahkan ke halaman masuk, bukan dibiarkan
        // menampilkan data lama sampai seseorang menekan tombol.
        if (res.status === 401) {
          window.location.href = `/masuk?ke=${encodeURIComponent(window.location.pathname)}`;
          return;
        }
        if (!res.ok) return;
        const data: DenyutDapur = await res.json();
        const adaBaru = data.terbaru && terakhir.current && data.terbaru.pada > terakhir.current;
        if (data.terbaru) terakhir.current = data.terbaru.pada;
        setel(data);
        pasangJudul(data.baru);
        if (adaBaru && data.terbaru) {
          if (bunyiAktif()) bunyikan();
          kabari(`Pesanan baru dari ${data.terbaru.nama}`, {
            jenis: "info",
            aksi: { label: "Buka papan", href: "/admin/papan" },
          });
        }
      } catch {
        // Koneksi dapur putus sebentar: coba lagi di putaran berikutnya.
      }
    };
    const id = window.setInterval(periksa, 30_000);
    document.addEventListener("visibilitychange", periksa);
    return () => {
      batal = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", periksa);
    };
  }, []);

  // Next.js mengganti judul setiap pindah halaman; angkanya dipasang lagi.
  useEffect(() => {
    const t = window.setTimeout(() => pasangJudul(denyut.baru), 50);
    return () => window.clearTimeout(t);
  }, [pathname]);

  return null;
}

/** Dipasang di papan & beranda dapur: muat ulang data begitu ada pesanan masuk. */
export function PemantauPapan() {
  const router = useRouter();
  const { terbaru } = useDenyut();
  const sebelumnya = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const pada = terbaru?.pada ?? null;
    // Nilai pertama (termasuk saat pemantau di layout baru mengisi data awal)
    // hanya dicatat; yang memicu muat ulang adalah perubahan sesudahnya.
    if (sebelumnya.current && pada && pada !== sebelumnya.current) router.refresh();
    sebelumnya.current = pada;
  }, [terbaru, router]);
  return null;
}

/** Sakelar bunyi notifikasi. Menekannya sekaligus "membuka kunci" audio di peramban. */
export function TombolBunyi({ className = "" }: { className?: string }) {
  const [aktif, setAktif] = useState(true);
  useEffect(() => setAktif(bunyiAktif()), []);
  return (
    <button
      type="button"
      onClick={() => {
        const baru = !aktif;
        setAktif(baru);
        try {
          localStorage.setItem(KUNCI_BUNYI, baru ? "nyala" : "mati");
        } catch {
          // diabaikan
        }
        if (baru) bunyikan();
      }}
      aria-pressed={aktif}
      title={aktif ? "Bunyi pesanan baru: nyala" : "Bunyi pesanan baru: mati"}
      className={`relative tombol-ikon ${className}`}
    >
      <IkonLonceng className="w-5 h-5" />
      {!aktif && <span aria-hidden="true" className="absolute w-6 h-0.5 bg-current rotate-45 rounded" />}
      <span className="sr-only">{aktif ? "Matikan bunyi pesanan baru" : "Nyalakan bunyi pesanan baru"}</span>
    </button>
  );
}
