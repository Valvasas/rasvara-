import Link from "next/link";

interface WordmarkProps {
  href?: string | null;
  compact?: boolean;
  tagline?: boolean;
  /** Teks kecil di samping nama, mis. "Dapur" di dashboard admin. */
  label?: string;
  className?: string;
  /** Kelas untuk blok teks — mis. "hidden sm:flex" supaya di ponsel hanya ikon. */
  kelasTeks?: string;
}

export function Wordmark({
  href = "/",
  compact = false,
  tagline = false,
  label,
  className = "",
  kelasTeks = "flex",
}: WordmarkProps) {
  const content = (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <span
        aria-hidden="true"
        className={`${compact ? "w-9 h-9 rounded-xl" : "w-10 h-10 rounded-xl"} bg-gradient-to-br from-bata-terang to-bata text-white flex items-center justify-center shrink-0 shadow-[0_4px_12px_-4px_rgba(194,70,28,0.6)]`}
      >
        <svg
          className={compact ? "w-5 h-5" : "w-[22px] h-[22px]"}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 4c.5 1 1 2 0 3" />
          <path d="M12 2c.7 1.5 1.4 3 0 4.5" />
          <path d="M17 4c.5 1 1 2 0 3" />
          <path d="M3 11h18c0 5-3.5 8-9 8s-9-3-9-8z" />
          <path d="M2 11h20" />
        </svg>
      </span>

      <span className={`${kelasTeks} flex-col`}>
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
