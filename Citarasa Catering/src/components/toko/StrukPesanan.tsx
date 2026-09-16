import { rupiah, tanggalPanjang, jamTampil } from "@/lib/format";

export interface BarisStruk {
  id: string;
  namaMenu: string;
  jumlah: number;
  satuan: string;
  hargaSatuan: number;
  subtotal: number;
  catatan: string | null;
}

interface StrukPesananProps {
  kode: string;
  namaUsaha: string;
  tanggalAcara: Date;
  jamAcara: string;
  item: BarisStruk[];
  subtotal: number;
  diskon: number;
  kodeVoucher: string | null;
  ongkir: number;
  total: number;
  lunas: boolean;
}

/**
 * Nota pesanan yang benar-benar terbaca sebagai struk.
 *
 * Sebelumnya rincian harga tampil sebagai kartu putih biasa di dalam kartu
 * putih lain: tidak ada satu pun isyarat visual bahwa ini sebuah nota. Tiga
 * perangkat klasik struk dipakai di sini karena masing-masing punya tugas:
 *
 * - Tepi bergerigi menandakan "lembar yang disobek", sehingga pembeli langsung
 *   tahu bagian ini adalah bukti pesanan, bukan panel antarmuka.
 * - Garis titik-titik menuntun mata dari nama hidangan ke angkanya, jarak
 *   sejauh apa pun.
 * - Angka tabular membuat seluruh kolom rupiah berbaris lurus; dengan angka
 *   proporsional, Rp300.000 dan Rp255.000 tidak pernah sejajar.
 */
export function StrukPesanan({
  kode,
  namaUsaha,
  tanggalAcara,
  jamAcara,
  item,
  subtotal,
  diskon,
  kodeVoucher,
  ongkir,
  total,
  lunas,
}: StrukPesananProps) {
  return (
    // Latar krem di belakang kertas: tanpa ini, struk putih berdiri di atas
    // kartu putih dan tepi geriginya tidak terlihat sama sekali.
    <div className="permukaan-cekung rounded-3xl p-4 sm:p-6">
      <div className="bayangan-struk">
        <div className="kertas-struk relative px-6 py-7 sm:px-8">
      {lunas && (
        <div
          aria-hidden="true"
          className="stempel-lunas pointer-events-none absolute right-6 top-16 sm:right-10 px-4 py-1.5 text-lg font-extrabold select-none"
        >
          LUNAS
        </div>
      )}

      {/* Kepala struk */}
      <div className="text-center space-y-1 pb-4">
        <p className="judul-bagian text-lg text-kayu">{namaUsaha}</p>
        <p className="label-mikro text-kayu-sedang/80">Nota Pesanan</p>
        <p className="kode-cetak text-kayu text-sm pt-1">{kode}</p>
        <p className="text-[11px] text-kayu-sedang">
          {tanggalPanjang(tanggalAcara)} &middot; {jamTampil(jamAcara)} WIB
        </p>
      </div>

      <div className="garis-sobek-datar" />

      {/* Rincian hidangan */}
      <ul className="py-4 space-y-3">
        {item.map((it) => (
          <li key={it.id}>
            <div className="flex items-baseline text-sm">
              <span className="font-bold text-kayu">{it.namaMenu}</span>
              <span className="penuntun-titik" aria-hidden="true" />
              <span className="uang font-bold text-kayu whitespace-nowrap">
                {rupiah(it.subtotal)}
              </span>
            </div>
            <p className="angka-tabular text-[11px] text-kayu-sedang mt-0.5">
              {it.jumlah} {it.satuan} &times; {rupiah(it.hargaSatuan)}
            </p>
            {it.catatan && (
              <p className="text-[11px] text-kayu-sedang/80 italic mt-0.5">
                Catatan: {it.catatan}
              </p>
            )}
          </li>
        ))}
      </ul>

      <div className="garis-sobek-datar" />

      {/* Perhitungan */}
      <dl className="py-4 space-y-1.5 text-[13px]">
        <div className="flex justify-between text-kayu-sedang">
          <dt>Subtotal hidangan</dt>
          <dd className="uang">{rupiah(subtotal)}</dd>
        </div>

        {diskon > 0 && (
          <div className="flex justify-between text-daun-tua font-semibold">
            <dt>Potongan{kodeVoucher ? ` ${kodeVoucher}` : ""}</dt>
            <dd className="uang">-{rupiah(diskon)}</dd>
          </div>
        )}

        <div className="flex justify-between text-kayu-sedang">
          <dt>Ongkos antar</dt>
          <dd className="uang">{ongkir === 0 ? "Gratis" : rupiah(ongkir)}</dd>
        </div>
      </dl>

      <div className="garis-sobek-datar" />

      {/* Total: satu-satunya angka yang dibesarkan, supaya tidak ada keraguan
          berapa yang harus dibayar. */}
      <div className="flex items-baseline justify-between gap-3 pt-4">
        <span className="label-mikro text-kayu-sedang whitespace-nowrap">
          Total bayar
        </span>
        <span className="uang judul-bagian text-2xl text-bata">
          {rupiah(total)}
        </span>
      </div>

      {diskon > 0 && (
        <p className="text-[11px] text-daun-tua font-semibold text-right mt-1">
          Anda hemat {rupiah(diskon)} dari pesanan ini.
        </p>
      )}

          <p className="text-center text-[11px] text-kayu-sedang/70 pt-5">
            Terima kasih sudah memesan. Simpan kode {kode} untuk melacak pesanan.
          </p>
        </div>
      </div>
    </div>
  );
}
