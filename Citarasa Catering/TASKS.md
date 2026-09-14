# Daftar Tugas — Citarasa Catering

Backlog perbaikan & pengembangan lanjutan, dikelompokkan per area. Ini bukan daftar statis — tambah/coret/pindahkan item seiring berjalannya proyek. Beri tanda `[x]` saat selesai, jangan hapus item lama begitu saja (biar ada jejak keputusan); pindahkan ke bagian "Selesai" jika daftar aktif mulai penuh.

Cara pakai: sebelum mulai kerja, cek dulu apakah tugas terkait sudah ada di sini. Sebelum menutup sesi kerja, perbarui status di sini.

## Fitur bisnis masa depan (tahap lanjutan)

- [ ] **Verifikasi pembayaran otomatis (Payment Gateway)** — saat ini pembeli mengunggah bukti transfer lalu pemilik verifikasi manual di kanban. Integrasi payment gateway (mis. Midtrans / Xendit) bisa mengotomatiskan ini, tetapi alur `StatusBayar` harus dijaga dengan hati-hati (lihat invarian #3 di AGENTS.md — satu pesanan tetap harus maks satu `CatatanKas`).
- [ ] **Integrasi WhatsApp Business API resmi** — saat ini tombol chat membuka tautan `wa.me` langsung. Penggunaan WhatsApp Cloud API dapat mengirim pesan notifikasi otomatis saat dapur memperbarui status pesanan.
- [ ] **Peran staf tambahan (Staf Dapur)** — skema `Peran` saat ini adalah `PEMILIK` dan `PELANGGAN`. Jika usaha berkembang dan butuh asisten dapur yang hanya boleh melihat pesanan tanpa akses pembukuan kas/pengaturan, dapat ditambahkan peran baru beserta otorisasi granular.
- [ ] **Multi-cabang / multi-outlet** — skema saat ini eksplisit single-tenant UMKM (`Pengaturan` baris tunggal `id: "utama"`). Jika usaha ingin ekspansi membuka cabang baru, ini membutuhkan perubahan skema multi-cabang.
- [ ] **Monitoring & Sentry di produksi** — integrasi Sentry / APM untuk menangkap error runtime di sisi klien maupun Server Actions secara terpusat.

## Selesai

*(daftar tugas yang telah dituntaskan beserta catatan dan tanggal)*

- [x] **Fitur pemudah pembeli & penjual (rekap bahan, pesan ulang, kalkulator porsi)** — tiga fitur tanpa perubahan skema: (1) "Rekap Kebutuhan Bahan" di papan admin, agregasi otomatis `ItemPesanan` dari semua pesanan aktif jadi daftar belanja pasar; (2) "Pesan Lagi" 1-klik di `/riwayat` yang mengisi ulang menu & jumlah dari pesanan lama via `/pesan?ulang=<kode>`, dengan verifikasi kepemilikan (penggunaId atau nomor telepon cocok, sesuai aturan akses invarian #5) dan penanganan menu yang sudah tidak tersedia; (3) kalkulator estimasi porsi di form pemesanan — jumlah tamu opsional otomatis menyarankan kuantitas untuk kategori Nasi Kotak/Snack (1 unit = 1 tamu), sengaja tidak diterapkan ke Tumpeng/Nasi Goreng karena porsinya untuk rame-rame dan tidak ada data rasio yang bisa dipertanggungjawabkan (2026-09-14).
- [x] **Peningkatan UX/UI lanjutan (animasi, loading/error state, nav aktif)** — menambahkan `loading.tsx` (toko & admin) dan `not-found.tsx`/`error.tsx` global bertema hangat agar tidak ada lagi layar kosong/crash default Next.js; animasi masuk halus (`anim-masuk`, `anim-mengambang`) dengan penghormatan `prefers-reduced-motion`; hover-lift pada kartu kategori/menu; highlight tautan navigasi aktif di header toko (`NavToko.tsx`) dan admin (`NavAdmin.tsx`); serta bar total mengambang (sticky) di formulir pemesanan mobile agar pembeli tetap melihat total belanja saat mengisi form panjang (2026-09-14).
- [x] **Inisialisasi git repository** — git repo aktif di root proyek dengan `.gitignore` rapi dan tracking perubahan (2026-09-14).
- [x] **Test framework & unit testing lengkap** — menggunakan Node test runner bawaan + `tsx`, mencakup 40 unit test: hashing sandi scrypt, formatting Rupiah/WIB/telepon, alur status pesanan, generator kode pesanan CR-YYMMDD-XXXX, dan validasi berkas upload (2026-09-14).
- [x] **Setup CI pipeline** — konfigurasi GitHub Actions di `.github/workflows/ci.yml` menjalankan typecheck, linting, unit test, dan build secara otomatis (2026-09-14).
- [x] **Konfigurasi ESLint flat config** — `eslint.config.mjs` terpasang eksplisit; lulus 0 error dan 0 warning di seluruh codebase (2026-09-14).
- [x] **Validasi upload bukti transfer aman** — modul `src/lib/unggah.ts` memvalidasi magic bytes header gambar (JPEG, PNG, WebP), batas ukuran 5MB, penamaan acak anti-traversal, preview di form pembeli (`FormUnggahBukti.tsx`), serta tampilan langsung di kartu pesanan kanban dapur (`src/app/admin/page.tsx`) (2026-09-14).
- [x] **Rate limiting keamanan** — pembatas laju sliding window (`pembatas-laju.ts`) diterapkan pada endpoint `/masuk`, `/daftar`, `/lacak`, dan upload bukti transfer untuk mencegah brute-force dan DoS (2026-09-14).
- [x] **Strategi & skrip backup database** — skrip `scripts/backup-db.mjs` dan perintah `npm run db:backup` mengekspor seluruh snapshot tabel ke format JSON bertanggal di folder `backups/` (2026-09-14).
- [x] **Dokumentasi operasional, rotasi rahasia & hosting** — panduan lengkap di `docs/PANDUAN_OPERASIONAL.md` mencakup deployment Docker/VPS, cron backup, rotasi `SESSION_SECRET`, dan media penyimpanan berkas (2026-09-14).
- [x] **Ekspor laporan keuangan ke CSV** — route handler `/api/admin/ekspor-laporan` mendukung ekspor transaksi kas dan rangkuman bulanan ke format CSV RFC 4180 dengan UTF-8 BOM untuk Excel (2026-09-14).
- [x] **Pencarian & filter admin** — kanban pesanan dapur mendukung pencarian teks (kode/nama/telepon) dan filter metode ambil; halaman kelola menu mendukung pencarian dan filter kategori (2026-09-14).
- [x] **Riwayat pesanan pelanggan terdaftar** — halaman `/riwayat` menampilkan daftar pesanan pelanggan yang login beserta status pengerjaan dan pelunasan secara real-time (2026-09-14).
- [x] **Skrip seed demo untuk staging** — `SEED_DEMO=1 npm run db:seed` menyediakan data awal menu lengkap, pengaturan dapur, akun pemilik UMKM, serta contoh pesanan aktif (2026-09-14).
- [x] **Audit aksesibilitas & UI Next.js 16** — Tailwind CSS v4 dengan palet hangat UMKM kuliner Indonesia (`krem`, `bata`, `kunyit`, `daun`, `kayu`), base font 17px, touch target $\ge 48\text{px}$, tanpa hamburger menu tersembunyi (2026-09-14).
- [x] **Dockerfile multi-stage untuk Next.js 16** — `Dockerfile` dan `.dockerignore` siap untuk containerization produksi (2026-09-14).
- [x] **Dokumentasi awal proyek** — CLAUDE.md, AGENTS.md, ARCHITECTURE.md, TASKS.md, CONTRIBUTING.md (2026-09-13).
