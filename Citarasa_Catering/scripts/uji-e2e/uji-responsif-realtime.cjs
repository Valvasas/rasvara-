const { chromium } = require('playwright');
const { execSync } = require('child_process');
const B = process.env.ALAMAT || 'http://localhost:3000';
// Jalankan setelah e2e.cjs (sandi pemilik sudah diganti). Menyapu semua halaman di 390/768/1440 + papan realtime.
const URL_DB = (process.env.DATABASE_URL || '').split('?')[0];
if (!URL_DB) throw new Error('Setel DATABASE_URL ke database UJI.');
if (/produksi|prod/i.test(URL_DB)) throw new Error('Menolak berjalan: DATABASE_URL terlihat seperti produksi.');
const sql = (q) => execSync(`psql "${URL_DB}" -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const hasil = []; const masalah = [];
const ok = (n, k, d = '') => { hasil.push(k); if (!k || process.env.RINCI) console.log(`${k ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };
async function masuk(ctx, tel, sandi) {
  const p = await ctx.newPage();
  await p.goto(B + '/masuk'); await p.fill('#telepon', tel); await p.fill('#sandi', sandi);
  await Promise.all([p.waitForURL((u) => !u.pathname.startsWith('/masuk')), p.getByRole('button', { name: 'Masuk' }).click()]);
  return p;
}
(async () => {
  const br = await chromium.launch();
  const kode = sql(`select kode from "Pesanan" where status='DIKONFIRMASI' order by kode limit 1`);
  const menuId = sql(`select id from "Menu" where aktif order by urutan, id limit 1`);
  const slug = sql(`select slug from "Menu" where aktif order by urutan, id limit 1`);
  const toko = ['/', '/menu', `/menu/${slug}`, '/pesan', '/lacak', '/masuk', '/daftar', '/kebijakan-privasi', '/syarat-ketentuan'];
  const admin = ['/admin', '/admin/pesanan', '/admin/pesanan/baru', `/admin/pesanan/${kode}`, `/admin/pesanan/${kode}/ubah`, '/admin/produksi', '/admin/bahan', '/admin/menu', `/admin/menu/${menuId}`, '/admin/voucher', '/admin/keuangan', '/admin/analitik', '/admin/pengaturan',
    ...['ringkasan', 'menu', 'pelanggan', 'piutang', 'perkiraan', 'arsip'].map((t) => `/admin/laporan?tab=${t}`)];
  // Satu kali masuk lalu pakai ulang sesinya: login dibatasi 5×/menit per IP (fitur keamanan).
  const ctxMasuk = await br.newContext();
  await masuk(ctxMasuk, '081234567890', process.env.SANDI || 'sandiProduksi#2026');
  const sesi = await ctxMasuk.storageState();
  await ctxMasuk.close();
  for (const w of [390, 768, 1440]) {
    const ctx = await br.newContext({ viewport: { width: w, height: 900 }, storageState: sesi });
    const pg = await ctx.newPage();
    pg.on('console', (m) => { if (m.type() === 'error' && !/status of 40[14]/.test(m.text())) masalah.push(`[${w}] ${pg.url()} ${m.text().slice(0, 160)}`); });
    pg.on('pageerror', (e) => masalah.push(`[${w}] pageerror ${e.message.slice(0, 160)}`));
    pg.on('response', (r) => { if (r.status() >= 500) masalah.push(`[${w}] ${r.status()} ${r.url()}`); });
    for (const p of [...toko, ...admin]) {
      const r = await pg.goto(B + p);
      await pg.locator('h1').first().waitFor({ timeout: 15000 }).catch(() => {});
      await pg.waitForTimeout(250);
      const lebar = await pg.evaluate(() => document.documentElement.scrollWidth);
      ok(`${w}px ${p}`, r.status() < 400 && lebar <= w, `status ${r.status()} lebar ${lebar}`);
      if (w !== 768 && /^\/admin(\/produksi|\/pesanan\/baru|\/pesanan\/CR|\?|$)|laporan\?tab=(pelanggan|perkiraan|arsip)|^\/$|^\/pesan$/.test(p))
        await pg.screenshot({ path: `${process.env.FOLDER_TANGKAPAN || '/tmp'}/sapu-${w}-${p.replace(/[/?=]/g, '_') || 'beranda'}.png` });
    }
    await ctx.close();
  }

  // ---------- Papan realtime: pesanan baru muncul tanpa muat ulang ----------
  const ctx = await br.newContext({ viewport: { width: 1440, height: 900 }, storageState: sesi });
  const papan = await ctx.newPage();
  await papan.goto(B + '/admin'); await papan.locator('h1').waitFor();
  await papan.evaluate(() => { window.__tandaTanpaReload = 1; });
  await papan.waitForTimeout(500);
  const judulAwal = await papan.title();
  ok('Papan: judul tab langsung berawalan (n) saat dibuka', /^\(\d+\)/.test(judulAwal), judulAwal);
  const sumber = sql(`select id from "Pesanan" where status='BARU' limit 1`);
  const kodeBaru = 'CR-REALTIME-' + Date.now().toString().slice(-6);
  sql(`insert into "Pesanan" (id, kode, "namaPemesan", "teleponPemesan", "caraAmbil", "tanggalAcara", "jamAcara", status, "statusBayar", "caraBayar", subtotal, ongkir, total, "dibuatPada", "diubahPada", sumber)
       select 'rt-'||md5(random()::text), '${kodeBaru}', 'Realtime ${kodeBaru}', "teleponPemesan", "caraAmbil", now() + interval '1 day', '10:00', 'BARU', 'BELUM_BAYAR', 'TUNAI', subtotal, 0, total, now(), now(), 'WEBSITE' from "Pesanan" where id='${sumber}'`);
  const t0 = Date.now();
  const muncul = await papan.getByText('Realtime ' + kodeBaru).first().waitFor({ timeout: 26000 }).then(() => true, () => false);
  ok('Papan: pesanan baru muncul ≤ 25 dtk tanpa muat ulang', muncul && (await papan.evaluate(() => window.__tandaTanpaReload)) === 1, `${((Date.now() - t0) / 1000).toFixed(1)} dtk`);
  await papan.waitForTimeout(800); // beri waktu MutationObserver memasang ulang awalan setelah refresh
  const judul = await papan.title();
  ok('Papan: judul tab menghitung pesanan baru', /^\(\d+\)/.test(judul) && judul !== judulAwal, `${judulAwal} → ${judul}`);
  await ctx.close();
  await br.close();
  console.log(`\n${hasil.filter(Boolean).length}/${hasil.length} lulus`);
  console.log(masalah.length ? 'MASALAH:\n' + [...new Set(masalah)].slice(0, 20).join('\n') : 'Tanpa galat konsol / 5xx.');
  process.exit(hasil.every(Boolean) && !masalah.length ? 0 : 1);
})().catch((e) => { console.error('BERHENTI:', e.message.split('\n').slice(0, 8).join('\n')); process.exit(1); });
