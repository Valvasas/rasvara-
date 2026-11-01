import type { Metadata, Viewport } from "next";
import { Archivo, Domine } from "next/font/google";
import { alamatSitus } from "@/lib/situs";
import { Pemberitahuan } from "@/components/Pemberitahuan";
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
  themeColor: "#FFFCF7",
  // Pengguna tetap boleh mencubit-perbesar: banyak orang tua mengandalkannya.
  maximumScale: 5,
};

/**
 * Menerapkan pilihan "Teks besar" (dan menyalakan animasi muncul-saat-digulir
 * bila peramban mendukung & pengguna tidak meminta gerak dikurangi) sebelum
 * halaman pertama kali dilukis.
 * Kalau ditunggu sampai React berjalan, pengguna melihat teks kecil sekejap
 * lalu melompat membesar di setiap pembukaan halaman. Dibungkus try karena
 * localStorage bisa diblokir (mode privat, pengaturan peramban).
 */
const SKRIP_AWAL = `try{var h=document.documentElement;if(localStorage.getItem("citarasa:teks")==="besar")h.dataset.teks="besar";if("IntersectionObserver"in window&&!matchMedia("(prefers-reduced-motion: reduce)").matches)h.dataset.gerak="1"}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning: atribut data-teks sengaja dipasang skrip di
    // bawah sebelum React mengambil alih, jadi HTML server dan klien memang beda.
    <html lang="id" className={`${archivo.variable} ${domine.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SKRIP_AWAL }} />
      </head>
      <body className="bg-krem text-kayu min-h-screen flex flex-col selection:bg-bata selection:text-white">
        <a
          href="#isi"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] tombol-utama"
        >
          Lompat ke isi halaman
        </a>
        {children}
        <Pemberitahuan />
      </body>
    </html>
  );
}

