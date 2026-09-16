import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hitungPotongan,
  normalkanKodeVoucher,
  type VoucherUntukHitung,
} from "../src/lib/voucher";

const DASAR: VoucherUntukHitung = {
  jenis: "NOMINAL",
  nilai: 10000,
  maksPotongan: null,
  minBelanja: 0,
  kuota: null,
  terpakai: 0,
  mulaiPada: null,
  berakhirPada: null,
  aktif: true,
};

function buat(ubah: Partial<VoucherUntukHitung>): VoucherUntukHitung {
  return { ...DASAR, ...ubah };
}

describe("Perhitungan Potongan Voucher", () => {
  it("memotong nominal tetap", () => {
    const hasil = hitungPotongan(buat({ nilai: 15000 }), 100000);
    assert.equal(hasil.berlaku, true);
    assert.equal(hasil.berlaku && hasil.potongan, 15000);
  });

  it("memotong persen dan membulatkan ke bawah", () => {
    // 10% dari 99.999 = 9.999,9 -> dibulatkan ke bawah supaya usaha tidak rugi serupiah pun
    const hasil = hitungPotongan(buat({ jenis: "PERSEN", nilai: 10 }), 99999);
    assert.equal(hasil.berlaku && hasil.potongan, 9999);
  });

  it("menghormati batas maksimal potongan pada voucher persen", () => {
    const hasil = hitungPotongan(
      buat({ jenis: "PERSEN", nilai: 50, maksPotongan: 25000 }),
      200000
    );
    // 50% dari 200.000 = 100.000, tetapi dibatasi 25.000
    assert.equal(hasil.berlaku && hasil.potongan, 25000);
  });

  it("tidak pernah memotong melebihi belanja", () => {
    // Salah ketik nominal tidak boleh membuat total jadi negatif
    const hasil = hitungPotongan(buat({ nilai: 500000 }), 30000);
    assert.equal(hasil.berlaku && hasil.potongan, 30000);
  });

  it("menolak bila belanja belum mencapai minimum", () => {
    const hasil = hitungPotongan(buat({ minBelanja: 100000 }), 99000);
    assert.equal(hasil.berlaku, false);
    assert.equal(!hasil.berlaku && hasil.alasan, "MIN_BELANJA");
    assert.match(!hasil.berlaku ? hasil.pesan : "", /100\.000/);
  });

  it("menerima tepat di angka minimum belanja", () => {
    const hasil = hitungPotongan(buat({ minBelanja: 100000 }), 100000);
    assert.equal(hasil.berlaku, true);
  });

  it("menolak voucher nonaktif", () => {
    const hasil = hitungPotongan(buat({ aktif: false }), 100000);
    assert.equal(!hasil.berlaku && hasil.alasan, "NONAKTIF");
  });

  it("menolak voucher yang kuotanya sudah habis", () => {
    const hasil = hitungPotongan(buat({ kuota: 50, terpakai: 50 }), 100000);
    assert.equal(!hasil.berlaku && hasil.alasan, "KUOTA_HABIS");
  });

  it("mengizinkan voucher tanpa kuota dipakai berapa pun", () => {
    const hasil = hitungPotongan(buat({ kuota: null, terpakai: 9999 }), 100000);
    assert.equal(hasil.berlaku, true);
  });

  it("menolak voucher yang belum mulai dan yang sudah kedaluwarsa", () => {
    const sekarang = new Date("2026-09-16T10:00:00Z");

    const belum = hitungPotongan(
      buat({ mulaiPada: new Date("2026-10-01T00:00:00Z") }),
      100000,
      sekarang
    );
    assert.equal(!belum.berlaku && belum.alasan, "BELUM_BERLAKU");

    const habis = hitungPotongan(
      buat({ berakhirPada: new Date("2026-09-01T00:00:00Z") }),
      100000,
      sekarang
    );
    assert.equal(!habis.berlaku && habis.alasan, "KEDALUWARSA");
  });

  it("menerima voucher yang sedang dalam masa berlaku", () => {
    const hasil = hitungPotongan(
      buat({
        mulaiPada: new Date("2026-09-01T00:00:00Z"),
        berakhirPada: new Date("2026-09-30T23:59:59Z"),
      }),
      100000,
      new Date("2026-09-16T10:00:00Z")
    );
    assert.equal(hasil.berlaku, true);
  });
});

describe("Normalisasi Kode Voucher", () => {
  it("menyeragamkan huruf besar dan memangkas spasi", () => {
    assert.equal(normalkanKodeVoucher("  hemat10 "), "HEMAT10");
    assert.equal(normalkanKodeVoucher("Merdeka"), "MERDEKA");
  });
});
