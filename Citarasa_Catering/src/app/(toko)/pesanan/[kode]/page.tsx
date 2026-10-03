import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { punyaAksesPesanan } from "@/lib/akses-pesanan";
import { bacaSesi } from "@/lib/auth";
import { ambilPengaturan } from "@/lib/pengaturan";
import {
  jamTampil,
  linkWhatsapp,
  rupiah,
  tanggalPanjang,
} from "@/lib/format";
import {
  LABEL_AMBIL,
  LABEL_BAYAR,
} from "@/lib/pesanan";
import { LencanaBayar, LencanaStatus } from "@/components/Lencana";
import { sisaTagihan } from "@/lib/pembayaran";
import { FormUnggahBukti } from "@/components/toko/FormUnggahBukti";
import { TombolCetakPesanan } from "@/components/admin/TombolCetakPesanan";
import { TombolSalin } from "@/components/TombolSalin";
import { IkonCek, IkonWhatsapp } from "@/components/ikon/Ikon";

interface HalamanPesananProps {
  params: Promise<{ kode: string }>;
  searchParams: Promise<{ baru?: string }>;
}

export default async function HalamanDetailPesanan({
  params,
  searchParams,
}: HalamanPesananProps) {
  const { kode } = await params;
  const { baru } = await searchParams;

  const [pesanan, sesi, aksesCookie, pengaturan] = await Promise.all([
    db.pesanan.findUnique({
      where: { kode },
      include: { item: true },
    }),
    bacaSesi(),
    punyaAksesPesanan(kode),
    ambilPengaturan(),
  ]);

  if (!pesanan) {
    notFound();
  }

  // Invarian #5: Pengecekan izin akses pesanan
  const adalahPemilik = sesi?.peran === "PEMILIK";
  const adalahStaf = sesi?.peran === "STAF_DAPUR";
  const adalahPemesanLogin =
    Boolean(sesi && sesi.telepon === pesanan.teleponPemesan);

  if (!aksesCookie && !adalahPemilik && !adalahStaf && !adalahPemesanLogin) {
    redirect(
      `/lacak?pesan=Silakan+masukkan+kode+pesanan+dan+nomor+telepon+untuk+melihat+rinciannya.`
    );
  }

  // Link WhatsApp pesan
  const pesanWa = `Halo ${pengaturan.namaUsaha}, saya ingin menanyakan pesanan dengan kode ${pesanan.kode} a.n. ${pesanan.namaPemesan}.`;
  const waUrl = pengaturan.whatsapp
    ? linkWhatsapp(pengaturan.whatsapp, pesanWa)
    : null;

  const tahapan = [
    { kunci: "BARU", nama: "Dipesan" },
    { kunci: "DIKONFIRMASI", nama: "Dikonfirmasi" },
    { kunci: "DIPROSES", nama: "Dimasak" },
    { kunci: "SIAP", nama: "Siap" },
    { kunci: "SELESAI", nama: "Selesai" },
  ];
  const indeksAktif = tahapan.findIndex((t) => t.kunci === pesanan.status);
  const dibatalkan = pesanan.status === "DIBATALKAN";
  const perluBayar = !dibatalkan && pesanan.statusBayar !== "LUNAS";
  const sisa = sisaTagihan(pesanan.total, pesanan.dibayar);
  const kekuranganDp = Math.max(0, pesanan.minimalDp - pesanan.dibayar);
  const rekeningAda = Boolean(pengaturan.namaBank && pengaturan.nomorRekening);

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 sm:py-12 space-y-5">
      {baru === "1" && (
        <div role="status" className="kotak-sukses flex items-start gap-3 anim-masuk">
          <IkonCek className="w-5 h-5 shrink-0 mt-0.5" strokeWidth={2.25} />
          <div>
            <p className="font-semibold">Pesanan terkirim</p>
            <p className="mt-0.5">
              Simpan kode di bawah. Dapur akan mengonfirmasi lewat WhatsApp.
            </p>
          </div>
        </div>
      )}

      {/* Kepala nota */}
      <header className="kartu kartu-isi">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="teks-redup">Kode pesanan</p>
            <div className="flex items-center gap-2 mt-1">
              <h1 className="text-2xl font-bold text-kayu font-mono tracking-tight">{pesanan.kode}</h1>
              <TombolSalin teks={pesanan.kode} label="Salin" ringkas />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <LencanaStatus status={pesanan.status} untukPelanggan />
            {!dibatalkan && <LencanaBayar statusBayar={pesanan.statusBayar} />}
          </div>
        </div>

        {dibatalkan ? (
          <div className="mt-5 kotak-galat">
            <p className="font-semibold">Pesanan dibatalkan</p>
            {pesanan.alasanBatal && <p className="mt-0.5">Alasan: {pesanan.alasanBatal}</p>}
          </div>
        ) : (
          <ol className="mt-6 grid grid-cols-5" aria-label="Progres pesanan">
            {tahapan.map((t, idx) => {
              const lewat = idx < indeksAktif || pesanan.status === "SELESAI";
              const sekarang = idx === indeksAktif && pesanan.status !== "SELESAI";
              return (
                <li
                  key={t.kunci}
                  aria-current={sekarang ? "step" : undefined}
                  className="relative flex flex-col items-center text-center"
                >
                  {idx > 0 && (
                    <span
                      aria-hidden="true"
                      className={`absolute top-3.5 right-1/2 w-full h-0.5 -z-0 ${
                        idx <= indeksAktif ? "bg-daun" : "bg-krem-gelap"
                      }`}
                    />
                  )}
                  <span
                    className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                      lewat
                        ? "bg-daun text-white"
                        : sekarang
                        ? "bg-bata text-white ring-4 ring-bata/15"
                        : "bg-white border border-krem-gelap text-kayu-sedang"
                    }`}
                  >
                    {lewat ? <IkonCek className="w-3.5 h-3.5" strokeWidth={3} /> : idx + 1}
                  </span>
                  <span
                    className={`mt-2 text-xs ${
                      sekarang ? "font-semibold text-kayu" : lewat ? "text-kayu" : "text-kayu-sedang"
                    }`}
                  >
                    {t.nama}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </header>

      {/* Pembayaran: satu-satunya hal yang perlu dilakukan pembeli, jadi di atas */}
      {perluBayar && (
        <section aria-labelledby="judul-bayar" className="kartu kartu-isi">
          <h2 id="judul-bayar" className="judul-bagian">
            {pesanan.caraBayar === "TRANSFER" ? "Bayar dengan transfer" : "Bayar tunai"}
          </h2>

          {pesanan.caraBayar === "TRANSFER" ? (
            rekeningAda ? (
              <>
                <div className="mt-4 rounded-xl bg-krem-tua/70 p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-kayu-sedang">{pengaturan.namaBank} a.n. {pengaturan.namaRekening}</p>
                    <p className="mt-0.5 text-lg font-semibold font-mono text-kayu">{pengaturan.nomorRekening}</p>
                  </div>
                  <TombolSalin teks={pengaturan.nomorRekening} label="Salin nomor" />
                </div>
                <dl className="mt-3 space-y-2 text-sm">
                  {pesanan.dibayar > 0 && (
                    <div className="flex items-center justify-between">
                      <dt className="text-kayu-sedang">Sudah diterima</dt>
                      <dd className="text-daun-tua angka-tabel">{rupiah(pesanan.dibayar)}</dd>
                    </div>
                  )}
                  {kekuranganDp > 0 && (
                    <div className="flex items-center justify-between">
                      <dt className="text-kayu-sedang">DP minimal</dt>
                      <dd className="flex items-center gap-2">
                        <span className="font-semibold text-kayu angka-tabel">{rupiah(kekuranganDp)}</span>
                        <TombolSalin teks={String(kekuranganDp)} label="Salin" ringkas />
                      </dd>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <dt className="text-kayu-sedang">{pesanan.dibayar > 0 ? "Sisa pelunasan" : kekuranganDp > 0 ? "Atau langsung lunas" : "Jumlah transfer"}</dt>
                    <dd className="flex items-center gap-2">
                      <span className="font-semibold text-kayu angka-tabel">{rupiah(sisa)}</span>
                      <TombolSalin teks={String(sisa)} label="Salin" ringkas />
                    </dd>
                  </div>
                </dl>
                <div className="mt-5 pt-5 border-t border-krem-gelap">
                  <FormUnggahBukti
                    kode={pesanan.kode}
                    buktiSaatIni={pesanan.buktiBayarUrl}
                    statusBayar={pesanan.statusBayar}
                  />
                </div>
              </>
            ) : (
              <p className="mt-3 teks-redup">
                Nomor rekening belum tersedia. Hubungi dapur lewat WhatsApp untuk cara pembayaran.
              </p>
            )
          ) : (
            <p className="mt-3 teks-redup">
              Siapkan {rupiah(sisa)} saat pesanan{" "}
              {pesanan.caraAmbil === "DIANTAR" ? "tiba di lokasimu" : "diambil di dapur"}.
            </p>
          )}

          {pesanan.statusBayar === "MENUNGGU_VERIFIKASI" && !pesanan.buktiBayarUrl && (
            <p className="mt-4 kotak-peringatan">Konfirmasimu sudah diterima. Dapur sedang mengecek transfer.</p>
          )}
        </section>
      )}

      {/* Jadwal */}
      <section aria-label="Jadwal" className="kartu kartu-isi grid gap-5 sm:grid-cols-2 text-sm">
        <div>
          <p className="text-kayu-sedang">Jadwal</p>
          <p className="mt-1 font-medium text-kayu">{tanggalPanjang(pesanan.tanggalAcara)}</p>
          <p className="text-kayu-sedang">Siap pukul {jamTampil(pesanan.jamAcara)} WIB</p>
        </div>
        <div>
          <p className="text-kayu-sedang">{LABEL_AMBIL[pesanan.caraAmbil]}</p>
          <p className="mt-1 font-medium text-kayu">
            {pesanan.caraAmbil === "DIANTAR" ? pesanan.alamatAntar : pengaturan.alamat || "Di dapur kami"}
          </p>
        </div>
        {pesanan.catatan && (
          <div className="sm:col-span-2">
            <p className="text-kayu-sedang">Catatan</p>
            <p className="mt-1 text-kayu whitespace-pre-line">{pesanan.catatan}</p>
          </div>
        )}
      </section>

      {/* Rincian */}
      <section aria-labelledby="judul-rincian" className="kartu kartu-isi">
        <h2 id="judul-rincian" className="judul-bagian">
          Rincian
        </h2>
        <ul className="mt-4 space-y-3 text-sm">
          {pesanan.item.map((it) => (
            <li key={it.id} className="flex justify-between gap-4">
              <span className="min-w-0">
                <span className="text-kayu">{it.namaMenu}</span>
                <span className="block text-xs text-kayu-sedang angka-tabel">
                  {it.jumlah} {it.satuan} × {rupiah(it.hargaSatuan)}
                </span>
              </span>
              <span className="text-kayu angka-tabel shrink-0">{rupiah(it.subtotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 pt-4 border-t border-krem-gelap space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-kayu-sedang">Subtotal</dt>
            <dd className="angka-tabel">{rupiah(pesanan.subtotal)}</dd>
          </div>
          {pesanan.diskon > 0 && (
            <div className="flex justify-between text-daun-tua">
              <dt>Voucher{pesanan.kodeVoucher ? ` ${pesanan.kodeVoucher}` : ""}</dt>
              <dd className="angka-tabel">−{rupiah(pesanan.diskon)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-kayu-sedang">Ongkir</dt>
            <dd className="angka-tabel">
              {pesanan.caraAmbil === "AMBIL_SENDIRI" ? "—" : pesanan.ongkir === 0 ? "Gratis" : rupiah(pesanan.ongkir)}
            </dd>
          </div>
          <div className="flex justify-between items-baseline pt-3 border-t border-krem-gelap">
            <dt className="font-semibold text-kayu">Total · {LABEL_BAYAR[pesanan.caraBayar]}</dt>
            <dd className="text-lg font-bold text-kayu angka-tabel">{rupiah(pesanan.total)}</dd>
          </div>
          {pesanan.dibayar > 0 && !dibatalkan && (
            <div className="flex justify-between text-kayu-sedang">
              <dt>Sudah dibayar</dt>
              <dd className="angka-tabel">{rupiah(pesanan.dibayar)}</dd>
            </div>
          )}
        </dl>
      </section>

      <div className="flex flex-col sm:flex-row gap-3">
        {waUrl && (
          <a href={waUrl} target="_blank" rel="noopener noreferrer" className="tombol-kedua flex-1">
            <IkonWhatsapp className="w-4 h-4 text-daun" />
            Tanya dapur
          </a>
        )}
        {(adalahPemilik || adalahStaf) && <TombolCetakPesanan ringkas kode={pesanan.kode} />}
        <Link href="/pesan" className="tombol-hantu flex-1">
          Buat pesanan lain
        </Link>
      </div>
    </div>
  );
}
