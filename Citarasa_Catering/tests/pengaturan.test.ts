import { test } from "node:test";
import assert from "node:assert/strict";
import { kekuranganPengaturan, rekeningLengkap } from "../src/lib/pengaturan";
import type { Pengaturan } from "../src/generated/prisma/client";

const dasar: Pengaturan = {
  id: "utama",
  namaUsaha: "Citarasa Catering",
  tagline: "",
  cerita: "",
  whatsapp: "6281234567890",
  alamat: "Jl. Mawar 1",
  jamBuka: "16:00",
  jamTutup: "23:00",
  namaBank: "BCA",
  nomorRekening: "123",
  namaRekening: "Citarasa",
  ongkirDefault: 0,
  minOrderAntar: 0,
  persenDp: 0,
  batasBayarJam: 0,
  tugasTerakhir: null,
  diubahPada: new Date(),
};

test("rekeningLengkap butuh bank, nomor, dan nama", () => {
  assert.equal(rekeningLengkap(dasar), true);
  assert.equal(rekeningLengkap({ ...dasar, nomorRekening: "  " }), false);
  assert.equal(rekeningLengkap({ ...dasar, namaRekening: "" }), false);
});

test("kekuranganPengaturan menyebut data yang kosong", () => {
  assert.deepEqual(kekuranganPengaturan(dasar), []);
  const kurang = kekuranganPengaturan({ ...dasar, whatsapp: "", alamat: "", namaBank: "" });
  assert.equal(kurang.length, 3);
});
