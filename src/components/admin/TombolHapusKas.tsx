"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { hapusKas } from "@/app/aksi/kas";

export function TombolHapusKas({ id }: { id: string }) {
  const [menunggu, mulai] = useTransition();
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!konfirmasi) {
    return (
      <button
        type="button"
        onClick={() => setKonfirmasi(true)}
        className="text-[0.88rem] font-medium text-arang-muda underline underline-offset-4 hover:text-bahaya"
      >
        Hapus
      </button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      {error ? (
        <span className="text-[0.85rem] text-bahaya">{error}</span>
      ) : (
        <span className="text-[0.85rem] text-arang-muda">Yakin hapus?</span>
      )}
      <button
        type="button"
        disabled={menunggu}
        onClick={() =>
          mulai(async () => {
            const hasil = await hapusKas(id);
            if (hasil.error) setError(hasil.error);
            else router.refresh();
          })
        }
        className="text-[0.88rem] font-semibold text-bahaya underline underline-offset-4"
      >
        {menunggu ? "Menghapus..." : "Ya"}
      </button>
      <button
        type="button"
        onClick={() => {
          setKonfirmasi(false);
          setError(null);
        }}
        className="text-[0.88rem] font-medium text-arang-muda underline underline-offset-4"
      >
        Batal
      </button>
    </span>
  );
}
