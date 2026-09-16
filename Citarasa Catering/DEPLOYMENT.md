# Panduan Deployment & Operasional Produksi — Citarasa Catering

Dokumen ini memuat panduan konkret untuk mendeploy, mengamankan, dan memelihara aplikasi Citarasa Catering di lingkungan produksi.

---

## 1. Persyaratan Lingkungan

- **Node.js**: v24.x LTS (mendukung App Router Next.js 16 & React 19)
- **Database**: PostgreSQL 15/16/17 dengan ekstensi standar
- **Variabel Lingkungan (Environment Variables)**:
  - `DATABASE_URL`: URI koneksi PostgreSQL (contoh: `postgresql://user:password@host:5432/citarasa?schema=public`)
  - `SESSION_SECRET`: String acak kriptografis minimal 32 karakter
  - `NEXT_PUBLIC_BASE_URL`: URL domain publik (contoh: `https://citarasa-catering.com`)
  - `NODE_ENV`: `production`
  - `PROXY_TEPERCAYA`: jumlah reverse-proxy tepercaya di depan aplikasi. **Wajib disesuaikan** — lihat catatan di bawah.
  - `DB_POOL_MAX` (opsional, bawaan `20`): batas koneksi database yang dibuka aplikasi.

> **`PROXY_TEPERCAYA` menentukan apakah pembatas laju benar-benar bekerja.**
> Header `x-forwarded-for` dan `x-real-ip` bisa ditulis siapa saja yang mengirim
> permintaan; yang membuatnya dapat dipercaya hanyalah proxy di depan yang
> menimpanya. Isi `1` untuk susunan "nginx → aplikasi" seperti Opsi A/B di bawah.
> Isi `0` bila aplikasi diakses langsung tanpa proxy — dengan begitu header
> diabaikan sepenuhnya dan penyerang tidak bisa mengarang alamat baru tiap
> permintaan untuk memperoleh jatah percobaan login yang baru. Kalau ada lebih
> dari satu proxy (misalnya Cloudflare → nginx → aplikasi), isi sesuai jumlahnya.

---

## 2. Opsi Deployment

### Opsi A: Menggunakan Docker Compose (Direkomendasikan untuk VPS)

Sangat cocok untuk VPS murah (DigitalOcean Droplet, Hetzner, Biznet Gio, IDCloudHost).

1. Clone repositori ke server:
   ```bash
   git clone <url-repo> /opt/citarasa-catering
   cd /opt/citarasa-catering
   ```

2. Buat berkas `.env` produksi:
   ```bash
   cp .env.example .env
   # Generate secret acak:
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

3. Jalankan container:
   ```bash
   docker compose up -d --build
   ```

4. Jalankan migrasi dan seed database pertama kali di dalam container:
   ```bash
   docker compose exec app npm run db:deploy
   docker compose exec app npm run db:seed
   ```

---

### Opsi B: VPS Tradisional (Node.js + PM2 + Nginx)

1. Pasang Node.js 24 dan PostgreSQL di server.
2. Pasang PM2 secara global: `npm install -g pm2`.
3. Di direktori proyek:
   ```bash
   npm ci
   npm run db:deploy
   npm run build
   ```
4. Jalankan dengan PM2:
   ```bash
   pm2 start npm --name "citarasa" -- start
   pm2 save
   pm2 startup
   ```
5. Konfigurasikan Nginx sebagai reverse proxy ke `http://127.0.0.1:3000` dengan SSL gratis dari Certbot (Let's Encrypt).

---

### Opsi C: Platform PaaS (Railway / Render / Fly.io)

1. Buat layanan PostgreSQL terkelola di dashboard penyedia.
2. Tambahkan variabel lingkungan `DATABASE_URL`, `SESSION_SECRET`, dan `NEXT_PUBLIC_BASE_URL`.
3. Perintah Build: `npm run build`
4. Perintah Start: `npm run db:deploy && npm start`
5. **Penting**: Pasang persistent volume pada folder `/app/public/unggahan` agar foto bukti transfer tidak hilang saat container restart, atau beralih ke Object Storage S3.

---

## 3. Strategi Backup PostgreSQL

Data pesanan dan buku kas adalah aset terpenting usaha. Jangan pernah menjalankan produksi tanpa backup terjadwal.

### A. Skrip Backup Harian Otomatis (Cron Job)

Buat berkas `/usr/local/bin/backup-citarasa.sh`:
```bash
#!/bin/bash
set -e

BACKUP_DIR="/var/backups/citarasa"
HARI_INI=$(date +%Y%m%d_%H%M%S)
FILE_BACKUP="$BACKUP_DIR/citarasa_$HARI_INI.sql.gz"

mkdir -p "$BACKUP_DIR"

# Jalankan dump dan kompres
pg_dump -U citarasa_user -h localhost -d citarasa | gzip > "$FILE_BACKUP"

# Hapus backup yang lebih tua dari 30 hari untuk hemat disk
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +30 -delete

echo "[$(date)] Backup selesai: $FILE_BACKUP"
```

Beri izin eksekusi:
```bash
chmod +x /usr/local/bin/backup-citarasa.sh
```

Tambahkan ke crontab (`crontab -e`) untuk dijalankan setiap jam 02:00 pagi WIB:
```cron
0 2 * * * /usr/local/bin/backup-citarasa.sh >> /var/log/backup-citarasa.log 2>&1
```

### B. Prosedur Pemulihan (Restore) Database

Jika terjadi insiden data:
```bash
# 1. Hentikan aplikasi sementara
docker compose stop app

# 2. Pulihkan database dari file backup
gunzip -c /var/backups/citarasa/citarasa_20260913_020000.sql.gz | psql -U citarasa_user -d citarasa

# 3. Jalankan kembali aplikasi
docker compose start app
```

---

## 4. Manajemen & Rotasi `SESSION_SECRET`

- **Penyimpanan**: Di server produksi berbayar, simpan rahasia di Secret Manager (misalnya AWS Secrets Manager, Doppler, Vault, atau Environment Secret di PaaS), bukan di file teks biasa tanpa enkripsi.
- **Konsekuensi Perubahan**: Mengganti `SESSION_SECRET` akan otomatis membatalkan seluruh cookie sesi login aktif (`sesi_citarasa`) **dan** cookie akses pesanan tamu (`pesanan_saya`, yang ditandatangani dengan kunci yang sama). Pengguna dan pemilik usaha harus login ulang; pembeli tamu perlu memasukkan kode pesanan & nomor HP lagi di halaman `/lacak`.
- **Waktu Rotasi**: Dianjurkan rotasi setiap 6–12 bulan, atau segera jika dicurigai terjadi kebocoran kredensial server.

---

## 5. Penyimpanan Berkas Upload (`public/unggahan/`)

- Saat ini berkas disimpan di filesystem lokal (`public/unggahan/bukti/`).
- **Pada Docker / VPS**: Gunakan Docker Volume atau persistent directory yang di-mount keluar container.
- **Pada Serverless (Vercel / Netlify)**: Serverless functions bersifat stateless dan read-only pada filesystem. Jika mendeploy ke serverless, ganti logika penyimpanan di `src/app/aksi/pesanan.ts` (`unggahBuktiTransfer`) untuk mengunggah ke object storage yang kompatibel dengan S3 (mis. Cloudflare R2, AWS S3, atau Supabase Storage).

