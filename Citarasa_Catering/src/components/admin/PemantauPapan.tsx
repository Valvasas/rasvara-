"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const INTERVAL_MS = 20_000;
const KUNCI_SUARA = "citarasa:suara-papan";

/** Dua nada pendek lewat WebAudio — tanpa berkas suara yang harus diunduh. */
function bunyikan(ctx: AudioContext) {
  const mulai = ctx.currentTime;
  [880, 1175].forEach((frek, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frek;
    gain.gain.setValueAtTime(0.0001, mulai + i * 0.18);
    gain.gain.exponentialRampToValueAtTime(0.25, mulai + i * 0.18 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, mulai + i * 0.18 + 0.16);
    osc.connect(gain).connect(ctx.destination);
    osc.start(mulai + i * 0.18);
    osc.stop(mulai + i * 0.18 + 0.17);
  });
}

function sedangMengetik(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (el as HTMLElement).isContentEditable;
}

/**
 * Menjaga papan dapur tetap mutakhir tanpa memuat ulang manual.
 *
 * Polling ringan, bukan WebSocket: tetap jalan di belakang nginx/PM2 tanpa
 * infrastruktur tambahan. Berhenti saat tab tersembunyi (hemat baterai &
 * kuota), langsung memeriksa saat tab kembali dilihat, dan menunda
 * penyegaran selama pengguna sedang mengetik (mis. alasan pembatalan).
 */
export function PemantauPapan({ versiAwal, baruAwal }: { versiAwal: string; baruAwal: number }) {
  const router = useRouter();
  const versi = useRef(versiAwal);
  const baru = useRef(baruAwal);
  const audio = useRef<AudioContext | null>(null);
  const [suara, setSuara] = useState(false);
  const [diperbarui, setDiperbarui] = useState<Date | null>(null);
  const [pengumuman, setPengumuman] = useState("");
  const [terputus, setTerputus] = useState(false);
  const judulAsli = useRef<string>("");

  // Props baru tiba setelah router.refresh(): jadikan acuan berikutnya.
  useEffect(() => {
    versi.current = versiAwal;
    baru.current = baruAwal;
  }, [versiAwal, baruAwal]);

  useEffect(() => {
    try {
      setSuara(localStorage.getItem(KUNCI_SUARA) === "1");
    } catch {
      /* penyimpanan diblokir: suara tetap mati */
    }
    judulAsli.current = document.title.replace(/^\(\d+\)\s*/, "");
  }, []);

  useEffect(() => {
    let berhenti = false;
    let tertunda = false;
    let pewaktu: ReturnType<typeof setTimeout> | undefined;

    const periksa = async () => {
      if (document.hidden) return;
      try {
        const r = await fetch("/api/admin/denyut", { cache: "no-store" });
        if (r.status === 401) {
          window.location.href = "/masuk";
          return;
        }
        if (!r.ok) throw new Error(String(r.status));
        const d: { versi: string; baru: number } = await r.json();
        setTerputus(false);

        if (d.baru > baru.current) {
          const selisih = d.baru - baru.current;
          setPengumuman(`${selisih} pesanan baru masuk`);
          if (audio.current && suara) bunyikan(audio.current);
        }
        document.title = d.baru > 0 ? `(${d.baru}) ${judulAsli.current}` : judulAsli.current;

        if (d.versi !== versi.current || tertunda) {
          if (sedangMengetik()) {
            tertunda = true;
          } else {
            tertunda = false;
            versi.current = d.versi;
            baru.current = d.baru;
            router.refresh();
            setDiperbarui(new Date());
          }
        }
      } catch {
        setTerputus(true);
      }
    };

    const jadwalkan = () => {
      if (berhenti) return;
      pewaktu = setTimeout(async () => {
        await periksa();
        jadwalkan();
      }, INTERVAL_MS);
    };

    const saatTerlihat = () => {
      if (!document.hidden) periksa();
    };

    document.addEventListener("visibilitychange", saatTerlihat);
    jadwalkan();
    return () => {
      berhenti = true;
      clearTimeout(pewaktu);
      document.removeEventListener("visibilitychange", saatTerlihat);
      document.title = judulAsli.current || document.title;
    };
  }, [router, suara]);

  const aturSuara = () => {
    const nyala = !suara;
    if (nyala) {
      // Peramban hanya mengizinkan suara setelah ada sentuhan pengguna.
      audio.current = audio.current ?? new AudioContext();
      void audio.current.resume();
      bunyikan(audio.current);
    }
    setSuara(nyala);
    try {
      localStorage.setItem(KUNCI_SUARA, nyala ? "1" : "0");
    } catch {
      /* abaikan */
    }
  };

  // Pilihan "suara nyala" dari kunjungan sebelumnya baru bisa berbunyi setelah
  // sentuhan pertama di halaman ini.
  useEffect(() => {
    if (!suara || audio.current) return;
    const siapkan = () => {
      audio.current = new AudioContext();
      void audio.current.resume();
    };
    window.addEventListener("pointerdown", siapkan, { once: true });
    return () => window.removeEventListener("pointerdown", siapkan);
  }, [suara]);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-kayu-sedang">
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className={`w-1.5 h-1.5 rounded-full ${terputus ? "bg-bahaya" : "bg-daun animate-pulse"}`}
        />
        {terputus
          ? "Koneksi terputus, mencoba lagi…"
          : diperbarui
          ? `Diperbarui ${diperbarui.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
          : "Diperbarui otomatis"}
      </span>
      <button
        type="button"
        onClick={aturSuara}
        aria-pressed={suara}
        className="underline underline-offset-2 hover:text-kayu cursor-pointer"
      >
        {suara ? "Matikan suara" : "Aktifkan suara pesanan baru"}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {pengumuman}
      </span>
    </div>
  );
}
