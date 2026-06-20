# Rasvara Catering

Marketplace-style catering website for Rasvara with a static frontend and an Express backend.

## Structure

- `public/` - all browser-facing pages, styles, scripts, icons, brand assets, and public uploads.
- `backend/` - Express API, auth/session handling, order/customer/vendor/admin endpoints, and server config.
- `backend/data/data.json` - local runtime data for menus, orders, ledger, reviews, vendors, and website settings.
- `public/uploads/` - images served to visitors and uploaded from admin/vendor tools.
- `firebase.json` - Firebase Hosting config; it serves the `public/` directory.

Root-level HTML/CSS/JS files are intentionally not used. Keep frontend changes inside `public/`.

## Local Testing

```powershell
cd backend
npm install
npm run db:generate
npm run check
npm test
npm run audit
$env:PORT="3000"
npm start
```

Open:

- `http://localhost:3000`
- `http://localhost:3000/admin`
- `http://localhost:3000/api/health`
- `http://localhost:3000/api/ready`

## Marketplace Foundation

Fase foundation menambahkan jalur PostgreSQL/Prisma tanpa memutus route JSON lama. Selama transisi, katalog, admin, vendor dashboard, order legacy, dan upload lokal tetap membaca `backend/data/data.json`; endpoint customer baru memakai Prisma jika `DATABASE_URL` sudah tersedia dan `npm run db:generate` sudah dijalankan.

### Database Setup

1. Buat database PostgreSQL, misalnya `annie_catering`.
2. Copy `backend/.env.example` menjadi `backend/.env`, lalu isi secret kuat dan `DATABASE_URL`.
3. Jika memakai Docker untuk local development:

```powershell
cd backend
docker compose up -d postgres
```

4. Jalankan:

```powershell
cd backend
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
```

Schema ada di `backend/prisma/schema.prisma`. Migration SQL awal ada di `backend/prisma/migrations/20260620000000_marketplace_foundation/migration.sql`.

### Migrasi JSON Lama

Migrasi legacy dibuat idempotent memakai `legacyId`, jadi aman dijalankan ulang:

```powershell
cd backend
npm run db:migrate:json
```

Script membaca `backend/data/data.json`, membuat backup ke `backend/data/backups/`, lalu menulis report ke `backend/data/migration-reports/`. Rollback paling aman untuk fase ini adalah restore database dari backup/snapshot PostgreSQL sebelum migration, lalu gunakan file JSON backup jika perlu kembali ke mode legacy. Script tidak menghapus `data.json`.

### Endpoint Baru

- `POST /api/auth/register` - registrasi customer.
- `POST /api/auth/login` - login customer.
- `GET /api/auth/session` - session aktif + CSRF token.
- `POST /api/auth/logout` - revoke session aktif.
- `GET /api/auth/sessions` - daftar session aktif customer.
- `DELETE /api/auth/sessions/:id` - revoke satu session.
- `DELETE /api/auth/sessions` - logout semua perangkat.
- `GET /api/auth/profile` dan `PUT /api/auth/profile` - profil customer.
- `GET/POST/PUT/DELETE /api/auth/addresses` - address book customer.
- Alias customer tersedia juga di `/api/customers/*` untuk mengikuti struktur API marketplace bertahap.
- `GET /api/cart` - cart aktif customer.
- `POST /api/cart/items` - tambah/update item cart dengan harga dihitung ulang dari database.
- `PUT /api/cart/items/:id` - ubah quantity item cart.
- `DELETE /api/cart/items/:id` - hapus item cart.
- `DELETE /api/cart` - kosongkan cart aktif.
- `POST /api/checkout` - buat order awal dari cart aktif dengan snapshot produk/harga.
- `POST /api/orders/:id/cancel` - customer membatalkan order miliknya; jika sudah dibayar, sistem membuat refund request.
- `POST /api/orders/:id/disputes` - customer membuka dispute untuk order paid; saldo available vendor ditahan jika order sudah selesai.
- `POST /api/payments` - buat invoice sandbox untuk order customer yang masih menunggu pembayaran.
- `GET /api/payments/:id` - cek payment milik customer.
- `POST /api/payments/mock/webhook` - webhook sandbox bertanda tangan untuk simulasi `PAID`, `EXPIRED`, atau `FAILED`.
- `GET /api/vendor/marketplace/orders` - vendor melihat order Prisma miliknya.
- `GET /api/vendor/marketplace/finance` - vendor melihat saldo, agregat ledger, dan histori transaksi finance miliknya.
- `POST /api/vendor/marketplace/orders/:id/confirm` - vendor konfirmasi order yang sudah dibayar.
- `POST /api/vendor/marketplace/orders/:id/reject` - vendor menolak order; refund masih perlu diproses manual/admin.
- `POST /api/vendor/marketplace/orders/:id/prepare` - vendor mulai produksi order.
- `POST /api/vendor/marketplace/orders/:id/ready` - vendor menandai order siap.
- `POST /api/vendor/marketplace/orders/:id/complete` - vendor menyelesaikan order dan skeleton release saldo pending ke available.
- `GET /api/ready` - readiness database/storage.

Mutation yang memakai cookie customer wajib mengirim header `x-csrf-token` dari response login/register/session.
Cart fase ini sengaja dibatasi satu vendor per checkout. Jika cart berisi produk Vendor A, backend akan menolak produk Vendor B sampai cart dikosongkan.
Checkout fase ini belum menagih pembayaran nyata: order dibuat dengan `WAITING_PAYMENT` dan `PENDING`, lalu payment provider resmi/sandbox masuk di fase berikutnya.
Payment sandbox tidak memproses uang sungguhan dan tidak boleh dipakai sebagai bukti bayar production. Webhook sandbox wajib header `x-mock-signature`, dihitung dari `eventId.providerRef.status.amount` dengan HMAC SHA-256 memakai `MOCK_PAYMENT_WEBHOOK_SECRET`.
Saat webhook sandbox `PAID` diterima, ledger vendor mencatat `ORDER_CREDIT` dan `COMMISSION_DEBIT` secara idempotent, lalu saldo vendor masuk ke `pending`.
Saat order `COMPLETED`, saldo net vendor dipindahkan dari `pending` ke `available` dengan catatan ledger idempotent `ADJUSTMENT_CREDIT` bermetadata `PENDING_TO_AVAILABLE`. Ini belum payout nyata.
Endpoint `GET /api/vendor/marketplace/finance` menerima query opsional `limit` (1-100), `cursor`, `currency`, dan `type` seperti `ORDER_CREDIT`/`COMMISSION_DEBIT`. Angka finance bersumber dari ledger, bukan dihitung ulang dari daftar order di frontend.
Cancel order paid baru membuat `Refund REQUESTED`; uang belum benar-benar dikembalikan karena provider refund nyata belum diintegrasikan. Dispute order completed memindahkan saldo vendor dari `available` ke `held` dengan ledger `ADJUSTMENT_DEBIT` bermetadata `AVAILABLE_TO_HELD`.

### Batasan Fase Ini

Payment gateway, payout nyata, proses refund provider, resolusi dispute admin, chat realtime, checkout Prisma penuh, dan migrasi frontend ke endpoint customer/cart belum dikerjakan. Ini sengaja: pondasi database, auth, session, RBAC helper, audit log, storage abstraction, migrator, dan cart satu vendor harus stabil dulu sebelum transaksi finansial dipindah.

## Maintenance Notes

- Do not commit `backend/node_modules/`, `.env`, or `backend/data/*.json`.
- Use `backend/.env.example` as the production environment template.
- Static hosting alone is not enough because the frontend calls `/api/*`.
- If dependencies are missing locally, run `npm install` from `backend/`.
