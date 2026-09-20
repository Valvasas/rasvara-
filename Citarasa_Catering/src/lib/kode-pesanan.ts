import { randomInt } from "node:crypto";
import { kunciHari } from "@/lib/format";

const HURUF_KODE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa I/O/0/1 supaya tidak salah baca saat disebut lewat telepon

/**
 * Panjang bagian acak. Kode pesanan ikut menentukan siapa yang boleh membuka
 * rincian pesanan, jadi menebaknya harus mahal: 6 karakter dari 32 huruf memberi
 * sekitar satu miliar kemungkinan per hari, bukan satu juta seperti 4 karakter.
 */
const PANJANG_ACAK = 6;

/**
 * Kode pesanan yang enak dibaca & disebutkan: CR-260912-K7QPX4
 *
 * Bagian acaknya diambil dari `randomInt` (CSPRNG), bukan `Math.random`. Keluaran
 * `Math.random` berasal dari generator yang bisa direkonstruksi hanya dari
 * beberapa nilai sebelumnya — siapa pun yang membuat dua-tiga pesanan sendiri
 * bisa meramalkan kode pesanan pembeli lain.
 *
 * Tanggalnya dihitung dalam WIB (invarian #4) supaya kode tidak melompat ke hari
 * berikutnya saat server berjalan di zona waktu lain.
 */
export function buatKodePesanan(tanggal = new Date()): string {
  const [tahun, bulan, hari] = kunciHari(tanggal).split("-");

  let acak = "";
  for (let i = 0; i < PANJANG_ACAK; i++) {
    acak += HURUF_KODE[randomInt(HURUF_KODE.length)];
  }
  return `CR-${tahun.slice(2)}${bulan}${hari}-${acak}`;
}
