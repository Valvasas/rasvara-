const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const BASE = 'http://localhost:3000';
const W = 1280, H = 720;
const VID = __dirname + '/video-raw';
fs.rmSync(VID, { recursive: true, force: true }); fs.mkdirSync(VID, { recursive: true });

const INIT = () => {
  // kursor palsu agar gerakan mouse terlihat di video
  const mk = () => {
    if (document.getElementById('__cur')) return;
    const c = document.createElement('div'); c.id = '__cur';
    c.style.cssText = 'position:fixed;z-index:2147483647;width:22px;height:22px;border-radius:50%;background:rgba(249,115,22,.55);border:2px solid #fff;box-shadow:0 0 0 2px rgba(0,0,0,.35);pointer-events:none;left:-50px;top:-50px;transform:translate(-50%,-50%);transition:transform .08s';
    document.documentElement.appendChild(c);
    window.addEventListener('mousemove', e => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
    window.addEventListener('mousedown', () => c.style.transform = 'translate(-50%,-50%) scale(.7)', true);
    window.addEventListener('mouseup', () => c.style.transform = 'translate(-50%,-50%) scale(1)', true);
  };
  document.addEventListener('DOMContentLoaded', mk); if (document.readyState !== 'loading') mk();
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function cap(page, text, ms = 2500) {
  await page.evaluate(t => {
    let d = document.getElementById('__cap');
    if (!d) {
      d = document.createElement('div'); d.id = '__cap';
      d.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);max-width:1000px;z-index:2147483646;background:rgba(30,15,5,.92);color:#fff;font:600 24px/1.35 system-ui,sans-serif;padding:14px 26px;border-radius:14px;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.4);border:1px solid rgba(251,191,36,.6)';
      document.documentElement.appendChild(d);
    }
    d.textContent = t;
  }, text).catch(()=>{});
  await sleep(ms);
}
async function settle(page) { await page.waitForLoadState('domcontentloaded').catch(()=>{}); await page.waitForLoadState('networkidle').catch(()=>{}); await sleep(500); }
async function move(page, loc) {
  await loc.scrollIntoViewIfNeeded().catch(()=>{});
  await sleep(250);
  const bb = await loc.boundingBox();
  if (bb) await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 30 });
  await sleep(300);
}
async function click(page, loc) { await move(page, loc); await loc.click(); await sleep(400); }
async function type(page, loc, text) { await move(page, loc); await loc.click(); await loc.fill(''); await loc.pressSequentially(text, { delay: 70 }); await sleep(300); }
async function scrollSlow(page, to, ms = 1800) {
  await page.evaluate(async ([to, ms]) => {
    const start = window.scrollY, d = to - start, t0 = performance.now();
    await new Promise(res => { const f = n => { const k = Math.min(1, (n - t0) / ms); const e = k < .5 ? 2*k*k : 1 - Math.pow(-2*k+2, 2)/2; window.scrollTo(0, start + d * e); k < 1 ? requestAnimationFrame(f) : res(); }; requestAnimationFrame(f); });
  }, [to, ms]);
}
async function goto(page, path) { await page.goto(BASE + path, { waitUntil: 'domcontentloaded' }); await settle(page); }
async function newCtx(browser, sub) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, locale: 'id-ID', recordVideo: { dir: VID + '/' + sub, size: { width: W, height: H } } });
  await ctx.addInitScript(INIT);
  return ctx;
}
const iso = d => d.toISOString().slice(0, 10);

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const telp = '0813' + String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
  let kode = null;

  // ======================= BAGIAN 1: PELANGGAN =======================
  const c1 = await newCtx(browser, 'pelanggan');
  const p = await c1.newPage();
  await goto(p, '/');
  await cap(p, 'Selamat datang di Citarasa Catering — website pesan katering online', 2800);
  await cap(p, 'Beranda: pilihan kategori menu, menu favorit, dan komitmen dapur', 1500);
  await scrollSlow(p, 700, 2000); await cap(p, 'Scroll ke bawah untuk lihat kategori & menu favorit pelanggan', 2000);
  await scrollSlow(p, 1500, 2000); await sleep(800);
  await scrollSlow(p, 99999, 2500); await cap(p, 'Footer berisi jam dapur, rekening transfer, dan tombol WhatsApp', 2600);
  await scrollSlow(p, 0, 1200);

  await cap(p, 'Langkah 1 — Buka halaman Menu dari navigasi atas', 1500);
  await click(p, p.getByRole('link', { name: 'Menu', exact: true }).first()); await settle(p);
  await cap(p, 'Halaman Menu: semua hidangan lengkap dengan harga & minimal pesan', 2500);
  await scrollSlow(p, 600, 1800); await sleep(600);
  await scrollSlow(p, 0, 800);
  await goto(p, '/menu/nasi-kotak-ayam-bakar');
  await cap(p, 'Klik salah satu menu untuk melihat detail, deskripsi, dan harga', 3000);

  await cap(p, 'Langkah 2 — Daftar akun pelanggan supaya riwayat pesanan tersimpan', 1800);
  await goto(p, '/daftar');
  await type(p, p.locator('input[name=nama]'), 'Budi Santoso');
  await type(p, p.locator('input[name=telepon]'), telp);
  await type(p, p.locator('input[name=sandi]'), 'rahasia123');
  await type(p, p.locator('textarea[name=alamat], input[name=alamat]').first(), 'Jl. Melati No. 12, Bandung');
  await cap(p, 'Isi nama, nomor HP, kata sandi, dan alamat — lalu klik Daftar', 1800);
  await click(p, p.locator('main button[type=submit], form button[type=submit]').first());
  await p.waitForURL(/riwayat/, { timeout: 15000 }).catch(()=>{}); await settle(p);
  await cap(p, 'Akun jadi! Halaman "Pesanan Saya" masih kosong karena belum pernah pesan', 2800);

  await cap(p, 'Langkah 3 — Buat pesanan lewat tombol "+ Pesan Baru"', 1800);
  await click(p, p.getByRole('link', { name: /Pesan Baru/ }).first()); await settle(p);
  await cap(p, 'Formulir Pemesanan: bagian 1 — pilih menu & jumlah porsi', 2200);
  const cari = p.locator('#cari-menu'); await type(p, cari, 'Ayam Bakar');
  await cap(p, 'Bisa cari menu atau filter per kategori (Nasi Kotak, Snack Box, Tumpeng, Nasi Goreng)', 2200);
  const tambah = p.getByRole('button', { name: '+ Tambah Menu' }).first();
  if (await tambah.count()) await click(p, tambah);
  const plus = p.getByRole('button', { name: '+', exact: true }).first();
  for (let i = 0; i < 2; i++) { await click(p, plus); }
  await cap(p, 'Atur jumlah dengan tombol + / − (ada batas minimal pesan tiap menu)', 2200);

  await cap(p, 'Bagian 2 — pilih tanggal & jam acara', 1500);
  const tgl = new Date(); tgl.setDate(tgl.getDate() + 5);
  await move(p, p.locator('input[name=tanggalAcara]'));
  await p.fill('input[name=tanggalAcara]', iso(tgl)); await sleep(500);
  await p.fill('input[name=jamAcara]', '11:30'); await sleep(800);
  await cap(p, 'Pilih cara pengambilan: ambil sendiri di dapur atau diantar kurir', 2400);
  await click(p, p.locator('input[name=caraAmbil]').first().locator('xpath=ancestor::label[1]'));

  await cap(p, 'Bagian 3 — isi data pemesan & metode pembayaran', 1800);
  await type(p, p.locator('input[name=namaPemesan]'), 'Budi Santoso');
  await type(p, p.locator('input[name=teleponPemesan]'), telp);
  await click(p, p.locator('input[name=caraBayar]').first().locator('xpath=ancestor::label[1]'));
  await type(p, p.locator('textarea[name=catatanPesanan]'), 'Sambal dipisah ya, tolong beri label nama peserta');
  await cap(p, 'Catatan khusus untuk dapur boleh diisi (opsional)', 1800);

  await cap(p, 'Punya voucher? Masukkan kodenya di Ringkasan Pemesanan lalu klik "Pakai"', 2200);
  const vInput = p.getByPlaceholder(/HEMAT10/);
  await type(p, vInput, 'HEMAT10');
  await click(p, p.getByRole('button', { name: 'Pakai', exact: true }));
  await sleep(1500);
  await cap(p, 'Potongan harga langsung dihitung — total bayar selalu dihitung ulang di server', 2800);
  await click(p, p.getByRole('button', { name: /Kirim & Buat Pesanan/ }));
  await p.waitForURL(/\/pesanan\//, { timeout: 20000 }).catch(()=>{}); await settle(p);
  kode = decodeURIComponent(p.url().split('/pesanan/')[1] || '').split('?')[0];
  console.log('KODE PESANAN', kode, p.url());
  await cap(p, 'Pesanan terkirim! Ini Nota Pesanan Digital lengkap dengan kode pesanan', 3000);
  await cap(p, 'Bar progres menampilkan tahap: Diterima → Dikonfirmasi → Dimasak → Siap Saji → Selesai', 3200);
  await scrollSlow(p, 500, 1500);
  await cap(p, 'Instruksi transfer & nomor rekening tersedia — ada tombol salin rekening', 2600);
  const file = p.locator('input[type=file]').first();
  await cap(p, 'Unggah foto struk / bukti transfer dari HP', 1800);
  await file.setInputFiles(__dirname + '/bukti-transfer-contoh.png'); await sleep(1500);
  await cap(p, 'Pratinjau foto muncul — klik "Kirim Bukti Pembayaran"', 2000);
  await click(p, p.getByRole('button', { name: /Kirim Bukti Pembayaran/ }));
  await sleep(2500); await settle(p);
  await cap(p, 'Bukti transfer terkirim — dapur akan memverifikasi pembayaran Anda', 3000);

  await cap(p, 'Langkah 4 — Lacak pesanan kapan saja lewat kode pesanan + nomor HP', 2000);
  await goto(p, '/lacak');
  await type(p, p.locator('input[name=kode]'), kode);
  await type(p, p.locator('input[name=telepon]'), telp);
  await click(p, p.locator('main button[type=submit], form button[type=submit]').first());
  await p.waitForURL(/\/pesanan\//, { timeout: 15000 }).catch(()=>{}); await settle(p);
  await cap(p, 'Tanpa login pun pelanggan tetap bisa melihat status pesanannya', 2800);

  await cap(p, 'Atau buka "Pesanan Saya" untuk melihat semua riwayat pesanan akun ini', 2000);
  await goto(p, '/riwayat');
  await cap(p, 'Riwayat Pesanan: semua pesanan pelanggan tersimpan di sini', 3000);
  await cap(p, 'Selesai bagian pelanggan. Sekarang kita pindah ke sisi pemilik (Admin / Dapur)', 3000);
  await c1.close();

  // ======================= BAGIAN 2: ADMIN =======================
  const c2 = await newCtx(browser, 'admin');
  const a = await c2.newPage();
  a.on('dialog', d => d.accept());
  await goto(a, '/masuk');
  await cap(a, 'Pemilik masuk lewat halaman yang sama dengan nomor HP & kata sandi', 2200);
  await type(a, a.locator('input[name=telepon]'), '081234567890');
  await type(a, a.locator('input[name=sandi]'), 'citarasa123');
  await click(a, a.locator('form button[type=submit]').first());
  await a.waitForURL(/\/admin/, { timeout: 20000 }).catch(()=>{}); await settle(a);
  await cap(a, 'Papan Pesanan Dapur: pesanan dikelompokkan per tahap (Baru → Diterima → Dimasak → Siap)', 3500);
  await cap(a, 'Pesanan Budi Santoso tadi sudah masuk otomatis di kolom "Pesanan Baru"', 3000);

  const kartu = a.locator('div').filter({ hasText: kode }).filter({ has: a.getByRole('button', { name: /Terima Pesanan/ }) }).last();
  if (await kartu.count()) {
    await cap(a, 'Klik "Terima Pesanan" — status berubah dan halaman pelanggan ikut ter-update', 2200);
    await click(a, kartu.getByRole('button', { name: /Terima Pesanan/ })); await sleep(2000); await settle(a);
    const k2 = a.locator('div').filter({ hasText: kode }).filter({ has: a.getByRole('button', { name: /Tandai Lunas/ }) }).last();
    if (await k2.count()) {
      await cap(a, 'Bukti transfer sudah masuk. Klik "Tandai Lunas" lalu OK pada konfirmasi — uang otomatis masuk Buku Kas', 2600);
      await click(a, k2.getByRole('button', { name: /Tandai Lunas/ })); await sleep(2000); await settle(a);
    }
    for (const re of [/Mulai Masak|Masak/, /Tandai Siap/, /Selesai/]) {
      const k3 = a.locator('div').filter({ hasText: kode }).filter({ has: a.getByRole('button', { name: re }) }).last();
      if (await k3.count()) { await cap(a, 'Majukan status pesanan satu per satu mengikuti alur dapur', 1600); await click(a, k3.getByRole('button', { name: re }).first()); await sleep(1800); await settle(a); }
    }
  }
  await cap(a, 'Ada pencarian pesanan & filter cara ambil di atas papan', 2200);
  await scrollSlow(a, 99999, 1500); await sleep(500); await scrollSlow(a, 0, 800);

  await cap(a, 'Cetak Bon / Nota untuk dibawa dapur atau diberikan ke pelanggan', 1800);
  await goto(a, `/admin/pesanan/${kode}/cetak`);
  await cap(a, 'Tampilan bon siap cetak', 2600);

  await cap(a, 'Menu: kelola daftar hidangan, harga, foto, dan ketersediaan', 1800);
  await goto(a, '/admin/menu'); await cap(a, 'Aktif/nonaktifkan menu kapan saja — langsung tampil di toko', 3200);
  await scrollSlow(a, 700, 1500); await sleep(500); await scrollSlow(a, 0, 600);

  await goto(a, '/admin/voucher'); await cap(a, 'Voucher: buat kode promo nominal/persen, atur kuota & masa berlaku', 3200);
  await scrollSlow(a, 99999, 1500); await cap(a, 'Daftar voucher aktif beserta pemakaian & kuotanya (contoh: HEMAT10)', 3000); await scrollSlow(a, 0, 600);
  await goto(a, '/admin/keuangan'); await cap(a, 'Buku Kas: pemasukan dari pesanan lunas otomatis tercatat, pengeluaran dicatat manual', 3600);
  await cap(a, 'Bisa unduh CSV kas untuk pembukuan', 2000);
  await goto(a, '/admin/laporan'); await cap(a, 'Laporan bulanan: ringkasan penjualan, pemasukan, dan pengeluaran', 3600);
  await goto(a, '/admin/analitik'); await cap(a, 'Performa: grafik kunjungan & perilaku pengunjung website', 3600);
  await goto(a, '/admin/pengaturan'); await cap(a, 'Pengaturan: info usaha, rekening, jam dapur, tanggal libur, staf dapur, dan ganti sandi', 3800);
  await scrollSlow(a, 99999, 2500); await sleep(800);
  await cap(a, 'Itulah tur lengkap Citarasa Catering — terima kasih sudah menonton!', 3500);
  await c2.close();
  await browser.close();
  fs.writeFileSync(__dirname + '/tour-meta.json', JSON.stringify({ kode, telp }));
  console.log('SELESAI');
})().catch(e => { console.error('GAGAL', e); process.exit(1); });
