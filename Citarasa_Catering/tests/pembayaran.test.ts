import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hitungMinimalDp,
  jenisPembayaranUntuk,
  saranJumlahBayar,
  sisaTagihan,
  statusBayarDari,
} from "../src/lib/pembayaran";
import { GalatBisnis, pesanGalat } from "../src/lib/galat";

test("DP minimal dibulatkan ke atas ke Rp1.000 dan tidak melebihi total", () => {
  assert.equal(hitungMinimalDp(855_000, 50), 428_000);
  assert.equal(hitungMinimalDp(1_000, 50), 1_000);
  assert.equal(hitungMinimalDp(855_000, 0), 0);
  assert.equal(hitungMinimalDp(855_000, 150), 855_000);
});

test("status bayar diturunkan dari angka", () => {
  assert.equal(statusBayarDari({ total: 100, dibayar: 0, menungguVerifikasi: false }), "BELUM_BAYAR");
  assert.equal(statusBayarDari({ total: 100, dibayar: 0, menungguVerifikasi: true }), "MENUNGGU_VERIFIKASI");
  assert.equal(statusBayarDari({ total: 100, dibayar: 50, menungguVerifikasi: false }), "SEBAGIAN");
  assert.equal(statusBayarDari({ total: 100, dibayar: 50, menungguVerifikasi: true }), "MENUNGGU_VERIFIKASI");
  assert.equal(statusBayarDari({ total: 100, dibayar: 100, menungguVerifikasi: true }), "LUNAS");
});

test("saran jumlah: kekurangan DP dulu, lalu sisa", () => {
  assert.equal(saranJumlahBayar({ total: 1000, dibayar: 0, minimalDp: 500 }), 500);
  assert.equal(saranJumlahBayar({ total: 1000, dibayar: 200, minimalDp: 500 }), 300);
  assert.equal(saranJumlahBayar({ total: 1000, dibayar: 500, minimalDp: 500 }), 500);
  assert.equal(saranJumlahBayar({ total: 1000, dibayar: 0, minimalDp: 0 }), 1000);
  assert.equal(sisaTagihan(1000, 1200), 0);
});

test("jenis pembayaran: menutup sisa = pelunasan", () => {
  assert.equal(jenisPembayaranUntuk(500, 1000, 0), "DP");
  assert.equal(jenisPembayaranUntuk(500, 1000, 500), "PELUNASAN");
});

test("pesanGalat hanya meneruskan GalatBisnis", () => {
  assert.equal(pesanGalat(new GalatBisnis("Kuota habis")), "Kuota habis");
  const asli = console.error;
  console.error = () => {};
  try {
    assert.equal(pesanGalat(new Error('relation "Pesanan" does not exist'), "Umum"), "Umum");
  } finally {
    console.error = asli;
  }
});
