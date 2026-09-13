import { redirect } from "next/navigation";
import { bacaSesi } from "@/lib/auth";
import { db } from "@/lib/db";
import { KopAdmin } from "@/components/admin/KopAdmin";

export const dynamic = "force-dynamic";

export default async function LayoutAdmin({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const sesi = await bacaSesi();

  // Satu penjaga di layout melindungi semua halaman di bawah /admin sekaligus,
  // jadi tidak ada halaman yang lupa dipasangi pemeriksaan.
  if (!sesi) redirect("/masuk");
  if (sesi.peran !== "PEMILIK") redirect("/riwayat");

  // Jumlah pesanan baru selalu terlihat di navigasi, jadi pemilik tidak perlu
  // membuka halaman pesanan hanya untuk memeriksa ada tidaknya yang menunggu.
  const pesananBaru = await db.pesanan.count({ where: { status: "BARU" } });

  return (
    <div className="flex min-h-screen flex-col bg-krem">
      <KopAdmin nama={sesi.nama} pesananBaru={pesananBaru} />
      <main id="isi-utama" className="flex-1 pb-16">
        {children}
      </main>
    </div>
  );
}
