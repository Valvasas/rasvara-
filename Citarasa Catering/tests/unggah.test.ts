import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  verifikasiHeaderGambar,
  buatNamaFileAman,
  validasiBerkasUnggahan,
  BATAS_UKURAN_GAMBAR,
} from "../src/lib/unggah";

describe("Validasi Berkas Bukti Transfer", () => {
  it("mendeteksi header JPEG yang valid", () => {
    // Magic bytes JPEG: FF D8 FF E0 ...
    const bufferJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const hasil = verifikasiHeaderGambar(bufferJpeg);
    assert.equal(hasil.valid, true);
    assert.equal(hasil.tipe, "image/jpeg");
  });

  it("mendeteksi header PNG yang valid", () => {
    // Magic bytes PNG: 89 50 4E 47 0D 0A 1A 0A
    const bufferPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const hasil = verifikasiHeaderGambar(bufferPng);
    assert.equal(hasil.valid, true);
    assert.equal(hasil.tipe, "image/png");
  });

  it("mendeteksi header WebP yang valid", () => {
    // Magic bytes WebP: RIFF (4 bytes) + 4 bytes size + WEBP (4 bytes)
    const bufferWebp = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x24, 0x00, 0x00, 0x00, // size
      0x57, 0x42, 0x50, 0x20, // WEBP (byte 8: 0x57, 9: 0x45, 10: 0x42, 11: 0x50)
    ]);
    // wait, byte 9 is 0x45 ('E'), byte 10 is 0x42 ('B'), byte 11 is 0x50 ('P')
    const bufferWebpValid = Buffer.from([
      0x52, 0x49, 0x46, 0x46,
      0x00, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50,
    ]);
    const hasil = verifikasiHeaderGambar(bufferWebpValid);
    assert.equal(hasil.valid, true);
    assert.equal(hasil.tipe, "image/webp");
  });

  it("menolak file teks atau skrip yang menyamar (bukan gambar)", () => {
    const bufferTeks = Buffer.from("<?php echo 'bahaya'; ?> ini bukan gambar!");
    const hasil = verifikasiHeaderGambar(bufferTeks);
    assert.equal(hasil.valid, false);
  });

  it("menolak buffer terlalu pendek (< 12 bytes)", () => {
    const bufferPendek = Buffer.from([0xff, 0xd8, 0xff]);
    const hasil = verifikasiHeaderGambar(bufferPendek);
    assert.equal(hasil.valid, false);
  });

  it("menghasilkan nama file acak yang aman tanpa karakter traversal", () => {
    const namaFile = buatNamaFileAman("image/jpeg");
    assert.match(namaFile, /^bukti-\d+-[a-f0-9]{24}\.jpg$/);
    assert.equal(namaFile.includes("/"), false);
    assert.equal(namaFile.includes("\\"), false);
    assert.equal(namaFile.includes(".."), false);

    const namaPng = buatNamaFileAman("image/png");
    assert.match(namaPng, /^bukti-\d+-[a-f0-9]{24}\.png$/);
  });

  it("menolak unggahan kosong atau ukuran melebihi 5MB", async () => {
    const hasilKosong = await validasiBerkasUnggahan(null);
    assert.equal(hasilKosong.sukses, false);

    // Mock file besar
    const fileBesar = {
      size: BATAS_UKURAN_GAMBAR + 1024,
      arrayBuffer: async () => new ArrayBuffer(0),
    } as unknown as File;

    const hasilBesar = await validasiBerkasUnggahan(fileBesar);
    assert.equal(hasilBesar.sukses, false);
    assert.match(hasilBesar.pesan || "", /terlalu besar/);
  });
});
