import type { Metadata, Viewport } from "next";
import { Archivo, Domine } from "next/font/google";
import { alamatSitus } from "@/lib/situs";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-archivo",
  display: "swap",
});

const domine = Domine({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-domine",
  display: "swap",
});

const JUDUL = "Citarasa Catering — Masakan Hangat, Siap Tepat Waktu";
const DESKRIPSI =
  "Catering rumahan terpercaya: snack box, nasi kotak, tumpeng, dan nasi goreng. Dapur higienis, rasa mantap, siap tepat waktu.";

export const metadata: Metadata = {
  // Wajib ada supaya URL gambar Open Graph dirender absolut. Tanpa ini,
  // WhatsApp dan Facebook tidak bisa mengambil gambar pratinjaunya.
  metadataBase: new URL(alamatSitus()),
  title: {
    default: JUDUL,
    template: "%s — Citarasa Catering",
  },
  description: DESKRIPSI,
  applicationName: "Citarasa Catering",
  keywords: [
    "catering",
    "katering",
    "nasi kotak",
    "snack box",
    "tumpeng",
    "nasi goreng",
    "catering rumahan",
  ],
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Citarasa Catering",
    title: JUDUL,
    description: DESKRIPSI,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: JUDUL,
    description: DESKRIPSI,
  },
  robots: {
    index: true,
    follow: true,
  },
  // Ikon dan gambar Open Graph dihasilkan oleh icon.tsx, apple-icon.tsx, dan
  // opengraph-image.tsx — Next.js menyisipkan tag-nya sendiri.
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FBF7EE",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${archivo.variable} ${domine.variable}`}>
      <body className="bg-krem tekstur-kertas text-kayu min-h-screen flex flex-col selection:bg-bata selection:text-white">
        {children}
      </body>
    </html>
  );
}

