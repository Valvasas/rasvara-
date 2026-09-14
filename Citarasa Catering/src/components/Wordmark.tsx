import Link from "next/link";

interface WordmarkProps {
  href?: string;
  compact?: boolean;
  tagline?: boolean;
  className?: string;
}

export function Wordmark({
  href = "/",
  compact = false,
  tagline = false,
  className = "",
}: WordmarkProps) {
  const content = (
    <div className={`flex items-center gap-2.5 group ${className}`}>
      {/* Ikon panci/makanan hangat beraksen gerabah & daun */}
      <div className="w-10 h-10 rounded-xl bg-bata text-krem flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105">
        <svg
          className="w-6 h-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Uap panas masakan */}
          <path d="M7 4c.5 1 1 2 0 3" />
          <path d="M12 2c.7 1.5 1.4 3 0 4.5" />
          <path d="M17 4c.5 1 1 2 0 3" />
          {/* Mangkuk / kuali saji */}
          <path d="M3 11h18c0 5-3.5 8-9 8s-9-3-9-8z" />
          <path d="M2 11h20" />
        </svg>
      </div>

      <div className="flex flex-col">
        <span
          className={`font-bold tracking-tight text-kayu leading-none ${
            compact ? "text-xl" : "text-2xl"
          }`}
        >
          Citarasa<span className="text-bata ml-1 font-extrabold">Catering</span>
        </span>
        {tagline && (
          <span className="text-xs text-kayu-sedang mt-0.5 font-medium">
            Masakan hangat, siap tepat waktu
          </span>
        )}
      </div>
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="inline-flex items-center focus:outline-none">
      {content}
    </Link>
  );
}

