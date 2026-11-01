import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormMasuk } from "@/components/FormMasuk";
import { KerangkaAuth } from "@/components/KerangkaAuth";
import { bacaSesi } from "@/lib/auth";
import { ambilPengaturan } from "@/lib/pengaturan";
import { linkWhatsapp } from "@/lib/format";
import { tujuanAman } from "@/lib/kepemilikan";

export const metadata: Metadata = { title: "Masuk", robots: { index: false } };

interface HalamanMasukProps {
  searchParams: Promise<{ ke?: string }>;
}

export default async function HalamanMasuk({ searchParams }: HalamanMasukProps) {
  const [{ ke: keMentah }, sesi, pengaturan] = await Promise.all([searchParams, bacaSesi(), ambilPengaturan()]);
  // Disaring sejak di sini juga (bukan hanya di server action) supaya tautan
  // tab Masuk/Daftar tidak ikut membawa tujuan berbahaya.
  const ke = keMentah ? tujuanAman(keMentah, "") || undefined : undefined;

  // Sudah masuk: tidak ada gunanya melihat formulir lagi.
  if (sesi) {
    redirect(ke ?? (sesi.peran === "PELANGGAN" ? "/riwayat" : "/admin"));
  }

  const waLupaSandi = pengaturan.whatsapp
    ? linkWhatsapp(pengaturan.whatsapp, `Halo ${pengaturan.namaUsaha}, saya lupa kata sandi akun saya. Nomor saya: `)
    : null;

  return (
    <KerangkaAuth mode="masuk" ke={ke}>
      <FormMasuk ke={ke} waLupaSandi={waLupaSandi} />
    </KerangkaAuth>
  );
}
