/**
 * Uji integrasi pembatas laju bersama (butuh PostgreSQL sungguhan).
 * Dilewati otomatis bila DATABASE_URL tidak ada — CI unit test tetap jalan.
 *
 *   DATABASE_URL=... npx tsx --test tests/integrasi/*.test.ts
 */
import "dotenv/config";
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const adaDb = Boolean(process.env.DATABASE_URL);

describe("Pembatas laju di PostgreSQL", { skip: !adaDb && "DATABASE_URL tidak diisi" }, () => {
  after(async () => {
    const { db } = await import("../../src/lib/db");
    await db.$disconnect();
  });

  it("menolak percobaan ke-(maks+1) dan memberi waktu tunggu", async () => {
    const { periksaBatasLaju } = await import("../../src/lib/pembatas-laju");
    const kunci = `uji:${randomUUID()}`;
    for (let i = 0; i < 3; i++) {
      assert.equal((await periksaBatasLaju({ kunci, maksimal: 3, jendelaDetik: 60 })).diizinkan, true);
    }
    const ditolak = await periksaBatasLaju({ kunci, maksimal: 3, jendelaDetik: 60 });
    assert.equal(ditolak.diizinkan, false);
    assert.ok(ditolak.tungguDetik > 0 && ditolak.tungguDetik <= 60);
  });

  it("atomik: 20 permintaan serentak, tepat 5 yang lolos", async () => {
    const { periksaBatasLaju } = await import("../../src/lib/pembatas-laju");
    const kunci = `uji-serentak:${randomUUID()}`;
    const hasil = await Promise.all(
      Array.from({ length: 20 }, () => periksaBatasLaju({ kunci, maksimal: 5, jendelaDetik: 60 }))
    );
    assert.equal(hasil.filter((h) => h.diizinkan).length, 5);
  });

  it("reset membuka lagi, dan kunci mentah tidak pernah tersimpan", async () => {
    const { periksaBatasLaju, resetBatasLaju } = await import("../../src/lib/pembatas-laju");
    const { db } = await import("../../src/lib/db");
    const kunci = `masuk-akun:6281299998888-${randomUUID()}`;
    await periksaBatasLaju({ kunci, maksimal: 1, jendelaDetik: 60 });
    assert.equal((await periksaBatasLaju({ kunci, maksimal: 1, jendelaDetik: 60 })).diizinkan, false);
    const bocor = await db.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM "BatasLaju" WHERE "kunci" LIKE '%6281299998888%'`;
    assert.equal(bocor[0].n, 0, "nomor HP mentah tidak boleh ada di tabel");
    await resetBatasLaju(kunci);
    assert.equal((await periksaBatasLaju({ kunci, maksimal: 1, jendelaDetik: 60 })).diizinkan, true);
  });

  it("jendela yang sudah lewat dimulai dari nol lagi", async () => {
    const { periksaBatasLaju } = await import("../../src/lib/pembatas-laju");
    const kunci = `uji-jendela:${randomUUID()}`;
    await periksaBatasLaju({ kunci, maksimal: 1, jendelaDetik: 1 });
    assert.equal((await periksaBatasLaju({ kunci, maksimal: 1, jendelaDetik: 1 })).diizinkan, false);
    await new Promise((r) => setTimeout(r, 1200));
    assert.equal((await periksaBatasLaju({ kunci, maksimal: 1, jendelaDetik: 1 })).diizinkan, true);
  });
});
