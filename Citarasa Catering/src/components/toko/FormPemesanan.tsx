"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { aksiBuatPesanan } from "@/app/aksi/pesanan";
import { aksiCekVoucher } from "@/app/aksi/voucher";
import dynamic from "next/dynamic";

// Berkas peta (Leaflet + CSS-nya) baru diunduh saat pembeli memilih diantar,
// sehingga pembeli yang ambil sendiri tidak ikut menanggung ongkos unduhnya.
const PetaLokasiAntar = dynamic(
  () => import("@/components/toko/PetaLokasiAntar").then((m) => m.PetaLokasiAntar),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-64 rounded-2xl border border-krem-gelap bg-krem-tua/60 flex items-center justify-center text-xs text-kayu-sedang">
        Menyiapkan peta...
      </div>
    ),
  }
);
import {
  dariInputTanggal,
  hariIniWib,
  kunciHari,
  menitDariJam,
  menitSekarangWib,
  rupiah,
} from "@/lib/format";
import { IkonPeringatan } from "@/components/ikon/Ikon";
import { LABEL_KATEGORI, URUTAN_KATEGORI } from "@/lib/pesanan";
import type { MenuUntukPemesanan } from "@/lib/menu";
import type { KategoriMenu, Pengaturan, Pengguna } from "@/generated/prisma/client";

interface FormPemesananProps {
  daftarMenu: MenuUntukPemesanan[];
  menuAwalSlug?: string;
  pengaturan: Pengaturan;
  tanggalLibur: string[];
  pengguna: Pengguna | null;
}

/**
 * Berapa kartu menu yang ditampilkan sekaligus sebelum tombol "tampilkan
 * lainnya". Katalog katering bisa tumbuh sampai ratusan item, dan menumpuk
 * semuanya dalam satu kolom panjang membuat bagian jadwal & data pemesan di
 * bawahnya praktis tidak pernah terlihat.
 */
const TAMPIL_AWAL = 8;

export function FormPemesanan({
  daftarMenu,
  menuAwalSlug,
  pengaturan,
  tanggalLibur,
  pengguna,
}: FormPemesananProps) {
  const [state, action, isPending] = useActionState(aksiBuatPesanan, null);

  // Menelusuri seluruh daftar untuk tiap menu yang dipilih membuat kerjanya
  // tumbuh sebanyak (jumlah menu x jumlah pilihan) pada setiap penekanan tombol
  // tambah/kurang. Peta ini membuat pencariannya langsung.
  const petaMenu = useMemo(
    () => new Map(daftarMenu.map((m) => [m.id, m])),
    [daftarMenu]
  );

  // State kuantiti per menu id
  const [jumlahMenu, setJumlahMenu] = useState<Record<string, number>>(() => {
    const awal: Record<string, number> = {};
    if (menuAwalSlug) {
      const match = daftarMenu.find((m) => m.slug === menuAwalSlug);
      if (match) {
        awal[match.id] = match.minPesan;
      }
    }
    return awal;
  });

  // --- Penyaring katalog ---
  // Pembeli yang tiba lewat tombol "Pesan Menu Ini" harus langsung melihat menu
  // yang ia klik, bukan mencarinya sendiri di antara kartu yang lain.
  const [cari, setCari] = useState(
    () => daftarMenu.find((m) => m.slug === menuAwalSlug)?.nama ?? ""
  );
  const [kategoriAktif, setKategoriAktif] = useState<KategoriMenu | "SEMUA">(
    "SEMUA"
  );
  const [batasTampil, setBatasTampil] = useState(TAMPIL_AWAL);

  const kategoriTersedia = useMemo(() => {
    const ada = new Set(daftarMenu.map((m) => m.kategori));
    return URUTAN_KATEGORI.filter((k) => ada.has(k));
  }, [daftarMenu]);

  const menuTersaring = useMemo(() => {
    const kunci = cari.trim().toLowerCase();
    return daftarMenu.filter((m) => {
      if (kategoriAktif !== "SEMUA" && m.kategori !== kategoriAktif) return false;
      if (!kunci) return true;
      return (
        m.nama.toLowerCase().includes(kunci) ||
        m.deskripsi.toLowerCase().includes(kunci)
      );
    });
  }, [daftarMenu, cari, kategoriAktif]);

  // Mengganti penyaring mengembalikan daftar ke panjang semula, supaya hasil
  // pencarian baru tidak diam-diam mewarisi "tampilkan lainnya" sebelumnya.
  useEffect(() => {
    setBatasTampil(TAMPIL_AWAL);
  }, [cari, kategoriAktif]);

  const menuTampil = useMemo(
    () => menuTersaring.slice(0, batasTampil),
    [menuTersaring, batasTampil]
  );

  const [caraAmbil, setCaraAmbil] = useState<"AMBIL_SENDIRI" | "DIANTAR">(
    "AMBIL_SENDIRI"
  );
  const [caraBayar, setCaraBayar] = useState<"TRANSFER" | "TUNAI">("TRANSFER");
  const [tanggalAcara, setTanggalAcara] = useState<string>("");
  const [jamAcara, setJamAcara] = useState<string>("11:30");
  const [koordinat, setKoordinat] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const ringkasanRef = useRef<HTMLElement>(null);

  // Update kuantiti
  const ubahJumlah = (menuId: string, jumlah: number, minPesan: number) => {
    setJumlahMenu((prev) => {
      const copy = { ...prev };
      if (jumlah <= 0) {
        delete copy[menuId];
      } else {
        copy[menuId] = Math.max(minPesan, jumlah);
      }
      return copy;
    });
  };

  // Item yang dipilih
  const itemTerpilih = useMemo(() => {
    return Object.entries(jumlahMenu)
      .map(([id, jml]) => {
        const m = petaMenu.get(id);
        if (!m || jml <= 0) return null;
        return {
          menuId: m.id,
          nama: m.nama,
          harga: m.harga,
          satuan: m.satuan,
          minPesan: m.minPesan,
          preorderHari: m.preorderHari,
          jumlah: jml,
          subtotal: m.harga * jml,
        };
      })
      .filter(Boolean);
  }, [jumlahMenu, petaMenu]);

  // Maksimal preorder hari dari menu yang dipilih
  const maxPreorder = useMemo(() => {
    if (itemTerpilih.length === 0) return 0;
    return Math.max(...itemTerpilih.map((i) => i!.preorderHari));
  }, [itemTerpilih]);

  // Minimum tanggal pemesanan (hari ini + maxPreorder), dihitung dalam WIB.
  // `toISOString()` memakai UTC, sehingga antara pukul 00.00-07.00 WIB tanggal
  // minimumnya mundur sehari dan pembeli dini hari melihat tanggal kemarin.
  const minTanggal = useMemo(() => {
    const d = dariInputTanggal(hariIniWib());
    d.setUTCDate(d.getUTCDate() + maxPreorder);
    return kunciHari(d);
  }, [maxPreorder]);

  // Jam acara hari ini yang sudah terlewat harus tertahan di sini, bukan baru
  // ditolak server setelah pembeli mengisi seluruh formulir.
  const jamSudahLewat = useMemo(() => {
    if (!tanggalAcara || tanggalAcara !== hariIniWib()) return false;
    return menitDariJam(jamAcara) <= menitSekarangWib();
  }, [tanggalAcara, jamAcara]);

  // Perhitungan Subtotal dan Ongkir
  const subtotal = useMemo(() => {
    return itemTerpilih.reduce((acc, curr) => acc + (curr?.subtotal || 0), 0);
  }, [itemTerpilih]);

  const ongkir = useMemo(() => {
    if (caraAmbil !== "DIANTAR") return 0;
    if (
      pengaturan.minOrderAntar > 0 &&
      subtotal >= pengaturan.minOrderAntar
    ) {
      return 0; // Gratis ongkir
    }
    return pengaturan.ongkirDefault;
  }, [caraAmbil, subtotal, pengaturan]);

  // --- Voucher ---
  const [kodeInput, setKodeInput] = useState("");
  const [kodeTerpakai, setKodeTerpakai] = useState<string | null>(null);
  const [potongan, setPotongan] = useState(0);
  const [pesanVoucher, setPesanVoucher] = useState<string | null>(null);
  const [sedangCek, mulaiCekVoucher] = useTransition();

  // Potongan dihitung ulang setiap subtotal berubah. Tanpa ini, pembeli yang
  // menambah atau mengurangi porsi setelah memakai voucher akan melihat angka
  // potongan lama yang sudah tidak sesuai — dan tampilan jadi berbeda dari
  // hitungan server saat pesanan benar-benar dibuat.
  // Ditunda sesaat, bukan dikirim tiap penekanan tombol tambah/kurang. Menaikkan
  // porsi dari 10 ke 20 berarti sepuluh penekanan; tanpa jeda ini tiap
  // penekanan jadi satu panggilan server, dan pembeli malah kena batas laju
  // pengecekan voucher lalu kehilangan potongannya di tengah mengisi formulir.
  useEffect(() => {
    if (!kodeTerpakai) return;

    let dibatalkan = false;
    const penunda = setTimeout(() => {
      aksiCekVoucher(kodeTerpakai, subtotal).then((hasil) => {
        if (dibatalkan) return;
        if (hasil.berlaku) {
          setPotongan(hasil.potongan);
          setPesanVoucher(null);
        } else {
          setKodeTerpakai(null);
          setPotongan(0);
          setPesanVoucher(hasil.pesan);
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
      setPesanVoucher("Masukkan kode voucher terlebih dahulu.");
      return;
    }
    mulaiCekVoucher(async () => {
      const hasil = await aksiCekVoucher(kode, subtotal);
      if (hasil.berlaku) {
        setKodeTerpakai(hasil.kode);
        setPotongan(hasil.potongan);
        setPesanVoucher(hasil.deskripsi ?? hasil.pesan);
      } else {
        setKodeTerpakai(null);
        setPotongan(0);
        setPesanVoucher(hasil.pesan);
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

  // Items JSON string untuk input tersembunyi
  const itemsJson = useMemo(() => {
    return JSON.stringify(
      itemTerpilih.map((i) => ({
        menuId: i!.menuId,
        jumlah: i!.jumlah,
      }))
    );
  }, [itemTerpilih]);

  // Pengecekan tanggal libur
  const isTanggalLibur = tanggalLibur.includes(tanggalAcara);

  const lihatRingkasan = () => {
    ringkasanRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <form
      action={action}
      className={`space-y-8 ${itemTerpilih.length > 0 ? "pb-24 lg:pb-0" : ""}`}
    >
      {/* Bar total mengambang: agar total belanja selalu terlihat saat mengisi form panjang */}
      {itemTerpilih.length > 0 && (
        <div
          className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-krem-gelap shadow-[0_-6px_24px_rgba(69,26,3,0.1)] lg:hidden anim-masuk-skala"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] text-kayu-sedang block leading-tight">
                {itemTerpilih.length} menu dipilih
              </span>
              <span className="font-extrabold text-bata text-lg leading-tight">
                {rupiah(total)}
              </span>
            </div>
            <button
              type="button"
              onClick={lihatRingkasan}
              className="min-h-[48px] shrink-0 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-bata hover:bg-bata-tua transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Lihat Ringkasan</span>
              <span aria-hidden="true">&darr;</span>
            </button>
          </div>
        </div>
      )}

      {state?.pesan && (
        <div className="p-4 bg-bahaya-lembut border border-bahaya/30 text-bahaya rounded-2xl text-sm font-semibold text-center">
          {state.pesan}
        </div>
      )}

      {/* Bagian 1: Pilih Hidangan */}
      <section className="permukaan-kartu rounded-3xl p-6 md:p-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-kayu">1. Pilih Menu Catering</h2>
          <p className="text-xs text-kayu-sedang mt-1">
            Tentukan menu dan jumlah porsi yang Anda butuhkan.
          </p>
        </div>

        {/* Penyaring katalog: cari nama hidangan atau pilih kategorinya */}
        <div className="space-y-3">
          <label htmlFor="cari-menu" className="sr-only">
            Cari menu
          </label>
          <input
            id="cari-menu"
            type="search"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari hidangan, misalnya: ayam, tumpeng, risoles..."
            autoComplete="off"
            className="w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-krem-gelap bg-krem/40 text-kayu text-sm focus:outline-none focus:border-bata focus:ring-1 focus:ring-bata"
          />

          {kategoriTersedia.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {(["SEMUA", ...kategoriTersedia] as const).map((k) => {
                const aktif = kategoriAktif === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKategoriAktif(k)}
                    aria-pressed={aktif}
                    className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      aktif
                        ? "bg-bata text-white shadow-sm"
                        : "bg-white text-kayu border border-krem-gelap hover:bg-krem-tua"
                    }`}
                  >
                    {k === "SEMUA" ? "Semua" : LABEL_KATEGORI[k]}
                  </button>
                );
              })}
            </div>
          )}

          <p role="status" className="text-[11px] text-kayu-sedang">
            Menampilkan {menuTampil.length} dari {menuTersaring.length} hidangan
            {itemTerpilih.length > 0
              ? ` · ${itemTerpilih.length} sudah dipilih`
              : ""}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {menuTampil.map((m) => {
            const jml = jumlahMenu[m.id] || 0;
            const dipilih = jml > 0;

            return (
              <div
                key={m.id}
                className={`p-4 rounded-2xl border transition-all ${
                  dipilih
                    ? "border-bata bg-bata-lembut/30 ring-1 ring-bata"
                    : "border-krem-gelap bg-krem/20 hover:border-krem-gelap"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-kayu">{m.nama}</h3>
                    <p className="text-xs text-kayu-sedang mt-0.5 line-clamp-1">
                      {m.deskripsi}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="font-extrabold text-bata">
                        {rupiah(m.harga)}
                      </span>
                      <span className="text-kayu-sedang">/ {m.satuan}</span>
                      <span className="text-kayu-sedang/80 bg-white px-2 py-0.5 rounded border border-krem-gelap text-[11px]">
                        Min. {m.minPesan}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Kontrol Kuantiti */}
                <div className="mt-4 pt-3 border-t border-krem-gelap/60 flex items-center justify-between">
                  <span className="text-xs font-semibold text-kayu-sedang">
                    {dipilih ? `${jml} ${m.satuan}` : "Belum dipilih"}
                  </span>

                  <div className="flex items-center gap-2">
                    {dipilih ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            ubahJumlah(
                              m.id,
                              jml - 1 < m.minPesan ? 0 : jml - 1,
                              m.minPesan
                            )
                          }
                          className="w-10 h-10 rounded-xl bg-white border border-krem-gelap text-kayu font-bold text-lg hover:bg-krem-tua flex items-center justify-center cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-10 text-center font-bold text-sm text-kayu">
                          {jml}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            ubahJumlah(m.id, jml + 1, m.minPesan)
                          }
                          className="w-10 h-10 rounded-xl bg-bata text-white font-bold text-lg hover:bg-bata-tua flex items-center justify-center cursor-pointer"
                        >
                          +
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          ubahJumlah(m.id, m.minPesan, m.minPesan)
                        }
                        className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold text-bata bg-white border border-bata hover:bg-bata hover:text-white transition-colors cursor-pointer"
                      >
                        + Tambah Menu
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {menuTersaring.length === 0 && (
          <p className="text-xs text-kayu-sedang text-center py-4">
            Tidak ada hidangan yang cocok dengan pencarian Anda.
          </p>
        )}

        {menuTersaring.length > menuTampil.length && (
          <button
            type="button"
            onClick={() => setBatasTampil((n) => n + TAMPIL_AWAL)}
            className="w-full min-h-[48px] px-6 py-2.5 rounded-xl font-bold text-sm text-kayu bg-krem-tua border border-krem-gelap hover:bg-krem-gelap transition-colors cursor-pointer"
          >
            Tampilkan {menuTersaring.length - menuTampil.length} hidangan lainnya
          </button>
        )}

        {itemTerpilih.length === 0 && (
          <p className="text-xs text-bahaya font-medium text-center">
            Pilih minimal satu hidangan di atas untuk melanjutkan pemesanan.
          </p>
        )}

        <input type="hidden" name="itemsJson" value={itemsJson} />
      </section>

      {/* Bagian 2: Waktu & Pengiriman */}
      <section className="permukaan-kartu rounded-3xl p-6 md:p-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-kayu">2. Jadwal & Pengiriman</h2>
          <p className="text-xs text-kayu-sedang mt-1">
            Waktu pengantaran dan alamat acara Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="tanggalAcara"
              className="block text-xs font-bold uppercase tracking-wider text-kayu-sedang mb-1.5"
            >
              Tanggal Acara
            </label>
            <input
              type="date"
              id="tanggalAcara"
              name="tanggalAcara"
              required
              min={minTanggal}
              value={tanggalAcara}
              onChange={(e) => setTanggalAcara(e.target.value)}
              className="w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-krem-gelap bg-krem/40 text-kayu text-sm focus:outline-none focus:border-bata focus:ring-1 focus:ring-bata"
            />
            {maxPreorder > 0 && (
              <p className="text-[11px] text-kunyit-tua font-medium mt-1">
                *Menu yang Anda pilih memerlukan preorder minimal {maxPreorder} hari.
              </p>
            )}
            {isTanggalLibur && (
              <p className="text-xs text-bahaya font-semibold mt-1 flex items-center gap-1.5">
                <IkonPeringatan className="w-3.5 h-3.5 shrink-0" />
                <span>Dapur tutup pada tanggal yang Anda pilih. Silakan pilih tanggal lain.</span>
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="jamAcara"
              className="block text-xs font-bold uppercase tracking-wider text-kayu-sedang mb-1.5"
            >
              Jam Dibutuhkan / Diantar (WIB)
            </label>
            <input
              type="time"
              id="jamAcara"
              name="jamAcara"
              required
              value={jamAcara}
              onChange={(e) => setJamAcara(e.target.value)}
              aria-invalid={jamSudahLewat}
              aria-describedby="petunjuk-jam"
              className={`w-full min-h-[48px] px-4 py-2.5 rounded-xl border bg-krem/40 text-kayu text-sm focus:outline-none focus:ring-1 ${
                jamSudahLewat
                  ? "border-bahaya focus:border-bahaya focus:ring-bahaya"
                  : "border-krem-gelap focus:border-bata focus:ring-bata"
              }`}
            />
            <p id="petunjuk-jam" className="text-[11px] text-kayu-sedang mt-1">
              {jamSudahLewat ? (
                <span className="text-bahaya font-semibold inline-flex items-center gap-1.5">
                  <IkonPeringatan className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Jam ini sudah lewat hari ini. Pilih jam yang lebih malam
                    atau ganti tanggalnya.
                  </span>
                </span>
              ) : (
                "Disarankan 30-45 menit sebelum acara dimulai."
              )}
            </p>
          </div>
        </div>

        {/* Pilihan Cara Ambil */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-kayu-sedang mb-2">
            Cara Pengambilan
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`p-4 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                caraAmbil === "AMBIL_SENDIRI"
                  ? "border-bata bg-bata-lembut/30 ring-1 ring-bata"
                  : "border-krem-gelap bg-krem/20 hover:border-krem-gelap"
              }`}
            >
              <input
                type="radio"
                name="caraAmbil"
                value="AMBIL_SENDIRI"
                checked={caraAmbil === "AMBIL_SENDIRI"}
                onChange={() => setCaraAmbil("AMBIL_SENDIRI")}
                className="w-4 h-4 text-bata"
              />
              <div>
                <span className="font-bold text-sm text-kayu block">
                  Ambil Sendiri di Dapur
                </span>
                <span className="text-xs text-kayu-sedang">
                  Gratis ongkir (diambil langsung ke dapur)
                </span>
              </div>
            </label>

            <label
              className={`p-4 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                caraAmbil === "DIANTAR"
                  ? "border-bata bg-bata-lembut/30 ring-1 ring-bata"
                  : "border-krem-gelap bg-krem/20 hover:border-krem-gelap"
              }`}
            >
              <input
                type="radio"
                name="caraAmbil"
                value="DIANTAR"
                checked={caraAmbil === "DIANTAR"}
                onChange={() => setCaraAmbil("DIANTAR")}
                className="w-4 h-4 text-bata"
              />
              <div>
                <span className="font-bold text-sm text-kayu block">
                  Diantar Kurir ke Lokasi
                </span>
                <span className="text-xs text-kayu-sedang">
                  {ongkir === 0
                    ? "Gratis Ongkir Promo"
                    : `${rupiah(pengaturan.ongkirDefault)} ongkir area sekitar`}
                </span>
              </div>
            </label>
          </div>
        </div>

        {caraAmbil === "DIANTAR" && (
          <div>
            <label
              htmlFor="alamatAntar"
              className="block text-xs font-bold uppercase tracking-wider text-kayu-sedang mb-1.5"
            >
              Alamat Lengkap Pengantaran
            </label>
            <textarea
              id="alamatAntar"
              name="alamatAntar"
              rows={3}
              required
              defaultValue={pengguna?.alamat || ""}
              placeholder="Nama gedung/komplek, nomor jalan/rumah, RT/RW, patokan..."
              className="w-full p-3 rounded-xl border border-krem-gelap bg-krem/40 text-kayu text-sm focus:outline-none focus:border-bata focus:ring-1 focus:ring-bata"
            />
          </div>
        )}

        {/* Peta hanya dimuat saat benar-benar diantar: membuka peta berarti
            menghubungi server ubin pihak ketiga, dan itu tidak perlu terjadi
            pada pembeli yang ambil sendiri. */}
        {caraAmbil === "DIANTAR" && (
          <>
            <input type="hidden" name="latitude" value={koordinat?.lat ?? ""} />
            <input type="hidden" name="longitude" value={koordinat?.lng ?? ""} />
            <PetaLokasiAntar
              latitude={koordinat?.lat ?? null}
              longitude={koordinat?.lng ?? null}
              onPindah={(lat, lng) => setKoordinat({ lat, lng })}
              onHapus={() => setKoordinat(null)}
            />
          </>
        )}
      </section>

      {/* Bagian 3: Data Pemesan & Pembayaran */}
      <section className="permukaan-kartu rounded-3xl p-6 md:p-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-kayu">3. Data Pemesan & Pembayaran</h2>
          <p className="text-xs text-kayu-sedang mt-1">
            Informasi untuk konfirmasi pesanan dan status invoice.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="namaPemesan"
              className="block text-xs font-bold uppercase tracking-wider text-kayu-sedang mb-1.5"
            >
              Nama Lengkap Pemesan
            </label>
            <input
              type="text"
              id="namaPemesan"
              name="namaPemesan"
              required
              defaultValue={pengguna?.nama || ""}
              placeholder="Contoh: Ibu Ratna"
              className="w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-krem-gelap bg-krem/40 text-kayu text-sm focus:outline-none focus:border-bata focus:ring-1 focus:ring-bata"
            />
          </div>

          <div>
            <label
              htmlFor="teleponPemesan"
              className="block text-xs font-bold uppercase tracking-wider text-kayu-sedang mb-1.5"
            >
              Nomor WhatsApp / HP Aktif
            </label>
            <input
              type="tel"
              id="teleponPemesan"
              name="teleponPemesan"
              inputMode="tel"
              required
              defaultValue={pengguna?.telepon || ""}
              placeholder="081234567890"
              className="w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-krem-gelap bg-krem/40 text-kayu text-sm focus:outline-none focus:border-bata focus:ring-1 focus:ring-bata"
            />
          </div>
        </div>

        {/* Pilihan Cara Bayar */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-kayu-sedang mb-2">
            Metode Pembayaran
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`p-4 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                caraBayar === "TRANSFER"
                  ? "border-bata bg-bata-lembut/30 ring-1 ring-bata"
                  : "border-krem-gelap bg-krem/20 hover:border-krem-gelap"
              }`}
            >
              <input
                type="radio"
                name="caraBayar"
                value="TRANSFER"
                checked={caraBayar === "TRANSFER"}
                onChange={() => setCaraBayar("TRANSFER")}
                className="w-4 h-4 text-bata"
              />
              <div>
                <span className="font-bold text-sm text-kayu block">
                  Transfer Bank
                </span>
                <span className="text-xs text-kayu-sedang">
                  {pengaturan.namaBank || "BCA / Mandiri / BRI"}
                </span>
              </div>
            </label>

            <label
              className={`p-4 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                caraBayar === "TUNAI"
                  ? "border-bata bg-bata-lembut/30 ring-1 ring-bata"
                  : "border-krem-gelap bg-krem/20 hover:border-krem-gelap"
              }`}
            >
              <input
                type="radio"
                name="caraBayar"
                value="TUNAI"
                checked={caraBayar === "TUNAI"}
                onChange={() => setCaraBayar("TUNAI")}
                className="w-4 h-4 text-bata"
              />
              <div>
                <span className="font-bold text-sm text-kayu block">
                  Bayar Tunai Saat Terima
                </span>
                <span className="text-xs text-kayu-sedang">
                  Bayar tunai kepada kurir / di dapur
                </span>
              </div>
            </label>
          </div>
        </div>

        <div>
          <label
            htmlFor="catatanPesanan"
            className="block text-xs font-bold uppercase tracking-wider text-kayu-sedang mb-1.5"
          >
            Catatan Khusus untuk Dapur (Opsional)
          </label>
          <textarea
            id="catatanPesanan"
            name="catatanPesanan"
            rows={2}
            placeholder="Contoh: Sambal dipisah semua, kemasan diberi label nama peserta..."
            className="w-full p-3 rounded-xl border border-krem-gelap bg-krem/40 text-kayu text-sm focus:outline-none focus:border-bata focus:ring-1 focus:ring-bata"
          />
        </div>
      </section>

      {/* Ringkasan Biaya & Tombol Submit */}
      <section
        ref={ringkasanRef}
        className="bg-kayu text-krem rounded-3xl p-6 md:p-8 space-y-6 shadow-xl scroll-mt-24"
      >
        <h3 className="text-lg font-bold text-white border-b border-krem/20 pb-3">
          Ringkasan Pemesanan
        </h3>

        <div className="space-y-2 text-sm">
          {itemTerpilih.map((it) => (
            <div
              key={it!.menuId}
              className="flex items-center justify-between text-krem/90 text-xs"
            >
              <span>
                {it!.nama} ({it!.jumlah} {it!.satuan})
              </span>
              <span className="font-semibold">{rupiah(it!.subtotal)}</span>
            </div>
          ))}

          <div className="flex items-center justify-between pt-3 border-t border-krem/20">
            <span>Subtotal Hidangan</span>
            <span className="font-bold">{rupiah(subtotal)}</span>
          </div>

          {potongan > 0 && kodeTerpakai && (
            <div className="flex items-center justify-between text-xs text-daun-lembut">
              <span>Potongan voucher {kodeTerpakai}</span>
              <span className="font-semibold">-{rupiah(potongan)}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-krem/80">
            <span>Ongkos Pengantaran</span>
            <span>{ongkir === 0 ? "Gratis" : rupiah(ongkir)}</span>
          </div>

          <div className="flex items-center justify-between text-lg font-extrabold text-white pt-3 border-t border-krem/20">
            <span>Total Bayar</span>
            <span className="text-kunyit">{rupiah(total)}</span>
          </div>
        </div>

        {/* Kode voucher */}
        <div className="pt-1 space-y-2">
          <input type="hidden" name="kodeVoucher" value={kodeTerpakai ?? ""} />

          {kodeTerpakai ? (
            // Voucher yang berhasil dipakai tampil sebagai tiket kecil dengan
            // takik, supaya terasa seperti kupon yang benar-benar ditempelkan
            // ke pesanan — bukan sekadar kotak pemberitahuan.
            <div className="tiket-tegak flex items-stretch overflow-hidden rounded-xl bg-krem anim-masuk-skala">
              <div className="shrink-0 px-3.5 py-3 bg-kunyit-lembut flex flex-col items-center justify-center">
                <span className="label-mikro text-kunyit-tua/80 text-[9px]">
                  Hemat
                </span>
                <span className="uang font-extrabold text-kayu text-sm leading-tight">
                  {rupiah(potongan)}
                </span>
              </div>

              <div className="garis-sobek" />

              <div className="flex-1 min-w-0 px-3.5 py-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="kode-cetak text-xs text-kayu truncate">
                    {kodeTerpakai}
                  </p>
                  <p className="text-[10px] text-kayu-sedang">Voucher terpakai</p>
                </div>
                <button
                  type="button"
                  onClick={lepasVoucher}
                  className="shrink-0 min-h-[40px] px-3 py-2 rounded-lg text-[11px] font-bold text-kayu-sedang hover:text-bahaya hover:bg-bahaya-lembut transition-colors cursor-pointer"
                >
                  Lepas
                </button>
              </div>
            </div>
          ) : (
            <>
              <label
                htmlFor="input-voucher"
                className="block text-[11px] font-bold uppercase tracking-wider text-krem/70"
              >
                Punya kode voucher?
              </label>
              <div className="flex gap-2">
                <input
                  id="input-voucher"
                  type="text"
                  value={kodeInput}
                  onChange={(e) => setKodeInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    // Enter di kolom ini memeriksa voucher, bukan mengirim
                    // seluruh pesanan — kesalahan klasik yang bikin pesanan
                    // terkirim setengah jadi.
                    if (e.key === "Enter") {
                      e.preventDefault();
                      cekVoucher();
                    }
                  }}
                  placeholder="Contoh: HEMAT10"
                  autoComplete="off"
                  className="flex-1 min-w-0 min-h-[48px] px-4 py-2.5 rounded-xl bg-krem/10 border border-krem/25 text-white text-sm placeholder:text-krem/40 focus:outline-none focus:border-kunyit"
                />
                <button
                  type="button"
                  onClick={cekVoucher}
                  disabled={sedangCek}
                  className="shrink-0 min-h-[48px] px-5 py-2.5 rounded-xl font-bold text-xs text-kayu bg-krem hover:bg-white disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {sedangCek ? "Cek..." : "Pakai"}
                </button>
              </div>
            </>
          )}

          {pesanVoucher && (
            <p
              role="status"
              className={`text-[11px] font-semibold ${
                kodeTerpakai ? "text-daun-lembut" : "text-kunyit"
              }`}
            >
              {pesanVoucher}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={
            isPending || itemTerpilih.length === 0 || isTanggalLibur || jamSudahLewat
          }
          className="w-full min-h-[52px] px-8 py-3.5 rounded-2xl font-bold text-base text-kayu bg-kunyit hover:bg-kunyit-lembut disabled:opacity-50 transition-all shadow-md inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>{isPending ? "Memproses Pesanan..." : "Kirim & Buat Pesanan"}</span>
          {!isPending && <span aria-hidden="true">&rarr;</span>}
        </button>

        <p className="text-[11px] text-krem/70 text-center">
          Setelah pesanan dibuat, Anda akan mendapatkan kode nota digital dan tautan
          konfirmasi via WhatsApp.
        </p>
      </section>
    </form>
  );
}

