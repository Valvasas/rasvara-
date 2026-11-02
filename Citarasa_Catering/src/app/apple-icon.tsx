import { ImageResponse } from "next/og";
import { WARNA_MEREK, TandaMerek } from "@/components/TandaMerek";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * Ikon saat situs dipasang ke layar utama iPhone/iPad. iOS memotong sudutnya
 * sendiri, jadi latarnya dibuat penuh (tanpa sudut membulat) dan tandanya
 * diberi ruang napas.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: WARNA_MEREK.pandan,
        }}
      >
        <TandaMerek ukuran={150} varian="garis" />
      </div>
    ),
    size
  );
}
