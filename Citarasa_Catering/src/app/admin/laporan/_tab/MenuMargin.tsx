import Link from "next/link";
import { angka, rupiah } from "@/lib/format";
import { rentangBulan } from "@/lib/laporan";
import { ambilMarginMenu } from "@/lib/insight-server";
import { BATAS_MARGIN_TIPIS } from "@/lib/insight";
import { IkonPeringatan } from "@/components/ikon/Ikon";
import { KomponenPaginasi } from "@/components/KomponenPaginasi";

const UKURAN = 25;

function kelasMargin(m: number | null) {
  if (m === null) return "text-kayu-sedang";
  if (m < BATAS_MARGIN_TIPIS) return "text-bahaya";
  if (m < 35) return "text-kunyit-tua";
  return "text-daun-tua";
}

export async function TabMenuMargin({ bulan, halaman }: { bulan: string; halaman: number }) {
  const { baris, total, idMenu } = await ambilMarginMenu(rentangBulan(bulan));

  if (baris.length === 0) {
    return <p className="kartu kartu-isi text-center teks-redup">Belum ada pesanan selesai di bulan ini.</p>;
  }

  const labaTotal = total.omzetBerHpp - total.hpp;
  const marginTotal = total.omzetBerHpp > 0 ? (labaTotal / total.omzetBerHpp) * 100 : null;
  const cakupan = total.omzet > 0 ? Math.round((total.omzetBerHpp / total.omzet) * 100) : 0;
  const tipis = baris.filter((b) => b.lakuTapiTipis);
  const tanpaHpp = baris.filter((b) => b.margin === null);
  const adaPerkiraan = baris.some((b) => b.hppPerkiraan);
  const totalHalaman = Math.max(1, Math.ceil(baris.length / UKURAN));
  const hal = Math.min(halaman, totalHalaman);
  const potong = baris.slice((hal - 1) * UKURAN, hal * UKURAN);

  return (
    <>
      <dl className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="kartu p-5">
          <dt className="teks-redup">Omzet menu</dt>
          <dd className="mt-1 text-xl sm:text-2xl font-semibold angka-tabel">{rupiah(total.omzet)}</dd>
          <dd className="mt-1 text-xs text-kayu-sedang">sebelum diskon &amp; ongkir</dd>
        </div>
        <div className="kartu p-5">
          <dt className="teks-redup">Biaya bahan (HPP)</dt>
          <dd className="mt-1 text-xl sm:text-2xl font-semibold angka-tabel">{rupiah(total.hpp)}</dd>
          <dd className="mt-1 text-xs text-kayu-sedang">dari {cakupan}% omzet yang punya resep</dd>
        </div>
        <div className="kartu p-5">
          <dt className="teks-redup">Laba kotor</dt>
          <dd className={`mt-1 text-xl sm:text-2xl font-semibold angka-tabel ${labaTotal < 0 ? "text-bahaya" : ""}`}>
            {total.omzetBerHpp > 0 ? rupiah(labaTotal) : "—"}
          </dd>
          <dd className="mt-1 text-xs text-kayu-sedang">omzet ber-resep − HPP</dd>
        </div>
        <div className="kartu p-5">
          <dt className="teks-redup">Margin rata-rata</dt>
          <dd className={`mt-1 text-xl sm:text-2xl font-semibold angka-tabel ${kelasMargin(marginTotal)}`}>
            {marginTotal === null ? "—" : `${marginTotal.toFixed(0)}%`}
          </dd>
          <dd className="mt-1 text-xs text-kayu-sedang">sehat bila ≥ 35%</dd>
        </div>
      </dl>

      {tipis.length > 0 && (
        <div className="kotak-peringatan mt-6 flex items-start gap-2">
          <IkonPeringatan className="w-4 h-4 mt-0.5 shrink-0" />
          <p>
            <span className="font-semibold">Laku tapi untungnya tipis:</span> {tipis.slice(0, 5).map((t) => t.nama).join(", ")}{tipis.length > 5 ? ` dan ${tipis.length - 5} lainnya` : ""}. Menu ini
            banyak dipesan, tapi margin di bawah {BATAS_MARGIN_TIPIS}% — naikkan harga sedikit atau tinjau takarannya; dampaknya besar
            karena volumenya tinggi.
          </p>
        </div>
      )}
      {tanpaHpp.length > 0 && (
        <p className="kotak-info bg-krem-tua text-kayu border-krem-gelap mt-4 text-sm">
          {tanpaHpp.length} menu belum punya resep, jadi labanya belum bisa dihitung.{" "}
          <Link href="/admin/menu?status=tanpa-resep" className="font-semibold text-bata underline underline-offset-2">
            Lengkapi resep
          </Link>
        </p>
      )}

      <div className="kartu mt-6 overflow-x-auto">
        <table className="tabel min-w-[680px]">
          <caption className="sr-only">Omzet, biaya bahan, dan margin per menu</caption>
          <thead>
            <tr>
              <th scope="col">Menu</th>
              <th scope="col" className="text-right">Porsi</th>
              <th scope="col" className="text-right">Omzet</th>
              <th scope="col" className="text-right">HPP</th>
              <th scope="col" className="text-right">Laba kotor</th>
              <th scope="col" className="text-right">Margin</th>
            </tr>
          </thead>
          <tbody>
            {potong.map((b, i) => {
              const id = idMenu.get(b.menuId);
              return (
                <tr key={b.menuId}>
                  <td className="max-w-[260px]">
                    <span className="mr-2 text-xs text-kayu-sedang angka-tabel">{(hal - 1) * UKURAN + i + 1}</span>
                    {id ? (
                      <Link href={`/admin/menu/${id}`} className="font-medium text-kayu hover:text-bata hover:underline">
                        {b.nama}
                      </Link>
                    ) : (
                      <span className="font-medium text-kayu">{b.nama}</span>
                    )}
                    {b.lakuTapiTipis && <span className="lencana ml-2 bg-bahaya/10 text-bahaya">Tipis</span>}
                  </td>
                  <td className="text-right angka-tabel">{angka(b.porsi)}</td>
                  <td className="text-right angka-tabel">{rupiah(b.omzet)}</td>
                  <td className="text-right angka-tabel">
                    {b.margin === null ? <span className="text-kayu-sedang">belum ada resep</span> : rupiah(b.hpp)}
                    {b.hppPerkiraan && <span className="text-kunyit-tua" title="Sebagian memakai resep kini"> *</span>}
                  </td>
                  <td className={`text-right angka-tabel ${b.laba !== null && b.laba < 0 ? "text-bahaya" : ""}`}>{b.laba === null ? "—" : rupiah(b.laba)}</td>
                  <td className={`text-right angka-tabel font-semibold ${kelasMargin(b.margin)}`}>{b.margin === null ? "—" : `${b.margin.toFixed(0)}%`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <KomponenPaginasi halamanAktif={hal} totalHalaman={totalHalaman} basePath="/admin/laporan" queryLain={{ tab: "menu", bulan }} />

      <p className="petunjuk mt-4">
        Diurutkan dari omzet terbesar. Dihitung dari pesanan <span className="font-medium">selesai</span> menurut tanggal acaranya. HPP memakai harga bahan saat pesanan dibuat
        {adaPerkiraan && (
          <>
            ; tanda <span className="text-kunyit-tua">*</span> berarti sebagian pesanan lama belum punya catatan HPP sehingga memakai resep &amp; harga
            bahan sekarang
          </>
        )}
        . Diskon voucher &amp; ongkir tidak dibebankan ke menu.
      </p>
    </>
  );
}
