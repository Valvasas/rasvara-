"use client";

import { useActionState, useTransition } from "react";
import { aksiHapusTanggalTutup, aksiTambahTanggalTutup } from "@/app/aksi/pengaturan";
import { tanggalPanjang } from "@/lib/format";

interface TanggalTutupRingkas {
  id: string;
  tanggal: Date;
  alasan: string | null;
}

/** Tanggal dapur libur: pembeli tidak bisa memilih tanggal ini di formulir pesan. */
export function KelolaTanggalTutup({ daftar, hariIni }: { daftar: TanggalTutupRingkas[]; hariIni: string }) {
  const [state, action, isPending] = useActionState(aksiTambahTanggalTutup, null);
  const [sedangHapus, mulaiHapus] = useTransition();

  return (
    <div className="space-y-4">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="tanggal-tutup" className="label">Tanggal</label>
          <input id="tanggal-tutup" name="tanggal" type="date" min={hariIni} required className="isian w-auto" />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label htmlFor="alasan-tutup" className="label">
            Alasan <span className="font-normal text-kayu-sedang">(opsional)</span>
          </label>
          <input id="alasan-tutup" name="alasan" type="text" maxLength={100} placeholder="Libur Lebaran" className="isian" />
        </div>
        <button type="submit" disabled={isPending} className="tombol-kedua">
          {isPending ? "Menyimpan..." : "Tutup tanggal ini"}
        </button>
      </form>
      {state?.pesan && (
        <p role={state.sukses ? "status" : "alert"} className={state.sukses ? "kotak-sukses" : "kotak-galat"}>
          {state.pesan}
        </p>
      )}

      {daftar.length === 0 ? (
        <p className="teks-redup">Tidak ada tanggal libur mendatang.</p>
      ) : (
        <ul className="divide-y divide-krem-gelap border-y border-krem-gelap">
          {daftar.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span>
                <span className="text-kayu">{tanggalPanjang(t.tanggal)}</span>
                {t.alasan && <span className="text-kayu-sedang"> · {t.alasan}</span>}
              </span>
              <button
                type="button"
                disabled={sedangHapus}
                onClick={() => mulaiHapus(async () => void (await aksiHapusTanggalTutup(t.id)))}
                className="tombol-hantu tombol-kecil"
              >
                Buka lagi
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
