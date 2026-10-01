// Uji menyeluruh sebelum rilis. Jalankan terhadap database UJI yang sudah
// diisi `SEED_DEMO=1 npm run db:seed` + data-stres.sql — JANGAN ke produksi:
// skrip ini membuat pesanan, mengganti sandi pemilik, dan menghapus data.
// Lihat README.md di folder ini.
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { Client } = require('pg');
const BASE = process.env.ALAMAT_UJI || 'http://localhost:3000';
const BUKTI = path.join(__dirname, 'contoh-bukti.png');
const PERAMBAN = process.env.PLAYWRIGHT_CHROMIUM || undefined;

const hasil = [];
const masalah = [];
let db;
const q = async (sql, p = []) => (await db.query(sql, p)).rows;
const ok = (nama, kondisi, detail = '') => {
  hasil.push({ nama, ok: !!kondisi, detail });
  console.log(`${kondisi ? 'PASS' : 'FAIL'}  ${nama}${detail ? '  — ' + detail : ''}`);
};
const tglWib = (geser) => {
  const d = new Date(Date.now() + geser * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);
};

async function konteks(browser, nama) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'id-ID' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => masalah.push(`[${nama}] pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource: the server responded with a status of 404/.test(m.text())) masalah.push(`[${nama}] console: ${m.text().slice(0, 200)}`); });
  page.on('response', (r) => { if (r.status() >= 500) masalah.push(`[${nama}] HTTP ${r.status()} ${r.url()}`); });
  return { ctx, page };
}
async function buka(page, path) {
  const t = Date.now();
  const r = await page.goto(BASE + path, { waitUntil: 'networkidle' });
  return { status: r.status(), ms: Date.now() - t };
}
async function masuk(page, telp, sandi) {
  await buka(page, '/masuk');
  await page.fill('#telepon', telp);
  await page.fill('#sandi', sandi);
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith('/masuk'), { timeout: 15000 }), page.click('form button[type=submit]')]);
}

(async () => {
  if (/produksi|prod/i.test(process.env.DATABASE_URL || '')) throw new Error('Menolak berjalan: DATABASE_URL terlihat seperti produksi.');
  db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const browser = await chromium.launch({ executablePath: PERAMBAN });

  // ================= PEMILIK =================
  const A = await konteks(browser, 'pemilik');
  const a = A.page;
  await masuk(a, '081234567890', 'citarasa123');
  ok('Pemilik masuk → /admin', a.url().endsWith('/admin'));

  let r = await buka(a, '/admin');
  ok('Papan pesanan dimuat (242 aktif)', r.status === 200 && (await a.getByText(/242 pesanan aktif/).count()) > 0, `${r.ms} ms`);
  const kartuPapan = await a.locator('article').count();
  ok('Papan dibatasi ≤ 80 kartu walau 242 aktif', kartuPapan <= 80, `${kartuPapan} kartu`);
  ok('Tautan "Lihat semua" muncul untuk kolom penuh', (await a.getByText(/Lihat semua \d+ pesanan/).count()) > 0);
  ok('Banner cek pembayaran tampil', (await a.getByText(/pembayaran\s*menunggu dicek/).count()) > 0);

  r = await buka(a, '/admin?rentang=hari-ini');
  ok('Saring "Hari ini"', r.status === 200, `${r.ms} ms`);
  r = await buka(a, '/admin?q=Pemesan%20Uji%2012');
  ok('Cari di papan', r.status === 200 && (await a.locator('article').count()) > 0);

  // Arsip
  r = await buka(a, '/admin/pesanan');
  ok('Semua pesanan: 1.203 + tabel 25 baris', r.status === 200 && (await a.locator('tbody tr').count()) === 25, `${r.ms} ms`);
  r = await buka(a, '/admin/pesanan?status=SELESAI&halaman=3');
  ok('Arsip saring SELESAI halaman 3', r.status === 200 && (await a.locator('tbody tr').count()) > 0);
  r = await buka(a, '/admin/pesanan?status=NGAWUR&halaman=99999&dari=xx');
  ok('Arsip tahan parameter ngawur', r.status === 200);

  // Voucher
  await buka(a, '/admin/voucher');
  await a.fill('#kode', 'HEMAT10');
  await a.selectOption('#jenis', 'PERSEN');
  await a.fill('#nilai', '10');
  await a.getByRole('button', { name: 'Simpan voucher' }).click();
  await a.waitForTimeout(1200);
  ok('Voucher HEMAT10 dibuat', (await q(`select count(*)::int n from "Voucher" where kode='HEMAT10'`))[0].n === 1);
  await a.fill('#kode', 'HEMAT10');
  await a.fill('#deskripsi', 'isian ini harus tetap ada');
  await a.fill('#nilai', '5');
  await a.getByRole('button', { name: 'Simpan voucher' }).click();
  await a.waitForTimeout(1200);
  ok('Voucher duplikat ditolak & isian tidak hilang', (await a.locator('.kotak-galat').count()) > 0 && (await a.inputValue('#deskripsi')) === 'isian ini harus tetap ada');

  // Pengaturan
  await buka(a, '/admin/pengaturan');
  await a.fill('#whatsapp', 'abc');
  await a.fill('#tagline', 'Tagline baru uji');
  await a.getByRole('button', { name: 'Simpan pengaturan' }).click();
  await a.waitForTimeout(1200);
  ok('Pengaturan: WA invalid ditolak & isian tetap', (await a.getByText('Nomor WhatsApp tidak valid').count()) > 0 && (await a.inputValue('#tagline')) === 'Tagline baru uji');
  await a.fill('#whatsapp', '081234567890');
  await a.getByRole('button', { name: 'Simpan pengaturan' }).click();
  await a.waitForTimeout(1500);
  ok('Pengaturan tersimpan', (await q(`select tagline from "Pengaturan"`))[0].tagline === 'Tagline baru uji');
  const libur = tglWib(3);
  await a.fill('#tanggal-tutup', libur);
  await a.fill('#alasan-tutup', 'Libur uji');
  await a.getByRole('button', { name: 'Tutup tanggal ini' }).click();
  await a.waitForTimeout(1200);
  ok('Tanggal libur ditambahkan', (await q(`select count(*)::int n from "TanggalTutup"`))[0].n === 1);

  // Menu
  r = await buka(a, '/admin/menu');
  ok('Admin menu: 150 menu, 25 baris', r.status === 200 && (await a.locator('tbody tr').count()) === 25, `${r.ms} ms`);
  await a.getByRole('link', { name: 'Tambah menu' }).click();
  await a.waitForURL(/menu\/baru/);
  await a.getByRole('button', { name: 'Tambah menu' }).click();
  await a.waitForTimeout(800);
  ok('Tambah menu kosong → galat per isian', (await a.locator('.pesan-galat').count()) >= 2);
  await a.fill('#nama', 'Nasi Box Uji E2E');
  await a.fill('#deskripsi', 'Nasi, ayam goreng, sayur, sambal, kerupuk.');
  await a.fill('#harga', '27500');
  await a.fill('#satuan', 'box');
  await a.fill('#minPesan', '5');
  await Promise.all([a.waitForURL(/\/admin\/menu\/[^/]+\?baru=1/, { timeout: 15000 }), a.getByRole('button', { name: 'Tambah menu' }).click()]);
  ok('Menu baru tersimpan → halaman ubah', (await q(`select count(*)::int n from "Menu" where slug='nasi-box-uji-e2e'`))[0].n === 1);
  await a.setInputFiles('input[type=file]', BUKTI);
  await a.getByRole('button', { name: 'Unggah foto' }).click();
  await a.waitForTimeout(2000);
  ok('Foto menu terunggah', (await q(`select count(*)::int n from "FotoMenu" f join "Menu" m on m.id=f."menuId" where m.slug='nasi-box-uji-e2e'`))[0].n === 1);
  await a.fill('#harga', '29000');
  await a.getByRole('button', { name: 'Simpan perubahan' }).click();
  await a.waitForTimeout(1200);
  ok('Harga menu diubah', (await q(`select harga from "Menu" where slug='nasi-box-uji-e2e'`))[0].harga === 29000);
  await a.getByRole('switch').first().click();
  await a.waitForTimeout(1200);
  ok('Saklar sembunyikan menu', (await q(`select aktif from "Menu" where slug='nasi-box-uji-e2e'`))[0].aktif === false);
  await a.getByRole('switch').first().click();
  await a.waitForTimeout(1200);
  ok('Saklar tampilkan lagi', (await q(`select aktif from "Menu" where slug='nasi-box-uji-e2e'`))[0].aktif === true);

  // Kas
  r = await buka(a, '/admin/keuangan');
  ok('Buku kas: paginasi 30 baris', r.status === 200 && (await a.locator('tbody tr').count()) === 30, `${r.ms} ms`);
  await a.fill('#kas-jumlah', '123456');
  await a.fill('#kas-keterangan', 'Catatan uji hapus');
  await a.getByRole('button', { name: 'Simpan catatan' }).click();
  await a.waitForTimeout(1500);
  ok('Catat kas manual', (await q(`select count(*)::int n from "CatatanKas" where keterangan='Catatan uji hapus'`))[0].n === 1);
  await buka(a, '/admin/keuangan');
  const baris = a.locator('tr', { hasText: 'Catatan uji hapus' });
  await baris.getByRole('button', { name: 'Hapus' }).click();
  await baris.getByRole('button', { name: 'Hapus?' }).click();
  await a.waitForTimeout(1500);
  ok('Hapus kas manual (2 langkah)', (await q(`select count(*)::int n from "CatatanKas" where keterangan='Catatan uji hapus'`))[0].n === 0);
  r = await buka(a, '/admin/laporan?bulan=2026-13');
  ok('Laporan tahan bulan tidak sah', r.status === 200 && (await a.getByText('Pemasukan').count()) > 0, `${r.ms} ms`);
  r = await buka(a, '/admin/analitik');
  ok('Halaman pengunjung', r.status === 200, `${r.ms} ms`);

  // ================= PELANGGAN =================
  const C = await konteks(browser, 'pelanggan');
  const c = C.page;
  r = await buka(c, '/');
  ok('Beranda', r.status === 200, `${r.ms} ms`);
  r = await buka(c, '/menu');
  ok('Katalog: 12 kartu/halaman dari 145 aktif', r.status === 200 && (await c.locator('article').count()) === 12, `${r.ms} ms`);
  ok('Katalog: ada paginasi', (await c.getByRole('navigation', { name: 'Navigasi halaman' }).count()) === 1);
  r = await buka(c, '/menu?q=rendang');
  ok('Cari menu "rendang"', (await c.locator('article').count()) >= 1);
  r = await buka(c, '/menu/nasi-box-uji-e2e');
  ok('Detail menu baru tampil dengan foto', r.status === 200 && (await c.locator('img[alt*="Nasi Box Uji"]').count()) > 0);

  await buka(c, '/pesan?menu=nasi-box-uji-e2e');
  const jumlah = c.getByLabel(/Jumlah Nasi Box Uji E2E/);
  await jumlah.fill('150');
  await jumlah.press('Enter');
  ok('Input jumlah langsung 150', (await c.getByText(/150 box × Rp29\.000/).count()) > 0);
  ok('Tombol kirim terkunci + alasan', (await c.getByRole('button', { name: 'Kirim pesanan' }).isDisabled()) && (await c.getByText('Tentukan tanggal acara.').count()) > 0);
  await c.fill('#tanggalAcara', libur);
  ok('Tanggal libur ditolak di formulir', (await c.getByText('Dapur tutup di tanggal ini.').count()) > 0);
  await c.fill('#tanggalAcara', tglWib(5));
  await c.fill('#namaPemesan', 'Rina Uji');
  await c.fill('#teleponPemesan', '081377788899');
  await c.getByRole('button', { name: 'Punya kode voucher?' }).click();
  await c.fill('#input-voucher', 'HEMAT10');
  await c.getByRole('button', { name: 'Pakai' }).click();
  await c.waitForTimeout(1500);
  ok('Voucher terpakai di ringkasan', (await c.getByText(/HEMAT10 terpakai|Voucher HEMAT10/).count()) > 0);
  await Promise.all([c.waitForURL(/\/pesanan\//, { timeout: 20000 }), c.getByRole('button', { name: 'Kirim pesanan' }).click()]);
  const kode = c.url().split('/pesanan/')[1].split('?')[0];
  const ps = (await q(`select total, diskon, subtotal from "Pesanan" where kode=$1`, [kode]))[0];
  ok('Pesanan dibuat, total dihitung server', ps && ps.subtotal === 150 * 29000 && ps.diskon > 0 && ps.total === ps.subtotal - ps.diskon, `${kode} total ${ps && ps.total}`);
  await c.setInputFiles('#berkas-bukti', BUKTI);
  await c.getByRole('button', { name: 'Kirim bukti' }).click();
  await c.waitForTimeout(2000);
  ok('Bukti transfer terunggah', (await q(`select "buktiBayarUrl" is not null b from "Pesanan" where kode=$1`, [kode]))[0].b);
  ok('Tombol kirim bukti hilang setelah sukses', (await c.getByRole('button', { name: 'Kirim bukti' }).count()) === 0);

  await buka(c, '/lacak');
  await c.fill('#kode', kode);
  await c.fill('#telepon', '0899999999');
  await c.getByRole('button', { name: 'Lihat status' }).click();
  await c.waitForTimeout(1200);
  ok('Lacak nomor salah → galat, isian tetap', (await c.locator('.kotak-galat').count()) > 0 && (await c.inputValue('#kode')) === kode);
  await c.fill('#telepon', '081377788899');
  await Promise.all([c.waitForURL(/\/pesanan\//), c.getByRole('button', { name: 'Lihat status' }).click()]);
  ok('Lacak benar → nota', c.url().includes(kode));

  await buka(c, '/daftar');
  await c.fill('#nama', 'Rina Uji');
  await c.fill('#telepon', '081377788899');
  await c.fill('#sandi', 'pendek');
  await c.getByRole('button', { name: 'Buat akun' }).click();
  await c.waitForTimeout(1000);
  ok('Daftar sandi < 8 ditolak, nama tetap', (await c.getByText('Kata sandi minimal 8 karakter').count()) > 0 && (await c.inputValue('#nama')) === 'Rina Uji');
  await c.fill('#sandi', 'rahasia123');
  await Promise.all([c.waitForURL(/riwayat/), c.getByRole('button', { name: 'Buat akun' }).click()]);
  ok('Riwayat menampilkan pesanan dari nomor yang sama', (await c.getByText(kode).count()) > 0);
  await c.getByText('Keamanan akun').click();
  await c.fill('#sandiLama', 'salahsandi');
  await c.fill('#sandiBaru', 'sandibaru123');
  await c.fill('#ulangiSandi', 'sandibaru123');
  await c.getByRole('button', { name: 'Ganti kata sandi' }).click();
  await c.waitForTimeout(1200);
  ok('Ganti sandi: sandi lama salah ditolak', (await c.getByText('Kata sandi saat ini salah', { exact: false }).count()) > 0);
  await c.fill('#sandiLama', 'rahasia123');
  await c.fill('#sandiBaru', 'sandibaru123');
  await c.fill('#ulangiSandi', 'sandibaru123');
  await c.getByRole('button', { name: 'Ganti kata sandi' }).click();
  await c.waitForTimeout(1500);
  ok('Ganti sandi pelanggan berhasil', (await c.getByText('Kata sandi berhasil diganti.').count()) > 0);

  // ================= ALUR DAPUR untuk pesanan baru =================
  await buka(a, `/admin?q=${kode}`);
  const kartu = () => a.locator('article', { hasText: 'Rina Uji' });
  for (const tombol of ['Terima pesanan', 'Mulai masak', 'Tandai siap']) {
    await kartu().getByRole('button', { name: tombol }).click();
    await a.waitForTimeout(1500);
  }
  ok('Status maju sampai SIAP', (await q(`select status from "Pesanan" where kode=$1`, [kode]))[0].status === 'SIAP');
  ok('Kolom Siap & belum lunas → tombol utama "Tandai lunas"', (await kartu().getByRole('button', { name: 'Tandai lunas' }).count()) === 1 && (await kartu().getByRole('button', { name: 'Selesaikan' }).count()) === 0);
  await kartu().getByRole('button', { name: 'Tandai lunas' }).click();
  await kartu().getByRole('button', { name: 'Ya, lunas' }).click();
  await a.waitForTimeout(1500);
  const kas = (await q(`select count(*)::int n from "CatatanKas" k join "Pesanan" p on p.id=k."pesananId" where p.kode=$1`, [kode]))[0].n;
  ok('Lunas → tepat 1 baris kas', kas === 1);
  await kartu().getByRole('button', { name: 'Selesaikan' }).click();
  await a.waitForTimeout(1500);
  ok('Pesanan selesai', (await q(`select status from "Pesanan" where kode=$1`, [kode]))[0].status === 'SELESAI');

  // Pembatalan pesanan BARU dari data uji
  const target = (await q(`select kode from "Pesanan" where status='BARU' and "statusBayar"<>'LUNAS' order by "tanggalAcara" limit 1`))[0].kode;
  await buka(a, `/admin?q=${target}`);
  const kb = a.locator('article', { hasText: target.slice(-6) });
  await kb.getByRole('button', { name: 'Batalkan' }).click();
  ok('Tombol batalkan terkunci sebelum alasan diisi', await kb.getByRole('button', { name: 'Batalkan pesanan' }).isDisabled());
  await kb.getByLabel(/Alasan pembatalan/).fill('Pemesan membatalkan lewat WA');
  await kb.getByRole('button', { name: 'Batalkan pesanan' }).click();
  await a.waitForTimeout(1500);
  const batal = (await q(`select status, "alasanBatal" from "Pesanan" where kode=$1`, [target]))[0];
  ok('Pesanan dibatalkan dengan alasan', batal.status === 'DIBATALKAN' && batal.alasanBatal === 'Pemesan membatalkan lewat WA');

  // ================= STAF =================
  await buka(a, '/admin/pengaturan');
  await a.getByRole('button', { name: 'Tambah staf dapur' }).click();
  await a.fill('#staf-nama', 'Staf Uji');
  await a.fill('#staf-telepon', '081311122233');
  await a.fill('#staf-sandi', 'stafuji123');
  await a.getByRole('button', { name: 'Tambah staf' }).click();
  await a.waitForTimeout(1500);
  ok('Staf ditambahkan', (await q(`select count(*)::int n from "Pengguna" where telepon='6281311122233'`))[0].n === 1);
  const S = await konteks(browser, 'staf');
  await masuk(S.page, '081311122233', 'stafuji123');
  ok('Staf masuk → papan', S.page.url().endsWith('/admin'));
  ok('Staf tidak melihat omzet / menu kas', (await S.page.getByRole('link', { name: 'Buku kas' }).count()) === 0);
  await buka(S.page, '/admin/keuangan');
  ok('Staf dialihkan dari Buku kas', S.page.url().endsWith('/admin'));
  ok('Staf: kolom Siap belum lunas → "Menunggu pelunasan"', (await S.page.getByText('Menunggu pelunasan oleh pemilik').count()) > 0);

  // Ganti sandi pemilik mengeluarkan sesi lain
  const B = await konteks(browser, 'pemilik-hp2');
  await masuk(B.page, '081234567890', 'citarasa123');
  await buka(a, '/admin/pengaturan');
  await a.fill('#sandiLama', 'citarasa123');
  await a.fill('#sandiBaru', 'sandiProduksi#2026');
  await a.fill('#ulangiSandi', 'sandiProduksi#2026');
  await a.getByRole('button', { name: 'Ganti kata sandi' }).click();
  await a.waitForTimeout(1500);
  ok('Pemilik ganti sandi', (await a.getByText('Kata sandi berhasil diganti.').count()) > 0);
  await B.page.waitForTimeout(31000); // singgahan peran 30 detik
  await buka(B.page, '/admin');
  ok('Sesi pemilik di perangkat lain dikeluarkan', B.page.url().includes('/masuk'));
  await buka(a, '/admin');
  ok('Perangkat yang mengganti sandi tetap masuk', a.url().endsWith('/admin'));

  // Cabut staf
  await buka(a, '/admin/pengaturan');
  const bs = a.locator('li', { hasText: 'Staf Uji' });
  await bs.getByRole('button', { name: 'Cabut akses' }).click();
  await bs.getByRole('button', { name: 'Cabut akses?' }).click();
  await a.waitForTimeout(1500);
  ok('Akses staf dicabut', (await q(`select count(*)::int n from "Pengguna" where telepon='6281311122233'`))[0].n === 0);
  await S.page.waitForTimeout(500);
  await buka(S.page, '/admin');
  ok('Staf yang dicabut tidak bisa membuka papan', S.page.url().includes('/masuk'));

  await buka(a, '/admin/pengaturan');
  await a.getByRole('button', { name: 'Buka lagi' }).click();
  await a.waitForTimeout(1200);
  ok('Tanggal libur dibuka lagi', (await q(`select count(*)::int n from "TanggalTutup"`))[0].n === 0);

  await browser.close();
  await db.end();
  const gagal = hasil.filter((h) => !h.ok);
  console.log(`\n${hasil.length - gagal.length}/${hasil.length} lulus`);
  console.log(masalah.length ? 'MASALAH RUNTIME:\n' + [...new Set(masalah)].join('\n') : 'Tidak ada galat runtime / 5xx.');
  process.exit(gagal.length || masalah.length ? 1 : 0);
})().catch(async (e) => {
  console.error('BERHENTI:', e.message.split('\n').slice(0, 6).join('\n'));
  console.log(masalah.join('\n'));
  process.exit(2);
});
