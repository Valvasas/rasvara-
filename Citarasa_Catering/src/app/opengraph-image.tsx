import { ImageResponse } from "next/og";
import { ambilPengaturan } from "@/lib/pengaturan";
import { TandaMerek, WARNA_MEREK } from "@/components/TandaMerek";

export const alt = "Citarasa Catering — sehat, matang, tepat waktu";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
/** Dibuat saat build lalu diperbarui tiap jam, supaya nama/tagline usaha yang
 * diubah pemilik ikut tampil di pratinjau tanpa menunggu deploy berikutnya. */
export const revalidate = 3600;

/**
 * Gambar pratinjau saat tautan dibagikan di WhatsApp, Instagram, atau Facebook.
 *
 * Ini bukan pemanis: pembeli katering UMKM datang lewat tautan yang diteruskan
 * di grup WhatsApp. Tanpa gambar pratinjau, yang muncul hanya URL polos dan
 * calon pembeli tidak punya alasan untuk menekannya.
 *
 * Komposisinya mengikuti pita merek beranda: hijau pandan pekat, judul besar,
 * dan "papan jam" berisi tiga janji — terbaca jelas walau WhatsApp
 * mengecilkannya jadi kotak 300 px.
 */
export default async function GambarOpenGraph() {
  const pengaturan = await ambilPengaturan();
  const tick = Array.from({ length: 49 }, (_, i) => i);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px 56px",
          background: WARNA_MEREK.pandanGelap,
          color: WARNA_MEREK.beras,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "22px" }}>
          <TandaMerek ukuran={84} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-1px" }}>{pengaturan.namaUsaha}</div>
            <div style={{ fontSize: 22, color: WARNA_MEREK.kunyitTerang, letterSpacing: "4px", marginTop: 4 }}>
              SEHAT · MATANG · TEPAT WAKTU
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 78, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-2px", maxWidth: "980px" }}>
            {pengaturan.tagline || "Masakan matang sempurna, siap tepat di jam acaramu."}
          </div>
          <div style={{ marginTop: 26, fontSize: 28, color: "rgba(247,247,241,0.78)", maxWidth: "900px", lineHeight: 1.4 }}>
            Nasi kotak · tumpeng · snack box · nasi goreng — dimasak hari itu juga, jam siap dijadwalkan sampai menitnya.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Garis ukur: ornamen presisi khas merek */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: "0px", height: 18, justifyContent: "space-between" }}>
            {tick.map((i) => (
              <div
                key={i}
                style={{
                  width: 2,
                  height: i % 6 === 0 ? 18 : 9,
                  background: i % 6 === 0 ? WARNA_MEREK.kunyitTerang : "rgba(247,247,241,0.35)",
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: "14px" }}>
            {["Harga final sebelum pesan", "Jam siap terjadwal", "Status langsung dari dapur"].map((label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  padding: "12px 22px",
                  borderRadius: 10,
                  border: "2px solid rgba(247,247,241,0.22)",
                  color: WARNA_MEREK.beras,
                  fontSize: 24,
                  fontWeight: 600,
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size
  );
}
