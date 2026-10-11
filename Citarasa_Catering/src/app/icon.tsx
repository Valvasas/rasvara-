import { ImageResponse } from "next/og";
import { GlifMangkuk } from "@/components/ikon/GlifMangkuk";

/** Sama dengan --color-bata dan --color-krem di globals.css. */
const BATA = "#C2461C";
const KREM = "#FFFCF7";

/**
 * Ikon dibuat dari kode, bukan berkas biner, supaya selalu ikut logo & palet
 * merek dan tidak ada aset yang gampang hilang dari repo.
 *
 *   32          favicon di tab browser
 *   192, 512    ikon pemasangan PWA ("Tambah ke layar utama") — Chrome butuh
 *               keduanya; tanpa 512 tidak ada layar pembuka yang tajam
 *   maskable    512 penuh tanpa sudut membulat, logo di dalam zona aman 60%,
 *               untuk Android yang memotong ikon menjadi lingkaran/squircle
 *
 * Dengan generateImageMetadata, tiap ukuran dilayani di /icon/<id> dan Next.js
 * menyisipkan tag <link rel="icon"> untuk semuanya. Manifest merujuk ke URL
 * yang sama (lihat manifest.ts).
 */
export function generateImageMetadata() {
  return [
    { id: "32", size: { width: 32, height: 32 }, contentType: "image/png" },
    { id: "192", size: { width: 192, height: 192 }, contentType: "image/png" },
    { id: "512", size: { width: 512, height: 512 }, contentType: "image/png" },
    { id: "maskable", size: { width: 512, height: 512 }, contentType: "image/png" },
  ];
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  const kunci = String(await id);
  const sisi = kunci === "32" ? 32 : kunci === "192" ? 192 : 512;
  const penuh = kunci === "maskable";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BATA,
          borderRadius: penuh ? 0 : Math.round(sisi * 0.22),
        }}
      >
        <GlifMangkuk ukuran={Math.round(sisi * (penuh ? 0.5 : 0.68))} warna={KREM} />
      </div>
    ),
    { width: sisi, height: sisi }
  );
}
