import { test } from "node:test";
import assert from "node:assert/strict";
import { hitungMargin, segmenkanPelanggan, skorKuintil, umurPiutang } from "../src/lib/insight";
import { geserTanggal, hitungPerkiraan, type PesananRiwayat } from "../src/lib/perkiraan";

test("skor kuintil: nilai sama mendapat skor sama, ekstrem di 1 dan 5", () => {
  const semua = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  assert.equal(skorKuintil(10, semua), 1);
  assert.equal(skorKuintil(100, semua), 5);
  assert.equal(skorKuintil(5, [5, 5, 5]), 3);
  assert.equal(skorKuintil(1, []), 3);
});

test("segmen pelanggan mengikuti aturan yang bisa dijelaskan", () => {
  const nilaiBesar = Array.from({ length: 8 }, (_, i) => ({ telepon: `x${i}`, hariSejakTerakhir: 10, frekuensi: 1, nilai: 100_000 }));
  const hasil = segmenkanPelanggan([
    ...nilaiBesar,
    { telepon: "andalan", hariSejakTerakhir: 20, frekuensi: 5, nilai: 9_000_000 },
    { telepon: "setia", hariSejakTerakhir: 40, frekuensi: 2, nilai: 200_000 },
    { telepon: "baru", hariSejakTerakhir: 5, frekuensi: 1, nilai: 150_000 },
    { telepon: "sapa", hariSejakTerakhir: 100, frekuensi: 4, nilai: 9_500_000 },
    { telepon: "hilang", hariSejakTerakhir: 200, frekuensi: 9, nilai: 10_000_000 },
  ]);
  const s = Object.fromEntries(hasil.map((h) => [h.telepon, h.segmen]));
  assert.equal(s.andalan, "ANDALAN");
  assert.equal(s.setia, "SETIA");
  assert.equal(s.baru, "BARU");
  assert.equal(s.sapa, "PERLU_DISAPA", "pelanggan besar yang lama diam tetap perlu disapa, bukan andalan");
  assert.equal(s.hilang, "HILANG", "lebih dari 6 bulan = hilang, berapa pun nilainya");
});

test("sekali pesan 3 bulan lalu = perlu disapa, bukan baru", () => {
  const [p] = segmenkanPelanggan([{ telepon: "a", hariSejakTerakhir: 90, frekuensi: 1, nilai: 1 }]);
  assert.equal(p.segmen, "PERLU_DISAPA");
});

test("umur piutang", () => {
  assert.equal(umurPiutang(3), "BELUM_JATUH_TEMPO");
  assert.equal(umurPiutang(0), "BELUM_JATUH_TEMPO", "acara hari ini belum jatuh tempo");
  assert.equal(umurPiutang(-1), "H0_7");
  assert.equal(umurPiutang(-7), "H0_7");
  assert.equal(umurPiutang(-8), "H8_30");
  assert.equal(umurPiutang(-30), "H8_30");
  assert.equal(umurPiutang(-31), "LEBIH_30");
});

test("margin: hanya dari omzet ber-HPP; laku tapi tipis ditandai", () => {
  const h = hitungMargin([
    { menuId: "a", nama: "Laris tipis", porsi: 500, omzet: 10_000_000, omzetBerHpp: 10_000_000, hpp: 8_500_000, hppPerkiraan: false },
    { menuId: "b", nama: "Laris tebal", porsi: 400, omzet: 8_000_000, omzetBerHpp: 8_000_000, hpp: 4_000_000, hppPerkiraan: false },
    { menuId: "c", nama: "Sepi tipis", porsi: 10, omzet: 200_000, omzetBerHpp: 200_000, hpp: 190_000, hppPerkiraan: false },
    { menuId: "d", nama: "Tanpa resep", porsi: 300, omzet: 6_000_000, omzetBerHpp: 0, hpp: 0, hppPerkiraan: false },
  ]);
  const m = Object.fromEntries(h.map((x) => [x.menuId, x]));
  assert.equal(Math.round(m.a.margin!), 15);
  assert.equal(m.a.lakuTapiTipis, true);
  assert.equal(m.b.lakuTapiTipis, false);
  assert.equal(m.c.lakuTapiTipis, false, "menu sepi tidak masuk 'laku tapi tipis'");
  assert.equal(m.d.margin, null);
  assert.equal(m.d.laba, null);
});

// ---------------------------------------------------------------- Perkiraan

/** Riwayat sintetis: tiap hari 100 porsi, separuh dipesan H-5, separuh H-1. */
function riwayatSeragam(hariIni: string, minggu = 8): PesananRiwayat[] {
  const r: PesananRiwayat[] = [];
  for (let d = 1; d <= minggu * 7; d++) {
    const t = geserTanggal(hariIni, -d);
    r.push({ tanggal: t, dipesanPada: geserTanggal(t, -5), porsi: 50 });
    r.push({ tanggal: t, dipesanPada: geserTanggal(t, -1), porsi: 50 });
  }
  return r;
}

test("perkiraan: data kurang → tidak menebak", () => {
  const hariIni = "2026-10-03";
  const h = hitungPerkiraan({ riwayat: riwayatSeragam(hariIni, 2), mendatang: [], hariIni, pertamaKali: geserTanggal(hariIni, -14) });
  assert.equal(h.cukupData, false);
  assert.ok(h.hari.every((x) => x.perkiraan === null));
  assert.equal(h.hari.length, 7);
});

test("perkiraan: kurva pemesanan + rata-rata hari yang sama", () => {
  const hariIni = "2026-10-03";
  const besok = geserTanggal(hariIni, 1);
  const lusa = geserTanggal(hariIni, 2);
  const h = hitungPerkiraan({
    riwayat: riwayatSeragam(hariIni),
    mendatang: [
      { tanggal: besok, dipesanPada: hariIni, porsi: 200 }, // besok sudah ramai: kurva bilang 200
      { tanggal: lusa, dipesanPada: hariIni, porsi: 25 },
    ],
    hariIni,
    pertamaKali: geserTanggal(hariIni, -100),
  });
  assert.equal(h.cukupData, true);
  const b = h.hari[0];
  assert.equal(b.biasanyaSudahMasuk, 1, "H-1: semua pesanan riwayat sudah masuk");
  assert.equal(b.perkiraan, 200, "r = 1 → sepenuhnya percaya pesanan yang ada");
  const l = h.hari[1];
  assert.equal(l.biasanyaSudahMasuk, 0.5);
  assert.equal(l.rataRataHariSama, 100);
  // 0,5 × (25 / 0,5) + 0,5 × 100 = 75
  assert.equal(l.perkiraan, 75);
  // Hari tanpa pesanan sama sekali dan r = 0 (H-6, H-7) → rata-rata 100.
  assert.equal(h.hari[6].perkiraan, 100);
});

test("perkiraan tidak pernah di bawah porsi yang sudah dipesan", () => {
  const hariIni = "2026-10-03";
  const t = geserTanggal(hariIni, 7);
  const h = hitungPerkiraan({
    riwayat: riwayatSeragam(hariIni),
    mendatang: [{ tanggal: t, dipesanPada: hariIni, porsi: 900 }],
    hariIni,
    pertamaKali: "2026-01-01",
  });
  assert.ok((h.hari[6].perkiraan ?? 0) >= 900);
});
