"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
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
  tanggalPendek,
} from "@/lib/format";
import { LABEL_KATEGORI, URUTAN_KATEGORI } from "@/lib/pesanan";
import {
  pastikanDiKeranjang,
  selaraskanKeranjang,
  tambahKeKeranjang,
  ubahJumlahKeranjang,
  useKeranjang,
  type DataMenuKeranjang,
} from "@/lib/keranjang";
import {
  IkonCari,
  IkonDompet,
  IkonKalender,
  IkonKartuNama,
  IkonKeranjang,
  IkonTambah,
  IkonTiket,
  IkonToko,
  IkonTruk,
} from "@/components/ikon/Ikon";
import { kabari } from "@/components/Pemberitahuan";
import { KontrolJumlah } from "@/components/toko/KontrolJumlah";
import { GambarMini } from "@/components/toko/IsiKeranjang";
import type { MenuUntukPemesanan } from "@/lib/menu";
import type { KategoriMenu, Pengaturan, Pengguna } from "@/generated/prisma/client";

// Berkas peta (Leaflet + CSS-nya) baru diunduh saat pembeli memilih diantar,
// sehingga pembeli yang ambil sendiri tidak ikut menanggung ongkos unduhnya.
const PetaLokasiAntar = dynamic(
  () => import("@/components/toko/PetaLokasiAntar").then((m) => m.PetaLokasiAntar),
  {
    ssr: false,
    loading: () => <div className="kerangka w-full h-64" />,
  }
);

interface FormPemesananProps {
  daftarMenu: MenuUntukPemesanan[];
  menuAwalSlug?: string;
  pengaturan: Pengaturan;
  tanggalLibur: string[];
  pengguna: Pick<Pengguna, "nama" | "telepon" | "alamat"> | null;
  rekeningTersedia: boolean;
}

/** Berapa baris katalog tampil di pemilih "tambah menu" sebelum "tampilkan lainnya". */
const TAMPIL_AWAL = 8;

/** Jam siap yang paling sering dipilih — mengetik jam di ponsel itu repot. */
const JAM_CEPAT = [
  { jam: "07:00", label: "Pagi" },
  { jam: "11:30", label: "Siang" },
  { jam: "15:30", label: "Sore" },
  { jam: "18:30", label: "Malam" },
];

function keDataKeranjang(m: MenuUntukPemesanan): DataMenuKeranjang {
  return {
    menuId: m.id,
    slug: m.slug,
    nama: m.nama,
    harga: m.harga,
    satuan: m.satuan,
    minPesan: m.minPesan,
    preorderHari: m.preorderHari,
    fotoUrl: m.foto[0]?.url ?? null,
  };
}

function GalatField({ id, pesan }: { id: string; pesan?: string }) {
  if (!pesan) return null;
  return (
    <p id={id} className="pesan-galat">
      {pesan}
    </p>
  );
}

function JudulBagian({ nomor, judul, Ikon, id }: { nomor: number; judul: string; Ikon: typeof IkonKeranjang; id: string }) {
  return (
    <h2 id={id} className="flex items-center gap-3 judul-bagian">
      <span className="relative w-10 h-10 shrink-0 rounded-xl bg-bata-lembut text-bata-tua flex items-center justify-center">
        <Ikon className="w-5 h-5" />
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-bata text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-white">
          {nomor}
        </span>
      </span>
      {judul}
    </h2>
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

  // --- Keranjang = sumber tunggal daftar menu yang dipesan ---
  const keranjang = useKeranjang();
  const [siap, setSiap] = useState(false);
  const [dibuang, setDibuang] = useState<string[]>([]);
  useEffect(() => {
    setDibuang(selaraskanKeranjang(new Map(daftarMenu.map((m) => [m.id, keDataKeranjang(m)]))));
    // Tautan lama "/pesan?menu=slug" (mis. dibagikan di WhatsApp) tetap jalan.
    const awal = menuAwalSlug ? daftarMenu.find((m) => m.slug === menuAwalSlug) : undefined;
    if (awal) pastikanDiKeranjang(keDataKeranjang(awal));
    setSiap(true);
  }, [daftarMenu, menuAwalSlug]);

  // Harga & aturan selalu dari katalog server, bukan dari salinan di keranjang.
  const itemTerpilih = useMemo(
    () =>
      keranjang.flatMap((k) => {
        const m = petaMenu.get(k.menuId);
        if (!m) return [];
        const jumlah = Math.max(m.minPesan, k.jumlah);
        return [{ ...m, fotoUrl: m.foto[0]?.url ?? null, jumlah, subtotal: m.harga * jumlah }];
      }),
    [keranjang, petaMenu]
  );
  const jumlahDi = useMemo(() => new Map(itemTerpilih.map((i) => [i.id, i.jumlah])), [itemTerpilih]);

  const ubahJumlah = (menu: MenuUntukPemesanan, jumlah: number) => {
    if (jumlahDi.has(menu.id)) ubahJumlahKeranjang(menu.id, jumlah);
    else if (jumlah > 0) tambahKeKeranjang(keDataKeranjang(menu), jumlah);
  };

  // --- Pemilih "tambah menu lain" ---
  const [pemilihTerbuka, setPemilihTerbuka] = useState(false);
  const [cari, setCari] = useState("");
  const [kategoriAktif, setKategoriAktif] = useState<KategoriMenu | "SEMUA">("SEMUA");
  const [batasTampil, setBatasTampil] = useState(TAMPIL_AWAL);
  const kategoriTersedia = useMemo(() => {
    const ada = new Set(daftarMenu.map((m) => m.kategori));
    return URUTAN_KATEGORI.filter((k) => ada.has(k));
  }, [daftarMenu]);
  const menuTersaring = useMemo(() => {
    const kunci = cari.trim().toLowerCase();
    return daftarMenu.filter((m) => {
      if (jumlahDi.has(m.id)) return false;
      if (kategoriAktif !== "SEMUA" && m.kategori !== kategoriAktif) return false;
      if (!kunci) return true;
      return m.nama.toLowerCase().includes(kunci) || m.deskripsi.toLowerCase().includes(kunci);
    });
  }, [daftarMenu, cari, kategoriAktif, jumlahDi]);
  useEffect(() => setBatasTampil(TAMPIL_AWAL), [cari, kategoriAktif]);
  const menuTampil = menuTersaring.slice(0, batasTampil);
  const pemilihTampil = pemilihTerbuka || (siap && itemTerpilih.length === 0);

  // --- Isian (semua terkendali) ---
  // React 19 mengosongkan isian tak-terkendali setiap kali aksi formulir
  // selesai, termasuk saat server menolak pesanan. Tanpa state ini, pembeli
  // yang pesanannya ditolak karena kuota penuh harus mengetik ulang semuanya.
  const [caraAmbil, setCaraAmbil] = useState<"AMBIL_SENDIRI" | "DIANTAR">("AMBIL_SENDIRI");
  const [caraBayar, setCaraBayar] = useState<"TRANSFER" | "TUNAI">(rekeningTersedia ? "TRANSFER" : "TUNAI");
  const [tanggalAcara, setTanggalAcara] = useState("");
  const [jamAcara, setJamAcara] = useState("11:30");
  const [alamatAntar, setAlamatAntar] = useState(pengguna?.alamat ?? "");
  const [namaPemesan, setNamaPemesan] = useState(pengguna?.nama ?? "");
  const [teleponPemesan, setTeleponPemesan] = useState(
    pengguna?.telepon ? `0${pengguna.telepon.replace(/^62/, "")}` : ""
  );
  const [catatan, setCatatan] = useState("");
  const [koordinat, setKoordinat] = useState<{ lat: number; lng: number } | null>(null);

  const galatRef = useRef<HTMLDivElement>(null);

  // Galat dari server ditampilkan di dekat tombol kirim — di situlah mata
  // pembeli berada saat menekannya — dan difokuskan supaya terbaca.
  useEffect(() => {
    if (state && !state.sukses) {
      galatRef.current?.focus();
      galatRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [state]);

  const maxPreorder = itemTerpilih.reduce((n, i) => Math.max(n, i.preorderHari), 0);

  // Minimum tanggal pemesanan (hari ini + maxPreorder), dihitung dalam WIB.
  const geserHari = (hari: number) => {
    const d = dariInputTanggal(hariIniWib());
    d.setUTCDate(d.getUTCDate() + hari);
    return kunciHari(d);
  };
  const minTanggal = useMemo(() => geserHari(maxPreorder), [maxPreorder]);

  // Pilihan tanggal cepat: tiga hari terdekat yang sah (bukan libur, memenuhi H-n).
  const tanggalCepat = useMemo(() => {
    const hasil: { nilai: string; label: string }[] = [];
    for (let h = maxPreorder; h < maxPreorder + 14 && hasil.length < 3; h++) {
      const nilai = geserHari(h);
      if (tanggalLibur.includes(nilai)) continue;
      const label = h === 0 ? "Hari ini" : h === 1 ? "Besok" : h === 2 ? "Lusa" : tanggalPendek(dariInputTanggal(nilai));
      hasil.push({ nilai, label });
    }
    return hasil;
  }, [maxPreorder, tanggalLibur]);

  const jamSudahLewat =
    Boolean(tanggalAcara) && tanggalAcara === hariIniWib() && menitDariJam(jamAcara) <= menitSekarangWib();
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
  const itemsJson = JSON.stringify(itemTerpilih.map((i) => ({ menuId: i.id, jumlah: i.jumlah })));

  // Tombol kirim yang mati tanpa alasan terasa seperti aplikasi macet. Alasan
  // pertama yang menghalangi selalu ditulis, dan tombol di bar bawah ponsel
  // membawa pembeli langsung ke bagian yang belum beres.
  const halangan = ((): { pesan: string; ke: string } | null => {
    if (itemTerpilih.length === 0) return { pesan: "Pilih minimal satu menu.", ke: "bagian-menu" };
    if (!tanggalAcara) return { pesan: "Tentukan tanggal acara.", ke: "bagian-jadwal" };
    if (tanggalTerlaluCepat)
      return { pesan: `Menu pilihanmu perlu dipesan paling lambat H-${maxPreorder}. Pilih tanggal yang lebih jauh.`, ke: "bagian-jadwal" };
    if (isTanggalLibur) return { pesan: "Dapur tutup pada tanggal itu. Pilih tanggal lain.", ke: "bagian-jadwal" };
    if (jamSudahLewat) return { pesan: "Jam itu sudah lewat untuk hari ini.", ke: "bagian-jadwal" };
    if (caraAmbil === "DIANTAR" && alamatAntar.trim().length < 10)
      return { pesan: "Lengkapi alamat pengantaran.", ke: "bagian-jadwal" };
    if (namaPemesan.trim().length < 2) return { pesan: "Isi nama pemesan.", ke: "bagian-data" };
    if (teleponPemesan.replace(/\D/g, "").length < 8) return { pesan: "Isi nomor WhatsApp yang aktif.", ke: "bagian-data" };
    return null;
  })();

  const tunjukkanHalangan = () => {
    if (!halangan) return;
    kabari(halangan.pesan, { jenis: "galat" });
    document.getElementById(halangan.ke)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const kelasPilihan = (aktif: boolean, nonaktif = false) =>
    `relative flex items-start gap-3 rounded-2xl border-[1.5px] p-4 transition-[border-color,background-color,transform] has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-bata/25 ${
      nonaktif
        ? "border-krem-gelap bg-krem-tua/60 opacity-60 cursor-not-allowed"
        : aktif
        ? "border-bata bg-bata-lembut/60 cursor-pointer"
        : "border-krem-gelap bg-white hover:border-kayu-sedang/35 cursor-pointer active:scale-[0.99]"
    }`;

  const TitikPilih = ({ aktif }: { aktif: boolean }) => (
    <span
      aria-hidden="true"
      className={`ml-auto mt-0.5 w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
        aktif ? "border-bata bg-bata" : "border-krem-gelap bg-white"
      }`}
    >
      {aktif && <span className="w-2 h-2 rounded-full bg-white anim-masuk-skala" />}
    </span>
  );

  if (!siap) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]" aria-busy="true" aria-label="Memuat formulir pesanan">
        <div className="space-y-5">
          <div className="kerangka h-48" />
          <div className="kerangka h-64" />
        </div>
        <div className="kerangka h-72 hidden lg:block" />
      </div>
    );
  }

  return (
    <form action={action} noValidate className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8 items-start">
      <input type="hidden" name="itemsJson" value={itemsJson} />
      <input type="hidden" name="kodeVoucher" value={kodeTerpakai ?? ""} />

      <div className="space-y-5 min-w-0">
        {dibuang.length > 0 && (
          <p role="status" className="kotak-peringatan">
            <strong>{dibuang.join(", ")}</strong> sudah tidak dijual, jadi kami keluarkan dari pesanan.
          </p>
        )}

        {/* 1. Pesananmu */}
        <section aria-labelledby="judul-menu" id="bagian-menu" className="kartu kartu-isi scroll-mt-24">
          <JudulBagian nomor={1} judul="Pesananmu" Ikon={IkonKeranjang} id="judul-menu" />

          {itemTerpilih.length > 0 && (
            <ul className="mt-4 divide-y divide-krem-gelap">
              {itemTerpilih.map((it) => (
                <li key={it.id} className="py-3.5 flex gap-3 items-center anim-masuk">
                  <GambarMini url={it.fotoUrl} nama={it.nama} ukuran="w-14 h-14" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-kayu leading-snug line-clamp-2">{it.nama}</p>
                    <p className="text-[13.5px] text-kayu-sedang">
                      <span className="angka-tabel">{rupiah(it.harga)}</span> / {it.satuan}
                      {it.preorderHari > 0 && ` · H-${it.preorderHari}`}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <KontrolJumlah
                        ukuran="kecil"
                        jumlah={it.jumlah}
                        min={it.minPesan}
                        satuan={it.satuan}
                        nama={it.nama}
                        onUbah={(n) => ubahJumlah(it, n)}
                      />
                      <span className="font-bold text-kayu angka-tabel">{rupiah(it.subtotal)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {itemTerpilih.length === 0 && (
            <p className="mt-3 kotak-info bg-krem-tua border-krem-gelap text-kayu">
              Keranjangmu kosong. Pilih menu di bawah ini, atau{" "}
              <Link href="/menu" className="font-semibold text-bata underline">
                lihat katalog lengkap
              </Link>
              .
            </p>
          )}

          {!pemilihTampil ? (
            <button
              type="button"
              onClick={() => setPemilihTerbuka(true)}
              className="mt-3 w-full tombol-kedua border-dashed text-bata-tua"
            >
              <IkonTambah className="w-4 h-4" strokeWidth={2.5} />
              Tambah menu lain
            </button>
          ) : (
            <div className="mt-4 rounded-2xl bg-krem-tua/60 p-3 sm:p-4 anim-masuk">
              <div className="relative">
                <label htmlFor="cari-menu" className="sr-only">
                  Cari menu
                </label>
                <IkonCari className="w-[18px] h-[18px] text-kayu-sedang absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="cari-menu"
                  type="search"
                  value={cari}
                  onChange={(e) => setCari(e.target.value)}
                  placeholder="Cari menu untuk ditambahkan"
                  autoComplete="off"
                  className="isian pl-10"
                />
              </div>

              {kategoriTersedia.length > 1 && (
                <div className="mt-3 -mx-3 px-3 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto tanpa-scrollbar">
                  {(["SEMUA", ...kategoriTersedia] as const).map((k) => {
                    const aktif = kategoriAktif === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setKategoriAktif(k)}
                        aria-pressed={aktif}
                        className={`pil shrink-0 cursor-pointer ${aktif ? "pil-aktif" : ""}`}
                      >
                        {k === "SEMUA" ? "Semua" : LABEL_KATEGORI[k]}
                      </button>
                    );
                  })}
                </div>
              )}

              <ul className="mt-3 divide-y divide-krem-gelap rounded-xl bg-white border border-krem-gelap overflow-hidden">
                {menuTampil.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 px-3 py-3">
                    <GambarMini url={m.foto[0]?.url ?? null} nama={m.nama} ukuran="w-12 h-12" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-kayu leading-snug line-clamp-2">{m.nama}</p>
                      <p className="text-[13px] text-kayu-sedang">
                        <span className="text-kayu font-semibold angka-tabel">{rupiah(m.harga)}</span> / {m.satuan} · min.{" "}
                        {m.minPesan}
                        {m.preorderHari > 0 && ` · H-${m.preorderHari}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        ubahJumlah(m, m.minPesan);
                        kabari(`${m.nama} ditambahkan`);
                      }}
                      className="tombol-garis tombol-kecil shrink-0"
                      aria-label={`Tambah ${m.nama}`}
                    >
                      <IkonTambah className="w-4 h-4" strokeWidth={2.5} />
                      Tambah
                    </button>
                  </li>
                ))}
                {menuTersaring.length === 0 && (
                  <li className="py-6 text-center teks-redup">Tidak ada menu yang cocok.</li>
                )}
              </ul>

              {menuTersaring.length > menuTampil.length && (
                <button
                  type="button"
                  onClick={() => setBatasTampil((n) => n + TAMPIL_AWAL * 2)}
                  className="tombol-hantu w-full mt-2"
                >
                  Tampilkan {menuTersaring.length - menuTampil.length} menu lainnya
                </button>
              )}
              {itemTerpilih.length > 0 && (
                <button type="button" onClick={() => setPemilihTerbuka(false)} className="tombol-hantu tombol-kecil w-full mt-1">
                  Tutup daftar menu
                </button>
              )}
            </div>
          )}
          <GalatField id="galat-items" pesan={galat.items?.[0]} />
        </section>

        {/* 2. Jadwal */}
        <section aria-labelledby="judul-jadwal" id="bagian-jadwal" className="kartu kartu-isi scroll-mt-24">
          <JudulBagian nomor={2} judul="Kapan & ke mana?" Ikon={IkonKalender} id="judul-jadwal" />

          <fieldset className="mt-5">
            <legend className="label">Tanggal acara</legend>
            <div className="flex flex-wrap gap-2">
              {tanggalCepat.map((t) => (
                <button
                  key={t.nilai}
                  type="button"
                  onClick={() => setTanggalAcara(t.nilai)}
                  aria-pressed={tanggalAcara === t.nilai}
                  className={`pil cursor-pointer ${tanggalAcara === t.nilai ? "pil-aktif" : ""}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <label htmlFor="tanggalAcara" className="sr-only">
              Pilih tanggal lain
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
              className={`isian mt-2.5 sm:max-w-xs ${isTanggalLibur || tanggalTerlaluCepat || galat.tanggalAcara ? "isian-galat" : ""}`}
            />
            {isTanggalLibur ? (
              <p id="petunjuk-tanggal" className="pesan-galat">Dapur tutup di tanggal ini.</p>
            ) : tanggalTerlaluCepat ? (
              <p id="petunjuk-tanggal" className="pesan-galat">Paling cepat {minTanggal.split("-").reverse().join("/")}.</p>
            ) : galat.tanggalAcara ? (
              <p id="petunjuk-tanggal" className="pesan-galat">{galat.tanggalAcara[0]}</p>
            ) : (
              <p id="petunjuk-tanggal" className="petunjuk">
                {maxPreorder > 0 ? `Menu pilihanmu perlu dipesan H-${maxPreorder}.` : "Bisa untuk hari ini. Atau pilih tanggal lain di kalender."}
              </p>
            )}
          </fieldset>

          <fieldset className="mt-5">
            <legend className="label">Jam siap (WIB)</legend>
            <div className="flex flex-wrap gap-2">
              {JAM_CEPAT.map((j) => (
                <button
                  key={j.jam}
                  type="button"
                  onClick={() => setJamAcara(j.jam)}
                  aria-pressed={jamAcara === j.jam}
                  className={`pil cursor-pointer ${jamAcara === j.jam ? "pil-aktif" : ""}`}
                >
                  {jamTampil(j.jam)} <span className="opacity-70 font-normal">{j.label}</span>
                </button>
              ))}
            </div>
            <label htmlFor="jamAcara" className="sr-only">
              Atau ketik jam lain
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
              className={`isian mt-2.5 sm:max-w-xs ${jamSudahLewat || galat.jamAcara ? "isian-galat" : ""}`}
            />
            <p id="petunjuk-jam" className={jamSudahLewat || galat.jamAcara ? "pesan-galat" : "petunjuk"}>
              {jamSudahLewat
                ? "Jam ini sudah lewat hari ini."
                : galat.jamAcara?.[0] ?? "Sebaiknya 30–45 menit sebelum acara dimulai."}
            </p>
          </fieldset>

          <fieldset className="mt-6">
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
                <IkonToko className="w-6 h-6 mt-0.5 text-bata-tua shrink-0" />
                <span>
                  <span className="block font-semibold text-kayu">Ambil sendiri</span>
                  <span className="block text-[14px] text-kayu-sedang mt-0.5">Gratis, di dapur kami</span>
                </span>
                <TitikPilih aktif={caraAmbil === "AMBIL_SENDIRI"} />
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
                <IkonTruk className="w-6 h-6 mt-0.5 text-bata-tua shrink-0" />
                <span>
                  <span className="block font-semibold text-kayu">Diantar</span>
                  <span className="block text-[14px] text-kayu-sedang mt-0.5">
                    {pengaturan.ongkirDefault === 0
                      ? "Gratis ongkir"
                      : gratisOngkir
                      ? "Gratis ongkir untuk pesanan ini"
                      : `Ongkir ${rupiah(pengaturan.ongkirDefault)}${
                          pengaturan.minOrderAntar > 0 ? `, gratis di atas ${rupiah(pengaturan.minOrderAntar)}` : ""
                        }`}
                  </span>
                </span>
                <TitikPilih aktif={caraAmbil === "DIANTAR"} />
              </label>
            </div>
          </fieldset>

          {caraAmbil === "DIANTAR" && (
            <div className="mt-5 space-y-4 anim-masuk">
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
                  autoComplete="street-address"
                  value={alamatAntar}
                  onChange={(e) => setAlamatAntar(e.target.value)}
                  placeholder="Nama gedung/komplek, jalan, nomor rumah, RT/RW, patokan"
                  aria-invalid={Boolean(galat.alamatAntar)}
                  className={`isian py-3 ${galat.alamatAntar ? "isian-galat" : ""}`}
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
        <section aria-labelledby="judul-data" id="bagian-data" className="kartu kartu-isi scroll-mt-24">
          <JudulBagian nomor={3} judul="Data pemesan" Ikon={IkonKartuNama} id="judul-data" />

          {!pengguna && (
            <p className="mt-3 text-[14px] text-kayu-sedang">
              Sudah punya akun?{" "}
              <Link href="/masuk?ke=/pesan" className="font-semibold text-bata hover:underline">
                Masuk
              </Link>{" "}
              supaya data terisi otomatis. Tanpa akun juga boleh.
            </p>
          )}

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
                placeholder="Mis. Ibu Ratna"
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
                placeholder="0812 3456 7890"
                aria-invalid={Boolean(galat.teleponPemesan)}
                aria-describedby="petunjuk-telepon"
                className={`isian ${galat.teleponPemesan ? "isian-galat" : ""}`}
              />
              {galat.teleponPemesan ? (
                <GalatField id="petunjuk-telepon" pesan={galat.teleponPemesan[0]} />
              ) : (
                <p id="petunjuk-telepon" className="petunjuk">Dapur akan konfirmasi lewat nomor ini. Juga dipakai untuk melacak pesanan.</p>
              )}
            </div>
          </div>

          <div className="mt-5">
            <label htmlFor="catatanPesanan" className="label">
              Catatan untuk dapur <span className="font-normal text-kayu-sedang">(boleh dikosongkan)</span>
            </label>
            <textarea
              id="catatanPesanan"
              name="catatanPesanan"
              rows={2}
              maxLength={1000}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Mis. sambal dipisah, tidak pedas, label nama peserta"
              className="isian py-3"
            />
          </div>
        </section>

        {/* 4. Pembayaran */}
        <section aria-labelledby="judul-bayar" id="bagian-bayar" className="kartu kartu-isi scroll-mt-24">
          <JudulBagian nomor={4} judul="Cara bayar" Ikon={IkonDompet} id="judul-bayar" />
          <fieldset className="mt-4">
            <legend className="sr-only">Pilih cara bayar</legend>
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
                  <span className="block font-semibold text-kayu">Transfer bank</span>
                  <span className="block text-[14px] text-kayu-sedang mt-0.5">
                    {rekeningTersedia ? `${pengaturan.namaBank} · unggah bukti setelah pesan` : "Belum tersedia"}
                  </span>
                </span>
                <TitikPilih aktif={caraBayar === "TRANSFER"} />
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
                  <span className="block font-semibold text-kayu">Tunai (COD)</span>
                  <span className="block text-[14px] text-kayu-sedang mt-0.5">Bayar saat pesanan diterima</span>
                </span>
                <TitikPilih aktif={caraBayar === "TUNAI"} />
              </label>
            </div>
            <GalatField id="galat-bayar" pesan={galat.caraBayar?.[0]} />
          </fieldset>
        </section>
      </div>

      {/* Ringkasan */}
      <aside aria-labelledby="judul-ringkasan" className="kartu kartu-isi lg:sticky lg:top-24">
        <h2 id="judul-ringkasan" className="judul-bagian">
          Ringkasan pesanan
        </h2>

        {itemTerpilih.length === 0 ? (
          <p className="mt-3 teks-redup">Belum ada menu dipilih.</p>
        ) : (
          <ul className="mt-4 space-y-3 text-[15px]">
            {itemTerpilih.map((it) => (
              <li key={it.id} className="flex justify-between gap-3">
                <span className="text-kayu min-w-0">
                  {it.nama}
                  <span className="block text-[13px] text-kayu-sedang angka-tabel">
                    {it.jumlah} {it.satuan} × {rupiah(it.harga)}
                  </span>
                </span>
                <span className="text-kayu angka-tabel shrink-0">{rupiah(it.subtotal)}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Voucher */}
        <div className="mt-4">
          {kodeTerpakai ? (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-daun-lembut border border-daun/20 px-3 py-2.5 text-[15px] text-daun-tua anim-masuk-skala">
              <span className="min-w-0 truncate flex items-center gap-2">
                <IkonTiket className="w-5 h-5 shrink-0" />
                <span className="font-bold">{kodeTerpakai}</span> terpakai
              </span>
              <button type="button" onClick={lepasVoucher} className="font-semibold underline cursor-pointer shrink-0 min-h-[40px]">
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
                {sedangCek ? "…" : "Pakai"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setVoucherTerbuka(true)}
              className="w-full flex items-center gap-2 rounded-xl border-[1.5px] border-dashed border-kunyit/60 bg-kunyit-lembut/50 px-3 py-3 text-[15px] font-semibold text-kunyit-tua hover:bg-kunyit-lembut cursor-pointer"
            >
              <IkonTiket className="w-5 h-5" />
              Punya kode voucher?
            </button>
          )}
          {pesanVoucher && !kodeTerpakai && (
            <p role="status" className={`mt-2 text-[13px] ${pesanVoucher.ok ? "text-daun-tua" : "text-bahaya"}`}>
              {pesanVoucher.teks}
            </p>
          )}
        </div>

        <dl className="mt-4 pt-4 border-t border-krem-gelap space-y-2 text-[15px]">
          <div className="flex justify-between">
            <dt className="text-kayu-sedang">Subtotal</dt>
            <dd className="angka-tabel">{rupiah(subtotal)}</dd>
          </div>
          {potongan > 0 && kodeTerpakai && (
            <div className="flex justify-between text-daun-tua font-medium">
              <dt>Voucher {kodeTerpakai}</dt>
              <dd className="angka-tabel">−{rupiah(potongan)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-kayu-sedang">Ongkir</dt>
            <dd className="angka-tabel">
              {caraAmbil === "AMBIL_SENDIRI" ? "—" : ongkir === 0 ? <span className="text-daun-tua font-medium">Gratis</span> : rupiah(ongkir)}
            </dd>
          </div>
          <div className="flex justify-between items-baseline pt-3 border-t border-krem-gelap">
            <dt className="font-semibold text-kayu">Total bayar</dt>
            <dd className="text-2xl font-bold text-bata-tua angka-tabel">{rupiah(total)}</dd>
          </div>
        </dl>

        {state && !state.sukses && state.pesan && (
          <div ref={galatRef} tabIndex={-1} role="alert" className="mt-5 kotak-galat focus:outline-none">
            {state.pesan}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || halangan !== null}
          aria-describedby="alasan-kunci"
          className="hidden md:inline-flex tombol-utama tombol-besar w-full mt-5"
        >
          {isPending ? "Mengirim pesanan…" : "Buat pesanan"}
        </button>
        <p id="alasan-kunci" className="mt-2 text-[13px] text-center text-kayu-sedang min-h-[1rem]">
          {halangan?.pesan ?? `Dapur buka ${jamTampil(pengaturan.jamBuka)}–${jamTampil(pengaturan.jamTutup)} WIB. Pesanan bisa dibatalkan selama belum diproses.`}
        </p>
      </aside>

      {/* Bar "Total | Buat pesanan" menempel di bawah — ponsel */}
      <div aria-hidden="true" className="md:hidden h-20" />
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/97 backdrop-blur-md border-t border-krem-gelap shadow-[var(--shadow-mengambang)] aman-bawah">
        <div className="px-4 pt-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] text-kayu-sedang">Total bayar</p>
            <p className="text-lg font-bold text-bata-tua angka-tabel leading-tight">{rupiah(total)}</p>
          </div>
          {halangan ? (
            // Bukan tombol mati: menekannya menjelaskan apa yang kurang dan
            // membawa pembeli ke bagian itu.
            <button type="button" onClick={tunjukkanHalangan} className="tombol-utama opacity-60">
              Buat pesanan
            </button>
          ) : (
            <button type="submit" disabled={isPending} className="tombol-utama">
              {isPending ? "Mengirim…" : "Buat pesanan"}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
