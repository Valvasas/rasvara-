const { chromium } = require('playwright');
const { execSync } = require('child_process');
const B = 'http://localhost:3000';
// psql menolak parameter ?schema=… milik Prisma, jadi dibuang dulu. Menolak URL yang tampak seperti produksi.
const URL_DB = (process.env.DATABASE_URL || '').split('?')[0];
if (!URL_DB) throw new Error('Setel DATABASE_URL ke database UJI.');
if (/produksi|prod/i.test(URL_DB)) throw new Error('Menolak berjalan: DATABASE_URL terlihat seperti produksi.');
const sql = (q) => execSync(`psql "${URL_DB}" -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const hasil = []; const masalah = [];
const ok = (n, k, d = '') => { hasil.push(k); console.log(`${k ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };
const tgl = (h) => { const d = new Date(Date.now() + 7 * 3600e3 + h * 86400e3); return d.toISOString().slice(0, 10); };
(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } });
  const a = await ctx.newPage();
  a.on('console', (m) => { if (m.type() === 'error' && !/status of 40[14]/.test(m.text())) masalah.push(m.text().slice(0, 200)); });
  a.on('response', (r) => { if (r.status() >= 500) masalah.push(`${r.status()} ${r.url()}`); });
  await a.goto(B + '/masuk');
  await a.fill('#telepon', '081234567890'); await a.fill('#sandi', process.env.SANDI || 'sandiProduksi#2026');
  await Promise.all([a.waitForURL(/\/admin/), a.getByRole('button', { name: 'Masuk' }).click()]);

  // ---------- Pesanan manual + DP ----------
  await a.goto(B + '/admin/pesanan/baru');
  await a.getByText('WhatsApp', { exact: true }).click();
  await a.fill('#teleponPemesan', '081299911122');
  await a.fill('#namaPemesan', 'Budi Manual');
  const tambah = a.locator('button[aria-label^="Tambah "]').first();
  const namaMenu = (await tambah.getAttribute('aria-label')).replace('Tambah ', '');
  await tambah.click();
  await a.getByLabel(new RegExp(`^Jumlah ${namaMenu.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)).fill('60');
  const tanggal = tgl(9);
  await a.fill('#tanggalAcara', tanggal); await a.fill('#jamAcara', '11:00');
  await a.getByText('DP', { exact: true }).click();
  await a.fill('#jumlahBayar', '500000');
  await a.getByText(/Abaikan batas H-/).click();
  await Promise.all([a.waitForURL(/\/admin\/pesanan\/CR-.*baru=1/, { timeout: 20000 }), a.getByRole('button', { name: 'Simpan pesanan' }).click()]);
  const kode = a.url().match(/CR-[A-Z0-9-]+/)[0];
  let [total, dibayar, sb, st, sumber] = sql(`select total, dibayar, "statusBayar", status, sumber from "Pesanan" where kode='${kode}'`).split('|');
  ok('Pesanan manual tersimpan (WA, diterima, DP)', +dibayar === 500000 && sb === 'SEBAGIAN' && st === 'DIKONFIRMASI' && sumber === 'WHATSAPP', `${kode} total ${total}`);
  ok('DP → tepat 1 baris kas', sql(`select count(*) from "CatatanKas" k join "Pesanan" p on p.id=k."pesananId" where p.kode='${kode}'`) === '1');
  ok('Detail menampilkan sisa', (await a.getByText(/sisa/i).count()) > 0);

  // ---------- Ubah pesanan ----------
  await a.goto(B + `/admin/pesanan/${kode}/ubah`);
  await a.getByLabel(new RegExp(`^Jumlah `)).first().fill('70');
  await Promise.all([a.waitForURL(/diubah=1/, { timeout: 20000 }), a.getByRole('button', { name: 'Simpan perubahan' }).click()]);
  const total2 = +sql(`select total from "Pesanan" where kode='${kode}'`);
  ok('Ubah pesanan menghitung ulang total', total2 > +total, `${total} → ${total2}`);

  // ---------- Pelunasan ----------
  await a.getByRole('button', { name: /^Catat pelunasan/ }).click();
  await a.getByRole('button', { name: /^Ya, catat pelunasan/ }).click();
  await a.waitForTimeout(2500);
  [total, dibayar, sb] = sql(`select total, dibayar, "statusBayar" from "Pesanan" where kode='${kode}'`).split('|');
  const kas = sql(`select count(*)||'|'||sum(k.jumlah) from "CatatanKas" k join "Pesanan" p on p.id=k."pesananId" where p.kode='${kode}'`).split('|');
  ok('Pelunasan: LUNAS, 2 baris kas, Σ = total', sb === 'LUNAS' && kas[0] === '2' && +kas[1] === +total, `kas ${kas.join(' / ')} total ${total}`);

  // ---------- Produksi ----------
  await a.goto(B + `/admin/produksi?tanggal=${tanggal}`);
  ok('Produksi menampilkan menu pesanan', (await a.getByText(namaMenu).count()) > 0);
  const porsiDb = sql(`select coalesce(sum(i.jumlah),0) from "ItemPesanan" i join "Pesanan" p on p.id=i."pesananId" where i."namaMenu"='${namaMenu.replace(/'/g, "''")}' and p."tanggalAcara"::date='${tanggal}' and p.status in ('DIKONFIRMASI','DIPROSES','SIAP')`);
  ok('Porsi produksi = SQL', (await a.locator('td', { hasText: new RegExp(`^${porsiDb}`) }).count()) > 0, `SQL ${porsiDb}`);

  // ---------- Bahan & resep ----------
  await a.goto(B + '/admin/bahan');
  await a.fill('#bahan-nama', 'Ayam Uji'); await a.fill('#bahan-satuan', 'kg'); await a.fill('#bahan-harga', '38000');
  await a.getByRole('button', { name: /Simpan|Tambah/ }).first().click();
  await a.waitForTimeout(1500);
  ok('Bahan tersimpan', sql(`select count(*) from "Bahan" where nama='Ayam Uji'`) === '1');
  await a.fill('#bahan-nama', 'ayam uji'); await a.fill('#bahan-satuan', 'kg'); await a.fill('#bahan-harga', '1');
  await a.getByRole('button', { name: /Simpan|Tambah/ }).first().click();
  await a.waitForTimeout(1500);
  ok('Bahan duplikat ditolak, isian tetap', sql(`select count(*) from "Bahan" where lower(nama)='ayam uji'`) === '1' && (await a.inputValue('#bahan-nama')) === 'ayam uji');

  const menuId = sql(`select "menuId" from "ItemPesanan" i join "Pesanan" p on p.id=i."pesananId" where p.kode='${kode}' limit 1`);
  await a.goto(B + `/admin/menu/${menuId}`);
  const pilih = a.locator(`#pilih-bahan-${menuId}`);
  await pilih.selectOption({ label: /Ayam Uji/.test(await pilih.innerText()) ? (await pilih.locator('option', { hasText: 'Ayam Uji' }).innerText()) : '' });
  await a.getByRole('button', { name: 'Tambah bahan' }).click();
  await a.getByLabel(/^Takaran Ayam Uji/).fill('0.15');
  await a.getByRole('button', { name: 'Simpan resep' }).click();
  await a.waitForTimeout(1500);
  ok('Resep tersimpan', sql(`select r."jumlahPerPorsi" from "ResepMenu" r join "Bahan" b on b.id = r."bahanId" where r."menuId"='${menuId}' and b.nama='Ayam Uji'`) === '0.15');

  await a.goto(B + `/admin/produksi?tanggal=${tanggal}`);
  const kgDb = (+porsiDb * 0.15);
  ok('Daftar belanja muncul untuk bahan resep', (await a.getByText('Ayam Uji').count()) > 0, `perkiraan ${kgDb} kg`);

  // ---------- Responsif ----------
  for (const w of [390, 768]) {
    await a.setViewportSize({ width: w, height: 860 });
    for (const p of ['/admin', `/admin/pesanan/${kode}`, '/admin/pesanan/baru', `/admin/produksi?tanggal=${tanggal}`, '/admin/bahan', `/admin/menu/${menuId}`, '/admin/pengaturan']) {
      await a.goto(B + p); await a.locator('h1').first().waitFor({ timeout: 15000 }); await a.waitForTimeout(400);
      const lebar = await a.evaluate(() => document.documentElement.scrollWidth);
      ok(`${w}px ${p.split('?')[0]} tanpa scroll horizontal`, lebar <= w, `${lebar}`);
      await a.screenshot({ path: `/tmp/claude-0/rv/shot-${w}-${p.replace(/[/?=]/g, '_')}.png`, fullPage: false });
    }
  }
  await br.close();
  console.log(`\n${hasil.filter(Boolean).length}/${hasil.length} lulus`);
  console.log(masalah.length ? 'MASALAH:\n' + [...new Set(masalah)].join('\n') : 'Tanpa galat runtime / 5xx.');
})().catch((e) => { console.error('BERHENTI:', e.message.split('\n').slice(0, 8).join('\n')); process.exit(1); });
