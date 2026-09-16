/**
 * Tipe hasil aksi voucher. Dipisah dari `aksi/voucher.ts` karena berkas
 * bertanda `"use server"` hanya boleh mengekspor fungsi async.
 */

export type HasilCekVoucher =
  | {
      berlaku: true;
      kode: string;
      potongan: number;
      deskripsi: string | null;
      pesan: string;
    }
  | { berlaku: false; pesan: string };

export type HasilKelolaVoucher = { sukses: boolean; pesan: string };
