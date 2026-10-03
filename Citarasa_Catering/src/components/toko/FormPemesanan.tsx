"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import dynamic from "next/dynamic";
import { aksiBuatPesanan } from "@/app/aksi/pesanan";
import { aksiCekVoucher } from "@/app/aksi/voucher";
import {
  dariInputTanggal,
  hariIniWib,
  jamTampil,
  kunciHari,
  menitDariJam,
  menitSekarangWib,
  rupiah,
} from "@/lib/format";
import { IkonToko, IkonTruk } from "@/components/ikon/Ikon";
import { hitungMinimalDp } from "@/lib/pembayaran";
import { PemilihMenu } from "@/components/pesanan/PemilihMenu";
import type { MenuUntukPemesanan } from "@/lib/menu";
import type { Pengaturan, Pengguna } from "@/generated/prisma/client";

// Berkas peta (Leaflet + CSS-nya) baru diunduh saat pembeli memilih diantar,
// sehingga pembeli yang ambil sendiri tidak ikut menanggung ongkos unduhnya.
const PetaLokasiAntar = dynamic(
  () => import("@/components/toko/PetaLokasiAntar").then((m) => m.PetaLokasiAntar),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-64 rounded-xl border border-krem-gelap bg-krem-tua flex items-center justify-center text-sm text-kayu-sedang">
        Menyiapkan peta...
      </div>
    ),
  }
);

interface FormPemesananProps {
  daftarMenu: MenuUntukPemesanan[];
  menuAwalSlug?: string;
  pengaturan: Pengaturan;
  tanggalLibur: string[];
  pengguna: Pengguna | null;
  rekeningTersedia: boolean;
}

function GalatField({ id, pesan }: { id: string; pesan?: string }) {
  if (!pesan) return null;
  return (
    <p id={id} className="pesan-galat">
      {pesan}
    </p>
  );
}

export function FormPemesanan({
  daftarMenu,
  menuAwalSlug,
  pengaturan,
  tanggalLibur,
  pengguna,
  rekeningTersedia,
}: FormPemesananProps) {
  const [state, action, isPending] = useActionState(aksiBuatPesanan, null);
  const galat = state?.kesalahan ?? {};

  const petaMenu = useMemo(() => new Map(daftarMenu.map((m) => [m.id, m])), [daftarMenu]);

  const [jumlahMenu, setJumlahMenu] = useState<Record<string, number>>(() => {
    const awal: Record<string, number> = {};
    const cocok = menuAwalSlug ? daftarMenu.find((m) => m.slug === menuAwalSlug) : undefined;
    if (cocok) awal[cocok.id] = cocok.minPesan;
    return awal;
  });

  // Menu yang dibawa dari tombol "Pesan" disematkan paling atas daftar.
  const [idSematan] = useState(() => daftarMenu.find((m) => m.slug === menuAwalSlug)?.id ?? null);

  // --- Isian (semua terkendali) ---
  // React 19 mengosongkan isian tak-terkendali setiap kali aksi formulir
  // selesai, termasuk saat server menolak pesanan. Tanpa state ini, pembeli
  // yang pesanannya ditolak karena kuota penuh harus mengetik ulang semuanya.
  const [caraAmbil, setCaraAmbil] = useState<"AMBIL_SENDIRI" | "DIANTAR">("AMBIL_SENDIRI");
  const [caraBayar, setCaraBayar] = useState<"TRANSFER" | "TUNAI">(
    rekeningTersedia ? "TRANSFER" : "TUNAI"
  );
  const [tanggalAcara, setTanggalAcara] = useState("");
  const [jamAcara, setJamAcara] = useState("11:30");
  const [alamatAntar, setAlamatAntar] = useState(pengguna?.alamat ?? "");
  const [namaPemesan, setNamaPemesan] = useState(pengguna?.nama ?? "");
  const [teleponPemesan, setTeleponPemesan] = useState(
    pengguna?.telepon ? `0${pengguna.telepon.replace(/^62/, "")}` : ""
  );
  const [catatan, setCatatan] = useState("");
  const [koordinat, setKoordinat] = useState<{ lat: number; lng: number } | null>(null);

  const ringkasanRef = useRef<HTMLElement>(null);
  const galatRef = useRef<HTMLDivElement>(null);

  // Galat dari server ditampilkan di dekat tombol kirim — di situlah mata
  // pembeli berada saat menekannya — dan difokuskan supaya terbaca.
  useEffect(() => {
    if (state && !state.sukses) galatRef.current?.focus();
  }, [state]);

  const ubahJumlah = (menuId: string, jumlah: number) => {
    setJumlahMenu((prev) => {
      const salinan = { ...prev };
      if (jumlah <= 0) delete salinan[menuId];
      else salinan[menuId] = jumlah;
      return salinan;
    });
  };

  const itemTerpilih = useMemo(
    () =>
      Object.entries(jumlahMenu).flatMap(([id, jml]) => {
        const m = petaMenu.get(id);
        if (!m || jml <= 0) return [];
        return [{ ...m, jumlah: jml, subtotal: m.harga * jml }];
      }),
    [jumlahMenu, petaMenu]
  );

  const maxPreorder = itemTerpilih.reduce((n, i) => Math.max(n, i.preorderHari), 0);

  // Minimum tanggal pemesanan (hari ini + maxPreorder), dihitung dalam WIB.
  const minTanggal = useMemo(() => {
    const d = dariInputTanggal(hariIniWib());
    d.setUTCDate(d.getUTCDate() + maxPreorder);
    return kunciHari(d);
  }, [maxPreorder]);

  const jamSudahLewat =
    Boolean(tanggalAcara) &&
    tanggalAcara === hariIniWib() &&
    menitDariJam(jamAcara) <= menitSekarangWib();
  const tanggalTerlaluCepat = Boolean(tanggalAcara) && tanggalAcara < minTanggal;
  const isTanggalLibur = tanggalLibur.includes(tanggalAcara);

  const subtotal = itemTerpilih.reduce((n, i) => n + i.subtotal, 0);

  const gratisOngkir = pengaturan.minOrderAntar > 0 && subtotal >= pengaturan.minOrderAntar;
  const ongkir = caraAmbil === "DIANTAR" && !gratisOngkir ? pengaturan.ongkirDefault : 0;

  // --- Voucher ---
  const [voucherTerbuka, setVoucherTerbuka] = useState(false);
  const [kodeInput, setKodeInput] = useState("");
  const [kodeTerpakai, setKodeTerpakai] = useState<string | null>(null);
  const [potongan, setPotongan] = useState(0);
  const [pesanVoucher, setPesanVoucher] = useState<{ teks: string; ok: boolean } | null>(null);
  const [sedangCek, mulaiCekVoucher] = useTransition();

  // Potongan dihitung ulang saat subtotal berubah, ditunda sesaat supaya
  // sepuluh penekanan "+" tidak menjadi sepuluh panggilan server (dan kena
  // batas laju pengecekan voucher).
  useEffect(() => {
    if (!kodeTerpakai) return;
    let dibatalkan = false;
    const penunda = setTimeout(() => {
      aksiCekVoucher(kodeTerpakai, subtotal).then((hasil) => {
        if (dibatalkan) return;
        if (hasil.berlaku) {
          setPotongan(hasil.potongan);
        } else {
          setKodeTerpakai(null);
          setPotongan(0);
          setPesanVoucher({ teks: hasil.pesan, ok: false });
        }
      });
    }, 500);
    return () => {
      dibatalkan = true;
      clearTimeout(penunda);
    };
  }, [kodeTerpakai, subtotal]);

  function cekVoucher() {
    const kode = kodeInput.trim();
    if (!kode) {
      setPesanVoucher({ teks: "Masukkan kode voucher.", ok: false });
      return;
    }
    mulaiCekVoucher(async () => {
      const hasil = await aksiCekVoucher(kode, subtotal);
      if (hasil.berlaku) {
        setKodeTerpakai(hasil.kode);
        setPotongan(hasil.potongan);
        setPesanVoucher({ teks: hasil.deskripsi ?? hasil.pesan, ok: true });
      } else {
        setKodeTerpakai(null);
        setPotongan(0);
        setPesanVoucher({ teks: hasil.pesan, ok: false });
      }
    });
  }

  function lepasVoucher() {
    setKodeTerpakai(null);
    setKodeInput("");
    setPotongan(0);
    setPesanVoucher(null);
  }

  const total = Math.max(0, subtotal - potongan) + ongkir;
  // Sama dengan hitungan server (lib/pembayaran), hanya untuk ditampilkan.
  const minimalDp = caraBayar === "TRANSFER" ? hitungMinimalDp(total, pengaturan.persenDp) : 0;

  const itemsJson = JSON.stringify(itemTerpilih.map((i) => ({ menuId: i.id, jumlah: i.jumlah })));

  // Tombol kirim yang mati tanpa alasan terasa seperti aplikasi macet. Alasan
  // pertama yang menghalangi selalu ditulis tepat di bawah tombolnya.
  const alasanTerkunci = (() => {
    if (itemTerpilih.length === 0) return "Pilih minimal satu menu.";
    if (!tanggalAcara) return "Tentukan tanggal acara.";
    if (tanggalTerlaluCepat)
      return `Menu pilihanmu perlu dipesan paling lambat H-${maxPreorder}. Pilih tanggal yang lebih jauh.`;
    if (isTanggalLibur) return "Dapur tutup pada tanggal itu. Pilih tanggal lain.";
    if (jamSudahLewat) return "Jam itu sudah lewat untuk hari ini.";
    if (caraAmbil === "DIANTAR" && alamatAntar.trim().length < 10)
      return "Lengkapi alamat pengantaran.";
    if (namaPemesan.trim().length < 2) return "Isi nama pemesan.";
    if (teleponPemesan.replace(/\D/g, "").length < 8) return "Isi nomor WhatsApp yang aktif.";
    return null;
  })();

  const kelasPilihan = (aktif: boolean, nonaktif = false) =>
    `flex items-start gap-3 rounded-xl border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-bata/40 ${
      nonaktif
        ? "border-krem-gelap bg-krem-tua/60 opacity-60 cursor-not-allowed"
        : aktif
        ? "border-bata bg-bata-lembut/50 cursor-pointer"
        : "border-krem-gelap bg-white hover:border-kayu-sedang/30 cursor-pointer"
    }`;

  return (
    <form
      action={action}
      noValidate
      className={`grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8 items-start ${
        itemTerpilih.length > 0 ? "pb-24 lg:pb-0" : ""
      }`}
    >
      <input type="hidden" name="itemsJson" value={itemsJson} />
      <input type="hidden" name="kodeVoucher" value={kodeTerpakai ?? ""} />

      <div className="space-y-6 min-w-0">
        {/* 1. Menu */}
        <section aria-labelledby="judul-menu" className="kartu kartu-isi">
          <h2 id="judul-menu" className="judul-bagian">
            1. Pilih menu
          </h2>

          <PemilihMenu
            daftarMenu={daftarMenu}
            jumlahMenu={jumlahMenu}
            onUbah={ubahJumlah}
            idSematan={idSematan}
            idCari="cari-menu"
          />
          <GalatField id="galat-items" pesan={galat.items?.[0]} />
        </section>

        {/* 2. Jadwal */}
        <section aria-labelledby="judul-jadwal" className="kartu kartu-isi">
          <h2 id="judul-jadwal" className="judul-bagian">
            2. Jadwal &amp; pengambilan
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="tanggalAcara" className="label">
                Tanggal acara
              </label>
              <input
                type="date"
                id="tanggalAcara"
                name="tanggalAcara"
                required
                min={minTanggal}
                value={tanggalAcara}
                onChange={(e) => setTanggalAcara(e.target.value)}
                aria-invalid={isTanggalLibur || tanggalTerlaluCepat || Boolean(galat.tanggalAcara)}
                aria-describedby="petunjuk-tanggal"
                className={`isian ${isTanggalLibur || tanggalTerlaluCepat || galat.tanggalAcara ? "isian-galat" : ""}`}
              />
              {isTanggalLibur ? (
                <p id="petunjuk-tanggal" className="pesan-galat">Dapur tutup di tanggal ini.</p>
              ) : tanggalTerlaluCepat ? (
                <p id="petunjuk-tanggal" className="pesan-galat">Paling cepat {minTanggal.split("-").reverse().join("/")}.</p>
              ) : galat.tanggalAcara ? (
                <p id="petunjuk-tanggal" className="pesan-galat">{galat.tanggalAcara[0]}</p>
              ) : (
                <p id="petunjuk-tanggal" className="petunjuk">
                  {maxPreorder > 0 ? `Menu pilihanmu perlu dipesan H-${maxPreorder}.` : "Bisa untuk hari ini."}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="jamAcara" className="label">
                Jam siap (WIB)
              </label>
              <input
                type="time"
                id="jamAcara"
                name="jamAcara"
                required
                value={jamAcara}
                onChange={(e) => setJamAcara(e.target.value)}
                aria-invalid={jamSudahLewat || Boolean(galat.jamAcara)}
                aria-describedby="petunjuk-jam"
                className={`isian ${jamSudahLewat || galat.jamAcara ? "isian-galat" : ""}`}
              />
              <p id="petunjuk-jam" className={jamSudahLewat || galat.jamAcara ? "pesan-galat" : "petunjuk"}>
                {jamSudahLewat
                  ? "Jam ini sudah lewat hari ini."
                  : galat.jamAcara?.[0] ?? "Sebaiknya 30–45 menit sebelum acara."}
              </p>
            </div>
          </div>

          <fieldset className="mt-5">
            <legend className="label">Cara pengambilan</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={kelasPilihan(caraAmbil === "AMBIL_SENDIRI")}>
                <input
                  type="radio"
                  name="caraAmbil"
                  value="AMBIL_SENDIRI"
                  checked={caraAmbil === "AMBIL_SENDIRI"}
                  onChange={() => setCaraAmbil("AMBIL_SENDIRI")}
                  className="sr-only"
                />
                <IkonToko className="w-5 h-5 mt-0.5 text-kayu-sedang shrink-0" />
                <span>
                  <span className="block font-medium text-kayu">Ambil sendiri</span>
                  <span className="block text-sm text-kayu-sedang mt-0.5">Gratis, di dapur kami</span>
                </span>
              </label>
              <label className={kelasPilihan(caraAmbil === "DIANTAR")}>
                <input
                  type="radio"
                  name="caraAmbil"
                  value="DIANTAR"
                  checked={caraAmbil === "DIANTAR"}
                  onChange={() => setCaraAmbil("DIANTAR")}
                  className="sr-only"
                />
                <IkonTruk className="w-5 h-5 mt-0.5 text-kayu-sedang shrink-0" />
                <span>
                  <span className="block font-medium text-kayu">Diantar</span>
                  <span className="block text-sm text-kayu-sedang mt-0.5">
                    {pengaturan.ongkirDefault === 0
                      ? "Gratis ongkir"
                      : gratisOngkir
                      ? "Gratis ongkir untuk pesanan ini"
                      : `Ongkir ${rupiah(pengaturan.ongkirDefault)}${
                          pengaturan.minOrderAntar > 0
                            ? `, gratis di atas ${rupiah(pengaturan.minOrderAntar)}`
                            : ""
                        }`}
                  </span>
                </span>
              </label>
            </div>
          </fieldset>

          {caraAmbil === "DIANTAR" && (
            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="alamatAntar" className="label">
                  Alamat lengkap
                </label>
                <textarea
                  id="alamatAntar"
                  name="alamatAntar"
                  rows={3}
                  required
                  maxLength={500}
                  value={alamatAntar}
                  onChange={(e) => setAlamatAntar(e.target.value)}
                  placeholder="Nama gedung/komplek, jalan, nomor, RT/RW, patokan"
                  aria-invalid={Boolean(galat.alamatAntar)}
                  className={`isian py-2.5 ${galat.alamatAntar ? "isian-galat" : ""}`}
                />
                <GalatField id="galat-alamat" pesan={galat.alamatAntar?.[0]} />
              </div>
              {/* Peta hanya dimuat saat benar-benar diantar: membuka peta berarti
                  menghubungi server ubin pihak ketiga. */}
              <input type="hidden" name="latitude" value={koordinat?.lat ?? ""} />
              <input type="hidden" name="longitude" value={koordinat?.lng ?? ""} />
              <PetaLokasiAntar
                latitude={koordinat?.lat ?? null}
                longitude={koordinat?.lng ?? null}
                onPindah={(lat, lng) => setKoordinat({ lat, lng })}
                onHapus={() => setKoordinat(null)}
              />
            </div>
          )}
        </section>

        {/* 3. Data pemesan */}
        <section aria-labelledby="judul-data" className="kartu kartu-isi">
          <h2 id="judul-data" className="judul-bagian">
            3. Data pemesan &amp; pembayaran
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="namaPemesan" className="label">
                Nama
              </label>
              <input
                type="text"
                id="namaPemesan"
                name="namaPemesan"
                required
                maxLength={100}
                autoComplete="name"
                value={namaPemesan}
                onChange={(e) => setNamaPemesan(e.target.value)}
                aria-invalid={Boolean(galat.namaPemesan)}
                className={`isian ${galat.namaPemesan ? "isian-galat" : ""}`}
              />
              <GalatField id="galat-nama" pesan={galat.namaPemesan?.[0]} />
            </div>
            <div>
              <label htmlFor="teleponPemesan" className="label">
                Nomor WhatsApp
              </label>
              <input
                type="tel"
                id="teleponPemesan"
                name="teleponPemesan"
                inputMode="tel"
                autoComplete="tel"
                required
                maxLength={20}
                value={teleponPemesan}
                onChange={(e) => setTeleponPemesan(e.target.value)}
                placeholder="08xxxxxxxxxx"
                aria-invalid={Boolean(galat.teleponPemesan)}
                aria-describedby="petunjuk-telepon"
                className={`isian ${galat.teleponPemesan ? "isian-galat" : ""}`}
              />
              {galat.teleponPemesan ? (
                <GalatField id="petunjuk-telepon" pesan={galat.teleponPemesan[0]} />
              ) : (
                <p id="petunjuk-telepon" className="petunjuk">Dipakai dapur untuk konfirmasi & melacak pesanan.</p>
              )}
            </div>
          </div>

          <fieldset className="mt-5">
            <legend className="label">Pembayaran</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={kelasPilihan(caraBayar === "TRANSFER", !rekeningTersedia)}>
                <input
                  type="radio"
                  name="caraBayar"
                  value="TRANSFER"
                  checked={caraBayar === "TRANSFER"}
                  disabled={!rekeningTersedia}
                  onChange={() => setCaraBayar("TRANSFER")}
                  className="sr-only"
                />
                <span>
                  <span className="block font-medium text-kayu">Transfer bank</span>
                  <span className="block text-sm text-kayu-sedang mt-0.5">
                    {rekeningTersedia
                      ? pengaturan.persenDp > 0
                        ? `${pengaturan.namaBank} · bisa DP ${pengaturan.persenDp}% dulu`
                        : `${pengaturan.namaBank}, unggah bukti setelah pesan`
                      : "Belum tersedia"}
                  </span>
                </span>
              </label>
              <label className={kelasPilihan(caraBayar === "TUNAI")}>
                <input
                  type="radio"
                  name="caraBayar"
                  value="TUNAI"
                  checked={caraBayar === "TUNAI"}
                  onChange={() => setCaraBayar("TUNAI")}
                  className="sr-only"
                />
                <span>
                  <span className="block font-medium text-kayu">Tunai</span>
                  <span className="block text-sm text-kayu-sedang mt-0.5">Bayar saat pesanan diterima</span>
                </span>
              </label>
            </div>
            <GalatField id="galat-bayar" pesan={galat.caraBayar?.[0]} />
          </fieldset>

          <div className="mt-5">
            <label htmlFor="catatanPesanan" className="label">
              Catatan untuk dapur <span className="font-normal text-kayu-sedang">(opsional)</span>
            </label>
            <textarea
              id="catatanPesanan"
              name="catatanPesanan"
              rows={2}
              maxLength={1000}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Mis. sambal dipisah, tidak pedas, label nama peserta"
              className="isian py-2.5"
            />
          </div>
        </section>
      </div>

      {/* Ringkasan */}
      <aside
        ref={ringkasanRef}
        aria-labelledby="judul-ringkasan"
        className="kartu kartu-isi lg:sticky lg:top-24 scroll-mt-24"
      >
        <h2 id="judul-ringkasan" className="judul-bagian">
          Ringkasan
        </h2>

        {itemTerpilih.length === 0 ? (
          <p className="mt-3 teks-redup">Belum ada menu dipilih.</p>
        ) : (
          <ul className="mt-4 space-y-3 text-sm">
            {itemTerpilih.map((it) => (
              <li key={it.id} className="flex justify-between gap-3">
                <span className="text-kayu min-w-0">
                  {it.nama}
                  <span className="block text-xs text-kayu-sedang angka-tabel">
                    {it.jumlah} {it.satuan} × {rupiah(it.harga)}
                  </span>
                </span>
                <span className="text-kayu angka-tabel shrink-0">{rupiah(it.subtotal)}</span>
              </li>
            ))}
          </ul>
        )}

        <dl className="mt-4 pt-4 border-t border-krem-gelap space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-kayu-sedang">Subtotal</dt>
            <dd className="angka-tabel">{rupiah(subtotal)}</dd>
          </div>
          {potongan > 0 && kodeTerpakai && (
            <div className="flex justify-between text-daun-tua">
              <dt>Voucher {kodeTerpakai}</dt>
              <dd className="angka-tabel">−{rupiah(potongan)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-kayu-sedang">Ongkir</dt>
            <dd className="angka-tabel">
              {caraAmbil === "AMBIL_SENDIRI" ? "—" : ongkir === 0 ? "Gratis" : rupiah(ongkir)}
            </dd>
          </div>
          <div className="flex justify-between items-baseline pt-3 border-t border-krem-gelap">
            <dt className="font-semibold text-kayu">Total</dt>
            <dd className="text-xl font-bold text-kayu angka-tabel">{rupiah(total)}</dd>
          </div>
          {minimalDp > 0 && (
            <div className="flex justify-between text-kayu-sedang">
              <dt>DP minimal ({pengaturan.persenDp}%)</dt>
              <dd className="angka-tabel">{rupiah(minimalDp)}</dd>
            </div>
          )}
        </dl>

        {/* Voucher */}
        <div className="mt-4">
          {kodeTerpakai ? (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-daun-lembut px-3 py-2 text-sm text-daun-tua">
              <span className="min-w-0 truncate">
                <span className="font-semibold">{kodeTerpakai}</span> terpakai
              </span>
              <button type="button" onClick={lepasVoucher} className="font-medium underline cursor-pointer shrink-0">
                Lepas
              </button>
            </div>
          ) : voucherTerbuka ? (
            <div className="flex gap-2">
              <label htmlFor="input-voucher" className="sr-only">
                Kode voucher
              </label>
              <input
                id="input-voucher"
                type="text"
                value={kodeInput}
                onChange={(e) => setKodeInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  // Enter di kolom ini memeriksa voucher, bukan mengirim seluruh pesanan.
                  if (e.key === "Enter") {
                    e.preventDefault();
                    cekVoucher();
                  }
                }}
                placeholder="Kode voucher"
                autoComplete="off"
                maxLength={32}
                autoFocus
                className="isian flex-1 min-w-0 uppercase"
              />
              <button type="button" onClick={cekVoucher} disabled={sedangCek} className="tombol-kedua px-4">
                {sedangCek ? "..." : "Pakai"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setVoucherTerbuka(true)}
              className="text-sm font-medium text-bata hover:text-bata-tua cursor-pointer"
            >
              Punya kode voucher?
            </button>
          )}
          {pesanVoucher && !kodeTerpakai && (
            <p role="status" className={`mt-2 text-xs ${pesanVoucher.ok ? "text-daun-tua" : "text-bahaya"}`}>
              {pesanVoucher.teks}
            </p>
          )}
        </div>

        {state && !state.sukses && state.pesan && (
          <div ref={galatRef} tabIndex={-1} role="alert" className="mt-5 kotak-galat focus:outline-none">
            {state.pesan}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || alasanTerkunci !== null}
          aria-describedby="alasan-kunci"
          className="tombol-utama tombol-besar w-full mt-5"
        >
          {isPending ? "Mengirim pesanan..." : "Kirim pesanan"}
        </button>
        <p id="alasan-kunci" className="mt-2 text-xs text-center text-kayu-sedang min-h-[1rem]">
          {alasanTerkunci ?? `Dapur buka ${jamTampil(pengaturan.jamBuka)}–${jamTampil(pengaturan.jamTutup)} WIB.`}
        </p>
      </aside>

      {/* Bar total mengambang di ponsel */}
      {itemTerpilih.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-krem-gelap lg:hidden">
          <div
            className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <div className="min-w-0">
              <p className="text-xs text-kayu-sedang">{itemTerpilih.length} menu</p>
              <p className="font-bold text-kayu angka-tabel">{rupiah(total)}</p>
            </div>
            <button
              type="button"
              onClick={() => ringkasanRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="tombol-utama"
            >
              Lanjut ke ringkasan
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
