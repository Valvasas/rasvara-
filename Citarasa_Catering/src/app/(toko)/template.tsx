import { ViewTransition } from "react";

/**
 * Template dipasang ulang di setiap perpindahan halaman (berbeda dengan
 * layout yang menetap), jadi di sinilah isi halaman diberi animasi masuk.
 * Peramban tanpa dukungan View Transitions tetap berpindah halaman normal.
 */
export default function TemplateToko({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="halaman" exit="halaman" default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
