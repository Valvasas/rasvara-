import Link from "next/link";
import { TandaMerek } from "@/components/TandaMerek";

interface WordmarkProps {
  href?: string | null;
  /**
   * Nama usaha dari Pengaturan. Kata pertama tampil besar sebagai merek,
   * sisanya ("Catering") jadi label kecil — jadi saat pemilik mengganti nama
   * usaha di dashboard, logo di seluruh situs ikut berganti.
   */
  nama?: string;
  compact?: boolean;
  tagline?: boolean;
  /** Teks kecil di samping nama, mis. "Dapur" di dashboard admin. */
  label?: string;
  /** Untuk latar gelap (pita merek, sidebar gelap). */
  terbalik?: boolean;
  className?: string;
  /** Kelas untuk blok teks — mis. "hidden sm:flex" supaya di ponsel hanya ikon. */
  kelasTeks?: string;
}

export function pecahNamaUsaha(nama: string): { utama: string; sisa: string } {
  const bersih = nama.trim().replace(/\s+/g, " ") || "Citarasa";
  const [utama, ...sisa] = bersih.split(" ");
  return { utama, sisa: sisa.join(" ") };
}

export function Wordmark({
  href = "/",
  nama = "Citarasa Catering",
  compact = false,
  tagline = false,
  label,
  terbalik = false,
  className = "",
  kelasTeks = "flex",
}: WordmarkProps) {
  const { utama, sisa } = pecahNamaUsaha(nama);
  const content = (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <TandaMerek ukuran={compact ? 36 : 40} className="shrink-0" />

      <span className={`${kelasTeks} flex-col`}>
        <span className="flex items-baseline gap-2">
          <span
            className={`font-tampil font-extrabold leading-none ${terbalik ? "text-beras" : "text-arang"} ${
              compact ? "text-[1.3rem]" : "text-[1.45rem]"
            }`}
          >
            {utama}
          </span>
          {label && (
            <span
              className={`font-presisi text-[11px] font-semibold uppercase tracking-[0.14em] rounded px-1.5 py-0.5 ${
                terbalik ? "bg-white/10 text-kunyit-terang" : "bg-pandan-lembut text-pandan-tua"
              }`}
            >
              {label}
            </span>
          )}
        </span>
        {(sisa || tagline) && (
          <span
            className={`font-presisi text-[10.5px] font-medium uppercase tracking-[0.2em] mt-1 leading-none ${
              terbalik ? "text-beras/70" : "text-arang-sedang"
            }`}
          >
            {tagline ? `${sisa || "Catering"} · sehat · matang · tepat` : sisa}
          </span>
        )}
      </span>
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} aria-label={`${nama} — beranda`} className="inline-flex items-center rounded-lg">
      {content}
    </Link>
  );
}
