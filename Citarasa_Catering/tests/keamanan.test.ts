import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { amankanCsv } from "../src/lib/format";
import { bukaTandatangan, tandatangani } from "../src/lib/cookie-tertanda";
import {
  IP_TAK_DIPERCAYA,
  periksaBatasLaju,
  pilihIpKlien,
  resetBatasLaju,
} from "../src/lib/pembatas-laju";

describe("Keamanan & Pencegahan Injeksi", () => {
  describe("Sanitasi CSV (Formula Injection)", () => {
    it("menambahkan petik tunggal jika diawali tanda sama dengan (=)", () => {
      const input = "=1+1";
      assert.equal(amankanCsv(input), "\"'=1+1\"");
    });

    it("menambahkan petik tunggal jika diawali tanda tambah (+)", () => {
      const input = "+cmd|' /C calc'!A0";
      assert.equal(amankanCsv(input), "\"'+cmd|' /C calc'!A0\"");
      assert.equal(amankanCsv("+123"), "\"'+123\"");
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

  describe("Cookie akses pesanan bertanda tangan", () => {
    const RAHASIA = "a".repeat(48);
    const MUATAN = JSON.stringify(["CR-260913-K7QPX4"]);

    it("mengembalikan muatan asli untuk nilai yang ditandatangani sendiri", () => {
      const nilai = tandatangani(MUATAN, RAHASIA);
      assert.equal(bukaTandatangan(nilai, RAHASIA), MUATAN);
    });

    it("menolak cookie mentah tanpa tanda tangan", () => {
      // Inilah bentuk yang dulu diterima apa adanya: siapa pun bisa menyusun
      // header Cookie berisi kode pesanan orang lain.
      assert.equal(bukaTandatangan(MUATAN, RAHASIA), null);
      assert.equal(bukaTandatangan('["CR-260913-AAAAAA"]', RAHASIA), null);
    });

    it("menolak muatan yang diubah setelah ditandatangani", () => {
      const nilai = tandatangani(MUATAN, RAHASIA);
      const tanda = nilai.slice(0, nilai.indexOf("."));
      const dipalsukan = `${tanda}.${JSON.stringify(["CR-260913-ZZZZZZ"])}`;
      assert.equal(bukaTandatangan(dipalsukan, RAHASIA), null);
    });

    it("menolak tanda tangan dari kunci rahasia lain", () => {
      const nilai = tandatangani(MUATAN, "b".repeat(48));
      assert.equal(bukaTandatangan(nilai, RAHASIA), null);
    });

    it("menolak nilai kosong atau tanpa pemisah", () => {
      assert.equal(bukaTandatangan(undefined, RAHASIA), null);
      assert.equal(bukaTandatangan("", RAHASIA), null);
      assert.equal(bukaTandatangan("tanpatitik", RAHASIA), null);
      assert.equal(bukaTandatangan(".muatan", RAHASIA), null);
    });

    it("menolak rahasia yang terlalu pendek daripada menandatangani dengan lemah", () => {
      assert.throws(() => tandatangani(MUATAN, "pendek"));
    });
  });

  describe("Pemilihan IP klien untuk pembatas laju", () => {
    it("memilih alamat yang ditambahkan proxy tepercaya, bukan yang dikarang klien", () => {
      const ip = pilihIpKlien("1.2.3.4 (palsu), 203.0.113.195", null, 1);
      assert.equal(ip, "203.0.113.195");
    });

    it("menghitung mundur sebanyak jumlah proxy tepercaya", () => {
      // Dua proxy: klien asli ada dua langkah dari kanan.
      const rantai = "9.9.9.9 (palsu), 203.0.113.195, 10.0.0.1";
      assert.equal(pilihIpKlien(rantai, null, 2), "203.0.113.195");
      assert.equal(pilihIpKlien(rantai, null, 1), "10.0.0.1");
    });

    it("mengabaikan seluruh header saat tidak ada proxy tepercaya", () => {
      // Tanpa proxy di depan, x-real-ip dan x-forwarded-for murni karangan
      // pengirim permintaan. Kalau dipercaya, penyerang cukup mengganti isinya
      // tiap permintaan untuk mendapat jatah percobaan login yang baru.
      assert.equal(
        pilihIpKlien("1.2.3.4", "5.6.7.8", 0),
        IP_TAK_DIPERCAYA
      );
      assert.equal(pilihIpKlien(null, null, 0), IP_TAK_DIPERCAYA);
    });

    it("memakai x-real-ip hanya sebagai cadangan saat ada proxy tepercaya", () => {
      assert.equal(pilihIpKlien(null, "203.0.113.7", 1), "203.0.113.7");
    });

    it("tidak memakai alamat di luar jangkauan rantai", () => {
      // Klien mengirim satu alamat karangan padahal ada dua proxy tepercaya:
      // rantainya terlalu pendek, jadi tidak ada yang boleh dipercaya darinya.
      assert.equal(pilihIpKlien("1.2.3.4 (palsu)", null, 2), "127.0.0.1");
    });
  });

  describe("Pembatas laju", () => {
    it("menolak setelah jatah dalam satu jendela habis", () => {
      const kunci = `uji-${Math.random()}`;
      for (let i = 0; i < 3; i++) {
        assert.equal(periksaBatasLaju({ kunci, maksimal: 3, jendelaDetik: 60 }).diizinkan, true);
      }
      const keempat = periksaBatasLaju({ kunci, maksimal: 3, jendelaDetik: 60 });
      assert.equal(keempat.diizinkan, false);
      assert.ok(keempat.tungguDetik > 0);
    });

    it("memberi jatah baru setelah direset", () => {
      const kunci = `uji-${Math.random()}`;
      periksaBatasLaju({ kunci, maksimal: 1, jendelaDetik: 60 });
      assert.equal(periksaBatasLaju({ kunci, maksimal: 1, jendelaDetik: 60 }).diizinkan, false);
      resetBatasLaju(kunci);
      assert.equal(periksaBatasLaju({ kunci, maksimal: 1, jendelaDetik: 60 }).diizinkan, true);
    });
  });
});

