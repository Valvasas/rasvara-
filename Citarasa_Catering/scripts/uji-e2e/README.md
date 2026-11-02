# Uji menyeluruh (E2E) sebelum rilis

Skrip ini menekan semua tombol penting di toko dan dashboard, lalu mencocokkan
hasilnya langsung ke database. Jalankan **hanya ke database uji**. Skrip ini
membuat pesanan, mengganti sandi pemilik menjadi `sandiProduksi#2026`, dan
menghapus data.

```bash
# 1. Database uji kosong
npm run db:deploy
SEED_DATA_UJI=1 npm run db:seed
psql "$DATABASE_URL" -f scripts/uji-e2e/data-stres.sql   # 150 menu, 1.200 pesanan, 1.600 kas

# 2. Jalankan aplikasi (build produksi)
npm run build && npm start &

# 3. Jalankan uji (butuh Playwright + Chromium terpasang)
npm i --no-save playwright && npx playwright install chromium
DATABASE_URL=... node scripts/uji-e2e/e2e.cjs
```

Keluar dengan kode 0 hanya bila semua langkah lulus **dan** tidak ada galat
konsol, galat halaman, atau respons 5xx selama uji.

## Uji akun & keamanan (v3)

`e2e-akun.cjs` menguji daftar (sandi umum ditolak, sesi langsung berlaku),
"Ingat saya", keluar dari perangkat lain, banner sandi bawaan & daftar
kesiapan di dashboard, reset sandi pelanggan oleh pemilik, portal dapur, dan
halaman lupa sandi. Jalankan pada database yang **baru di-seed** (sebelum
`e2e.cjs`, yang mengganti sandi pemilik):

```bash
DATABASE_URL=... node scripts/uji-e2e/e2e-akun.cjs
```
