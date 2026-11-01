"use client";

import { IkonBagikan } from "@/components/ikon/Ikon";
import { kabari } from "@/components/Pemberitahuan";

/**
 * "Bagikan toko" — jalur promosi utama UMKM katering adalah grup WhatsApp
 * keluarga, arisan, dan kantor. Di ponsel memakai lembar bagikan bawaan
 * (langsung muncul daftar WhatsApp/Instagram), di komputer menyalin tautan.
 */
export function TombolBagikanToko({ url, namaUsaha, className = "" }: { url: string; namaUsaha: string; className?: string }) {
  const teks = `Pesan nasi kotak, tumpeng & snack box di ${namaUsaha} — lihat menu & harga, bisa pesan langsung dari HP:`;
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          if (navigator.share) {
            await navigator.share({ title: namaUsaha, text: teks, url });
            return;
          }
          await navigator.clipboard.writeText(`${teks} ${url}`);
          kabari("Tautan toko disalin. Tempel di grup WhatsApp, ya!");
        } catch (e) {
          // Pengguna menutup lembar bagikan: bukan galat.
          if (e instanceof DOMException && e.name === "AbortError") return;
          kabari("Gagal menyalin. Salin manual: " + url, { jenis: "galat" });
        }
      }}
    >
      <IkonBagikan className="w-5 h-5" />
      Bagikan toko
    </button>
  );
}
