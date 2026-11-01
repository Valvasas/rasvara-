import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { alasanJamDitolak, labelDurasi } from "../src/lib/jadwal";

const jam = (h: number, m = 0) => h * 60 + m;

describe("Jeda minimum pesanan hari-H", () => {
  it("hari lain tidak terkena aturan ini", () => {
    assert.equal(alasanJamDitolak({ selisihHari: 1, menitAcara: jam(7), menitSekarang: jam(20), jedaMenit: 180 }), null);
  });

  it("jam yang sudah lewat selalu ditolak, walau jeda 0", () => {
    assert.match(alasanJamDitolak({ selisihHari: 0, menitAcara: jam(8), menitSekarang: jam(20), jedaMenit: 0 })!, /sudah lewat/);
    assert.match(alasanJamDitolak({ selisihHari: 0, menitAcara: jam(20), menitSekarang: jam(20), jedaMenit: 0 })!, /sudah lewat/);
  });

  it("jeda 0: jam berikutnya boleh (perilaku lama)", () => {
    assert.equal(alasanJamDitolak({ selisihHari: 0, menitAcara: jam(20, 1), menitSekarang: jam(20), jedaMenit: 0 }), null);
  });

  it("jeda 3 jam: menyebut jam tercepat yang boleh", () => {
    const alasan = alasanJamDitolak({ selisihHari: 0, menitAcara: jam(15), menitSekarang: jam(13, 15), jedaMenit: 180 });
    assert.match(alasan!, /minimal 3 jam/);
    assert.match(alasan!, /pukul 16\.15/);
    assert.equal(alasanJamDitolak({ selisihHari: 0, menitAcara: jam(16, 15), menitSekarang: jam(13, 15), jedaMenit: 180 }), null);
  });

  it("jeda melewati tengah malam: arahkan ke tanggal berikutnya", () => {
    assert.match(
      alasanJamDitolak({ selisihHari: 0, menitAcara: jam(23, 30), menitSekarang: jam(22), jedaMenit: 180 })!,
      /hari ini sudah tidak bisa/
    );
  });

  it("label durasi mudah dibaca", () => {
    assert.equal(labelDurasi(180), "3 jam");
    assert.equal(labelDurasi(90), "1 jam 30 menit");
    assert.equal(labelDurasi(45), "45 menit");
  });
});
