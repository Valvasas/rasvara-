import { linkWhatsapp } from "@/lib/format";
import { LABEL_TEMPLAT, susunPesanWa, templatRelevan, type PesananUntukWa, type UsahaUntukWa } from "@/lib/template-wa";
import { IkonWhatsapp } from "@/components/ikon/Ikon";

interface MenuWaProps {
  pesanan: PesananUntukWa & { status: string; teleponPemesan: string };
  usaha: UsahaUntukWa;
  ringkas?: boolean;
}

/**
 * Daftar pesan WhatsApp siap kirim untuk satu pesanan. Memakai <details>
 * bawaan HTML: berfungsi tanpa JavaScript, bisa dibuka dengan keyboard, dan
 * tidak menambah beban di papan yang berisi puluhan kartu.
 */
export function MenuWa({ pesanan, usaha, ringkas = false }: MenuWaProps) {
  const templat = templatRelevan(pesanan);
  return (
    // Di kartu papan (kolomnya bergulir sendiri), daftar dibuka sebagai bagian
    // dari kartu supaya tidak terpotong tepi kolom.
    <details className={ringkas ? "group open:basis-full" : "relative group"}>
      <summary className={`${ringkas ? "tombol-hantu tombol-kecil px-2" : "tombol-kedua"} list-none [&::-webkit-details-marker]:hidden`}>
        <IkonWhatsapp className="w-4 h-4 text-daun" />
        WA
      </summary>
      <ul
        className={
          ringkas
            ? "mt-2 rounded-xl border border-krem-gelap bg-krem py-1 text-sm"
            : "absolute z-30 mt-1 right-0 w-60 kartu shadow-[var(--shadow-angkat)] py-1 text-sm"
        }
      >
        {templat.map((j) => (
          <li key={j}>
            <a
              href={linkWhatsapp(pesanan.teleponPemesan, susunPesanWa(j, pesanan, usaha))}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3.5 py-2 hover:bg-krem-tua text-kayu"
            >
              {LABEL_TEMPLAT[j]}
            </a>
          </li>
        ))}
        <li className="border-t border-krem-gelap mt-1 pt-1">
          <a
            href={linkWhatsapp(pesanan.teleponPemesan, "")}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3.5 py-2 hover:bg-krem-tua text-kayu-sedang"
          >
            Chat tanpa templat
          </a>
        </li>
      </ul>
    </details>
  );
}
