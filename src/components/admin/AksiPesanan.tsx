"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  batalkanPesanan,
  tandaiLunas,
  ubahStatusPesanan,
} from "@/app/aksi/pesanan";
import { INFO_STATUS } from "@/lib/pesanan";
import type { StatusBayar, StatusPesanan } from "@/generated/prisma/client";

type Props = {
  id: string;
  status: StatusPesanan;
  statusBayar: StatusBayar;
  total: number;
  ringkas?: boolean;
};

export function AksiPesanan({ id, status, statusBayar, ringkas = false }: Props) {
  const [menunggu, mulai] = useTransition();
  const [pesan, setPesan] = useState<{ teks: string; baik: boolean } | null>(null);
  const [formBatal, setFormBatal] = useState(false);
  const [alasan, setAlasan] = useState("");
  const [uangKembali, setUangKembali] = useState(false);
  const router = useRouter();

  const info = INFO_STATUS[status];

  function jalankan(kerja: () => Promise<{ error?: string; sukses?: string }>) {
    mulai(async () => {
      const hasil = await kerja();
      setPesan({ teks: hasil.error ?? hasil.sukses ?? "", baik: !hasil.error });
      if (!hasil.error) {
        setFormBatal(false);
        router.refresh();
      }
    });
  }

  return (
    <div className={ringkas ? "" : "space-y-3"}>
      <div className="flex flex-wrap gap-2">
        {info.statusLanjut ? (
          <button
            type="button"
            disabled={menunggu}
            className="tombol tombol-utama"
            onClick={() =>
              jalankan(() => ubahStatusPesanan(id, info.statusLanjut!))
            }
          >
            {menunggu ? "Menyimpan..." : info.aksiLanjut}
          </button>
        ) : null}

        {statusBayar !== "LUNAS" && status !== "DIBATALKAN" ? (
          <button
            type="button"
            disabled={menunggu}
            className="tombol tombol-hijau"
            onClick={() => jalankan(() => tandaiLunas(id))}
          >
            Tandai Lunas
          </button>
        ) : null}

        {status !== "SELESAI" && status !== "DIBATALKAN" && !ringkas ? (
          <button
            type="button"
            className="tombol tombol-bahaya"
            onClick={() => setFormBatal((b) => !b)}
            aria-expanded={formBatal}
          >
            Batalkan
          </button>
        ) : null}
      </div>

      {formBatal ? (
        <div className="rounded-xl border-2 border-bahaya/30 bg-bahaya-lembut p-4">
          <label htmlFor={`alasan-${id}`} className="label-isian text-bahaya">
            Alasan pembatalan
          </label>
          <input
            id={`alasan-${id}`}
            type="text"
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            placeholder="Contoh: bahan habis, pemesan membatalkan sendiri"
            className="kolom-isian"
          />

          {statusBayar === "LUNAS" ? (
            <label className="mt-3 flex items-start gap-2.5 text-[0.95rem]">
              <input
                type="checkbox"
                checked={uangKembali}
                onChange={(e) => setUangKembali(e.target.checked)}
                className="mt-1 h-5 w-5 accent-[var(--color-bahaya)]"
              />
              <span>
                Uang sudah dikembalikan ke pemesan.
                <span className="block text-[0.85rem] text-arang-muda">
                  Kalau dicentang, pengembalian ini dicatat sebagai pengeluaran
                  di buku kas.
                </span>
              </span>
            </label>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={menunggu}
              className="tombol tombol-utama bg-bahaya hover:bg-bahaya"
              onClick={() =>
                jalankan(() => batalkanPesanan(id, alasan, uangKembali))
              }
            >
              {menunggu ? "Menyimpan..." : "Ya, Batalkan Pesanan"}
            </button>
            <button
              type="button"
              className="tombol tombol-kedua"
              onClick={() => setFormBatal(false)}
            >
              Tidak Jadi
            </button>
          </div>
        </div>
      ) : null}

      {pesan ? (
        <p
          role="status"
          className={`text-[0.92rem] font-medium ${
            pesan.baik ? "text-daun-tua" : "text-bahaya"
          }`}
        >
          {pesan.teks}
        </p>
      ) : null}
    </div>
  );
}
