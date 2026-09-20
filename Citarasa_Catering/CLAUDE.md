@AGENTS.md

# Catatan khusus Claude Code

Semua aturan proyek (stack, invarian arsitektur, konvensi, hal yang sensitif) ada di [AGENTS.md](AGENTS.md) — file itu otomatis ikut termuat lewat baris `@AGENTS.md` di atas. Bagian ini hanya berisi hal spesifik untuk sesi Claude Code.

## Sebelum menganggap tugas selesai

1. `npm run typecheck` — proyek ini `strict: true`, jangan biarkan error TS lolos.
2. `npm run build` — build memanggil `prisma generate` juga, jadi ini sekaligus memvalidasi skema Prisma cocok dengan kode.
3. Belum ada test suite otomatis (lihat [TASKS.md](TASKS.md)). Untuk perubahan di alur pesanan/pembayaran/kas, jelaskan ke user langkah manual apa yang perlu dicek di `/menu`, `/pesan`, dan `/admin` sebelum mengklaim selesai — jangan klaim "sudah teruji" hanya berdasarkan typecheck/build.
4. Jika mengubah `prisma/schema.prisma`, pastikan sudah membuat migrasi (`npm run db:migrate`) — jangan biarkan schema dan folder `prisma/migrations/` tidak sinkron.

## Batasan lingkungan yang perlu diperhatikan

- Proyek **belum berupa git repository** di direktori ini. Jangan jalankan perintah git (commit/push/branch) tanpa mengonfirmasi dulu ke user apakah mereka ingin `git init`.
- Server dev (`npm run dev`) menulis ulang blok `<!-- BEGIN:nextjs-agent-rules -->...<!-- END:nextjs-agent-rules -->` di [AGENTS.md](AGENTS.md) secara otomatis. Itu perilaku normal dari Next.js — jangan hapus blok itu secara permanen, cukup biarkan/commit apa adanya.
- `.env` belum tentu ada (hanya `.env.example`). Jika perlu menjalankan `npm run dev`/`db:*`, cek dulu apakah `.env` sudah dibuat dan `DATABASE_URL` menunjuk ke database yang benar-benar bisa diakses — jangan menjalankan migrasi ke database yang tidak dikonfirmasi user.

## Dokumen lain di repo ini

- [README.md](README.md) — dokumentasi produk & setup lokal, bahasa Indonesia, untuk pembaca manusia (owner/dev baru).
- [ARCHITECTURE.md](ARCHITECTURE.md) — desain sistem, model data, alur status pesanan, model keamanan.
- [TASKS.md](TASKS.md) — backlog perbaikan & fitur, dikelompokkan per area.
- [CONTRIBUTING.md](CONTRIBUTING.md) — alur kerja pengembangan sehari-hari (branch, commit, checklist sebelum PR).
