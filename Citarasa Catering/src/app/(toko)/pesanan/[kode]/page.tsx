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
import { IkonCek } from "@/components/ikon/Ikon";

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
      include: {
        item: true,
        riwayat: { orderBy: { dibuatPada: "desc" } },
      },
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

  // Alur tahapan dapur
  const tahapan = [
    { kunci: "BARU", nama: "Diterima" },
    { kunci: "DIKONFIRMASI", nama: "Dikonfirmasi" },
    { kunci: "DIPROSES", nama: "Dimasak" },
    { kunci: "SIAP", nama: "Siap Saji" },
    { kunci: "SELESAI", nama: "Selesai" },
  ];

  const indeksAktif = tahapan.findIndex((t) => t.kunci === pesanan.status);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
      {/* Sambutan pesanan baru berhasil dibuat */}
      {baru === "1" && (
        <div className="anim-masuk bg-daun-lembut border border-daun/30 rounded-2xl p-4 flex items-center gap-4">
          <img
            src="/ilustrasi/pesanan-berhasil.png"
            alt=""
            aria-hidden="true"
            width={126}
            height={150}
            className="h-16 w-auto shrink-0"
          />
          <div>
            <p className="font-bold text-sm text-daun-tua">Pesanan berhasil dibuat!</p>
            <p className="text-xs text-daun-tua/80 mt-0.5">
              Simpan kode pesanan Anda untuk melacak status masakan di dapur.
            </p>
          </div>
        </div>
      )}

      {/* Banner Ringkasan Kode */}
      <div className="bg-white rounded-3xl border border-krem-gelap p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-krem-gelap/60 pb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-kayu-sedang block">
              Nota Pesanan Digital
            </span>
            <div className="flex items-center gap-2 mt-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-kayu font-mono tracking-tight">
                {pesanan.kode}
              </h1>
              <TombolSalin teks={pesanan.kode} label="Salin Kode" ringkas />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <LencanaStatus status={pesanan.status} untukPelanggan={true} />
            <LencanaBayar statusBayar={pesanan.statusBayar} />
          </div>
        </div>

        {/* Indikator Progres Dapur */}
        {pesanan.status !== "DIBATALKAN" && (
          <div className="bg-krem-tua/50 p-4 rounded-2xl border border-krem-gelap/60 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-kayu-sedang block">
              Progres Masakan di Dapur
            </span>
            <div className="grid grid-cols-5 gap-1 text-center">
              {tahapan.map((t, idx) => {
                const selesai = idx <= indeksAktif;
                const sedang = idx === indeksAktif;

                return (
                  <div key={t.kunci} className="flex flex-col items-center">
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        selesai
                          ? sedang
                            ? "bg-bata text-white ring-4 ring-bata/20"
                            : "bg-daun text-white"
                          : "bg-krem-gelap text-kayu-sedang"
                      }`}
                    >
                      {selesai && !sedang ? (
                        <IkonCek className="w-3.5 h-3.5" strokeWidth={3} />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span
                      className={`text-[10px] sm:text-xs mt-1.5 font-medium ${
                        sedang
                          ? "text-bata font-bold"
                          : selesai
                          ? "text-kayu"
                          : "text-kayu-sedang/70"
                      }`}
                    >
                      {t.nama}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Informasi Waktu & Pengiriman */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-krem/40 rounded-2xl border border-krem-gelap">
            <span className="font-bold text-kayu-sedang uppercase block mb-1">
              Jadwal Acara
            </span>
            <p className="font-bold text-kayu text-sm">
              {tanggalPanjang(pesanan.tanggalAcara)}
            </p>
            <p className="text-kayu-sedang mt-0.5">
              Pukul {jamTampil(pesanan.jamAcara)} WIB
            </p>
          </div>

          <div className="p-4 bg-krem/40 rounded-2xl border border-krem-gelap">
            <span className="font-bold text-kayu-sedang uppercase block mb-1">
              Pengambilan
            </span>
            <p className="font-bold text-kayu text-sm">
              {LABEL_AMBIL[pesanan.caraAmbil]}
            </p>
            {pesanan.alamatAntar && (
              <p className="text-kayu-sedang mt-0.5">{pesanan.alamatAntar}</p>
            )}
          </div>
        </div>

        {/* Rincian Menu Dipesan */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-kayu-sedang">
            Daftar Hidangan
          </h2>
          <div className="border border-krem-gelap rounded-2xl overflow-hidden divide-y divide-krem-gelap/60">
            {pesanan.item.map((it) => (
              <div
                key={it.id}
                className="p-4 flex items-center justify-between gap-4 text-sm"
              >
                <div>
                  <h3 className="font-bold text-kayu">{it.namaMenu}</h3>
                  <div className="text-xs text-kayu-sedang mt-0.5">
                    {it.jumlah} {it.satuan} &times; {rupiah(it.hargaSatuan)}
                  </div>
                  {it.catatan && (
                    <p className="text-xs text-kayu-sedang/80 italic mt-1">
                      Catatan: {it.catatan}
                    </p>
                  )}
                </div>
                <span className="font-bold text-kayu">{rupiah(it.subtotal)}</span>
              </div>
            ))}

            {/* Total dan Ongkir */}
            <div className="p-4 bg-krem/30 space-y-1.5 text-xs">
              <div className="flex justify-between text-kayu-sedang">
                <span>Subtotal Hidangan</span>
                <span>{rupiah(pesanan.subtotal)}</span>
              </div>
              {pesanan.diskon > 0 && (
                <div className="flex justify-between text-daun-tua font-semibold">
                  <span>
                    Potongan
                    {pesanan.kodeVoucher ? ` (${pesanan.kodeVoucher})` : ""}
                  </span>
                  <span>-{rupiah(pesanan.diskon)}</span>
                </div>
              )}
              <div className="flex justify-between text-kayu-sedang">
                <span>Ongkir</span>
                <span>{pesanan.ongkir === 0 ? "Gratis" : rupiah(pesanan.ongkir)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-kayu pt-2 border-t border-krem-gelap/60">
                <span>Total Pembayaran</span>
                <span className="text-bata">{rupiah(pesanan.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Informasi Pembayaran & Tombol Konfirmasi */}
        {pesanan.statusBayar !== "LUNAS" && (
          <div className="p-6 bg-bata-lembut/30 rounded-2xl border border-bata/20 space-y-4">
            <div>
              <h3 className="font-bold text-sm text-bata-tua">
                Instruksi Pembayaran: {LABEL_BAYAR[pesanan.caraBayar]}
              </h3>
              {pesanan.caraBayar === "TRANSFER" && pengaturan.nomorRekening ? (
                <div className="mt-2 text-xs text-kayu-sedang space-y-1">
                  <p>Silakan transfer total pembayaran ke rekening berikut:</p>
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <p className="font-bold text-kayu text-sm font-mono">
                      {pengaturan.namaBank} {pengaturan.nomorRekening}
                    </p>
                    <TombolSalin teks={pengaturan.nomorRekening} label="Salin Rekening" ringkas />
                  </div>
                  <p>a.n. {pengaturan.namaRekening}</p>
                </div>
              ) : (
                <p className="mt-1 text-xs text-kayu-sedang">
                  Pembayaran tunai dapat diserahkan saat pesanan diambil atau tiba
                  di tempat Anda.
                </p>
              )}
            </div>

            {pesanan.caraBayar === "TRANSFER" && (
              <div className="pt-2">
                <FormUnggahBukti
                  kode={pesanan.kode}
                  buktiSaatIni={pesanan.buktiBayarUrl}
                  statusBayar={pesanan.statusBayar}
                />
              </div>
            )}

            {pesanan.statusBayar === "MENUNGGU_VERIFIKASI" && !pesanan.buktiBayarUrl && (
              <p className="text-xs font-semibold text-kunyit-tua bg-kunyit-lembut p-3 rounded-xl border border-kunyit/30 text-center">
                Konfirmasi Anda sudah diterima dapur. Kami sedang memverifikasi transfer.
              </p>
            )}
          </div>
        )}

        {/* Aksi Tambahan: WhatsApp & Cetak */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-krem-gelap/60">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[48px] px-5 py-2.5 rounded-xl font-bold text-xs text-daun bg-daun-lembut hover:bg-daun hover:text-white transition-colors inline-flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <span>Tanya Pesanan via WhatsApp</span>
              </a>
            )}

            {(adalahPemilik || adalahStaf) && (
              <TombolCetakPesanan ringkas kode={pesanan.kode} />
            )}
          </div>

          <Link
            href="/pesan"
            className="min-h-[48px] px-5 py-2.5 rounded-xl font-bold text-xs text-kayu bg-krem-tua hover:bg-krem-gelap transition-colors inline-flex items-center justify-center w-full sm:w-auto"
          >
            Buat Pesanan Lain
          </Link>
        </div>
      </div>
    </div>
  );
}

