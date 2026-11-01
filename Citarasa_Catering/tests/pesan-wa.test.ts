import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pesanWaStatus, pesanWaTagihan, type DataPesananWa, type DataUsahaWa } from "../src/lib/pesan-wa";

const usaha: DataUsahaWa = {
  namaUsaha: "Citarasa Catering",
  alamat: "Jl. Melati No. 17",
  namaBank: "BCA",
  nomorRekening: "1234567890",
  namaRekening: "Ratna",
  alamatSitus: "https://citarasa.id/",
};

const dasar: DataPesananWa = {
  kode: "CR-261101-AB12CD",
  namaPemesan: "Ibu Ratna Kusuma",
  status: "BARU",
  statusBayar: "BELUM_BAYAR",
  caraBayar: "TRANSFER",
  caraAmbil: "AMBIL_SENDIRI",
  total: 450000,
  tanggalAcara: new Date("2026-11-02T00:00:00+07:00"),
  jamAcara: "11:30",
};

describe("Templat WhatsApp dapur", () => {
  it("pesanan baru transfer: menyapa dengan nama panggilan, memuat kode, total, rekening & tautan", () => {
    const { label, pesan } = pesanWaStatus(dasar, usaha);
    assert.match(label, /diterima/);
    assert.match(pesan, /^Halo Ibu Ratna,/);
    assert.match(pesan, /CR-261101-AB12CD/);
    assert.match(pesan, /Rp450\.000/);
    assert.match(pesan, /BCA 1234567890/);
    // Garis miring di akhir alamat situs tidak boleh menghasilkan "//".
    assert.match(pesan, /https:\/\/citarasa\.id\/pesanan\/CR-261101-AB12CD/);
  });

  it("tunai tidak pernah memuat nomor rekening", () => {
    const { pesan } = pesanWaStatus({ ...dasar, caraBayar: "TUNAI" }, usaha);
    assert.doesNotMatch(pesan, /1234567890/);
  });

  it("siap: membedakan diantar vs diambil, dan mengingatkan uang tunai", () => {
    const ambil = pesanWaStatus({ ...dasar, status: "SIAP", caraBayar: "TUNAI" }, usaha);
    assert.match(ambil.label, /diambil/);
    assert.match(ambil.pesan, /Jl\. Melati No\. 17/);
    assert.match(ambil.pesan, /tunai \*Rp450\.000\*/);
    const antar = pesanWaStatus({ ...dasar, status: "SIAP", caraAmbil: "DIANTAR", statusBayar: "LUNAS" }, usaha);
    assert.match(antar.label, /diantar/);
    assert.doesNotMatch(antar.pesan, /tunai/);
  });

  it("untuk staf dapur: tanpa total maupun nomor rekening", () => {
    for (const status of ["BARU", "DIKONFIRMASI", "SIAP"] as const) {
      const { pesan } = pesanWaStatus({ ...dasar, status, caraBayar: status === "SIAP" ? "TUNAI" : "TRANSFER" }, usaha, { tanpaNominal: true });
      assert.doesNotMatch(pesan, /Rp/, status);
      assert.doesNotMatch(pesan, /1234567890/, status);
    }
  });

  it("dibatalkan menyertakan alasan", () => {
    const { pesan } = pesanWaStatus({ ...dasar, status: "DIBATALKAN", alasanBatal: "Dapur penuh" }, usaha);
    assert.match(pesan, /Alasan: Dapur penuh/);
  });

  it("pengingat bayar hanya untuk transfer yang belum dibayar", () => {
    assert.ok(pesanWaTagihan(dasar, usaha));
    assert.equal(pesanWaTagihan({ ...dasar, statusBayar: "LUNAS" }, usaha), null);
    assert.equal(pesanWaTagihan({ ...dasar, statusBayar: "MENUNGGU_VERIFIKASI" }, usaha), null);
    assert.equal(pesanWaTagihan({ ...dasar, caraBayar: "TUNAI" }, usaha), null);
    assert.equal(pesanWaTagihan({ ...dasar, status: "DIBATALKAN" }, usaha), null);
    assert.equal(pesanWaTagihan(dasar, { ...usaha, nomorRekening: "" }), null);
  });
});
