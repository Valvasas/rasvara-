# Panduan & Checklist Kesiapan Produksi (Production Readiness)
## Citarasa Catering (Rasvara)

Dokumen ini memuat panduan langkah-demi-langkah bagi administrator sistem atau pengembang untuk memindahkan aplikasi ke tahap **produksi (live production)**.

---

## 1. Daftar Periksa (Checklist) Pra-Rilis

Sebelum mempublikasikan website ke domain publik, pastikan poin-poin berikut telah terpenuhi:

- [ ] **Audit Kesiapan Berhasil**: Jalankan `node scripts/verify-production.mjs` dan pastikan semua parameter lulus (0 error).
- [ ] **Variabel Lingkungan Diatur**: Berkas `.env.production` terisi dengan data riil server.
- [ ] **Nomor HP Pemilik Diisi**: `SEED_TELEPON_PEMILIK` bukan lagi contoh `6281234567890` — nomor ini yang dipakai pemilik untuk login dan muncul sebagai kontak WhatsApp di situs.
- [ ] **Kunci Sesi Aman**: `SESSION_SECRET` berisi minimal 32 karakter acak, dan **belum pernah ikut terbagikan** bersama folder proyek. Buat baru: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.
- [ ] **Sandi Database Kuat**: `POSTGRES_PASSWORD` dan sandi di `DATABASE_URL` sama, acak, dan berbeda dari `SESSION_SECRET`.
- [ ] **Database PostgreSQL Siap**: Database terhubung dan migrasi skema telah diterapkan (`npm run db:deploy`).
- [ ] **Akun Pemilik Dibuat**: Akun pemilik telah diisi via `npm run db:seed` dengan nomor HP dan sandi kuat.
- [ ] **Data Demo Dimatikan**: `SEED_DEMO="0"` di `.env.production` agar pesanan dummy tidak masuk ke sistem kas riil.
- [ ] **Domain & HTTPS Aktif**: `NEXT_PUBLIC_BASE_URL` mengarah ke URL berprotokol `https://` (misal: `https://citarasacatering.com`).
- [ ] **Folder Unggahan Memiliki Izin Tulis**: Folder `DIREKTORI_UNGGAHAN` (bawaan `data/unggahan`) dapat ditulis oleh proses server. Folder ini **di luar `public/`** — bukti transfer hanya dilayani lewat route ber-otorisasi.
- [ ] **Unggah Foto Diuji di Staging**: Unggah bukti transfer berukuran 3–5 MB dari ponsel benar-benar berhasil (batas Server Action disetel 6 MB di `next.config.ts`, batas validasi aplikasi 5 MB, `client_max_body_size` Nginx 10 MB).
- [ ] **Pencadangan Terjadwal**: Cron job untuk `scripts/backup-db.mjs` atau `pg_dump` telah dipasang, **dan hasilnya disalin ke luar server** (cadangan yang hanya ada di server yang sama ikut hilang saat servernya hilang).
- [ ] **Pemulihan Pernah Diuji**: Satu kali percobaan restore ke database kosong pernah dilakukan dan berhasil.

---

## 2. Menyiapkan Database Produksi

1. **Buat Database PostgreSQL**:
   ```sql
   CREATE DATABASE citarasa;
   CREATE USER citarasa_user WITH ENCRYPTED PASSWORD 'password_rahasia_anda';
   GRANT ALL PRIVILEGES ON DATABASE citarasa TO citarasa_user;
   ```

2. **Terapkan Migrasi (Tanpa Reset)**:
   > **PENTING**: Jangan pernah gunakan `prisma migrate dev` di server produksi karena dapat menghapus data. Gunakan `db:deploy`:
   ```bash
   npm run db:deploy
   ```

3. **Inisialisasi Pengaturan & Akun Pemilik**:
   ```bash
   SEED_TELEPON_PEMILIK="6281234567890" \
   SEED_SANDI_PEMILIK="SandiKuatPemilik123!" \
   SEED_NAMA_PEMILIK="Ibu Citarasa" \
   SEED_DEMO="0" \
   npm run db:seed
   ```

---

## 3. Pilihan Menjalankan di Server Produksi

### Opsi A: Menggunakan Docker Compose (Direkomendasikan)
Cocok untuk VPS (DigitalOcean, Hetzner, AWS EC2, Biznet, IDCloudHost).

> **Perhatikan `--env-file` di setiap perintah.** Docker Compose mensubstitusi
> `${POSTGRES_PASSWORD}` saat membaca berkas compose, dan ia mengambilnya dari
> berkas `.env` biasa atau dari flag ini — **bukan** dari berkas yang tertulis di
> `env_file:`. Tanpa flag ini, kontainer database dibuat dengan sandi berbeda
> dari yang dipakai aplikasi, dan keduanya gagal terhubung.

1. **Jalankan container produksi**:
   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
   ```
2. **Jalankan migrasi pertama kali di dalam container**:
   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml exec app npm run db:deploy
   docker compose --env-file .env.production -f docker-compose.prod.yml exec app npm run db:seed
   ```
3. **Cek status kesehatan**:
   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml ps
   curl http://127.0.0.1:3000/api/health
   ```
   Kontainer `app` punya `HEALTHCHECK` bawaan yang memanggil `/api/health`, jadi
   kolom STATUS akan menampilkan `healthy` / `unhealthy`.

---

### Opsi B: VPS Tradisional (Node.js + PM2 + Nginx)

1. **Pasang dependensi dan build**:
   ```bash
   npm ci
   npm run db:deploy
   npm run build
   ```

2. **Jalankan aplikasi dengan PM2**:
   ```bash
   pm2 start ecosystem.config.cjs --env production
   pm2 save
   pm2 startup
   ```

3. **Konfigurasi Nginx & SSL**:
   - Salin file konfigurasi:
     ```bash
     sudo cp nginx/citarasa.conf /etc/nginx/sites-available/citarasa.conf
     sudo ln -s /etc/nginx/sites-available/citarasa.conf /etc/nginx/sites-enabled/
     ```
   - Pasang SSL gratis via Certbot:
     ```bash
     sudo certbot --nginx -d citarasacatering.com -d www.citarasacatering.com
     ```
   - Uji dan muat ulang Nginx:
     ```bash
     sudo nginx -t
     sudo systemctl reload nginx
     ```

---

## 4. Monitoring & Pemeriksaan Kesehatan (Health Check)

Aplikasi dilengkapi endpoint `/api/health` yang mengembalikan status kesehatan runtime dan latensi koneksi database PostgreSQL:

- **Format Respons Sukses (HTTP 200)**:
  ```json
  {
    "status": "ok",
    "pesan": "Citarasa Catering berjalan normal",
    "lingkungan": "production",
    "uptimeDetik": 86400,
    "timestamp": "2026-09-20T12:00:00.000Z",
    "database": {
      "status": "terhubung",
      "latensiMs": 4
    }
  }
  ```
- **Integrasikan ke Uptime Monitor**:
  Gunakan layanan seperti [BetterStack](https://betterstack.com) atau [UptimeRobot](https://uptimerobot.com) yang memantau endpoint `https://citarasacatering.com/api/health` setiap 60 detik. Jika database mengalami gangguan, endpoint otomatis merespons HTTP 503 Service Unavailable dan mengirim notifikasi darurat.

---

## 5. Otomasi Pencadangan (Backup) Data

1. **Skrip Bawaan (`scripts/backup-db.mjs`)**:
   Mencadangkan seluruh 13 tabel (pengaturan, pengguna, menu, foto, pesanan, kas, voucher, analitik) ke berkas JSON berstempel waktu di folder `backups/`, **beserta berkas unggahan** (bukti transfer & foto menu) ke `backups/unggahan/`:
   ```bash
   npm run db:backup
   ```
   > Isi folder unggahan tidak ada di database — yang tersimpan di sana hanya
   > nama berkasnya. Cadangan tanpa folder itu akan memulihkan pesanan dengan
   > seluruh tautan gambar rusak.

   > **Ini bukan pengganti `pg_dump`.** Berkas JSON berguna untuk memeriksa isi
   > data, tetapi pemulihan penuh yang cepat tetap memerlukan dump PostgreSQL
   > yang sesungguhnya, dan keduanya harus disalin ke luar server.

2. **Pasang Cron Job Setiap Jam 02:00 WIB**:
   Buka crontab server (`crontab -e`) dan tambahkan:
   ```cron
   0 2 * * * cd /var/www/citarasa-catering && npm run db:backup >> /var/log/citarasa-backup.log 2>&1
   ```

---

## 6. Prosedur Rollback Cepat

- **Jika Build Baru Error**:
  - PM2: `pm2 revert` atau deploy commit Git sebelumnya lalu `npm run build && pm2 reload citarasa-catering`.
  - Docker: Jalankan tag image sebelumnya: `docker compose -f docker-compose.prod.yml up -d`.
- **Jika Terjadi Kerusakan Data**:
  - Pulihkan snapshot database dari file cadangan di folder `backups/` atau dump PostgreSQL harian.

