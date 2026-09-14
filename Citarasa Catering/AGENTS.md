<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Panduan Agent — Citarasa Catering (Rasvara)

Dokumen ini adalah instruksi kerja untuk AI coding agent (Claude Code, Codex, dsb) yang membantu mengembangkan proyek ini. Baca ini sebelum menulis kode. Untuk gambaran arsitektur mendalam lihat [ARCHITECTURE.md](ARCHITECTURE.md), untuk daftar pekerjaan lihat [TASKS.md](TASKS.md), untuk alur kontribusi lihat [CONTRIBUTING.md](CONTRIBUTING.md).

## 1. Apa proyek ini

Website satu-atap untuk usaha katering rumahan (snack box, nasi kotak, tumpeng, nasi goreng): pembeli memesan & melacak status, pemilik mengelola pesanan/menu/kas dari dashboard `/admin`. Satu aplikasi Next.js, satu database, tanpa REST API terpisah — semua penulisan data lewat **Server Actions**. Detail bisnis lengkap ada di [README.md](README.md).

## 2. Stack yang wajib diketahui

| Bagian | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Bahasa | TypeScript, `strict: true`, `allowJs: false` |
| Styling | Tailwind CSS v4 — **CSS-first config**, token ada di `src/app/globals.css` (`@theme`), **tidak ada** `tailwind.config.*` |
| Database | PostgreSQL + Prisma 7 lewat `@prisma/adapter-pg` (driver adapter, bukan engine binary klasik) |
| Auth | Custom: cookie `sesi_citarasa` (httpOnly, JWT HS256 via `jose`), password di-hash dengan `scrypt` bawaan Node (format `salt:hash`), login pakai **nomor telepon** |
| Validasi | Zod, dijalankan di server di dalam file `"use server"` |
| State | Tidak ada state management client global — mengandalkan Server Components + Server Actions + `revalidatePath` |
| Test runner | **Tidak ada** (belum dikonfigurasi — lihat TASKS.md) |
| Package manager | npm (`package-lock.json`) |

Jangan usulkan/menambahkan library yang menduplikasi hal di atas (mis. NextAuth, Redux, styled-components) tanpa diminta eksplisit oleh user — arsitektur ini sengaja diminimalkan.

## 3. Peta direktori

```
src/app/
  (toko)/        halaman publik pembeli (home, /menu, /pesan, /pesanan/[kode], /lacak, /riwayat, /masuk, /daftar)
  admin/         dashboard pemilik, dijaga terpusat di admin/layout.tsx
  aksi/          SEMUA Server Actions ("use server"): auth.ts, pesanan.ts, menu.ts, kas.ts, pengaturan.ts
src/components/
  toko/          komponen khusus halaman publik
  admin/         komponen khusus dashboard admin
  (root)         komponen bersama: Wordmark, Lencana, FormMasuk, TombolKeluar
src/lib/
  db.ts              Prisma client singleton (adapter pg, di-cache di globalThis saat dev)
  auth.ts            sesi & password (scrypt, jose)
  akses-pesanan.ts   cookie "pesanan_saya" (guest tracking, maks 25 kode, 180 hari)
  pesanan.ts         alur status pesanan, generator kode, label kategori
  format.ts          helper tanggal/jam WIB, format rupiah, normalisasi telepon, link WhatsApp
  laporan.ts         agregasi kas per hari/bulan (WIB-aware)
  pengaturan.ts      loader pengaturan bisnis dengan cache + default
src/generated/prisma/  hasil `prisma generate` — JANGAN diedit manual, ini git-ignored
prisma/
  schema.prisma      sumber kebenaran struktur data
  seed.ts            seed akun pemilik + pengaturan + menu (idempotent)
  migrations/         satu migrasi awal: 20260913000000_struktur_awal
legacy/               proyek marketplace multi-vendor LAMA (Express + HTML statis), DIARSIPKAN — jangan jadikan acuan pola/stack, dan jangan sertakan dalam typecheck/build (sudah di-exclude di tsconfig & next.config)
```

## 4. Invarian arsitektur — JANGAN DILANGGAR

Ini adalah aturan bisnis yang sudah didesain sengaja. Kalau perubahanmu menyentuh salah satu area ini, pertahankan perilakunya kecuali user secara eksplisit minta diubah.

1. **Harga tidak pernah dipercaya dari browser.** Saat `buatPesanan`, harga dibaca ulang dari DB di server; browser hanya kirim `menuId` + jumlah.
2. **Isi pesanan adalah snapshot.** `ItemPesanan.namaMenu`/`hargaSatuan` dibekukan saat order dibuat (bukan referensi live ke `Menu`) supaya struk lama tetap benar walau menu berubah/dihapus.
3. **Satu pesanan maksimal satu baris kas.** `CatatanKas.pesananId` unique — mencegah pencatatan ganda saat "Tandai Lunas" diklik lebih dari sekali.
4. **Semua tanggal dihitung dalam WIB** (Asia/Jakarta), terlepas dari timezone server. Selalu pakai helper di `src/lib/format.ts`, jangan `new Date()`/`Date.now()` mentah untuk logika tanggal bisnis.
5. **Kode pesanan bukan kunci akses.** Untuk melihat detail pesanan, pengunjung harus: memesan dari device itu (cookie `pesanan_saya`), ATAU login sebagai pemilik, ATAU nomor teleponnya cocok di halaman lacak. Jangan buat route yang expose detail pesanan hanya lewat kode di URL tanpa salah satu dari tiga syarat itu.
6. **Nomor telepon adalah identitas login**, bukan email (email di `Pengguna` opsional).
7. **Menu yang pernah dipesan tidak boleh dihapus**, hanya di-nonaktifkan (`Menu.aktif = false`), supaya riwayat pesanan tidak korup (relasi `ItemPesanan.menuId` — `onDelete: SetNull`, jangan diubah jadi cascade delete).

## 5. Alur kerja umum

- **Perubahan skema DB**: edit `prisma/schema.prisma` → `npm run db:migrate` (dev, buat migrasi baru) atau `npm run db:deploy` (apply migrasi existing, dipakai di produksi). Jangan edit file di `prisma/migrations/*/migration.sql` yang sudah ter-apply secara manual.
- **Tambah Server Action baru**: taruh di `src/app/aksi/<domain>.ts` dengan `"use server"` di atas file, validasi input dengan Zod, panggil `revalidatePath` pada path yang datanya berubah.
- **Setelah mengubah skema atau kode**, jalankan minimal:
  ```
  npm run typecheck
  npm run build
  ```
  (belum ada test suite — build + typecheck adalah baris pertahanan utama saat ini, lihat TASKS.md untuk rencana menambah test).
- **Jangan commit** `src/generated/prisma/`, `.env`, atau isi `public/unggahan/*` (sudah di `.gitignore`).
- Proyek ini **belum berupa git repository** (tidak ada folder `.git`). Jangan asumsikan riwayat git ada; jika perlu menjalankan operasi git, cek dulu apakah user sudah `git init`.

## 6. Konvensi penamaan (Bahasa Indonesia domain, kode konsisten)

Kode ini sengaja memakai istilah domain berbahasa Indonesia untuk model, variabel, dan route — pertahankan konsistensi ini, jangan campur dengan istilah Inggris (mis. jangan menulis fungsi baru bernama `createOrder` di sebelah `buatPesanan`). Istilah kunci:

| Istilah | Arti |
|---|---|
| Pesanan | Order | 
| Pengguna | User |
| Pemilik | Owner |
| Pelanggan | Customer |
| Menu | Menu item |
| Kas / CatatanKas | Cash ledger / entry |
| Pengaturan | Settings |
| Lacak | Track (order) |
| Riwayat | History |
| Alur / Status | Flow / Status |
| Aksi | Action (server action) |

## 7. Hal yang sensitif keamanan — hati-hati saat menyentuh

- `src/lib/auth.ts` dan `src/app/aksi/auth.ts`: logika sesi, hashing password, cookie signing. Perubahan di sini berdampak langsung ke keamanan login.
- `SESSION_SECRET` (env var): jangan pernah di-hardcode, log, atau expose ke client.
- Endpoint upload bukti transfer (`public/unggahan/`): jika menambah fitur upload, validasi tipe/ukuran file di server.
- Middleware/guard akses admin ada terpusat di `src/app/admin/layout.tsx` — jangan buat halaman admin baru yang melewati layout ini.

## 8. Yang TIDAK ada saat ini (jangan berasumsi)

- Tidak ada test framework (Jest/Vitest/Playwright) — lihat TASKS.md untuk rencana.
- Tidak ada CI (`.github/workflows` tidak ada).
- Tidak ada `tailwind.config.*` (memang sengaja, Tailwind v4 CSS-first).
- Tidak ada file ESLint config eksplisit di root meski ada script `lint` (`next lint`) — verifikasi konfigurasi sebelum mengandalkannya.
- `legacy/` bukan bagian dari aplikasi aktif — jangan impor apa pun dari sana ke `src/`.
