"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { wajibPemilik, wajibStafAtauPemilik } from "@/lib/auth";
import { pesanGalat } from "@/lib/galat";
import { bacaIsiPesanan, buatPesananBaru, ubahPesanan } from "@/lib/pesanan-server";
import { catatPembayaranInti } from "@/lib/pembayaran-server";
import { catatAktivitas } from "@/lib/log-aktivitas";
import { periksaBatasLaju } from "@/lib/pembatas-laju";
import { normalkanTelepon } from "@/lib/format";
import type { HasilAksiPesanan } from "@/app/aksi/pesanan";

const SkemaTambahan = z.object({
  sumber: z.enum(["WHATSAPP", "TELEPON", "LANGSUNG", "WEBSITE"]),
  statusAwal: z.enum(["BARU", "DIKONFIRMASI"]),
  abaikanBatas: z.boolean(),
  bayarJumlah: z.number().int().min(0).max(10_000_000_000),
  bayarMetode: z.enum(["TRANSFER", "TUNAI"]),
});

function segarkanSemua(kode?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/pesanan");
  revalidatePath("/admin/produksi");
  revalidatePath("/admin/keuangan");
  if (kode) {
    revalidatePath(`/admin/pesanan/${kode}`);
    revalidatePath(`/pesanan/${kode}`);
  }
}

/**
 * Pesanan yang masuk lewat WhatsApp/telepon/datang langsung, dicatat dari
 * dashboard. Aturan harga & kuota sama dengan formulir pembeli (lib/pesanan-
 * server); batas H-/kuota hanya bisa dilewati dengan persetujuan eksplisit.
 * Staf boleh mencatat pesanan, tetapi hanya pemilik yang boleh mencatat uang.
 */
export async function aksiBuatPesananManual(
  _prev: HasilAksiPesanan | null,
  formData: FormData
): Promise<HasilAksiPesanan> {
  const sesi = await wajibStafAtauPemilik();
  const laju = periksaBatasLaju({ kunci: `pesan-manual:${sesi.id}`, maksimal: 20, jendelaDetik: 60 });
  if (!laju.diizinkan) return { sukses: false, pesan: "Terlalu banyak permintaan. Tunggu sebentar." };

  const isi = bacaIsiPesanan(formData);
  if (!isi.success) {
    return { sukses: false, kesalahan: isi.error.flatten().fieldErrors, pesan: "Periksa kembali isian yang ditandai." };
  }
  if (isi.data.items.some((i) => i.itemId)) return { sukses: false, pesan: "Format item pesanan tidak valid." };

  const tambahan = SkemaTambahan.safeParse({
    sumber: formData.get("sumber"),
    statusAwal: formData.get("statusAwal") ?? "BARU",
    abaikanBatas: formData.get("abaikanBatas") === "1",
    bayarJumlah: Number(formData.get("bayarJumlah") || 0),
    bayarMetode: formData.get("bayarMetode") ?? isi.data.caraBayar,
  });
  if (!tambahan.success) return { sukses: false, pesan: tambahan.error.issues[0]?.message ?? "Isian tidak valid." };
  const t = tambahan.data;

  if (t.bayarJumlah > 0 && sesi.peran !== "PEMILIK") {
    return { sukses: false, pesan: "Hanya pemilik yang bisa mencatat pembayaran." };
  }

  let kode: string;
  try {
    const pesanan = await buatPesananBaru(isi.data, {
      sumber: t.sumber,
      olehId: sesi.id,
      statusAwal: t.statusAwal,
      abaikanBatas: t.abaikanBatas,
      catatanRiwayat: `Dicatat dari dashboard oleh ${sesi.nama} (${t.sumber.toLowerCase()}).`,
      setelahDibuat: async (tx, p) => {
        if (t.bayarJumlah > 0) {
          await catatPembayaranInti(tx, { kode: p.kode, jumlah: t.bayarJumlah, metode: t.bayarMetode, olehId: sesi.id });
        }
        await catatAktivitas(
          { penggunaId: sesi.id, aksi: "pesanan_manual", target: p.kode, rincian: t.abaikanBatas ? "Batas H-/kuota diabaikan" : null },
          tx
        );
      },
    });
    kode = pesanan.kode;
  } catch (err) {
    return { sukses: false, pesan: pesanGalat(err) };
  }

  segarkanSemua(kode);
  redirect(`/admin/pesanan/${kode}?baru=1`);
}

/** Mengubah isi/jadwal pesanan yang belum dimasak (pemilik). */
export async function aksiUbahPesanan(
  _prev: HasilAksiPesanan | null,
  formData: FormData
): Promise<HasilAksiPesanan> {
  const sesi = await wajibPemilik();
  const kode = String(formData.get("kode") ?? "").trim().slice(0, 40);
  if (!kode) return { sukses: false, pesan: "Kode pesanan tidak valid." };

  const isi = bacaIsiPesanan(formData);
  if (!isi.success) {
    return { sukses: false, kesalahan: isi.error.flatten().fieldErrors, pesan: "Periksa kembali isian yang ditandai." };
  }

  try {
    const hasil = await ubahPesanan(kode, isi.data, { olehId: sesi.id, abaikanBatas: formData.get("abaikanBatas") === "1" });
    await catatAktivitas({
      penggunaId: sesi.id,
      aksi: "ubah_pesanan",
      target: kode,
      rincian: `Total ${hasil.totalLama} → ${hasil.total}`,
    });
  } catch (err) {
    return { sukses: false, pesan: pesanGalat(err) };
  }

  segarkanSemua(kode);
  redirect(`/admin/pesanan/${kode}?diubah=1`);
}

export type PelangganDitemukan = {
  nama: string;
  telepon: string;
  alamat: string | null;
  jumlahPesanan: number;
};

/**
 * Mencari pemesan lama untuk mengisi otomatis formulir pesanan manual.
 * Hanya untuk dashboard, dibatasi lajunya, dan mengembalikan paling banyak 6
 * orang — bukan pintu untuk menyedot seluruh daftar pelanggan.
 */
export async function aksiCariPelanggan(kueri: string): Promise<PelangganDitemukan[]> {
  const sesi = await wajibStafAtauPemilik();
  const laju = periksaBatasLaju({ kunci: `cari-pelanggan:${sesi.id}`, maksimal: 60, jendelaDetik: 60 });
  if (!laju.diizinkan) return [];

  const q = String(kueri ?? "").trim().slice(0, 40);
  const angka = q.replace(/\D/g, "");
  const pakaiTelepon = angka.length >= 4;
  if (!pakaiTelepon && q.length < 3) return [];

  const baris = await db.pesanan.findMany({
    where: pakaiTelepon
      ? { teleponPemesan: { contains: angka.startsWith("0") ? normalkanTelepon(angka) : angka } }
      : { namaPemesan: { contains: q, mode: "insensitive" } },
    select: { namaPemesan: true, teleponPemesan: true, alamatAntar: true },
    orderBy: { dibuatPada: "desc" },
    take: 60,
  });

  const peta = new Map<string, PelangganDitemukan>();
  for (const b of baris) {
    const ada = peta.get(b.teleponPemesan);
    if (ada) {
      ada.jumlahPesanan += 1;
      continue;
    }
    if (peta.size >= 6) continue;
    peta.set(b.teleponPemesan, { nama: b.namaPemesan, telepon: b.teleponPemesan, alamat: b.alamatAntar, jumlahPesanan: 1 });
  }
  return [...peta.values()];
}
