const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = 'http://localhost:3000';
const OUT = __dirname + '/screenshots';
let n = 0;
const shot = async (page, name) => {
  await page.waitForLoadState('networkidle').catch(()=>{});
  await page.waitForTimeout(600);
  const f = `${String(++n).padStart(2,'0')}-${name}.png`;
  await page.screenshot({ path: `${OUT}/${f}`, fullPage: true });
  console.log('OK', f, page.url());
};
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 800 }, locale: 'id-ID' });
  const page = await ctx.newPage();
  const go = async (p, name) => { const r = await page.goto(BASE + p, { waitUntil: 'domcontentloaded' }); console.log(p, r.status()); await shot(page, name); };

  // --- Publik
  await go('/', 'beranda');
  await go('/menu', 'menu');
  await go('/menu/nasi-kotak-ayam-bakar', 'detail-menu');
  await go('/pesan?menu=nasi-kotak-ayam-bakar', 'pesan');
  await go('/lacak', 'lacak');
  await go('/masuk', 'masuk');
  await go('/daftar', 'daftar');
  await go('/kebijakan-privasi', 'kebijakan-privasi');
  await go('/syarat-ketentuan', 'syarat-ketentuan');
  await go('/halaman-tidak-ada', '404');

  // --- Pelanggan: daftar akun baru
  await page.goto(BASE + '/daftar');
  await page.fill('input[name=nama]', 'Budi Santoso');
  await page.fill('input[name=telepon]', '081355577788');
  await page.fill('input[name=sandi]', 'rahasia123');
  await page.fill('textarea[name=alamat], input[name=alamat]', 'Jl. Melati No. 12, Bandung').catch(()=>{});
  await Promise.all([page.waitForURL(u => !u.pathname.startsWith('/daftar'), {timeout: 15000}).catch(()=>{}), page.click('button[type=submit]')]);
  console.log('after daftar', page.url());
  await go('/riwayat', 'riwayat');
  await go('/pesanan/CR-DEMO-A1', 'pesanan-detail-tanpa-akses');

  // --- Admin
  const admin = await browser.newContext({ viewport: { width: 1366, height: 800 }, locale: 'id-ID' });
  const ap = await admin.newPage();
  await ap.goto(BASE + '/masuk');
  await ap.fill('input[name=telepon]', '081234567890');
  await ap.fill('input[name=sandi]', 'citarasa123');
  await Promise.all([ap.waitForURL(u => !u.pathname.startsWith('/masuk'), {timeout: 20000}), ap.click('button[type=submit]')]);
  console.log('admin landed', ap.url());
  const ago = async (p, name) => { const r = await ap.goto(BASE + p, { waitUntil: 'domcontentloaded' }); console.log(p, r.status()); await shot(ap, name); };
  await ago('/admin', 'admin-dashboard');
  await ago('/admin/pesanan/CR-DEMO-A1/cetak', 'admin-cetak-pesanan');
  await ago('/admin/menu', 'admin-menu');
  await ago('/admin/voucher', 'admin-voucher');
  await ago('/admin/keuangan', 'admin-keuangan');
  await ago('/admin/laporan', 'admin-laporan');
  await ago('/admin/analitik', 'admin-analitik');
  await ago('/admin/pengaturan', 'admin-pengaturan');
  await ago('/pesanan/CR-DEMO-A1', 'pesanan-detail');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
