import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormDaftar } from "@/components/FormDaftar";
import { KerangkaAuth } from "@/components/KerangkaAuth";
import { bacaSesi } from "@/lib/auth";
import { tujuanAman } from "@/lib/kepemilikan";

export const metadata: Metadata = { title: "Daftar", robots: { index: false } };

interface HalamanDaftarProps {
  searchParams: Promise<{ ke?: string }>;
}

export default async function HalamanDaftar({ searchParams }: HalamanDaftarProps) {
  const [{ ke: keMentah }, sesi] = await Promise.all([searchParams, bacaSesi()]);
  const ke = keMentah ? tujuanAman(keMentah, "") || undefined : undefined;
  if (sesi) redirect(ke ?? "/akun");
  // Akun dapur tidak dibuat lewat pendaftaran publik: portal dapur hanya punya "Masuk".
  if (ke?.startsWith("/admin")) redirect(`/masuk?ke=${encodeURIComponent(ke)}`);

  return (
    <KerangkaAuth mode="daftar" ke={ke}>
      <FormDaftar ke={ke} />
    </KerangkaAuth>
  );
}
