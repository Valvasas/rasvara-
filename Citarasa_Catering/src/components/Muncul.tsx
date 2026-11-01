"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * Pembungkus "muncul saat digulir", sekali jalan: setelah muncul ia tidak
 * memudar lagi saat digulir balik — gerak berulang hanya melelahkan mata.
 *
 * Status "sudah terlihat" disimpan di state React (bukan ditempel langsung ke
 * DOM oleh skrip luar) karena React memeriksa atribut saat hidrasi; elemen
 * yang diubah sebelum bagiannya terhidrasi memicu galat hydration mismatch.
 *
 * Semua instans berbagi SATU IntersectionObserver — dua puluh kartu menu
 * tidak berarti dua puluh pengamat.
 */
let pengamat: IntersectionObserver | null = null;
const panggilan = new WeakMap<Element, () => void>();

function amati(el: Element, saatTerlihat: () => void): () => void {
  if (!pengamat) {
    pengamat = new IntersectionObserver(
      (entri) => {
        for (const e of entri) {
          if (!e.isIntersecting) continue;
          panggilan.get(e.target)?.();
          panggilan.delete(e.target);
          pengamat?.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 }
    );
  }
  panggilan.set(el, saatTerlihat);
  pengamat.observe(el);
  return () => {
    panggilan.delete(el);
    pengamat?.unobserve(el);
  };
}

type Tag = "div" | "li" | "section";

export function Muncul({
  children,
  className = "",
  tunda = 0,
  as = "div",
  ...lain
}: {
  children: ReactNode;
  className?: string;
  tunda?: number;
  as?: Tag;
} & Record<`aria-${string}`, string | undefined>) {
  const ref = useRef<HTMLElement>(null);
  const [terlihat, setTerlihat] = useState(false);

  useEffect(() => {
    const el = ref.current;
    // Tanpa dukungan peramban atau bila gerak dikurangi: langsung tampil
    // (CSS-nya pun hanya menyembunyikan saat html[data-gerak] terpasang).
    if (!el || !document.documentElement.dataset.gerak) {
      setTerlihat(true);
      return;
    }
    return amati(el, () => setTerlihat(true));
  }, []);

  const Elemen = as;
  return (
    <Elemen
      ref={ref as never}
      className={`anim-muncul ${className}`}
      data-terlihat={terlihat ? "" : undefined}
      style={tunda ? ({ ["--tunda" as string]: `${tunda}ms` } as CSSProperties) : undefined}
      {...lain}
    >
      {children}
    </Elemen>
  );
}
