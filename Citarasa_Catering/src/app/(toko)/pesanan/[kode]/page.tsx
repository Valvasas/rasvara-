import type { Metadata } from "next";
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
import { FormUnggahBukti } from "@/components/toko/FormUnggahBukti";
import { TombolCetakPesanan } from "@/components/admin/TombolCetakPesanan";
import { TombolSalin } from "@/components/TombolSalin";
import { IkonCek, IkonWhatsapp } from "@/components/ikon/Ikon";
import { IlustrasiRantang } from "@/components/ilustrasi/Ilustrasi";
import type { StatusPesanan } from "@/generated/prisma/client";

/** Apa yang sedang terjadi, ditulis dari sudut pandang pembeli. */
const LANGKAH_PELANGGAN: Record<StatusPesanan, (diantar: boolean) => string> = {
  BARU: () => "dapur akan mengecek pesananmu dan mengonfirmasi lewat WhatsApp.",
  DIKONFIRMASI: () => "pesanan sudah diterima dan masuk jadwal masak dapur.",
  DIPROSES: () => "masakanmu sedang disiapkan di dapur.",
  SIAP: (diantar) => (diantar ? "pesanan sudah siap dan segera diantar." : "pesanan sudah siap diambil di dapur."),
  SELESAI: () => "pesanan sudah diterima. Terima kasih, selamat menikmati!",
  DIBATALKAN: () => "pesanan ini dibatalkan.",
};

interface HalamanPesananProps {
  params: Promise<{ kode: string }>;
  searchParams: Promise<{ baru?: string }>;
}

/**
 * Halaman ini memuat nama, telepon, dan alamat pemesan, jadi tidak boleh masuk
 * indeks mesin pencari walau aksesnya sudah dijaga cookie. Kode di judul
 * membantu pembeli yang membuka beberapa pesanan di tab berbeda.
 */
export async function generateMetadata({ params }: HalamanPesananProps): Promise<Metadata> {
  const { kode } = await params;
  return { title: `Pesanan ${kode.slice(0, 40)}`, robots: { index: false, follow: false } };
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

  // `pendek` dipakai di bawah 640px: di layar 320px kolom tiap tahap hanya
  // ±49px, sehingga "Dikonfirmasi" menempel dengan label di sebelahnya.
  const tahapan = [
    { kunci: "BARU", nama: "Dipesan", pendek: "Dipesan" },
    { kunci: "DIKONFIRMASI", nama: "Dikonfirmasi", pendek: "Diterima" },
    { kunci: "DIPROSES", nama: "Dimasak", pendek: "Dimasak" },
    { kunci: "SIAP", nama: "Siap", pendek: "Siap" },
    { kunci: "SELESAI", nama: "Selesai", pendek: "Selesai" },
  ];
  const indeksAktif = tahapan.findIndex((t) => t.kunci === pesanan.status);
  const dibatalkan = pesanan.status === "DIBATALKAN";
  const perluBayar = !dibatalkan && pesanan.statusBayar !== "LUNAS";
  const rekeningAda = Boolean(pengaturan.namaBank && pengaturan.nomorRekening);

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 sm:py-12 space-y-5">
      {baru === "1" && (
        <div
          role="status"
          className="relative overflow-hidden rounded-2xl border border-daun/20 bg-daun-lembut latar-kawung px-5 py-5 sm:px-6 flex items-center gap-4 sm:gap-5 anim-masuk"
        >
          <div className="relative shrink-0">
            <IlustrasiRantang className="w-20 sm:w-24" />
            <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-daun text-white flex items-center justify-center ring-4 ring-daun-lembut">
              <IkonCek className="w-4 h-4" strokeWidth={3} />
            </span>
          </div>
          <div className="text-daun-tua">
            <p className="font-tampil text-xl font-bold">Pesanan terkirim!</p>
            <p className="mt-1 text-sm">
              Simpan kode di bawah. Dapur akan mengonfirmasi lewat WhatsApp
              {perluBayar && rekeningAda && pesanan.caraBayar === "TRANSFER" ? ", dan kamu bisa langsung mengirim bukti transfer." : "."}
            </p>
          </div>
        </div>
      )}

      {/* Kepala nota */}
      <header className="kartu kartu-isi">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="teks-redup">Kode pesanan</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <h1 className="text-xl sm:text-2xl font-bold text-kayu font-mono tracking-tight whitespace-nowrap">{pesanan.kode}</h1>
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
                    className={`mt-2 text-[11px] sm:text-xs leading-tight ${
                      sekarang ? "font-semibold text-kayu" : lewat ? "text-kayu" : "text-kayu-sedang"
                    }`}
                  >
                    <span className="sm:hidden">{t.pendek}</span>
                    <span className="hidden sm:inline">{t.nama}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        {!dibatalkan && (
          <p className="mt-5 rounded-xl bg-krem-tua/70 px-4 py-3 text-sm text-kayu">
            <span className="font-semibold">Sekarang: </span>
            {LANGKAH_PELANGGAN[pesanan.status](pesanan.caraAmbil === "DIANTAR")}
          </p>
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
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-kayu-sedang">Jumlah transfer</span>
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-kayu angka-tabel">{rupiah(pesanan.total)}</span>
                    <TombolSalin teks={String(pesanan.total)} label="Salin" ringkas />
                  </span>
                </div>
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
              Siapkan {rupiah(pesanan.total)} saat pesanan{" "}
              {pesanan.caraAmbil === "DIANTAR" ? "tiba di lokasimu" : "diambil di dapur"}.
            </p>
          )}

          {pesanan.statusBayar === "MENUNGGU_VERIFIKASI" && !pesanan.buktiBayarUrl && (
            <p className="mt-4 kotak-peringatan">Konfirmasimu sudah diterima. Dapur sedang mengecek transfer.</p>
          )}
        </section>
      )}

      {/* Jadwal */}
      <section aria-label="Jadwal" className="kartu kartu-isi grid grid-cols-1 gap-5 sm:grid-cols-2 text-sm">
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
