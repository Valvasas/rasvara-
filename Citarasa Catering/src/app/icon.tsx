import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Favicon dibuat dari kode, bukan berkas biner, supaya warnanya selalu ikut
 * palet merek dan tidak ada aset yang gampang hilang dari repo. Sebelumnya
 * `layout.tsx` menunjuk `/favicon.ico` yang berkasnya tidak pernah ada, jadi
 * tab browser tampil kosong.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#C2410C",
          color: "#FBF7EE",
          fontSize: 20,
          fontWeight: 700,
          borderRadius: 7,
        }}
      >
        C
      </div>
    ),
    size
  );
}
