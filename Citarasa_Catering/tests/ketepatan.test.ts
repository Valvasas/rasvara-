import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ringkasKetepatan } from "../src/lib/ketepatan-tipe";

describe("Ketepatan waktu dapur", () => {
  it("sampel kecil tidak dipajang sebagai persentase", () => {
    const r = ringkasKetepatan({ total: 3, tepat: 3, medianMenitLebihAwal: 20 });
    assert.equal(r.cukup, false);
    if (!r.cukup) assert.equal(r.butuh, 2);
  });

  it("dibulatkan ke bawah: satu yang telat tidak boleh tampil 100%", () => {
    const r = ringkasKetepatan({ total: 250, tepat: 249, medianMenitLebihAwal: 30 });
    assert.ok(r.cukup);
    if (r.cukup) assert.equal(r.persen, 99);
  });

  it("nada mengikuti ambang 95% / 85%", () => {
    const nada = (tepat: number) => {
      const r = ringkasKetepatan({ total: 100, tepat, medianMenitLebihAwal: null });
      return r.cukup ? r.nada : null;
    };
    assert.equal(nada(95), "baik");
    assert.equal(nada(90), "waspada");
    assert.equal(nada(70), "buruk");
  });

  it("menjelaskan median dalam bahasa sehari-hari", () => {
    const awal = ringkasKetepatan({ total: 10, tepat: 10, medianMenitLebihAwal: 24.6 });
    const telat = ringkasKetepatan({ total: 10, tepat: 2, medianMenitLebihAwal: -12 });
    assert.ok(awal.cukup && telat.cukup);
    if (awal.cukup) assert.equal(awal.keteranganMedian, "biasanya siap 25 menit sebelum jam acara");
    if (telat.cukup) assert.equal(telat.keteranganMedian, "biasanya terlambat 12 menit");
  });
});
