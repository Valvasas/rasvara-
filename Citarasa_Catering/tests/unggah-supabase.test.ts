import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  bacaBerkasUnggahan,
  bucketUntuk,
  hapusBerkasLama,
  jenisPenyimpanan,
  periksaPenyimpanan,
  resetStatusPenyimpanan,
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

describe("Pemeriksaan kesehatan penyimpanan (/api/health)", () => {
  const fetchAsli = globalThis.fetch;
  let balasanPerBucket: Record<string, () => Response> = {};
  let jumlahPanggilan = 0;

  beforeEach(() => {
    resetStatusPenyimpanan();
    process.env.SUPABASE_URL = "https://contoh.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "sb_secret_uji";
    jumlahPanggilan = 0;
    balasanPerBucket = {
      menu: () => Response.json({ id: "menu", public: false }),
      "bukti-transfer": () => Response.json({ id: "bukti-transfer", public: false }),
    };
    globalThis.fetch = (async (masukan: RequestInfo | URL) => {
      jumlahPanggilan++;
      const bucket = String(masukan).split("/storage/v1/bucket/")[1];
      return (balasanPerBucket[bucket] ?? (() => new Response("?", { status: 500 })))();
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = fetchAsli;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.VERCEL;
  });

  it("sehat: kedua bucket ada dan bukti transfer privat", async () => {
    assert.equal(await periksaPenyimpanan(), "supabase");
  });

  it("bucket bukti transfer yang publik dilaporkan (data rekening terbuka)", async () => {
    balasanPerBucket["bukti-transfer"] = () => Response.json({ id: "bukti-transfer", public: true });
    assert.equal(await periksaPenyimpanan(), "bucket-publik");
  });

  it("bucket menu publik tidak dianggap masalah keamanan", async () => {
    balasanPerBucket.menu = () => Response.json({ id: "menu", public: true });
    assert.equal(await periksaPenyimpanan(), "supabase");
  });

  it("kunci salah tempel → kunci-ditolak; bucket belum dibuat → bucket-hilang", async () => {
    balasanPerBucket.menu = () =>
      Response.json({ statusCode: "403", error: "Unauthorized", message: "signature verification failed" }, { status: 400 });
    assert.equal(await periksaPenyimpanan(), "kunci-ditolak");

    resetStatusPenyimpanan();
    balasanPerBucket.menu = () => Response.json({ id: "menu", public: false });
    balasanPerBucket["bukti-transfer"] = () =>
      Response.json({ statusCode: "404", error: "Bucket not found", message: "Bucket not found" }, { status: 400 });
    assert.equal(await periksaPenyimpanan(), "bucket-hilang");
  });

  it("kunci publik (publishable / anon JWT) yang salah tempel terdeteksi tanpa memanggil Storage", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "sb_publishable_abc123";
    assert.equal(await periksaPenyimpanan(), "kunci-ditolak");

    resetStatusPenyimpanan();
    const jwt = (role: string) =>
      ["eyJhbGciOiJIUzI1NiJ9", Buffer.from(JSON.stringify({ role })).toString("base64url"), "tandatangan"].join(".");
    process.env.SUPABASE_SERVICE_ROLE_KEY = jwt("anon");
    assert.equal(await periksaPenyimpanan(), "kunci-ditolak");
    assert.equal(jumlahPanggilan, 0);

    resetStatusPenyimpanan();
    process.env.SUPABASE_SERVICE_ROLE_KEY = jwt("service_role");
    assert.equal(await periksaPenyimpanan(), "supabase");
  });

  it("Supabase tak terjangkau → tak-terjangkau, bukan lempar galat", async () => {
    globalThis.fetch = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    assert.equal(await periksaPenyimpanan(), "tak-terjangkau");
  });

  it("tanpa konfigurasi: lokal di komputer sendiri, belum-disiapkan di Vercel", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.equal(await periksaPenyimpanan(), "lokal");
    process.env.VERCEL = "1";
    assert.equal(await periksaPenyimpanan(), "belum-disiapkan");
    assert.equal(jumlahPanggilan, 0);
  });

  it("hasil sehat di-cache: endpoint publik tidak bisa dipakai membanjiri Supabase", async () => {
    await periksaPenyimpanan();
    const setelahPertama = jumlahPanggilan;
    for (let i = 0; i < 20; i++) await periksaPenyimpanan();
    assert.equal(jumlahPanggilan, setelahPertama);
  });
});
