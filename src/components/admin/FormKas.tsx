"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { catatKas, type HasilKas } from "@/app/aksi/kas";
import { KATEGORI_PEMASUKAN, KATEGORI_PENGELUARAN } from "@/lib/pesanan";
import { rupiah } from "@/lib/format";

function TombolSimpan({ jenis }: { jenis: "MASUK" | "KELUAR" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={`tombol w-full ${jenis === "MASUK" ? "tombol-hijau" : "tombol-utama"}`}
      disabled={pending}
    >
      {pending
        ? "Menyimpan..."
        : jenis === "MASUK"
          ? "Simpan Uang Masuk"
          : "Simpan Pengeluaran"}
    </button>
  );
}

export function FormKas({ hariIni }: { hariIni: string }) {
  const [jenis, setJenis] = useState<"MASUK" | "KELUAR">("KELUAR");
  const [jumlah, setJumlah] = useState("");
  const [kategori, setKategori] = useState(KATEGORI_PENGELUARAN[0]);
  const [hasil, kirim] = useActionState<HasilKas, FormData>(catatKas, {});

  const daftarKategori =
    jenis === "MASUK" ? KATEGORI_PEMASUKAN : KATEGORI_PENGELUARAN;
  const angkaBersih = Number(jumlah.replace(/\D/g, ""));

  function gantiJenis(baru: "MASUK" | "KELUAR") {
    setJenis(baru);
    setKategori(
      (baru === "MASUK" ? KATEGORI_PEMASUKAN : KATEGORI_PENGELUARAN)[0]
    );
  }

  return (
    <form action={kirim} className="kartu p-5">
      <h2 className="font-judul text-xl">Catat uang</h2>
      <p className="mt-1 text-[0.9rem] text-arang-muda">
        Pemasukan dari pesanan lunas tercatat otomatis. Yang perlu Anda isi di
        sini biasanya pengeluaran belanja.
      </p>

      <input type="hidden" name="jenis" value={jenis} />
      <input type="hidden" name="kategori" value={kategori} />

      {hasil.error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border-2 border-bahaya/30 bg-bahaya-lembut px-4 py-3 text-[0.95rem] text-bahaya"
        >
          {hasil.error}
        </p>
      ) : null}
      {hasil.sukses ? (
        <p
          role="status"
          className="mt-4 rounded-xl border-2 border-daun/30 bg-daun-lembut px-4 py-3 text-[0.95rem] text-daun-tua"
        >
          {hasil.sukses}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        {(["KELUAR", "MASUK"] as const).map((j) => (
          <button
            key={j}
            type="button"
            onClick={() => gantiJenis(j)}
            aria-pressed={jenis === j}
            className={`tombol ${
              jenis === j
                ? j === "MASUK"
                  ? "tombol-hijau"
                  : "tombol-utama"
                : "tombol-kedua"
            }`}
          >
            {j === "MASUK" ? "Uang Masuk" : "Uang Keluar"}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <label htmlFor="jumlah" className="label-isian">
          Berapa jumlahnya?
        </label>
        <input
          id="jumlah"
          name="jumlah"
          type="text"
          inputMode="numeric"
          required
          value={jumlah}
          onChange={(e) => setJumlah(e.target.value.replace(/[^\d.]/g, ""))}
          placeholder="150000"
          className="kolom-isian font-judul text-2xl"
          aria-describedby="pratinjau-jumlah"
        />
        {/* Angka dibacakan ulang dalam format rupiah supaya nol yang kelebihan
            atau kekurangan langsung ketahuan sebelum disimpan. */}
        <p
          id="pratinjau-jumlah"
          className={`mt-1.5 text-[0.95rem] font-semibold ${
            angkaBersih > 0 ? "text-arang" : "text-arang-muda"
          }`}
        >
          {angkaBersih > 0
            ? `Terbaca: ${rupiah(angkaBersih)}`
            : "Ketik angkanya saja, tanpa titik."}
        </p>
      </div>

      <fieldset className="mt-4">
        <legend className="label-isian">Untuk apa?</legend>
        <div className="flex flex-wrap gap-2">
          {daftarKategori.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKategori(k)}
              aria-pressed={kategori === k}
              className={`rounded-lg border-2 px-3 py-2 text-[0.92rem] font-medium ${
                kategori === k
                  ? "border-bata bg-bata-lembut text-bata-tua"
                  : "border-krem-tua bg-kertas"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-4">
        <label htmlFor="keterangan" className="label-isian">
          Keterangan
        </label>
        <input
          id="keterangan"
          name="keterangan"
          type="text"
          required
          placeholder="Contoh: belanja ayam dan sayur di pasar"
          className="kolom-isian"
        />
      </div>

      <div className="mt-4">
        <label htmlFor="tanggal" className="label-isian">
          Tanggal
        </label>
        <input
          id="tanggal"
          name="tanggal"
          type="date"
          required
          defaultValue={hariIni}
          className="kolom-isian"
        />
      </div>

      <div className="mt-5">
        <TombolSimpan jenis={jenis} />
      </div>
    </form>
  );
}
