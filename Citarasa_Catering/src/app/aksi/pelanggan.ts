"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { awalSesiBaru, hashSandi, lupakanSinggahanPeran, wajibPemilik } from "@/lib/auth";
import { periksaBatasLaju } from "@/lib/pembatas-laju";

/** Kata pendek yang mudah didiktekan lewat telepon/WA — tanpa huruf mirip (l/1, O/0). */
const KATA = [
  "nasi", "kotak", "sambal", "kunyit", "pandan", "tumpeng", "rendang", "lalap",
  "tempe", "tahu", "kerupuk", "gurih", "manis", "pedas", "hangat", "segar",
  "jahe", "serai", "kemiri", "santan", "bawang", "cabai", "kecap", "telur",
  "ayam", "bebek", "ikan", "udang", "sayur", "buncis", "jagung", "pisang",
];

/** "kunyit-482193-ayam": ±30 bit acak, cukup untuk sandi sekali pakai yang dibatasi laju login. */
function buatSandiSementara(): string {
  const kata = () => KATA[randomInt(KATA.length)];
  return `${kata()}-${String(randomInt(1_000_000)).padStart(6, "0")}-${kata()}`;
}

export type HasilResetSandi =
  | { sukses: true; sandiSementara: string; nama: string; telepon: string }
  | { sukses: false; pesan: string };

const SkemaReset = z.object({ penggunaId: z.string().min(1).max(40) });

/**
 * Pemilik membuatkan sandi sementara untuk PELANGGAN yang lupa sandinya
 * (jalur /lupa-sandi). Semua sesi lama akun itu langsung dicabut (`sesiSejak`).
 *
 * Sandinya dikembalikan sekali ke layar pemilik dan TIDAK disimpan di mana
 * pun selain hash-nya. Tombol kirim di UI membuka chat ke nomor yang
 * TERDAFTAR di akun — bukan ke nomor peminta — jadi orang yang mengaku-ngaku
 * pemilik akun tidak bisa menerimanya.
 *
 * Akun pemilik/staf sengaja tidak bisa direset dari sini: staf dikelola di
 * Pengaturan, dan pemilik tidak boleh bisa dikunci oleh dirinya sendiri.
 */
export async function aksiResetSandiPelanggan(
  _prev: HasilResetSandi | null,
  formData: FormData
): Promise<HasilResetSandi> {
  const sesi = await wajibPemilik();

  const cekLaju = await periksaBatasLaju({ kunci: `reset-sandi:${sesi.id}`, maksimal: 10, jendelaDetik: 15 * 60 });
  if (!cekLaju.diizinkan) {
    return { sukses: false, pesan: `Terlalu banyak reset. Coba lagi dalam ${Math.ceil(cekLaju.tungguDetik / 60)} menit.` };
  }

  const parsed = SkemaReset.safeParse({ penggunaId: formData.get("penggunaId") });
  if (!parsed.success) return { sukses: false, pesan: "Akun tidak valid." };

  const target = await db.pengguna.findUnique({
    where: { id: parsed.data.penggunaId },
    select: { id: true, nama: true, telepon: true, peran: true },
  });
  if (!target || target.peran !== "PELANGGAN") {
    return { sukses: false, pesan: "Akun pelanggan tidak ditemukan." };
  }

  const sandiSementara = buatSandiSementara();
  await db.pengguna.update({
    where: { id: target.id },
    data: { sandiHash: await hashSandi(sandiSementara), sesiSejak: awalSesiBaru() },
  });
  lupakanSinggahanPeran(target.id);

  // Jejak audit di log server (tanpa sandi): siapa mereset akun siapa, kapan.
  console.info(
    JSON.stringify({ peristiwa: "reset-sandi-pelanggan", oleh: sesi.id, akun: target.id, waktu: new Date().toISOString() })
  );

  revalidatePath("/admin/pelanggan");
  return { sukses: true, sandiSementara, nama: target.nama, telepon: target.telepon };
}
