import type { Metadata } from "next";
import Link from "next/link";
import { bacaSesi } from "@/lib/auth";
import { ambilMenuUntukPemesanan } from "@/lib/menu";
import { ambilPengaturan } from "@/lib/pengaturan";
import { hariIniWib } from "@/lib/format";
import { FormPesananAdmin } from "@/components/admin/FormPesananAdmin";
import { IkonPanahKiri } from "@/components/ikon/Ikon";

export const metadata: Metadata = { title: "Catat pesanan" };

export default async function HalamanPesananBaru() {
  const [sesi, daftarMenu, pengaturan] = await Promise.all([bacaSesi(), ambilMenuUntukPemesanan(), ambilPengaturan()]);

  return (
    <div>
      <Link href="/admin/pesanan" className="inline-flex items-center gap-1.5 text-sm text-kayu-sedang hover:text-kayu">
        <IkonPanahKiri className="w-4 h-4" /> Semua pesanan
      </Link>
      <h1 className="judul-halaman mt-3">Catat pesanan</h1>
      <p className="teks-redup mt-1 mb-6">Untuk pesanan dari WhatsApp, telepon, atau yang datang langsung.</p>

      {daftarMenu.length === 0 ? (
        <p className="kartu kartu-isi teks-redup">
          Belum ada menu aktif. <Link href="/admin/menu/baru" className="text-bata hover:underline">Tambah menu dulu</Link>.
        </p>
      ) : (
        <FormPesananAdmin
          daftarMenu={daftarMenu}
          ongkirDefault={pengaturan.ongkirDefault}
          minOrderAntar={pengaturan.minOrderAntar}
          persenDp={pengaturan.persenDp}
          adalahPemilik={sesi?.peran === "PEMILIK"}
          hariIni={hariIniWib()}
        />
      )}
    </div>
  );
}
