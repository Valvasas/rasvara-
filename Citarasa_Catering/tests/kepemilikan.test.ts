import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pesananMilikAkun, sesiDapur, tujuanAman } from "../src/lib/kepemilikan";

describe("Kepemilikan pesanan", () => {
  const pelanggan = { id: "akun-1", peran: "PELANGGAN" };

  it("pesanan tersambung ke akun yang sama → milik", () => {
    assert.equal(pesananMilikAkun(pelanggan, { penggunaId: "akun-1" }), true);
  });

  it("pesanan akun lain → bukan milik, walau nomor HP-nya sama", () => {
    // Nomor HP tidak ikut diperiksa sama sekali: nomor saat daftar belum diverifikasi.
    assert.equal(pesananMilikAkun(pelanggan, { penggunaId: "akun-2" }), false);
  });

  it("pesanan tamu (tanpa akun) → bukan milik siapa pun sampai diklaim", () => {
    assert.equal(pesananMilikAkun(pelanggan, { penggunaId: null }), false);
  });

  it("belum login → bukan milik", () => {
    assert.equal(pesananMilikAkun(null, { penggunaId: "akun-1" }), false);
    assert.equal(pesananMilikAkun(undefined, { penggunaId: null }), false);
  });

  it("hanya pemilik & staf dapur yang dianggap dapur", () => {
    assert.equal(sesiDapur({ id: "x", peran: "PEMILIK" }), true);
    assert.equal(sesiDapur({ id: "x", peran: "STAF_DAPUR" }), true);
    assert.equal(sesiDapur(pelanggan), false);
    assert.equal(sesiDapur(null), false);
  });
});

describe("Tujuan setelah login (anti open-redirect)", () => {
  it("menerima path internal", () => {
    assert.equal(tujuanAman("/pesan", "/riwayat"), "/pesan");
    assert.equal(tujuanAman("/menu/nasi-kotak-ayam?x=1", "/"), "/menu/nasi-kotak-ayam?x=1");
    assert.equal(tujuanAman("/admin/menu", "/admin"), "/admin/menu");
  });

  it("menolak domain luar dalam segala bentuk", () => {
    for (const jahat of [
      "https://situs-tiruan.com",
      "//situs-tiruan.com",
      "/\\situs-tiruan.com",
      "javascript:alert(1)",
      "/\tjavascript:alert(1)",
      "/%0a//evil",
      " //evil.com",
    ]) {
      const hasil = tujuanAman(jahat, "/riwayat");
      assert.ok(
        hasil === "/riwayat" || (hasil.startsWith("/") && !hasil.startsWith("//")),
        `lolos: ${JSON.stringify(jahat)} → ${hasil}`
      );
    }
    assert.equal(tujuanAman("https://situs-tiruan.com", "/riwayat"), "/riwayat");
    assert.equal(tujuanAman("//situs-tiruan.com", "/riwayat"), "/riwayat");
    assert.equal(tujuanAman("/\\situs-tiruan.com", "/riwayat"), "/riwayat");
    assert.equal(tujuanAman("/\tjavascript:alert(1)", "/riwayat"), "/riwayat");
  });

  it("menolak nilai bukan teks, kosong, terlalu panjang, atau halaman login itu sendiri", () => {
    assert.equal(tujuanAman(null, "/a"), "/a");
    assert.equal(tujuanAman(undefined, "/a"), "/a");
    assert.equal(tujuanAman("", "/a"), "/a");
    assert.equal(tujuanAman("/" + "x".repeat(300), "/a"), "/a");
    assert.equal(tujuanAman("/masuk", "/a"), "/a");
    assert.equal(tujuanAman("/daftar?ke=/pesan", "/a"), "/a");
    // Path yang hanya diawali kata "masuk" tetap sah.
    assert.equal(tujuanAman("/masukan", "/a"), "/masukan");
  });
});
