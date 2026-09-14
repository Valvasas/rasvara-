import { db } from "@/lib/db";
import { bacaSesi } from "@/lib/auth";
import { ambilPengaturan } from "@/lib/pengaturan";
import { ambilMenuAktif } from "@/lib/menu";
import { kunciHari } from "@/lib/format";
import { FormPemesanan } from "@/components/toko/FormPemesanan";
import type { Menu, Pengguna } from "@/generated/prisma/client";

interface HalamanPesanProps {
  searchParams: Promise<{ menu?: string; ulang?: string }>;
}

export default async function HalamanPesan({ searchParams }: HalamanPesanProps) {
  const params = await searchParams;
  const menuAwalSlug = params.menu;
  const kodeUlang = params.ulang;

  const daftarMenu: Menu[] = await ambilMenuAktif();
  const pengaturan = await ambilPengaturan();
  let tanggalLibur: string[] = [];
  let pengguna: Pengguna | null = null;
  let itemAwalUlang: { menuId: string; jumlah: number }[] | undefined;
  const menuTidakTersediaUlang: string[] = [];

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

      // Pesan ulang: hanya izinkan mengisi ulang item dari pesanan MILIK pengguna
      // yang sedang login (penggunaId cocok, atau tercocokkan lewat nomor telepon
      // sama seperti aturan akses di /riwayat) — kode pesanan saja tidak cukup.
      if (kodeUlang) {
        const pesananLama = await db.pesanan.findUnique({
          where: { kode: kodeUlang },
          include: { item: true },
        });

        const pemilikSah =
          pesananLama &&
          (pesananLama.penggunaId === sesi.id ||
            pesananLama.teleponPemesan === sesi.telepon);

        if (pemilikSah) {
          const menuAktifById = new Map(daftarMenu.map((m) => [m.id, m]));
          itemAwalUlang = [];

          for (const it of pesananLama.item) {
            const menuMasihAda = it.menuId ? menuAktifById.get(it.menuId) : null;
            if (menuMasihAda) {
              itemAwalUlang.push({ menuId: menuMasihAda.id, jumlah: it.jumlah });
            } else {
              menuTidakTersediaUlang.push(it.namaMenu);
            }
          }
        }
      }
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
        itemAwal={itemAwalUlang}
        menuTidakTersediaUlang={menuTidakTersediaUlang}
        pengaturan={pengaturan}
        tanggalLibur={tanggalLibur}
        pengguna={pengguna}
      />
    </div>
  );
}

