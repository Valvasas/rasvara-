import type { Metadata } from "next";
import { ambilPengaturan } from "@/lib/pengaturan";
import { FormPengaturan, FormSandi } from "@/components/admin/FormPengaturan";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Pengaturan" };

export default async function HalamanPengaturan() {
  const pengaturan = await ambilPengaturan();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header>
        <p className="label-kolom">Pengaturan</p>
        <h1 className="mt-1 text-3xl sm:text-4xl">Pengaturan usaha</h1>
        <p className="mt-2 max-w-2xl text-arang-muda">
          Isi yang Anda ubah di sini akan langsung tampil di website pelanggan.
        </p>
      </header>

      <div className="mt-7 space-y-6">
        <FormPengaturan
          awal={{
            namaUsaha: pengaturan.namaUsaha,
            tagline: pengaturan.tagline,
            cerita: pengaturan.cerita,
            whatsapp: pengaturan.whatsapp,
            alamat: pengaturan.alamat,
            jamBuka: pengaturan.jamBuka,
            jamTutup: pengaturan.jamTutup,
            namaBank: pengaturan.namaBank,
            nomorRekening: pengaturan.nomorRekening,
            namaRekening: pengaturan.namaRekening,
            ongkirDefault: pengaturan.ongkirDefault,
            minOrderAntar: pengaturan.minOrderAntar,
          }}
        />

        <FormSandi />
      </div>
    </div>
  );
}
