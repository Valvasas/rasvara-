import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { bacaSesi, sandiDitandaiLemah } from "@/lib/auth";
import { ambilDenyut } from "@/lib/denyut";
import { rentangHari } from "@/lib/laporan";
import { alamatSitus } from "@/lib/situs";
import { ambilPengaturan, rekeningLengkap } from "@/lib/pengaturan";
import { ambilKetepatanWaktu } from "@/lib/ketepatan";
import { ringkasKetepatan } from "@/lib/ketepatan-tipe";
import { daftarKesiapan } from "@/lib/kesiapan";
import { periksaPenyimpanan } from "@/lib/unggah";
import {
  dariInputTanggal,
  hariIniWib,
  jam,
  jamTampil,
  kunciHari,
  menitDariJam,
  menitSekarangWib,
  namaPanggilan,
  rupiah,
  sapaanWaktu,
  sedangBuka,
  tanggalPanjang,
} from "@/lib/format";
import { LencanaBayar, LencanaStatus } from "@/components/Lencana";
import { PemantauPapan } from "@/components/admin/PemantauPesanan";
import { TombolBagikanToko } from "@/components/admin/TombolBagikanToko";
import { JamLangsung } from "@/components/admin/JamLangsung";
import {
  IkonApi,
  IkonCek,
  IkonDompet,
  IkonLampiran,
  IkonLonceng,
  IkonMangkuk,
  IkonPanahKanan,
  IkonTambah,
  IkonTarget,
  IkonTiket,
  IkonToko,
  IkonTruk,
  IkonWajan,
} from "@/components/ikon/Ikon";

export const metadata: Metadata = { title: "Beranda" };

function geser(kunci: string, hari: number): string {
  return kunciHari(new Date(dariInputTanggal(kunci).getTime() + hari * 86_400_000));
}

/** Persentase perubahan yang aman dari pembagian nol. */
function selisihPersen(sekarang: number, kemarin: number): number | null {
  if (kemarin === 0) return sekarang === 0 ? 0 : null;
  return Math.round(((sekarang - kemarin) / kemarin) * 100);
}

const NAMA_HARI_PENDEK = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const NADA: Record<string, string> = {
  cabai: "bg-cabai-lembut text-cabai-tua",
  kunyit: "bg-kunyit-lembut text-kunyit-tua",
  pandan: "bg-pandan-lembut text-pandan-tua",
  arang: "bg-arang-lembut text-arang",
};

export default async function BerandaDapur() {
  const [sesi, pengaturan] = await Promise.all([bacaSesi(), ambilPengaturan({ segar: true })]);
  const pemilik = sesi?.peran === "PEMILIK";
  const hariIni = hariIniWib();
  const besok = geser(hariIni, 1);
  const tujuhHariLalu = geser(hariIni, -6);
  const sejak30 = new Date(Date.now() - 30 * 86_400_000);

  const [denyut, untukHariIni, belumLunas, jadwal, terlaris, perHari, rata30, ketepatanMentah, kuotaMenu, terpakaiHariIni] =
    await Promise.all([
      ambilDenyut(pemilik),
      db.pesanan.count({
        where: { tanggalAcara: rentangHari(hariIni), status: { notIn: ["SELESAI", "DIBATALKAN"] } },
      }),
      pemilik
        ? db.pesanan.count({
            where: { caraBayar: "TRANSFER", statusBayar: "BELUM_BAYAR", status: { notIn: ["DIBATALKAN"] } },
          })
        : Promise.resolve(0),
      db.pesanan.findMany({
        where: {
          tanggalAcara: { gte: rentangHari(hariIni).gte, lt: rentangHari(besok).lt },
          status: { notIn: ["SELESAI", "DIBATALKAN"] },
        },
        select: {
          kode: true,
          namaPemesan: true,
          tanggalAcara: true,
          jamAcara: true,
          status: true,
          statusBayar: true,
          caraAmbil: true,
          total: true,
          item: { select: { namaMenu: true, jumlah: true }, take: 2 },
          _count: { select: { item: true } },
        },
        orderBy: [{ tanggalAcara: "asc" }, { jamAcara: "asc" }],
        take: 12,
      }),
      db.itemPesanan.groupBy({
        by: ["namaMenu"],
        where: { pesanan: { dibuatPada: { gte: sejak30 }, status: { not: "DIBATALKAN" } } },
        _sum: { jumlah: true },
        orderBy: { _sum: { jumlah: "desc" } },
        take: 5,
      }),
      // Dikelompokkan per hari WIB langsung di database: tidak ada ribuan baris
      // pesanan yang ditarik ke aplikasi hanya untuk dijumlahkan.
      pemilik
        ? db.$queryRaw<{ hari: string; jumlah: number; omzet: bigint }[]>`
            SELECT to_char(("dibuatPada" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS hari,
                   COUNT(*)::int AS jumlah,
                   COALESCE(SUM("total"), 0)::bigint AS omzet
            FROM "Pesanan"
            WHERE "dibuatPada" >= ${rentangHari(tujuhHariLalu).gte} AND "status" <> 'DIBATALKAN'
            GROUP BY 1`
        : Promise.resolve([]),
      pemilik
        ? db.pesanan.aggregate({ where: { dibuatPada: { gte: sejak30 }, status: { not: "DIBATALKAN" } }, _avg: { total: true } })
        : Promise.resolve(null),
      ambilKetepatanWaktu(30),
      db.menu.findMany({
        where: { aktif: true, kapasitasHarian: { gt: 0 } },
        select: { id: true, nama: true, satuan: true, kapasitasHarian: true },
      }),
      // Aturan sama dengan pemeriksaan kuota di aksi/pesanan.ts.
      db.itemPesanan.groupBy({
        by: ["menuId"],
        where: { menuId: { not: null }, pesanan: { tanggalAcara: dariInputTanggal(hariIni), status: { not: "DIBATALKAN" } } },
        _sum: { jumlah: true },
      }),
    ]);

  // Daftar kesiapan hanya untuk pemilik; kuerinya ringan & status penyimpanan disinggahkan.
  const kesiapan = pemilik
    ? await Promise.all([
        db.menu.count({ where: { aktif: true } }),
        db.menu.count({ where: { aktif: true, foto: { some: {} } } }),
        periksaPenyimpanan(),
        sandiDitandaiLemah(),
      ]).then(([menuAktif, menuBerfoto, penyimpanan, sandiBawaan]) =>
        daftarKesiapan({
          whatsapp: pengaturan.whatsapp,
          alamat: pengaturan.alamat,
          rekeningLengkap: rekeningLengkap(pengaturan),
          jedaMinimumMenit: pengaturan.jedaMinimumMenit,
          menuAktif,
          menuBerfoto,
          penyimpanan,
          sandiBawaan,
        })
      )
    : [];
  const kesiapanBeres = kesiapan.filter((k) => k.beres).length;

  // Diurutkan ulang per (hari WIB, jam) — kolom tanggal bisa menyimpan jam
  // berbeda dalam satu hari (data lama/impor), dan dapur membaca per jam siap.
  jadwal.sort((a, b) => {
    const ka = `${kunciHari(a.tanggalAcara)} ${a.jamAcara}`;
    const kb = `${kunciHari(b.tanggalAcara)} ${b.jamAcara}`;
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  const menitKini = menitSekarangWib();
  // Penanda "sekarang" disisipkan sebelum pesanan hari ini pertama yang jamnya belum lewat.
  const indeksSekarang = (() => {
    const i = jadwal.findIndex((p) => kunciHari(p.tanggalAcara) !== hariIni || menitDariJam(p.jamAcara) >= menitKini);
    return i === -1 ? jadwal.length : i;
  })();

  // Tujuh hari berurutan, hari tanpa pesanan tetap tampil sebagai nol.
  const hariGrafik = Array.from({ length: 7 }, (_, i) => geser(tujuhHariLalu, i));
  const petaHari = new Map(perHari.map((b) => [b.hari, { jumlah: b.jumlah, omzet: Number(b.omzet) }]));
  const seri = hariGrafik.map((k) => ({ kunci: k, ...(petaHari.get(k) ?? { jumlah: 0, omzet: 0 }) }));
  const ini = seri[6];
  const kemarin = seri[5];
  const total7 = seri.reduce((n, s) => n + s.omzet, 0);
  const puncak = Math.max(1, ...seri.map((s) => s.omzet));
  const persenOmzet = selisihPersen(ini.omzet, kemarin.omzet);
  const puncakTerlaris = Math.max(1, ...terlaris.map((t) => t._sum.jumlah ?? 0));
  const buka = sedangBuka(pengaturan.jamBuka, pengaturan.jamTutup);
  const ketepatan = ringkasKetepatan(ketepatanMentah);

  const petaTerpakai = new Map(terpakaiHariIni.map((t) => [t.menuId, t._sum.jumlah ?? 0]));
  const kuota = kuotaMenu
    .map((m) => {
      const terpakai = petaTerpakai.get(m.id) ?? 0;
      return { ...m, terpakai, persen: Math.min(100, Math.round((terpakai / m.kapasitasHarian!) * 100)) };
    })
    .sort((a, b) => b.persen - a.persen || a.nama.localeCompare(b.nama))
    .slice(0, 6);

  const tugas = [
    { label: "Pesanan baru", nilai: denyut.baru, href: "/admin/papan", Ikon: IkonLonceng, nada: "kunyit", ket: "perlu diterima", desak: true },
    ...(pemilik
      ? [{ label: "Cek pembayaran", nilai: denyut.cekBayar, href: "/admin/papan?bayar=cek", Ikon: IkonLampiran, nada: "kunyit", ket: "bukti transfer masuk", desak: true }]
      : []),
    { label: "Untuk hari ini", nilai: untukHariIni, href: "/admin/papan?rentang=hari-ini", Ikon: IkonWajan, nada: "cabai", ket: "belum selesai", desak: false },
    { label: "Siap diserahkan", nilai: denyut.siap, href: "/admin/pesanan?status=SIAP", Ikon: IkonTruk, nada: "pandan", ket: "antar / diambil", desak: false },
    ...(pemilik
      ? [{ label: "Belum transfer", nilai: belumLunas, href: "/admin/pesanan?bayar=BELUM_BAYAR&cara=TRANSFER&aktif=1", Ikon: IkonDompet, nada: "arang", ket: "bisa diingatkan via WA", desak: false }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <PemantauPapan />

      {/* Sapaan + jam: dapur bekerja dengan jam acara */}
      <section className="relative overflow-hidden rounded-[18px] permukaan-hangat border border-beras-gelap p-5 sm:p-7 grid gap-5 sm:grid-cols-[1fr_auto] items-center">
        <div className="min-w-0">
          <p className="label-atas">{tanggalPanjang(new Date())}</p>
          <h1 className="mt-2 font-tampil text-[1.7rem] sm:text-[2.2rem] font-extrabold text-arang leading-[1.05]">
            {sapaanWaktu()}, {namaPanggilan(sesi?.nama ?? "")}.
          </h1>
          <p className="mt-2 text-[15px] text-arang-sedang">
            {denyut.baru > 0
              ? `Ada ${denyut.baru} pesanan baru menunggu jawabanmu.`
              : untukHariIni > 0
              ? `${untukHariIni} pesanan dijadwalkan hari ini. Semangat masaknya!`
              : "Belum ada pesanan yang menunggu. Saatnya bagikan menu ke pelanggan."}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link href="/admin/papan" className="tombol-utama tombol-kecil">
              Buka papan pesanan
              <IkonPanahKanan className="w-4 h-4" />
            </Link>
            <Link href={`/admin/produksi?tanggal=${hariIni}`} className="tombol-kedua tombol-kecil">
              <IkonWajan className="w-4 h-4" />
              Rekap masak hari ini
            </Link>
          </div>
        </div>
        <div className="sm:text-right">
          <p className="flex sm:justify-end items-center gap-2 text-[13px] font-semibold text-arang-sedang">
            <span className={`w-2 h-2 rounded-full ${buka ? "bg-pandan anim-denyut" : "bg-arang-sedang"}`} />
            {buka ? "Jam layanan buka" : `Buka ${jamTampil(pengaturan.jamBuka)}`}
          </p>
          <p className="mt-1 leading-none">
            <JamLangsung awal={jam(new Date())} className="text-[3.2rem] sm:text-[4rem] font-bold tracking-tight text-arang" />
            <span className="ml-2 font-presisi text-[15px] font-semibold text-arang-sedang">WIB</span>
          </p>
        </div>
      </section>

      {/* Kesiapan toko (pemilik) */}
      {pemilik && kesiapanBeres < kesiapan.length && (
        <section aria-labelledby="judul-kesiapan" className="kartu overflow-hidden">
          <div className="px-5 sm:px-6 pt-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="label-atas">Sebelum launching</p>
              <h2 id="judul-kesiapan" className="judul-bagian mt-1">
                Kesiapan toko: {kesiapanBeres}/{kesiapan.length}
              </h2>
            </div>
            <div className="w-full sm:w-64 h-2 rounded-full bg-beras-tua overflow-hidden" aria-hidden="true">
              <div
                className="h-full rounded-full bg-pandan anim-tumbuh-datar"
                style={{ width: `${Math.round((kesiapanBeres / kesiapan.length) * 100)}%` }}
              />
            </div>
          </div>
          <ul className="mt-4 divide-y divide-beras-gelap border-t border-beras-gelap">
            {kesiapan
              .filter((k) => !k.beres)
              .map((k) => (
                <li key={k.kunci}>
                  <Link href={k.href} className="flex items-start gap-3 px-5 sm:px-6 py-3.5 transition-colors hover:bg-beras">
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 w-6 h-6 shrink-0 rounded-full ${k.kritis ? "border-2 border-bahaya" : "border-2 border-beras-gelap"}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-arang">{k.judul}</span>
                        {k.kritis && <span className="lencana !text-[11px] bg-bahaya-lembut text-bahaya border-bahaya/20">Penting</span>}
                      </span>
                      <span className="block text-[13.5px] text-arang-sedang">{k.keterangan}</span>
                    </span>
                    <IkonPanahKanan className="mt-1 w-4 h-4 shrink-0 text-arang-sedang" />
                  </Link>
                </li>
              ))}
          </ul>
          {kesiapanBeres > 0 && (
            <details className="group border-t border-beras-gelap">
              <summary className="flex items-center gap-2 px-5 sm:px-6 py-3 cursor-pointer list-none text-[14px] font-semibold text-pandan-tua hover:bg-beras">
                <IkonCek className="w-4 h-4" strokeWidth={3} />
                {kesiapanBeres} sudah beres
                <IkonPanahKanan className="w-4 h-4 transition-transform group-open:rotate-90" />
              </summary>
              <ul className="px-5 sm:px-6 pb-4 space-y-2">
                {kesiapan
                  .filter((k) => k.beres)
                  .map((k) => (
                    <li key={k.kunci} className="flex items-start gap-3 text-[14px]">
                      <span aria-hidden="true" className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-pandan text-white flex items-center justify-center">
                        <IkonCek className="w-3 h-3" strokeWidth={3} />
                      </span>
                      <span>
                        <span className="font-semibold text-arang">{k.judul}</span>
                        <span className="text-arang-sedang"> — {k.keterangan}</span>
                      </span>
                    </li>
                  ))}
              </ul>
            </details>
          )}
        </section>
      )}

      {/* Yang perlu dilakukan */}
      <section aria-labelledby="judul-tugas">
        <h2 id="judul-tugas" className="judul-bagian">
          Yang perlu dikerjakan
        </h2>
        <ul className={`mt-3 grid grid-cols-2 gap-3 ${tugas.length > 4 ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
          {tugas.map((t, i) => (
            <li key={t.label} className="anim-masuk" style={{ ["--tunda" as string]: `${i * 50}ms` }}>
              <Link
                href={t.href}
                className={`group flex flex-col h-full rounded-[14px] border bg-white p-4 kartu-interaktif ${
                  t.nilai > 0 && t.desak ? "border-kunyit/60 ring-2 ring-kunyit/15" : "border-beras-gelap"
                }`}
              >
                <span className="flex items-center justify-between">
                  <span className={`w-10 h-10 rounded-[10px] flex items-center justify-center ${NADA[t.nada]}`}>
                    <t.Ikon className="w-5 h-5" />
                  </span>
                  <IkonPanahKanan className="w-4 h-4 text-arang-sedang transition-transform group-hover:translate-x-0.5" />
                </span>
                <span className={`mt-3 font-presisi text-[2rem] font-bold leading-none ${t.nilai > 0 ? "text-arang" : "text-arang-sedang/50"}`}>
                  {t.nilai}
                </span>
                <span className="mt-1.5 text-[15px] font-semibold text-arang leading-tight">{t.label}</span>
                <span className="text-[13px] text-arang-sedang">{t.ket}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr] items-start">
        {/* Jadwal + penanda sekarang */}
        <section aria-labelledby="judul-jadwal" className="kartu kartu-isi">
          <div className="flex items-center justify-between gap-3">
            <h2 id="judul-jadwal" className="judul-bagian">
              Linimasa hari ini &amp; besok
            </h2>
            <Link href={`/admin/produksi?tanggal=${besok}`} className="text-[14px] font-semibold text-pandan-tua hover:text-pandan whitespace-nowrap">
              Rekap masak besok →
            </Link>
          </div>
          {jadwal.length === 0 ? (
            <p className="mt-4 rounded-[10px] bg-beras-tua px-4 py-6 text-center teks-redup">Tidak ada pesanan aktif untuk hari ini dan besok.</p>
          ) : (
            <ol className="mt-4">
              {jadwal.map((p, i) => {
                const hari = kunciHari(p.tanggalAcara) === hariIni ? "Hari ini" : "Besok";
                const lewat = hari === "Hari ini" && menitDariJam(p.jamAcara) < menitKini;
                const lainnya = p._count.item - p.item.length;
                return (
                  <li key={p.kode}>
                    {i === indeksSekarang && (
                      <div className="flex items-center gap-2 py-1" aria-label={`Sekarang pukul ${jam(new Date())}`}>
                        <span className="font-presisi text-[12px] font-bold text-cabai-tua w-16 text-center">{jam(new Date())}</span>
                        <span className="h-px flex-1 bg-cabai" />
                        <span className="font-presisi text-[11px] uppercase tracking-[0.14em] text-cabai-tua">sekarang</span>
                      </div>
                    )}
                    <Link
                      href={`/pesanan/${p.kode}`}
                      className={`flex gap-3 py-3 -mx-2 px-2 rounded-[10px] border-b border-beras-gelap/70 hover:bg-beras transition-colors ${lewat ? "bg-cabai-lembut/40" : ""}`}
                    >
                      <span className="w-16 shrink-0 text-center">
                        <span className="block font-presisi text-lg font-bold text-arang leading-tight">{jamTampil(p.jamAcara)}</span>
                        <span className={`block text-[12px] font-semibold ${lewat ? "text-cabai-tua" : hari === "Hari ini" ? "text-pandan-tua" : "text-arang-sedang"}`}>
                          {lewat ? "Lewat jam" : hari}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-semibold text-arang truncate">{p.namaPemesan}</span>
                          <LencanaStatus status={p.status} />
                        </span>
                        <span className="block text-[14px] text-arang-sedang truncate">
                          {p.item.map((it) => `${it.namaMenu} ×${it.jumlah}`).join(", ")}
                          {lainnya > 0 ? ` +${lainnya}` : ""}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-arang-sedang">
                          {p.caraAmbil === "DIANTAR" ? (
                            <span className="inline-flex items-center gap-1"><IkonTruk className="w-3.5 h-3.5" /> Diantar</span>
                          ) : (
                            <span className="inline-flex items-center gap-1"><IkonToko className="w-3.5 h-3.5" /> Ambil</span>
                          )}
                          {pemilik && <LencanaBayar statusBayar={p.statusBayar} />}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
              {indeksSekarang === jadwal.length && (
                <li className="flex items-center gap-2 py-2" aria-label="Semua jadwal di atas sudah lewat">
                  <span className="font-presisi text-[12px] font-bold text-cabai-tua w-16 text-center">{jam(new Date())}</span>
                  <span className="h-px flex-1 bg-cabai" />
                  <span className="font-presisi text-[11px] uppercase tracking-[0.14em] text-cabai-tua">sekarang</span>
                </li>
              )}
            </ol>
          )}
          <Link href="/admin/papan?rentang=7-hari" className="mt-4 tombol-kedua tombol-kecil w-full">
            Lihat semua di papan pesanan
          </Link>
        </section>

        <div className="space-y-6">
          {/* Ketepatan waktu: janji "tepat" yang diukur */}
          <section aria-labelledby="judul-ketepatan" className="kartu kartu-isi">
            <div className="flex items-center justify-between gap-3">
              <h2 id="judul-ketepatan" className="judul-bagian flex items-center gap-2">
                <IkonTarget className="w-5 h-5 text-pandan" />
                Ketepatan waktu
              </h2>
              <span className="label-atas">30 hari</span>
            </div>
            {ketepatan.cukup ? (
              <>
                <p className="mt-3 flex items-baseline gap-2">
                  <span
                    className={`font-presisi text-[3rem] font-bold leading-none ${
                      ketepatan.nada === "baik" ? "text-pandan-tua" : ketepatan.nada === "waspada" ? "text-kunyit-tua" : "text-bahaya"
                    }`}
                  >
                    {ketepatan.persen}%
                  </span>
                  <span className="text-[14px] text-arang-sedang">
                    {ketepatan.tepat} dari {ketepatan.total} pesanan siap sebelum jam acara
                  </span>
                </p>
                <div className="mt-3 h-2 rounded-full bg-beras-tua overflow-hidden" aria-hidden="true">
                  <div
                    className={`h-full rounded-full anim-tumbuh-datar ${
                      ketepatan.nada === "baik" ? "bg-pandan" : ketepatan.nada === "waspada" ? "bg-kunyit" : "bg-bahaya"
                    }`}
                    style={{ width: `${ketepatan.persen}%` }}
                  />
                </div>
                {ketepatan.keteranganMedian && <p className="mt-2 text-[13px] text-arang-sedang">Median: {ketepatan.keteranganMedian}.</p>}
              </>
            ) : (
              <p className="mt-3 text-[14px] text-arang-sedang">
                Butuh {ketepatan.butuh} pesanan lagi yang ditandai <span className="font-semibold text-arang">Siap</span> di papan
                untuk mulai menghitung. Tandai siap tepat saat masakan beres supaya angkanya jujur.
              </p>
            )}
          </section>

          {/* Kuota hari ini */}
          {kuota.length > 0 && (
            <section aria-labelledby="judul-kuota" className="kartu kartu-isi">
              <div className="flex items-center justify-between gap-3">
                <h2 id="judul-kuota" className="judul-bagian">
                  Kuota hari ini
                </h2>
                <Link href="/admin/menu" className="text-[14px] font-semibold text-pandan-tua hover:text-pandan">
                  Atur →
                </Link>
              </div>
              <ul className="mt-4 space-y-3">
                {kuota.map((k, i) => (
                  <li key={k.id}>
                    <div className="flex items-baseline justify-between gap-3 text-[14px]">
                      <span className="min-w-0 truncate text-arang">{k.nama}</span>
                      <span className="shrink-0 font-presisi text-[13px] text-arang-sedang">
                        <span className={`font-bold ${k.persen >= 90 ? "text-cabai-tua" : "text-arang"}`}>{k.terpakai}</span>/{k.kapasitasHarian}{" "}
                        {k.satuan}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-beras-tua overflow-hidden" aria-hidden="true">
                      <div
                        className={`h-full rounded-full anim-tumbuh-datar ${k.persen >= 90 ? "bg-cabai" : k.persen >= 60 ? "bg-kunyit" : "bg-pandan"}`}
                        style={{ width: `${Math.max(2, k.persen)}%`, ["--tunda" as string]: `${i * 60}ms` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {pemilik && (
            <section aria-labelledby="judul-penjualan" className="kartu kartu-isi">
              <h2 id="judul-penjualan" className="judul-bagian">
                Penjualan 7 hari
              </h2>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-[13px] text-arang-sedang">Hari ini</p>
                  <p className="font-presisi text-2xl font-bold text-arang">{rupiah(ini.omzet)}</p>
                  <p className="text-[13px] text-arang-sedang">
                    {ini.jumlah} pesanan
                    {persenOmzet !== null && kemarin.omzet > 0 && (
                      <span className={`ml-1.5 font-semibold ${persenOmzet >= 0 ? "text-pandan-tua" : "text-bahaya"}`}>
                        {persenOmzet >= 0 ? "▲" : "▼"} {Math.abs(persenOmzet)}% dari kemarin
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] text-arang-sedang">7 hari</p>
                  <p className="font-presisi font-bold text-arang">{rupiah(total7)}</p>
                  {rata30?._avg.total != null && (
                    <p className="text-[13px] text-arang-sedang">rata-rata {rupiah(rata30._avg.total)}/pesanan</p>
                  )}
                </div>
              </div>

              {/* Batang tipis berujung bulat, satu warna (besaran), hari ini paling tegas. */}
              <div className="mt-5 grid grid-cols-7 gap-2 h-32 items-end" aria-hidden="true">
                {seri.map((s, i) => {
                  const tinggi = Math.max(3, Math.round((s.omzet / puncak) * 100));
                  const d = dariInputTanggal(s.kunci);
                  return (
                    <div key={s.kunci} className="group relative flex flex-col items-center justify-end h-full">
                      <span
                        className={`pointer-events-none absolute -top-9 z-10 whitespace-nowrap rounded-lg bg-arang px-2 py-1 font-presisi text-[12px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 ${
                          // Tooltip batang pinggir dijangkarkan ke dalam supaya tidak keluar layar ponsel.
                          i < 2 ? "left-0" : i > 4 ? "right-0" : "left-1/2 -translate-x-1/2"
                        }`}
                      >
                        {rupiah(s.omzet)} · {s.jumlah} psn
                      </span>
                      <span
                        className={`w-full max-w-7 rounded-t-[4px] anim-tumbuh ${i === 6 ? "bg-pandan" : "bg-pandan/30 group-hover:bg-pandan/55"}`}
                        style={{ height: `${tinggi}%`, ["--tunda" as string]: `${i * 40}ms` }}
                      />
                      <span className={`mt-1.5 text-[12px] ${i === 6 ? "font-bold text-arang" : "text-arang-sedang"}`}>
                        {i === 6 ? "Ini" : NAMA_HARI_PENDEK[d.getUTCDay()]}
                      </span>
                    </div>
                  );
                })}
              </div>
              <table className="sr-only">
                <caption>Penjualan per hari, 7 hari terakhir</caption>
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Pesanan</th>
                    <th>Penjualan</th>
                  </tr>
                </thead>
                <tbody>
                  {seri.map((s) => (
                    <tr key={s.kunci}>
                      <td>{s.kunci}</td>
                      <td>{s.jumlah}</td>
                      <td>{rupiah(s.omzet)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Link href="/admin/laporan" className="mt-4 inline-flex text-[14px] font-semibold text-pandan-tua hover:text-pandan">
                Laporan lengkap →
              </Link>
            </section>
          )}

          <section aria-labelledby="judul-terlaris" className="kartu kartu-isi">
            <h2 id="judul-terlaris" className="judul-bagian flex items-center gap-2">
              <IkonApi className="w-5 h-5 text-cabai" />
              Terlaris 30 hari
            </h2>
            {terlaris.length === 0 ? (
              <p className="mt-3 teks-redup">Belum ada data penjualan.</p>
            ) : (
              <ol className="mt-4 space-y-3">
                {terlaris.map((t, i) => {
                  const n = t._sum.jumlah ?? 0;
                  return (
                    <li key={t.namaMenu}>
                      <div className="flex items-baseline justify-between gap-3 text-[15px]">
                        <span className="min-w-0 truncate text-arang">
                          <span className="font-presisi font-bold text-arang-sedang mr-1.5">{String(i + 1).padStart(2, "0")}</span>
                          {t.namaMenu}
                        </span>
                        <span className="shrink-0 font-presisi font-semibold text-arang">{n.toLocaleString("id-ID")}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-beras-tua overflow-hidden">
                        <div className="h-full rounded-full bg-kunyit" style={{ width: `${Math.max(4, (n / puncakTerlaris) * 100)}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      </div>

      {/* Aksi cepat */}
      <section aria-labelledby="judul-aksi">
        <h2 id="judul-aksi" className="judul-bagian">
          Aksi cepat
        </h2>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {pemilik && (
            <>
              <Link href="/admin/menu/baru" className="tombol-kedua h-full py-3 flex-col !gap-1.5 whitespace-normal text-center">
                <IkonTambah className="w-5 h-5 text-pandan" />
                Tambah menu
              </Link>
              <Link href="/admin/keuangan" className="tombol-kedua h-full py-3 flex-col !gap-1.5 whitespace-normal text-center">
                <IkonDompet className="w-5 h-5 text-pandan" />
                Catat pengeluaran
              </Link>
              <Link href="/admin/voucher" className="tombol-kedua h-full py-3 flex-col !gap-1.5 whitespace-normal text-center">
                <IkonTiket className="w-5 h-5 text-pandan" />
                Buat voucher
              </Link>
            </>
          )}
          <Link href={`/admin/produksi?tanggal=${besok}`} className="tombol-kedua h-full py-3 flex-col !gap-1.5 whitespace-normal text-center">
            <IkonWajan className="w-5 h-5 text-pandan" />
            Rekap masak besok
          </Link>
          {pemilik ? (
            <TombolBagikanToko
              url={alamatSitus()}
              namaUsaha={pengaturan.namaUsaha}
              className="tombol-kedua h-full py-3 flex-col !gap-1.5 whitespace-normal text-center [&>svg]:text-pandan"
            />
          ) : (
            <Link href="/admin/papan" className="tombol-kedua h-full py-3 flex-col !gap-1.5 whitespace-normal text-center">
              <IkonMangkuk className="w-5 h-5 text-pandan" />
              Papan pesanan
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
