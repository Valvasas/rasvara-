import Link from "next/link";
import { angka, jamTampil, linkWhatsapp, rupiah, selisihHari, tanggalPendek, teleponTampil } from "@/lib/format";
import { ambilPengaturan } from "@/lib/pengaturan";
import { pesanTagihPiutang, susunPesanWa, usahaUntukWa } from "@/lib/template-wa";
import { INFO_UMUR, URUTAN_UMUR, type UmurPiutang } from "@/lib/insight";
import { daftarPerluRefund, daftarPiutang, ringkasanPiutang } from "@/lib/insight-server";
import { KomponenPaginasi } from "@/components/KomponenPaginasi";
import { LencanaStatus } from "@/components/Lencana";
import { IkonWhatsapp } from "@/components/ikon/Ikon";

const UKURAN = 25;

function keterangan(selisih: number) {
  if (selisih > 0) return `${selisih} hari lagi`;
  if (selisih === 0) return "acara hari ini";
  return `lewat ${-selisih} hari`;
}

export async function TabPiutang({ umur, halaman }: { umur: UmurPiutang | null; halaman: number }) {
  const saringan = umur ?? "LEWAT";
  const [ringkas, daftar, refund, pengaturan] = await Promise.all([
    ringkasanPiutang(),
    daftarPiutang(saringan, halaman, UKURAN),
    daftarPerluRefund(),
    ambilPengaturan(),
  ]);
  const usaha = usahaUntukWa(pengaturan);
  const totalLewat = ringkas.filter((r) => r.umur !== "BELUM_JATUH_TEMPO").reduce((n, r) => n + r.sisa, 0);
  const totalHalaman = Math.max(1, Math.ceil(daftar.total / UKURAN));
  // Belum jatuh tempo → templat tagih DP/pelunasan biasa; sudah lewat → pesan piutang.
  const teksTagih = (p: (typeof daftar.baris)[number], selisih: number) => {
    const pesanan = { ...p, item: [] };
    if (selisih < 0) return pesanTagihPiutang(pesanan, usaha);
    return susunPesanWa(p.dibayar > 0 || p.minimalDp === 0 ? "tagih_pelunasan" : "tagih_dp", pesanan, usaha);
  };

  return (
    <>
      <ul className="grid gap-3 grid-cols-2 lg:grid-cols-4" aria-label="Piutang per umur">
        {URUTAN_UMUR.map((u) => {
          const r = ringkas.find((x) => x.umur === u)!;
          const aktif = umur === u;
          const bahaya = u === "LEBIH_30" && r.jumlah > 0;
          return (
            <li key={u}>
              <Link
                href={aktif ? "/admin/laporan?tab=piutang" : `/admin/laporan?tab=piutang&umur=${u}`}
                aria-current={aktif ? "true" : undefined}
                className={`kartu block h-full p-4 transition-colors hover:border-bata/40 ${aktif ? "ring-2 ring-bata border-bata" : ""} ${bahaya ? "border-bahaya/30" : ""}`}
              >
                <p className="teks-redup">{INFO_UMUR[u].label}</p>
                <p className={`mt-1 text-xl font-semibold angka-tabel ${bahaya ? "text-bahaya" : ""}`}>{rupiah(r.sisa)}</p>
                <p className="text-xs text-kayu-sedang">{angka(r.jumlah)} pesanan · {INFO_UMUR[u].arti.toLowerCase()}</p>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="judul-bagian">{umur ? `Piutang ${INFO_UMUR[umur].label.toLowerCase()}` : "Piutang yang acaranya sudah lewat"}</h2>
        <p className="text-sm text-kayu-sedang">
          Total tertunggak <span className="font-semibold text-kayu angka-tabel">{rupiah(totalLewat)}</span>
        </p>
      </div>

      {daftar.baris.length === 0 ? (
        <p className="kartu kartu-isi mt-3 text-center teks-redup">
          {umur ? "Tidak ada piutang di kelompok ini." : "Beres — tidak ada tagihan yang tertunggak."}
        </p>
      ) : (
        <>
        <ul className="kartu mt-3 divide-y divide-krem-gelap sm:hidden" aria-label="Daftar piutang">
          {daftar.baris.map((p) => {
            const selisih = selisihHari(p.tanggalAcara);
            const teks = teksTagih(p, selisih);
            return (
              <li key={p.kode} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/pesanan/${p.kode}`} className="block truncate font-medium text-kayu hover:text-bata">
                    {p.namaPemesan}
                  </Link>
                  <p className="text-xs text-kayu-sedang">
                    {tanggalPendek(p.tanggalAcara)} · <span className={selisih < -30 ? "text-bahaya font-medium" : ""}>{keterangan(selisih)}</span>
                  </p>
                  <p className="mt-1 text-sm">
                    Sisa <span className="font-semibold angka-tabel">{rupiah(p.total - p.dibayar)}</span>
                    {p.dibayar > 0 && <span className="text-xs text-kayu-sedang"> dari {rupiah(p.total)}</span>}
                  </p>
                </div>
                <a
                  href={linkWhatsapp(p.teleponPemesan, teks)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tombol-kedua tombol-kecil shrink-0"
                  aria-label={`Tagih ${p.namaPemesan} lewat WhatsApp`}
                >
                  <IkonWhatsapp className="w-4 h-4" /> Tagih
                </a>
              </li>
            );
          })}
        </ul>
        <div className="kartu mt-3 overflow-x-auto hidden sm:block">
          <table className="tabel min-w-[760px]">
            <caption className="sr-only">Pesanan yang belum lunas, diurutkan dari acara paling lama</caption>
            <thead>
              <tr>
                <th scope="col">Pesanan</th>
                <th scope="col">Acara</th>
                <th scope="col">Status</th>
                <th scope="col" className="text-right">Total</th>
                <th scope="col" className="text-right">Sisa</th>
                <th scope="col"><span className="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody>
              {daftar.baris.map((p) => {
                const selisih = selisihHari(p.tanggalAcara);
                const teks = teksTagih(p, selisih);
                return (
                  <tr key={p.kode}>
                    <td>
                      <Link href={`/admin/pesanan/${p.kode}`} className="font-medium text-kayu hover:text-bata hover:underline">
                        {p.namaPemesan}
                      </Link>
                      <p className="text-xs text-kayu-sedang"><span className="font-mono">{p.kode}</span> · {teleponTampil(p.teleponPemesan)}</p>
                    </td>
                    <td className="whitespace-nowrap">
                      {tanggalPendek(p.tanggalAcara)} <span className="text-kayu-sedang">· {jamTampil(p.jamAcara)}</span>
                      <p className={`text-xs ${selisih < -30 ? "text-bahaya font-medium" : "text-kayu-sedang"}`}>{keterangan(selisih)}</p>
                    </td>
                    <td><LencanaStatus status={p.status} /></td>
                    <td className="text-right angka-tabel">
                      {rupiah(p.total)}
                      {p.dibayar > 0 && <span className="block text-xs text-kayu-sedang">dibayar {rupiah(p.dibayar)}</span>}
                    </td>
                    <td className="text-right angka-tabel font-semibold">{rupiah(p.total - p.dibayar)}</td>
                    <td className="text-right">
                      <a
                        href={linkWhatsapp(p.teleponPemesan, teks)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tombol-kedua tombol-kecil"
                        aria-label={`Tagih ${p.namaPemesan} lewat WhatsApp`}
                      >
                        <IkonWhatsapp className="w-4 h-4" /> Tagih
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
        halamanAktif={Math.min(halaman, totalHalaman)}
        totalHalaman={totalHalaman}
        basePath="/admin/laporan"
        queryLain={{ tab: "piutang", umur: umur ?? undefined }}
      />

      {refund.length > 0 && (
        <section aria-labelledby="judul-refund" className="kartu kartu-isi mt-8 border-kunyit/40">
          <h2 id="judul-refund" className="judul-bagian">Perlu dikembalikan</h2>
          <p className="teks-redup mt-1">Pesanan batal yang uangnya sudah masuk. Catat pengembalian dari halaman detail pesanan.</p>
          <ul className="mt-3 divide-y divide-krem-gelap">
            {refund.map((r) => (
              <li key={r.kode} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <Link href={`/admin/pesanan/${r.kode}`} className="font-medium text-kayu hover:text-bata hover:underline">
                  {r.namaPemesan} <span className="font-mono text-xs text-kayu-sedang">{r.kode}</span>
                </Link>
                <span className="angka-tabel font-semibold text-kunyit-tua">{rupiah(r.dibayar)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="petunjuk mt-4">
        Piutang = pesanan yang sudah diterima dapur tapi belum lunas. Pesanan baru yang belum diterima tidak dihitung.
      </p>
    </>
  );
}
