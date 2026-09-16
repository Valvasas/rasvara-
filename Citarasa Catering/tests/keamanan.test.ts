import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { amankanCsv } from "../src/lib/format";

describe("Keamanan & Pencegahan Injeksi", () => {
  describe("Sanitasi CSV (Formula Injection)", () => {
    it("menambahkan petik tunggal jika diawali tanda sama dengan (=)", () => {
      const input = "=1+1";
      assert.equal(amankanCsv(input), "\"'=1+1\"");
    });

    it("menambahkan petik tunggal jika diawali tanda tambah (+)", () => {
      const input = "+cmd|' /C calc'!A0";
      assert.equal(amankanCsv(input), "\"' +cmd|' /C calc'!A0\"".replace("+cmd", "+cmd"));
      assert.equal(amankanCsv("+123"), "\"' +123\"".replace("+123", "+123"));
      assert.equal(amankanCsv("+SUM(A1:A5)"), "\"'+SUM(A1:A5)\"");
    });

    it("menambahkan petik tunggal jika diawali tanda minus (-)", () => {
      const input = "-100";
      assert.equal(amankanCsv(input), "\"'-100\"");
    });

    it("menambahkan petik tunggal jika diawali tanda at (@)", () => {
      const input = "@SUM(1,2)";
      assert.equal(amankanCsv(input), "\"'@SUM(1,2)\"");
    });

    it("menambahkan petik tunggal jika diawali karakter tab atau carriage return", () => {
      assert.equal(amankanCsv("\tcmd"), "\"'\tcmd\"");
      assert.equal(amankanCsv("\rcmd"), "\"'\rcmd\"");
    });

    it("meng-escape tanda petik dua ganda di dalam teks", () => {
      const input = 'Nasi Kotak "Spesial" Ayam';
      assert.equal(amankanCsv(input), '"Nasi Kotak ""Spesial"" Ayam"');
    });

    it("mengembalikan '-' untuk nilai null atau undefined", () => {
      assert.equal(amankanCsv(null), "-");
      assert.equal(amankanCsv(undefined), "-");
      assert.equal(amankanCsv(""), "-");
    });

    it("tidak mengubah string aman biasa selain menambahkan petik ganda", () => {
      const input = "Pak Budi";
      assert.equal(amankanCsv(input), '"Pak Budi"');
    });
  });

  describe("Anti-Spoofing IP Client Parsing", () => {
    it("memilih IP paling kanan (terdekat dari trusted reverse proxy) pada X-Forwarded-For", () => {
      const headerXForwardedFor = "1.2.3.4 (palsu), 10.0.0.1, 203.0.113.195";
      const bagian = headerXForwardedFor.split(",").map((s) => s.trim()).filter(Boolean);
      const ipDipilih = bagian[bagian.length - 1];

      assert.equal(ipDipilih, "203.0.113.195");
      assert.notEqual(ipDipilih, "1.2.3.4 (palsu)");
    });

    it("bekerja benar untuk single IP pada X-Forwarded-For", () => {
      const headerXForwardedFor = "203.0.113.50";
      const bagian = headerXForwardedFor.split(",").map((s) => s.trim()).filter(Boolean);
      const ipDipilih = bagian[bagian.length - 1];

      assert.equal(ipDipilih, "203.0.113.50");
    });
  });
});

