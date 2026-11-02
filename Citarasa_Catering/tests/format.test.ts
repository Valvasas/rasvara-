import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  rupiah,
  angka,
  tanggalPanjang,
  tanggalPendek,
  tanggalTanpaTahun,
  kunciHari,
  jam,
  dariInputTanggal,
  menitDariJam,
  jamTampil,
  sedangBuka,
  normalkanTelepon,
  teleponHpSah,
  teleponLokalDariInput,
  teleponTampil,
  namaPanggilan,
} from "../src/lib/format";

describe("Format Keuangan", () => {
  it("memformat rupiah positif dengan benar", () => {
    assert.equal(rupiah(45000), "Rp45.000");
    assert.equal(rupiah(0), "Rp0");
    assert.equal(rupiah(1250500), "Rp1.250.500");
  });

  it("memformat rupiah negatif dengan tanda minus di depan", () => {
    assert.equal(rupiah(-235000), "-Rp235.000");
  });

  it("memformat angka tanpa simbol Rp", () => {
    assert.equal(angka(45000), "45.000");
    assert.equal(angka(1000000), "1.000.000");
  });
});

describe("Format Tanggal dan Waktu (WIB)", () => {
  it("kunciHari menghasilkan YYYY-MM-DD dalam WIB", () => {
    // 2026-09-12 18:00 UTC = 2026-09-13 01:00 WIB
    const utcDate = new Date("2026-09-12T18:00:00Z");
    assert.equal(kunciHari(utcDate), "2026-09-13");
  });

  it("jam menghasilkan waktu WIB dengan pemisah titik", () => {
    // 2026-09-13 03:30 UTC = 2026-09-13 10.30 WIB
    const utcDate = new Date("2026-09-13T03:30:00Z");
    assert.equal(jam(utcDate), "10.30");
  });

  it("dariInputTanggal menghasilkan tanggal tengah hari WIB", () => {
    const d = dariInputTanggal("2026-09-13");
    // Pukul 12:00 WIB = 05:00 UTC
    assert.equal(d.toISOString(), "2026-09-13T05:00:00.000Z");
  });

  it("tanggalPanjang memformat bahasa Indonesia dengan hari dan bulan", () => {
    const tgl = dariInputTanggal("2026-09-13");
    assert.match(tanggalPanjang(tgl), /Minggu, 13 September 2026/);
  });

  it("tanggalPendek memformat singkatan bulan", () => {
    const tgl = dariInputTanggal("2026-09-13");
    assert.equal(tanggalPendek(tgl), "13 Sep 2026");
  });

  it("menitDariJam menghitung menit sejak tengah malam", () => {
    assert.equal(menitDariJam("00:00"), 0);
    assert.equal(menitDariJam("08:30"), 510);
    assert.equal(menitDariJam("16:00"), 960);
    assert.equal(menitDariJam("23:59"), 1439);
  });

  it("jamTampil mengganti titik dua dengan titik gaya Indonesia", () => {
    assert.equal(jamTampil("16:00"), "16.00");
    assert.equal(jamTampil("09:30"), "09.30");
  });
});

describe("Format dan Normalisasi Nomor Telepon", () => {
  it("menormalkan awalan 08 ke 628", () => {
    assert.equal(normalkanTelepon("081234567890"), "6281234567890");
  });

  it("menormalkan awalan +62 ke 62", () => {
    assert.equal(normalkanTelepon("+6281234567890"), "6281234567890");
  });

  it("menormalkan nomor yang sudah 62", () => {
    assert.equal(normalkanTelepon("6281234567890"), "6281234567890");
  });

  it("menghapus spasi dan tanda hubung", () => {
    assert.equal(normalkanTelepon("0812-3456-7890"), "6281234567890");
    assert.equal(normalkanTelepon(" 0812 3456 7890 "), "6281234567890");
  });

  it("teleponTampil mengubah format ke 08xx-xxxx-xxxx", () => {
    assert.equal(teleponTampil("6281234567890"), "0812-3456-7890");
  });
});

describe("Format Sapaan Nama Panggilan", () => {
  it("menyapa nama tunggal", () => {
    assert.equal(namaPanggilan("Budi"), "Budi");
  });

  it("menyapa nama majemuk biasa", () => {
    assert.equal(namaPanggilan("Budi Santoso"), "Budi");
  });

  it("menyertakan sapaan jika diawali gelar/sapaan hormat", () => {
    assert.equal(namaPanggilan("Ibu Ratna"), "Ibu Ratna");
    assert.equal(namaPanggilan("Pak Bambang"), "Pak Bambang");
    assert.equal(namaPanggilan("Mbak Siti"), "Mbak Siti");
    assert.equal(namaPanggilan("dr. Hendra"), "dr. Hendra");
  });
});


describe("Isian telepon berawalan +62", () => {
  it("menyederhanakan semua cara tulis menjadi digit setelah kode negara", () => {
    for (const masukan of ["081234567890", "+62 812-3456-7890", "6281234567890", "0812 3456 7890", "812345 67890"]) {
      assert.equal(teleponLokalDariInput(masukan), "81234567890");
    }
  });

  it("hasilnya diterima normalisasi server", () => {
    assert.equal(normalkanTelepon(teleponLokalDariInput("0812-3456-7890")), "6281234567890");
  });

  it("nomor HP Indonesia yang sah", () => {
    assert.equal(teleponHpSah("081234567890"), true);
    assert.equal(teleponHpSah("+6281234567"), true);
    assert.equal(teleponHpSah("0212345678"), false); // telepon rumah: tidak ada WhatsApp
    assert.equal(teleponHpSah("0812"), false);
    assert.equal(teleponHpSah("08123456789012345"), false);
  });
});
