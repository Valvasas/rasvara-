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

Skrip tambahan (jalankan setelah `e2e.cjs`, karena memakai sandi pemilik yang
sudah diganti; atur `SANDI=…` bila berbeda):

```bash
DATABASE_URL=... node scripts/uji-e2e/uji-operasional.cjs   # pesanan manual + DP + ubah + pelunasan, produksi, resep
DATABASE_URL=... node scripts/uji-e2e/uji-insight.cjs        # tab laporan: angka = SQL, tanpa scroll horizontal
DATABASE_URL=... CRON_SECRET=... node scripts/uji-e2e/uji-rekap-otomasi.cjs  # XLSX = DB, cron, batal otomatis, traversal
DATABASE_URL=... node scripts/uji-e2e/uji-responsif-realtime.cjs  # semua halaman di 390/768/1440 + papan realtime
```

Login dibatasi 5×/menit per IP (fitur keamanan). Bila menjalankan semua skrip
berturut-turut lalu ada yang berhenti di halaman masuk, tunggu satu menit.

Keluar dengan kode 0 hanya bila semua langkah lulus **dan** tidak ada galat
konsol, galat halaman, atau respons 5xx selama uji.
