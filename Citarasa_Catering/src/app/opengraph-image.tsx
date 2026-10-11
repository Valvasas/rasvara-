import { Fragment, isValidElement, type ReactNode } from "react";
import { ImageResponse } from "next/og";
import { ambilPengaturan } from "@/lib/pengaturan";
import { GlifMangkuk } from "@/components/ikon/GlifMangkuk";
import { IlustrasiHero } from "@/components/ilustrasi/Ilustrasi";

export const alt = "Citarasa Catering — nasi kotak, tumpeng, dan snack box, siap tepat waktu";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Sama dengan token @theme di globals.css (satori tidak membaca CSS). */
const WARNA = {
  krem: "#FFFCF7",
  bata: "#C2461C",
  bataTua: "#9E3714",
  bataLembut: "#FCEDE5",
  kunyit: "#E39B2E",
  daun: "#2E7D4F",
  kayu: "#2B211B",
  kayuSedang: "#6B5C52",
};

/** Atribut SVG yang memang ditulis camelCase; sisanya diubah ke kebab-case. */
const ATRIBUT_CAMEL = new Set(["viewBox", "preserveAspectRatio"]);

const amankan = (teks: string) =>
  teks.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Ubah pohon elemen SVG (termasuk komponen fungsi murni di dalamnya) menjadi
 * string SVG statis. Satori tidak menjalankan komponen yang bersarang di dalam
 * <svg>, jadi ilustrasi hidangan dirender ke string dulu lalu dipasang sebagai
 * <img> data-URI. Hanya untuk komponen tanpa hook (seperti Ilustrasi*).
 */
function keStringSvg(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return amankan(String(node));
  if (Array.isArray(node)) return node.map(keStringSvg).join("");
  if (!isValidElement(node)) return "";
  const props = node.props as Record<string, unknown> & { children?: ReactNode };
  if (node.type === Fragment) return keStringSvg(props.children);
  if (typeof node.type === "function") return keStringSvg((node.type as (p: unknown) => ReactNode)(props));
  if (typeof node.type !== "string") return "";
  const atribut = Object.entries(props)
    .filter(([k, v]) => k !== "children" && v != null && v !== false)
    .map(([k, v]) => {
      const nama = k === "className" ? "class" : ATRIBUT_CAMEL.has(k) ? k : k.replace(/[A-Z]/g, (h) => `-${h.toLowerCase()}`);
      return ` ${nama}="${amankan(String(v))}"`;
    })
    .join("");
  return `<${node.type}${atribut}>${keStringSvg(props.children)}</${node.type}>`;
}

const ILUSTRASI = `data:image/svg+xml;base64,${Buffer.from(
  keStringSvg(<IlustrasiHero palet="hex" />).replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"')
).toString("base64")}`;

/**
 * Gambar pratinjau saat tautan dibagikan di WhatsApp, Instagram, atau Facebook.
 *
 * Ini bukan pemanis: pembeli katering UMKM datang lewat tautan yang diteruskan
 * di grup WhatsApp. Pratinjaunya memakai logo, palet, dan ilustrasi hidangan
 * yang sama dengan situs, supaya yang menekan tautan langsung mengenali toko
 * yang sama begitu halaman terbuka.
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
          background: WARNA.krem,
        }}
      >
        <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "56px 40px 40px 72px" }}>
          <div style={{ width: 600, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: WARNA.bata,
                  borderRadius: 18,
                }}
              >
                <GlifMangkuk ukuran={44} warna={WARNA.krem} />
              </div>
              <div style={{ fontSize: 34, fontWeight: 700, color: WARNA.kayu }}>{pengaturan.namaUsaha}</div>
            </div>

            <div
              style={{
                marginTop: 36,
                fontSize: 60,
                fontWeight: 700,
                color: WARNA.kayu,
                lineHeight: 1.12,
                display: "flex",
              }}
            >
              {pengaturan.tagline || "Masakan hangat, siap tepat waktu."}
            </div>

            <div style={{ marginTop: 22, fontSize: 28, color: WARNA.kayuSedang, lineHeight: 1.4, display: "flex" }}>
              Nasi kotak, tumpeng, snack box, dan nasi goreng — pesan online, pantau dari HP.
            </div>

            <div style={{ marginTop: 34, display: "flex", gap: 12 }}>
              {["Pesan online", "Lacak status", "Antar / ambil"].map((label) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    padding: "10px 22px",
                    borderRadius: 999,
                    background: WARNA.bataLembut,
                    color: WARNA.bataTua,
                    fontSize: 22,
                    fontWeight: 600,
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {/* <img> biasa, bukan next/image: next/og (satori) hanya mengenal <img>. */}
            <img src={ILUSTRASI} width={500} height={411} alt="" />
          </div>
        </div>

        {/* Pita tiga warna merek, sama dengan kaki halaman situs. */}
        <div style={{ display: "flex", height: 18 }}>
          <div style={{ flex: 1, background: WARNA.bata }} />
          <div style={{ flex: 1, background: WARNA.kunyit }} />
          <div style={{ flex: 1, background: WARNA.daun }} />
        </div>
      </div>
    ),
    size
  );
}
