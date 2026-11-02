import Link from "next/link";
import { ambilPengaturan } from "@/lib/pengaturan";
import { jamTampil, linkWhatsapp, teleponTampil } from "@/lib/format";
import { Wordmark } from "@/components/Wordmark";
import { SakelarTeks } from "@/components/toko/PengaturanAkun";
import { IkonJam, IkonLokasi, IkonWhatsapp } from "@/components/ikon/Ikon";

const JANJI = [
  { kata: "Sehat", isi: "Dimasak hari itu juga" },
  { kata: "Matang", isi: "Kuota harian dijaga" },
  { kata: "Tepat", isi: "Jam siap terjadwal" },
];

/**
 * Kaki toko = pita merek gelap. Satu-satunya bagian (selain pita status di
 * atas dan kepala beranda) yang memakai hijau pandan pekat, sehingga setiap
 * halaman "dibingkai" warna merek di atas dan bawahnya.
 */
export async function KakiToko() {
  const pengaturan = await ambilPengaturan();

  const waUrl = pengaturan.whatsapp
    ? linkWhatsapp(pengaturan.whatsapp, `Halo ${pengaturan.namaUsaha}, saya mau tanya soal pesanan.`)
    : null;

  const kelasTautan = "text-beras/75 hover:text-kunyit-terang transition-colors";

  return (
    <footer className="mt-16 sm:mt-24">
      <div className="permukaan-pandan">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 sm:pt-14 pb-8">
          {/* Tiga janji merek, dibaca seperti papan instrumen */}
          <ul className="grid grid-cols-3 gap-3 sm:gap-6 border-b border-white/12 pb-8">
            {JANJI.map((j) => (
              <li key={j.kata}>
                <p className="font-tampil text-[1.6rem] sm:text-[2.6rem] font-extrabold leading-none text-beras">
                  {j.kata}
                  <span className="text-kunyit-terang">.</span>
                </p>
                <p className="mt-2 font-presisi text-[11.5px] sm:text-[13px] uppercase tracking-[0.08em] text-beras/65">{j.isi}</p>
              </li>
            ))}
          </ul>

          <div className="pt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div className="space-y-4 max-w-sm">
              <Wordmark href="/" nama={pengaturan.namaUsaha} terbalik />
              {pengaturan.tagline && <p className="text-[15px] text-beras/75 leading-relaxed">{pengaturan.tagline}</p>}
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tombol tombol-kecil bg-white text-arang hover:bg-beras-tua"
                >
                  <IkonWhatsapp className="w-4 h-4 text-[#1A9E4B]" />
                  Chat dapur
                </a>
              )}
            </div>

            <div className="space-y-3 text-[15px]">
              <h2 className="label-atas !text-kunyit-terang">Kontak</h2>
              <ul className="space-y-2.5 text-beras/75">
                {waUrl && (
                  <li>
                    <a href={waUrl} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-2 ${kelasTautan}`}>
                      <IkonWhatsapp className="w-4 h-4" />
                      <span className="font-presisi">{teleponTampil(pengaturan.whatsapp)}</span>
                    </a>
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <IkonJam className="w-4 h-4 mt-1 shrink-0" />
                  <span>
                    Dapur <span className="font-presisi">{jamTampil(pengaturan.jamBuka)}–{jamTampil(pengaturan.jamTutup)}</span> WIB
                  </span>
                </li>
                {pengaturan.alamat && (
                  <li className="flex items-start gap-2">
                    <IkonLokasi className="w-4 h-4 mt-1 shrink-0" />
                    <span>{pengaturan.alamat}</span>
                  </li>
                )}
              </ul>
            </div>

            <nav aria-label="Belanja" className="space-y-3 text-[15px]">
              <h2 className="label-atas !text-kunyit-terang">Belanja</h2>
              <ul className="space-y-2.5">
                <li><Link href="/menu" className={kelasTautan}>Semua menu</Link></li>
                <li><Link href="/keranjang" className={kelasTautan}>Keranjang</Link></li>
                <li><Link href="/lacak" className={kelasTautan}>Lacak pesanan</Link></li>
              </ul>
            </nav>

            <nav aria-label="Akun" className="space-y-3 text-[15px]">
              <h2 className="label-atas !text-kunyit-terang">Akun</h2>
              <ul className="space-y-2.5">
                <li><Link href="/riwayat" className={kelasTautan}>Pesanan saya</Link></li>
                <li><Link href="/akun" className={kelasTautan}>Akun &amp; keamanan</Link></li>
                <li><Link href="/lupa-sandi" className={kelasTautan}>Lupa kata sandi</Link></li>
                <li><Link href="/masuk?ke=/admin" className={kelasTautan}>Portal dapur</Link></li>
              </ul>
            </nav>
          </div>
        </div>
        <div aria-hidden="true" className="garis-ukur text-beras mx-auto max-w-6xl" />
      </div>

      <div className="border-t border-beras-gelap bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 flex flex-col lg:flex-row items-center justify-between gap-4 text-[14px] text-arang-sedang">
          <SakelarTeks ringkas />
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            <span>&copy; {new Date().getFullYear()} {pengaturan.namaUsaha}</span>
            <Link href="/kebijakan-privasi" className="hover:text-arang">Kebijakan privasi</Link>
            <Link href="/syarat-ketentuan" className="hover:text-arang">Syarat &amp; ketentuan</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
