import type { Metadata } from "next";
import { db } from "@/lib/db";
import { bacaSesi } from "@/lib/auth";
import { ambilPengaturan, rekeningLengkap } from "@/lib/pengaturan";
import { ambilMenuUntukPemesanan } from "@/lib/menu";
import { kunciHari, linkWhatsapp } from "@/lib/format";
import { catatPeristiwa } from "@/lib/analitik";
import { FormPemesanan } from "@/components/toko/FormPemesanan";
import { IlustrasiPiringKosong } from "@/components/ilustrasi/Ilustrasi";
import { IkonDompet, IkonNota, IkonPengguna } from "@/components/ikon/Ikon";

export const metadata: Metadata = {
  title: "Buat pesanan",
  robots: { index: false },
};

interface HalamanPesanProps {
  searchParams: Promise<{ menu?: string }>;
}

export default async function HalamanPesan({ searchParams }: HalamanPesanProps) {
  const params = await searchParams;

  // Kegagalan database dibiarkan naik ke error.tsx: formulir yang terbuka
  // tanpa katalog hanya membuat pembeli mengisi panjang lalu gagal di akhir.
  const [daftarMenu, pengaturan, tutup, sesi] = await Promise.all([
    ambilMenuUntukPemesanan(),
    ambilPengaturan(),
    db.tanggalTutup.findMany({
      where: { tanggal: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      select: { tanggal: true },
      orderBy: { tanggal: "asc" },
      // Hanya tanggal terdekat yang berguna di pemilih tanggal.
      take: 180,
    }),
    bacaSesi(),
  ]);

  await catatPeristiwa("FORM_PESAN_DIBUKA");

  const pengguna = sesi ? await db.pengguna.findUnique({ where: { id: sesi.id } }) : null;

  if (daftarMenu.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <IlustrasiPiringKosong className="w-48 mx-auto" />
        <h1 className="judul-halaman mt-4">Belum bisa menerima pesanan</h1>
        <p className="teks-redup mt-3">
          Menu sedang disiapkan dapur. Silakan kembali lagi nanti
          {pengaturan.whatsapp ? " atau tanya langsung lewat WhatsApp" : ""}.
        </p>
        {pengaturan.whatsapp && (
          <a
            href={linkWhatsapp(pengaturan.whatsapp, `Halo ${pengaturan.namaUsaha}, saya mau pesan.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="tombol-kedua mt-6"
          >
            Chat WhatsApp
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 pb-10 sm:py-12">
      <header className="mb-6 sm:mb-8">
        <h1 className="font-tampil text-3xl sm:text-4xl font-bold text-kayu">Buat pesanan</h1>
        <p className="teks-redup mt-1.5">Isi tiga langkah di bawah. Total selalu terlihat di ringkasan.</p>
        {/* Menjawab keraguan yang paling sering menahan pembeli baru. */}
        <ul className="mt-4 flex flex-wrap gap-2 text-xs sm:text-sm">
          {[
            { teks: "Tanpa daftar akun", Ikon: IkonPengguna },
            { teks: "Bayar setelah pesan", Ikon: IkonDompet },
            { teks: "Status bisa dilacak", Ikon: IkonNota },
          ].map(({ teks, Ikon }) => (
            <li key={teks} className="inline-flex items-center gap-1.5 rounded-full bg-white border border-krem-gelap px-3 py-1.5 text-kayu-sedang">
              <Ikon className="w-4 h-4 text-bata" />
              {teks}
            </li>
          ))}
        </ul>
      </header>

      <FormPemesanan
        daftarMenu={daftarMenu}
        menuAwalSlug={params.menu}
        pengaturan={pengaturan}
        tanggalLibur={tutup.map((t) => kunciHari(t.tanggal))}
        pengguna={pengguna}
        rekeningTersedia={rekeningLengkap(pengaturan)}
      />
    </div>
  );
}
