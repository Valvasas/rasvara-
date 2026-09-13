import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { ambilPengaturan } from "@/lib/pengaturan";
import { jamTampil, linkWhatsapp, teleponTampil } from "@/lib/format";

export async function KakiToko() {
  const pengaturan = await ambilPengaturan();

  return (
    <footer className="tanpa-cetak mt-20 border-t border-kayu/20 bg-kayu-lembut tekstur-kertas">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <Wordmark />
          <p className="mt-3 max-w-xs text-[0.95rem] text-arang-muda">
            {pengaturan.tagline}
          </p>
        </div>

        <div>
          <h2 className="label-kolom">Jam Buka</h2>
          <p className="mt-2 text-[0.95rem]">
            Setiap hari
            <br />
            <span className="font-semibold">
              {jamTampil(pengaturan.jamBuka)} - {jamTampil(pengaturan.jamTutup)} WIB
            </span>
          </p>
          <p className="mt-2 text-[0.9rem] text-arang-muda">
            Pesanan tumpeng dan pesanan besar sebaiknya masuk beberapa hari
            sebelumnya.
          </p>
        </div>

        <div>
          <h2 className="label-kolom">Hubungi Kami</h2>
          {pengaturan.whatsapp ? (
            <a
              href={linkWhatsapp(
                pengaturan.whatsapp,
                "Halo Citarasa Catering, saya mau tanya soal pesanan."
              )}
              className="mt-2 inline-block font-semibold text-bata underline underline-offset-4 hover:text-bata-tua"
            >
              WhatsApp {teleponTampil(pengaturan.whatsapp)}
            </a>
          ) : null}
          {pengaturan.alamat ? (
            <p className="mt-2 text-[0.95rem] text-arang-muda">
              {pengaturan.alamat}
            </p>
          ) : null}
        </div>

        <div>
          <h2 className="label-kolom">Tautan</h2>
          <ul className="mt-2 space-y-1.5 text-[0.95rem]">
            <li>
              <Link href="/menu" className="hover:text-bata">
                Daftar menu
              </Link>
            </li>
            <li>
              <Link href="/pesan" className="hover:text-bata">
                Buat pesanan
              </Link>
            </li>
            <li>
              <Link href="/lacak" className="hover:text-bata">
                Lacak pesanan
              </Link>
            </li>
            <li>
              <Link href="/masuk" className="hover:text-bata">
                Masuk ke akun
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-kayu/20 px-4 py-5">
        <p className="mx-auto max-w-6xl text-[0.85rem] text-arang-muda">
          &copy; {new Date().getFullYear()} {pengaturan.namaUsaha}. Dimasak dan
          dikirim sendiri.
        </p>
      </div>
    </footer>
  );
}
