import { cache } from "react";
import { db } from "@/lib/db";
import type { Pengaturan } from "@/generated/prisma/client";

const BAWAAN: Pengaturan = {
  id: "utama",
  namaUsaha: "Citarasa Catering",
  tagline: "Masakan hangat, siap tepat waktu.",
  cerita: "",
  whatsapp: "",
  alamat: "",
  jamBuka: "16:00",
  jamTutup: "23:00",
  namaBank: "",
  nomorRekening: "",
  namaRekening: "",
  ongkirDefault: 0,
  minOrderAntar: 0,
  diubahPada: new Date(),
};

/**
 * Dibungkus cache() supaya satu halaman yang memakai pengaturan di header,
 * isi, dan footer hanya menembak database sekali per permintaan.
 */
export const ambilPengaturan = cache(async (): Promise<Pengaturan> => {
  try {
    const promise = db.pengaturan.findUnique({ where: { id: "utama" } });
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 500)
    );
    const tersimpan = await Promise.race([promise, timeout]);
    return tersimpan ?? BAWAAN;
  } catch {
    return BAWAAN;
  }
});
