import { test } from "node:test";
import assert from "node:assert/strict";
import { buatSlug } from "../src/lib/menu-tipe";
import { bolehPindahStatus } from "../src/lib/pesanan";
import { MAKS_NOMINAL } from "../src/lib/batas";
import { readFileSync } from "node:fs";

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

test("MAKS_NOMINAL muat di kolom Int PostgreSQL, termasuk ditambah ongkir maksimal", () => {
  // Total pesanan = subtotal (dibatasi MAKS_NOMINAL) + ongkir (maks 10 juta).
  assert.ok(MAKS_NOMINAL + 10_000_000 <= 2_147_483_647);
});

test("Server Action tidak meneruskan pesan galat mentah ke peramban", () => {
  // Pesan galat Prisma/sistem berkas memuat isi kueri dan jalur folder server.
  for (const berkas of ["auth", "kas", "menu", "pengaturan", "pesanan", "staf", "voucher"]) {
    const isi = readFileSync(new URL(`../src/app/aksi/${berkas}.ts`, import.meta.url), "utf8");
    // Yang boleh diteruskan hanya penolakan yang sengaja ditulis untuk
    // pengguna (mis. `instanceof PenolakanPesanan`), bukan sembarang Error.
    assert.doesNotMatch(isi, /instanceof Error \? \w+\.message/, berkas);
  }
});
