import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { wajibStafAtauPemilik } from "@/lib/auth";
import { ambilPengaturan } from "@/lib/pengaturan";
import { TampilanCetakPesanan } from "@/components/admin/TampilanCetakPesanan";

interface HalamanCetakProps {
  params: Promise<{ kode: string }>;
}

export default async function HalamanCetakPesanan({
  params,
}: HalamanCetakProps) {
  await wajibStafAtauPemilik();

  const { kode } = await params;

  const [pesanan, pengaturan] = await Promise.all([
    db.pesanan.findUnique({
      where: { kode },
      include: { item: true },
    }),
    ambilPengaturan(),
  ]);

  if (!pesanan) {
    notFound();
  }

  return <TampilanCetakPesanan pesanan={pesanan} pengaturan={pengaturan} />;
}

