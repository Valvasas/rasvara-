import { test } from "node:test";
import assert from "node:assert/strict";
import { susunPesanWa, templatRelevan, type PesananUntukWa } from "../src/lib/template-wa";

const p: PesananUntukWa & { status: string } = {
  kode: "CR-261003-ABC123",
  namaPemesan: "Ibu Sri Wahyuni",
  tanggalAcara: new Date(Date.UTC(2026, 9, 5, 5)),
  jamAcara: "11:30",
  caraAmbil: "DIANTAR",
  total: 1_000_000,
  dibayar: 0,
  minimalDp: 500_000,
  item: [{ namaMenu: "Nasi Kotak Ayam Bakar", jumlah: 40, satuan: "kotak" }],
  status: "BARU",
};
const u = { namaUsaha: "Citarasa", alamatSitus: "https://citarasa.id", namaBank: "BCA", nomorRekening: "123", namaRekening: "Citarasa" };

test("templat relevan mengikuti keadaan pesanan", () => {
  assert.deepEqual(templatRelevan(p), ["konfirmasi", "tagih_dp", "tagih_pelunasan"]);
  assert.deepEqual(templatRelevan({ ...p, status: "SIAP", dibayar: 1_000_000 }), ["siap"]);
});

test("tagih DP menyebut kekurangan DP, rekening, dan tautan lacak", () => {
  const teks = susunPesanWa("tagih_dp", p, u);
  assert.match(teks, /DP Rp500\.000/);
  assert.match(teks, /BCA 123/);
  assert.match(teks, /lacak\?kode=CR-261003-ABC123/);
  assert.match(teks, /^Halo Ibu Sri,/);
});

test("pesan siap menyebut sisa bila belum lunas", () => {
  assert.match(susunPesanWa("siap", { ...p, dibayar: 500_000 }, u), /Sisa pembayaran Rp500\.000/);
  assert.doesNotMatch(susunPesanWa("siap", { ...p, dibayar: 1_000_000 }, u), /Sisa/);
});
