# Checklist Siap Online — Citarasa Catering (Vercel + Supabase)

Dokumen ini daftar kerja yang harus beres **sebelum** website dibuka untuk pembeli
sungguhan. Urutannya sengaja dibuat sebagai alur: kerjakan dari atas ke bawah.

Legenda: 🔴 **Wajib** (tanpa ini data hilang / fitur rusak / tidak aman) ·
🟡 **Sangat disarankan** · 🟢 **Boleh menyusul** · ✅ Sudah beres

---

## 0. Ringkasan Status (per 2026-11-01)

| Area | Status | Catatan |
| --- | --- | --- |
| Aplikasi (Next.js 16 + Prisma + Postgres) | ✅ Siap serverless | Folder `Citarasa_Catering/` satu-satunya yang dideploy |
| Database Supabase `rasvara-` (Tokyo) | ✅ Migrasi, RLS, seed | Lihat bagian 1 |
| Penyimpanan foto & bukti transfer | 🔴 Tinggal 1 kunci | Kode & bucket siap; isi `SUPABASE_SERVICE_ROLE_KEY` (bagian 3) |
| Pembatas laju (rate limit) | ✅ Bersama di Postgres | Tabel `BatasLaju`, berlaku lintas instans serverless |
| Proyek Vercel `rasvara` | ✅ Dikonfigurasi | Root directory, region `hnd1`, proteksi preview (bagian 5) |
| `DATABASE_URL` di Vercel | ✅ Terhubung | Peran `rasvara_app` lewat pooler transaksi `aws-0-ap-northeast-1`; diverifikasi di preview (`/api/health`, `/menu`, detail menu) |
| Isi profil usaha (WA, alamat, rekening) | 🔴 Dilakukan pemilik | Bagian 6 |
| Backup | 🔴 Putuskan | Paket gratis Supabase **tidak** punya backup otomatis (bagian 9) |

Periksa kapan saja: buka `https://<domain>/api/health`. Hasil `"status": "ok"` berarti
database terhubung, rahasia sesi sah, dan penyimpanan foto bisa dipakai. Endpoint ini
hanya menampilkan label status, tidak pernah nilai rahasia.

> `backend/`, `public/`, dan `firebase.json` di root repo adalah versi lama (legacy).
> Jangan ikut dideploy.

---

## 1. Database (Supabase) ✅

Sudah dikerjakan di proyek `rasvara-` (ref `ldqzazvhvlmbgvnigqcb`, region Tokyo):

- Semua 9 migrasi Prisma ter-apply dan tercatat di `_prisma_migrations` dengan checksum
  yang sama persis dengan berkasnya (jadi `npm run db:deploy` berikutnya hanya menjalankan
  migrasi baru). Skema diverifikasi identik dengan hasil migrasi asli (sidik md5 atas
  222 kolom/indeks/constraint/enum).
- Satu sisa yang disengaja: kolom lama `Menu.fotoUrl` (kosong, nullable, tidak dipakai
  aplikasi) belum dihapus: pemilik sudah setuju, tetapi popup konfirmasi Supabase tidak sampai
  ke aplikasinya, jadi jalankan sendiri di dashboard.
  Aman dihapus kapan saja lewat *SQL Editor*: `ALTER TABLE "Menu" DROP COLUMN "fotoUrl";`
- **RLS aktif di semua tabel** tanpa policy, dan hak `anon`/`authenticated` dicabut —
  termasuk untuk tabel yang dibuat migrasi mendatang (`ALTER DEFAULT PRIVILEGES`).
  Aplikasi tidak memakai Data API Supabase; ia terhubung sebagai pemilik tabel.
- Akun pemilik, pengaturan awal, dan 13 menu contoh sudah diisi.

**Peran database aplikasi.** Vercel terhubung sebagai `rasvara_app`, bukan `postgres`:
hanya `SELECT/INSERT/UPDATE/DELETE` di tabel aplikasi; tidak bisa DDL, `TRUNCATE`,
membaca `_prisma_migrations`, maupun skema `auth`/`storage`. Ia punya `BYPASSRLS`
karena tabel sengaja ditutup RLS tanpa policy (Data API terkunci). Tabel dari migrasi
mendatang otomatis bisa diakses lewat `ALTER DEFAULT PRIVILEGES FOR ROLE postgres` —
**syaratnya migrasi dijalankan sebagai `postgres`** (lihat di bawah). Ganti sandinya:
SQL Editor → `ALTER ROLE rasvara_app PASSWORD '<baru>';` lalu perbarui `DATABASE_URL`.

Menjalankan migrasi baru di masa depan (dari laptop, **bukan** dari Vercel, dan
**bukan** memakai `DATABASE_URL` aplikasi — `rasvara_app` sengaja tidak bisa DDL):

```bash
cd Citarasa_Catering
npm ci
# Session pooler (port 5432) atau direct connection — migrasi butuh sesi utuh.
export DIRECT_URL="<connection string session/direct>"
npm run db:deploy
```

`prisma.config.ts` memakai `DIRECT_URL` bila ada, lalu jatuh ke `DATABASE_URL`.
Setelah migrasi yang membuat tabel baru, cek *Advisors → Security* di dashboard.

## 2. Environment Variable di Vercel

*Project → Settings → Environment Variables*. Yang dibutuhkan aplikasi:

| Variabel | Isi | Status |
| --- | --- | --- |
| `DATABASE_URL` | **Transaction pooler** Supabase (port 6543) dengan peran khusus aplikasi `rasvara_app.ldqzazvhvlmbgvnigqcb` (dibuat 2026-11-01) | ✅ |
| `SESSION_SECRET` | Acak ≥ 32 karakter (sudah dibuat baru 2026-11-01) | ✅ |
| `NEXT_PUBLIC_BASE_URL` | `https://rasvara-valvasas-projects.vercel.app` (ganti saat pakai domain sendiri) | ✅ |
| `PROXY_TEPERCAYA` | `1` — Vercel menimpa `X-Forwarded-For`, jadi tidak bisa dipalsukan | ✅ |
| `SUPABASE_URL` | `https://ldqzazvhvlmbgvnigqcb.supabase.co` | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Kunci **secret** Supabase (bagian 3) | 🔴 Isi |
| `DB_SSL_CA` | Opsional: isi sertifikat CA Supabase (PEM) agar TLS memverifikasi server | 🟢 |

Cara memeriksa isian `DATABASE_URL` tanpa membukanya: `/api/health` →
`konfigurasi.koneksiDatabase` harus **`supabase-pooler-transaksi`**.
- `rusak` = bukan URL yang sah. Paling sering: karakter khusus di sandi (`# ? / @ % :`)
  belum di-encode (`#` → `%23`). Kutip & spasi di awal/akhir sudah dibuang otomatis.
- `supabase-langsung` = masih koneksi langsung (IPv6) — ganti ke pooler transaksi.
- `supabase-pooler-sesi` = port 5432 — ganti ke **6543**.

Bila labelnya sudah `supabase-pooler-transaksi` tetapi `database.status` masih
`terputus`, cek log Vercel. `password authentication failed` = **sandi salah**: templat
Supabase menampilkan `[YOUR-PASSWORD]` — ganti seluruhnya **termasuk kurung siku**.
Lupa sandi? Supabase → *Project Settings → Database → Reset database password*, lalu
tempel ulang (aplikasi tidak memakai sandi ini di tempat lain).

Kenapa **wajib pooler**: koneksi langsung Supabase (`db.<ref>.supabase.co:5432`) hanya
IPv6, sedangkan fungsi Vercel keluar lewat IPv4 — hasilnya database "terputus". Pooler
transaksi juga mencegah ratusan instans serverless menghabiskan jatah koneksi. Aplikasi
otomatis memakai pool kecil (5) di Vercel; `?pgbouncer=true` tidak diperlukan.

Aturan:
- **Jangan setel `NODE_ENV` manual.** Vercel menyetelnya sendiri; nilai manual saat
  install membuat devDependencies (Tailwind, Prisma CLI, TypeScript) tidak terpasang.
  `vercel.json` sudah memakai `npm ci --include=dev` sebagai pengaman.
- Jangan pernah commit `.env`. Rahasia hanya di dashboard Vercel.
- Jangan pakai awalan `NEXT_PUBLIC_` untuk rahasia: nilainya terkirim ke browser.
- `SESSION_SECRET` diganti = semua orang ter-logout.
- Variabel sisa yang **tidak dibaca** aplikasi dan aman dihapus: `NODE_ENV`,
  `PROXY_TERPERCAYA` (salah ketik), `DIREKTORI_UNGGAH` (salah ketik, tidak berlaku di
  Vercel), `SEED_DEMO` (sudah diganti `SEED_DATA_UJI`).

## 3. Penyimpanan Foto & Bukti Transfer 🔴 (tinggal satu langkah)

Kode sudah memakai **Supabase Storage** (`src/lib/unggah.ts`), dan dua bucket sudah
dibuat — keduanya **privat**, maks 4 MB, hanya JPEG/PNG/WebP:

- `menu` — foto katalog. Tetap dilayani lewat `/unggahan/[nama]` dengan cache satu tahun.
- `bukti-transfer` — memuat nama, rekening, nominal. Hanya dapur dan pemilik pesanannya.

Browser tidak pernah menyentuh Supabase langsung; kunci rahasia tidak pernah keluar
dari server. Foto dikecilkan di perangkat pembeli sebelum diunggah (batas body
fungsi Vercel 4,5 MB).

**Yang harus dilakukan pemilik:**
1. Supabase → *Project Settings → API Keys* → salin kunci **secret** (`sb_secret_…`)
   atau `service_role` lama.
2. Vercel → tambah env `SUPABASE_SERVICE_ROLE_KEY`, tipe **Sensitive**, target
   Production (+ Preview bila ingin menguji unggahan di preview).
3. *Redeploy*, lalu buka `/api/health` → `konfigurasi.penyimpanan` harus `"supabase"`.
   - `"belum-disiapkan"` = kunci belum terbaca · `"kunci-ditolak"` = salah tempel kunci
     (paling sering: yang tertempel kunci *publishable*/anon, bukan *secret*) ·
     `"bucket-publik"` = bucket bukti transfer dibuat publik — **segera jadikan privat**.

Tanpa kunci itu, unggahan ditolak dengan pesan jelas (bukan pura-pura berhasil lalu
berkasnya hilang).

## 4. Pembatas Laju (Rate Limit) ✅

Hitungan percobaan login/daftar/lacak/pesan disimpan di tabel `BatasLaju` (atomik,
`INSERT … ON CONFLICT`), jadi berlaku sama di semua instans serverless. Kunci disimpan
sebagai HMAC — tidak ada IP atau nomor HP mentah. Bila database sesaat tidak bisa
dihubungi, pembatas jatuh ke memori instans alih-alih membuka pintu.

Formulir pesanan juga dilindungi honeypot + token waktu bertanda tangan (tanpa CAPTCHA,
yang menyulitkan pembeli lanjut usia).

## 5. Deploy di Vercel ✅ (dikonfigurasi 2026-11-01)

- **Root Directory = `Citarasa_Catering`** — sebelumnya masih nama folder lama
  `Citarasa Catering` (berspasi), itu sebabnya semua deployment sejak folder diganti
  nama berstatus merah.
- Framework Next.js, region fungsi **`hnd1` (Tokyo)** supaya dekat database.
- Proteksi: **Standard** — URL preview dan URL deployment ber-hash wajib login Vercel;
  domain produksi terbuka untuk publik.
- Build bawaan (`npm run build`) menjalankan `prisma generate`. Migrasi **tidak**
  dijalankan saat build (disengaja: build preview tidak boleh mengubah database produksi).

Catatan: env yang ditandai Production + Preview berarti **preview memakai database
produksi**. Itu wajar untuk usaha kecil selama preview terlindungi login (sudah), tapi
jangan uji "hapus data" di preview.

Domain sendiri: *Settings → Domains* (HTTPS otomatis), lalu ganti `NEXT_PUBLIC_BASE_URL`
ke domain final dan redeploy.

## 6. Onboarding Pemilik 🔴

Login di `/masuk` dengan nomor pemilik dan sandi sementara, lalu:

- [ ] **Ganti sandi sementara** (`/admin/pengaturan` → bagian Ganti sandi) — paling pertama
- [ ] `/admin/pengaturan`: **nomor WhatsApp** aktif, **alamat usaha**, jam buka/tutup,
      ongkos kirim, minimum order antar, **jeda minimum pesanan hari-H**
- [ ] **Rekening bank** (nama bank, nomor, atas nama). Selama kosong, pembeli hanya bisa
      bayar tunai — disengaja supaya tidak ada rekening palsu
- [ ] **Menu**: sesuaikan 13 menu contoh (harga, foto, kapasitas harian), nonaktifkan yang
      tidak dijual
- [ ] **Tanggal tutup** (libur) bila ada
- [ ] Akun **staf dapur** bila perlu (sandi kuat)
- [ ] Tinjau **Syarat & Ketentuan** dan **Kebijakan Privasi** agar sesuai aturan usaha
      (pembatalan, DP, jam operasional)

## 7. Uji Sebelum Dibuka ke Publik 🔴

Di URL produksi, dengan data sungguhan yang kecil:

- [ ] `/api/health` → `"status": "ok"`
- [ ] Daftar akun pembeli → login → logout
- [ ] Buat pesanan **tunai** dan **transfer** sampai selesai
- [ ] Unggah bukti transfer dari HP → pemilik bisa melihat, pembeli lain tidak
- [ ] Pemilik memproses status sampai selesai → muncul di buku kas
- [ ] Lacak pesanan sebagai tamu (`/lacak`) memakai kode + nomor HP
- [ ] Voucher: buat, pakai, coba kode salah, dan (bila dipakai) "sekali per nomor HP"
- [ ] Buka dari HP Android & iPhone; coba mode **Teks besar**
- [ ] `/robots.txt`, `/sitemap.xml`, dan pratinjau saat link dibagikan ke WhatsApp
- [ ] Hapus pesanan uji (batalkan) agar laporan omzet bersih

## 8. Keamanan Minimum

- [x] `SESSION_SECRET` unik dan kuat
- [ ] Sandi sementara pemilik **sudah diganti**
- [x] `SEED_DATA_UJI` tidak pernah `1` di produksi (seed menolaknya)
- [x] RLS aktif + hak `anon` dicabut di semua tabel Supabase
- [x] Bucket `bukti-transfer` privat (dipantau `/api/health`)
- [ ] 2FA aktif di akun GitHub, Vercel, dan Supabase
- [ ] Kunci secret Supabase hanya ada di Vercel (tidak di chat, repo, atau tangkapan layar)

## 9. Operasional Setelah Online 🟡

- [ ] **Backup** — paket gratis Supabase tidak punya backup harian. Pilih: paket Pro
      (backup harian), atau jadwalkan `npm run db:backup` dari laptop/server lain
      dengan `DATABASE_URL` produksi. Foto di Storage tidak ikut backup database.
      Uji restore minimal sekali.
- [ ] Proyek Supabase gratis **dijeda otomatis bila lama tidak aktif** — pasang monitor
      uptime (UptimeRobot/BetterStack) ke `/api/health` tiap 5 menit supaya langsung
      ketahuan bila situs/database mati, dan cek email dari Supabase.
- [ ] Pantau error: Vercel → *Logs*, cari `"tingkat":"galat"`. Tiap galat server tercatat
      satu baris JSON (tanpa header/cookie; kode pesanan disamarkan); `digest`-nya sama
      dengan "Kode galat" yang dilihat pembeli.
- [ ] **Paket Vercel Hobby hanya untuk penggunaan non-komersial.** Toko yang menerima
      pembayaran wajib paket Pro sesuai ketentuan Vercel.
- [ ] Jadwalkan `npm audit --omit=dev` tiap bulan.

## 10. Boleh Menyusul 🟢

- Verifikasi nomor HP (OTP WhatsApp) + lupa sandi mandiri
- Payment gateway (Midtrans/Xendit) menggantikan transfer manual
- Notifikasi WhatsApp otomatis (WhatsApp Cloud API)
- Sentry/APM untuk galat sisi klien
- Domain email resmi untuk kontak di Kebijakan Privasi

---

## Rujukan

- `DEPLOYMENT.md` — opsi deploy lain (VPS/Docker) dan strategi backup
- `PRODUCTION_CHECKLIST.md` — checklist produksi umum (jalur VPS)
- `docs/PANDUAN_OPERASIONAL.md` — panduan harian untuk pemilik
- `.env.production.example` — templat env
