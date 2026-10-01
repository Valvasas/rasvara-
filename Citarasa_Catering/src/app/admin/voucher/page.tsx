import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { bacaSesi } from "@/lib/auth";
import { KelolaVoucher, type VoucherRingkas } from "@/components/admin/KelolaVoucher";

export const metadata = { title: "Voucher" };

export default async function HalamanAdminVoucher() {
  const sesi = await bacaSesi();
  if (sesi?.peran !== "PEMILIK") {
    redirect("/admin");
  }

  const daftar: VoucherRingkas[] = await db.voucher.findMany({
    orderBy: [{ aktif: "desc" }, { dibuatPada: "desc" }],
    // Voucher yang dibuat UMKM jarang lebih dari puluhan; batas ini hanya
    // pengaman supaya halaman tidak pernah menarik ribuan baris sekaligus.
    take: 200,
    select: {
      id: true,
      kode: true,
      deskripsi: true,
      jenis: true,
      nilai: true,
      maksPotongan: true,
      minBelanja: true,
      kuota: true,
      terpakai: true,
      berakhirPada: true,
      aktif: true,
    },
  });

  return (
    <div className="max-w-4xl">
      <h1 className="judul-halaman">Voucher</h1>
      <p className="teks-redup mt-1 mb-6 max-w-2xl">
        Potongan hanya mengurangi harga menu, bukan ongkir, dan selalu dihitung ulang di server.
      </p>
      <KelolaVoucher daftar={daftar} />
    </div>
  );
}
