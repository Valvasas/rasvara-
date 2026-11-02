/* eslint-disable */
// Uji alur akun & keamanan (v3): daftar, "Ingat saya", keluar dari perangkat
// lain, sandi bawaan di dashboard, reset sandi pelanggan oleh pemilik,
// portal dapur. Jalankan HANYA ke database uji yang baru di-seed
// (SEED_DATA_UJI=1) — skrip ini membuat akun dan mengganti sandi.
//
//   DATABASE_URL=... node scripts/uji-e2e/e2e-akun.cjs
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { Client } = require('pg');

const BASE = process.env.ALAMAT_UJI || 'http://localhost:3000';
const TELEPON_PEMILIK = process.env.TELEPON_PEMILIK || '081234567890';
const SANDI_PEMILIK = process.env.SANDI_PEMILIK || 'citarasa123';

let gagal = 0;
const galatHalaman = [];
function ok(nama, syarat, info = '') {
  console.log(`${syarat ? 'PASS' : 'FAIL'}  ${nama}${info ? '  — ' + info : ''}`);
  if (!syarat) gagal++;
}

async function konteks(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => galatHalaman.push(e.message));
  page.on('response', (r) => { if (r.status() >= 500) galatHalaman.push(`${r.status()} ${r.url()}`); });
  return { ctx, page };
}

async function buka(page, path) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
}

async function masuk(page, telepon, sandi, { ingat = true, ke = '' } = {}) {
  await buka(page, '/masuk' + ke);
  await page.fill('#telepon', telepon);
  await page.fill('#sandi', sandi);
  if (!ingat) await page.uncheck('input[name=ingat]');
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith('/masuk'), { timeout: 30000 }), page.locator('form button[type=submit]').click()]);
}

async function sudahMasuk(page) {
  await buka(page, '/akun');
  return (await page.getByRole('heading', { name: 'Keamanan' }).count()) > 0;
}

(async () => {
  if (/produksi|prod|supabase/i.test(process.env.DATABASE_URL || '')) throw new Error('Menolak berjalan: DATABASE_URL terlihat seperti produksi.');
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {});

  const NOMOR = '081355566677';
  await db.query(`delete from "Pengguna" where telepon = '6281355566677'`);

  // 1. Daftar: sandi contoh ditolak, sandi kuat diterima & langsung masuk
  const A = await konteks(browser);
  await buka(A.page, '/daftar');
  await A.page.fill('#nama', 'Dewi Uji Akun');
  await A.page.fill('#telepon', NOMOR);
  await A.page.fill('#sandi', 'citarasa123');
  await A.page.getByRole('button', { name: 'Buat akun' }).click();
  await A.page.waitForTimeout(1200);
  ok('Daftar: sandi contoh ditolak', (await A.page.getByText('terlalu umum').count()) > 0);
  ok('Daftar: nomor tetap terisi (+62 tanpa 0)', (await A.page.inputValue('#telepon')) === '81355566677');
  await A.page.fill('#sandi', 'dewi-uji-2026');
  await Promise.all([A.page.waitForURL(/riwayat/), A.page.getByRole('button', { name: 'Buat akun' }).click()]);
  const toastDaftar = await A.page.getByText('Akun dibuat').first().waitFor({ timeout: 8000 }).then(() => true, () => false);
  ok('Daftar: toast konfirmasi tampil', toastDaftar);
  ok('Daftar: sesi langsung berlaku (regresi sesiSejak per detik)', await sudahMasuk(A.page));

  // 2. "Ingat saya" tidak dicentang → cookie sesi peramban
  const B = await konteks(browser);
  await masuk(B.page, NOMOR, 'dewi-uji-2026', { ingat: false });
  const kueB = (await B.ctx.cookies()).find((c) => c.name === 'sesi_citarasa');
  ok('Ingat saya mati: cookie tanpa kedaluwarsa (sesi peramban)', kueB && kueB.expires === -1);
  ok('Perangkat B masuk', await sudahMasuk(B.page));

  // 3. Keluar dari perangkat lain (dari A) → B keluar, A tetap masuk
  await buka(A.page, '/akun');
  await A.page.getByRole('button', { name: 'Keluarkan semua' }).click();
  await A.page.getByRole('button', { name: 'Ya, keluarkan' }).click();
  await A.page.getByText('Semua perangkat lain sudah dikeluarkan').waitFor({ timeout: 8000 });
  ok('Keluar dari perangkat lain: perangkat B keluar', !(await sudahMasuk(B.page)));
  ok('Keluar dari perangkat lain: perangkat A tetap masuk', await sudahMasuk(A.page));

  // 4. Pelanggan membuka portal dapur → dikembalikan ke halamannya sendiri
  await buka(A.page, '/masuk?ke=/admin');
  ok('Pelanggan di portal dapur → /riwayat', A.page.url().includes('/riwayat'));

  // 5. Pemilik dengan sandi bawaan → banner + daftar kesiapan
  const P = await konteks(browser);
  await masuk(P.page, TELEPON_PEMILIK, SANDI_PEMILIK, { ke: '?ke=/admin' });
  ok('Portal dapur → /admin', P.page.url().endsWith('/admin'));
  if (SANDI_PEMILIK === 'citarasa123') {
    // Ditunggu: loading.tsx tampil lebih dulu, isi dashboard menyusul.
    const banner = await P.page.locator('main [role=alert]', { hasText: 'mudah ditebak' }).waitFor({ timeout: 15000 }).then(() => true, () => false);
    ok('Banner sandi bawaan tampil', banner);
    // Banner ada di layout; isi dashboard di-stream setelahnya — tunggu teksnya sendiri.
    const butirSandi = await P.page.getByText('Ganti kata sandi bawaan').waitFor({ timeout: 15000 }).then(() => true, () => false);
    ok('Daftar kesiapan menagih ganti sandi', butirSandi);
  }
  const kpi = await P.page.getByRole('heading', { name: 'Ketepatan waktu' }).waitFor({ timeout: 15000 }).then(() => true, () => false);
  ok('KPI ketepatan waktu tampil', kpi);

  // 6. Reset sandi pelanggan oleh pemilik
  await buka(P.page, '/admin/pelanggan?q=' + NOMOR);
  ok('Pelanggan: cari nomor 08… menemukan akun 62…', (await P.page.getByText('Dewi Uji Akun').count()) > 0);
  await P.page.getByRole('button', { name: 'Reset sandi' }).first().click();
  await P.page.getByRole('button', { name: 'Ya, reset' }).click();
  const elSandi = P.page.locator('p.select-all');
  await elSandi.waitFor({ timeout: 8000 });
  const sandiSementara = (await elSandi.textContent()).trim();
  ok('Reset: sandi sementara tampil sekali', /^[a-z]+-\d{6}-[a-z]+$/.test(sandiSementara), sandiSementara);
  const tautanWa = await P.page.getByRole('link', { name: 'Kirim ke nomor terdaftar' }).getAttribute('href');
  ok('Reset: tombol kirim menuju nomor terdaftar', tautanWa.includes('6281355566677'));
  ok('Reset: semua sesi lama pelanggan dicabut', !(await sudahMasuk(A.page)));
  await masuk(A.page, NOMOR, sandiSementara);
  ok('Reset: masuk dengan sandi sementara berhasil', await sudahMasuk(A.page));

  // 7. Daftar lewat portal dapur dialihkan ke Masuk; keluar kembali ke toko
  const T = await konteks(browser);
  await buka(T.page, '/daftar?ke=/admin');
  ok('Daftar di portal dapur → Masuk', T.page.url().includes('/masuk') && T.page.url().includes('admin'));
  await buka(A.page, '/akun');
  await Promise.all([A.page.waitForURL(BASE + '/'), A.page.getByRole('button', { name: 'Keluar dari akun' }).click()]);
  ok('Keluar: kembali ke beranda toko', new URL(A.page.url()).pathname === '/');

  // 8. Lupa sandi menyusun pesan WA tanpa memanggil server
  await buka(T.page, '/lupa-sandi');
  await T.page.fill('#telepon-lupa', '0812 3456 7890');
  const waLupa = await T.page.getByRole('link', { name: /Kirim permintaan/ }).getAttribute('href').catch(() => null);
  ok('Lupa sandi: tautan WA berisi nomor akun', Boolean(waLupa && decodeURIComponent(waLupa).includes('0812-3456-7890')));

  ok('Tanpa galat halaman / respons 5xx', galatHalaman.length === 0, galatHalaman.slice(0, 3).join(' | '));

  await browser.close();
  await db.end();
  console.log(gagal === 0 ? '\nSemua uji akun lulus.' : `\n${gagal} uji gagal.`);
  process.exit(gagal === 0 ? 0 : 1);
})().catch((e) => {
  console.error('BERHENTI:', e.message);
  process.exit(2);
});
