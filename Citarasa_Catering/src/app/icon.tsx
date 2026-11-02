import { ImageResponse } from "next/og";
import { TandaMerek } from "@/components/TandaMerek";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Favicon dibuat dari kode, bukan berkas biner, supaya selalu sama persis
 * dengan tanda merek di kepala halaman (lihat TandaMerek.tsx).
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex" }}>
        <TandaMerek ukuran={32} />
      </div>
    ),
    size
  );
}
