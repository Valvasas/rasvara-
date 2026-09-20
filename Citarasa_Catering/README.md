# Citarasa Catering

Website untuk usaha catering Citarasa: snack box, nasi kotak, tumpeng, dan nasi
goreng. Satu aplikasi berisi dua sisi yang saling terhubung lewat satu database:

- **Halaman pelanggan** — melihat menu, membuat pesanan, dan melacak statusnya.
- **Halaman pemilik** (`/admin`) — menerima pesanan, mengatur alur dapur,
  mencatat uang masuk dan keluar, serta melihat laporan bulanan.

Begitu pemilik memindahkan status pesanan, halaman pelanggan langsung ikut
berubah. Begitu pesanan ditandai lunas, uangnya otomatis masuk ke buku kas.

## Teknologi

| Bagian      | Pilihan                                   |
| ----------- | ----------------------------------------- |
| Kerangka    | Next.js 16 (App Router) + React 19         |
| Bahasa      | TypeScript                                 |
| Tampilan    | Tailwind CSS v4 (token warna di `globals.css`) |
| Database    | PostgreSQL + Prisma 7 (driver adapter `pg`) |
| Login       | Cookie sesi httpOnly bertanda tangan (jose) |
| Sandi       | scrypt bawaan Node, tanpa dependensi tambahan |
| Validasi    | Zod, dijalankan di server                  |

Tidak ada API terpisah. Semua penulisan data lewat Server Actions di
`src/app/aksi/`, sehingga harga dan izin selalu dihitung ulang di server.

## Menjalankan di komputer sendiri

```bash
# 1. Pasang dependensi
npm install

# 2. Siapkan berkas lingkungan
cp .env.example .env
#    Isi DATABASE_URL ke PostgreSQL Anda.
#    Buat SESSION_SECRET acak:
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# 3. Siapkan database
npm run db:deploy     # jalankan migrasi
npm run db:seed       # isi akun pemilik, pengaturan, dan menu awal

# 4. Jalankan
npm run dev
```

Buka `http://localhost:3000` untuk halaman pelanggan dan
`http://localhost:3000/admin` untuk halaman pemilik.

### Akun pemilik hasil seed

| Nomor HP       | Kata sandi    |
| -------------- | ------------- |
| `081234567890` | `citarasa123` |

**Ganti kata sandi ini sebelum website dipakai sungguhan**, lewat
`/admin/pengaturan`. Untuk memakai sandi lain sejak awal, jalankan
`SEED_SANDI_PEMILIK="sandi-anda" npm run db:seed`.

Untuk mencoba tampilan dengan data contoh (3 pesanan dan catatan kas):

```bash
SEED_DEMO=1 npm run db:seed
```

## Perintah yang tersedia

| Perintah             | Kegunaan                                      |
| -------------------- | --------------------------------------------- |
| `npm run dev`        | Jalankan mode pengembangan                    |
| `npm run build`      | Build untuk produksi (termasuk `prisma generate`) |
| `npm start`          | Jalankan hasil build                          |
| `npm run typecheck`  | Periksa tipe TypeScript                       |
| `npm run db:migrate` | Buat migrasi baru setelah mengubah skema      |
| `npm run db:deploy`  | Terapkan migrasi di server produksi           |
| `npm run db:seed`    | Isi data awal                                 |
| `npm run db:studio`  | Buka penjelajah database Prisma               |

## Susunan berkas

```
src/
├── app/
│   ├── (toko)/          Halaman pelanggan (beranda, menu, pesan, lacak, riwayat)
│   ├── admin/           Halaman pemilik, dijaga satu kali di layout.tsx
│   ├── aksi/            Server Actions: auth, pesanan, kas, menu, pengaturan
│   └── globals.css      Token warna, tipografi, dan komponen dasar
├── components/          Komponen tampilan bersama
├── lib/                 Akses database, sesi, format, aturan pesanan, laporan
└── generated/prisma/    Klien Prisma hasil generate (tidak dikomit)

prisma/
├── schema.prisma        Skema database
├── migrations/          Riwayat migrasi
└── seed.ts              Data awal

legacy/                  Kode marketplace multi-vendor lama, diarsipkan
```

## Keputusan penting

Beberapa hal sengaja dibuat begini, jangan diubah tanpa alasan:

- **Harga tidak pernah dipercaya dari browser.** Saat pesanan dibuat, server
  membaca ulang harga dari database. Yang dikirim browser hanya id menu dan
  jumlahnya.
- **Isi pesanan disimpan sebagai salinan.** Nama dan harga menu dibekukan di
  `ItemPesanan`. Kalau harga naik atau menu dihapus, nota lama tetap benar.
- **Satu pesanan hanya boleh melahirkan satu baris kas.** Kolom `pesananId` di
  `CatatanKas` bersifat unik, jadi menekan "Tandai Lunas" dua kali tidak membuat
  pemasukan terhitung dobel.
- **Semua tanggal dihitung menurut WIB.** Server bisa berjalan di zona waktu
  mana pun; `src/lib/format.ts` memaksa perhitungan harian ke `Asia/Jakarta`.
- **Kode pesanan bukan kunci akses.** Untuk membuka rincian pesanan, pengunjung
  harus memesan dari perangkat itu, login sebagai pemiliknya, atau mencocokkan
  nomor HP di halaman lacak.
- **Nomor HP dipakai sebagai identitas login,** bukan email. Pelanggan UMKM
  hafal nomornya, belum tentu punya email aktif.
- **Menu yang pernah dipesan tidak bisa dihapus,** hanya disembunyikan, supaya
  riwayat pesanan tidak rusak.

## Catatan desain

Palet diambil dari isi dapurnya sendiri: kertas nasi (krem), sambal dan gerabah
(bata), kunyit serta lampu warung malam (kunyit), daun pisang (daun), dan meja
kayu (kayu). Tidak ada warna dingin karena menurunkan selera makan.

Ukuran huruf dasar 17px dan semua tombol minimal 48px tingginya, karena website
ini dipakai pemilik berumur 40-an sambil berdiri di dapur pada malam hari.
Navigasi tidak disembunyikan di balik ikon tiga garis.

## Menaruh di server

Aplikasi ini butuh Node.js berjalan, bukan hosting statis, karena semua halaman
dirender di server. Yang perlu disiapkan:

1. PostgreSQL yang bisa diakses aplikasi.
2. Variabel lingkungan `DATABASE_URL`, `SESSION_SECRET`, dan
   `NEXT_PUBLIC_BASE_URL`.
3. Jalankan `npm run db:deploy` setiap kali ada migrasi baru.
4. `npm run build` lalu `npm start`.

`SESSION_SECRET` wajib diganti dengan nilai acak di server produksi. Kalau nilai
ini bocor, orang lain bisa membuat cookie sesi palsu.
