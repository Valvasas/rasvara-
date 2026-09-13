"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  hapusMenu,
  simpanMenu,
  ubahAktifMenu,
  type HasilMenu,
} from "@/app/aksi/menu";
import { LABEL_KATEGORI, URUTAN_KATEGORI } from "@/lib/pesanan";
import { rupiah } from "@/lib/format";
import type { KategoriMenu } from "@/generated/prisma/client";

export type MenuAdmin = {
  id: string;
  nama: string;
  deskripsi: string;
  kategori: KategoriMenu;
  harga: number;
  satuan: string;
  minPesan: number;
  preorderHari: number;
  kapasitasHarian: number | null;
  aktif: boolean;
};

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="tombol tombol-utama" disabled={pending}>
      {pending ? "Menyimpan..." : "Simpan Menu"}
    </button>
  );
}

function FormIsiMenu({
  menu,
  onSelesai,
}: {
  menu: MenuAdmin | null;
  onSelesai: () => void;
}) {
  const router = useRouter();
  const [hasil, kirim] = useActionState<HasilMenu, FormData>(
    async (sebelumnya, data) => {
      const h = await simpanMenu(sebelumnya, data);
      if (!h.error) {
        router.refresh();
        onSelesai();
      }
      return h;
    },
    {}
  );

  return (
    <form action={kirim} className="rounded-xl border-2 border-bata/30 bg-bata-lembut/40 p-5">
      {menu ? <input type="hidden" name="id" value={menu.id} /> : null}

      <h3 className="font-judul text-xl">
        {menu ? `Ubah ${menu.nama}` : "Tambah menu baru"}
      </h3>

      {hasil.error ? (
        <p
          role="alert"
          className="mt-3 rounded-xl border-2 border-bahaya/30 bg-bahaya-lembut px-4 py-3 text-[0.95rem] text-bahaya"
        >
          {hasil.error}
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="nama" className="label-isian">
            Nama menu
          </label>
          <input
            id="nama"
            name="nama"
            type="text"
            required
            defaultValue={menu?.nama}
            placeholder="Contoh: Nasi Kotak Ayam Bakar"
            className="kolom-isian"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="deskripsi" className="label-isian">
            Keterangan menu
          </label>
          <textarea
            id="deskripsi"
            name="deskripsi"
            required
            rows={3}
            defaultValue={menu?.deskripsi}
            placeholder="Tuliskan isi dan lauknya, seperti yang Anda jelaskan ke pelanggan."
            className="kolom-isian"
          />
        </div>

        <div>
          <label htmlFor="kategori" className="label-isian">
            Kategori
          </label>
          <select
            id="kategori"
            name="kategori"
            required
            defaultValue={menu?.kategori ?? "NASI_KOTAK"}
            className="kolom-isian"
          >
            {URUTAN_KATEGORI.map((k) => (
              <option key={k} value={k}>
                {LABEL_KATEGORI[k]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="harga" className="label-isian">
            Harga (rupiah)
          </label>
          <input
            id="harga"
            name="harga"
            type="text"
            inputMode="numeric"
            required
            defaultValue={menu?.harga}
            placeholder="28000"
            className="kolom-isian"
          />
        </div>

        <div>
          <label htmlFor="satuan" className="label-isian">
            Satuan
          </label>
          <input
            id="satuan"
            name="satuan"
            type="text"
            required
            defaultValue={menu?.satuan ?? "kotak"}
            placeholder="kotak / porsi / paket"
            className="kolom-isian"
          />
        </div>

        <div>
          <label htmlFor="minPesan" className="label-isian">
            Minimal pesan
          </label>
          <input
            id="minPesan"
            name="minPesan"
            type="text"
            inputMode="numeric"
            defaultValue={menu?.minPesan ?? 1}
            className="kolom-isian"
          />
        </div>

        <div>
          <label htmlFor="preorderHari" className="label-isian">
            Perlu dipesan berapa hari sebelumnya?
          </label>
          <input
            id="preorderHari"
            name="preorderHari"
            type="text"
            inputMode="numeric"
            defaultValue={menu?.preorderHari ?? 0}
            className="kolom-isian"
            aria-describedby="bantuan-preorder"
          />
          <p id="bantuan-preorder" className="mt-1.5 text-[0.85rem] text-arang-muda">
            Isi 0 kalau bisa dipesan untuk hari yang sama.
          </p>
        </div>

        <div>
          <label htmlFor="kapasitasHarian" className="label-isian">
            Batas jumlah per hari
          </label>
          <input
            id="kapasitasHarian"
            name="kapasitasHarian"
            type="text"
            inputMode="numeric"
            defaultValue={menu?.kapasitasHarian ?? ""}
            placeholder="Kosongkan kalau tidak dibatasi"
            className="kolom-isian"
            aria-describedby="bantuan-kapasitas"
          />
          <p id="bantuan-kapasitas" className="mt-1.5 text-[0.85rem] text-arang-muda">
            Website akan menolak pesanan yang melewati batas ini.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <TombolSimpan />
        <button type="button" onClick={onSelesai} className="tombol tombol-kedua">
          Batal
        </button>
      </div>
    </form>
  );
}

export function KelolaMenu({ daftar }: { daftar: MenuAdmin[] }) {
  const [sedangUbah, setSedangUbah] = useState<string | null>(null);
  const [tambahBaru, setTambahBaru] = useState(false);
  const [pesan, setPesan] = useState<{ teks: string; baik: boolean } | null>(null);
  const router = useRouter();

  async function jalankan(kerja: () => Promise<HasilMenu>) {
    const hasil = await kerja();
    setPesan({ teks: hasil.error ?? hasil.sukses ?? "", baik: !hasil.error });
    if (!hasil.error) router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-arang-muda">
          {daftar.filter((m) => m.aktif).length} menu tampil di website,{" "}
          {daftar.filter((m) => !m.aktif).length} disembunyikan.
        </p>
        {!tambahBaru ? (
          <button
            type="button"
            onClick={() => {
              setTambahBaru(true);
              setSedangUbah(null);
            }}
            className="tombol tombol-utama"
          >
            Tambah Menu Baru
          </button>
        ) : null}
      </div>

      {pesan ? (
        <p
          role="status"
          className={`mt-4 rounded-xl border-2 px-4 py-3 text-[0.95rem] ${
            pesan.baik
              ? "border-daun/30 bg-daun-lembut text-daun-tua"
              : "border-bahaya/30 bg-bahaya-lembut text-bahaya"
          }`}
        >
          {pesan.teks}
        </p>
      ) : null}

      {tambahBaru ? (
        <div className="mt-5">
          <FormIsiMenu menu={null} onSelesai={() => setTambahBaru(false)} />
        </div>
      ) : null}

      {URUTAN_KATEGORI.filter((k) => daftar.some((m) => m.kategori === k)).map(
        (kategori) => (
          <section key={kategori} className="mt-8" aria-labelledby={`k-${kategori}`}>
            <h2 id={`k-${kategori}`} className="text-2xl">
              {LABEL_KATEGORI[kategori]}
            </h2>

            <ul className="mt-3 space-y-3">
              {daftar
                .filter((m) => m.kategori === kategori)
                .map((m) => (
                  <li key={m.id}>
                    {sedangUbah === m.id ? (
                      <FormIsiMenu menu={m} onSelesai={() => setSedangUbah(null)} />
                    ) : (
                      <div
                        className={`kartu flex flex-wrap items-center gap-4 p-4 ${
                          m.aktif ? "" : "opacity-65"
                        }`}
                      >
                        <div className="min-w-[14rem] flex-1">
                          <p className="font-semibold">
                            {m.nama}
                            {!m.aktif ? (
                              <span className="ml-2 rounded-full bg-krem-tua px-2 py-0.5 text-[0.78rem] font-bold text-arang-muda">
                                Disembunyikan
                              </span>
                            ) : null}
                          </p>
                          <p className="text-[0.88rem] text-arang-muda">
                            {rupiah(m.harga)} / {m.satuan}
                            {m.minPesan > 1 ? ` · min ${m.minPesan}` : ""}
                            {m.preorderHari > 0 ? ` · H-${m.preorderHari}` : ""}
                            {m.kapasitasHarian
                              ? ` · maks ${m.kapasitasHarian}/hari`
                              : ""}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSedangUbah(m.id);
                              setTambahBaru(false);
                            }}
                            className="tombol tombol-kedua px-4 py-2"
                          >
                            Ubah
                          </button>
                          <button
                            type="button"
                            onClick={() => jalankan(() => ubahAktifMenu(m.id, !m.aktif))}
                            className="tombol tombol-kedua px-4 py-2"
                          >
                            {m.aktif ? "Sembunyikan" : "Tampilkan"}
                          </button>
                          <button
                            type="button"
                            onClick={() => jalankan(() => hapusMenu(m.id))}
                            className="tombol tombol-bahaya px-4 py-2"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
            </ul>
          </section>
        )
      )}
    </div>
  );
}
