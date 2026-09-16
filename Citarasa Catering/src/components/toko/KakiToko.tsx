import Link from "next/link";
import { ambilPengaturan } from "@/lib/pengaturan";
import { jamTampil, linkWhatsapp } from "@/lib/format";
import { Wordmark } from "@/components/Wordmark";

export async function KakiToko() {
  const pengaturan = await ambilPengaturan();

  const pesanWa = "Halo Citarasa Catering, saya mau tanya paket catering untuk acara...";
  const waUrl = pengaturan.whatsapp
    ? linkWhatsapp(pengaturan.whatsapp, pesanWa)
    : null;

  return (
    <footer className="bg-krem-tua border-t border-krem-gelap/80 mt-auto text-kayu">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Kolom 1: Identitas Usaha */}
          <div className="space-y-4">
            <Wordmark href="/" tagline={true} />
            <p className="text-sm text-kayu-sedang leading-relaxed">
              {pengaturan.cerita ||
                "Melayani pesanan snack box, nasi kotak, tumpeng syukuran, dan nasi goreng porsi besar untuk aneka hajatan & rapat kantor dengan cita rasa khas rumahan."}
            </p>
            {pengaturan.alamat && (
              <p className="text-sm text-kayu-sedang flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-bata shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>{pengaturan.alamat}</span>
              </p>
            )}
          </div>

          {/* Kolom 2: Jam Dapur & Rekening */}
          <div className="space-y-4">
            <h3 className="font-bold text-base text-kayu">Jam Dapur & Rekening</h3>
            <div className="text-sm text-kayu-sedang space-y-2">
              <p>
                <strong className="text-kayu">Jam Masak / Buka:</strong>{" "}
                {jamTampil(pengaturan.jamBuka)} - {jamTampil(pengaturan.jamTutup)} WIB
              </p>
              <p className="text-xs text-kayu-sedang/80">
                Menerima pesanan pre-order untuk acara pagi, siang, dan malam.
              </p>

              {pengaturan.namaBank && pengaturan.nomorRekening && (
                <div className="p-3 bg-krem rounded-xl border border-krem-gelap mt-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-kayu-sedang block">
                    Pembayaran Transfer
                  </span>
                  <div className="font-bold text-kayu text-sm mt-0.5">
                    {pengaturan.namaBank} {pengaturan.nomorRekening}
                  </div>
                  {pengaturan.namaRekening && (
                    <div className="text-xs text-kayu-sedang">
                      a.n. {pengaturan.namaRekening}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Kolom 3: Kontak Cepat & Navigasi */}
          <div className="space-y-4">
            <h3 className="font-bold text-base text-kayu">Hubungi Kami</h3>
            <p className="text-sm text-kayu-sedang">
              Butuh konsultasi menu acara atau kustomisasi porsi khusus?
            </p>

            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[48px] px-5 py-2.5 rounded-xl font-semibold text-white bg-daun hover:bg-daun-tua transition-colors inline-flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto"
              >
                <svg
                  className="w-5 h-5 fill-current"
                  viewBox="0 0 24 24"
                >
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.073.377-.044c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.072.043.419-.101.824z" />
                </svg>
                <span>Chat via WhatsApp</span>
              </a>
            )}

            <div className="pt-2 flex flex-wrap gap-4 text-xs font-medium text-kayu-sedang">
              <Link href="/menu" className="hover:text-bata">
                Daftar Menu
              </Link>
              <Link href="/pesan" className="hover:text-bata">
                Formulir Pemesanan
              </Link>
              <Link href="/lacak" className="hover:text-bata">
                Lacak Pesanan
              </Link>
              <Link href="/masuk" className="hover:text-bata">
                Masuk Akun
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-krem-gelap/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-kayu-sedang">
          <p>&copy; {new Date().getFullYear()} Citarasa Catering. Cita rasa hangat resep keluarga.</p>
          <div className="flex flex-wrap items-center justify-center gap-4 font-medium">
            <Link href="/kebijakan-privasi" className="hover:text-bata">
              Kebijakan Privasi
            </Link>
            <Link href="/syarat-ketentuan" className="hover:text-bata">
              Syarat &amp; Ketentuan
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

