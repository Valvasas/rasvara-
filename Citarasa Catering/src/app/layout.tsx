import type { Metadata, Viewport } from "next";
import { Archivo, Domine } from "next/font/google";
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

export const metadata: Metadata = {
  title: {
    default: "Citarasa Catering — Masakan Hangat, Siap Tepat Waktu",
    template: "%s — Citarasa Catering",
  },
  description:
    "Catering rumahan terpercaya: snack box, nasi kotak, tumpeng, dan nasi goreng. Dapur higienis, rasa mantap, siap tepat waktu.",
  icons: {
    icon: "/favicon.ico",
  },
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
      <body className="bg-krem text-kayu min-h-screen flex flex-col selection:bg-bata selection:text-white">
        {children}
      </body>
    </html>
  );
}

