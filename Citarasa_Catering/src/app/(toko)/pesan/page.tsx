import type { Metadata } from "next";
import { db } from "@/lib/db";
import { bacaSesi } from "@/lib/auth";
import { ambilPengaturan, rekeningLengkap } from "@/lib/pengaturan";
import { ambilMenuUntukPemesanan } from "@/lib/menu";
import { kunciHari, linkWhatsapp } from "@/lib/format";
import { catatPeristiwa } from "@/lib/analitik";
import { FormPemesanan } from "@/components/toko/FormPemesanan";
import { buatTokenFormulir } from "@/lib/anti-bot";
import { LangkahPesan } from "@/components/toko/LangkahPesan";

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

  // Hanya bidang yang dipakai formulir: objek Pengguna utuh memuat hash sandi,
  // dan apa pun yang dioper ke komponen klien ikut terkirim ke peramban.
  const pengguna = sesi
    ? await db.pengguna.findUnique({ where: { id: sesi.id }, select: { nama: true, telepon: true, alamat: true } })
    : null;

  if (daftarMenu.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="judul-halaman">Belum bisa menerima pesanan</h1>
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
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-5 pb-8 sm:pt-10 sm:pb-12">
      <LangkahPesan aktif={2} />
      <h1 className="mt-5 font-tampil text-[1.75rem] sm:text-4xl font-bold text-kayu">Checkout</h1>
      <p className="teks-redup mt-1 mb-6">Lengkapi empat bagian di bawah. Total selalu terlihat di ringkasan.</p>

      <FormPemesanan
        daftarMenu={daftarMenu}
        menuAwalSlug={params.menu}
        pengaturan={pengaturan}
        tanggalLibur={tutup.map((t) => kunciHari(t.tanggal))}
        pengguna={pengguna}
        rekeningTersedia={rekeningLengkap(pengaturan)}
        tokenFormulir={buatTokenFormulir(Date.now(), process.env.SESSION_SECRET ?? "")}
      />
    </div>
  );
}
