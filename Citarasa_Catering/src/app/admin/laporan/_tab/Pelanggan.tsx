import Link from "next/link";
import { angka, linkWhatsapp, rupiah, teleponTampil } from "@/lib/format";
import { ambilPengaturan } from "@/lib/pengaturan";
import { alamatSitus } from "@/lib/situs";
import { pesanSapaPelanggan, pesanTanyaKesan } from "@/lib/template-wa";
import { INFO_SEGMEN, URUTAN_SEGMEN, type Segmen } from "@/lib/insight";
import { ambilSegmenPelanggan, hitungPerSegmen, namaTerbaru, HARI_PENGAMATAN_PELANGGAN } from "@/lib/insight-server";
import { KomponenPaginasi } from "@/components/KomponenPaginasi";
import { IkonWhatsapp } from "@/components/ikon/Ikon";

const UKURAN = 25;

const KELAS_NADA = {
  daun: "bg-daun-lembut text-daun-tua border-daun/20",
  bata: "bg-bahaya-lembut text-bahaya border-bahaya/20",
  kunyit: "bg-kunyit-lembut text-kunyit-tua border-kunyit/30",
  netral: "bg-krem-tua text-kayu border-krem-gelap",
} as const;

function teksHari(h: number) {
  if (h === 0) return "hari ini / mendatang";
  return `${angka(h)} hari lalu`;
}

export async function TabPelanggan({ segmen, halaman }: { segmen: Segmen | null; halaman: number }) {
  const [semua, pengaturan] = await Promise.all([ambilSegmenPelanggan(), ambilPengaturan()]);

  if (semua.length === 0) {
    return <p className="kartu kartu-isi text-center teks-redup">Belum ada pelanggan dalam 12 bulan terakhir.</p>;
  }

  const perSegmen = hitungPerSegmen(semua);
  const tersaring = (segmen ? semua.filter((p) => p.segmen === segmen) : semua).sort(
    (a, b) => b.nilai - a.nilai || a.hariSejakTerakhir - b.hariSejakTerakhir
  );
  const totalHalaman = Math.max(1, Math.ceil(tersaring.length / UKURAN));
  const hal = Math.min(halaman, totalHalaman);
  const potong = tersaring.slice((hal - 1) * UKURAN, hal * UKURAN);
  const nama = await namaTerbaru(potong.map((p) => p.telepon));
  const situs = alamatSitus();

  const pesanUntuk = (s: Segmen, n: string) => {
    if (s === "PERLU_DISAPA" || s === "HILANG") return { label: "Sapa", teks: pesanSapaPelanggan(n, pengaturan.namaUsaha, situs) };
    if (s === "BARU") return { label: "Tanya kesan", teks: pesanTanyaKesan(n, pengaturan.namaUsaha) };
    return { label: "Chat", teks: "" };
  };

  return (
    <>
      <ul className="grid gap-3 grid-cols-2 lg:grid-cols-5" aria-label="Segmen pelanggan">
        {URUTAN_SEGMEN.map((s) => {
          const info = INFO_SEGMEN[s];
          const aktif = segmen === s;
          return (
            <li key={s}>
              <Link
                href={aktif ? "/admin/laporan?tab=pelanggan" : `/admin/laporan?tab=pelanggan&seg=${s}`}
                aria-current={aktif ? "true" : undefined}
                className={`kartu block h-full p-4 transition-colors hover:border-bata/40 ${aktif ? "ring-2 ring-bata border-bata" : ""}`}
              >
                <span className={`lencana ${KELAS_NADA[info.nada]}`}>{info.label}</span>
                <p className="mt-2 text-xl font-semibold angka-tabel">{angka(perSegmen[s].jumlah)}</p>
                <p className="text-xs text-kayu-sedang">{info.arti}</p>
              </Link>
            </li>
          );
        })}
      </ul>

      {segmen && (
        <p className="kotak-info bg-krem-tua text-kayu border-krem-gelap mt-4">
          <span className="font-semibold">Saran:</span> {INFO_SEGMEN[segmen].saran}{" "}
          <Link href="/admin/laporan?tab=pelanggan" className="font-medium text-bata underline underline-offset-2">
            Tampilkan semua
          </Link>
        </p>
      )}

      {potong.length === 0 ? (
        <p className="kartu kartu-isi mt-6 text-center teks-redup">Tidak ada pelanggan di segmen ini.</p>
      ) : (
        <>
        <ul className="kartu mt-6 divide-y divide-krem-gelap sm:hidden" aria-label="Daftar pelanggan">
          {potong.map((p) => {
            const n = nama.get(p.telepon) ?? "Pelanggan";
            const wa = pesanUntuk(p.segmen, n);
            return (
              <li key={p.telepon} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/pesanan?q=${encodeURIComponent(p.telepon)}`} className="truncate font-medium text-kayu hover:text-bata">
                      {n}
                    </Link>
                    <span className={`lencana ${KELAS_NADA[INFO_SEGMEN[p.segmen].nada]}`}>{INFO_SEGMEN[p.segmen].label}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-kayu-sedang">
                    {angka(p.frekuensi)}× · <span className="angka-tabel">{rupiah(p.nilai)}</span> · {teksHari(p.hariSejakTerakhir)}
                  </p>
                </div>
                <a
                  href={linkWhatsapp(p.telepon, wa.teks)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tombol-kedua tombol-kecil shrink-0 px-3"
                  aria-label={`${wa.label} ${n} lewat WhatsApp`}
                >
                  <IkonWhatsapp className="w-4 h-4" />
                </a>
              </li>
            );
          })}
        </ul>
        <div className="kartu mt-6 overflow-x-auto hidden sm:block">
          <table className="tabel min-w-[720px]">
            <caption className="sr-only">Daftar pelanggan, diurutkan dari nilai belanja terbesar</caption>
            <thead>
              <tr>
                <th scope="col">Pelanggan</th>
                <th scope="col">Segmen</th>
                <th scope="col">Terakhir acara</th>
                <th scope="col" className="text-right">Pesanan</th>
                <th scope="col" className="text-right">Total belanja</th>
                <th scope="col"><span className="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody>
              {potong.map((p) => {
                const n = nama.get(p.telepon) ?? "Pelanggan";
                const wa = pesanUntuk(p.segmen, n);
                return (
                  <tr key={p.telepon}>
                    <td>
                      <Link href={`/admin/pesanan?q=${encodeURIComponent(p.telepon)}`} className="font-medium text-kayu hover:text-bata hover:underline">
                        {n}
                      </Link>
                      <p className="text-xs text-kayu-sedang">{teleponTampil(p.telepon)}</p>
                    </td>
                    <td><span className={`lencana ${KELAS_NADA[INFO_SEGMEN[p.segmen].nada]}`}>{INFO_SEGMEN[p.segmen].label}</span></td>
                    <td className="whitespace-nowrap">{teksHari(p.hariSejakTerakhir)}</td>
                    <td className="text-right angka-tabel">{angka(p.frekuensi)}×</td>
                    <td className="text-right angka-tabel">{rupiah(p.nilai)}</td>
                    <td className="text-right">
                      <a
                        href={linkWhatsapp(p.telepon, wa.teks)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tombol-kedua tombol-kecil"
                        aria-label={`${wa.label} ${n} lewat WhatsApp`}
                      >
                        <IkonWhatsapp className="w-4 h-4" /> {wa.label}
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

      <KomponenPaginasi
        halamanAktif={hal}
        totalHalaman={totalHalaman}
        basePath="/admin/laporan"
        queryLain={{ tab: "pelanggan", seg: segmen ?? undefined }}
      />

      <p className="petunjuk mt-4">
        Dihitung dari pesanan yang tidak dibatalkan dalam {HARI_PENGAMATAN_PELANGGAN} hari terakhir, dikelompokkan per nomor HP.
        Andalan = ≥ 3 pesanan, aktif 3 bulan terakhir, dan nilai belanja termasuk 40% teratas.
      </p>
    </>
  );
}
