import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { punyaAksesPesanan } from "@/lib/akses-pesanan";
import { pesananMilikAkun, sesiDapur } from "@/lib/kepemilikan";
import { bacaSesi } from "@/lib/auth";
import { ambilPengaturan } from "@/lib/pengaturan";
import { dataKeranjangDariMenu } from "@/lib/menu";
import { jam, jamTampil, labelHari, linkWhatsapp, rupiah, tanggalPanjang, tanggalPendek } from "@/lib/format";
import { INFO_STATUS, LABEL_AMBIL, LABEL_BAYAR } from "@/lib/pesanan";
import { LencanaBayar } from "@/components/Lencana";
import { FormUnggahBukti } from "@/components/toko/FormUnggahBukti";
import { LangkahPesan } from "@/components/toko/LangkahPesan";
import { TombolCetakPesanan } from "@/components/admin/TombolCetakPesanan";
import { TombolSalin } from "@/components/TombolSalin";
import { IlustrasiStatus, IlustrasiSukses, Konfeti } from "@/components/ilustrasi/Ilustrasi";
import { BersihkanKeranjang, SegarkanOtomatis, TombolPesanLagi } from "@/components/toko/AksiPesananPembeli";
import { IkonCek, IkonJam, IkonLokasi, IkonToko, IkonTruk, IkonWhatsapp } from "@/components/ikon/Ikon";
import type { CaraAmbil, StatusPesanan } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Status pesanan", robots: { index: false } };

interface HalamanPesananProps {
  params: Promise<{ kode: string }>;
  searchParams: Promise<{ baru?: string }>;
}

const TAHAPAN: { kunci: StatusPesanan; nama: string }[] = [
  { kunci: "BARU", nama: "Pesanan dibuat" },
  { kunci: "DIKONFIRMASI", nama: "Diterima dapur" },
  { kunci: "DIPROSES", nama: "Sedang dimasak" },
  { kunci: "SIAP", nama: "Siap" },
  { kunci: "SELESAI", nama: "Selesai" },
];

/** Kalimat untuk pembeli — menjawab "lalu sekarang apa?" di setiap tahap. */
function penjelasanUntukPembeli(status: StatusPesanan, caraAmbil: CaraAmbil): string {
  switch (status) {
    case "BARU":
      return "Dapur sedang mengecek pesananmu dan akan mengonfirmasi lewat WhatsApp.";
    case "DIKONFIRMASI":
      return "Pesananmu sudah diterima dan masuk jadwal masak dapur.";
    case "DIPROSES":
      return "Masakanmu sedang dimasak. Sebentar lagi siap!";
    case "SIAP":
      return caraAmbil === "DIANTAR" ? "Pesananmu siap dan segera diantar ke alamatmu." : "Pesananmu siap diambil di dapur kami.";
    case "SELESAI":
      return "Terima kasih sudah memesan. Semoga acaramu lancar dan semua tamu kenyang!";
    case "DIBATALKAN":
      return "Pesanan ini dibatalkan.";
  }
}

export default async function HalamanDetailPesanan({ params, searchParams }: HalamanPesananProps) {
  const { kode } = await params;
  const { baru } = await searchParams;

  const [pesanan, sesi, aksesCookie, pengaturan] = await Promise.all([
    db.pesanan.findUnique({
      where: { kode },
      include: { item: true, riwayat: { orderBy: { dibuatPada: "asc" }, select: { ke: true, dibuatPada: true } } },
    }),
    bacaSesi(),
    punyaAksesPesanan(kode),
    ambilPengaturan(),
  ]);

  if (!pesanan) {
    notFound();
  }

  // Invarian #5: kode pesanan bukan kunci akses.
  const dapur = sesiDapur(sesi);
  if (!aksesCookie && !dapur && !pesananMilikAkun(sesi, pesanan)) {
    redirect(`/lacak?pesan=Silakan+masukkan+kode+pesanan+dan+nomor+WhatsApp+untuk+melihat+rinciannya.`);
  }

  // Menu yang masih dijual, untuk tombol "Pesan lagi".
  const idMenu = pesanan.item.map((i) => i.menuId).filter((id): id is string => Boolean(id));
  const menuAktif = idMenu.length
    ? await db.menu.findMany({
        where: { id: { in: idMenu }, aktif: true },
        include: { foto: { orderBy: { urutan: "asc" }, take: 1 } },
      })
    : [];
  const itemPesanLagi = pesanan.item.flatMap((it) => {
    const m = menuAktif.find((x) => x.id === it.menuId);
    return m ? [{ menu: dataKeranjangDariMenu(m), jumlah: Math.max(m.minPesan, it.jumlah) }] : [];
  });

  const pesanWa = `Halo ${pengaturan.namaUsaha}, saya ingin menanyakan pesanan dengan kode ${pesanan.kode} a.n. ${pesanan.namaPemesan}.`;
  const waUrl = pengaturan.whatsapp ? linkWhatsapp(pengaturan.whatsapp, pesanWa) : null;

  const dibatalkan = pesanan.status === "DIBATALKAN";
  const final = dibatalkan || pesanan.status === "SELESAI";
  const indeksAktif = TAHAPAN.findIndex((t) => t.kunci === pesanan.status);
  const perluBayar = !dibatalkan && pesanan.statusBayar !== "LUNAS";
  const rekeningAda = Boolean(pengaturan.namaBank && pengaturan.nomorRekening);
  const waktuTahap = new Map<StatusPesanan, Date>();
  for (const r of pesanan.riwayat) if (!waktuTahap.has(r.ke)) waktuTahap.set(r.ke, r.dibuatPada);
  if (!waktuTahap.has("BARU")) waktuTahap.set("BARU", pesanan.dibuatPada);

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 pt-5 pb-10 sm:pt-10 sm:pb-14 space-y-5">
      {!final && <SegarkanOtomatis kode={pesanan.kode} versi={pesanan.diubahPada.toISOString()} />}
      <LangkahPesan aktif={3} />

      {baru === "1" && (
        <section role="status" className="relative kartu kartu-isi text-center overflow-hidden anim-masuk-skala">
          <BersihkanKeranjang />
          <Konfeti />
          <IlustrasiSukses className="w-48 mx-auto" />
          <h1 className="mt-1 font-tampil text-2xl sm:text-3xl font-bold text-kayu">Pesanan berhasil dibuat!</h1>
          <p className="teks-redup mt-2 max-w-md mx-auto">
            Simpan kode pesanan di bawah. Dapur akan mengonfirmasi lewat WhatsApp ke{" "}
            <span className="font-semibold text-kayu">{pesanan.teleponPemesan.replace(/^62/, "0")}</span>.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-krem-tua px-4 py-2">
            <span className="font-mono text-lg font-bold text-kayu tracking-tight">{pesanan.kode}</span>
            <TombolSalin teks={pesanan.kode} label="Salin" ringkas />
          </div>
        </section>
      )}

      {/* Status sekarang */}
      <section aria-labelledby="judul-status" className="kartu overflow-hidden">
        <div className={`flex items-center gap-4 p-5 sm:p-6 ${dibatalkan ? "bg-bahaya-lembut/50" : "permukaan-hangat"}`}>
          <IlustrasiStatus status={pesanan.status} className="w-28 sm:w-36 shrink-0" />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-kayu-sedang uppercase tracking-wide">Status pesanan</p>
            <h2 id="judul-status" className="mt-0.5 text-xl sm:text-2xl font-bold text-kayu leading-tight">
              {INFO_STATUS[pesanan.status].labelPelanggan}
            </h2>
            <p className="mt-1 text-[15px] text-kayu-sedang leading-snug">
              {penjelasanUntukPembeli(pesanan.status, pesanan.caraAmbil)}
            </p>
            {!dibatalkan && (
              <div className="mt-2">
                <LencanaBayar statusBayar={pesanan.statusBayar} />
              </div>
            )}
          </div>
        </div>

        {dibatalkan ? (
          pesanan.alasanBatal && (
            <p className="px-5 sm:px-6 py-4 border-t border-krem-gelap text-[15px]">
              <span className="font-semibold">Alasan:</span> {pesanan.alasanBatal}
            </p>
          )
        ) : (
          // Linimasa ala lacak paket: tahap selesai bercentang hijau beserta jamnya.
          <ol aria-label="Perjalanan pesanan" className="px-5 sm:px-6 py-5 border-t border-krem-gelap">
            {TAHAPAN.map((t, idx) => {
              const lewat = idx < indeksAktif || pesanan.status === "SELESAI";
              const sekarang = idx === indeksAktif && pesanan.status !== "SELESAI";
              const waktu = waktuTahap.get(t.kunci);
              const terakhir = idx === TAHAPAN.length - 1;
              return (
                <li key={t.kunci} aria-current={sekarang ? "step" : undefined} className="relative flex gap-4 pb-5 last:pb-0">
                  {!terakhir && (
                    <span
                      aria-hidden="true"
                      className={`absolute left-[13px] top-7 bottom-0 w-0.5 ${idx < indeksAktif ? "bg-daun" : "bg-krem-gelap"}`}
                    />
                  )}
                  <span
                    className={`relative z-10 w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                      lewat
                        ? "bg-daun text-white"
                        : sekarang
                        ? "bg-bata text-white anim-denyut"
                        : "bg-white border-2 border-krem-gelap text-kayu-sedang"
                    }`}
                  >
                    {lewat ? <IkonCek className="w-4 h-4" strokeWidth={3} /> : idx + 1}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className={`text-[15px] ${sekarang ? "font-bold text-kayu" : lewat ? "font-medium text-kayu" : "text-kayu-sedang"}`}>
                      {t.kunci === "SIAP" ? (pesanan.caraAmbil === "DIANTAR" ? "Siap diantar" : "Siap diambil") : t.nama}
                    </p>
                    {(lewat || sekarang) && waktu && (
                      <p className="text-[13px] text-kayu-sedang angka-tabel">
                        {tanggalPendek(waktu)}, {jam(waktu)} WIB
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Pembayaran: satu-satunya hal yang perlu dilakukan pembeli, jadi tinggi letaknya */}
      {perluBayar && (
        <section aria-labelledby="judul-bayar" className="kartu kartu-isi ring-2 ring-kunyit/40">
          <h2 id="judul-bayar" className="judul-bagian">
            {pesanan.caraBayar === "TRANSFER" ? "Selesaikan pembayaran" : "Bayar tunai saat terima"}
          </h2>

          {pesanan.caraBayar === "TRANSFER" ? (
            rekeningAda ? (
              <>
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-bata-lembut/60 px-4 py-3">
                  <span className="text-[15px] text-kayu-sedang">Jumlah transfer</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xl font-bold text-bata-tua angka-tabel">{rupiah(pesanan.total)}</span>
                    <TombolSalin teks={String(pesanan.total)} label="Salin" ringkas />
                  </span>
                </div>
                <div className="mt-3 rounded-xl border border-krem-gelap p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[14px] text-kayu-sedang">
                      {pengaturan.namaBank} a.n. {pengaturan.namaRekening}
                    </p>
                    <p className="mt-0.5 text-xl font-bold font-mono text-kayu tracking-wide">{pengaturan.nomorRekening}</p>
                  </div>
                  <TombolSalin teks={pengaturan.nomorRekening} label="Salin nomor" />
                </div>
                <ol className="mt-4 space-y-1.5 text-[15px] text-kayu-sedang list-decimal pl-5">
                  <li>Transfer tepat sesuai jumlah di atas.</li>
                  <li>Foto atau screenshot bukti transfernya.</li>
                  <li>Unggah di bawah ini — dapur akan mengecek dan menandai lunas.</li>
                </ol>
                <div className="mt-5 pt-5 border-t border-krem-gelap">
                  <FormUnggahBukti kode={pesanan.kode} buktiSaatIni={pesanan.buktiBayarUrl} statusBayar={pesanan.statusBayar} />
                </div>
              </>
            ) : (
              <p className="mt-3 teks-redup">
                Nomor rekening belum tersedia. Hubungi dapur lewat WhatsApp untuk cara pembayaran.
              </p>
            )
          ) : (
            <p className="mt-3 text-[16px] text-kayu">
              Siapkan <strong className="text-bata-tua angka-tabel">{rupiah(pesanan.total)}</strong> saat pesanan{" "}
              {pesanan.caraAmbil === "DIANTAR" ? "tiba di lokasimu" : "diambil di dapur"}.
            </p>
          )}

          {pesanan.statusBayar === "MENUNGGU_VERIFIKASI" && !pesanan.buktiBayarUrl && (
            <p className="mt-4 kotak-peringatan">Konfirmasimu sudah diterima. Dapur sedang mengecek transfer.</p>
          )}
        </section>
      )}

      {/* Jadwal & tempat */}
      <section aria-label="Jadwal dan tempat" className="kartu kartu-isi grid gap-4 sm:grid-cols-2 text-[15px]">
        <div className="flex gap-3">
          <span className="w-10 h-10 shrink-0 rounded-xl bg-kunyit-lembut text-kunyit-tua flex items-center justify-center">
            <IkonJam className="w-5 h-5" />
          </span>
          <div>
            <p className="text-kayu-sedang">{labelHari(pesanan.tanggalAcara)}</p>
            <p className="font-semibold text-kayu">{tanggalPanjang(pesanan.tanggalAcara)}</p>
            <p className="text-kayu">Siap pukul {jamTampil(pesanan.jamAcara)} WIB</p>
          </div>
        </div>
        <div className="flex gap-3">
          <span className="w-10 h-10 shrink-0 rounded-xl bg-bata-lembut text-bata-tua flex items-center justify-center">
            {pesanan.caraAmbil === "DIANTAR" ? <IkonTruk className="w-5 h-5" /> : <IkonToko className="w-5 h-5" />}
          </span>
          <div className="min-w-0">
            <p className="text-kayu-sedang">{LABEL_AMBIL[pesanan.caraAmbil]}</p>
            <p className="font-semibold text-kayu break-words">
              {pesanan.caraAmbil === "DIANTAR" ? pesanan.alamatAntar : pengaturan.alamat || "Di dapur kami"}
            </p>
            {pesanan.caraAmbil === "AMBIL_SENDIRI" && pengaturan.alamat && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pengaturan.alamat)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-bata font-semibold hover:underline"
              >
                <IkonLokasi className="w-4 h-4" /> Buka di peta
              </a>
            )}
          </div>
        </div>
        {pesanan.catatan && (
          <div className="sm:col-span-2 rounded-xl bg-krem-tua px-4 py-3">
            <p className="text-[13px] font-semibold text-kayu-sedang">Catatanmu untuk dapur</p>
            <p className="mt-0.5 text-kayu whitespace-pre-line">{pesanan.catatan}</p>
          </div>
        )}
      </section>

      {/* Rincian */}
      <section aria-labelledby="judul-rincian" className="kartu kartu-isi">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="judul-rincian" className="judul-bagian">
            Rincian pesanan
          </h2>
          {baru !== "1" && (
            <span className="inline-flex items-center gap-1.5">
              <span className="font-mono text-[14px] font-semibold text-kayu-sedang">{pesanan.kode}</span>
              <TombolSalin teks={pesanan.kode} label="Salin" ringkas />
            </span>
          )}
        </div>
        <ul className="mt-4 space-y-3 text-[15px]">
          {pesanan.item.map((it) => (
            <li key={it.id} className="flex justify-between gap-4">
              <span className="min-w-0">
                <span className="text-kayu font-medium">{it.namaMenu}</span>
                <span className="block text-[13px] text-kayu-sedang angka-tabel">
                  {it.jumlah} {it.satuan} × {rupiah(it.hargaSatuan)}
                </span>
              </span>
              <span className="text-kayu angka-tabel shrink-0">{rupiah(it.subtotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 pt-4 border-t border-krem-gelap space-y-2 text-[15px]">
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
            <dd className="text-xl font-bold text-kayu angka-tabel">{rupiah(pesanan.total)}</dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        {waUrl && (
          <a href={waUrl} target="_blank" rel="noopener noreferrer" className="tombol-wa">
            <IkonWhatsapp className="w-5 h-5" />
            Tanya dapur via WhatsApp
          </a>
        )}
        <TombolPesanLagi
          item={itemPesanLagi}
          jumlahTakTersedia={pesanan.item.length - itemPesanLagi.length}
          kelas="tombol-kedua"
        />
        {dapur && <TombolCetakPesanan ringkas kode={pesanan.kode} />}
        <Link href="/menu" className="tombol-hantu sm:col-span-2">
          Kembali belanja
        </Link>
      </div>
    </div>
  );
}
