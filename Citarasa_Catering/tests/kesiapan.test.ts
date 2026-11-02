import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { daftarKesiapan, sandiLemah } from "../src/lib/kesiapan";

const dasar = {
  whatsapp: "6281234567890",
  alamat: "Jl. Melati 17",
  rekeningLengkap: true,
  jedaMinimumMenit: 120,
  menuAktif: 4,
  menuBerfoto: 4,
  penyimpanan: "supabase",
};

describe("Daftar kesiapan toko", () => {
  it("toko lengkap = semua beres", () => {
    assert.ok(daftarKesiapan(dasar).every((b) => b.beres));
  });

  it("penyimpanan belum disiapkan = butir kritis di urutan teratas", () => {
    const d = daftarKesiapan({ ...dasar, penyimpanan: "belum-disiapkan", alamat: "" });
    assert.equal(d[0].kunci, "penyimpanan");
    assert.equal(d[0].beres, false);
    assert.match(d[0].keterangan, /SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("sandi bawaan hanya muncul bila diketahui", () => {
    assert.equal(daftarKesiapan(dasar).some((b) => b.kunci === "sandi"), false);
    assert.equal(daftarKesiapan({ ...dasar, sandiBawaan: true })[0].kunci, "sandi");
  });

  it("foto dihitung per menu aktif", () => {
    const foto = daftarKesiapan({ ...dasar, menuBerfoto: 1, menuAktif: 13 }).find((b) => b.kunci === "foto")!;
    assert.equal(foto.beres, false);
    assert.match(foto.keterangan, /1 dari 13/);
  });
});

describe("Sandi lemah saat login", () => {
  it("sandi contoh dokumentasi", () => {
    assert.equal(sandiLemah("citarasa123", "6281234567890"), true);
    assert.equal(sandiLemah("CITARASA123", "6281234567890"), true);
  });
  it("nomor HP sendiri sebagai sandi", () => {
    assert.equal(sandiLemah("081234567890", "6281234567890"), true);
  });
  it("sandi biasa lolos", () => {
    assert.equal(sandiLemah("nasiuduk-2026", "6281234567890"), false);
  });
});
