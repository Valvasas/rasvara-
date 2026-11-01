import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buatTokenFormulir, honeypotTerisi, periksaTokenFormulir } from "../src/lib/anti-bot";

const RAHASIA = "r".repeat(48);
const T0 = 1_790_000_000_000;

describe("Anti-bot formulir pesanan", () => {
  it("token sah setelah waktu wajar", () => {
    const token = buatTokenFormulir(T0, RAHASIA);
    assert.equal(periksaTokenFormulir(token, T0 + 30_000, RAHASIA), "ok");
  });

  it("kiriman terlalu cepat ditolak", () => {
    const token = buatTokenFormulir(T0, RAHASIA);
    assert.equal(periksaTokenFormulir(token, T0 + 500, RAHASIA), "terlalu-cepat");
  });

  it("token kedaluwarsa setelah 48 jam", () => {
    const token = buatTokenFormulir(T0, RAHASIA);
    assert.equal(periksaTokenFormulir(token, T0 + 49 * 3600_000, RAHASIA), "kedaluwarsa");
  });

  it("token karangan / dari rahasia lain / kosong ditolak", () => {
    assert.equal(periksaTokenFormulir(undefined, T0, RAHASIA), "tidak-sah");
    assert.equal(periksaTokenFormulir("", T0, RAHASIA), "tidak-sah");
    assert.equal(periksaTokenFormulir(`palsu.pesan:${T0 - 60_000}`, T0, RAHASIA), "tidak-sah");
    const tokenLain = buatTokenFormulir(T0 - 60_000, "x".repeat(48));
    assert.equal(periksaTokenFormulir(tokenLain, T0, RAHASIA), "tidak-sah");
  });

  it("waktu muat tidak bisa dimundurkan tanpa merusak tanda tangan", () => {
    const token = buatTokenFormulir(T0, RAHASIA);
    const diubah = token.replace(`pesan:${T0}`, `pesan:${T0 - 3600_000}`);
    assert.equal(periksaTokenFormulir(diubah, T0 + 100, RAHASIA), "tidak-sah");
  });

  it("honeypot", () => {
    assert.equal(honeypotTerisi(""), false);
    assert.equal(honeypotTerisi(null), false);
    assert.equal(honeypotTerisi("https://spam.example"), true);
  });
});
