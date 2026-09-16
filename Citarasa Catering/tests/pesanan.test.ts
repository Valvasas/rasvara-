import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ALUR_STATUS,
  bolehPindahStatus,
  INFO_STATUS,
  INFO_BAYAR,
  KOLOM_PAPAN,
  URUTAN_KATEGORI,
} from "../src/lib/pesanan";
import { buatKodePesanan } from "../src/lib/kode-pesanan";

describe("Alur Status Pesanan", () => {
  it("mengizinkan transisi BARU -> DIKONFIRMASI atau DIBATALKAN", () => {
    assert.equal(bolehPindahStatus("BARU", "DIKONFIRMASI"), true);
    assert.equal(bolehPindahStatus("BARU", "DIBATALKAN"), true);
    assert.equal(bolehPindahStatus("BARU", "DIPROSES"), false);
    assert.equal(bolehPindahStatus("BARU", "SIAP"), false);
    assert.equal(bolehPindahStatus("BARU", "SELESAI"), false);
  });

  it("mengizinkan transisi DIKONFIRMASI -> DIPROSES atau DIBATALKAN", () => {
    assert.equal(bolehPindahStatus("DIKONFIRMASI", "DIPROSES"), true);
    assert.equal(bolehPindahStatus("DIKONFIRMASI", "DIBATALKAN"), true);
    assert.equal(bolehPindahStatus("DIKONFIRMASI", "BARU"), false);
    assert.equal(bolehPindahStatus("DIKONFIRMASI", "SELESAI"), false);
  });

  it("mengizinkan transisi DIPROSES -> SIAP atau DIBATALKAN", () => {
    assert.equal(bolehPindahStatus("DIPROSES", "SIAP"), true);
    assert.equal(bolehPindahStatus("DIPROSES", "DIBATALKAN"), true);
    assert.equal(bolehPindahStatus("DIPROSES", "DIKONFIRMASI"), false);
  });

  it("mengizinkan transisi SIAP -> SELESAI atau DIBATALKAN", () => {
    assert.equal(bolehPindahStatus("SIAP", "SELESAI"), true);
    assert.equal(bolehPindahStatus("SIAP", "DIBATALKAN"), true);
    assert.equal(bolehPindahStatus("SIAP", "DIPROSES"), false);
  });

  it("tidak mengizinkan transisi dari status terminal (SELESAI, DIBATALKAN)", () => {
    assert.equal(ALUR_STATUS.SELESAI.length, 0);
    assert.equal(ALUR_STATUS.DIBATALKAN.length, 0);
    assert.equal(bolehPindahStatus("SELESAI", "BARU"), false);
    assert.equal(bolehPindahStatus("SELESAI", "DIBATALKAN"), false);
    assert.equal(bolehPindahStatus("DIBATALKAN", "BARU"), false);
    assert.equal(bolehPindahStatus("DIBATALKAN", "SELESAI"), false);
  });

  it("kolom papan kanban mencakup 4 status aktif", () => {
    assert.deepEqual(KOLOM_PAPAN, ["BARU", "DIKONFIRMASI", "DIPROSES", "SIAP"]);
  });

  it("semua status memiliki deskripsi dan aksi di INFO_STATUS", () => {
    for (const status of ["BARU", "DIKONFIRMASI", "DIPROSES", "SIAP", "SELESAI", "DIBATALKAN"] as const) {
      assert.ok(INFO_STATUS[status]);
      assert.ok(INFO_STATUS[status].label);
      assert.ok(INFO_STATUS[status].labelPelanggan);
    }
  });

  it("semua status bayar terdaftar di INFO_BAYAR", () => {
    for (const bayar of ["BELUM_BAYAR", "MENUNGGU_VERIFIKASI", "LUNAS"] as const) {
      assert.ok(INFO_BAYAR[bayar]);
      assert.ok(INFO_BAYAR[bayar].label);
    }
  });
});

describe("Generator Kode Pesanan", () => {
  it("menghasilkan format CR-YYMMDD-XXXXXX", () => {
    const tanggal = new Date("2026-09-13T12:00:00Z");
    const kode = buatKodePesanan(tanggal);
    const regex = /^CR-260913-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
    assert.match(kode, regex);
  });

  it("memakai tanggal WIB, bukan tanggal UTC", () => {
    // 13 September 2026 pukul 22.00 UTC sudah tanggal 14 di Jakarta.
    const kode = buatKodePesanan(new Date("2026-09-13T22:00:00Z"));
    assert.match(kode, /^CR-260914-/);
  });

  it("tidak mengandung huruf yang mudah tertukar (I, O, 0, 1)", () => {
    for (let i = 0; i < 50; i++) {
      const kode = buatKodePesanan();
      const acak = kode.split("-")[2];
      assert.doesNotMatch(acak, /[IO01]/);
    }
  });

  it("tidak mengulang kode dalam ribuan pembuatan berturut-turut", () => {
    const terlihat = new Set<string>();
    for (let i = 0; i < 5000; i++) {
      terlihat.add(buatKodePesanan());
    }
    assert.equal(terlihat.size, 5000);
  });
});

