# Daftar Tugas — Citarasa Catering

Backlog perbaikan & pengembangan lanjutan, dikelompokkan per area. Ini bukan daftar statis — tambah/coret/pindahkan item seiring berjalannya proyek. Beri tanda `[x]` saat selesai, jangan hapus item lama begitu saja (biar ada jejak keputusan); pindahkan ke bagian "Selesai" jika daftar aktif mulai penuh.

Cara pakai: sebelum mulai kerja, cek dulu apakah tugas terkait sudah ada di sini. Sebelum menutup sesi kerja, perbarui status di sini.

## Prioritas tinggi — fondasi yang belum ada

- [ ] **Inisialisasi git repository.** Proyek ini punya `.gitignore` yang rapi tapi belum jadi git repo (`git init` belum dijalankan). Tanpa ini tidak ada riwayat perubahan, tidak bisa branch, tidak bisa code review berbasis diff.
- [ ] **Tambahkan test framework.** Belum ada Jest/Vitest/Playwright sama sekali. Prioritaskan unit test untuk logika di `src/lib/pesanan.ts` (alur status, generator kode), `src/lib/format.ts` (perhitungan WIB), dan aturan bisnis di `buatPesanan` (kapasitas harian, preorder, tanggal tutup) — ini logika paling berisiko kalau regresi diam-diam.
- [ ] **Setup CI.** Minimal satu workflow (GitHub Actions atau lainnya) yang menjalankan `npm run typecheck` dan `npm run build` di tiap push/PR. Tambahkan `npm test` begitu test framework terpasang.
- [ ] **Pastikan konfigurasi ESLint eksplisit ada** (`eslint.config.*`/`.eslintrc.*`) — saat ini ada script `lint` tapi belum diverifikasi konfigurasinya eksplisit di repo.

## Keamanan & keandalan

- [ ] **Validasi upload bukti transfer.** Jika `public/unggahan/` menerima file dari pembeli (bukti transfer), pastikan ada validasi tipe file (hanya gambar), batas ukuran, dan penamaan file yang tidak bisa ditebak/di-path-traversal.
- [ ] **Rate limiting halaman login & lacak pesanan.** `/masuk` dan `/lacak` menerima input publik (nomor telepon) — tanpa rate limit rawan brute-force nomor telepon/percobaan login.
- [ ] **Strategi backup PostgreSQL** untuk produksi (belum didokumentasikan sama sekali).
- [ ] **Rotasi & penyimpanan `SESSION_SECRET`** di lingkungan produksi — dokumentasikan cara aman menyimpannya (secret manager, bukan `.env` di server biasa).
- [ ] **Tinjau ulang penyimpanan file upload** (`public/unggahan/`) — saat ini kemungkinan disk lokal, tidak akan bertahan di platform hosting stateless/ephemeral (mis. banyak platform serverless). Pertimbangkan object storage (S3-compatible) jika akan deploy ke platform seperti itu.

## Fitur bisnis (potensi permintaan owner)

- [ ] **Verifikasi pembayaran otomatis** — saat ini pembeli klik "Sudah Transfer" lalu pemilik verifikasi manual. Integrasi payment gateway (mis. Midtrans/Xendit) bisa mengotomatiskan ini, tapi ubah dulu alur `StatusBayar` dengan hati-hati (lihat invarian #3 di AGENTS.md — satu pesanan tetap harus maks satu `CatatanKas`).
- [ ] **Integrasi WhatsApp API resmi** — saat ini `PesanWhatsapp.tsx` kemungkinan membuka link `wa.me` manual. WhatsApp Business API bisa mengirim notifikasi otomatis saat status pesanan berubah.
- [ ] **Ekspor laporan** (`/admin/laporan`) ke CSV/PDF/Excel untuk kebutuhan pembukuan eksternal.
- [ ] **Peran staf tambahan** — skema `Peran` saat ini hanya `PEMILIK`/`PELANGGAN`. Jika usaha berkembang dan butuh karyawan yang bisa akses dashboard tanpa akses penuh (mis. hanya lihat pesanan, tanpa akses kas/pengaturan), perlu peran baru + pemeriksaan otorisasi granular.
- [ ] **Pencarian & filter di admin** — daftar pesanan/menu di `/admin/pesanan` dan `/admin/menu` kemungkinan belum punya pencarian/filter/pagination untuk skala data besar.
- [ ] **Multi-cabang / multi-outlet** — skema saat ini eksplisit single-tenant (`Pengaturan` baris tunggal `id: "utama"`). Kalau usaha ingin ekspansi ke banyak cabang, ini perubahan skema besar — diskusikan dulu sebelum implementasi.
- [ ] **Riwayat & notifikasi untuk pelanggan terdaftar** — cek apakah `/riwayat` sudah cukup lengkap (filter, status real-time) untuk pelanggan yang login.

## Kualitas kode & DX

- [ ] **Dokumentasi tipe respons Server Action** — pastikan setiap action di `src/app/aksi/*.ts` konsisten memakai pola `HasilForm`/`HasilPesanan` (kompatibel `useActionState`), dan didokumentasikan di komentar singkat jika bentuknya berbeda antar action.
- [ ] **Cek konsistensi penamaan Indonesia** di kode baru — lihat glosarium di AGENTS.md §6, hindari campur istilah Inggris/Indonesia dalam satu domain.
- [ ] **Skrip seed untuk staging** — pastikan `SEED_DEMO=1 npm run db:seed` cukup representatif untuk demo ke calon pengguna/investor.
- [ ] **Audit aksesibilitas** — README menyebutkan target pengguna adalah pemilik usaha yang mungkin tidak terlalu melek teknologi; validasi kontras warna, ukuran tombol (≥48px sudah jadi prinsip desain), dan navigasi dengan keyboard/screen reader.

## Infrastruktur & operasional

- [ ] **Pilih platform hosting & tulis panduan deploy konkret** (mis. VPS + PM2, Railway, Fly.io, dst.) — README baru menjelaskan kebutuhan generik ("server Node yang hidup"), belum ada langkah spesifik per platform.
- [ ] **Monitoring & logging produksi** — belum ada strategi (mis. Sentry untuk error, atau logging terstruktur untuk Server Actions yang gagal).
- [ ] **Dockerfile untuk aplikasi aktif** (folder `legacy/` punya `docker-compose.yml` lama, tapi aplikasi Next.js aktif belum punya containerization).

## Selesai

*(pindahkan item dari atas ke sini begitu selesai, sertakan tanggal singkat)*

- [x] Dokumentasi awal proyek dibuat: CLAUDE.md, AGENTS.md, ARCHITECTURE.md, TASKS.md, CONTRIBUTING.md (2026-09-13).
