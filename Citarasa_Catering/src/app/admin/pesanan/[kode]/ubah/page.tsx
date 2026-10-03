import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { bacaSesi } from "@/lib/auth";
import { ambilMenuUntukPemesanan } from "@/lib/menu";
import { ambilPengaturan } from "@/lib/pengaturan";
import { hariIniWib, kunciHari } from "@/lib/format";
import { FormPesananAdmin } from "@/components/admin/FormPesananAdmin";
import { IkonPanahKiri } from "@/components/ikon/Ikon";

export const metadata: Metadata = { title: "Ubah pesanan" };

export default async function HalamanUbahPesanan({ params }: { params: Promise<{ kode: string }> }) {
  const sesi = await bacaSesi();
  if (sesi?.peran !== "PEMILIK") redirect("/admin");

  const { kode } = await params;
  const [pesanan, daftarMenu, pengaturan] = await Promise.all([
    db.pesanan.findUnique({ where: { kode }, include: { item: { orderBy: { id: "asc" } } } }),
    ambilMenuUntukPemesanan(),
    ambilPengaturan(),
  ]);
  if (!pesanan) notFound();
  if (pesanan.status !== "BARU" && pesanan.status !== "DIKONFIRMASI") redirect(`/admin/pesanan/${kode}`);

  return (
    <div>
      <Link href={`/admin/pesanan/${kode}`} className="inline-flex items-center gap-1.5 text-sm text-kayu-sedang hover:text-kayu">
        <IkonPanahKiri className="w-4 h-4" /> {kode}
      </Link>
      <h1 className="judul-halaman mt-3">Ubah pesanan</h1>
      <p className="teks-redup mt-1 mb-6">Menu lama tetap memakai harga saat dipesan; menu yang ditambahkan memakai harga sekarang.</p>
      <FormPesananAdmin
        daftarMenu={daftarMenu}
        ongkirDefault={pengaturan.ongkirDefault}
        minOrderAntar={pengaturan.minOrderAntar}
        persenDp={pengaturan.persenDp}
        adalahPemilik
        hariIni={hariIniWib()}
        pesanan={{
          kode: pesanan.kode,
          namaPemesan: pesanan.namaPemesan,
          teleponPemesan: pesanan.teleponPemesan,
          tanggalAcara: kunciHari(pesanan.tanggalAcara),
          jamAcara: pesanan.jamAcara,
          caraAmbil: pesanan.caraAmbil,
          alamatAntar: pesanan.alamatAntar,
          caraBayar: pesanan.caraBayar,
          catatan: pesanan.catatan,
          diskon: pesanan.diskon,
          kodeVoucher: pesanan.kodeVoucher,
          dibayar: pesanan.dibayar,
          item: pesanan.item.map((i) => ({
            id: i.id,
            namaMenu: i.namaMenu,
            hargaSatuan: i.hargaSatuan,
            satuan: i.satuan,
            jumlah: i.jumlah,
            menuId: i.menuId,
          })),
        }}
      />
    </div>
  );
}
