import Link from "next/link";
import { rupiah } from "@/lib/format";
import { ambilPengaturan } from "@/lib/pengaturan";
import { ambilMenuAktif } from "@/lib/menu";
import { LencanaKategori } from "@/components/Lencana";
import type { Menu } from "@/generated/prisma/client";

export default async function BerandaToko() {
  const [menus] = await Promise.all([
    ambilMenuAktif(),
    ambilPengaturan(),
  ]);
  const menuUnggulan: Menu[] = menus.slice(0, 6);

  const kategoriUtama = [
    {
      kategori: "NASI_KOTAK",
      judul: "Nasi Kotak",
      deskripsi: "Pilihan komplit lauk ayam bakar, rendang, dan lalapan segar.",
      ikon: "🍱",
      tautan: "/menu?kategori=NASI_KOTAK",
    },
    {
      kategori: "SNACK",
      judul: "Snack Box",
      deskripsi: "Kue basah tradisional & gurih untuk rapat, arisan, & seminar.",
      ikon: "🥐",
      tautan: "/menu?kategori=SNACK",
    },
    {
      kategori: "TUMPENG",
      judul: "Tumpeng Acara",
      deskripsi: "Tumpeng kuning hiasan daun pisang komplit untuk syukuran spesial.",
      ikon: "🎉",
      tautan: "/menu?kategori=TUMPENG",
    },
    {
      kategori: "NASI_GORENG",
      judul: "Nasi Goreng",
      deskripsi: "Nasi goreng spesial porsi prasmanan atau satuan bumbu dapur asli.",
      ikon: "🍳",
      tautan: "/menu?kategori=NASI_GORENG",
    },
  ];

  return (
    <div className="space-y-16">
      {/* 1. Hero Section yang Hangat */}
      <section className="relative overflow-hidden bg-gradient-to-b from-krem-tua via-krem to-krem border-b border-krem-gelap/60 py-16 md:py-24 px-4">
        <div className="container mx-auto max-w-5xl text-center space-y-6">
          <div className="anim-masuk inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-bata-lembut border border-bata/30 text-bata-tua text-xs font-bold tracking-wide uppercase">
            <span>🌶️ Resep Asli Rumahan</span>
            <span>&bull;</span>
            <span>Tanpa Pengawet</span>
          </div>

          <h1 className="anim-masuk jeda-1 text-3xl md:text-5xl lg:text-6xl font-extrabold text-kayu tracking-tight leading-tight md:leading-tight">
            Masakan Hangat,{" "}
            <span className="text-bata block sm:inline">Siap Tepat Waktu.</span>
          </h1>

          <p className="anim-masuk jeda-2 max-w-2xl mx-auto text-base md:text-lg text-kayu-sedang leading-relaxed">
            Spesialis katering nasi kotak, snack box, dan tumpeng untuk acara
            keluarga, syukuran kantor, dan pengajian. Dimasak langsung sebelum diantar
            agar cita rasa tetap prima.
          </p>

          <div className="anim-masuk jeda-3 pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/menu"
              className="min-h-[48px] w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-white bg-bata hover:bg-bata-tua transition-all shadow-md hover:shadow-lg inline-flex items-center justify-center gap-2"
            >
              <span>Lihat Semua Menu</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>

            <Link
              href="/pesan"
              className="min-h-[48px] w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-kayu bg-krem-tua hover:bg-krem-gelap border border-krem-gelap transition-colors inline-flex items-center justify-center"
            >
              Pesan Langsung
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Empat Kategori Pilihan */}
      <section className="container mx-auto px-4 max-w-6xl">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-kayu">
            Pilihan Menu untuk Setiap Momen
          </h2>
          <p className="text-sm text-kayu-sedang mt-2">
            Dari rapat singkat hingga perayaan besar, kami siapkan hidangan terbaik
            untuk tamu Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kategoriUtama.map((kat, idx) => (
            <Link
              key={kat.kategori}
              href={kat.tautan}
              className={`anim-masuk jeda-${idx + 1} group p-6 bg-white rounded-2xl border border-krem-gelap/80 hover:border-bata/40 hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col justify-between`}
            >
              <div>
                <span className="text-4xl block mb-3 transition-transform group-hover:scale-110 group-hover:-rotate-3">{kat.ikon}</span>
                <h3 className="text-lg font-bold text-kayu group-hover:text-bata transition-colors">
                  {kat.judul}
                </h3>
                <p className="text-xs text-kayu-sedang mt-2 leading-relaxed">
                  {kat.deskripsi}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-krem-gelap/50 flex items-center text-xs font-semibold text-bata group-hover:translate-x-1 transition-transform">
                <span>Pilih {kat.judul}</span>
                <span className="ml-1">&rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Menu Unggulan Dapur */}
      {menuUnggulan.length > 0 && (
        <section className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-kayu">
                Menu Favorit Pelanggan
              </h2>
              <p className="text-sm text-kayu-sedang mt-1">
                Paling sering dipesan untuk acara hajatan dan rapat mingguan.
              </p>
            </div>
            <Link
              href="/menu"
              className="text-sm font-bold text-bata hover:underline inline-flex items-center gap-1"
            >
              <span>Semua Menu ({menuUnggulan.length}+)</span>
              <span>&rarr;</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuUnggulan.map((menu, idx) => (
              <div
                key={menu.id}
                className={`anim-masuk jeda-${Math.min(idx + 1, 6)} bg-white rounded-2xl border border-krem-gelap overflow-hidden flex flex-col justify-between hover:shadow-lg hover:-translate-y-1 hover:border-bata/30 transition-all`}
              >
                {/* Header kartu menu */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <LencanaKategori kategori={menu.kategori} />
                      {menu.preorderHari > 0 ? (
                        <span className="text-[11px] font-semibold text-kunyit-tua bg-kunyit-lembut px-2 py-0.5 rounded">
                          Preorder {menu.preorderHari} hari
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-daun-tua bg-daun-lembut px-2 py-0.5 rounded">
                          Bisa Hari Ini
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-kayu mt-1">{menu.nama}</h3>
                    <p className="text-xs text-kayu-sedang mt-2 line-clamp-3 leading-relaxed">
                      {menu.deskripsi}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-krem-gelap/60 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-kayu-sedang block">
                        Harga per {menu.satuan}
                      </span>
                      <span className="text-lg font-extrabold text-bata">
                        {rupiah(menu.harga)}
                      </span>
                    </div>

                    <span className="text-xs text-kayu-sedang/90 bg-krem px-2 py-1 rounded-md border border-krem-gelap">
                      Min. {menu.minPesan} {menu.satuan}
                    </span>
                  </div>
                </div>

                {/* Tombol aksi */}
                <div className="px-6 pb-6 pt-0">
                  <Link
                    href={`/pesan?menu=${menu.slug}`}
                    className="min-h-[48px] w-full py-2.5 rounded-xl font-semibold text-sm text-center text-bata bg-bata-lembut hover:bg-bata hover:text-white transition-colors inline-flex items-center justify-center gap-1"
                  >
                    Pesan Menu Ini
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Kenapa Memilih Citarasa Catering */}
      <section className="bg-krem-tua/60 border-y border-krem-gelap/60 py-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-kayu">
              Komitmen Dapur Kami
            </h2>
            <p className="text-sm text-kayu-sedang mt-2">
              Ketenangan acara Anda berawal dari hidangan yang tiba tepat waktu
              dan rasa yang memuaskan seluruh tamu.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group anim-masuk bg-white p-6 rounded-2xl border border-krem-gelap text-center space-y-3 hover:shadow-md hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-daun-lembut text-daun-tua mx-auto flex items-center justify-center text-xl font-bold transition-transform group-hover:scale-110">
                ⏰
              </div>
              <h3 className="font-bold text-base text-kayu">Tepat Jam Acara</h3>
              <p className="text-xs text-kayu-sedang leading-relaxed">
                Jadwal produksi dapur kami susun ketat agar pesanan tiba dalam keadaan
                segar tepat sebelum acara Anda dimulai.
              </p>
            </div>

            <div className="group anim-masuk jeda-2 bg-white p-6 rounded-2xl border border-krem-gelap text-center space-y-3 hover:shadow-md hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-kunyit-lembut text-kunyit-tua mx-auto flex items-center justify-center text-xl font-bold transition-transform group-hover:scale-110">
                🍃
              </div>
              <h3 className="font-bold text-base text-kayu">Bumbu Asli & Halal</h3>
              <p className="text-xs text-kayu-sedang leading-relaxed">
                Menggunakan bahan baku segar dari pasar tradisional dan rempah alami,
                bebas pengawet buatan dan dijamin 100% halal.
              </p>
            </div>

            <div className="group anim-masuk jeda-3 bg-white p-6 rounded-2xl border border-krem-gelap text-center space-y-3 hover:shadow-md hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-bata-lembut text-bata-tua mx-auto flex items-center justify-center text-xl font-bold transition-transform group-hover:scale-110">
                📱
              </div>
              <h3 className="font-bold text-base text-kayu">Lacak Status Real-time</h3>
              <p className="text-xs text-kayu-sedang leading-relaxed">
                Pantau progres masakan Anda langsung dari HP: dari diterima,
                sedang dimasak, hingga siap diantar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Banner Konsultasi WA */}
      <section className="container mx-auto px-4 max-w-4xl">
        <div className="bg-kayu text-krem rounded-3xl p-8 md:p-12 text-center space-y-6 shadow-xl">
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            Butuh Rekomendasi Menu untuk Budget Acara Anda?
          </h2>
          <p className="max-w-xl mx-auto text-sm md:text-base text-krem/80 leading-relaxed">
            Diskusikan kebutuhan porsi, jadwal, dan susunan lauk langsung dengan
            pengelola dapur kami.
          </p>

          <div className="pt-2">
            <Link
              href="/pesan"
              className="min-h-[48px] px-8 py-3.5 rounded-xl font-bold text-kayu bg-kunyit hover:bg-kunyit-lembut transition-colors inline-flex items-center justify-center gap-2 shadow"
            >
              Mulai Buat Pesanan
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

