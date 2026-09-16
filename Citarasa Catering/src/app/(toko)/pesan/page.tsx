import { db } from "@/lib/db";
import { bacaSesi } from "@/lib/auth";
import { ambilPengaturan } from "@/lib/pengaturan";
import { ambilMenuAktif, type MenuDenganFoto } from "@/lib/menu";
import { kunciHari } from "@/lib/format";
import { catatPeristiwa } from "@/lib/analitik";
import { FormPemesanan } from "@/components/toko/FormPemesanan";
import type { Pengguna } from "@/generated/prisma/client";

interface HalamanPesanProps {
  searchParams: Promise<{ menu?: string }>;
}

export default async function HalamanPesan({ searchParams }: HalamanPesanProps) {
  const params = await searchParams;
  const menuAwalSlug = params.menu;

  const daftarMenu: MenuDenganFoto[] = await ambilMenuAktif();
  const pengaturan = await ambilPengaturan();

  await catatPeristiwa("FORM_PESAN_DIBUKA");
  let tanggalLibur: string[] = [];
  let pengguna: Pengguna | null = null;

  try {
    const [tutup, sesi] = await Promise.all([
      db.tanggalTutup.findMany({
        where: { tanggal: { gte: new Date() } },
      }),
      bacaSesi(),
    ]);

    tanggalLibur = tutup.map((t) => kunciHari(t.tanggal));

    if (sesi) {
      pengguna = await db.pengguna.findUnique({
        where: { id: sesi.id },
      });
    }
  } catch {
    // Fallback jika database belum aktif saat dev
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
      <div className="text-center max-w-xl mx-auto space-y-2">
        <span className="text-xs font-bold uppercase tracking-widest text-bata">
          Formulir Pemesanan
        </span>
        <h1 className="text-3xl font-extrabold text-kayu">
          Pesan Catering Citarasa
        </h1>
        <p className="text-xs text-kayu-sedang">
          Pilih menu, tentukan jadwal acara, dan kami pastikan hidangan siap
          hangat tepat waktu.
        </p>
      </div>

      <FormPemesanan
        daftarMenu={daftarMenu}
        menuAwalSlug={menuAwalSlug}
        pengaturan={pengaturan}
        tanggalLibur={tanggalLibur}
        pengguna={pengguna}
      />
    </div>
  );
}

