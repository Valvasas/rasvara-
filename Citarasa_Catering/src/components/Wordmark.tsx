import Link from "next/link";
import { GlifMangkuk } from "@/components/ikon/GlifMangkuk";

interface WordmarkProps {
  href?: string | null;
  compact?: boolean;
  tagline?: boolean;
  /** Teks kecil di samping nama, mis. "Dapur" di dashboard admin. */
  label?: string;
  className?: string;
}

export function Wordmark({
  href = "/",
  compact = false,
  tagline = false,
  label,
  className = "",
}: WordmarkProps) {
  const content = (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <span
        aria-hidden="true"
        className={`${compact ? "w-8 h-8 rounded-lg" : "w-9 h-9 rounded-xl"} bg-bata text-white flex items-center justify-center shrink-0`}
      >
        <GlifMangkuk ukuran={compact ? 20 : 22} warna="currentColor" />
      </span>

      <span className="flex flex-col">
        <span
          className={`font-tampil font-bold text-kayu leading-none ${
            compact ? "text-lg" : "text-xl"
          }`}
        >
          Citarasa
          {label && (
            <span className="ml-2 align-middle font-sans text-xs font-medium text-kayu-sedang">
              {label}
            </span>
          )}
        </span>
        {tagline && (
          <span className="text-xs text-kayu-sedang mt-1">Catering rumahan</span>
        )}
      </span>
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} aria-label="Citarasa Catering — beranda" className="inline-flex items-center rounded-lg">
      {content}
    </Link>
  );
}
