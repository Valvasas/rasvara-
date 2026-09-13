import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { bacaSesi } from "@/lib/auth";
import { punyaAksesPesanan } from "@/lib/akses-pesanan";
import { ambilPengaturan } from "@/lib/pengaturan";
import { JejakStatus } from "@/components/toko/JejakStatus";
import { TombolSudahTransfer } from "@/components/toko/TombolSudahTransfer";
import { Lencana } from "@/components/Lencana";
import { INFO_BAYAR, LABEL_AMBIL, LABEL_BAYAR } from "@/lib/pesanan";
import {
  jamTampil,
  labelHari,
  linkWhatsapp,
  namaPanggilan,
  rupiah,
  tanggalPanjang,
  teleponTampil,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pesanan Anda",
  robots: { index: false, follow: false },
};

export default async function HalamanPesanan({
  params,
}: {
  params: Promise<{ kode: string }>;
}) {
  const { kode } = await params;

  const [pesanan, pengaturan, sesi] = await Promise.all([
    db.pesanan.findUnique({
      where: { kode: kode.toUpperCase() },
      include: { item: true },
    }),
    ambilPengaturan(),
    bacaSesi(),
  ]);

  if (!pesanan) notFound();

  const berhak =
    (await punyaAksesPesanan(pesanan.kode)) ||
    sesi?.peran === "PEMILIK" ||
    (sesi != null && pesanan.penggunaId === sesi.id);

  if (!berhak) redirect(`/lacak?kode=${encodeURIComponent(pesanan.kode)}`);

  const perluTransfer =
    pesanan.caraBayar === "TRANSFER" &&
    pesanan.statusBayar === "BELUM_BAYAR" &&
    pesanan.status !== "DIBATALKAN";

  const pesanWa =
    `Halo Citarasa Catering, saya mau tanya soal pesanan ${pesanan.kode} ` +
    `atas nama ${pesanan.namaPemesan}.`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="tanpa-cetak">
        <Link href="/" className="text-[0.95rem] text-arang-muda hover:text-bata">
          &larr; Kembali ke beranda
        </Link>
      </div>

      {/* ---- Kepala nota ---- */}
      <header className="kartu mt-4 overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-dashed border-krem-tua px-6 py-5">
          <div>
            <p className="label-kolom">Kode pesanan</p>
            <p className="font-judul text-3xl tracking-wide text-bata">
              {pesanan.kode}
            </p>
            <p className="mt-1 text-[0.9rem] text-arang-muda">
              Simpan kode ini untuk mengecek pesanan Anda kapan saja.
            </p>
          </div>

          <Lencana kelas={INFO_BAYAR[pesanan.statusBayar].kelas}>
            {INFO_BAYAR[pesanan.statusBayar].label}
          </Lencana>
        </div>

        <div className="px-6 py-6">
          <h1 className="font-judul text-2xl">
            Terima kasih, {namaPanggilan(pesanan.namaPemesan)}.
          </h1>
          <p className="mt-1 text-arang-muda">
            {pesanan.status === "BARU"
              ? "Pesanan Anda sudah masuk. Kami periksa dulu ketersediaannya, lalu mengabari Anda lewat WhatsApp."
              : pesanan.status === "DIBATALKAN"
                ? "Pesanan ini sudah dibatalkan."
                : "Berikut perkembangan pesanan Anda."}
          </p>

          <div className="mt-6">
            <JejakStatus status={pesanan.status} />
          </div>
        </div>
      </header>

      {/* ---- Pembayaran ---- */}
      {perluTransfer && pengaturan.nomorRekening ? (
        <section
          className="kartu tanpa-cetak mt-6 border-kunyit/40 bg-kunyit-lembut p-6"
          aria-labelledby="judul-bayar"
        >
          <h2 id="judul-bayar" className="font-judul text-xl text-kunyit-tua">
            Cara membayar
          </h2>
          <p className="mt-1 text-[0.95rem] text-kunyit-tua">
            Transfer sejumlah total di bawah ini, lalu tekan tombol
            &ldquo;Saya Sudah Transfer&rdquo;. Kami akan memeriksanya.
          </p>

          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-kertas px-4 py-3">
              <dt className="label-kolom">Bank</dt>
              <dd className="font-semibold">{pengaturan.namaBank}</dd>
            </div>
            <div className="rounded-xl bg-kertas px-4 py-3">
              <dt className="label-kolom">Nomor rekening</dt>
              <dd className="font-judul text-lg tracking-wide">
                {pengaturan.nomorRekening}
              </dd>
            </div>
            <div className="rounded-xl bg-kertas px-4 py-3">
              <dt className="label-kolom">Atas nama</dt>
              <dd className="font-semibold">{pengaturan.namaRekening}</dd>
            </div>
          </dl>

          <p className="mt-4 font-judul text-2xl text-kunyit-tua">
            Jumlah transfer: {rupiah(pesanan.total)}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <TombolSudahTransfer kode={pesanan.kode} />
            {pengaturan.whatsapp ? (
              <a
                href={linkWhatsapp(
                  pengaturan.whatsapp,
                  `${pesanWa} Saya mau kirim bukti transfernya.`
                )}
                className="tombol tombol-kedua"
              >
                Kirim Bukti lewat WhatsApp
              </a>
            ) : null}
          </div>
        </section>
      ) : null}

      {pesanan.statusBayar === "MENUNGGU_VERIFIKASI" ? (
        <p className="kartu tanpa-cetak mt-6 border-kunyit/40 bg-kunyit-lembut px-6 py-4 text-kunyit-tua">
          Pembayaran Anda sedang kami periksa. Kami kabari lewat WhatsApp begitu
          selesai dicek.
        </p>
      ) : null}

      {pesanan.caraBayar === "TUNAI" && pesanan.statusBayar !== "LUNAS" ? (
        <p className="kartu tanpa-cetak mt-6 px-6 py-4 text-arang-muda">
          Pesanan ini dibayar tunai saat diterima. Siapkan{" "}
          <span className="font-semibold text-arang">{rupiah(pesanan.total)}</span>{" "}
          ya.
        </p>
      ) : null}

      {/* ---- Rincian ---- */}
      <section className="kartu mt-6 overflow-hidden" aria-labelledby="judul-rincian">
        <h2
          id="judul-rincian"
          className="border-b border-krem-tua px-6 py-4 font-judul text-xl"
        >
          Rincian pesanan
        </h2>

        <ul className="divide-y divide-krem-tua px-6">
          {pesanan.item.map((item) => (
            <li key={item.id} className="flex justify-between gap-4 py-4">
              <div>
                <p className="font-semibold">{item.namaMenu}</p>
                <p className="text-[0.9rem] text-arang-muda">
                  {item.jumlah} {item.satuan} &times; {rupiah(item.hargaSatuan)}
                </p>
              </div>
              <p className="shrink-0 font-semibold">{rupiah(item.subtotal)}</p>
            </li>
          ))}
        </ul>

        <dl className="space-y-2 border-t border-krem-tua px-6 py-4">
          <div className="flex justify-between">
            <dt className="text-arang-muda">Subtotal</dt>
            <dd>{rupiah(pesanan.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-arang-muda">Ongkos antar</dt>
            <dd>{pesanan.ongkir === 0 ? "Gratis" : rupiah(pesanan.ongkir)}</dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-krem-tua pt-3">
            <dt className="font-semibold">Total</dt>
            <dd className="font-judul text-2xl text-bata">
              {rupiah(pesanan.total)}
            </dd>
          </div>
        </dl>
      </section>

      {/* ---- Waktu & pengantaran ---- */}
      <section className="kartu mt-6 p-6" aria-labelledby="judul-antar">
        <h2 id="judul-antar" className="font-judul text-xl">
          Waktu &amp; pengantaran
        </h2>

        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="label-kolom">Dibutuhkan</dt>
            <dd className="mt-1 font-semibold">
              {tanggalPanjang(pesanan.tanggalAcara)}
            </dd>
            <dd className="text-arang-muda">
              Pukul {jamTampil(pesanan.jamAcara)} WIB &middot;{" "}
              {labelHari(pesanan.tanggalAcara)}
            </dd>
          </div>

          <div>
            <dt className="label-kolom">Cara terima</dt>
            <dd className="mt-1 font-semibold">{LABEL_AMBIL[pesanan.caraAmbil]}</dd>
            {pesanan.alamatAntar ? (
              <dd className="text-arang-muda">{pesanan.alamatAntar}</dd>
            ) : pengaturan.alamat ? (
              <dd className="text-arang-muda">Di {pengaturan.alamat}</dd>
            ) : null}
          </div>

          <div>
            <dt className="label-kolom">Pemesan</dt>
            <dd className="mt-1 font-semibold">{pesanan.namaPemesan}</dd>
            <dd className="text-arang-muda">
              {teleponTampil(pesanan.teleponPemesan)}
            </dd>
          </div>

          <div>
            <dt className="label-kolom">Pembayaran</dt>
            <dd className="mt-1 font-semibold">{LABEL_BAYAR[pesanan.caraBayar]}</dd>
            <dd className="text-arang-muda">
              {INFO_BAYAR[pesanan.statusBayar].label}
            </dd>
          </div>
        </dl>

        {pesanan.catatan ? (
          <div className="mt-5 rounded-xl bg-krem px-4 py-3">
            <p className="label-kolom">Catatan untuk dapur</p>
            <p className="mt-1">{pesanan.catatan}</p>
          </div>
        ) : null}
      </section>

      <div className="tanpa-cetak mt-8 flex flex-wrap gap-3">
        {pengaturan.whatsapp ? (
          <a
            href={linkWhatsapp(pengaturan.whatsapp, pesanWa)}
            className="tombol tombol-utama"
          >
            Hubungi Kami lewat WhatsApp
          </a>
        ) : null}
        <Link href="/pesan" className="tombol tombol-kedua">
          Buat Pesanan Lagi
        </Link>
      </div>
    </div>
  );
}
