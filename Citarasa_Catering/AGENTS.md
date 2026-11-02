<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

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
| Test runner | Node test runner + `tsx`: `npm test` (unit), `npm run test:integrasi` (butuh PostgreSQL) |
| Package manager | npm (`package-lock.json`) |

Jangan usulkan/menambahkan library yang menduplikasi hal di atas (mis. NextAuth, Redux, styled-components) tanpa diminta eksplisit oleh user — arsitektur ini sengaja diminimalkan.

## 3. Peta direktori

```
src/app/
  (toko)/        halaman publik pembeli (home, /menu, /keranjang, /pesan = checkout, /pesanan/[kode], /lacak, /riwayat, /akun, /masuk, /daftar)
  admin/         dashboard pemilik, dijaga terpusat di admin/layout.tsx
                 (/admin = beranda ringkasan, /admin/papan = kanban, /admin/produksi = rekap masak)
  aksi/          SEMUA Server Actions ("use server"): auth.ts, pesanan.ts, menu.ts, kas.ts, pengaturan.ts
src/components/
  toko/          komponen khusus halaman publik
  admin/         komponen khusus dashboard admin
  (root)         komponen bersama: Wordmark, Lencana, FormMasuk, TombolKeluar
src/proxy.ts         Proxy Next.js 16 (dulu bernama middleware.ts — `middleware` sudah DEPRECATED di v16).
                     Hanya menyetel header `x-lokasi-halaman`; jangan menyentuh database dari sini.
src/lib/
  db.ts              Prisma client singleton (adapter pg, di-cache di globalThis saat dev)
  auth.ts            sesi & password (scrypt, jose)
  analitik.ts        statistik kunjungan (menulis ke DB); analitik-path.ts memuat logika murninya
  situs.ts           satu-satunya sumber alamat publik situs (metadataBase, sitemap, robots)
  foto-menu.ts       konstanta & tipe galeri foto (TIDAK boleh ditaruh di berkas "use server")
  akses-pesanan.ts   cookie "pesanan_saya" (guest tracking, maks 25 kode, 180 hari) + klaim pesanan tamu ke akun
  kepemilikan.ts     aturan murni: pesanan milik akun siapa, tujuan redirect ?ke= yang aman
  keranjang.ts       keranjang belanja di localStorage (KLIEN saja; tidak pernah dipercaya server)
  pesan-wa.ts        templat WhatsApp dapur → pembeli per status pesanan
  denyut.ts          angka ringkas dashboard (pesanan baru, cek bayar) untuk notifikasi
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
5. **Kode pesanan bukan kunci akses.** Untuk melihat detail pesanan, pengunjung harus: memesan/melacak dari device itu (cookie `pesanan_saya` bertanda tangan — halaman lacak mewajibkan kode + nomor HP cocok), ATAU login sebagai akun yang **memiliki** pesanan itu (`Pesanan.penggunaId`), ATAU login sebagai dapur. **Jangan pernah memberi akses karena `sesi.telepon === pesanan.teleponPemesan`**: nomor HP saat mendaftar tidak diverifikasi (belum ada OTP), jadi siapa pun bisa mendaftar dengan nomor orang lain. Pesanan tamu baru tersambung ke akun lewat `klaimPesananTamu()` (cookie perangkat + nomor sama). Pakai helper di `src/lib/kepemilikan.ts`.
   Sesi **semua peran** (termasuk pelanggan) dicocokkan ke `Pengguna.sesiSejak`
   di `bacaSesi()`, dibandingkan per detik (`tokenMasihBerlaku`) karena `iat`
   JWT bersatuan detik — jangan ubah jadi pembandingan milidetik.
6. **Nomor telepon adalah identitas login**, bukan email (email di `Pengguna` opsional).
7. **Menu yang pernah dipesan tidak boleh dihapus**, hanya di-nonaktifkan (`Menu.aktif = false`), supaya riwayat pesanan tidak korup (relasi `ItemPesanan.menuId` — `onDelete: SetNull`, jangan diubah jadi cascade delete).
8. **Statistik tidak boleh bisa dibongkar menjadi identitas.** Alamat IP tidak pernah disimpan; pengunjung unik dihitung dari SHA-256 atas (IP + user agent + garam harian acak). Garam hari berjalan disimpan di tabel `GaramHarian` (supaya semua instans serverless memakai garam yang sama) dan baris hari sebelumnya **dihapus** begitu hari berganti — jangan pernah menyimpan garam lama atau menurunkannya dari rahasia tetap. Tabel `BatasLaju` hanya menyimpan HMAC kunci, bukan IP/nomor mentah. Semua tabel analitik menyimpan angka teragregasi per hari, bukan baris per kunjungan, dan `rapikanPath()` menyamarkan kode pesanan sebelum disimpan. Jangan menambahkan penyimpanan IP mentah, cookie pelacak, atau layanan analitik pihak ketiga — begitu salah satunya masuk, situs ini wajib memasang banner persetujuan cookie dan janji di halaman kebijakan privasi jadi tidak benar.

## 5. Alur kerja umum

- **Perubahan skema DB**: edit `prisma/schema.prisma` → `npm run db:migrate` (dev, buat migrasi baru) atau `npm run db:deploy` (apply migrasi existing, dipakai di produksi). Jangan edit file di `prisma/migrations/*/migration.sql` yang sudah ter-apply secara manual.
- **Tambah Server Action baru**: taruh di `src/app/aksi/<domain>.ts` dengan `"use server"` di atas file, validasi input dengan Zod, panggil `revalidatePath` pada path yang datanya berubah.
- **Setelah mengubah skema atau kode**, jalankan minimal:
  ```
  npm run typecheck
  npm run build
  ```
  ditambah `npm run lint` dan `npm test`. CI (`.github/workflows/ci.yml` di **root repo** `rasvara-/`, bukan di folder ini — GitHub hanya membaca workflow di root) menjalankan semuanya plus tes integrasi pada postgres:17.
- **Jangan commit** `src/generated/prisma/`, berkas `.env*` (kecuali `*.example`), atau isi `data/` (sudah di `.gitignore`).
- Repo git ada di root `rasvara-/` (aplikasi ini di subfolder `Citarasa_Catering/`, yang juga jadi Root Directory di Vercel). Kerja lewat branch + PR ke `main`; `main` otomatis dideploy ke produksi.
- Migrasi baru yang membuat tabel: RLS sudah otomatis tertutup bagi `anon` (default privileges), tetapi tetap tambahkan `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` dan cek Supabase Advisors.
- Produksi (Vercel) terhubung sebagai peran `rasvara_app` (DML saja, `BYPASSRLS`). Migrasi WAJIB dijalankan sebagai `postgres` lewat `DIRECT_URL` — hanya dengan begitu `ALTER DEFAULT PRIVILEGES FOR ROLE postgres` memberi `rasvara_app` akses ke tabel baru. Jangan memberi `rasvara_app` hak DDL.

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
- Berkas unggahan disimpan di Supabase Storage (bucket privat `menu` & `bukti-transfer`, bila `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` terisi — wajib di Vercel) atau di `DIREKTORI_UNGGAHAN` (bawaan `data/unggahan`, untuk lokal/VPS), **tidak pernah di `public/`**, dan hanya dilayani lewat `src/app/unggahan/[nama]/route.ts` yang memeriksa wewenang: foto menu terbuka untuk umum, bukti transfer hanya untuk dapur dan pemilik pesanannya. Jangan memindahkan berkas unggahan kembali ke `public/` — apa pun di sana dilayani kepada siapa saja yang tahu URL-nya, tanpa pemeriksaan. Jika menambah fitur upload, validasi tipe/ukuran file di server.
- Middleware/guard akses admin ada terpusat di `src/app/admin/layout.tsx` — jangan buat halaman admin baru yang melewati layout ini. Route handler di `src/app/api/admin/**` TIDAK terlindungi layout — periksa sesi sendiri (lihat `api/admin/denyut`).
- Jangan mengoper objek `Pengguna` utuh ke komponen klien: ia memuat `sandiHash`. Selalu `select` bidang yang dibutuhkan.
- Parameter `?ke=` (tujuan setelah login) wajib lewat `tujuanAman()` — mencegah open redirect ke situs tiruan.
- Staf dapur tidak boleh melihat angka uang: templat WA untuk staf dibuat dengan `{ tanpaNominal: true }`.

## 8. Yang TIDAK ada saat ini (jangan berasumsi)

- Tidak ada `tailwind.config.*` (memang sengaja, Tailwind v4 CSS-first).
- Belum ada payment gateway — lihat TASKS.md.
- Tidak ada dark mode.
- `legacy/` bukan bagian dari aplikasi aktif — jangan impor apa pun dari sana ke `src/`.

## 8b. Design system (wajib diikuti saat menambah UI)

- **Identitas merek (v3, 2026-11-02): sehat · matang · lezat · cepat & tepat.**
  Tiap janji = satu keputusan visual, alasannya tertulis di kepala `globals.css`:
  - `pandan` (hijau, merek & aksi utama) = sehat/segar; `kunyit` (emas, aksen)
    = matang (warna kerak Maillard); `cabai` (merah-oranye, HEMAT: terlaris,
    sedang dimasak, lencana keranjang) = selera; `beras` (permukaan) & `arang`
    (teks) netral. Token lama `krem/bata/kayu/daun` sudah TIDAK ADA.
  - Presisi: jam, kode pesanan, & nominal penting memakai `.font-presisi`
    (JetBrains Mono); label kecil kapital `.label-atas`; ornamen `.garis-ukur`,
    `.cap-presisi`, `.tiket-atas`/`.tiket-bawah`. Judul `.font-tampil`
    (Bricolage Grotesque), teks Plus Jakarta Sans. Sudut 10–14px, bukan 24px.
  - Logo = `<TandaMerek>` (piring + daun emas = jarum jam), dipakai juga oleh
    favicon/ikon/OG. `<Wordmark nama={pengaturan.namaUsaha}>` — jangan
    hardcode nama usaha.
- Token warna & kelas komponen ada di `src/app/globals.css`: `tombol-utama`,
  `tombol-kedua`, `tombol-emas`, `tombol-hantu`, `kartu`, `isian`, `label`,
  `lencana`, `tabel`, `pil`, `kotak-sukses/galat/peringatan`. Pakai kelas ini,
  jangan menulis ulang deretan utilitas untuk tombol/isian.
- Teks di atas latar `*-lembut` memakai varian `*-tua` (kontras AA). Latar gelap
  merek (`.permukaan-pandan`) hanya untuk "bingkai": pita status dapur, kepala
  beranda, kaki toko, panel merek halaman masuk, sidebar dapur, dan toast —
  jangan dijadikan latar bagian konten biasa. Di atasnya, aksi utama memakai
  `tombol-emas` (pandan di atas pandan tidak terlihat).
- Warna status pesanan bersifat semantik (lib/pesanan.ts): baru = kunyit
  (perlu perhatian), diterima = arang, dimasak = cabai (api), siap = pandan pekat.
- Isian formulir minimal 16px (`.isian` sudah begitu): di bawah itu Safari
  iPhone memperbesar halaman setiap kolom disentuh.
- Ilustrasi = komponen SVG di `src/components/ilustrasi/Ilustrasi.tsx` (bukan
  PNG), dekoratif (`aria-hidden`), memakai palet token. Tambah ilustrasi baru
  di berkas itu.
- Gerak: kelas `anim-*` di `globals.css`; muncul-saat-digulir pakai komponen
  `<Muncul>` (jangan menempel class/atribut ke DOM dari skrip luar — memicu
  hydration mismatch). Semua gerak otomatis mati saat `prefers-reduced-motion`.
- Pola marketplace yang sudah dipakai pembeli (jangan diubah tanpa alasan kuat):
  kolom cari di kepala, bar navigasi bawah 5 tab di ponsel, keranjang dengan
  lencana, tombol "+ Tambah" yang berubah jadi stepper, bar beli/checkout yang
  menempel di bawah layar, tab status di "Pesanan saya".
- Mode "Teks besar" (`html[data-teks="besar"]`) menskalakan semua ukuran rem —
  jangan memakai ukuran px tetap untuk teks utama.
- Jangan pakai `alert()`/`confirm()`: konfirmasi dilakukan di tempat (dua langkah).
- Isian formulir yang bisa ditolak server harus terkendali (atau dikirim lewat
  `onSubmit` + `startTransition`), karena React 19 mengosongkan isian
  tak-terkendali setiap aksi formulir selesai.
- Daftar yang bisa tumbuh (menu, pesanan, kas, riwayat) wajib berpaginasi di
  database (`skip`/`take`) memakai `KomponenPaginasi`.

Yang **sudah** ada (jangan dibangun ulang): test runner bawaan Node + `tsx` (`npm test`),
CI di `.github/workflows/ci.yml` (root repo), `eslint.config.mjs` (flat config), Dockerfile,
rate limiting, validasi unggahan berbasis magic bytes, dan pemesanan berbasis
tanggal + jam lengkap dengan lead time preorder, tanggal libur, serta kuota harian per menu.

## 9. Jebakan khusus Next.js 16 yang sudah pernah menggigit

- **Berkas `"use server"` hanya boleh mengekspor fungsi async.** Mengekspor konstanta
  atau tipe dari sana membuat seluruh modul kehilangan ekspornya saat dibundel, dan
  `tsc --noEmit` **tidak** menangkapnya — hanya `npm run build` yang gagal. Taruh
  konstanta/tipe di `src/lib/` (contoh: `foto-menu.ts`).
- **`middleware.ts` sudah deprecated, gantinya `proxy.ts`** dengan fungsi bernama `proxy`.
- Selalu jalankan `npm run build`, bukan sekadar `typecheck`, sebelum menganggap selesai.
