import { ImageResponse } from "next/og";
import { GlifMangkuk } from "@/components/ikon/GlifMangkuk";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * Ikon saat situs dipasang ke layar utama iPhone/iPad. Tanpa sudut membulat:
 * iOS memotong sudutnya sendiri. Warna = --color-bata & --color-krem.
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
          background: "#C2461C",
        }}
      >
        <GlifMangkuk ukuran={112} warna="#FFFCF7" />
      </div>
    ),
    size
  );
}
