// Setup tak-direkam: bikin voucher demo lewat UI admin + gambar bukti transfer contoh.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = 'http://localhost:3000';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage();
  await p.goto(BASE + '/masuk');
  await p.fill('input[name=telepon]', '081234567890');
  await p.fill('input[name=sandi]', 'citarasa123');
  await Promise.all([p.waitForURL(u => !u.pathname.startsWith('/masuk')), p.click('button[type=submit]')]);
  await p.goto(BASE + '/admin/voucher');
  if (!(await p.getByText('HEMAT10').count())) {
    await p.fill('input[name=kode]', 'HEMAT10');
    await p.fill('input[name=deskripsi]', 'Diskon 10% untuk pelanggan baru');
    await p.selectOption('select[name=jenis]', 'PERSEN');
    await p.fill('input[name=nilai]', '10');
    await p.fill('input[name=maksPotongan]', '50000').catch(()=>{});
    await p.click('form:has(input[name=kode]) button[type=submit]');
    await p.waitForTimeout(1500);
  }
  console.log('HEMAT10 tampil:', await p.getByText('HEMAT10').count());
  const r = await ctx.newPage();
  await r.setViewportSize({ width: 420, height: 640 });
  await r.setContent(`<body style="font-family:sans-serif;padding:24px;background:#fff"><h2 style="color:#0a4">Transfer Berhasil</h2><p>BCA &rarr; BCA 1234567890<br>a.n. Citarasa Catering</p><h1>Rp 252.000</h1><p style="color:#666">1 Okt 2026 &bull; Ref 8841-2290-17</p></body>`);
  await r.screenshot({ path: __dirname + '/bukti-transfer-contoh.png' });
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
