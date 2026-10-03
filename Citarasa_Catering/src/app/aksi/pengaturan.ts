"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { wajibPemilik } from "@/lib/auth";
import { dariInputTanggal, hariIniWib, normalkanTelepon } from "@/lib/format";
import { rentangHari } from "@/lib/laporan";
import { lupakanSinggahanPengaturan } from "@/lib/pengaturan";
import { catatAktivitas } from "@/lib/log-aktivitas";

const teksOpsional = (maks: number) => z.string().trim().max(maks, `Maksimal ${maks} karakter`).optional();

const SkemaPengaturan = z.object({
  namaUsaha: z.string().trim().min(2, "Nama usaha minimal 2 karakter").max(80, "Nama usaha terlalu panjang"),
  tagline: teksOpsional(160),
  whatsapp: z
    .string()
    .regex(/^62\d{8,13}$/, "Nomor WhatsApp tidak valid")
    .optional(),
  alamat: teksOpsional(300),
  jamBuka: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format jam tidak valid"),
  jamTutup: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format jam tidak valid"),
  namaBank: teksOpsional(40),
  nomorRekening: z
    .string()
    .trim()
    .regex(/^[\d\s-]{5,30}$/, "Nomor rekening hanya angka")
    .optional(),
  namaRekening: teksOpsional(80),
  ongkirDefault: z.number({ message: "Isi angka" }).int().min(0, "Tidak boleh negatif").max(10_000_000),
  minOrderAntar: z.number({ message: "Isi angka" }).int().min(0, "Tidak boleh negatif").max(1_000_000_000),
  persenDp: z.number({ message: "Isi angka" }).int("Bilangan bulat").min(0, "0–100").max(100, "0–100"),
  batasBayarJam: z.number({ message: "Isi angka" }).int("Bilangan bulat").min(0, "Tidak boleh negatif").max(720, "Maksimal 720 jam (30 hari)"),
});

export type HasilPengaturan = {
  sukses: boolean;
  pesan?: string;
  kesalahan?: Record<string, string[]>;
};

export async function aksiSimpanPengaturan(
  _prevState: HasilPengaturan | null,
  formData: FormData
): Promise<HasilPengaturan> {
  const sesi = await wajibPemilik();

  const raw = {
    namaUsaha: formData.get("namaUsaha"),
    tagline: formData.get("tagline") || undefined,
    whatsapp: formData.get("whatsapp") ? normalkanTelepon(formData.get("whatsapp") as string) : undefined,
    alamat: formData.get("alamat") || undefined,
    jamBuka: formData.get("jamBuka"),
    jamTutup: formData.get("jamTutup"),
    namaBank: formData.get("namaBank") || undefined,
    nomorRekening: formData.get("nomorRekening") || undefined,
    namaRekening: formData.get("namaRekening") || undefined,
    ongkirDefault: Number(formData.get("ongkirDefault") || 0),
    minOrderAntar: Number(formData.get("minOrderAntar") || 0),
    persenDp: Number(formData.get("persenDp") || 0),
    batasBayarJam: Number(formData.get("batasBayarJam") || 0),
  };

  const parsed = SkemaPengaturan.safeParse(raw);
  if (!parsed.success) {
    return {
      sukses: false,
      kesalahan: parsed.error.flatten().fieldErrors,
      pesan: "Mohon periksa kembali isian pengaturan.",
    };
  }

  const d = parsed.data;

  await db.pengaturan.upsert({
    where: { id: "utama" },
    create: {
      id: "utama",
      namaUsaha: d.namaUsaha.trim(),
      tagline: d.tagline?.trim() || "",
      whatsapp: d.whatsapp?.trim() || "",
      alamat: d.alamat?.trim() || "",
      jamBuka: d.jamBuka,
      jamTutup: d.jamTutup,
      namaBank: d.namaBank?.trim() || "",
      nomorRekening: d.nomorRekening?.trim() || "",
      namaRekening: d.namaRekening?.trim() || "",
      ongkirDefault: d.ongkirDefault,
      minOrderAntar: d.minOrderAntar,
      persenDp: d.persenDp,
      batasBayarJam: d.batasBayarJam,
    },
    update: {
      namaUsaha: d.namaUsaha.trim(),
      tagline: d.tagline?.trim() || "",
      whatsapp: d.whatsapp?.trim() || "",
      alamat: d.alamat?.trim() || "",
      jamBuka: d.jamBuka,
      jamTutup: d.jamTutup,
      namaBank: d.namaBank?.trim() || "",
      nomorRekening: d.nomorRekening?.trim() || "",
      namaRekening: d.namaRekening?.trim() || "",
      ongkirDefault: d.ongkirDefault,
      minOrderAntar: d.minOrderAntar,
      persenDp: d.persenDp,
      batasBayarJam: d.batasBayarJam,
    },
  });

  lupakanSinggahanPengaturan();
  await catatAktivitas({ penggunaId: sesi.id, aksi: "ubah_pengaturan" });

  revalidatePath("/");
  revalidatePath("/menu");
  revalidatePath("/pesan");
  revalidatePath("/admin/pengaturan");
  return { sukses: true, pesan: "Pengaturan berhasil disimpan." };
}


export type HasilTanggalTutup = { sukses: boolean; pesan?: string };

const SkemaTanggalTutup = z.object({
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pilih tanggal"),
  alasan: z.string().trim().max(100, "Alasan terlalu panjang").optional(),
});

/**
 * Menandai satu tanggal dapur tutup. Formulir pemesanan langsung menolak
 * tanggal ini; pesanan yang sudah masuk untuk tanggal itu tidak diubah, jadi
 * pemilik diberi tahu bila ada yang perlu dihubungi.
 */
export async function aksiTambahTanggalTutup(
  _prev: HasilTanggalTutup | null,
  formData: FormData
): Promise<HasilTanggalTutup> {
  await wajibPemilik();
  const parsed = SkemaTanggalTutup.safeParse({
    tanggal: formData.get("tanggal") ?? "",
    alasan: String(formData.get("alasan") ?? "") || undefined,
  });
  if (!parsed.success) return { sukses: false, pesan: parsed.error.issues[0]?.message };

  if (parsed.data.tanggal < hariIniWib()) {
    return { sukses: false, pesan: "Tanggal sudah lewat." };
  }

  const tanggal = dariInputTanggal(parsed.data.tanggal);
  await db.tanggalTutup.upsert({
    where: { tanggal },
    create: { tanggal, alasan: parsed.data.alasan || null },
    update: { alasan: parsed.data.alasan || null },
  });

  const bentrok = await db.pesanan.count({
    where: { tanggalAcara: rentangHari(parsed.data.tanggal), status: { notIn: ["SELESAI", "DIBATALKAN"] } },
  });

  revalidatePath("/admin/pengaturan");
  revalidatePath("/pesan");
  return {
    sukses: true,
    pesan: bentrok
      ? `Tanggal ditutup. Ada ${bentrok} pesanan aktif di tanggal itu — hubungi pemesannya.`
      : "Tanggal ditutup.",
  };
}

export async function aksiHapusTanggalTutup(id: string): Promise<HasilTanggalTutup> {
  await wajibPemilik();
  await db.tanggalTutup.deleteMany({ where: { id } });
  revalidatePath("/admin/pengaturan");
  revalidatePath("/pesan");
  return { sukses: true };
}
