import Link from "next/link";
import { redirect } from "next/navigation";
import { bacaSesi } from "@/lib/auth";
import { angka } from "@/lib/format";
import { ringkasanAnalitik } from "@/lib/analitik";
import { GrafikKunjungan } from "@/components/admin/GrafikKunjungan";

export const metadata = { title: "Performa Website" };

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
      <div className="permukaan-kartu p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="judul-utama text-2xl text-kayu">
            Performa Website
          </h1>
          <p className="text-xs text-kayu-sedang mt-0.5 max-w-xl">
            Statistik kunjungan untuk memantau kesehatan website. Dihitung tanpa
            cookie dan tanpa menyimpan identitas pengunjung.
          </p>
        </div>

        <div
          className="flex items-center gap-1 bg-krem-tua p-1 rounded-xl border border-krem-gelap self-start"
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
                  ? "bg-kayu text-white shadow-sm"
                  : "text-kayu-sedang hover:text-kayu"
              }`}
            >
              {r} hari
            </Link>
          ))}
        </div>
      </div>

      {!data.adaData && (
        <div className="p-5 rounded-2xl bg-kunyit-lembut border border-kunyit/30 text-sm text-kayu">
          <strong className="font-extrabold">Belum ada data kunjungan.</strong>{" "}
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
          warna="text-daun"
        />
        <KartuAngka
          label="Halaman Dibuka"
          nilai={angka(data.totalTampilan)}
          keterangan={`rata-rata ${angka(data.rerataTampilanHarian)}/hari`}
          warna="text-kayu"
        />
        <KartuAngka
          label="Pesanan Masuk"
          nilai={angka(PESANAN_DIBUAT)}
          keterangan={`${konversi}% dari yang buka formulir`}
          warna="text-bata"
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
        <div className="permukaan-kartu rounded-3xl overflow-hidden">
          <div className="p-4 bg-krem-tua/60 border-b border-krem-gelap">
            <h2 className="judul-bagian text-sm text-kayu">
              Halaman Paling Sering Dibuka
            </h2>
          </div>

          {data.halamanTeratas.length === 0 ? (
            <p className="p-5 text-xs text-kayu-sedang italic">
              Belum ada halaman yang tercatat.
            </p>
          ) : (
            <ul className="divide-y divide-krem-gelap/60">
              {data.halamanTeratas.map((h) => {
                const persen = Math.round(
                  (h.tampilan / data.halamanTeratas[0].tampilan) * 100
                );
                return (
                  <li key={h.path} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <span className="text-xs font-bold text-kayu truncate">
                        {LABEL_PATH[h.path] ?? h.path}
                      </span>
                      <span className="text-xs font-extrabold text-bata shrink-0">
                        {angka(h.tampilan)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-krem-tua overflow-hidden">
                      <div
                        className="h-full rounded-full bg-bata/70"
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
        <div className="permukaan-kartu rounded-3xl overflow-hidden">
          <div className="p-4 bg-krem-tua/60 border-b border-krem-gelap">
            <h2 className="judul-bagian text-sm text-kayu">
              Perjalanan Pembeli
            </h2>
          </div>

          <div className="p-5 space-y-4">
            {corong.map((c, i) => (
              <div key={c.label} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-kayu">
                    {i + 1}. {c.label}
                  </span>
                  <span className="text-xs font-extrabold text-kayu">
                    {angka(c.nilai)}
                  </span>
                </div>
                <div className="h-6 rounded-lg bg-krem-tua overflow-hidden">
                  <div
                    className="h-full rounded-lg bg-daun/70"
                    style={{
                      width: `${Math.max(2, Math.round((c.nilai / puncakCorong) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            ))}

            <p className="text-[11px] text-kayu-sedang pt-1 leading-relaxed">
              Kalau banyak yang membuka formulir tetapi sedikit yang
              menyelesaikan pesanan, biasanya ada yang mengganjal di formulir —
              misalnya menu favorit sedang nonaktif atau tanggal yang dipilih
              kena kuota penuh.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-krem-tua/60 border border-krem-gelap text-xs text-kayu-sedang leading-relaxed">
        <strong className="text-kayu font-bold">Cara angka ini dihitung.</strong>{" "}
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
    <div className="permukaan-kartu p-5 rounded-2xl">
      <p className="text-[11px] font-bold uppercase tracking-wide text-kayu-sedang">
        {label}
      </p>
      <p className={`text-3xl font-extrabold mt-1.5 ${warna}`}>{nilai}</p>
      <p className="text-[11px] text-kayu-sedang mt-1">{keterangan}</p>
    </div>
  );
}
