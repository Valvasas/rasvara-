import type { SVGProps } from "react";

/**
 * Ikon garis bergaya Lucide (stroke 1.75-2px, currentColor, tanpa fill),
 * di-inline langsung sebagai komponen React (bukan CDN) supaya konsisten
 * dengan pola SVG WhatsApp yang sudah ada di KakiToko.tsx dan tetap jalan
 * tanpa akses jaringan. Dipakai untuk mengganti emoji di UI publik.
 */
type IkonProps = SVGProps<SVGSVGElement>;

function Bingkai({ children, ...props }: IkonProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Kotak nasi — kategori Nasi Kotak */
export function IkonKotakNasi(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <path d="M4 8.5 12 4l8 4.5" />
      <path d="M4 8.5v9L12 22l8-4.5v-9" />
      <path d="M4 8.5 12 13l8-4.5" />
      <path d="M12 13v9" />
    </Bingkai>
  );
}

/** Kue/snack bulat — kategori Snack Box */
export function IkonSnack(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <path d="M12 3c1 1.6 3.2 1.9 4.8 2.6A7.8 7.8 0 0 1 21 12a9 9 0 1 1-9-9Z" />
      <path d="M9.5 11.5h.01" />
      <path d="M13 14h.01" />
      <path d="M9.5 16.5h.01" />
    </Bingkai>
  );
}

/** Tumpeng kerucut dengan hiasan — kategori Tumpeng */
export function IkonTumpeng(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <path d="M12 3v3" />
      <path d="M12 6 6 20h12L12 6Z" />
      <path d="M8.5 15h7" />
    </Bingkai>
  );
}

/** Wajan dengan uap panas — kategori Nasi Goreng */
export function IkonNasiGoreng(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <path d="M7 5c.4.8.8 1.6 0 2.4" />
      <path d="M12 4c.55 1.1 1.1 2.2 0 3.3" />
      <path d="M17 5c.4.8.8 1.6 0 2.4" />
      <path d="M3 11h18c0 5-3.6 8-9 8s-9-3-9-8Z" />
      <path d="M2 11h1.5M20.5 11H22" />
    </Bingkai>
  );
}

/** Jam — komitmen "Tepat Jam Acara" */
export function IkonJam(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </Bingkai>
  );
}

/** Daun — komitmen "Bumbu Asli & Halal" */
export function IkonDaun(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <path d="M20 4c-9 0-16 5-16 14 9 0 14-5 16-14Z" />
      <path d="M8.5 17.5C11 13 14 9.5 19.5 5" />
    </Bingkai>
  );
}

/** Ponsel — komitmen "Lacak Status Real-time" */
export function IkonHp(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M10.5 18.5h3" />
    </Bingkai>
  );
}

/** Cabai — badge "Resep Asli Rumahan" */
export function IkonCabai(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <path d="M12 3c1.5 1 1.2 2.6 0 3.4" />
      <path d="M9.5 5.8c3 0 6.5 2.3 6.5 6.7 0 4.7-4.3 8.5-8 8.5-2.8 0-4.5-1.9-4.5-4.3 0-4.8 3.3-10.9 6-10.9Z" />
    </Bingkai>
  );
}

/** Mangkuk hangat — header halaman Daftar */
export function IkonMangkuk(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <path d="M4 11h16c0 5-3.6 9-8 9s-8-4-8-9Z" />
      <path d="M9 11c0-2.5.8-4 3-6" />
      <path d="M8.5 5.5c.6.6.6 1.4 0 2" />
    </Bingkai>
  );
}

/** Mata terbuka — tampilkan kata sandi */
export function IkonMata(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.75" />
    </Bingkai>
  );
}

/** Mata dicoret — sembunyikan kata sandi */
export function IkonMataCoret(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <path d="M3.5 3.5l17 17" />
      <path d="M10.6 6.2A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a15 15 0 0 1-3.1 3.9M7 7.4C4.3 9.1 2.5 12 2.5 12S6 18.5 12 18.5c1.3 0 2.5-.3 3.6-.8" />
      <path d="M9.6 13.4a2.75 2.75 0 0 0 3.9 1.9" />
    </Bingkai>
  );
}

/** Pengguna — header halaman Masuk */
export function IkonPengguna(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c1-3.8 4-5.5 7-5.5s6 1.7 7 5.5" />
    </Bingkai>
  );
}

/** Riwayat/daftar — empty state halaman Riwayat Pesanan */
export function IkonRiwayat(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <rect x="5" y="3.5" width="14" height="17" rx="2" />
      <path d="M9 3v2h6V3" />
      <path d="M8.5 11h7M8.5 14.5h7M8.5 17.5h4" />
    </Bingkai>
  );
}

/** Kaca pembesar — header halaman Lacak Pesanan */
export function IkonCari(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20l-4.8-4.8" />
    </Bingkai>
  );
}

/** Klip kertas — bukti transfer terlampir */
export function IkonLampiran(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <path d="M17.5 8.5 9.6 16.4a3 3 0 0 1-4.2-4.2l8.3-8.3a4.5 4.5 0 0 1 6.36 6.36L11.3 19a2 2 0 1 1-2.83-2.83L15.2 9.4" />
    </Bingkai>
  );
}

/** Peringatan segitiga — pesan galat di form */
export function IkonPeringatan(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <path d="M12 3.5 22 20H2L12 3.5Z" />
      <path d="M12 10v4" />
      <path d="M12 16.75h.01" />
    </Bingkai>
  );
}

/** Salin ke clipboard — tombol TombolSalin sebelum berhasil disalin */
export function IkonSalin(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <rect x="8.5" y="8.5" width="11" height="12" rx="2" />
      <path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9.5a2 2 0 0 0 2 2h2.5" />
    </Bingkai>
  );
}

/** Centang kecil — tahap stepper yang sudah selesai */
export function IkonCek(props: IkonProps) {
  return (
    <Bingkai strokeWidth={2.5} {...props}>
      <path d="M5 12.5 9.5 17 19 7" />
    </Bingkai>
  );
}
