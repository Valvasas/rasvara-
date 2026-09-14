"use client";

import { useActionState, useMemo, useState } from "react";
import { aksiBuatPesanan } from "@/app/aksi/pesanan";
import { rupiah } from "@/lib/format";
import type { Menu, Pengaturan, Pengguna } from "@/generated/prisma/client";

interface FormPemesananProps {
  daftarMenu: Menu[];
  menuAwalSlug?: string;
  pengaturan: Pengaturan;
  tanggalLibur: string[];
  pengguna: Pengguna | null;
}

export function FormPemesanan({
  daftarMenu,
  menuAwalSlug,
  pengaturan,
  tanggalLibur,
  pengguna,
}: FormPemesananProps) {
  const [state, action, isPending] = useActionState(aksiBuatPesanan, null);

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

  const [caraAmbil, setCaraAmbil] = useState<"AMBIL_SENDIRI" | "DIANTAR">(
    "AMBIL_SENDIRI"
  );
  const [caraBayar, setCaraBayar] = useState<"TRANSFER" | "TUNAI">("TRANSFER");
  const [tanggalAcara, setTanggalAcara] = useState<string>("");

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
        const m = daftarMenu.find((item) => item.id === id);
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
  }, [jumlahMenu, daftarMenu]);

  // Maksimal preorder hari dari menu yang dipilih
  const maxPreorder = useMemo(() => {
    if (itemTerpilih.length === 0) return 0;
    return Math.max(...itemTerpilih.map((i) => i!.preorderHari));
  }, [itemTerpilih]);

  // Minimum tanggal pemesanan (hari ini + maxPreorder)
  const minTanggal = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + maxPreorder);
    return d.toISOString().split("T")[0];
  }, [maxPreorder]);

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

  const total = subtotal + ongkir;

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

  return (
    <form action={action} className="space-y-8">
      {state?.pesan && (
        <div className="p-4 bg-bahaya-lembut border border-bahaya/30 text-bahaya rounded-2xl text-sm font-semibold text-center">
          {state.pesan}
        </div>
      )}

      {/* Bagian 1: Pilih Hidangan */}
      <section className="bg-white rounded-3xl border border-krem-gelap p-6 md:p-8 space-y-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-kayu">1. Pilih Menu Catering</h2>
          <p className="text-xs text-kayu-sedang mt-1">
            Tentukan menu dan jumlah porsi yang Anda butuhkan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {daftarMenu.map((m) => {
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

        {itemTerpilih.length === 0 && (
          <p className="text-xs text-bahaya font-medium text-center">
            Pilih minimal satu hidangan di atas untuk melanjutkan pemesanan.
          </p>
        )}

        <input type="hidden" name="itemsJson" value={itemsJson} />
      </section>

      {/* Bagian 2: Waktu & Pengiriman */}
      <section className="bg-white rounded-3xl border border-krem-gelap p-6 md:p-8 space-y-6 shadow-sm">
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
              <p className="text-xs text-bahaya font-semibold mt-1">
                ⚠️ Dapur tutup pada tanggal yang Anda pilih. Silakan pilih tanggal lain.
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
              defaultValue="11:30"
              className="w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-krem-gelap bg-krem/40 text-kayu text-sm focus:outline-none focus:border-bata focus:ring-1 focus:ring-bata"
            />
            <p className="text-[11px] text-kayu-sedang mt-1">
              Disarankan 30-45 menit sebelum acara dimulai.
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
      </section>

      {/* Bagian 3: Data Pemesan & Pembayaran */}
      <section className="bg-white rounded-3xl border border-krem-gelap p-6 md:p-8 space-y-6 shadow-sm">
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
      <section className="bg-kayu text-krem rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
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

          <div className="flex items-center justify-between text-xs text-krem/80">
            <span>Ongkos Pengantaran</span>
            <span>{ongkir === 0 ? "Gratis" : rupiah(ongkir)}</span>
          </div>

          <div className="flex items-center justify-between text-lg font-extrabold text-white pt-3 border-t border-krem/20">
            <span>Total Bayar</span>
            <span className="text-kunyit">{rupiah(total)}</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending || itemTerpilih.length === 0 || isTanggalLibur}
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

