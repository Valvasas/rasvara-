import type { Metadata } from "next";
import Link from "next/link";
import { ambilPengaturan } from "@/lib/pengaturan";
import { FormLupaSandi } from "@/components/FormLupaSandi";
import { IkonPanahKiri } from "@/components/ikon/Ikon";

export const metadata: Metadata = { title: "Lupa kata sandi", robots: { index: false } };

const LANGKAH = [
  { judul: "Kirim permintaan", isi: "Tulis nomor akunmu, lalu kirim pesan yang sudah disiapkan ke WhatsApp dapur." },
  { judul: "Dapur memeriksa", isi: "Dapur mencocokkan nomor dengan akun, lalu membuat kata sandi sementara." },
  { judul: "Masuk & ganti", isi: "Sandi sementara dikirim ke nomor yang terdaftar. Masuk, lalu ganti di Akun → Keamanan." },
];

/**
 * Pemulihan akun tanpa OTP. Belum ada verifikasi nomor otomatis (lihat
 * TASKS.md), jadi alurnya dibuat manual tapi tetap aman: dapur mengirim sandi
 * sementara ke NOMOR YANG TERDAFTAR di akun (tombol di /admin/pelanggan
 * membuka chat ke nomor itu), bukan ke nomor siapa pun yang meminta. Orang
 * yang mengaku-ngaku tidak menerima apa-apa.
 */
export default async function HalamanLupaSandi() {
  const pengaturan = await ambilPengaturan();

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-6 pb-12 sm:py-12">
      <Link href="/masuk" className="inline-flex items-center gap-1.5 min-h-[44px] text-[15px] font-semibold text-arang-sedang hover:text-arang">
        <IkonPanahKiri className="w-4 h-4" /> Kembali ke halaman masuk
      </Link>

      <div className="mt-3 kartu overflow-hidden">
        <div className="permukaan-hangat border-b border-beras-gelap px-5 sm:px-8 py-6 sm:py-8">
          <p className="label-atas">Pemulihan akun</p>
          <h1 className="judul-halaman mt-2">Lupa kata sandi?</h1>
          <p className="teks-redup mt-2 max-w-xl">
            Tenang — riwayat pesananmu tidak hilang. Dapur akan membuatkan kata sandi sementara untuk akunmu.
          </p>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {LANGKAH.map((l, i) => (
              <li key={l.judul} className="flex gap-3 sm:block">
                <span className="cap-presisi">0{i + 1}</span>
                <span className="block sm:mt-2">
                  <span className="block font-semibold text-arang">{l.judul}</span>
                  <span className="block text-[14px] text-arang-sedang leading-relaxed">{l.isi}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="px-5 sm:px-8 py-6 sm:py-8">
          {pengaturan.whatsapp ? (
            <FormLupaSandi whatsappDapur={pengaturan.whatsapp} namaUsaha={pengaturan.namaUsaha} />
          ) : (
            <p className="kotak-peringatan">
              Nomor WhatsApp dapur belum diatur. Silakan hubungi {pengaturan.namaUsaha} langsung untuk mengatur ulang kata
              sandi.
            </p>
          )}
          <p className="mt-6 rounded-[10px] bg-beras-tua px-4 py-3 text-[14px] text-arang-sedang leading-relaxed">
            <span className="font-semibold text-arang">Penting:</span> dapur tidak akan pernah menanyakan kata sandi lamamu.
            Abaikan pesan apa pun yang meminta kata sandi atau kode, meskipun mengatasnamakan {pengaturan.namaUsaha}.
          </p>
        </div>
      </div>
    </div>
  );
}
