import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rapikanPath } from "../src/lib/analitik-path";

describe("Perapian Path Statistik", () => {
  it("menyamarkan kode pesanan supaya tidak tersimpan di tabel statistik", () => {
    // Kode pesanan adalah data pemesan. Kalau tersimpan apa adanya, tabel
    // statistik berubah menjadi daftar pesanan yang bisa dibongkar.
    assert.equal(rapikanPath("/pesanan/CR-260915-K7QP"), "/pesanan/:kode");
    assert.equal(rapikanPath("/pesanan/CR-260101-AAAA"), "/pesanan/:kode");
  });

  it("mengelompokkan detail menu menjadi satu pola", () => {
    assert.equal(rapikanPath("/menu/nasi-kotak-ayam-bakar"), "/menu/:slug");
    assert.equal(rapikanPath("/menu/tumpeng-mini"), "/menu/:slug");
  });

  it("tidak mencatat halaman admin maupun API", () => {
    assert.equal(rapikanPath("/admin"), null);
    assert.equal(rapikanPath("/admin/keuangan"), null);
    assert.equal(rapikanPath("/api/admin/ekspor-laporan"), null);
  });

  it("meneruskan halaman publik biasa apa adanya", () => {
    assert.equal(rapikanPath("/"), "/");
    assert.equal(rapikanPath("/menu"), "/menu");
    assert.equal(rapikanPath("/pesan"), "/pesan");
    assert.equal(rapikanPath("/kebijakan-privasi"), "/kebijakan-privasi");
  });

  it("menolak path tidak wajar dan memotong yang kepanjangan", () => {
    assert.equal(rapikanPath("bukan-path"), null);

    const panjang = "/" + "a".repeat(200);
    const hasil = rapikanPath(panjang);
    assert.ok(hasil !== null);
    assert.equal(hasil.length, 80);
  });
});
