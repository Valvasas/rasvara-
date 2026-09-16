import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Ikon saat situs dipasang ke layar utama iPhone/iPad. */
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
          background: "#C2410C",
          color: "#FBF7EE",
          fontSize: 108,
          fontWeight: 700,
        }}
      >
        C
      </div>
    ),
    size
  );
}
