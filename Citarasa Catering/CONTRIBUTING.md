# Panduan Kontribusi

Alur kerja sehari-hari untuk mengembangkan Citarasa Catering. Untuk arsitektur lihat [ARCHITECTURE.md](ARCHITECTURE.md), untuk aturan khusus AI agent lihat [AGENTS.md](AGENTS.md), untuk daftar pekerjaan lihat [TASKS.md](TASKS.md).

## Setup awal

```bash
npm install
cp .env.example .env
# isi DATABASE_URL, dan generate SESSION_SECRET acak:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm run db:deploy
npm run db:seed
npm run dev
```

Toko: `http://localhost:3000` — Admin: `http://localhost:3000/admin` (akun seed: telepon `081234567890`, sandi `citarasa123` — **ganti sebelum live**).

## Git (jika sudah di-`git init`)

Proyek ini belum menjadi git repository saat dokumen ini ditulis. Setelah `git init`:

- **Branch**: buat branch per fitur/perbaikan dari branch utama, mis. `fitur/laporan-ekspor-csv`, `perbaikan/kapasitas-harian`.
- **Commit**: pesan singkat, present tense, jelaskan *apa* dan bila perlu *kenapa*. Jangan commit berkas `.env*` (kecuali `*.example`), `src/generated/`, atau isi `data/` (sudah di-`.gitignore`, tapi selalu cek `git status` sebelum commit besar).
- **Migrasi Prisma**: satu migrasi = satu perubahan skema yang logis. Jangan edit migrasi yang sudah pernah di-commit/di-apply — buat migrasi baru untuk perbaikan.

## Checklist sebelum menganggap perubahan selesai

Belum ada test suite otomatis (lihat TASKS.md), jadi checklist ini adalah baris pertahanan utama:

1. `npm run typecheck` — harus bersih, proyek `strict: true`.
2. `npm run build` — juga menjalankan `prisma generate`, akan gagal kalau skema dan kode tidak sinkron.
3. Jika mengubah `prisma/schema.prisma`: `npm run db:migrate` untuk membuat migrasi, jangan biarkan skema drift dari folder `migrations/`.
4. Jika mengubah alur pesanan/pembayaran/kas: **uji manual** di browser — buat pesanan baru di `/pesan`, cek statusnya berubah benar di `/admin`, dan kalau menyentuh pembayaran, cek `/admin/keuangan` menghasilkan tepat satu baris kas per pesanan yang lunas.
5. Jika mengubah tampilan: cek di lebar layar HP (~375–400px) — target pengguna toko adalah pembeli di HP, dan target pengguna admin adalah pemilik yang sering memegang HP juga.

## Menambah Server Action baru

Pola yang dipakai konsisten di `src/app/aksi/*.ts`:

```ts
"use server";

import { z } from "zod";
// ...

const skema = z.object({ /* ... */ });

export async function namaAksi(prevState: HasilForm, formData: FormData): Promise<HasilForm> {
  const hasil = skema.safeParse(/* ambil dari formData */);
  if (!hasil.success) return { sukses: false, pesan: "..." };

  // logika bisnis + akses Prisma di sini

  revalidatePath("/path/yang/datanya-berubah");
  return { sukses: true, pesan: "..." };
}
```

Ikuti pola ini (nama return type bisa berbeda per domain, cek file tetangga di folder yang sama) supaya kompatibel dengan `useActionState` di komponen form.

## Menambah halaman baru

- Halaman publik → `src/app/(toko)/<nama>/page.tsx`, otomatis dapat header/footer dari layout grup.
- Halaman admin → `src/app/admin/<nama>/page.tsx`, otomatis dapat guard login+peran dari `admin/layout.tsx` — **jangan** tambahkan pengecekan auth duplikat di halaman itu sendiri.
- Pakai istilah Indonesia yang konsisten untuk nama file/route/fungsi (lihat glosarium di AGENTS.md).

## Sebelum meminta review / menganggap fitur siap

- Jalankan checklist di atas.
- Update [TASKS.md](TASKS.md) — coret item yang selesai, tambah item baru kalau perubahanmu membuka pekerjaan susulan (mis. "tambah test untuk fitur X").
- Kalau perubahanmu menyentuh salah satu dari 7 invarian arsitektur di AGENTS.md §4, sebutkan eksplisit di deskripsi PR/commit bagaimana invarian itu tetap terjaga.
