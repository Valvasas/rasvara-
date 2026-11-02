import Link from "next/link";
import { redirect } from "next/navigation";
import { bacaSesi } from "@/lib/auth";
import { angka } from "@/lib/format";
import { ringkasanAnalitik } from "@/lib/analitik";
import { GrafikKunjungan } from "@/components/admin/GrafikKunjungan";

export const metadata = { title: "Pengunjung" };

const RENTANG = [7, 14, 30] as const;

const LABEL_PATH: Record<string, string> = {
  "/": "Beranda",
  "/menu": "Daftar menu",
  "/menu/:slug": "Detail menu",
  "/pesan": "Formulir pemesanan",
  "/lacak": "Lacak pesanan",
  "/pesanan/:kode": "Rincian pesanan",
  "/riwayat": "Riwayat pelanggan",
  "/masuk": "Halaman masuk",
  "/daftar": "Halaman daftar",
  "/kebijakan-privasi": "Kebijakan privasi",
  "/syarat-ketentuan": "Syarat & ketentuan",
};

interface HalamanAnalitikProps {
  searchParams: Promise<{ hari?: string }>;
}

export default async function HalamanAnalitik({
  searchParams,
}: HalamanAnalitikProps) {
  const sesi = await bacaSesi();
  if (sesi?.peran !== "PEMILIK") {
    redirect("/admin");
  }

  const params = await searchParams;
  const diminta = Number(params.hari);
  const hari = RENTANG.includes(diminta as (typeof RENTANG)[number])
    ? diminta
    : 7;

  const data = await ringkasanAnalitik(hari);

  const { MENU_DILIHAT, FORM_PESAN_DIBUKA, PESANAN_DIBUAT, LACAK_DIPAKAI } =
    data.peristiwa;

  const konversi =
    FORM_PESAN_DIBUKA > 0
      ? Math.round((PESANAN_DIBUAT / FORM_PESAN_DIBUKA) * 100)
      : 0;

  const corong = [
    { label: "Membuka detail menu", nilai: MENU_DILIHAT },
    { label: "Membuka formulir pesan", nilai: FORM_PESAN_DIBUKA },
    { label: "Menyelesaikan pesanan", nilai: PESANAN_DIBUAT },
  ];
  const puncakCorong = Math.max(...corong.map((c) => c.nilai), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="judul-halaman">
            Pengunjung website
          </h1>
          <p className="teks-redup mt-1 max-w-xl">
            Statistik kunjungan untuk memantau kesehatan website. Dihitung tanpa
            cookie dan tanpa menyimpan identitas pengunjung.
          </p>
        </div>

        <div
          className="flex items-center gap-1 bg-beras-tua p-1 rounded-xl border border-beras-gelap self-start"
          role="group"
          aria-label="Pilih rentang waktu"
        >
          {RENTANG.map((r) => (
            <Link
              key={r}
              href={`/admin/analitik?hari=${r}`}
              aria-current={hari === r}
              className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-bold transition-colors inline-flex items-center ${
                hari === r
                  ? "bg-arang text-white"
                  : "text-arang-sedang hover:text-arang"
              }`}
            >
              {r} hari
            </Link>
          ))}
        </div>
      </div>

      {!data.adaData && (
        <div className="p-5 rounded-2xl bg-kunyit-lembut border border-kunyit/30 text-sm text-arang">
          <strong className="font-semibold">Belum ada data kunjungan.</strong>{" "}
          Angka akan terisi sendiri begitu ada yang membuka halaman toko.
          Kunjungan dari halaman admin sengaja tidak dihitung supaya statistik
          tetap mencerminkan pembeli, bukan aktivitas Anda sendiri.
        </div>
      )}

      {/* Angka ringkas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KartuAngka
          label="Pengunjung Unik"
          nilai={angka(data.totalPengunjung)}
          keterangan={`dalam ${hari} hari terakhir`}
          warna="text-pandan"
        />
        <KartuAngka
          label="Halaman Dibuka"
          nilai={angka(data.totalTampilan)}
          keterangan={`rata-rata ${angka(data.rerataTampilanHarian)}/hari`}
          warna="text-arang"
        />
        <KartuAngka
          label="Pesanan Masuk"
          nilai={angka(PESANAN_DIBUAT)}
          keterangan={`${konversi}% dari yang buka formulir`}
          warna="text-pandan"
        />
        <KartuAngka
          label="Lacak Dipakai"
          nilai={angka(LACAK_DIPAKAI)}
          keterangan="pembeli mengecek status sendiri"
          warna="text-kunyit-tua"
        />
      </div>

      <GrafikKunjungan data={data.harian} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Halaman terpopuler */}
        <div className="kartu overflow-hidden">
          <div className="p-4 bg-beras-tua/60 border-b border-beras-gelap">
            <h2 className="judul-bagian">
              Halaman Paling Sering Dibuka
            </h2>
          </div>

          {data.halamanTeratas.length === 0 ? (
            <p className="p-5 text-xs text-arang-sedang italic">
              Belum ada halaman yang tercatat.
            </p>
          ) : (
            <ul className="divide-y divide-beras-gelap/60">
              {data.halamanTeratas.map((h) => {
                const persen = Math.round(
                  (h.tampilan / data.halamanTeratas[0].tampilan) * 100
                );
                return (
                  <li key={h.path} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <span className="text-xs font-bold text-arang truncate">
                        {LABEL_PATH[h.path] ?? h.path}
                      </span>
                      <span className="text-xs font-semibold text-pandan shrink-0">
                        {angka(h.tampilan)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-beras-tua overflow-hidden">
                      <div
                        className="h-full rounded-full bg-pandan/70"
                        style={{ width: `${persen}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Corong pemesanan */}
        <div className="kartu overflow-hidden">
          <div className="p-4 bg-beras-tua/60 border-b border-beras-gelap">
            <h2 className="judul-bagian">
              Perjalanan Pembeli
            </h2>
          </div>

          <div className="p-5 space-y-4">
            {corong.map((c, i) => (
              <div key={c.label} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-arang">
                    {i + 1}. {c.label}
                  </span>
                  <span className="text-xs font-semibold text-arang">
                    {angka(c.nilai)}
                  </span>
                </div>
                <div className="h-6 rounded-lg bg-beras-tua overflow-hidden">
                  <div
                    className="h-full rounded-lg bg-pandan/70"
                    style={{
                      width: `${Math.max(2, Math.round((c.nilai / puncakCorong) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            ))}

            <p className="text-[11px] text-arang-sedang pt-1 leading-relaxed">
              Kalau banyak yang membuka formulir tetapi sedikit yang
              menyelesaikan pesanan, biasanya ada yang mengganjal di formulir —
              misalnya menu favorit sedang nonaktif atau tanggal yang dipilih
              kena kuota penuh.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-beras-tua/60 border border-beras-gelap text-xs text-arang-sedang leading-relaxed">
        <strong className="text-arang font-bold">Cara angka ini dihitung.</strong>{" "}
        Pengunjung unik dihitung dari sidik acak satu arah (SHA-256) yang dibuat
        dari alamat IP dan jenis peramban, dicampur kunci acak yang berganti
        setiap hari dan tidak pernah disimpan. Alamat IP sendiri tidak pernah
        ditulis ke database, dan sidik hari ini tidak bisa dicocokkan dengan
        sidik hari lain. Karena tidak ada cookie pelacak maupun layanan pihak
        ketiga, situs ini tidak memerlukan banner persetujuan cookie.
      </div>
    </div>
  );
}

function KartuAngka({
  label,
  nilai,
  keterangan,
  warna,
}: {
  label: string;
  nilai: string;
  keterangan: string;
  warna: string;
}) {
  return (
    <div className="kartu p-5">
      <p className="teks-redup">
        {label}
      </p>
      <p className={`text-2xl font-semibold mt-1 angka-tabel ${warna}`}>{nilai}</p>
      <p className="text-[11px] text-arang-sedang mt-1">{keterangan}</p>
    </div>
  );
}
