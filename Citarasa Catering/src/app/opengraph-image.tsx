import { ImageResponse } from "next/og";
import { ambilPengaturan } from "@/lib/pengaturan";

export const alt = "Citarasa Catering — masakan hangat, siap tepat waktu";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Gambar pratinjau saat tautan dibagikan di WhatsApp, Instagram, atau Facebook.
 *
 * Ini bukan pemanis: pembeli katering UMKM datang lewat tautan yang diteruskan
 * di grup WhatsApp. Tanpa gambar pratinjau, yang muncul hanya URL polos dan
 * calon pembeli tidak punya alasan untuk menekannya.
 */
export default async function GambarOpenGraph() {
  const pengaturan = await ambilPengaturan();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#FBF7EE",
          borderBottom: "24px solid #C2410C",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "36px",
          }}
        >
          <div
            style={{
              width: 76,
              height: 76,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#C2410C",
              color: "#FBF7EE",
              fontSize: 44,
              fontWeight: 700,
              borderRadius: 20,
            }}
          >
            C
          </div>
          <div
            style={{
              fontSize: 34,
              fontWeight: 700,
              color: "#78350F",
              letterSpacing: "-0.5px",
            }}
          >
            {pengaturan.namaUsaha}
          </div>
        </div>

        <div
          style={{
            fontSize: 74,
            fontWeight: 700,
            color: "#451A03",
            lineHeight: 1.15,
            maxWidth: "900px",
          }}
        >
          {pengaturan.tagline}
        </div>

        <div
          style={{
            marginTop: "34px",
            fontSize: 30,
            color: "#78350F",
            maxWidth: "880px",
            lineHeight: 1.4,
          }}
        >
          Snack box, nasi kotak, tumpeng, dan nasi goreng — dimasak dadakan,
          diantar tepat waktu.
        </div>

        <div
          style={{
            marginTop: "48px",
            display: "flex",
            gap: "14px",
          }}
        >
          {["Pesan online", "Lacak status", "Antar / ambil sendiri"].map(
            (label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  padding: "12px 26px",
                  borderRadius: 999,
                  background: "#FFEDD5",
                  color: "#9A3412",
                  fontSize: 24,
                  fontWeight: 600,
                }}
              >
                {label}
              </div>
            )
          )}
        </div>
      </div>
    ),
    size
  );
}
