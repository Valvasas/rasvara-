import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ambilHalamanMenu, ambilMenuBerdasarkanSlug } from "@/lib/menu";
import { ambilPengaturan } from "@/lib/pengaturan";
import { linkWhatsapp, rupiah } from "@/lib/format";
import { LABEL_KATEGORI } from "@/lib/pesanan";
import { GaleriFotoMenu } from "@/components/toko/GaleriFotoMenu";
import { PanelFotoMenu } from "@/components/toko/PanelFotoMenu";
import { KartuMenu } from "@/components/toko/KartuMenu";
import { IkonKalender, IkonKeranjang, IkonKotakNasi, IkonPanahKanan, IkonWhatsapp } from "@/components/ikon/Ikon";
import { catatPeristiwa } from "@/lib/analitik";

interface HalamanDetailMenuProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: HalamanDetailMenuProps): Promise<Metadata> {
  const { slug } = await params;
  const menu = await ambilMenuBerdasarkanSlug(slug);
  if (!menu) return { title: "Menu tidak ditemukan" };
  return {
    title: menu.nama,
    description: `${menu.nama} — ${rupiah(menu.harga)} per ${menu.satuan}. ${menu.deskripsi}`.slice(0, 160),
  };
}

export default async function HalamanDetailMenu({ params }: HalamanDetailMenuProps) {
  const { slug } = await params;
  const menu = await ambilMenuBerdasarkanSlug(slug);

  if (!menu) {
    notFound();
  }

  const [, sekategori, pengaturan] = await Promise.all([
    catatPeristiwa("MENU_DILIHAT"),
    ambilHalamanMenu({ kategori: menu.kategori, halaman: 1, ukuran: 5 }),
    ambilPengaturan(),
  ]);
  const menuLain = sekategori.daftar.filter((m) => m.id !== menu.id).slice(0, 4);

  const waUrl = pengaturan.whatsapp
    ? linkWhatsapp(pengaturan.whatsapp, `Halo ${pengaturan.namaUsaha}, saya mau tanya soal menu ${menu.nama}.`)
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-5 pb-12 sm:pt-8 sm:pb-16">
      {/* Remah roti: pembeli tahu sedang di mana dan bisa naik satu tingkat. */}
      <nav aria-label="Remah roti" className="text-sm text-kayu-sedang">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/menu" className="hover:text-kayu">Menu</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/menu?kategori=${menu.kategori}`} className="hover:text-kayu">
              {LABEL_KATEGORI[menu.kategori]}
            </Link>
          </li>
          <li aria-hidden="true" className="hidden sm:block">/</li>
          <li aria-current="page" className="hidden sm:block text-kayu font-medium truncate max-w-[18rem]">
            {menu.nama}
          </li>
        </ol>
      </nav>

      <div className="mt-4 sm:mt-6 grid grid-cols-1 gap-6 lg:gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] items-start">
        {/* Ilustrasi dirender di server: GaleriFotoMenu adalah komponen klien,
            dan mengimpornya dari sana mengirim keempat ilustrasi sebagai JS. */}
        {menu.foto.length > 0 ? (
          <GaleriFotoMenu
            foto={menu.foto.map((f) => ({ id: f.id, url: f.url, keterangan: f.keterangan }))}
            nama={menu.nama}
          />
        ) : (
          <PanelFotoMenu
            foto={[]}
            kategori={menu.kategori}
            nama={menu.nama}
            className="group aspect-[4/3] w-full rounded-2xl border border-krem-gelap"
            priority
            tandaiIlustrasi
          />
        )}

        <div className="lg:sticky lg:top-24">
          <p className="text-sm font-medium text-bata">{LABEL_KATEGORI[menu.kategori]}</p>
          <h1 className="font-tampil mt-1 text-3xl sm:text-4xl font-bold text-kayu leading-tight text-balance break-words">
            {menu.nama}
          </h1>

          <p className="mt-4 text-2xl font-semibold text-kayu angka-tabel">
            {rupiah(menu.harga)}
            <span className="text-base font-normal text-kayu-sedang"> / {menu.satuan}</span>
          </p>

          <p className="mt-4 text-kayu-sedang leading-relaxed whitespace-pre-line">{menu.deskripsi}</p>

          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-krem-tua/70 p-3.5">
              <dt className="flex items-center gap-1.5 text-kayu-sedang">
                <IkonKotakNasi className="w-4 h-4" />
                Minimal pesan
              </dt>
              <dd className="mt-1 font-semibold text-kayu">
                {menu.minPesan} {menu.satuan}
              </dd>
            </div>
            <div className={`rounded-xl p-3.5 ${menu.preorderHari > 0 ? "bg-krem-tua/70" : "bg-daun-lembut"}`}>
              <dt className={`flex items-center gap-1.5 ${menu.preorderHari > 0 ? "text-kayu-sedang" : "text-daun-tua"}`}>
                <IkonKalender className="w-4 h-4" />
                Waktu pesan
              </dt>
              <dd className={`mt-1 font-semibold ${menu.preorderHari > 0 ? "text-kayu" : "text-daun-tua"}`}>
                {menu.preorderHari > 0 ? `Paling lambat H-${menu.preorderHari}` : "Bisa untuk hari ini"}
              </dd>
            </div>
          </dl>

          <p className="mt-4 text-sm text-kayu-sedang">
            Contoh: {menu.minPesan} {menu.satuan} ={" "}
            <span className="font-semibold text-kayu angka-tabel">{rupiah(menu.harga * menu.minPesan)}</span>
            . Bisa digabung dengan menu lain dalam satu pesanan.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link href={`/pesan?menu=${menu.slug}`} className="tombol-utama tombol-besar flex-1">
              <IkonKeranjang className="w-5 h-5" strokeWidth={2} />
              Pesan menu ini
            </Link>
            {waUrl && (
              <a href={waUrl} target="_blank" rel="noopener noreferrer" className="tombol-kedua tombol-besar">
                <IkonWhatsapp className="w-4 h-4 text-daun" />
                Tanya dulu
              </a>
            )}
          </div>

          {menu.preorderHari > 0 && (
            <p className="mt-3 flex items-start gap-2 text-xs text-kayu-sedang">
              <IkonKalender className="w-4 h-4 shrink-0" />
              Menu ini dimasak khusus, jadi tanggal acara paling cepat {menu.preorderHari} hari dari
              sekarang.
            </p>
          )}
        </div>
      </div>

      {menuLain.length > 0 && (
        <section aria-labelledby="judul-menu-lain" className="mt-14 sm:mt-20">
          <div className="flex items-end justify-between gap-4">
            <h2 id="judul-menu-lain" className="font-tampil text-2xl font-bold text-kayu">
              {LABEL_KATEGORI[menu.kategori]} lainnya
            </h2>
            <Link
              href={`/menu?kategori=${menu.kategori}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-bata hover:text-bata-tua"
            >
              Lihat semua <IkonPanahKanan className="w-4 h-4" />
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {menuLain.map((m) => (
              <KartuMenu key={m.id} menu={m} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
