import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hashSandi, cocokkanSandi } from "../src/lib/auth";

describe("Autentikasi & Password Hashing", () => {
  it("menghasilkan hash berformat salt:key dengan scrypt", async () => {
    const sandi = "citarasa123";
    const hash = await hashSandi(sandi);
    assert.match(hash, /^[0-9a-f]{32}:[0-9a-f]{128}$/);
  });

  it("menghasilkan hash berbeda untuk sandi yang sama (salt acak)", async () => {
    const sandi = "rahasiaDapur";
    const hash1 = await hashSandi(sandi);
    const hash2 = await hashSandi(sandi);
    assert.notEqual(hash1, hash2);
  });

  it("berhasil mencocokkan sandi yang benar", async () => {
    const sandi = "makanEnak2026!";
    const hash = await hashSandi(sandi);
    const cocok = await cocokkanSandi(sandi, hash);
    assert.equal(cocok, true);
  });

  it("menolak sandi yang salah", async () => {
    const hash = await hashSandi("sandiBenar");
    const cocok = await cocokkanSandi("sandiSalah", hash);
    assert.equal(cocok, false);
  });

  it("menolak format hash yang rusak/invalid tanpa crash", async () => {
    const cocok = await cocokkanSandi("sandi", "invalid_hash_string");
    assert.equal(cocok, false);
  });
});

