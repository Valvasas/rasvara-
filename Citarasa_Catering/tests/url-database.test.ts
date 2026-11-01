import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  bersihkanUrlDatabase,
  jenisKoneksiDatabase,
  PESAN_URL_DATABASE_RUSAK,
  urlDatabaseSah,
} from "../src/lib/url-database";

const POOLER = "postgresql://postgres.abcdefgh:S4ndiRahasia@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres";

describe("Connection string database dari dashboard hosting", () => {
  it("kutip & spasi hasil salin-tempel dari .env dibuang", () => {
    assert.equal(bersihkanUrlDatabase(`"${POOLER}"`), POOLER);
    assert.equal(bersihkanUrlDatabase(`'${POOLER}'`), POOLER);
    assert.equal(bersihkanUrlDatabase(`  ${POOLER}\n`), POOLER);
    assert.equal(bersihkanUrlDatabase(` " ${POOLER} " `), POOLER);
    // Kutip yang tidak berpasangan bukan pembungkus — dibiarkan (dan nanti ditolak).
    assert.equal(bersihkanUrlDatabase(`"${POOLER}`), `"${POOLER}`);
  });

  it("URL yang tetap rusak ditolak dengan pesan jelas yang TIDAK memuat sandi", () => {
    for (const rusak of [
      "postgresql://postgres:sandi#rahasia@host.supabase.com:6543/postgres",
      `"${POOLER}`,
      "mysql://u:p@localhost/db",
      "bukan url sama sekali",
    ]) {
      assert.throws(
        () => urlDatabaseSah(rusak),
        (galat: Error) => galat.message === PESAN_URL_DATABASE_RUSAK && !galat.message.includes("rahasia")
      );
    }
  });

  it("sandi dengan karakter khusus yang sudah di-encode diterima", () => {
    const url = urlDatabaseSah("postgresql://postgres:sandi%23rahasia@localhost:5432/citarasa");
    assert.equal(decodeURIComponent(url.password), "sandi#rahasia");
  });

  it("jenis koneksi untuk /api/health", () => {
    assert.equal(jenisKoneksiDatabase(undefined), "kosong");
    assert.equal(jenisKoneksiDatabase("   "), "kosong");
    assert.equal(jenisKoneksiDatabase(`"${POOLER}"`), "supabase-pooler-transaksi");
    assert.equal(jenisKoneksiDatabase(POOLER.replace(":6543", ":5432")), "supabase-pooler-sesi");
    assert.equal(
      jenisKoneksiDatabase("postgresql://postgres:x@db.abcdefgh.supabase.co:5432/postgres"),
      "supabase-langsung"
    );
    assert.equal(jenisKoneksiDatabase("postgresql://u:p@localhost:5432/citarasa"), "lain");
    assert.equal(jenisKoneksiDatabase("postgresql://u:p#x@localhost/db"), "rusak");
  });
});
