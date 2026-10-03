import { test } from "node:test";
import assert from "node:assert/strict";
import { buatSlug } from "../src/lib/menu-tipe";
import { bolehPindahStatus } from "../src/lib/pesanan";

test("buatSlug: huruf kecil, tanda hubung, tanpa simbol", () => {
  assert.equal(buatSlug("Nasi Kotak Ayam Bakar!"), "nasi-kotak-ayam-bakar");
  assert.equal(buatSlug("  Paket Risoles Mayo (isi 10) "), "paket-risoles-mayo-isi-10");
  assert.equal(buatSlug("Café Crème"), "cafe-creme");
});

test("buatSlug: nama tanpa huruf/angka tetap menghasilkan slug", () => {
  assert.equal(buatSlug("!!!"), "menu");
});

test("buatSlug: dipotong 60 karakter", () => {
  assert.ok(buatSlug("a".repeat(200)).length <= 60);
});

test("pembatalan hanya dari status yang belum selesai", () => {
  for (const s of ["BARU", "DIKONFIRMASI", "DIPROSES", "SIAP"] as const) {
    assert.equal(bolehPindahStatus(s, "DIBATALKAN"), true, s);
  }
  assert.equal(bolehPindahStatus("SELESAI", "DIBATALKAN"), false);
  assert.equal(bolehPindahStatus("DIBATALKAN", "DIBATALKAN"), false);
});
