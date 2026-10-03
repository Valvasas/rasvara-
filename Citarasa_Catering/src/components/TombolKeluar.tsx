import { aksiKeluar } from "@/app/aksi/auth";
import { IkonKeluar } from "@/components/ikon/Ikon";

interface TombolKeluarProps {
  label?: string;
  className?: string;
}

export function TombolKeluar({ label = "Keluar", className = "" }: TombolKeluarProps) {
  return (
    <form action={aksiKeluar} className="inline-block">
      <button type="submit" className={`tombol-hantu ${className}`}>
        <IkonKeluar className="w-4 h-4" />
        {label}
      </button>
    </form>
  );
}
