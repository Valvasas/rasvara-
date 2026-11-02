import Link from "next/link";
import { TandaMerek } from "@/components/TandaMerek";
import { IkonInfo, IkonKeranjang, IkonPapan, IkonStruk } from "@/components/ikon/Ikon";

type Mode = "masuk" | "daftar";

/**
 * Pesan konteks: kenapa orang ini diminta masuk. Tanpa ini, pembeli yang
 * menekan "Pesanan saya" lalu tiba-tiba melihat formulir masuk mengira ia
 * tersesat. Dipetakan dari ?ke= (yang sudah disaring tujuanAman).
 */
function konteksTujuan(ke?: string): { teks: string; Ikon: typeof IkonInfo } | null {
  if (!ke) return null;
  if (ke.startsWith("/pesan") || ke.startsWith("/keranjang"))
    return { teks: "Masuk untuk melanjutkan pesanan. Isi keranjangmu tetap tersimpan.", Ikon: IkonKeranjang };
  if (ke.startsWith("/riwayat")) return { teks: "Masuk untuk melihat semua pesananmu di satu tempat.", Ikon: IkonStruk };
  if (ke.startsWith("/pesanan/")) return { teks: "Masuk dengan akun pemesan untuk membuka detail pesanan ini.", Ikon: IkonStruk };
  if (ke.startsWith("/akun")) return { teks: "Masuk untuk mengatur profil, alamat, dan keamanan akun.", Ikon: IkonInfo };
  return null;
}

const MANFAAT_PEMBELI = [
  { judul: "Riwayat rapi", isi: "Semua pesanan & nota tersimpan, bisa dipesan ulang sekali tekan." },
  { judul: "Isi otomatis", isi: "Nama, nomor, dan alamat antar terisi sendiri saat checkout." },
  { judul: "Pantau dari ponsel", isi: "Status masakan diperbarui langsung dari dapur." },
];

const MANFAAT_DAPUR = [
  { judul: "Papan pesanan", isi: "Pesanan baru berbunyi, maju per tahap dengan satu tombol." },
  { judul: "Rekap masak", isi: "Total porsi per menu & lembar jalan per jam siap." },
  { judul: "Buku kas", isi: "Pesanan lunas tercatat otomatis, laporan siap unduh." },
];

/**
 * Bingkai halaman Masuk & Daftar.
 *
 * Tiga jalur dibuat eksplisit, karena itulah yang membingungkan di versi
 * sebelumnya — semua orang masuk lewat pintu yang sama tanpa tahu ke mana:
 *  1. Pembeli: tab Masuk | Daftar (tautan biasa, jadi tombol "kembali" wajar).
 *  2. Tamu: "Pesan tanpa akun" — akun tidak pernah jadi syarat memesan.
 *  3. Dapur: `?ke=/admin` → portal dapur tanpa tab daftar (akun staf dibuat
 *     pemilik, bukan mendaftar sendiri) dan dengan bahasa dashboard.
 */
export function KerangkaAuth({
  mode,
  ke,
  children,
}: {
  mode: Mode;
  ke?: string;
  children: React.ReactNode;
}) {
  const dapur = Boolean(ke?.startsWith("/admin"));
  const kueri = ke ? `?ke=${encodeURIComponent(ke)}` : "";
  const konteks = dapur ? null : konteksTujuan(ke);
  const manfaat = dapur ? MANFAAT_DAPUR : MANFAAT_PEMBELI;

  const judulPanel = dapur
    ? "Dapur siap, tinggal masuk."
    : mode === "masuk"
    ? "Selamat datang kembali."
    : "Satu akun, semua pesanan rapi.";

  const judulForm = dapur ? "Masuk ke dashboard dapur" : mode === "masuk" ? "Masuk ke akunmu" : "Buat akun pembeli";
  const subForm = dapur
    ? "Khusus pemilik & staf dapur. Akun staf dibuat oleh pemilik di Pengaturan."
    : mode === "masuk"
    ? "Pakai nomor HP yang kamu daftarkan."
    : "Gratis, kurang dari satu menit. Tidak perlu email.";

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-5 pb-12 sm:py-12">
      <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-0 rounded-[18px] overflow-hidden border border-beras-gelap bg-white shadow-[var(--shadow-lembut)]">
        {/* Panel merek */}
        <aside className="permukaan-pandan relative flex flex-col p-6 sm:p-8 lg:p-10">
          <div className="flex items-center gap-3">
            <TandaMerek ukuran={40} />
            <span className="font-presisi text-[12px] uppercase tracking-[0.18em] text-kunyit-terang">
              {dapur ? "Portal dapur" : mode === "masuk" ? "Akun pembeli" : "Daftar gratis"}
            </span>
          </div>
          <h2 className="mt-6 lg:mt-10 font-tampil text-[1.8rem] sm:text-[2.4rem] lg:text-[2.8rem] font-extrabold leading-[1.02] text-beras">
            {judulPanel}
          </h2>

          <ol className="hidden sm:grid mt-8 gap-5 lg:mt-10">
            {manfaat.map((m, i) => (
              <li key={m.judul} className="flex gap-4">
                <span className="font-presisi text-[13px] font-bold text-kunyit-terang pt-0.5">0{i + 1}</span>
                <span>
                  <span className="block font-semibold text-beras">{m.judul}</span>
                  <span className="block text-[14px] text-beras/70 leading-relaxed">{m.isi}</span>
                </span>
              </li>
            ))}
          </ol>

          <div className="hidden lg:block mt-auto pt-10">
            <div aria-hidden="true" className="garis-ukur text-beras" />
            <p className="mt-4 text-[13px] text-beras/65 leading-relaxed">
              Kata sandimu disimpan teracak (scrypt) — bahkan dapur tidak bisa membacanya. Kami tidak pernah meminta kata
              sandi lewat WhatsApp atau telepon.
            </p>
          </div>
        </aside>

        {/* Panel formulir */}
        <div className="p-5 sm:p-8 lg:p-12">
          <div className="mx-auto max-w-md">
            {konteks && (
              <p className="mb-6 flex items-start gap-3 rounded-[10px] border border-pandan/20 bg-pandan-lembut px-4 py-3 text-[14px] text-pandan-tua">
                <konteks.Ikon className="w-5 h-5 shrink-0 mt-px" />
                {konteks.teks}
              </p>
            )}

            <h1 className="font-tampil text-[1.75rem] sm:text-[2rem] font-extrabold text-arang leading-tight">{judulForm}</h1>
            <p className="mt-1.5 teks-redup">{subForm}</p>

            {!dapur && (
              <nav aria-label="Pilih masuk atau daftar" className="mt-6 grid grid-cols-2 rounded-[12px] bg-beras-tua p-1">
                {(["masuk", "daftar"] as const).map((m) => (
                  <Link
                    key={m}
                    href={`/${m}${kueri}`}
                    aria-current={mode === m ? "page" : undefined}
                    className={`min-h-[44px] rounded-[9px] flex items-center justify-center text-[15px] font-semibold transition-colors ${
                      mode === m ? "bg-white text-arang shadow-[0_1px_3px_rgba(16,33,27,0.12)]" : "text-arang-sedang hover:text-arang"
                    }`}
                  >
                    {m === "masuk" ? "Masuk" : "Daftar"}
                  </Link>
                ))}
              </nav>
            )}

            <div className="mt-6">{children}</div>

            <div className="mt-8 pt-6 border-t border-beras-gelap space-y-3 text-center text-[14px] text-arang-sedang">
              {dapur ? (
                <p>
                  Bukan staf dapur?{" "}
                  <Link href="/masuk" className="font-semibold text-pandan-tua hover:underline underline-offset-2">
                    Masuk sebagai pembeli
                  </Link>
                </p>
              ) : (
                <>
                  <p>
                    {mode === "masuk" ? "Belum punya akun? " : "Sudah punya akun? "}
                    <Link
                      href={`/${mode === "masuk" ? "daftar" : "masuk"}${kueri}`}
                      className="font-semibold text-pandan-tua hover:underline underline-offset-2"
                    >
                      {mode === "masuk" ? "Daftar gratis" : "Masuk"}
                    </Link>
                  </p>
                  <p>
                    Cuma mau pesan sekali?{" "}
                    <Link href="/menu" className="font-semibold text-pandan-tua hover:underline underline-offset-2">
                      Pesan tanpa akun
                    </Link>
                  </p>
                  <p>
                    <Link
                      href="/masuk?ke=/admin"
                      className="inline-flex items-center gap-1.5 text-[13px] text-arang-sedang hover:text-arang"
                    >
                      <IkonPapan className="w-4 h-4" />
                      Pemilik / staf dapur? Masuk ke portal dapur
                    </Link>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
