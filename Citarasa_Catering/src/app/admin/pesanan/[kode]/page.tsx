import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { bacaSesi } from "@/lib/auth";
import { ambilPengaturan } from "@/lib/pengaturan";
import { jam, jamTampil, rupiah, tanggalPanjang, tanggalPendek, teleponTampil } from "@/lib/format";
import { LABEL_AMBIL, LABEL_BAYAR, LABEL_SUMBER } from "@/lib/pesanan";
import { LABEL_JENIS_BAYAR, saranJumlahBayar, sisaTagihan } from "@/lib/pembayaran";
import { usahaUntukWa } from "@/lib/template-wa";
import { LencanaBayar, LencanaStatus } from "@/components/Lencana";
import { AksiPesanan } from "@/components/admin/AksiPesanan";
import { CatatPembayaran } from "@/components/admin/CatatPembayaran";
import { MenuWa } from "@/components/admin/MenuWa";
import { IkonCetak, IkonLampiran, IkonLokasi, IkonPanahKiri } from "@/components/ikon/Ikon";

export async function generateMetadata({ params }: { params: Promise<{ kode: string }> }): Promise<Metadata> {
  const { kode } = await params;
  return { title: kode };
}

interface HalamanDetailProps {
  params: Promise<{ kode: string }>;
  searchParams: Promise<{ baru?: string; diubah?: string }>;
}

export default async function HalamanDetailPesananAdmin({ params, searchParams }: HalamanDetailProps) {
  const [{ kode }, q, sesi, pengaturan] = await Promise.all([params, searchParams, bacaSesi(), ambilPengaturan()]);
  const adalahPemilik = sesi?.peran === "PEMILIK";

  const p = await db.pesanan.findUnique({
    where: { kode },
    include: {
      item: { orderBy: { id: "asc" } },
      pembayaran: { orderBy: { dibuatPada: "asc" }, include: { dicatatOleh: { select: { nama: true } } } },
      riwayat: { orderBy: { dibuatPada: "desc" }, take: 30, include: { oleh: { select: { nama: true } } } },
    },
  });
  if (!p) notFound();

  const sisa = sisaTagihan(p.total, p.dibayar);
  const bisaDiubah = adalahPemilik && (p.status === "BARU" || p.status === "DIKONFIRMASI");
  const dibatalkan = p.status === "DIBATALKAN";

  return (
    <div>
      <Link href="/admin/pesanan" className="inline-flex items-center gap-1.5 text-sm text-kayu-sedang hover:text-kayu">
        <IkonPanahKiri className="w-4 h-4" /> Semua pesanan
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-sm text-kayu-sedang">{p.kode}</p>
          <h1 className="judul-halaman mt-0.5 break-words">{p.namaPemesan}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <LencanaStatus status={p.status} />
            <LencanaBayar statusBayar={p.statusBayar} />
          </div>
          <p className="mt-1.5 text-sm text-kayu-sedang">
            Lewat {LABEL_SUMBER[p.sumber]} · dibuat {tanggalPendek(p.dibuatPada)} {jam(p.dibuatPada)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <MenuWa
            pesanan={{ ...p, item: p.item, status: p.status }}
            usaha={usahaUntukWa(pengaturan)}
          />
          <Link href={`/admin/pesanan/${p.kode}/cetak`} target="_blank" className="tombol-kedua">
            <IkonCetak className="w-4 h-4" /> Cetak
          </Link>
          {bisaDiubah && (
            <Link href={`/admin/pesanan/${p.kode}/ubah`} className="tombol-kedua">
              Ubah
            </Link>
          )}
        </div>
      </header>

      {q.baru === "1" && <p role="status" className="kotak-sukses mt-5">Pesanan tersimpan dan sudah muncul di papan dapur.</p>}
      {q.diubah === "1" && <p role="status" className="kotak-sukses mt-5">Perubahan tersimpan. Total & kuota sudah dihitung ulang.</p>}
      {dibatalkan && p.alasanBatal && <p className="kotak-galat mt-5">Dibatalkan: {p.alasanBatal}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
        <div className="space-y-6 min-w-0">
          <section aria-labelledby="judul-jadwal" className="kartu kartu-isi grid gap-5 sm:grid-cols-2 text-sm">
            <h2 id="judul-jadwal" className="sr-only">Jadwal</h2>
            <div>
              <p className="text-kayu-sedang">Acara</p>
              <p className="mt-1 font-medium text-kayu">{tanggalPanjang(p.tanggalAcara)}</p>
              <p className="text-kayu-sedang">Siap pukul {jamTampil(p.jamAcara)} WIB</p>
            </div>
            <div>
              <p className="text-kayu-sedang">{LABEL_AMBIL[p.caraAmbil]}</p>
              <p className="mt-1 font-medium text-kayu break-words">{p.caraAmbil === "DIANTAR" ? p.alamatAntar : "Diambil di dapur"}</p>
              {p.latitude != null && p.longitude != null && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-bata hover:underline"
                >
                  <IkonLokasi className="w-4 h-4" /> Buka titik antar
                </a>
              )}
            </div>
            <div>
              <p className="text-kayu-sedang">Kontak</p>
              <p className="mt-1 font-medium text-kayu">{teleponTampil(p.teleponPemesan)}</p>
            </div>
            {p.catatan && (
              <div>
                <p className="text-kayu-sedang">Catatan</p>
                <p className="mt-1 text-kayu whitespace-pre-line break-words">{p.catatan}</p>
              </div>
            )}
          </section>

          <section aria-labelledby="judul-rincian" className="kartu kartu-isi">
            <h2 id="judul-rincian" className="judul-bagian">Rincian</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {p.item.map((it) => (
                <li key={it.id} className="flex justify-between gap-4">
                  <span className="min-w-0">
                    <span className="text-kayu">{it.namaMenu}</span>
                    <span className="block text-xs text-kayu-sedang angka-tabel">
                      {it.jumlah} {it.satuan} × {rupiah(it.hargaSatuan)}
                    </span>
                  </span>
                  <span className="angka-tabel shrink-0">{rupiah(it.subtotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 pt-4 border-t border-krem-gelap space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-kayu-sedang">Subtotal</dt><dd className="angka-tabel">{rupiah(p.subtotal)}</dd></div>
              {p.diskon > 0 && (
                <div className="flex justify-between text-daun-tua"><dt>Voucher {p.kodeVoucher}</dt><dd className="angka-tabel">−{rupiah(p.diskon)}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-kayu-sedang">Ongkir</dt><dd className="angka-tabel">{p.ongkir ? rupiah(p.ongkir) : "—"}</dd></div>
              <div className="flex justify-between items-baseline pt-2 border-t border-krem-gelap">
                <dt className="font-semibold">Total · {LABEL_BAYAR[p.caraBayar]}</dt>
                <dd className="text-lg font-bold angka-tabel">{rupiah(p.total)}</dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="judul-riwayat" className="kartu kartu-isi">
            <h2 id="judul-riwayat" className="judul-bagian">Riwayat</h2>
            <ol className="mt-4 space-y-4 border-l border-krem-gelap pl-5">
              {p.riwayat.map((r) => (
                <li key={r.id} className="relative text-sm">
                  <span aria-hidden="true" className="absolute -left-[25px] top-1.5 w-2 h-2 rounded-full bg-kayu-sedang" />
                  <p className="text-kayu break-words">{r.catatan ?? r.ke}</p>
                  <p className="text-xs text-kayu-sedang">
                    {tanggalPendek(r.dibuatPada)} {jam(r.dibuatPada)}
                    {r.oleh && ` · ${r.oleh.nama}`}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="space-y-6 lg:sticky lg:top-8">
          {!dibatalkan && p.status !== "SELESAI" && (
            <section aria-labelledby="judul-status" className="kartu kartu-isi">
              <h2 id="judul-status" className="judul-bagian mb-4">Tindakan dapur</h2>
              <AksiPesanan kode={p.kode} status={p.status} statusBayar={p.statusBayar} total={p.total} sisa={sisa} adalahPemilik={adalahPemilik} />
            </section>
          )}

          <section aria-labelledby="judul-bayar" className="kartu kartu-isi">
            <h2 id="judul-bayar" className="judul-bagian">Pembayaran</h2>
            <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div><dt className="text-kayu-sedang">Total</dt><dd className="font-semibold angka-tabel">{rupiah(p.total)}</dd></div>
              <div><dt className="text-kayu-sedang">Diterima</dt><dd className="font-semibold text-daun-tua angka-tabel">{rupiah(p.dibayar)}</dd></div>
              <div><dt className="text-kayu-sedang">Sisa</dt><dd className={`font-semibold angka-tabel ${sisa ? "text-bahaya" : ""}`}>{rupiah(sisa)}</dd></div>
            </dl>
            {p.minimalDp > 0 && p.dibayar < p.minimalDp && (
              <p className="mt-2 text-xs text-kayu-sedang">DP minimal {rupiah(p.minimalDp)}</p>
            )}

            {p.buktiBayarUrl && (
              <a href={p.buktiBayarUrl} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center gap-3 rounded-xl border border-kunyit/30 bg-kunyit-lembut p-3 text-sm text-kunyit-tua">
                {/* img biasa: berkas dilayani route berizin */}
                <img src={p.buktiBayarUrl} alt="Bukti transfer menunggu dicek" className="w-12 h-12 rounded-lg object-cover" />
                <span>Bukti transfer baru menunggu dicek. Ketuk untuk melihat.</span>
              </a>
            )}

            {p.pembayaran.length > 0 && (
              <ul className="mt-4 divide-y divide-krem-gelap border-y border-krem-gelap text-sm">
                {p.pembayaran.map((b) => (
                  <li key={b.id} className="py-2.5 flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="text-kayu">{LABEL_JENIS_BAYAR[b.jenis]}</span>
                      <span className="block text-xs text-kayu-sedang">
                        {tanggalPendek(b.dibuatPada)} · {b.metode === "TUNAI" ? "Tunai" : "Transfer"}
                        {b.dicatatOleh && ` · ${b.dicatatOleh.nama}`}
                      </span>
                      {b.buktiUrl && (
                        <a href={b.buktiUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-bata hover:underline">
                          <IkonLampiran className="w-3.5 h-3.5" /> Bukti
                        </a>
                      )}
                    </span>
                    <span className={`angka-tabel shrink-0 ${b.jenis === "REFUND" ? "text-bahaya" : "text-daun-tua"}`}>
                      {b.jenis === "REFUND" ? "−" : "+"}
                      {rupiah(b.jumlah)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {adalahPemilik && !dibatalkan && sisa > 0 && (
              <div className="mt-5">
                <CatatPembayaran
                  kode={p.kode}
                  saran={saranJumlahBayar(p)}
                  maks={sisa}
                  metodeAwal={p.caraBayar}
                />
              </div>
            )}
            {adalahPemilik && dibatalkan && p.dibayar > 0 && (
              <div className="mt-5">
                <p className="kotak-peringatan mb-3">Pesanan batal tetapi masih ada uang diterima. Catat pengembaliannya.</p>
                <CatatPembayaran kode={p.kode} saran={p.dibayar} maks={p.dibayar} metodeAwal={p.caraBayar} refund />
              </div>
            )}
            {!adalahPemilik && sisa > 0 && <p className="mt-4 teks-redup">Pembayaran dicatat oleh pemilik.</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
