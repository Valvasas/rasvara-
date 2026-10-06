import { jamTampil, sedangBuka } from "@/lib/format";

interface StatusDapurProps {
  jamBuka: string;
  jamTutup: string;
  /** Tampilkan jam tutup juga ("· s/d 23.00"). Dimatikan di layar sempit. */
  lengkap?: boolean;
  className?: string;
}

/**
 * Lencana "Dapur buka / Buka pukul 16.00" di kepala halaman.
 *
 * Pembeli catering memesan untuk hari lain, jadi status ini bukan penghalang
 * memesan — gunanya memberi tahu kapan chat WhatsApp akan dibalas. Karena itu
 * saat tutup nadanya netral (abu hangat), bukan merah yang terbaca "jangan".
 * Dihitung di server dalam WIB lewat `sedangBuka`, sama dengan jam di footer.
 */
/**
 * `className` wajib membawa nilai display-nya sendiri (bawaan "inline-flex").
 * Kalau display ditanam di kelas dasar, `hidden md:inline-flex` dari pemanggil
 * kalah urutan CSS dan lencananya muncul dobel di ponsel.
 */
export function StatusDapur({ jamBuka, jamTutup, lengkap = false, className = "inline-flex" }: StatusDapurProps) {
  const buka = sedangBuka(jamBuka, jamTutup);
  const nonstop = jamBuka === jamTutup;

  const teks = nonstop
    ? "Buka 24 jam"
    : buka
    ? `Dapur buka${lengkap ? ` · s/d ${jamTampil(jamTutup)}` : ""}`
    : `Buka pukul ${jamTampil(jamBuka)}`;

  return (
    <span
      className={`items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
        buka ? "bg-daun-lembut text-daun-tua" : "bg-krem-tua text-kayu-sedang"
      } ${className}`}
      title={
        buka
          ? `Dapur buka ${jamTampil(jamBuka)}–${jamTampil(jamTutup)} WIB. Chat WhatsApp dibalas cepat.`
          : "Dapur sedang tutup. Pesanan tetap bisa dikirim dan dikonfirmasi saat dapur buka."
      }
    >
      <span aria-hidden="true" className="relative flex w-2 h-2">
        {buka && <span className="absolute inset-0 rounded-full bg-daun opacity-60 motion-safe:animate-ping" />}
        <span className={`relative w-2 h-2 rounded-full ${buka ? "bg-daun" : "bg-kayu-sedang/50"}`} />
      </span>
      {teks}
    </span>
  );
}
