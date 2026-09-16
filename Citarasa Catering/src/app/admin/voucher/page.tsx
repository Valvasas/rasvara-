import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { bacaSesi } from "@/lib/auth";
import { KelolaVoucher, type VoucherRingkas } from "@/components/admin/KelolaVoucher";

export const metadata = { title: "Voucher & Promo" };

export default async function HalamanAdminVoucher() {
  const sesi = await bacaSesi();
  if (sesi?.peran !== "PEMILIK") {
    redirect("/admin");
  }

  let daftar: VoucherRingkas[] = [];
  try {
    daftar = await db.voucher.findMany({
      orderBy: [{ aktif: "desc" }, { dibuatPada: "desc" }],
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
  } catch {
    // Database belum siap: tampilkan halaman kosong, bukan layar error.
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-krem-gelap shadow-sm">
        <h1 className="text-2xl font-extrabold text-kayu">Voucher &amp; Promo</h1>
        <p className="text-xs text-kayu-sedang mt-0.5 max-w-2xl">
          Potongan dihitung ulang di server saat pesanan dibuat, jadi kode yang
          disebar tidak bisa dipakai menembus aturan minimal belanja maupun kuota.
          Potongan hanya mengurangi harga hidangan, tidak pernah ongkos antar.
        </p>
      </div>

      <KelolaVoucher daftar={daftar} />
    </div>
  );
}
