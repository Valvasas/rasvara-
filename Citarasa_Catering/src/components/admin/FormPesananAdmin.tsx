"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { aksiBuatPesananManual, aksiCariPelanggan, aksiUbahPesanan, type PelangganDitemukan } from "@/app/aksi/pesanan-admin";
import { rupiah, teleponTampil } from "@/lib/format";
import { hitungMinimalDp } from "@/lib/pembayaran";
import { PemilihMenu } from "@/components/pesanan/PemilihMenu";
import { KontrolJumlah } from "@/components/pesanan/KontrolJumlah";
import { IkonPeringatan, IkonToko, IkonTruk } from "@/components/ikon/Ikon";
import type { MenuUntukPemesanan } from "@/lib/menu";

type ItemLama = { id: string; namaMenu: string; hargaSatuan: number; satuan: string; jumlah: number; menuId: string | null };

export type PesananUntukDiubah = {
  kode: string;
  namaPemesan: string;
  teleponPemesan: string;
  tanggalAcara: string;
  jamAcara: string;
  caraAmbil: "AMBIL_SENDIRI" | "DIANTAR";
  alamatAntar: string | null;
  caraBayar: "TRANSFER" | "TUNAI";
  catatan: string | null;
  diskon: number;
  kodeVoucher: string | null;
  dibayar: number;
  item: ItemLama[];
};

interface FormPesananAdminProps {
  daftarMenu: MenuUntukPemesanan[];
  ongkirDefault: number;
  minOrderAntar: number;
  persenDp: number;
  adalahPemilik: boolean;
  hariIni: string;
  /** Ada = mode ubah. */
  pesanan?: PesananUntukDiubah;
}

const SUMBER = [
  { nilai: "WHATSAPP", label: "WhatsApp" },
  { nilai: "TELEPON", label: "Telepon" },
  { nilai: "LANGSUNG", label: "Datang langsung" },
] as const;

const keLokal = (n: string) => (n.startsWith("62") ? `0${n.slice(2)}` : n);

/**
 * Formulir pesanan dari dashboard, dioptimalkan untuk diisi sambil menelepon
 * atau membalas chat: cari pelanggan lama dari nomor HP, pilih menu, jadwal,
 * dan (bagi pemilik) catat DP/lunas sekaligus.
 */
export function FormPesananAdmin({ daftarMenu, ongkirDefault, minOrderAntar, persenDp, adalahPemilik, hariIni, pesanan }: FormPesananAdminProps) {
  const ubah = Boolean(pesanan);
  const [state, action, isPending] = useActionState(ubah ? aksiUbahPesanan : aksiBuatPesananManual, null);
  const [, mulai] = useTransition();
  const g = state?.kesalahan ?? {};
  const galatRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state && !state.sukses) galatRef.current?.focus();
  }, [state]);

  // --- Pemesan ---
  const [sumber, setSumber] = useState<(typeof SUMBER)[number]["nilai"]>("WHATSAPP");
  const [telepon, setTelepon] = useState(pesanan ? keLokal(pesanan.teleponPemesan) : "");
  const [nama, setNama] = useState(pesanan?.namaPemesan ?? "");
  const [saran, setSaran] = useState<PelangganDitemukan[]>([]);
  const [saranTerbuka, setSaranTerbuka] = useState(false);

  useEffect(() => {
    if (ubah) return;
    const q = telepon.trim();
    if (q.replace(/\D/g, "").length < 4) {
      setSaran([]);
      return;
    }
    let batal = false;
    const t = setTimeout(async () => {
      try {
        const hasil = await aksiCariPelanggan(q);
        if (!batal) setSaran(hasil);
      } catch {
        if (!batal) setSaran([]);
      }
    }, 300);
    return () => {
      batal = true;
      clearTimeout(t);
    };
  }, [telepon, ubah]);

  // --- Item ---
  const [itemLama, setItemLama] = useState<ItemLama[]>(pesanan?.item ?? []);
  const menuSudahAda = useMemo(() => new Set(itemLama.map((i) => i.menuId).filter(Boolean)), [itemLama]);
  const menuBisaDitambah = useMemo(() => daftarMenu.filter((m) => !menuSudahAda.has(m.id)), [daftarMenu, menuSudahAda]);
  const [jumlahMenu, setJumlahMenu] = useState<Record<string, number>>({});
  const petaMenu = useMemo(() => new Map(daftarMenu.map((m) => [m.id, m])), [daftarMenu]);

  const ubahJumlah = (id: string, n: number) =>
    setJumlahMenu((lama) => {
      const salin = { ...lama };
      if (n <= 0) delete salin[id];
      else salin[id] = n;
      return salin;
    });

  const itemBaru = Object.entries(jumlahMenu).flatMap(([id, jml]) => {
    const m = petaMenu.get(id);
    return m ? [{ ...m, jumlah: jml, subtotal: m.harga * jml }] : [];
  });

  // --- Jadwal ---
  const [tanggal, setTanggal] = useState(pesanan?.tanggalAcara ?? "");
  const [jam, setJam] = useState(pesanan?.jamAcara ?? "11:30");
  const [caraAmbil, setCaraAmbil] = useState<"AMBIL_SENDIRI" | "DIANTAR">(pesanan?.caraAmbil ?? "AMBIL_SENDIRI");
  const [alamat, setAlamat] = useState(pesanan?.alamatAntar ?? "");
  const [catatan, setCatatan] = useState(pesanan?.catatan ?? "");
  const [abaikanBatas, setAbaikanBatas] = useState(false);
  const [langsungTerima, setLangsungTerima] = useState(true);

  // --- Pembayaran ---
  const [caraBayar, setCaraBayar] = useState<"TRANSFER" | "TUNAI">(pesanan?.caraBayar ?? "TUNAI");
  const [kodeVoucher, setKodeVoucher] = useState("");
  const [modeBayar, setModeBayar] = useState<"belum" | "dp" | "lunas">("belum");
  const [jumlahBayar, setJumlahBayar] = useState("");

  const subtotal = itemLama.reduce((n, i) => n + i.hargaSatuan * i.jumlah, 0) + itemBaru.reduce((n, i) => n + i.subtotal, 0);
  const ongkir = caraAmbil === "DIANTAR" && !(minOrderAntar > 0 && subtotal >= minOrderAntar) ? ongkirDefault : 0;
  const diskonLama = pesanan ? Math.min(pesanan.diskon, subtotal) : 0;
  const total = subtotal - diskonLama + ongkir;
  const dpMinimal = caraBayar === "TRANSFER" ? hitungMinimalDp(total, persenDp) : 0;

  // Isi otomatis nominal saat mode bayar dipilih atau total berubah.
  useEffect(() => {
    if (modeBayar === "lunas") setJumlahBayar(String(total));
    if (modeBayar === "dp") setJumlahBayar((lama) => (lama && Number(lama) < total ? lama : String(dpMinimal || Math.ceil(total / 2 / 1000) * 1000)));
    if (modeBayar === "belum") setJumlahBayar("");
  }, [modeBayar, total, dpMinimal]);

  const jumlahItem = itemLama.length + itemBaru.length;
  const alasanTerkunci = (() => {
    if (nama.trim().length < 2) return "Isi nama pemesan.";
    if (telepon.replace(/\D/g, "").length < 8) return "Isi nomor HP pemesan.";
    if (jumlahItem === 0) return "Pilih minimal satu menu.";
    if (!tanggal) return "Tentukan tanggal acara.";
    if (!abaikanBatas && tanggal < hariIni) return "Tanggal sudah lewat (centang pengecualian bila memang disengaja).";
    if (caraAmbil === "DIANTAR" && alamat.trim().length < 10) return "Lengkapi alamat antar.";
    if (modeBayar !== "belum" && !(Number(jumlahBayar) > 0)) return "Isi jumlah uang yang diterima.";
    if (modeBayar !== "belum" && Number(jumlahBayar) > total) return "Jumlah bayar melebihi total.";
    return null;
  })();

  const itemsJson = JSON.stringify([
    ...itemLama.map((i) => ({ itemId: i.id, jumlah: i.jumlah })),
    ...itemBaru.map((i) => ({ menuId: i.id, jumlah: i.jumlah })),
  ]);

  const kirim = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (alasanTerkunci) return;
    const fd = new FormData(e.currentTarget);
    mulai(() => action(fd));
  };

  const pilihPelanggan = (p: PelangganDitemukan) => {
    setNama(p.nama);
    setTelepon(keLokal(p.telepon));
    if (p.alamat) {
      setAlamat(p.alamat);
      setCaraAmbil("DIANTAR");
    }
    setSaranTerbuka(false);
  };

  const kelasPilihan = (aktif: boolean) =>
    `flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-sm cursor-pointer transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-bata/40 ${
      aktif ? "border-bata bg-bata-lembut/50 text-kayu font-medium" : "border-krem-gelap bg-white text-kayu-sedang hover:border-kayu-sedang/30"
    }`;

  return (
    <form onSubmit={kirim} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] items-start pb-24 lg:pb-0">
      <input type="hidden" name="itemsJson" value={itemsJson} />
      {pesanan && <input type="hidden" name="kode" value={pesanan.kode} />}
      <input type="hidden" name="abaikanBatas" value={abaikanBatas ? "1" : "0"} />
      {!ubah && (
        <>
          <input type="hidden" name="sumber" value={sumber} />
          <input type="hidden" name="statusAwal" value={langsungTerima ? "DIKONFIRMASI" : "BARU"} />
          <input type="hidden" name="bayarJumlah" value={modeBayar === "belum" ? "0" : jumlahBayar || "0"} />
          <input type="hidden" name="bayarMetode" value={caraBayar} />
        </>
      )}

      <div className="space-y-6 min-w-0">
        {/* Pemesan */}
        <section aria-labelledby="judul-pemesan" className="kartu kartu-isi">
          <h2 id="judul-pemesan" className="judul-bagian">Pemesan</h2>

          {!ubah && (
            <fieldset className="mt-4">
              <legend className="label">Pesanan masuk lewat</legend>
              <div className="grid grid-cols-3 gap-2">
                {SUMBER.map((s) => (
                  <label key={s.nilai} className={`${kelasPilihan(sumber === s.nilai)} justify-center text-center`}>
                    <input type="radio" name="_sumber" checked={sumber === s.nilai} onChange={() => setSumber(s.nilai)} className="sr-only" />
                    {s.label}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="relative">
              <label htmlFor="teleponPemesan" className="label">Nomor HP / WhatsApp</label>
              <input
                id="teleponPemesan"
                name="teleponPemesan"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                maxLength={20}
                value={telepon}
                onChange={(e) => {
                  setTelepon(e.target.value);
                  setSaranTerbuka(true);
                }}
                onBlur={() => setTimeout(() => setSaranTerbuka(false), 150)}
                onFocus={() => setSaranTerbuka(true)}
                placeholder="08xxxxxxxxxx"
                aria-invalid={g.teleponPemesan ? true : undefined}
                aria-autocomplete="list"
                aria-controls="saran-pelanggan"
                className={`isian ${g.teleponPemesan ? "isian-galat" : ""}`}
              />
              {g.teleponPemesan ? (
                <p className="pesan-galat">{g.teleponPemesan[0]}</p>
              ) : (
                !ubah && <p className="petunjuk">Ketik 4 angka untuk mencari pelanggan lama.</p>
              )}
              {saranTerbuka && saran.length > 0 && (
                <ul
                  id="saran-pelanggan"
                  role="listbox"
                  className="absolute z-20 mt-1 w-full kartu shadow-[var(--shadow-angkat)] overflow-hidden"
                >
                  {saran.map((p) => (
                    <li key={p.telepon} role="option" aria-selected={false}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pilihPelanggan(p)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-krem-tua cursor-pointer"
                      >
                        <span className="block text-sm font-medium text-kayu">{p.nama}</span>
                        <span className="block text-xs text-kayu-sedang">
                          {teleponTampil(p.telepon)} · {p.jumlahPesanan} pesanan
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label htmlFor="namaPemesan" className="label">Nama</label>
              <input
                id="namaPemesan"
                name="namaPemesan"
                type="text"
                maxLength={100}
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                aria-invalid={g.namaPemesan ? true : undefined}
                className={`isian ${g.namaPemesan ? "isian-galat" : ""}`}
              />
              {g.namaPemesan && <p className="pesan-galat">{g.namaPemesan[0]}</p>}
            </div>
          </div>
        </section>

        {/* Menu */}
        <section aria-labelledby="judul-menu-admin" className="kartu kartu-isi">
          <h2 id="judul-menu-admin" className="judul-bagian">Menu</h2>

          {itemLama.length > 0 && (
            <ul className="mt-4 divide-y divide-krem-gelap border-y border-krem-gelap">
              {itemLama.map((it) => (
                <li key={it.id} className="flex items-center gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-kayu">{it.namaMenu}</p>
                    <p className="text-xs text-kayu-sedang">
                      Harga saat dipesan {rupiah(it.hargaSatuan)} / {it.satuan}
                    </p>
                  </div>
                  <KontrolJumlah
                    jumlah={it.jumlah}
                    min={1}
                    satuan={it.satuan}
                    nama={it.namaMenu}
                    onUbah={(n) =>
                      setItemLama((lama) => (n <= 0 ? lama.filter((x) => x.id !== it.id) : lama.map((x) => (x.id === it.id ? { ...x, jumlah: n } : x))))
                    }
                  />
                </li>
              ))}
            </ul>
          )}
          {ubah && <p className="mt-4 text-sm font-medium text-kayu">Tambah menu lain</p>}

          <PemilihMenu
            daftarMenu={menuBisaDitambah}
            jumlahMenu={jumlahMenu}
            onUbah={ubahJumlah}
            idCari="cari-menu-admin"
            abaikanMinimal={abaikanBatas}
          />
          {g.items && <p className="pesan-galat">{g.items[0]}</p>}
        </section>

        {/* Jadwal */}
        <section aria-labelledby="judul-jadwal-admin" className="kartu kartu-isi">
          <h2 id="judul-jadwal-admin" className="judul-bagian">Jadwal &amp; pengambilan</h2>
          <div className="mt-4 grid gap-4 grid-cols-2">
            <div>
              <label htmlFor="tanggalAcara" className="label">Tanggal acara</label>
              <input id="tanggalAcara" name="tanggalAcara" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className={`isian ${g.tanggalAcara ? "isian-galat" : ""}`} />
              {g.tanggalAcara && <p className="pesan-galat">{g.tanggalAcara[0]}</p>}
            </div>
            <div>
              <label htmlFor="jamAcara" className="label">Jam siap</label>
              <input id="jamAcara" name="jamAcara" type="time" value={jam} onChange={(e) => setJam(e.target.value)} className="isian" />
            </div>
          </div>

          <fieldset className="mt-4">
            <legend className="label">Cara pengambilan</legend>
            <div className="grid grid-cols-2 gap-2">
              <label className={kelasPilihan(caraAmbil === "AMBIL_SENDIRI")}>
                <input type="radio" name="caraAmbil" value="AMBIL_SENDIRI" checked={caraAmbil === "AMBIL_SENDIRI"} onChange={() => setCaraAmbil("AMBIL_SENDIRI")} className="sr-only" />
                <IkonToko className="w-4 h-4" /> Ambil sendiri
              </label>
              <label className={kelasPilihan(caraAmbil === "DIANTAR")}>
                <input type="radio" name="caraAmbil" value="DIANTAR" checked={caraAmbil === "DIANTAR"} onChange={() => setCaraAmbil("DIANTAR")} className="sr-only" />
                <IkonTruk className="w-4 h-4" /> Diantar
              </label>
            </div>
          </fieldset>

          {caraAmbil === "DIANTAR" && (
            <div className="mt-4">
              <label htmlFor="alamatAntar" className="label">Alamat antar</label>
              <textarea id="alamatAntar" name="alamatAntar" rows={2} maxLength={500} value={alamat} onChange={(e) => setAlamat(e.target.value)} className={`isian py-2.5 ${g.alamatAntar ? "isian-galat" : ""}`} />
              {g.alamatAntar && <p className="pesan-galat">{g.alamatAntar[0]}</p>}
            </div>
          )}

          <div className="mt-4">
            <label htmlFor="catatanPesanan" className="label">
              Catatan untuk dapur <span className="font-normal text-kayu-sedang">(opsional)</span>
            </label>
            <textarea id="catatanPesanan" name="catatanPesanan" rows={2} maxLength={1000} value={catatan} onChange={(e) => setCatatan(e.target.value)} className="isian py-2.5" />
          </div>
        </section>

        {/* Pembayaran */}
        <section aria-labelledby="judul-bayar-admin" className="kartu kartu-isi">
          <h2 id="judul-bayar-admin" className="judul-bagian">Pembayaran</h2>
          <fieldset className="mt-4">
            <legend className="label">Metode</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["TUNAI", "TRANSFER"] as const).map((m) => (
                <label key={m} className={kelasPilihan(caraBayar === m)}>
                  <input type="radio" name="caraBayar" value={m} checked={caraBayar === m} onChange={() => setCaraBayar(m)} className="sr-only" />
                  {m === "TUNAI" ? "Tunai" : "Transfer"}
                </label>
              ))}
            </div>
          </fieldset>

          {!ubah && (
            <div className="mt-4">
              <label htmlFor="kodeVoucher" className="label">
                Kode voucher <span className="font-normal text-kayu-sedang">(opsional)</span>
              </label>
              <input id="kodeVoucher" name="kodeVoucher" type="text" maxLength={32} value={kodeVoucher} onChange={(e) => setKodeVoucher(e.target.value.toUpperCase())} className="isian uppercase max-w-xs" />
              {kodeVoucher && <p className="petunjuk">Potongan dihitung saat disimpan.</p>}
            </div>
          )}

          {!ubah && adalahPemilik && (
            <fieldset className="mt-5">
              <legend className="label">Uang yang sudah diterima</legend>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["belum", "Belum"],
                    ["dp", "DP"],
                    ["lunas", "Lunas"],
                  ] as const
                ).map(([nilai, label]) => (
                  <label key={nilai} className={`${kelasPilihan(modeBayar === nilai)} justify-center`}>
                    <input type="radio" name="_modeBayar" checked={modeBayar === nilai} onChange={() => setModeBayar(nilai)} className="sr-only" />
                    {label}
                  </label>
                ))}
              </div>
              {modeBayar !== "belum" && (
                <div className="mt-3 max-w-xs">
                  <label htmlFor="jumlahBayar" className="label">Jumlah diterima (Rp)</label>
                  <input
                    id="jumlahBayar"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={total}
                    value={jumlahBayar}
                    readOnly={modeBayar === "lunas"}
                    onChange={(e) => setJumlahBayar(e.target.value)}
                    className="isian angka-tabel"
                  />
                  <p className="petunjuk">Tercatat otomatis di Buku Kas.</p>
                </div>
              )}
            </fieldset>
          )}
        </section>
      </div>

      {/* Ringkasan */}
      <aside className="kartu kartu-isi lg:sticky lg:top-8 space-y-4" aria-labelledby="judul-ringkasan-admin">
        <h2 id="judul-ringkasan-admin" className="judul-bagian">Ringkasan</h2>
        {jumlahItem === 0 ? (
          <p className="teks-redup">Belum ada menu.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {itemLama.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span className="text-kayu">{i.namaMenu} <span className="text-kayu-sedang">×{i.jumlah}</span></span>
                <span className="angka-tabel">{rupiah(i.hargaSatuan * i.jumlah)}</span>
              </li>
            ))}
            {itemBaru.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span className="text-kayu">{i.nama} <span className="text-kayu-sedang">×{i.jumlah}</span></span>
                <span className="angka-tabel">{rupiah(i.subtotal)}</span>
              </li>
            ))}
          </ul>
        )}
        <dl className="pt-3 border-t border-krem-gelap space-y-1.5 text-sm">
          {diskonLama > 0 && (
            <div className="flex justify-between text-daun-tua">
              <dt>Voucher {pesanan?.kodeVoucher}</dt>
              <dd className="angka-tabel">−{rupiah(diskonLama)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-kayu-sedang">Ongkir</dt>
            <dd className="angka-tabel">{caraAmbil === "AMBIL_SENDIRI" ? "—" : ongkir === 0 ? "Gratis" : rupiah(ongkir)}</dd>
          </div>
          <div className="flex justify-between items-baseline pt-2 border-t border-krem-gelap">
            <dt className="font-semibold">Total</dt>
            <dd className="text-xl font-bold angka-tabel">{rupiah(total)}</dd>
          </div>
          {pesanan && pesanan.dibayar > 0 && (
            <div className="flex justify-between text-kayu-sedang">
              <dt>Sudah dibayar</dt>
              <dd className="angka-tabel">{rupiah(pesanan.dibayar)}</dd>
            </div>
          )}
        </dl>

        {!ubah && (
          <label className="flex items-start gap-2.5 text-sm cursor-pointer">
            <input type="checkbox" checked={langsungTerima} onChange={(e) => setLangsungTerima(e.target.checked)} className="mt-0.5 w-4 h-4 accent-bata" />
            <span>Langsung tandai <span className="font-medium">diterima</span> (sudah disepakati dengan pemesan)</span>
          </label>
        )}

        <label className="flex items-start gap-2.5 text-sm cursor-pointer">
          <input type="checkbox" checked={abaikanBatas} onChange={(e) => setAbaikanBatas(e.target.checked)} className="mt-0.5 w-4 h-4 accent-bata" />
          <span>
            Abaikan batas H-, minimal pesan, tanggal libur &amp; kuota
            {abaikanBatas && (
              <span className="mt-1 flex items-start gap-1.5 text-xs text-kunyit-tua">
                <IkonPeringatan className="w-3.5 h-3.5 shrink-0 mt-0.5" /> Pastikan dapur sanggup — pesanan ini tetap masuk walau melebihi kuota.
              </span>
            )}
          </span>
        </label>

        {state && !state.sukses && state.pesan && (
          <div ref={galatRef} tabIndex={-1} role="alert" className="kotak-galat focus:outline-none">
            {state.pesan}
          </div>
        )}

        <button type="submit" disabled={isPending || alasanTerkunci !== null} className="tombol-utama tombol-besar w-full">
          {isPending ? "Menyimpan..." : ubah ? "Simpan perubahan" : "Simpan pesanan"}
        </button>
        <p className="text-xs text-center text-kayu-sedang min-h-[1rem]">{alasanTerkunci ?? " "}</p>
        {pesanan && (
          <Link href={`/admin/pesanan/${pesanan.kode}`} className="tombol-hantu w-full">
            Batal mengubah
          </Link>
        )}
      </aside>
    </form>
  );
}
