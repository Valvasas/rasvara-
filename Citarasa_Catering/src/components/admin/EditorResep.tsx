"use client";

import { useMemo, useState, useTransition } from "react";
import { aksiSimpanResep } from "@/app/aksi/bahan";
import { rupiah } from "@/lib/format";
import { IkonTutup } from "@/components/ikon/Ikon";

type BahanPilihan = { id: string; nama: string; satuan: string; hargaPerSatuan: number };

interface EditorResepProps {
  menuId: string;
  hargaMenu: number;
  satuanMenu: string;
  bahan: BahanPilihan[];
  awal: { bahanId: string; jumlahPerPorsi: number }[];
}

/**
 * Takaran bahan untuk SATU satuan menu (mis. per kotak). HPP dan margin
 * dihitung langsung saat diketik supaya pemilik bisa menimbang harga jual
 * sebelum menyimpan.
 */
export function EditorResep({ menuId, hargaMenu, satuanMenu, bahan, awal }: EditorResepProps) {
  const petaBahan = useMemo(() => new Map(bahan.map((b) => [b.id, b])), [bahan]);
  const [baris, setBaris] = useState(awal.map((a) => ({ bahanId: a.bahanId, takaran: String(a.jumlahPerPorsi) })));
  const [pilih, setPilih] = useState("");
  const [pesan, setPesan] = useState<{ teks: string; ok: boolean } | null>(null);
  const [berubah, setBerubah] = useState(false);
  const [isPending, startTransition] = useTransition();

  const hpp = baris.reduce((n, b) => n + (Number(b.takaran) || 0) * (petaBahan.get(b.bahanId)?.hargaPerSatuan ?? 0), 0);
  const margin = hargaMenu > 0 ? ((hargaMenu - hpp) / hargaMenu) * 100 : 0;
  const tersedia = bahan.filter((b) => !baris.some((x) => x.bahanId === b.id));
  const tidakValid = baris.some((b) => !(Number(b.takaran) > 0));

  const tambah = () => {
    if (!pilih) return;
    setBaris((x) => [...x, { bahanId: pilih, takaran: "" }]);
    setPilih("");
    setBerubah(true);
  };

  const simpan = () => {
    setPesan(null);
    startTransition(async () => {
      try {
        const h = await aksiSimpanResep(
          menuId,
          baris.map((b) => ({ bahanId: b.bahanId, jumlahPerPorsi: Number(b.takaran) }))
        );
        setPesan({ teks: h.pesan ?? (h.sukses ? "Tersimpan." : "Gagal."), ok: h.sukses });
        if (h.sukses) setBerubah(false);
      } catch {
        setPesan({ teks: "Sesi berakhir atau koneksi terputus. Muat ulang halaman.", ok: false });
      }
    });
  };

  if (bahan.length === 0) {
    return (
      <p className="teks-redup">
        Belum ada bahan. Tambahkan dulu di <a href="/admin/bahan" className="text-bata hover:underline">Bahan &amp; resep</a>.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {baris.length > 0 && (
        <ul className="divide-y divide-krem-gelap border-y border-krem-gelap">
          {baris.map((b, i) => {
            const info = petaBahan.get(b.bahanId);
            const biaya = (Number(b.takaran) || 0) * (info?.hargaPerSatuan ?? 0);
            return (
              <li key={b.bahanId} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_6rem_auto] items-center gap-x-3 gap-y-2 py-3">
                <span className="min-w-0 col-start-1 row-start-1">
                  <span className="block font-medium text-kayu">{info?.nama ?? "Bahan dihapus"}</span>
                  <span className="block text-xs text-kayu-sedang">{info ? `${rupiah(info.hargaPerSatuan)} / ${info.satuan}` : ""}</span>
                </span>
                <span className="inline-flex items-center gap-2 col-start-1 row-start-2 sm:col-start-2 sm:row-start-1">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.001"
                    min={0}
                    value={b.takaran}
                    aria-label={`Takaran ${info?.nama ?? ""} per ${satuanMenu}`}
                    onChange={(e) => {
                      const v = e.target.value;
                      setBaris((x) => x.map((y, j) => (j === i ? { ...y, takaran: v } : y)));
                      setBerubah(true);
                    }}
                    className={`isian min-h-[40px] w-24 text-right angka-tabel ${b.takaran && !(Number(b.takaran) > 0) ? "isian-galat" : ""}`}
                  />
                  <span className="text-sm text-kayu-sedang w-14">{info?.satuan}</span>
                </span>
                <span className="text-right text-sm angka-tabel col-start-2 row-start-2 sm:col-start-3 sm:row-start-1">{rupiah(Math.round(biaya))}</span>
                <button
                  type="button"
                  onClick={() => {
                    setBaris((x) => x.filter((_, j) => j !== i));
                    setBerubah(true);
                  }}
                  className="tombol-hantu tombol-kecil px-2 justify-self-end col-start-2 row-start-1 sm:col-start-4"
                  aria-label={`Hapus ${info?.nama ?? "bahan"} dari resep`}
                >
                  <IkonTutup className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <label htmlFor={`pilih-bahan-${menuId}`} className="sr-only">Pilih bahan</label>
        <select id={`pilih-bahan-${menuId}`} value={pilih} onChange={(e) => setPilih(e.target.value)} className="isian flex-1 min-w-[180px]">
          <option value="">Pilih bahan…</option>
          {tersedia.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nama} ({b.satuan})
            </option>
          ))}
        </select>
        <button type="button" onClick={tambah} disabled={!pilih} className="tombol-kedua">Tambah bahan</button>
      </div>

      <dl className="grid grid-cols-3 gap-3 rounded-xl bg-krem-tua/70 p-4 text-sm">
        <div><dt className="text-kayu-sedang">HPP / {satuanMenu}</dt><dd className="font-semibold angka-tabel">{rupiah(Math.round(hpp))}</dd></div>
        <div><dt className="text-kayu-sedang">Harga jual</dt><dd className="font-semibold angka-tabel">{rupiah(hargaMenu)}</dd></div>
        <div>
          <dt className="text-kayu-sedang">Margin</dt>
          <dd className={`font-semibold angka-tabel ${margin < 20 ? "text-bahaya" : margin < 35 ? "text-kunyit-tua" : "text-daun-tua"}`}>
            {baris.length ? `${margin.toFixed(0)}%` : "—"}
          </dd>
        </div>
      </dl>
      {baris.length > 0 && margin < 20 && <p className="text-xs text-bahaya">Margin di bawah 20% — pertimbangkan menaikkan harga atau menyesuaikan takaran.</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={simpan} disabled={isPending || tidakValid || !berubah} className="tombol-utama">
          {isPending ? "Menyimpan..." : "Simpan resep"}
        </button>
        {tidakValid && <span className="text-xs text-bahaya">Isi takaran tiap bahan (lebih dari 0).</span>}
        {pesan && <span role={pesan.ok ? "status" : "alert"} className={`text-sm ${pesan.ok ? "text-daun-tua" : "text-bahaya"}`}>{pesan.teks}</span>}
      </div>
    </div>
  );
}
