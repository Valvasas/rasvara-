"use client";

import { useState } from "react";
import { IkonCek, IkonSalin } from "@/components/ikon/Ikon";

interface TombolSalinProps {
  teks: string;
  label?: string;
  ringkas?: boolean;
  className?: string;
}

export function TombolSalin({
  teks,
  label = "Salin",
  ringkas = false,
  className = "",
}: TombolSalinProps) {
  const [tersalin, setTersalin] = useState(false);

  const handleSalin = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(teks);
      } else {
        // Fallback untuk browser lama atau koneksi insecure
        const textArea = document.createElement("textarea");
        textArea.value = teks;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2000);
    } catch {
      // Abaikan jika permission ditolak
    }
  };

  return (
    <button
      type="button"
      onClick={handleSalin}
      title={tersalin ? "Berhasil disalin!" : `Salin "${teks}"`}
      aria-live="polite"
      className={`inline-flex items-center justify-center gap-1.5 min-h-[36px] rounded-lg text-xs font-medium border transition-colors cursor-pointer select-none ${
        tersalin
          ? "bg-daun-lembut text-daun-tua border-daun/20"
          : "bg-white text-kayu border-krem-gelap hover:bg-krem-tua"
      } ${ringkas ? "px-2.5" : "px-3"} ${className}`}
    >
      {tersalin ? (
        <IkonCek className="w-3.5 h-3.5" strokeWidth={2.5} />
      ) : (
        <IkonSalin className="w-3.5 h-3.5" />
      )}
      <span>{tersalin ? "Tersalin" : label}</span>
    </button>
  );
}

