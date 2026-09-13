"use client";

import { useState, useTransition } from "react";
import { tandaiSudahTransfer } from "@/app/aksi/pesanan";

export function TombolSudahTransfer({ kode }: { kode: string }) {
  const [menunggu, mulai] = useTransition();
  const [pesan, setPesan] = useState<{ teks: string; baik: boolean } | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={menunggu || pesan?.baik === true}
        className="tombol tombol-hijau w-full sm:w-auto"
        onClick={() =>
          mulai(async () => {
            const hasil = await tandaiSudahTransfer(kode);
            setPesan({
              teks: hasil.error ?? hasil.sukses ?? "",
              baik: !hasil.error,
            });
          })
        }
      >
        {menunggu ? "Menyimpan..." : "Saya Sudah Transfer"}
      </button>

      {pesan ? (
        <p
          role="status"
          className={`mt-3 text-[0.95rem] font-medium ${
            pesan.baik ? "text-daun-tua" : "text-bahaya"
          }`}
        >
          {pesan.teks}
        </p>
      ) : null}
    </div>
  );
}
