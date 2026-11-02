import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { alamatSitus } from "@/lib/situs";
import { Pemberitahuan } from "@/components/Pemberitahuan";
import "./globals.css";

/*
 * Tiga suara tipografi, masing-masing satu tugas:
 * - Plus Jakarta Sans (teks): dirancang untuk identitas kota Jakarta —
 *   huruf lokal, x-height tinggi, tetap jelas di 15px pada layar ponsel murah.
 * - Bricolage Grotesque (judul): grotesk berkarakter dengan sumbu optik;
 *   memberi kepribadian tanpa jatuh ke serif "artisan" yang klise.
 * - JetBrains Mono (presisi): jam siap, kode pesanan, nominal — angka yang
 *   harus terbaca tepat, tidak boleh tertukar 1/l atau 0/O.
 * Semuanya font variabel (satu berkas per keluarga) dan di-host sendiri oleh
 * next/font, jadi tidak ada permintaan ke Google saat halaman dibuka.
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  axes: ["opsz"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const JUDUL = "Citarasa Catering — Sehat, Matang, Tepat Waktu";
const DESKRIPSI =
  "Nasi kotak, tumpeng, snack box, dan nasi goreng yang dimasak hari itu juga. Harga final sebelum pesan, jadwal siap sampai menitnya, status bisa dipantau dari ponsel.";

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
  themeColor: "#0A3A2C",
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
    <html lang="id" className={`${jakarta.variable} ${bricolage.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SKRIP_AWAL }} />
      </head>
      <body className="bg-beras text-arang min-h-screen flex flex-col selection:bg-kunyit-terang selection:text-arang">
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

