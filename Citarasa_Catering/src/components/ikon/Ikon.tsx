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

/* ---------- Ikon antarmuka umum ---------- */

export function IkonPanahKanan(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </Bingkai>
  );
}

export function IkonPanahKiri(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </Bingkai>
  );
}

export function IkonTambah(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Bingkai>
  );
}

export function IkonKurang(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <path d="M5 12h14" />
    </Bingkai>
  );
}

export function IkonTutup(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Bingkai>
  );
}

export function IkonLokasi(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </Bingkai>
  );
}

export function IkonTruk(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62L18.3 9.38a1 1 0 0 0-.78-.38H14" />
      <circle cx="17" cy="18" r="2" />
      <circle cx="7" cy="18" r="2" />
    </Bingkai>
  );
}

export function IkonToko(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
      <path d="M2 7h20" />
      <path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7" />
    </Bingkai>
  );
}

export function IkonKalender(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </Bingkai>
  );
}

export function IkonPapan(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
      <path d="M15 3v18" />
    </Bingkai>
  );
}

export function IkonArsip(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <rect x="2" y="3" width="20" height="5" rx="1" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </Bingkai>
  );
}

export function IkonDompet(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </Bingkai>
  );
}

export function IkonTiket(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" />
      <path d="M13 17v2" />
      <path d="M13 11v2" />
    </Bingkai>
  );
}

export function IkonLaporan(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </Bingkai>
  );
}

export function IkonGrafik(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <path d="M22 7 13.5 15.5 8.5 10.5 2 17" />
      <path d="M16 7h6v6" />
    </Bingkai>
  );
}

export function IkonPengaturan(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </Bingkai>
  );
}

export function IkonKeluar(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </Bingkai>
  );
}

export function IkonCetak(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" />
      <rect x="6" y="14" width="12" height="8" rx="1" />
    </Bingkai>
  );
}

export function IkonFoto(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21" />
    </Bingkai>
  );
}

export function IkonUnduh(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
      <path d="M12 15V3" />
    </Bingkai>
  );
}

export function IkonKunci(props: IkonProps) {
  return (
    <Bingkai {...props}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Bingkai>
  );
}

export function IkonWhatsapp(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.42-.08-.12-.28-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.43 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45h.01c6.55 0 11.89-5.34 11.89-11.89a11.82 11.82 0 0 0-3.48-8.41Z" />
    </svg>
  );
}
