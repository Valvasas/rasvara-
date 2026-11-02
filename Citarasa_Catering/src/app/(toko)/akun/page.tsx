import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { bacaSesi } from "@/lib/auth";
import { ambilPengaturan } from "@/lib/pengaturan";
import { linkWhatsapp, tanggalPendek, teleponTampil } from "@/lib/format";
import { FormGantiSandi } from "@/components/FormGantiSandi";
import { TombolKeluar } from "@/components/TombolKeluar";
import { FormProfil, SakelarTeks } from "@/components/toko/PengaturanAkun";
import { KeluarPerangkatLain } from "@/components/toko/KeluarPerangkatLain";
import { IlustrasiMasuk } from "@/components/ilustrasi/Ilustrasi";
import {
  IkonBantuan,
  IkonCari,
  IkonKunci,
  IkonPanahKanan,
  IkonPapan,
  IkonPerisai,
  IkonStruk,
  IkonWhatsapp,
} from "@/components/ikon/Ikon";

export const metadata: Metadata = { title: "Akun", robots: { index: false } };

function BarisTautan({ href, Ikon, label, keterangan, luar = false }: { href: string; Ikon: typeof IkonStruk; label: string; keterangan?: string; luar?: boolean }) {
  const isi = (
    <>
      <span className="w-10 h-10 shrink-0 rounded-xl bg-beras-tua text-arang flex items-center justify-center">
        <Ikon className="w-5 h-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-arang">{label}</span>
        {keterangan && <span className="block text-[13px] text-arang-sedang">{keterangan}</span>}
      </span>
      <IkonPanahKanan className="w-5 h-5 text-arang-sedang shrink-0" />
    </>
  );
  const kelas = "flex items-center gap-3 px-4 sm:px-5 py-3.5 min-h-[60px] hover:bg-beras transition-colors";
  return luar ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={kelas}>
      {isi}
    </a>
  ) : (
    <Link href={href} className={kelas}>
      {isi}
    </Link>
  );
}

export default async function HalamanAkun() {
  const [sesi, pengaturan] = await Promise.all([bacaSesi(), ambilPengaturan()]);
  const pengguna = sesi
    ? await db.pengguna.findUnique({ where: { id: sesi.id }, select: { nama: true, telepon: true, alamat: true, peran: true, dibuatPada: true } })
    : null;
  const waUrl = pengaturan.whatsapp
    ? linkWhatsapp(pengaturan.whatsapp, `Halo ${pengaturan.namaUsaha}, saya butuh bantuan.`)
    : null;
  const dapur = pengguna?.peran === "PEMILIK" || pengguna?.peran === "STAF_DAPUR";

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 pt-5 pb-10 sm:pt-10 sm:pb-14 space-y-5">
      {pengguna ? (
        <section className="kartu overflow-hidden">
          <div className="permukaan-pandan p-5 sm:p-6 flex items-center gap-4">
            <span
              aria-hidden="true"
              className="w-16 h-16 shrink-0 rounded-full bg-kunyit-terang text-arang font-tampil text-2xl font-extrabold flex items-center justify-center ring-4 ring-white/15"
            >
              {pengguna.nama.trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <h1 className="font-tampil text-xl sm:text-2xl font-extrabold text-beras truncate">{pengguna.nama}</h1>
              <p className="font-presisi text-[14px] text-beras/80">{teleponTampil(pengguna.telepon)}</p>
              <p className="mt-1 font-presisi text-[11.5px] uppercase tracking-[0.12em] text-kunyit-terang">
                {pengguna.peran === "PEMILIK" ? "Pemilik" : pengguna.peran === "STAF_DAPUR" ? "Staf dapur" : "Pembeli"} · sejak{" "}
                {tanggalPendek(pengguna.dibuatPada)}
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="kartu kartu-isi text-center">
          <IlustrasiMasuk className="w-52 mx-auto" />
          <h1 className="mt-1 text-xl sm:text-2xl font-bold text-arang">Masuk biar belanja makin praktis</h1>
          <p className="teks-redup mt-1.5 max-w-sm mx-auto">
            Riwayat pesanan tersimpan, data pemesan terisi otomatis, dan bisa pesan lagi sekali tekan.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 max-w-sm mx-auto">
            <Link href="/masuk?ke=/akun" className="tombol-kedua">
              Masuk
            </Link>
            <Link href="/daftar?ke=/akun" className="tombol-utama">
              Daftar
            </Link>
          </div>
          <p className="mt-4 text-[13px] text-arang-sedang">Tanpa akun pun tetap bisa memesan.</p>
        </section>
      )}

      <nav aria-label="Menu akun" className="kartu divide-y divide-beras-gelap overflow-hidden">
        {dapur && <BarisTautan href="/admin" Ikon={IkonPapan} label="Dashboard dapur" keterangan="Kelola pesanan, menu, dan kas" />}
        <BarisTautan href="/riwayat" Ikon={IkonStruk} label="Pesanan saya" keterangan="Status, pembayaran, dan pesan lagi" />
        <BarisTautan href="/lacak" Ikon={IkonCari} label="Lacak dengan kode" keterangan="Untuk pesanan dari perangkat lain" />
        {waUrl && <BarisTautan href={waUrl} luar Ikon={IkonWhatsapp} label="Hubungi dapur" keterangan="Tanya menu atau pesanan lewat WhatsApp" />}
        <BarisTautan href="/syarat-ketentuan" Ikon={IkonBantuan} label="Syarat & ketentuan" />
      </nav>

      <section aria-label="Tampilan" className="kartu kartu-isi">
        <SakelarTeks />
      </section>

      {pengguna && (
        <>
          <section aria-labelledby="judul-profil" className="kartu kartu-isi">
            <h2 id="judul-profil" className="judul-bagian">
              Profil &amp; alamat
            </h2>
            <p className="teks-redup mt-1 mb-4">Nomor HP adalah identitas masuk, jadi tidak bisa diubah di sini.</p>
            <FormProfil nama={pengguna.nama} alamat={pengguna.alamat ?? ""} />
          </section>

          <section aria-labelledby="judul-keamanan" className="kartu overflow-hidden">
            <div className="px-5 sm:px-6 pt-5 sm:pt-6 flex items-center gap-2">
              <IkonPerisai className="w-5 h-5 text-pandan" />
              <h2 id="judul-keamanan" className="judul-bagian">
                Keamanan
              </h2>
            </div>
            <details className="group mt-3 border-t border-beras-gelap">
              <summary className="flex items-center gap-3 px-5 sm:px-6 py-4 min-h-[64px] cursor-pointer list-none hover:bg-beras transition-colors">
                <span className="w-10 h-10 shrink-0 rounded-[10px] bg-beras-tua text-arang flex items-center justify-center">
                  <IkonKunci className="w-5 h-5" />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold text-arang">Ganti kata sandi</span>
                  <span className="block text-[13px] text-arang-sedang">Perangkat lain otomatis dikeluarkan setelah diganti</span>
                </span>
                <IkonPanahKanan className="w-5 h-5 text-arang-sedang transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-5 sm:px-6 pb-6">
                <FormGantiSandi untukDapur={dapur} />
              </div>
            </details>
            <div className="border-t border-beras-gelap px-5 sm:px-6 py-5">
              <KeluarPerangkatLain />
            </div>
          </section>

          <div className="flex justify-center">
            <TombolKeluar label="Keluar dari akun" className="text-bahaya hover:!text-bahaya hover:!bg-bahaya-lembut" />
          </div>
        </>
      )}
    </div>
  );
}
