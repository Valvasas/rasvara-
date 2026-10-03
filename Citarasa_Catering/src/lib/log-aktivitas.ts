import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

type Klien = Prisma.TransactionClient | typeof db;

export type DataAktivitas = {
  penggunaId?: string | null;
  aksi: string;
  target?: string | null;
  rincian?: string | null;
};

/**
 * Mencatat tindakan penting (uang, akses, perubahan data) untuk audit.
 *
 * Di dalam transaksi, galatnya ikut membatalkan transaksi — jejak uang tidak
 * boleh hilang diam-diam. Di luar transaksi, kegagalan mencatat log tidak boleh
 * menggagalkan tindakan pengguna, jadi hanya ditulis ke log server.
 */
export async function catatAktivitas(data: DataAktivitas, klien?: Prisma.TransactionClient): Promise<void> {
  const isi = {
    penggunaId: data.penggunaId ?? null,
    aksi: data.aksi.slice(0, 60),
    target: data.target?.slice(0, 120) ?? null,
    rincian: data.rincian?.slice(0, 500) ?? null,
  };
  if (klien) {
    await klien.logAktivitas.create({ data: isi });
    return;
  }
  try {
    await (db as Klien).logAktivitas.create({ data: isi });
  } catch (err) {
    console.error("Gagal mencatat aktivitas", err);
  }
}
