import Link from "next/link";

/**
 * Logo teks. Dibuat dari huruf, bukan gambar, supaya tetap tajam di layar
 * apa pun dan tidak perlu file logo yang mudah hilang saat pindah server.
 */
export function Wordmark({
  href = "/",
  terang = false,
}: {
  href?: string;
  terang?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex items-baseline gap-2"
      aria-label="Citarasa Catering, kembali ke beranda"
    >
      <span
        className={`font-judul text-2xl leading-none font-semibold tracking-tight ${
          terang ? "text-krem" : "text-bata"
        }`}
      >
        Citarasa
      </span>
      <span
        className={`text-[0.65rem] font-bold tracking-[0.22em] uppercase ${
          terang ? "text-krem/70" : "text-arang-muda"
        }`}
      >
        Catering
      </span>
    </Link>
  );
}
