import { test } from "node:test";
import assert from "node:assert/strict";
import { bulatkanBelanja, daftarBelanja, rekapProduksi } from "../src/lib/belanja";

test("pembulatan belanja: satuan utuh ke atas, kg/liter ke 0,1", () => {
  assert.equal(bulatkanBelanja(12.2, "butir"), 13);
  assert.equal(bulatkanBelanja(12, "butir"), 12);
  assert.equal(bulatkanBelanja(4.21, "kg"), 4.3);
  assert.equal(bulatkanBelanja(4.2, "kg"), 4.2);
  assert.equal(bulatkanBelanja(0, "kg"), 0);
});

test("rekap produksi menggabungkan menu yang sama dari banyak pesanan", () => {
  const r = rekapProduksi([
    { menuId: "a", namaMenu: "Nasi Ayam", satuan: "kotak", jumlah: 30 },
    { menuId: "b", namaMenu: "Risoles", satuan: "paket", jumlah: 5 },
    { menuId: "a", namaMenu: "Nasi Ayam", satuan: "kotak", jumlah: 20 },
  ]);
  assert.deepEqual(r.map((x) => [x.namaMenu, x.jumlah]), [["Nasi Ayam", 50], ["Risoles", 5]]);
});

test("daftar belanja = porsi × takaran, dijumlah per bahan, dengan biaya", () => {
  const hasil = daftarBelanja(
    [
      { menuId: "a", namaMenu: "Nasi Ayam", satuan: "kotak", jumlah: 50 },
      { menuId: "b", namaMenu: "Nasi Rendang", satuan: "kotak", jumlah: 10 },
      { menuId: "c", namaMenu: "Snack", satuan: "box", jumlah: 20 },
    ],
    [
      { menuId: "a", bahanId: "beras", namaBahan: "Beras", satuan: "kg", hargaPerSatuan: 14000, jumlahPerPorsi: 0.12 },
      { menuId: "a", bahanId: "ayam", namaBahan: "Ayam", satuan: "kg", hargaPerSatuan: 38000, jumlahPerPorsi: 0.15 },
      { menuId: "b", bahanId: "beras", namaBahan: "Beras", satuan: "kg", hargaPerSatuan: 14000, jumlahPerPorsi: 0.12 },
    ]
  );
  const beras = hasil.baris.find((b) => b.bahanId === "beras")!;
  assert.ok(Math.abs(beras.jumlah - 7.2) < 1e-9);
  assert.equal(beras.jumlahBeli, 7.2);
  assert.equal(beras.perkiraanBiaya, 100800);
  assert.deepEqual(beras.dipakaiUntuk, ["Nasi Ayam", "Nasi Rendang"]);
  assert.deepEqual(hasil.tanpaResep, ["Snack"]);
  assert.equal(hasil.totalBiaya, 100800 + Math.round(7.5 * 38000));
});
