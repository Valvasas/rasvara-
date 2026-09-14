# Panduan Operasional & Deployment Produksi — Citarasa Catering

Dokumen ini memuat standar operasional, deployment, pencadangan (backup), dan pengamanan sistem Citarasa Catering di lingkungan produksi.

---

## 1. Pilihan Deployment Produksi

Aplikasi ini menggunakan Next.js 16 (Node.js runtime) dan PostgreSQL. Terdapat dua metode rekomendasi untuk deployment produksi:

### Opsi A: Menggunakan Docker (Rekomendasi untuk VPS / Serverless Container)
Proyek telah dilengkapi dengan `Dockerfile` multi-stage dan `.dockerignore`.

1. **Build Container Image:**
   ```bash
   docker build -t citarasa-catering:latest .
   ```

2. **Jalankan Container dengan Docker Compose atau Docker Run:**
   ```bash
   docker run -d \
     --name citarasa-app \
     -p 3000:3000 \
     -e DATABASE_URL="postgresql://user:password@db-host:5432/citarasa?sslmode=require" \
     -e SESSION_SECRET="minimal-32-karakter-acak-dan-sangat-rahasia" \
     -e NEXT_PUBLIC_BASE_URL="https://citarasacatering.com" \
     -v citarasa_unggahan:/app/public/unggahan \
     citarasa-catering:latest
   ```
   > **Catatan Volume:** Volume `citarasa_unggahan:/app/public/unggahan` penting agar bukti transfer pelanggan tidak hilang saat container di-restart atau diperbarui.

---

### Opsi B: VPS Langsung (Ubuntu/Debian + Node.js 24 + PM2 + Nginx)

1. **Install Node.js 24 LTS & PM2:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
   sudo apt-get install -y nodejs
   sudo npm install -g pm2
   ```

2. **Clone & Setup Environment:**
   ```bash
   git clone <repo-url> /var/www/citarasa-catering
   cd /var/www/citarasa-catering
   npm ci
   cp .env.example .env
   # Edit .env dengan kredensial produksi yang aman
   nano .env
   ```

3. **Deploy Skema Database & Build Aplikasi:**
   ```bash
   npm run db:deploy
   npm run build
   ```

4. **Jalankan dengan PM2:**
   ```bash
   pm2 start npm --name "citarasa" -- start
   pm2 save
   pm2 startup
   ```

5. **Konfigurasi Reverse Proxy Nginx & SSL (Certbot):**
   ```nginx
   server {
       server_name citarasacatering.com www.citarasacatering.com;
       client_max_body_size 10M; # Mendukung unggah foto bukti transfer hingga 5MB

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

## 2. Strategi Pencadangan Database (Backup)

Data pesanan, katalog menu, dan buku kas adalah aset utama UMKM. Lakukan backup harian secara otomatis.

### Menggunakan Skrip Bawaan (`npm run db:backup`)
Aplikasi menyediakan skrip bawaan `scripts/backup-db.mjs` yang mengekspor seluruh tabel ke format JSON snapshot terstruktur:
```bash
npm run db:backup
```
File snapshot akan tersimpan di direktori `backups/backup-YYYYMMDD-HHmmss.json`.

### Otomasi dengan Cron Job (Setiap Jam 02:00 Pagi)
Tambahkan ke crontab server (`crontab -e`):
```cron
0 2 * * * cd /var/www/citarasa-catering && npm run db:backup >> /var/log/citarasa-backup.log 2>&1
```

### Backup PostgreSQL Native (`pg_dump`)
Jika menggunakan server PostgreSQL terpisah:
```bash
pg_dump -U postgres -d citarasa -F c -b -v -f "/var/backups/citarasa-$(date +\%Y\%m\%d).dump"
```

---

## 3. Pengamanan & Rotasi `SESSION_SECRET`

`SESSION_SECRET` digunakan untuk menandatangani cookie otentikasi JWT/JWE yang aman.

1. **Pembuatan Kunci Aman:**
   Gunakan string acak dengan entropi tinggi (minimal 32 karakter atau 256-bit hex):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. **Penyimpanan:**
   - **JANGAN PERNAH** commit file `.env` ke repository Git.
   - Di server produksi, simpan rahasia di environment variable sistem atau secrets manager (AWS Secrets Manager, Doppler, atau HashiCorp Vault).
3. **Rotasi Sesi:**
   - Ketika `SESSION_SECRET` diubah/dirotasi, semua sesi login pengguna (pemilik & pelanggan) yang sedang aktif akan otomatis kedaluwarsa secara aman dan diminta login kembali.
   - Lakukan rotasi berkala (misal setiap 90 hari) atau jika dicurigai terjadi kebocoran kredensial.

---

## 4. Tinjauan Media Penyimpanan Berkas (`public/unggahan/`)

Saat ini foto bukti transfer disimpan secara lokal di `public/unggahan/`:
- **Lingkungan VPS / Server Tunggal:** Aman dan efisien. Pastikan direktori `public/unggahan/` memiliki izin tulis untuk user nodejs/nextjs dan disertakan dalam jadwal backup file.
- **Lingkungan Stateless / Serverless (Vercel, AWS Lambda, Google Cloud Run):**
  Filesystem lokal bersifat ephemeral (sementara). Untuk deployment ke platform stateless di masa depan, gunakan adapter penyimpanan object storage berbasis S3 (misalnya AWS S3 atau Cloudflare R2). Abstraksi penyimpanan di `src/lib/unggah.ts` siap diintegrasikan dengan AWS SDK `@aws-sdk/client-s3` tanpa mengubah antarmuka halaman pelanggan.

---

## 5. Pemantauan & Logging Produksi

1. **Structured Logging:**
   - Kegagalan Server Action dan upaya login yang mencurigakan dicatat dengan format terstruktur via `console.error` dan `console.warn`.
2. **Health Check:**
   - Endpoint root `/` atau `/api/health` dapat digunakan oleh uptime monitor (misal UptimeRobot, BetterStack) untuk memantau ketersediaan sistem 24/7.

