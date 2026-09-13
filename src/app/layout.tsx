import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Fraunces: serif hangat dengan sudut lembut - terasa seperti papan nama warung
// tulisan tangan, bukan korporat.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fraunces",
  display: "swap",
});

// Plus Jakarta Sans: dirancang untuk kota Jakarta, huruf lebar dan terbuka
// sehingga nyaman dibaca di layar HP pada malam hari.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Citarasa Catering - Masakan hangat, siap tepat waktu",
    template: "%s | Citarasa Catering",
  },
  description:
    "Citarasa Catering melayani snack box, nasi kotak, tumpeng, dan nasi goreng. Pesan mudah, dimasak segar, diantar tepat waktu.",
};

export const viewport: Viewport = {
  themeColor: "#b54321",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${fraunces.variable} ${jakarta.variable}`}>
      <body>
        <a href="#isi-utama" className="lewati-tautan">
          Lewati ke isi utama
        </a>
        {children}
      </body>
    </html>
  );
}
