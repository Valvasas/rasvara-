"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  gantiSandi,
  simpanPengaturan,
  type HasilPengaturan,
} from "@/app/aksi/pengaturan";
import { teleponTampil } from "@/lib/format";

type Awal = {
  namaUsaha: string;
  tagline: string;
  cerita: string;
  whatsapp: string;
  alamat: string;
  jamBuka: string;
  jamTutup: string;
  namaBank: string;
  nomorRekening: string;
  namaRekening: string;
  ongkirDefault: number;
  minOrderAntar: number;
};

function Tombol({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="tombol tombol-utama" disabled={pending}>
      {pending ? "Menyimpan..." : label}
    </button>
  );
}

function Kabar({ hasil }: { hasil: HasilPengaturan }) {
  if (!hasil.error && !hasil.sukses) return null;
  return (
    <p
      role={hasil.error ? "alert" : "status"}
      className={`mt-4 rounded-xl border-2 px-4 py-3 text-[0.95rem] ${
        hasil.error
          ? "border-bahaya/30 bg-bahaya-lembut text-bahaya"
          : "border-daun/30 bg-daun-lembut text-daun-tua"
      }`}
    >
      {hasil.error ?? hasil.sukses}
    </p>
  );
}

export function FormPengaturan({ awal }: { awal: Awal }) {
  const [hasil, kirim] = useActionState<HasilPengaturan, FormData>(
    simpanPengaturan,
    {}
  );

  return (
    <form action={kirim} className="space-y-6">
      <Kabar hasil={hasil} />

      <section className="kartu p-5">
        <h2 className="font-judul text-xl">Identitas usaha</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="namaUsaha" className="label-isian">
              Nama usaha
            </label>
            <input
              id="namaUsaha"
              name="namaUsaha"
              type="text"
              required
              defaultValue={awal.namaUsaha}
              className="kolom-isian"
            />
          </div>

          <div>
            <label htmlFor="tagline" className="label-isian">
              Kalimat singkat
            </label>
            <input
              id="tagline"
              name="tagline"
              type="text"
              defaultValue={awal.tagline}
              className="kolom-isian"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="cerita" className="label-isian">
              Cerita usaha
            </label>
            <textarea
              id="cerita"
              name="cerita"
              rows={5}
              defaultValue={awal.cerita}
              className="kolom-isian"
              aria-describedby="bantuan-cerita"
            />
            <p id="bantuan-cerita" className="mt-1.5 text-[0.85rem] text-arang-muda">
              Bagian ini tampil di halaman depan. Tulis dengan bahasa Anda
              sendiri, seperti bercerita ke pelanggan baru.
            </p>
          </div>
        </div>
      </section>

      <section className="kartu p-5">
        <h2 className="font-judul text-xl">Kontak &amp; jam buka</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="whatsapp" className="label-isian">
              Nomor WhatsApp usaha
            </label>
            <input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              defaultValue={awal.whatsapp ? teleponTampil(awal.whatsapp) : ""}
              placeholder="0812xxxxxxx"
              className="kolom-isian"
            />
          </div>

          <div>
            <label htmlFor="alamat" className="label-isian">
              Alamat toko
            </label>
            <input
              id="alamat"
              name="alamat"
              type="text"
              defaultValue={awal.alamat}
              className="kolom-isian"
            />
          </div>

          <div>
            <label htmlFor="jamBuka" className="label-isian">
              Jam buka
            </label>
            <input
              id="jamBuka"
              name="jamBuka"
              type="time"
              required
              defaultValue={awal.jamBuka}
              className="kolom-isian"
            />
          </div>

          <div>
            <label htmlFor="jamTutup" className="label-isian">
              Jam tutup
            </label>
            <input
              id="jamTutup"
              name="jamTutup"
              type="time"
              required
              defaultValue={awal.jamTutup}
              className="kolom-isian"
              aria-describedby="bantuan-jam"
            />
            <p id="bantuan-jam" className="mt-1.5 text-[0.85rem] text-arang-muda">
              Boleh melewati tengah malam, misalnya buka 16.00 tutup 01.00.
            </p>
          </div>
        </div>
      </section>

      <section className="kartu p-5">
        <h2 className="font-judul text-xl">Rekening &amp; pengantaran</h2>
        <p className="mt-1 text-[0.9rem] text-arang-muda">
          Rekening ini yang ditampilkan ke pemesan yang memilih bayar transfer.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="namaBank" className="label-isian">
              Nama bank
            </label>
            <input
              id="namaBank"
              name="namaBank"
              type="text"
              defaultValue={awal.namaBank}
              placeholder="BCA"
              className="kolom-isian"
            />
          </div>

          <div>
            <label htmlFor="nomorRekening" className="label-isian">
              Nomor rekening
            </label>
            <input
              id="nomorRekening"
              name="nomorRekening"
              type="text"
              inputMode="numeric"
              defaultValue={awal.nomorRekening}
              className="kolom-isian"
            />
          </div>

          <div>
            <label htmlFor="namaRekening" className="label-isian">
              Atas nama
            </label>
            <input
              id="namaRekening"
              name="namaRekening"
              type="text"
              defaultValue={awal.namaRekening}
              className="kolom-isian"
            />
          </div>

          <div>
            <label htmlFor="ongkirDefault" className="label-isian">
              Ongkos antar (rupiah)
            </label>
            <input
              id="ongkirDefault"
              name="ongkirDefault"
              type="text"
              inputMode="numeric"
              defaultValue={awal.ongkirDefault}
              className="kolom-isian"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="minOrderAntar" className="label-isian">
              Gratis ongkir mulai belanja (rupiah)
            </label>
            <input
              id="minOrderAntar"
              name="minOrderAntar"
              type="text"
              inputMode="numeric"
              defaultValue={awal.minOrderAntar}
              className="kolom-isian"
              aria-describedby="bantuan-ongkir"
            />
            <p id="bantuan-ongkir" className="mt-1.5 text-[0.85rem] text-arang-muda">
              Isi 0 kalau ongkos antar selalu ditagihkan.
            </p>
          </div>
        </div>
      </section>

      <Tombol label="Simpan Pengaturan" />
    </form>
  );
}

export function FormSandi() {
  const [hasil, kirim] = useActionState<HasilPengaturan, FormData>(gantiSandi, {});

  return (
    <form action={kirim} className="kartu p-5">
      <h2 className="font-judul text-xl">Ganti kata sandi</h2>
      <p className="mt-1 text-[0.9rem] text-arang-muda">
        Sebaiknya diganti secara berkala, terutama kalau ada orang lain yang
        pernah ikut membuka halaman ini.
      </p>

      <Kabar hasil={hasil} />

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="sandiLama" className="label-isian">
            Kata sandi sekarang
          </label>
          <input
            id="sandiLama"
            name="sandiLama"
            type="password"
            required
            autoComplete="current-password"
            className="kolom-isian"
          />
        </div>

        <div>
          <label htmlFor="sandiBaru" className="label-isian">
            Kata sandi baru
          </label>
          <input
            id="sandiBaru"
            name="sandiBaru"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="kolom-isian"
          />
        </div>

        <div>
          <label htmlFor="ulangiSandi" className="label-isian">
            Ulangi kata sandi baru
          </label>
          <input
            id="ulangiSandi"
            name="ulangiSandi"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="kolom-isian"
          />
        </div>
      </div>

      <div className="mt-5">
        <Tombol label="Ganti Kata Sandi" />
      </div>
    </form>
  );
}
