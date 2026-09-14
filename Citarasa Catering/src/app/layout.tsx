import type { Metadata, Viewport } from "next";
import "./globals.css";

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
    <html lang="id">
      <body className="bg-krem text-kayu min-h-screen flex flex-col selection:bg-bata selection:text-white">
        {children}
      </body>
    </html>
  );
}

