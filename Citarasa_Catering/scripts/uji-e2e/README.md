# Uji menyeluruh (E2E) sebelum rilis

Skrip ini menekan semua tombol penting di toko dan dashboard, lalu mencocokkan
hasilnya langsung ke database. Jalankan **hanya ke database uji**. Skrip ini
membuat pesanan, mengganti sandi pemilik menjadi `sandiProduksi#2026`, dan
menghapus data.

```bash
# 1. Database uji kosong
npm run db:deploy
SEED_DEMO=1 npm run db:seed
psql "$DATABASE_URL" -f scripts/uji-e2e/data-stres.sql   # 150 menu, 1.200 pesanan, 1.600 kas

# 2. Jalankan aplikasi (build produksi)
npm run build && npm start &

# 3. Jalankan uji (butuh Playwright + Chromium terpasang)
npm i --no-save playwright && npx playwright install chromium
DATABASE_URL=... node scripts/uji-e2e/e2e.cjs
```

Keluar dengan kode 0 hanya bila semua langkah lulus **dan** tidak ada galat
konsol, galat halaman, atau respons 5xx selama uji.
