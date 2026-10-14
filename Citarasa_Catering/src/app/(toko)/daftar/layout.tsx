import type { Metadata } from "next";

// page.tsx halaman ini komponen klien, yang tidak bisa mengekspor metadata.
export const metadata: Metadata = { title: "Daftar akun", robots: { index: false } };

export default function TataLetakDaftar({ children }: { children: React.ReactNode }) {
  return children;
}
