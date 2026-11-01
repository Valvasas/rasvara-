# Checklist Siap Online — Citarasa Catering (Vercel + Supabase)

Dokumen ini daftar kerja yang harus beres **sebelum** website dibuka untuk UMKM dan
pembeli sungguhan. Urutannya sengaja dibuat sebagai alur: kerjakan dari atas ke bawah.

Legenda: 🔴 **Wajib** (tanpa ini data hilang / fitur rusak / tidak aman) ·
🟡 **Sangat disarankan** · 🟢 **Boleh menyusul**

---

## 0. Ringkasan Status

| Area | Status | Catatan |
| --- | --- | --- |
| Aplikasi (Next.js 16 + Prisma + Postgres) | ✅ Siap | Folder `Citarasa_Catering/` adalah satu-satunya aplikasi yang dideploy |
| Database (Supabase Postgres) | 🔴 Perlu disiapkan | Buat project, jalankan migrasi |
| Penyimpanan foto menu & bukti transfer | 🔴 **Belum siap untuk Vercel** | Masih tulis ke disk lokal, lihat bagian 3 |
| Pembatas laju login (rate limit) | 🟡 Lemah di serverless | Masih in-memory, lihat bagian 4 |
| Teks "demo/contoh" di tampilan | ✅ Bersih | Data uji hanya jalan lewat `SEED_DATA_UJI=1` dan ditolak di produksi |
| Isi profil usaha (WA, alamat, rekening) | 🔴 Dilakukan pemilik | Lihat bagian 6 |

> `backend/`, `public/`, dan `firebase.json` di root repo adalah versi lama (legacy).
> Jangan ikut dideploy.

---

## 1. Siapkan Database (Supabase) 🔴

1. Buat project di https://supabase.com. Pilih region terdekat pengguna (Singapore).
2. Simpan **database password** di password manager. Jangan di chat atau di repo.
3. Ambil connection string di *Project Settings → Database → Connection string*:
   - **Pooler (Transaction mode, port 6543)** untuk `DATABASE_URL` di Vercel.
     Vercel itu serverless: tiap request bisa membuka koneksi baru, jadi wajib lewat
     pooler supaya database tidak kehabisan koneksi. Tambahkan `?pgbouncer=true`
     bila diperlukan.
   - **Direct / Session (port 5432)** untuk menjalankan migrasi dari laptop.
4. Atur `DB_POOL_MAX` kecil di Vercel (mis. `5`). Default `20` terlalu besar untuk
   serverless dan cepat menghabiskan jatah koneksi.
5. Aktifkan backup: paket gratis Supabase **tidak** punya backup harian otomatis.
   Untuk data pesanan & buku kas UMKM, pakai paket Pro (daily backup) atau jadwalkan
   `pg_dump` sendiri. Jangan online tanpa backup.
6. Jalankan migrasi dan seed **dari laptop**, bukan dari Vercel:
   ```bash
   cd Citarasa_Catering
   npm ci
   export DATABASE_URL="<connection string direct>"
   npm run db:deploy
   NODE_ENV=production \
   SEED_TELEPON_PEMILIK="62812xxxxxxxx" \
   SEED_SANDI_PEMILIK="<sandi kuat, min 12 karakter>" \
   SEED_NAMA_PEMILIK="<nama pemilik>" \
   SEED_DATA_UJI="0" \
   npm run db:seed
   ```
7. Aktifkan **Row Level Security** pada semua tabel di Supabase. Aplikasi ini mengakses
   database lewat Prisma (koneksi server), bukan lewat API publik Supabase, jadi RLS
   tanpa policy artinya tabel tertutup bagi `anon key`. Itu yang diinginkan. Cek
   lewat *Advisors → Security* di dashboard.

## 2. Environment Variable di Vercel 🔴

Di Vercel: *Project → Settings → Environment Variables* (scope **Production**).

| Variabel | Isi |
| --- | --- |
| `DATABASE_URL` | Connection string **pooler** Supabase |
| `SESSION_SECRET` | String acak ≥ 32 karakter: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `NEXT_PUBLIC_BASE_URL` | URL publik final, mis. `https://namadomain.com` (tanpa `/` di akhir) |
| `NODE_ENV` | `production` |
| `PROXY_TEPERCAYA` | `1` (Vercel menaruh satu proxy di depan aplikasi) |
| `DB_POOL_MAX` | `5` |
| `SEED_DATA_UJI` | `0` (atau jangan diisi) |

Aturan:
- Jangan pernah commit file `.env`. Rahasia hanya di dashboard Vercel.
- Jangan pakai awalan `NEXT_PUBLIC_` untuk rahasia apa pun. Awalan itu membuat nilainya
  terkirim ke browser.
- `SESSION_SECRET` diganti = semua orang ter-logout. Simpan baik-baik.

## 3. Penyimpanan Foto & Bukti Transfer 🔴 (Pemblokir Utama)

**Masalah:** `src/lib/unggah.ts` menulis berkas ke disk (`fs.writeFile`). Di Vercel disk
bersifat sementara dan read-only, jadi upload foto menu dan bukti transfer akan gagal
atau hilang.

**Yang harus dikerjakan:**
- [ ] Buat bucket di **Supabase Storage**:
  - `menu` → **public** (foto katalog, aman dilihat siapa saja)
  - `bukti-transfer` → **private** (memuat nama, nomor rekening, nominal)
- [ ] Ganti penyimpanan di `src/lib/unggah.ts` ke Supabase Storage (pakai
      `SUPABASE_SERVICE_ROLE_KEY` hanya di sisi server).
- [ ] Route `src/app/unggahan/[nama]/route.ts` tetap jadi gerbang: cek hak akses
      (pemilik/staf, atau pembeli pemilik pesanan), lalu ambil dari bucket private
      dan kirim ke pengguna, atau buat *signed URL* berumur pendek.
- [ ] Tambahkan env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (rahasia, tanpa
      `NEXT_PUBLIC_`).
- [ ] Pertahankan validasi yang sudah ada (tipe berkas, ukuran maksimum).
- [ ] Uji: unggah foto menu, unggah bukti transfer, buka bukti sebagai pemilik, dan
      pastikan pembeli lain mendapat 404.

Peringatan: bucket bukti transfer **tidak boleh** public.

## 4. Pembatas Laju (Rate Limit) 🟡

`src/lib/pembatas-laju.ts` menyimpan hitungan percobaan login di memori proses. Di
Vercel tiap request bisa jatuh ke instance berbeda, jadi batasnya mudah dilewati.

- [ ] Pindahkan penyimpanan hitungan ke penyimpanan bersama (Upstash Redis lewat
      Vercel Marketplace) atau tabel Postgres.
- [ ] Selama belum dipindah: aktifkan **Vercel Firewall / rate limiting** untuk path
      `/masuk`, `/daftar`, dan `/lacak`.

## 5. Deploy di Vercel 🔴

1. *Add New → Project* → import repo GitHub.
2. **Root Directory = `Citarasa_Catering`**.
3. Framework Preset: Next.js. Build command bawaan (`npm run build`) sudah menjalankan
   `prisma generate`.
4. Isi env (bagian 2), lalu **Deploy**.
5. Setelah build hijau, buka URL preview dan jalankan checklist bagian 7.
6. Sambungkan domain sendiri (*Settings → Domains*). HTTPS otomatis.
   Perbarui `NEXT_PUBLIC_BASE_URL` ke domain final lalu redeploy.

## 6. Onboarding Pemilik UMKM 🔴

Setelah deploy, pemilik login di `/masuk` lalu buka `/admin/pengaturan` dan melengkapi:

- [ ] **Nomor WhatsApp** aktif (dipakai pembeli untuk konfirmasi)
- [ ] **Alamat usaha**
- [ ] **Jam buka & tutup**, ongkos kirim, minimum order antar
- [ ] **Rekening bank** (nama bank, nomor, atas nama). Selama kosong, pembeli hanya
      bisa bayar tunai. Itu memang disengaja supaya tidak ada rekening palsu.
- [ ] **Ganti sandi awal** di pengaturan
- [ ] **Menu**: hapus/ubah menu bawaan seed, isi harga, foto, dan kapasitas harian
- [ ] **Tanggal tutup** (libur) bila ada
- [ ] Buat akun **staf dapur** bila perlu (sandi kuat, bukan bawaan)
- [ ] Tinjau halaman **Syarat & Ketentuan** dan **Kebijakan Privasi**. Pastikan sesuai
      aturan usaha sebenarnya (kebijakan pembatalan, DP, jam operasional).

## 7. Uji Sebelum Dibuka ke Publik 🔴

Lakukan di URL produksi/preview, dengan data sungguhan yang kecil:

- [ ] Daftar akun pembeli → login → logout
- [ ] Buat pesanan **tunai** dan pesanan **transfer** sampai selesai
- [ ] Unggah bukti transfer → pemilik bisa melihat, pembeli lain tidak
- [ ] Pemilik memproses status pesanan sampai selesai → muncul di buku kas
- [ ] Lacak pesanan sebagai tamu (`/lacak`) memakai kode + nomor HP
- [ ] Voucher: buat, pakai, dan coba kode salah
- [ ] Buka dari HP (Android & iPhone), cek tombol dan teks terbaca
- [ ] Cek `/robots.txt`, `/sitemap.xml`, dan tampilan saat link dibagikan ke WhatsApp
- [ ] Jalankan pemeriksaan otomatis dari laptop:
      `node scripts/verify-production.mjs` (dengan env produksi terisi)
- [ ] `npm run typecheck && npm test` hijau

## 8. Keamanan Minimum 🔴

- [ ] `SESSION_SECRET` unik dan kuat; sandi pemilik ≥ 12 karakter
- [ ] Tidak ada sandi bawaan seed yang masih aktif di database produksi
- [ ] `SEED_DATA_UJI` tidak pernah `1` di produksi (seed menolaknya)
- [ ] `.env*` ada di `.gitignore`; periksa riwayat git tidak memuat rahasia
- [ ] RLS aktif di semua tabel Supabase (bagian 1.7)
- [ ] 2FA aktif di akun GitHub, Vercel, dan Supabase
- [ ] Bucket `bukti-transfer` private

## 9. Operasional Setelah Online 🟡

- [ ] Backup database terjadwal + **uji restore** minimal sekali
- [ ] Pantau error: Vercel Logs / Observability; pasang notifikasi deploy gagal
- [ ] Tetapkan siapa yang membalas pesanan masuk dan berapa lama batas waktunya
- [ ] Catat prosedur ganti sandi pemilik bila lupa (lewat seed/skrip admin)
- [ ] Jadwalkan cek dependensi: `npm audit --omit=dev` tiap bulan

## 10. Boleh Menyusul 🟢

- Notifikasi WhatsApp/email otomatis
- Payment gateway (Midtrans/Xendit) menggantikan transfer manual
- Analitik penjualan yang lebih lengkap
- Domain email resmi untuk kontak di Kebijakan Privasi

---

## Rujukan

- `DEPLOYMENT.md` — opsi deploy VPS/Docker/PaaS dan strategi backup
- `PRODUCTION_CHECKLIST.md` — checklist produksi umum
- `docs/PANDUAN_OPERASIONAL.md` — panduan harian untuk pemilik
- `.env.production.example` — templat env produksi
