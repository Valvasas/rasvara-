import { IkonCek } from "@/components/ikon/Ikon";

const LANGKAH = ["Keranjang", "Jadwal & data", "Bayar & pantau"];

/**
 * Penunjuk "sedang di langkah berapa". Pembeli yang jarang belanja online
 * sering cemas apakah pesanannya sudah terkirim; penunjuk ini menjawab itu
 * tanpa perlu membaca apa pun.
 */
export function LangkahPesan({ aktif }: { aktif: 1 | 2 | 3 }) {
  return (
    <ol aria-label="Langkah pemesanan" className="flex items-center gap-2 text-[13px] sm:text-[14px]">
      {LANGKAH.map((label, i) => {
        const nomor = i + 1;
        const selesai = nomor < aktif;
        const sekarang = nomor === aktif;
        return (
          <li key={label} className="flex items-center gap-2 min-w-0" aria-current={sekarang ? "step" : undefined}>
            {i > 0 && (
              <span aria-hidden="true" className={`w-4 sm:w-10 h-0.5 rounded-full ${nomor <= aktif ? "bg-bata" : "bg-krem-gelap"}`} />
            )}
            <span
              className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center font-bold ${
                selesai ? "bg-daun text-white" : sekarang ? "bg-bata text-white anim-denyut" : "bg-white border border-krem-gelap text-kayu-sedang"
              }`}
            >
              {selesai ? <IkonCek className="w-4 h-4" strokeWidth={3} /> : nomor}
            </span>
            <span className={`truncate ${sekarang ? "font-bold text-kayu" : selesai ? "text-kayu" : "text-kayu-sedang"} ${sekarang ? "" : "hidden sm:inline"}`}>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
