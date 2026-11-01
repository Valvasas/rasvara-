import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  bacaBerkasUnggahan,
  bucketUntuk,
  hapusBerkasLama,
  jenisPenyimpanan,
  simpanBerkasUnggahan,
} from "../src/lib/unggah";

type Panggilan = { url: string; metode: string; header: Record<string, string> };

describe("Penyimpanan Supabase Storage", () => {
  const fetchAsli = globalThis.fetch;
  let panggilan: Panggilan[] = [];
  let balasan: () => Response = () => new Response("{}", { status: 200 });

  beforeEach(() => {
    process.env.SUPABASE_URL = "https://contoh.supabase.co/";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "sb_secret_uji";
    panggilan = [];
    globalThis.fetch = (async (masukan: RequestInfo | URL, init?: RequestInit) => {
      panggilan.push({
        url: String(masukan),
        metode: init?.method ?? "GET",
        header: (init?.headers ?? {}) as Record<string, string>,
      });
      return balasan();
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = fetchAsli;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.VERCEL;
    balasan = () => new Response("{}", { status: 200 });
  });

  it("memilih Supabase hanya bila URL & kunci terisi", () => {
    assert.equal(jenisPenyimpanan(), "supabase");
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.equal(jenisPenyimpanan(), "lokal");
  });

  it("bukti transfer ke bucket privat, foto menu ke bucket menu", () => {
    assert.equal(bucketUntuk("bukti-1780000000000-0123456789abcdef01234567.jpg"), "bukti-transfer");
    assert.equal(bucketUntuk("menu-1780000000000-0123456789abcdef01234567.png"), "menu");
  });

  it("unggah: URL bucket benar, kunci di header, URL publik tetap /unggahan/", async () => {
    const nama = "bukti-1780000000000-0123456789abcdef01234567.jpg";
    const url = await simpanBerkasUnggahan(Buffer.from([0xff, 0xd8, 0xff]), nama);
    assert.equal(url, `/unggahan/${nama}`);
    assert.equal(panggilan.length, 1);
    assert.equal(panggilan[0].metode, "POST");
    assert.equal(panggilan[0].url, `https://contoh.supabase.co/storage/v1/object/bukti-transfer/${nama}`);
    assert.equal(panggilan[0].header.apikey, "sb_secret_uji");
    assert.equal(panggilan[0].header.Authorization, "Bearer sb_secret_uji");
    assert.equal(panggilan[0].header["Content-Type"], "image/jpeg");
    assert.equal(panggilan[0].header["x-upsert"], "false");
  });

  it("unggah ditolak Storage → galat yang ramah, bukan detail teknis", async () => {
    balasan = () => new Response("bucket not found", { status: 404 });
    await assert.rejects(
      simpanBerkasUnggahan(Buffer.from([1]), "menu-1780000000000-0123456789abcdef01234567.png"),
      /Gagal menyimpan foto/
    );
  });

  it("nama berkas di luar pola tidak pernah dikirim ke Storage", async () => {
    await assert.rejects(simpanBerkasUnggahan(Buffer.from([1]), "../../rahasia.jpg"), /tidak sah/);
    assert.equal(await bacaBerkasUnggahan("../etc/passwd"), null);
    await hapusBerkasLama("/unggahan/../../x");
    assert.equal(panggilan.length, 0);
  });

  it("baca: 404 dari Storage menjadi null", async () => {
    balasan = () => new Response("not found", { status: 404 });
    assert.equal(await bacaBerkasUnggahan("menu-1780000000000-0123456789abcdef01234567.webp"), null);
  });

  it("di Vercel tanpa konfigurasi Storage: menolak, tidak menulis ke disk sementara", async () => {
    delete process.env.SUPABASE_URL;
    process.env.VERCEL = "1";
    await assert.rejects(
      simpanBerkasUnggahan(Buffer.from([1]), "bukti-1780000000000-0123456789abcdef01234567.jpg"),
      /belum disiapkan/
    );
  });
});
