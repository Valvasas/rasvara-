import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { bacaSesi } from "@/lib/auth";
import { rentangHari } from "@/lib/laporan";
import { ambilPengaturan, kekuranganPengaturan } from "@/lib/pengaturan";
import {
  dariInputTanggal,
  hariIniWib,
  jamTampil,
  kunciHari,
  rupiah,
  tanggalPendek,
} from "@/lib/format";
import { INFO_STATUS, KOLOM_PAPAN } from "@/lib/pesanan";
import { LencanaBayar } from "@/components/Lencana";
import { AksiPesanan } from "@/components/admin/AksiPesanan";
import { MenuWa } from "@/components/admin/MenuWa";
import { PemantauPapan } from "@/components/admin/PemantauPapan";
import { ambilRingkasanHariIni } from "@/lib/ringkasan";
import { bacaDenyut } from "@/lib/denyut";
import { usahaUntukWa } from "@/lib/template-wa";
import { IkonCari, IkonLampiran, IkonLokasi, IkonPeringatan, IkonTambah, IkonTruk } from "@/components/ikon/Ikon";
import type { Prisma, StatusPesanan } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Papan pesanan" };

/**
 * Kartu per kolom yang dirender. Hitungan di kepala kolom tetap jumlah
 * sebenarnya; sisanya bisa dibuka di halaman Semua pesanan. Tanpa batas ini,
 * seribu pesanan aktif berarti seribu kartu dalam satu halaman.
 */
const BATAS_KOLOM = 12;

const RENTANG = [
  { kunci: "semua", label: "Semua" },
  { kunci: "hari-ini", label: "Hari ini" },
  { kunci: "besok", label: "Besok" },
  { kunci: "7-hari", label: "7 hari" },
] as const;
type KunciRentang = (typeof RENTANG)[number]["kunci"];

const WARNA_TITIK: Record<StatusPesanan, string> = {
  BARU: "bg-kunyit",
  DIKONFIRMASI: "bg-kayu-sedang",
  DIPROSES: "bg-bata",
  SIAP: "bg-daun",
  SELESAI: "bg-daun",
  DIBATALKAN: "bg-bahaya",
};

function rentangTanggal(kunci: KunciRentang): { gte: Date; lt: Date } | undefined {
  const hariIni = hariIniWib();
  if (kunci === "hari-ini") return rentangHari(hariIni);
  const geser = (hari: number) => kunciHari(new Date(dariInputTanggal(hariIni).getTime() + hari * 86_400_000));
  if (kunci === "besok") return rentangHari(geser(1));
  if (kunci === "7-hari") return { gte: rentangHari(hariIni).gte, lt: rentangHari(geser(7)).gte };
  return undefined;
}

interface HalamanPapanDapurProps {
  searchParams: Promise<{ q?: string; ambil?: string; rentang?: string; bayar?: string }>;
}

export default async function HalamanPapanDapur({ searchParams }: HalamanPapanDapurProps) {
  const [params, sesi, pengaturan] = await Promise.all([searchParams, bacaSesi(), ambilPengaturan()]);
  const adalahPemilik = sesi?.peran === "PEMILIK";

  const kataKunci = (params.q ?? "").trim().slice(0, 60);
  const ambil = params.ambil === "AMBIL_SENDIRI" || params.ambil === "DIANTAR" ? params.ambil : undefined;
  const rentang: KunciRentang = RENTANG.some((r) => r.kunci === params.rentang)
    ? (params.rentang as KunciRentang)
    : "semua";
  const hanyaCekBayar = params.bayar === "cek";

  const saringan: Prisma.PesananWhereInput = {
    ...(ambil ? { caraAmbil: ambil } : {}),
    ...(rentangTanggal(rentang) ? { tanggalAcara: rentangTanggal(rentang) } : {}),
    ...(hanyaCekBayar ? { statusBayar: "MENUNGGU_VERIFIKASI" } : {}),
    ...(kataKunci
      ? {
          OR: [
            { namaPemesan: { contains: kataKunci, mode: "insensitive" } },
            { kode: { contains: kataKunci, mode: "insensitive" } },
            { teleponPemesan: { contains: kataKunci.replace(/\D/g, "").replace(/^0/, "") || kataKunci } },
          ],
        }
      : {}),
  };

  const [perKolom, hitungan, ringkas, denyut] = await Promise.all([
    Promise.all(
      KOLOM_PAPAN.map((status) =>
        db.pesanan.findMany({
          where: { ...saringan, status },
          include: { item: { select: { id: true, namaMenu: true, jumlah: true, satuan: true } } },
          orderBy: [{ tanggalAcara: "asc" }, { jamAcara: "asc" }],
          take: BATAS_KOLOM,
        })
      )
    ),
    db.pesanan.groupBy({ by: ["status"], where: { ...saringan, status: { in: KOLOM_PAPAN } }, _count: { _all: true } }),
    ambilRingkasanHariIni(adalahPemilik),
    bacaDenyut(),
  ]);
  const usaha = usahaUntukWa(pengaturan);
  const tugasMacet =
    adalahPemilik &&
    ((pengaturan.batasBayarJam > 0 && !pengaturan.tugasTerakhir) ||
      (pengaturan.tugasTerakhir !== null && Date.now() - pengaturan.tugasTerakhir.getTime() > 2 * 60 * 60 * 1000));

  const jumlahStatus = (s: StatusPesanan) => hitungan.find((h) => h.status === s)?._count._all ?? 0;
  const totalAktif = KOLOM_PAPAN.reduce((n, s) => n + jumlahStatus(s), 0);
  const kurang = adalahPemilik ? kekuranganPengaturan(pengaturan) : [];
  const adaSaringan = Boolean(kataKunci || ambil || hanyaCekBayar);

  const hrefDengan = (ubah: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const gabung = { q: kataKunci || undefined, ambil, rentang: rentang === "semua" ? undefined : rentang, bayar: hanyaCekBayar ? "cek" : undefined, ...ubah };
    for (const [k, v] of Object.entries(gabung)) if (v) q.set(k, v);
    const s = q.toString();
    return s ? `/admin?${s}` : "/admin";
  };

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="judul-halaman">Papan pesanan</h1>
          <p className="teks-redup mt-1">
            {totalAktif} pesanan aktif{rentang !== "semua" ? ` · ${RENTANG.find((r) => r.kunci === rentang)?.label.toLowerCase()}` : ""}
          </p>
          <div className="mt-2">
            <PemantauPapan versiAwal={denyut.versi} baruAwal={denyut.baru} />
          </div>
        </div>
        <Link href="/admin/pesanan/baru" className="tombol-utama">
          <IkonTambah className="w-4 h-4" /> Catat pesanan
        </Link>
      </header>

      {/* Ringkasan hari ini: tiap kartu adalah jalan pintas ke tindakannya. */}
      <ul className={`mt-6 grid gap-3 grid-cols-2 ${adalahPemilik ? "lg:grid-cols-4" : ""}`}>
        <li>
          <Link href={hrefDengan({ rentang: "hari-ini" })} className="kartu block p-4 h-full hover:border-bata/40">
            <p className="teks-redup">Hari ini</p>
            <p className="mt-1 text-xl font-semibold angka-tabel">{ringkas.hariIni.jumlah} <span className="text-sm font-normal text-kayu-sedang">pesanan</span></p>
            <p className="text-xs text-kayu-sedang mt-0.5">
              {ringkas.hariIni.jamPertama ? `Paling awal ${jamTampil(ringkas.hariIni.jamPertama)}` : "Tidak ada yang harus siap"}
            </p>
          </Link>
        </li>
        <li>
          <Link href={`/admin/produksi?tanggal=${ringkas.besok.tanggal}`} className="kartu block p-4 h-full hover:border-bata/40">
            <p className="teks-redup">Besok</p>
            <p className="mt-1 text-xl font-semibold angka-tabel">{ringkas.besok.jumlah} <span className="text-sm font-normal text-kayu-sedang">pesanan</span></p>
            <p className="text-xs text-bata mt-0.5">Lihat rekap produksi →</p>
          </Link>
        </li>
        {adalahPemilik && (
          <li>
            <Link
              href={hrefDengan({ bayar: hanyaCekBayar ? undefined : "cek" })}
              aria-current={hanyaCekBayar ? "page" : undefined}
              className={`kartu block p-4 h-full hover:border-bata/40 ${ringkas.perluCek ? "border-kunyit/50 bg-kunyit-lembut/40" : ""} ${hanyaCekBayar ? "ring-2 ring-kunyit/40" : ""}`}
            >
              <p className="teks-redup">Cek pembayaran</p>
              <p className="mt-1 text-xl font-semibold angka-tabel">{ringkas.perluCek}</p>
              <p className="text-xs text-kayu-sedang mt-0.5">{hanyaCekBayar ? "Ketuk untuk tampilkan semua" : "bukti transfer menunggu"}</p>
            </Link>
          </li>
        )}
        {adalahPemilik && (
          <li>
            <Link href="/admin/laporan?tab=piutang" className={`kartu block p-4 h-full hover:border-bata/40 ${ringkas.piutangLewat.nilai ? "border-bahaya/30" : ""}`}>
              <p className="teks-redup">Piutang lewat</p>
              {ringkas.piutangLewat.jumlah ? (
                <>
                  <p className="mt-1 text-xl font-semibold angka-tabel text-bahaya">{rupiah(ringkas.piutangLewat.nilai)}</p>
                  <p className="text-xs text-kayu-sedang mt-0.5">{ringkas.piutangLewat.jumlah} pesanan, acara sudah lewat</p>
                </>
              ) : (
                <>
                  <p className="mt-1 text-xl font-semibold text-daun-tua">Beres</p>
                  <p className="text-xs text-kayu-sedang mt-0.5">tidak ada tagihan tertunggak</p>
                </>
              )}
            </Link>
          </li>
        )}
      </ul>

      {kurang.length > 0 && (
        <div className="kotak-peringatan mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-start gap-2">
            <IkonPeringatan className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Belum diisi: <span className="font-semibold">{kurang.join(", ")}</span>. Pembeli tidak bisa membayar
              transfer atau menghubungi dapur sampai data ini lengkap.
            </span>
          </p>
          <Link href="/admin/pengaturan" className="tombol-kedua tombol-kecil">Lengkapi</Link>
        </div>
      )}
      {tugasMacet && (
        <p className="kotak-peringatan mt-4 flex items-start gap-2">
          <IkonPeringatan className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Tugas otomatis (arsip rekap bulanan, batal otomatis) tidak berjalan dalam 2 jam terakhir. Periksa cron di server
            — lihat DEPLOYMENT.md.
          </span>
        </p>
      )}

      <form method="get" action="/admin" role="search" className="mt-6 flex flex-wrap gap-2">
        {rentang !== "semua" && <input type="hidden" name="rentang" value={rentang} />}
        {hanyaCekBayar && <input type="hidden" name="bayar" value="cek" />}
        <div className="relative w-full sm:w-72">
          <label htmlFor="cari-pesanan" className="sr-only">Cari pesanan</label>
          <IkonCari className="w-4 h-4 text-kayu-sedang absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="cari-pesanan"
            type="search"
            name="q"
            defaultValue={kataKunci}
            maxLength={60}
            placeholder="Nama, kode, atau nomor HP"
            className="isian pl-9"
          />
        </div>
        <label htmlFor="saring-ambil" className="sr-only">Cara ambil</label>
        <select id="saring-ambil" name="ambil" defaultValue={ambil ?? ""} className="isian flex-1 sm:flex-none sm:w-auto">
          <option value="">Semua cara ambil</option>
          <option value="AMBIL_SENDIRI">Ambil sendiri</option>
          <option value="DIANTAR">Diantar</option>
        </select>
        <button type="submit" className="tombol-kedua">Terapkan</button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {RENTANG.map((r) => (
          <Link
            key={r.kunci}
            href={hrefDengan({ rentang: r.kunci === "semua" ? undefined : r.kunci })}
            aria-current={rentang === r.kunci ? "page" : undefined}
            className={`pil ${rentang === r.kunci ? "pil-aktif" : ""}`}
          >
            {r.label}
          </Link>
        ))}
        {adaSaringan && (
          <Link href={hrefDengan({ q: undefined, ambil: undefined, bayar: undefined })} className="tombol-hantu tombol-kecil">
            Hapus saringan{hanyaCekBayar ? " (cek bayar)" : ""}
          </Link>
        )}
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4 items-start">
        {KOLOM_PAPAN.map((status, i) => {
          const daftar = perKolom[i];
          const jumlah = jumlahStatus(status);
          return (
            <section key={status} aria-labelledby={`kolom-${status}`} className="min-w-0">
              <h2 id={`kolom-${status}`} className="flex items-center gap-2 px-1 text-sm font-semibold text-kayu">
                <span aria-hidden="true" className={`w-2 h-2 rounded-full ${WARNA_TITIK[status]}`} />
                {INFO_STATUS[status].label}
                <span className="ml-auto text-kayu-sedang font-normal angka-tabel">{jumlah}</span>
              </h2>

              {/* Di layar lebar tiap kolom bergulir sendiri, jadi keempat tahap
                  tetap terlihat sejajar dan halaman tidak memanjang ribuan piksel. */}
              <div className="mt-3 space-y-3 xl:max-h-[calc(100vh-260px)] xl:overflow-y-auto gulir-tipis xl:pr-1 xl:-mr-1">
                {daftar.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-krem-gelap px-4 py-8 text-center text-sm text-kayu-sedang">
                    Kosong
                  </p>
                ) : (
                  daftar.map((p) => {
                    const itemTampil = p.item.slice(0, 3);
                    const sisa = p.item.length - itemTampil.length;
                    return (
                      <article key={p.id} className="kartu p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs text-kayu-sedang">
                              {tanggalPendek(p.tanggalAcara)} ·{" "}
                              <span className="font-semibold text-kayu">{jamTampil(p.jamAcara)}</span>
                            </p>
                            <h3 className="mt-1 font-semibold text-kayu truncate">
                              <Link href={`/admin/pesanan/${p.kode}`} className="hover:text-bata">
                                {p.namaPemesan}
                              </Link>
                            </h3>
                          </div>
                          <Link
                            href={`/admin/pesanan/${p.kode}`}
                            className="font-mono text-[11px] text-kayu-sedang hover:text-bata shrink-0 mt-0.5"
                          >
                            {p.kode.slice(-6)}
                          </Link>
                        </div>

                        <ul className="mt-3 space-y-1 text-sm">
                          {itemTampil.map((it) => (
                            <li key={it.id} className="flex justify-between gap-2">
                              <span className="text-kayu truncate">{it.namaMenu}</span>
                              <span className="font-semibold text-kayu angka-tabel">×{it.jumlah}</span>
                            </li>
                          ))}
                          {sisa > 0 && <li className="text-xs text-kayu-sedang">+{sisa} menu lain</li>}
                        </ul>

                        {p.catatan && (
                          <p className="mt-3 rounded-lg bg-kunyit-lembut px-2.5 py-2 text-xs text-kunyit-tua line-clamp-3">
                            {p.catatan}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-kayu-sedang">
                          {p.caraAmbil === "DIANTAR" && (
                            <span className="inline-flex items-center gap-1" title={p.alamatAntar ?? undefined}>
                              <IkonTruk className="w-3.5 h-3.5" /> Antar
                            </span>
                          )}
                          {p.latitude != null && p.longitude != null && (
                            // Tautan koordinat dibuka aplikasi peta di ponsel pengantar.
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-bata hover:underline"
                            >
                              <IkonLokasi className="w-3.5 h-3.5" /> Peta
                            </a>
                          )}
                          <MenuWa ringkas pesanan={{ ...p, status: p.status }} usaha={usaha} />
                          {adalahPemilik && p.buktiBayarUrl && (
                            <a
                              href={p.buktiBayarUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-bata hover:underline"
                            >
                              <IkonLampiran className="w-3.5 h-3.5" /> Bukti
                            </a>
                          )}
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2">
                          {adalahPemilik ? (
                            <span className="angka-tabel">
                              <span className="font-semibold text-kayu">{rupiah(p.total)}</span>
                              {p.dibayar > 0 && p.dibayar < p.total && (
                                <span className="block text-xs text-kayu-sedang">sisa {rupiah(p.total - p.dibayar)}</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-xs text-kayu-sedang">{p.caraBayar === "TUNAI" ? "Tunai" : "Transfer"}</span>
                          )}
                          <LencanaBayar statusBayar={p.statusBayar} />
                        </div>

                        <div className="mt-3 pt-3 border-t border-krem-gelap">
                          <AksiPesanan
                            kode={p.kode}
                            status={p.status}
                            statusBayar={p.statusBayar}
                            total={p.total}
                            sisa={Math.max(0, p.total - p.dibayar)}
                            adalahPemilik={adalahPemilik}
                          />
                        </div>
                      </article>
                    );
                  })
                )}

                {jumlah > daftar.length && (
                  <Link
                    href={`/admin/pesanan?status=${status}${kataKunci ? `&q=${encodeURIComponent(kataKunci)}` : ""}`}
                    className="block rounded-xl px-4 py-3 text-center text-sm font-medium text-bata hover:bg-bata-lembut"
                  >
                    Lihat semua {jumlah} pesanan →
                  </Link>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
