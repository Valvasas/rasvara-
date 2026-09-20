import { aksiKeluar } from "@/app/aksi/auth";

interface TombolKeluarProps {
  label?: string;
  className?: string;
}

export function TombolKeluar({
  label = "Keluar",
  className = "",
}: TombolKeluarProps) {
  return (
    <form action={aksiKeluar} className="inline-block">
      <button
        type="submit"
        className={`min-h-[48px] px-4 py-2 text-sm font-medium text-bahaya bg-bahaya-lembut hover:bg-bahaya hover:text-white rounded-xl transition-colors inline-flex items-center justify-center gap-2 cursor-pointer ${className}`}
      >
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        {label}
      </button>
    </form>
  );
}

