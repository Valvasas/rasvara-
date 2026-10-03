const { chromium, request } = require('playwright');
const ExcelJS = require('exceljs');
const fs = require('fs');
const { execSync } = require('child_process');
// Jalankan dari folder Citarasa_Catering dengan server menyala (npm start) dan CRON_SECRET yang sama.
const B = process.env.ALAMAT || 'http://localhost:3000';
const DIR_LAPORAN = require('path').resolve(process.env.DIREKTORI_LAPORAN || 'data/laporan');
const CRON = process.env.CRON_SECRET || ''; if (CRON.length < 32) throw new Error('Setel CRON_SECRET (sama dengan server) sebelum menjalankan uji ini');
const sql = (q) => execSync(`PGPASSWORD=citarasa psql -h localhost -U citarasa citarasa -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const hasil = [];
const ok = (n, k, d = '') => { hasil.push(k); console.log(`${k ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };
const wib = (q) => `to_char(${q} at time zone 'UTC' at time zone 'Asia/Jakarta','YYYY-MM')`;
async function masuk(br, tel, sandi) {
  const ctx = await br.newContext(); const p = await ctx.newPage();
  await p.goto(B + '/masuk'); await p.fill('#telepon', tel); await p.fill('#sandi', sandi);
  await Promise.all([p.waitForURL((u) => !u.pathname.startsWith('/masuk')), p.getByRole('button', { name: 'Masuk' }).click()]);
  return ctx;
}
async function bacaXlsx(buf) { const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buf); return wb; }
(async () => {
  const anon = await request.newContext();
  const bulanLalu = sql(`select to_char((date_trunc('month', now() at time zone 'Asia/Jakarta') - interval '1 month'),'YYYY-MM')`);

  // ---------- Cron: otorisasi ----------
  ok('Cron tanpa token → 401', (await anon.post(B + '/api/tugas/jalankan')).status() === 401);
  ok('Cron token salah → 401', (await anon.post(B + '/api/tugas/jalankan', { headers: { Authorization: 'Bearer ' + 'x'.repeat(48) } })).status() === 401);
  ok('Cron lewat GET → 405', (await anon.get(B + '/api/tugas/jalankan')).status() === 405);

  // ---------- Siapkan kasus auto-batal ----------
  sql(`update "Pengaturan" set "batasBayarJam"=24 where id='utama'`);
  // Data stres tidak punya kandidat transfer; siapkan 4 pesanan secara eksplisit.
  const kand = sql(`select kode from "Pesanan" where status='BARU' and sumber='WEBSITE' and "statusBayar"='BELUM_BAYAR' and dibayar=0 and "buktiBayarUrl" is null order by kode limit 4`).split('\n');
  if (kand.length < 4) throw new Error('kandidat kurang: ' + kand.length);
  sql(`update "Pesanan" set "caraBayar"='TRANSFER' where kode in (${kand.map((k) => `'${k}'`).join(',')})`);
  const [kBatal, kBukti, kWa, kMuda] = kand;
  sql(`update "Pesanan" set "dibuatPada"=now()-interval '48 hour' where kode in ('${kBatal}','${kBukti}','${kWa}')`);
  sql(`update "Pesanan" set "buktiBayarUrl"='/unggahan/bukti-1700000000000-aaaaaaaaaaaaaaaaaaaaaaaa.jpg' where kode='${kBukti}'`);
  sql(`update "Pesanan" set sumber='WHATSAPP' where kode='${kWa}'`);
  // Pesanan muda (2 jam) tidak boleh tersentuh
  sql(`update "Pesanan" set "dibuatPada"=now()-interval '2 hour' where kode='${kMuda}'`);
  // Semua kandidat lain dibuat muda supaya hasilnya deterministik
  sql(`update "Pesanan" set "dibuatPada"=now()-interval '1 hour' where status='BARU' and kode not in ('${kBatal}','${kBukti}','${kWa}','${kMuda}')`);
  // Rekap bulan lalu belum ada
  sql(`delete from "RekapBulanan"`); fs.rmSync(DIR_LAPORAN, { recursive: true, force: true });
  // Nama berbahaya pada pesanan bulan lalu
  const kJahat = sql(`select kode from "Pesanan" where ${wib('"tanggalAcara"')}='${bulanLalu}' order by "tanggalAcara" limit 1`);
  sql(`update "Pesanan" set "namaPemesan"='=HYPERLINK("http://jahat.example","klik")' where kode='${kJahat}'`);

  const r1 = await anon.post(B + '/api/tugas/jalankan', { headers: { Authorization: 'Bearer ' + CRON } });
  const j1 = await r1.json();
  ok('Cron token benar → 200', r1.status() === 200, JSON.stringify(j1).slice(0, 160));
  ok('Arsip bulan lalu dibuat', j1.arsip?.hasil === 'dibuat' && j1.arsip.bulan === bulanLalu);
  ok('Berkas arsip ada di disk', fs.existsSync(`${DIR_LAPORAN}/rekap-${bulanLalu}.xlsx`));
  ok('Pesanan lewat batas & tanpa bayar → dibatalkan', sql(`select status from "Pesanan" where kode='${kBatal}'`) === 'DIBATALKAN' && j1.dibatalkan.includes(kBatal));
  ok('Alasan otomatis terlihat', /otomatis/.test(sql(`select "alasanBatal" from "Pesanan" where kode='${kBatal}'`)));
  ok('Pesanan dengan bukti TIDAK dibatalkan', sql(`select status from "Pesanan" where kode='${kBukti}'`) === 'BARU');
  ok('Pesanan WA TIDAK dibatalkan', sql(`select status from "Pesanan" where kode='${kWa}'`) === 'BARU');
  ok('Pesanan muda TIDAK dibatalkan', sql(`select status from "Pesanan" where kode='${kMuda}'`) === 'BARU');
  const logSebelum = +sql(`select count(*) from "LogAktivitas"`);
  const j2 = await (await anon.post(B + '/api/tugas/jalankan', { headers: { Authorization: 'Bearer ' + CRON } })).json();
  ok('Panggilan kedua idempoten', j2.arsip?.hasil === 'sudah_ada' && j2.dibatalkan.length === 0 && +sql(`select count(*) from "RekapBulanan"`) === 1);
  ok('Panggilan kosong tidak menambah log', +sql(`select count(*) from "LogAktivitas"`) === logSebelum);
  ok('tugasTerakhir tercatat', sql(`select "tugasTerakhir" is not null from "Pengaturan"`) === 't');

  // ---------- Hak akses ----------
  ok('Anonim → rekap 401', (await anon.get(B + `/api/admin/rekap-bulanan?bulan=${bulanLalu}`)).status() === 401);
  ok('Anonim → arsip 401', (await anon.get(B + `/api/admin/rekap-bulanan/arsip/${bulanLalu}`)).status() === 401);
  ok('Anonim → produksi-xlsx 401', (await anon.get(B + '/api/admin/produksi-xlsx')).status() === 401);
  const br = await chromium.launch();
  const pel = await masuk(br, '081377788899', 'sandibaru123');
  ok('Pelanggan → rekap 401', (await pel.request.get(B + `/api/admin/rekap-bulanan?bulan=${bulanLalu}`)).status() === 401);
  ok('Pelanggan → produksi-xlsx 401', (await pel.request.get(B + '/api/admin/produksi-xlsx')).status() === 401);

  // ---------- Unduhan pemilik ----------
  const own = await masuk(br, '081234567890', process.env.SANDI || 'sandiProduksi#2026');
  const rx = await own.request.get(B + `/api/admin/rekap-bulanan?bulan=${bulanLalu}`);
  ok('Pemilik unduh rekap → 200 xlsx', rx.status() === 200 && /spreadsheetml/.test(rx.headers()['content-type']) && /no-store/.test(rx.headers()['cache-control']));
  ok('Nama berkas aman', /^attachment; filename="rekap-[a-z0-9-]+-\d{4}-\d{2}\.xlsx"$/.test(rx.headers()['content-disposition']), rx.headers()['content-disposition']);
  const wb = await bacaXlsx(await rx.body());
  const ps = wb.getWorksheet('Pesanan');
  let sumTotal = 0, n = 0, selJahat = null;
  ps.eachRow((row, i) => { if (i >= 5 && row.getCell(1).value && String(row.getCell(1).value).startsWith('CR-')) { sumTotal += Number(row.getCell(13).value); n++; if (row.getCell(1).value === kJahat) selJahat = row.getCell(4); } });
  const dbP = sql(`select count(*)||'|'||coalesce(sum(total),0) from "Pesanan" where ${wib('"tanggalAcara"')}='${bulanLalu}'`).split('|');
  ok('XLSX Pesanan: jumlah & Σ total = DB', n === +dbP[0] && sumTotal === +dbP[1], `${n}/${sumTotal} vs ${dbP.join('/')}`);
  ok('Nama =HYPERLINK tetap teks (tanpa rumus)', selJahat && typeof selJahat.value === 'string' && selJahat.value.startsWith("'=") && !selJahat.formula, String(selJahat?.value).slice(0, 30));
  const kas = wb.getWorksheet('Kas'); let masukX = 0, keluarX = 0;
  kas.eachRow((row, i) => { if (i >= 6 && row.getCell(1).value instanceof Date) { masukX += Number(row.getCell(6).value || 0); keluarX += Number(row.getCell(7).value || 0); } });
  const dbK = sql(`select coalesce(sum(case when jenis='MASUK' then jumlah end),0)||'|'||coalesce(sum(case when jenis='KELUAR' then jumlah end),0) from "CatatanKas" where ${wib('tanggal')}='${bulanLalu}'`).split('|');
  ok('XLSX Kas: Σ masuk & keluar = DB', masukX === +dbK[0] && keluarX === +dbK[1], `${masukX}/${keluarX} vs ${dbK.join('/')}`);
  const saldoAwalDb = +sql(`select coalesce(sum(case when jenis='MASUK' then jumlah else -jumlah end),0) from "CatatanKas" where tanggal < (date_trunc('month', now() at time zone 'Asia/Jakarta') - interval '1 month') at time zone 'Asia/Jakarta' at time zone 'UTC'`);
  ok('XLSX Kas: saldo awal = DB', kas.getCell('H5').value === saldoAwalDb, `${kas.getCell('H5').value} vs ${saldoAwalDb}`);
  const rk = wb.getWorksheet('Ringkasan');
  const nilaiSelesaiDb = +sql(`select coalesce(sum(total),0) from "Pesanan" where status='SELESAI' and ${wib('"tanggalAcara"')}='${bulanLalu}'`);
  ok('XLSX Ringkasan: nilai pesanan selesai = DB', rk.getCell('B5').value === nilaiSelesaiDb, `${rk.getCell('B5').value} vs ${nilaiSelesaiDb}`);

  const ra = await own.request.get(B + `/api/admin/rekap-bulanan/arsip/${bulanLalu}`);
  ok('Pemilik unduh arsip → 200', ra.status() === 200 && (await ra.body()).length > 1000);
  for (const jalur of ['..%2F..%2F.env', '2026-13', '....%2F2026-09', 'rekap-2026-09.xlsx', '2026-09%00']) {
    const s = (await own.request.get(B + `/api/admin/rekap-bulanan/arsip/${jalur}`)).status();
    ok(`Arsip '${jalur}' → 404`, s === 404, String(s));
  }
  const rDot = await own.request.get(B + '/api/admin/rekap-bulanan/arsip/..');
  ok("'arsip/..' dinormalisasi klien, tidak pernah melayani berkas arsip", !/arsip-rekap/.test(rDot.headers()['content-disposition'] || ''));
  ok('Bulan aneh di rekap jatuh ke bulan ini', (await own.request.get(B + `/api/admin/rekap-bulanan?bulan=2026-13";x`)).status() === 200);

  const besok = sql(`select to_char(now() at time zone 'Asia/Jakarta' + interval '1 day','YYYY-MM-DD')`);
  const rp = await own.request.get(B + `/api/admin/produksi-xlsx?tanggal=${besok}`);
  const wbp = await bacaXlsx(await rp.body());
  let porsiX = 0; wbp.getWorksheet('Yang dimasak').eachRow((row, i) => { if (i >= 5 && typeof row.getCell(2).value === 'number') porsiX += row.getCell(2).value; });
  const porsiDb = +sql(`select coalesce(sum(i.jumlah),0) from "ItemPesanan" i join "Pesanan" p on p.id=i."pesananId" where p.status in ('DIKONFIRMASI','DIPROSES','SIAP','SELESAI') and to_char(p."tanggalAcara" at time zone 'UTC' at time zone 'Asia/Jakarta','YYYY-MM-DD')='${besok}'`);
  ok('XLSX produksi: total porsi = DB', porsiX === porsiDb, `${porsiX} vs ${porsiDb}`);

  // UI: tab arsip & tombol
  const pg = await own.newPage();
  await pg.goto(B + '/admin/laporan?tab=arsip'); await pg.locator('h1').waitFor();
  ok('Tab Rekap Excel menampilkan arsip', (await pg.locator(`a[href="/api/admin/rekap-bulanan/arsip/${bulanLalu}"]`).count()) === 1);
  const [unduh] = await Promise.all([pg.waitForEvent('download'), pg.getByRole('link', { name: 'Unduh Excel' }).click()]);
  ok('Klik "Unduh Excel" mengunduh berkas', /\.xlsx$/.test(unduh.suggestedFilename()), unduh.suggestedFilename());
  await pg.goto(B + '/admin/pengaturan');
  ok('Pengaturan menampilkan waktu otomasi', (await pg.getByText(/Tugas otomatis terakhir berjalan/).count()) > 0);
  ok('Log aktivitas memuat pembatalan otomatis', (await pg.getByText('Pembatalan otomatis').count()) > 0);
  await br.close();
  sql(`update "Pengaturan" set "batasBayarJam"=0 where id='utama'`);
  console.log(`\n${hasil.filter(Boolean).length}/${hasil.length} lulus`);
})().catch((e) => { console.error('BERHENTI:', e.message.split('\n').slice(0, 8).join('\n')); process.exit(1); });
