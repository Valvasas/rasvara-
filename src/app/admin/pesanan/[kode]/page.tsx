import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { ambilPengaturan } from "@/lib/pengaturan";
import { Lencana } from "@/components/Lencana";
import { AksiPesanan } from "@/components/admin/AksiPesanan";
import { PesanWhatsapp } from "@/components/admin/PesanWhatsapp";
import { INFO_BAYAR, INFO_STATUS, LABEL_AMBIL, LABEL_BAYAR } from "@/lib/pesanan";
import {
  jam,
  jamTampil,
  labelHari,
  rupiah,
  tanggalPanjang,
  tanggalPendek,
  teleponTampil,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Rincian Pesanan" };

export default async function RincianPesananAdmin({
  params,
}: {
  params: Promise<{ kode: string }>;
}) {
  const { kode } = await params;

  const [pesanan, pengaturan] = await Promise.all([
    db.pesanan.findUnique({
      where: { kode: kode.toUpperCase() },
      include: {
        item: true,
        kas: true,
        riwayat: { orderBy: { dibuatPada: "asc" }, include: { oleh: true } },
      },
    }),
    ambilPengaturan(),
  ]);

  if (!pesanan) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="tanpa-cetak">
        <Link
          href="/admin/pesanan"
          className="text-[0.95rem] text-arang-muda hover:text-bata"
        >
          &larr; Kembali ke papan pesanan
        </Link>
      </div>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-judul text-3xl tracking-wide text-bata">
            {pesanan.kode}
          </p>
          <h1 className="mt-1 text-2xl">{pesanan.namaPemesan}</h1>
          <p className="text-arang-muda">
            {teleponTampil(pesanan.teleponPemesan)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Lencana kelas={INFO_STATUS[pesanan.status].kelas}>
            {INFO_STATUS[pesanan.status].label}
          </Lencana>
          <Lencana kelas={INFO_BAYAR[pesanan.statusBayar].kelas}>
            {INFO_BAYAR[pesanan.statusBayar].label}
          </Lencana>
        </div>
      </header>

      <p className="mt-3 rounded-xl bg-krem-tua px-4 py-3 text-[0.95rem]">
        {INFO_STATUS[pesanan.status].penjelasan}
        {pesanan.alasanBatal ? ` Alasan: ${pesanan.alasanBatal}` : ""}
      </p>

      {/* ---- Aksi ---- */}
      <section className="kartu tanpa-cetak mt-6 p-5" aria-labelledby="judul-aksi">
        <h2 id="judul-aksi" className="font-judul text-xl">
          Tindakan
        </h2>
        <div className="mt-4">
          <AksiPesanan
            id={pesanan.id}
            status={pesanan.status}
            statusBayar={pesanan.statusBayar}
            total={pesanan.total}
          />
        </div>
      </section>

      {/* ---- Pesan WhatsApp siap kirim ---- */}
      <PesanWhatsapp
        telepon={pesanan.teleponPemesan}
        nama={pesanan.namaPemesan}
        kode={pesanan.kode}
        total={pesanan.total}
        status={pesanan.status}
        statusBayar={pesanan.statusBayar}
        tanggal={tanggalPanjang(pesanan.tanggalAcara)}
        jam={jamTampil(pesanan.jamAcara)}
        namaUsaha={pengaturan.namaUsaha}
        namaBank={pengaturan.namaBank}
        nomorRekening={pengaturan.nomorRekening}
        namaRekening={pengaturan.namaRekening}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        {/* ---- Rincian ---- */}
        <section className="kartu overflow-hidden lg:col-span-7" aria-labelledby="judul-isi">
          <h2
            id="judul-isi"
            className="border-b border-krem-tua px-5 py-4 font-judul text-xl"
          >
            Isi pesanan
          </h2>

          <ul className="divide-y divide-krem-tua px-5">
            {pesanan.item.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 py-3">
                <div>
                  <p className="font-semibold">{item.namaMenu}</p>
                  <p className="text-[0.9rem] text-arang-muda">
                    {item.jumlah} {item.satuan} &times; {rupiah(item.hargaSatuan)}
                  </p>
                  {item.catatan ? (
                    <p className="text-[0.88rem] text-kunyit-tua">{item.catatan}</p>
                  ) : null}
                </div>
                <p className="shrink-0 font-semibold">{rupiah(item.subtotal)}</p>
              </li>
            ))}
          </ul>

          <dl className="space-y-2 border-t border-krem-tua px-5 py-4">
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
            {pesanan.statusBayar === "LUNAS" ? (
              <div className="flex justify-between text-daun-tua">
                <dt>Sudah dibayar</dt>
                <dd className="font-semibold">{rupiah(pesanan.dibayar)}</dd>
              </div>
            ) : null}
          </dl>

          {pesanan.catatan ? (
            <div className="border-t border-krem-tua bg-kunyit-lembut px-5 py-4">
              <p className="label-kolom text-kunyit-tua">Catatan pemesan</p>
              <p className="mt-1 text-kunyit-tua">{pesanan.catatan}</p>
            </div>
          ) : null}
        </section>

        <div className="space-y-6 lg:col-span-5">
          {/* ---- Pengantaran ---- */}
          <section className="kartu p-5" aria-labelledby="judul-kirim">
            <h2 id="judul-kirim" className="font-judul text-xl">
              Waktu &amp; pengantaran
            </h2>

            <dl className="mt-4 space-y-3">
              <div>
                <dt className="label-kolom">Dibutuhkan</dt>
                <dd className="font-semibold">
                  {tanggalPanjang(pesanan.tanggalAcara)}
                </dd>
                <dd className="text-arang-muda">
                  Pukul {jamTampil(pesanan.jamAcara)} &middot;{" "}
                  {labelHari(pesanan.tanggalAcara)}
                </dd>
              </div>

              <div>
                <dt className="label-kolom">Cara terima</dt>
                <dd className="font-semibold">{LABEL_AMBIL[pesanan.caraAmbil]}</dd>
                {pesanan.alamatAntar ? (
                  <dd className="text-arang-muda">{pesanan.alamatAntar}</dd>
                ) : null}
              </div>

              <div>
                <dt className="label-kolom">Pembayaran</dt>
                <dd className="font-semibold">{LABEL_BAYAR[pesanan.caraBayar]}</dd>
                {pesanan.kas ? (
                  <dd className="text-arang-muda">
                    Tercatat di buku kas {tanggalPendek(pesanan.kas.tanggal)}
                  </dd>
                ) : null}
              </div>
            </dl>
          </section>

          {/* ---- Jejak perubahan ---- */}
          <section className="kartu p-5" aria-labelledby="judul-jejak">
            <h2 id="judul-jejak" className="font-judul text-xl">
              Jejak pesanan
            </h2>
            <ol className="mt-4 space-y-3">
              {pesanan.riwayat.map((r) => (
                <li key={r.id} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-kayu"
                  />
                  <div>
                    <p className="font-medium">{INFO_STATUS[r.ke].label}</p>
                    <p className="text-[0.88rem] text-arang-muda">
                      {tanggalPendek(r.dibuatPada)} pukul {jam(r.dibuatPada)}
                      {r.oleh ? ` · oleh ${r.oleh.nama}` : ""}
                    </p>
                    {r.catatan ? (
                      <p className="text-[0.88rem] text-arang-muda">{r.catatan}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
