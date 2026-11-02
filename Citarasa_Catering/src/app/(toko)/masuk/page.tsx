import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormMasuk } from "@/components/FormMasuk";
import { KerangkaAuth } from "@/components/KerangkaAuth";
import { bacaSesi } from "@/lib/auth";
import { tujuanAman } from "@/lib/kepemilikan";

export const metadata: Metadata = { title: "Masuk", robots: { index: false } };

interface HalamanMasukProps {
  searchParams: Promise<{ ke?: string }>;
}

export default async function HalamanMasuk({ searchParams }: HalamanMasukProps) {
  const [{ ke: keMentah }, sesi] = await Promise.all([searchParams, bacaSesi()]);
  // Disaring sejak di sini juga (bukan hanya di server action) supaya tautan
  // tab Masuk/Daftar tidak ikut membawa tujuan berbahaya.
  const ke = keMentah ? tujuanAman(keMentah, "") || undefined : undefined;

  // Sudah masuk: tidak ada gunanya melihat formulir lagi.
  if (sesi) {
    const dapur = sesi.peran !== "PELANGGAN";
    // Pelanggan yang membuka portal dapur dikembalikan ke halamannya sendiri,
    // bukan dipantulkan admin/layout ke /riwayat tanpa penjelasan.
    if (ke?.startsWith("/admin") && !dapur) redirect("/riwayat");
    redirect(ke ?? (dapur ? "/admin" : "/riwayat"));
  }

  return (
    <KerangkaAuth mode="masuk" ke={ke}>
      <FormMasuk ke={ke} dapur={Boolean(ke?.startsWith("/admin"))} />
    </KerangkaAuth>
  );
}
