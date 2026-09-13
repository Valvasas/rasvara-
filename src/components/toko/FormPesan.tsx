"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { buatPesanan, type HasilPesanan } from "@/app/aksi/pesanan";
import { LABEL_KATEGORI, URUTAN_KATEGORI } from "@/lib/pesanan";
import { rupiah } from "@/lib/format";
import type { KategoriMenu } from "@/generated/prisma/client";

export type MenuRingkas = {
  id: string;
  nama: string;
  slug: string;
  deskripsi: string;
  kategori: KategoriMenu;
  harga: number;
  satuan: string;
  minPesan: number;
  preorderHari: number;
};

type Props = {
  menu: MenuRingkas[];
  ongkirDefault: number;
  minOrderAntar: number;
  hariIni: string;
  pemesan: { nama: string; telepon: string } | null;
  pilihanAwal: string | null;
};

const JAM_CEPAT = ["07:00", "09:00", "11:00", "12:00", "18:00", "19:00"];

function tambahHari(tanggalIso: string, jumlah: number): string {
  const [t, b, h] = tanggalIso.split("-").map(Number);
  const d = new Date(Date.UTC(t, b - 1, h));
  d.setUTCDate(d.getUTCDate() + jumlah);
  return d.toISOString().slice(0, 10);
}

function TombolKirim({ nonaktif }: { nonaktif: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="tombol tombol-utama w-full text-[1.05rem]"
      disabled={pending || nonaktif}
    >
      {pending ? "Mengirim pesanan..." : "Kirim Pesanan"}
    </button>
  );
}

export function FormPesan({
  menu,
  ongkirDefault,
  minOrderAntar,
  hariIni,
  pemesan,
  pilihanAwal,
}: Props) {
  const awal: Record<string, number> = {};
  if (pilihanAwal) {
    const dipilih = menu.find((m) => m.slug === pilihanAwal);
    if (dipilih) awal[dipilih.id] = dipilih.minPesan;
  }

  const [jumlahPer, setJumlahPer] = useState<Record<string, number>>(awal);
  const [caraAmbil, setCaraAmbil] = useState<"AMBIL_SENDIRI" | "DIANTAR">(
    "AMBIL_SENDIRI"
  );
  const [tanggal, setTanggal] = useState("");
  const [jamAcara, setJamAcara] = useState("");
  const [hasil, kirim] = useActionState<HasilPesanan, FormData>(buatPesanan, {});

  const dipilih = useMemo(
    () =>
      menu
        .filter((m) => (jumlahPer[m.id] ?? 0) > 0)
        .map((m) => ({ ...m, jumlah: jumlahPer[m.id] })),
    [menu, jumlahPer]
  );

  const subtotal = dipilih.reduce((t, m) => t + m.harga * m.jumlah, 0);
  const ongkir =
    caraAmbil === "DIANTAR" && subtotal < minOrderAntar ? ongkirDefault : 0;
  const total = subtotal + ongkir;

  // Tanggal paling awal yang boleh dipilih ikut menyesuaikan isi pesanan:
  // begitu tumpeng masuk keranjang, kalender otomatis melompat ke H+2.
  const preorderTerlama = dipilih.reduce(
    (t, m) => Math.max(t, m.preorderHari),
    0
  );
  const tanggalMin = tambahHari(hariIni, preorderTerlama);
  const tanggalTerlaluCepat = tanggal !== "" && tanggal < tanggalMin;

  function ubahJumlah(m: MenuRingkas, arah: 1 | -1) {
    setJumlahPer((sebelum) => {
      const sekarang = sebelum[m.id] ?? 0;
      let berikut: number;

      if (arah === 1) {
        // Dari nol langsung melompat ke jumlah minimum, supaya pemesan tidak
        // perlu menekan tombol tambah sepuluh kali untuk nasi kotak.
        berikut = sekarang === 0 ? m.minPesan : sekarang + 1;
      } else {
        berikut = sekarang <= m.minPesan ? 0 : sekarang - 1;
      }

      const salinan = { ...sebelum };
      if (berikut === 0) delete salinan[m.id];
      else salinan[m.id] = berikut;
      return salinan;
    });
  }

  function ubahJumlahLangsung(m: MenuRingkas, nilai: string) {
    const angkaBaru = Number(nilai.replace(/\D/g, ""));
    setJumlahPer((sebelum) => {
      const salinan = { ...sebelum };
      if (!angkaBaru) delete salinan[m.id];
      else salinan[m.id] = angkaBaru;
      return salinan;
    });
  }

  const kategoriAda = URUTAN_KATEGORI.filter((k) =>
    menu.some((m) => m.kategori === k)
  );

  const belumLengkap =
    dipilih.length === 0 || tanggal === "" || jamAcara === "" || tanggalTerlaluCepat;

  return (
    <form action={kirim} className="grid gap-8 lg:grid-cols-12">
      <input
        type="hidden"
        name="item"
        value={JSON.stringify(
          dipilih.map((m) => ({ menuId: m.id, jumlah: m.jumlah }))
        )}
      />

      <div className="space-y-6 lg:col-span-7 xl:col-span-8">
        {hasil.error ? (
          <p
            role="alert"
            className="rounded-xl border-2 border-bahaya/30 bg-bahaya-lembut px-4 py-3 font-medium text-bahaya"
          >
            {hasil.error}
          </p>
        ) : null}

        {/* ---- 1. Pilih menu ---- */}
        <section className="kartu p-5 sm:p-6" aria-labelledby="bagian-menu">
          <div className="flex items-baseline gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bata-lembut font-judul font-semibold text-bata">
              1
            </span>
            <h2 id="bagian-menu" className="font-judul text-2xl">
              Pilih menu
            </h2>
          </div>

          {kategoriAda.map((kategori) => (
            <div key={kategori} className="mt-6">
              <h3 className="label-kolom">{LABEL_KATEGORI[kategori]}</h3>
              <ul className="mt-3 divide-y divide-krem-tua">
                {menu
                  .filter((m) => m.kategori === kategori)
                  .map((m) => {
                    const jumlah = jumlahPer[m.id] ?? 0;
                    const aktif = jumlah > 0;
                    return (
                      <li
                        key={m.id}
                        className={`flex flex-wrap items-center gap-4 py-4 ${
                          aktif ? "" : ""
                        }`}
                      >
                        <div className="min-w-[12rem] flex-1">
                          <p className="font-semibold">{m.nama}</p>
                          <p className="text-[0.9rem] text-arang-muda">
                            {rupiah(m.harga)} / {m.satuan}
                            {m.minPesan > 1
                              ? ` · minimal ${m.minPesan}`
                              : ""}
                            {m.preorderHari > 0
                              ? ` · pesan H-${m.preorderHari}`
                              : ""}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => ubahJumlah(m, -1)}
                            disabled={jumlah === 0}
                            className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-krem-tua bg-kertas text-2xl leading-none font-semibold disabled:opacity-40"
                            aria-label={`Kurangi ${m.nama}`}
                          >
                            &minus;
                          </button>

                          <input
                            type="text"
                            inputMode="numeric"
                            value={jumlah === 0 ? "" : jumlah}
                            onChange={(e) => ubahJumlahLangsung(m, e.target.value)}
                            placeholder="0"
                            aria-label={`Jumlah ${m.nama} dalam ${m.satuan}`}
                            className={`h-12 w-16 rounded-xl border-2 text-center text-lg font-semibold ${
                              aktif
                                ? "border-bata bg-bata-lembut text-bata-tua"
                                : "border-krem-tua bg-kertas"
                            }`}
                          />

                          <button
                            type="button"
                            onClick={() => ubahJumlah(m, 1)}
                            className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-krem-tua bg-kertas text-2xl leading-none font-semibold hover:border-bata hover:text-bata"
                            aria-label={`Tambah ${m.nama}`}
                          >
                            +
                          </button>
                        </div>

                        <p
                          className={`w-24 shrink-0 text-right font-semibold ${
                            aktif ? "text-arang" : "text-arang-muda/50"
                          }`}
                        >
                          {aktif ? rupiah(m.harga * jumlah) : "-"}
                        </p>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}

          {dipilih.some((m) => m.jumlah < m.minPesan) ? (
            <p className="mt-4 rounded-xl bg-kunyit-lembut px-4 py-3 text-[0.92rem] text-kunyit-tua">
              Beberapa menu belum mencapai jumlah minimum pesanan.
            </p>
          ) : null}
        </section>

        {/* ---- 2. Kapan ---- */}
        <section className="kartu p-5 sm:p-6" aria-labelledby="bagian-waktu">
          <div className="flex items-baseline gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bata-lembut font-judul font-semibold text-bata">
              2
            </span>
            <h2 id="bagian-waktu" className="font-judul text-2xl">
              Kapan dibutuhkan?
            </h2>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="tanggalAcara" className="label-isian">
                Tanggal
              </label>
              <input
                id="tanggalAcara"
                name="tanggalAcara"
                type="date"
                required
                min={tanggalMin}
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="kolom-isian"
                aria-invalid={tanggalTerlaluCepat}
                aria-describedby="bantuan-tanggal"
              />
              <p id="bantuan-tanggal" className="mt-1.5 text-[0.85rem] text-arang-muda">
                {preorderTerlama > 0
                  ? `Karena ada menu yang perlu disiapkan ${preorderTerlama} hari sebelumnya, tanggal paling awal adalah ${tanggalMin}.`
                  : "Bisa untuk hari ini selama toko masih buka."}
              </p>
            </div>

            <div>
              <label htmlFor="jamAcara" className="label-isian">
                Jam dibutuhkan
              </label>
              <input
                id="jamAcara"
                name="jamAcara"
                type="time"
                required
                value={jamAcara}
                onChange={(e) => setJamAcara(e.target.value)}
                className="kolom-isian"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {JAM_CEPAT.map((j) => (
                  <button
                    key={j}
                    type="button"
                    onClick={() => setJamAcara(j)}
                    className={`rounded-lg border-2 px-3 py-1.5 text-[0.9rem] font-medium ${
                      jamAcara === j
                        ? "border-bata bg-bata-lembut text-bata-tua"
                        : "border-krem-tua bg-kertas"
                    }`}
                  >
                    {j.replace(":", ".")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---- 3. Cara terima ---- */}
        <section className="kartu p-5 sm:p-6" aria-labelledby="bagian-ambil">
          <div className="flex items-baseline gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bata-lembut font-judul font-semibold text-bata">
              3
            </span>
            <h2 id="bagian-ambil" className="font-judul text-2xl">
              Diambil atau diantar?
            </h2>
          </div>

          <fieldset className="mt-5">
            <legend className="khusus-pembaca-layar">Cara menerima pesanan</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  {
                    nilai: "AMBIL_SENDIRI" as const,
                    judul: "Saya ambil sendiri",
                    isi: "Datang ke toko pada jam yang dipilih.",
                  },
                  {
                    nilai: "DIANTAR" as const,
                    judul: "Tolong diantar",
                    isi:
                      ongkirDefault > 0
                        ? `Ongkos antar ${rupiah(ongkirDefault)}${
                            minOrderAntar > 0
                              ? `, gratis di atas ${rupiah(minOrderAntar)}`
                              : ""
                          }.`
                        : "Diantar ke alamat Anda.",
                  },
                ]
              ).map((p) => (
                <label
                  key={p.nilai}
                  className={`flex cursor-pointer gap-3 rounded-xl border-2 p-4 ${
                    caraAmbil === p.nilai
                      ? "border-bata bg-bata-lembut"
                      : "border-krem-tua bg-kertas"
                  }`}
                >
                  <input
                    type="radio"
                    name="caraAmbil"
                    value={p.nilai}
                    checked={caraAmbil === p.nilai}
                    onChange={() => setCaraAmbil(p.nilai)}
                    className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-bata)]"
                  />
                  <span>
                    <span className="block font-semibold">{p.judul}</span>
                    <span className="block text-[0.9rem] text-arang-muda">
                      {p.isi}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {caraAmbil === "DIANTAR" ? (
            <div className="mt-5">
              <label htmlFor="alamatAntar" className="label-isian">
                Alamat pengantaran
              </label>
              <textarea
                id="alamatAntar"
                name="alamatAntar"
                required
                rows={3}
                placeholder="Nama jalan, nomor rumah, patokan, dan nama penerima."
                className="kolom-isian"
              />
            </div>
          ) : null}
        </section>

        {/* ---- 4. Data pemesan ---- */}
        <section className="kartu p-5 sm:p-6" aria-labelledby="bagian-pemesan">
          <div className="flex items-baseline gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bata-lembut font-judul font-semibold text-bata">
              4
            </span>
            <h2 id="bagian-pemesan" className="font-judul text-2xl">
              Data pemesan
            </h2>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="nama" className="label-isian">
                Nama pemesan
              </label>
              <input
                id="nama"
                name="nama"
                type="text"
                required
                defaultValue={pemesan?.nama ?? ""}
                autoComplete="name"
                placeholder="Nama yang dipanggil saat pengantaran"
                className="kolom-isian"
              />
            </div>

            <div>
              <label htmlFor="telepon" className="label-isian">
                Nomor WhatsApp
              </label>
              <input
                id="telepon"
                name="telepon"
                type="tel"
                required
                inputMode="tel"
                defaultValue={pemesan?.telepon ? "0" + pemesan.telepon.slice(2) : ""}
                autoComplete="tel"
                placeholder="0812xxxxxxx"
                className="kolom-isian"
                aria-describedby="bantuan-wa"
              />
              <p id="bantuan-wa" className="mt-1.5 text-[0.85rem] text-arang-muda">
                Kami pakai nomor ini untuk mengabari pesanan Anda.
              </p>
            </div>
          </div>

          <div className="mt-5">
            <label htmlFor="catatan" className="label-isian">
              Catatan untuk dapur{" "}
              <span className="font-normal text-arang-muda">(boleh dikosongkan)</span>
            </label>
            <textarea
              id="catatan"
              name="catatan"
              rows={3}
              placeholder="Contoh: sambal dipisah, tidak pakai daging babi, tulisan di tumpeng, dan lain-lain."
              className="kolom-isian"
            />
          </div>
        </section>

        {/* ---- 5. Pembayaran ---- */}
        <section className="kartu p-5 sm:p-6" aria-labelledby="bagian-bayar">
          <div className="flex items-baseline gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bata-lembut font-judul font-semibold text-bata">
              5
            </span>
            <h2 id="bagian-bayar" className="font-judul text-2xl">
              Cara pembayaran
            </h2>
          </div>

          <fieldset className="mt-5">
            <legend className="khusus-pembaca-layar">Pilih cara pembayaran</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  nilai: "TRANSFER",
                  judul: "Transfer bank",
                  isi: "Nomor rekening muncul setelah pesanan dikirim.",
                },
                {
                  nilai: "TUNAI",
                  judul: "Bayar tunai",
                  isi: "Dibayar saat pesanan diterima atau diambil.",
                },
              ].map((p, i) => (
                <label
                  key={p.nilai}
                  className="flex cursor-pointer gap-3 rounded-xl border-2 border-krem-tua bg-kertas p-4 has-checked:border-bata has-checked:bg-bata-lembut"
                >
                  <input
                    type="radio"
                    name="caraBayar"
                    value={p.nilai}
                    defaultChecked={i === 0}
                    className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-bata)]"
                  />
                  <span>
                    <span className="block font-semibold">{p.judul}</span>
                    <span className="block text-[0.9rem] text-arang-muda">
                      {p.isi}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>
      </div>

      {/* ---- Ringkasan ---- */}
      <aside className="lg:col-span-5 xl:col-span-4">
        <div className="lg:sticky lg:top-28">
          <div className="kartu overflow-hidden">
            <h2 className="border-b border-krem-tua px-5 py-4 font-judul text-xl">
              Ringkasan pesanan
            </h2>

            {dipilih.length === 0 ? (
              <p className="px-5 py-8 text-center text-arang-muda">
                Belum ada menu dipilih. Tekan tombol tambah pada menu yang Anda
                inginkan.
              </p>
            ) : (
              <ul className="divide-y divide-krem-tua px-5">
                {dipilih.map((m) => (
                  <li key={m.id} className="flex justify-between gap-3 py-3">
                    <span>
                      <span className="block font-medium">{m.nama}</span>
                      <span className="block text-[0.88rem] text-arang-muda">
                        {m.jumlah} {m.satuan} &times; {rupiah(m.harga)}
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold">
                      {rupiah(m.harga * m.jumlah)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <dl className="space-y-2 border-t border-krem-tua px-5 py-4">
              <div className="flex justify-between text-[0.95rem]">
                <dt className="text-arang-muda">Subtotal</dt>
                <dd>{rupiah(subtotal)}</dd>
              </div>
              <div className="flex justify-between text-[0.95rem]">
                <dt className="text-arang-muda">Ongkos antar</dt>
                <dd>{ongkir === 0 ? "Gratis" : rupiah(ongkir)}</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-krem-tua pt-3">
                <dt className="font-semibold">Total</dt>
                <dd className="font-judul text-2xl text-bata">{rupiah(total)}</dd>
              </div>
            </dl>

            <div className="border-t border-krem-tua p-5">
              <TombolKirim nonaktif={belumLengkap} />
              {belumLengkap ? (
                <p className="mt-3 text-center text-[0.88rem] text-arang-muda">
                  {dipilih.length === 0
                    ? "Pilih menu dulu untuk melanjutkan."
                    : tanggalTerlaluCepat
                      ? "Tanggal yang dipilih terlalu cepat untuk menu ini."
                      : "Lengkapi tanggal dan jam dibutuhkan."}
                </p>
              ) : (
                <p className="mt-3 text-center text-[0.88rem] text-arang-muda">
                  Belum ada pembayaran di tahap ini. Kami hubungi Anda dulu lewat
                  WhatsApp.
                </p>
              )}
            </div>
          </div>
        </div>
      </aside>
    </form>
  );
}
