const { chromium } = require('playwright');
const { execSync } = require('child_process');
const B = 'http://localhost:3000';
const sql = (q) => execSync(`PGPASSWORD=citarasa psql -h localhost -U citarasa citarasa -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const hasil = []; const masalah = [];
const ok = (n, k, d = '') => { hasil.push(k); console.log(`${k ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };
const digit = (t) => Number((t || '').replace(/[^\d]/g, ''));
(async () => {
  const br = await chromium.launch();
  const a = await (await br.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  a.on('console', (m) => { if (m.type() === 'error' && !/status of 40[14]/.test(m.text())) masalah.push(m.text().slice(0, 200)); });
  a.on('response', (r) => { if (r.status() >= 500) masalah.push(`${r.status()} ${r.url()}`); });
  await a.goto(B + '/masuk');
  await a.fill('#telepon', '081234567890'); await a.fill('#sandi', process.env.SANDI || 'citarasa123');
  await Promise.all([a.waitForURL(/\/admin/), a.getByRole('button', { name: 'Masuk' }).click()]);
  const bulan = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 7);
  const bulanLalu = sql(`select to_char((date_trunc('month', now() at time zone 'Asia/Jakarta') - interval '1 month'),'YYYY-MM')`);

  // Ringkasan
  await a.goto(B + `/admin/laporan?bulan=${bulanLalu}`); await a.locator('h1').waitFor();
  ok('Tab Ringkasan tampil', (await a.getByText('Pemasukan', { exact: true }).count()) > 0);

  // Menu & margin
  await a.goto(B + `/admin/laporan?tab=menu&bulan=${bulanLalu}`); await a.locator('h1').waitFor();
  const omzetUi = digit(await a.locator('dt:has-text("Omzet menu") + dd').first().innerText());
  const omzetDb = +sql(`select coalesce(sum(i.subtotal),0) from "ItemPesanan" i join "Pesanan" p on p.id=i."pesananId" where p.status='SELESAI' and to_char(p."tanggalAcara" at time zone 'UTC' at time zone 'Asia/Jakarta','YYYY-MM')='${bulanLalu}'`);
  ok('Omzet menu = SQL', omzetUi === omzetDb, `${omzetUi} vs ${omzetDb}`);

  // Pelanggan
  await a.goto(B + '/admin/laporan?tab=pelanggan'); await a.locator('h1').waitFor();
  const kartu = await a.locator('ul[aria-label="Segmen pelanggan"] li p.text-xl').allInnerTexts();
  const totalSeg = kartu.reduce((n, t) => n + digit(t), 0);
  const pelDb = +sql(`select count(distinct "teleponPemesan") from "Pesanan" where status<>'DIBATALKAN' and "tanggalAcara" >= (date_trunc('day', now() at time zone 'Asia/Jakarta') - interval '365 day') at time zone 'Asia/Jakarta' at time zone 'UTC'`);
  ok('Jumlah pelanggan di segmen = SQL', totalSeg === pelDb, `${totalSeg} vs ${pelDb}`);
  const barisPel = await a.locator('table tbody tr').count();
  ok('Daftar pelanggan berpaginasi ≤ 25', barisPel > 0 && barisPel <= 25, `${barisPel}`);
  const waHref = await a.locator('table a[href^="https://wa.me/"]').first().getAttribute('href');
  ok('Tombol WA ke nomor yang benar', /^https:\/\/wa\.me\/62\d+/.test(waHref || ''));
  await a.locator('ul[aria-label="Segmen pelanggan"] a').nth(1).click(); await a.waitForURL(/seg=SETIA/);
  ok('Saring segmen lewat kartu', (await a.locator('table tbody tr').count()) >= 0 && a.url().includes('seg=SETIA'));
  await a.goto(B + '/admin/laporan?tab=pelanggan&seg=%3Cscript%3E&halaman=-5'); await a.locator('h1').waitFor();
  ok('Parameter asing diabaikan (tanpa galat)', (await a.locator('table tbody tr').count()) > 0);

  // Piutang
  await a.goto(B + '/admin/laporan?tab=piutang&umur=BELUM_JATUH_TEMPO'); await a.locator('h1').waitFor();
  const kartuP = await a.locator('ul[aria-label="Piutang per umur"] li').allInnerTexts();
  const belumUi = digit(kartuP.find((t) => t.includes('Belum jatuh tempo')).split('\n').filter(Boolean)[1]);
  const belumDb = +sql(`select coalesce(sum(total-dibayar),0) from "Pesanan" where status in ('DIKONFIRMASI','DIPROSES','SIAP','SELESAI') and "statusBayar"<>'LUNAS' and "tanggalAcara" >= (date_trunc('day', now() at time zone 'Asia/Jakarta')) at time zone 'Asia/Jakarta' at time zone 'UTC'`);
  ok('Piutang belum jatuh tempo = SQL', belumUi === belumDb, `${belumUi} vs ${belumDb}`);

  // Perkiraan
  await a.goto(B + '/admin/laporan?tab=perkiraan'); await a.locator('h1').waitFor();
  const baris = await a.locator('table tbody tr').count();
  ok('Perkiraan 7 baris hari', baris === 7);
  const besokUi = digit(await a.locator('table tbody tr').first().locator('td').nth(1).innerText());
  const besokDb = +sql(`select coalesce(sum(i.jumlah),0) from "ItemPesanan" i join "Pesanan" p on p.id=i."pesananId" where p.status<>'DIBATALKAN' and to_char(p."tanggalAcara" at time zone 'UTC' at time zone 'Asia/Jakarta','YYYY-MM-DD') = to_char(now() at time zone 'Asia/Jakarta' + interval '1 day','YYYY-MM-DD')`);
  ok('Porsi besok dipesan = SQL', besokUi === besokDb, `${besokUi} vs ${besokDb}`);
  console.log('   isi perkiraan:', (await a.locator('table tbody tr').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ')).join(' | '));

  for (const w of [390, 1440]) {
    await a.setViewportSize({ width: w, height: 900 });
    for (const t of ['ringkasan', 'menu', 'pelanggan', 'piutang', 'perkiraan']) {
      await a.goto(B + `/admin/laporan?tab=${t}${t === 'menu' ? '&bulan=' + bulanLalu : ''}`); await a.locator('h1').waitFor(); await a.waitForTimeout(300);
      const lebar = await a.evaluate(() => document.documentElement.scrollWidth);
      ok(`${w}px tab ${t} tanpa scroll horizontal`, lebar <= w, `${lebar}`);
      await a.screenshot({ path: `/tmp/claude-0/rv/lap-${w}-${t}.png`, fullPage: true });
    }
  }
  await a.setViewportSize({ width: 390, height: 900 });
  for (const p of ['/admin/keuangan', '/admin/bahan', '/admin/menu', '/admin/pesanan', '/admin/produksi', '/admin/pengunjung']) {
    await a.goto(B + p); await a.locator('h1').waitFor(); await a.waitForTimeout(300);
    const lebar = await a.evaluate(() => document.documentElement.scrollWidth);
    ok(`390px ${p} tanpa scroll horizontal`, lebar <= 390, `${lebar}`);
  }
  await br.close();
  console.log(`\n${hasil.filter(Boolean).length}/${hasil.length} lulus`);
  console.log(masalah.length ? 'MASALAH:\n' + [...new Set(masalah)].join('\n') : 'Tanpa galat runtime / 5xx.');
})().catch((e) => { console.error('BERHENTI:', e.message.split('\n').slice(0, 8).join('\n')); process.exit(1); });
