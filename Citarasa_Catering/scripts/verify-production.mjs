import fs from "node:fs";
import path from "node:path";

// Muat berkas .env secara native tanpa dependensi eksternal
const cwd = process.cwd();
const envPaths = [
  path.join(cwd, ".env.production"),
  path.join(cwd, ".env"),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    try {
      if (typeof process.loadEnvFile === "function") {
        process.loadEnvFile(envPath);
      } else {
        // Fallback parser sederhana untuk Node versi lama
        const konten = fs.readFileSync(envPath, "utf-8");
        for (const baris of konten.split("\n")) {
          const t = baris.trim();
          if (!t || t.startsWith("#")) continue;
          const idx = t.indexOf("=");
          if (idx !== -1) {
            const kunci = t.slice(0, idx).trim();
            let nilai = t.slice(idx + 1).trim();
            if ((nilai.startsWith('"') && nilai.endsWith('"')) || (nilai.startsWith("'") && nilai.endsWith("'"))) {
              nilai = nilai.slice(1, -1);
            }
            if (!process.env[kunci]) {
              process.env[kunci] = nilai;
            }
          }
        }
      }
      break;
    } catch {
      // lanjut ke file berikutnya jika ada kesalahan pembacaan
    }
  }
}

console.log("\n=======================================================");
console.log("🔍 AUDIT KESIAPAN PRODUKSI (PRODUCTION READINESS CHECK)");
console.log("=======================================================\n");

let gagal = 0;
let peringatan = 0;

function cek(nama, kondisi, pesanGagal, pesanSukses, isPeringatan = false) {
  if (kondisi) {
    console.log(`✅ [LULUS] ${nama}: ${pesanSukses}`);
  } else {
    if (isPeringatan) {
      peringatan++;
      console.log(`⚠️  [PERINGATAN] ${nama}: ${pesanGagal}`);
    } else {
      gagal++;
      console.log(`❌ [GAGAL] ${nama}: ${pesanGagal}`);
    }
  }
}

// 1. Cek NODE_ENV
const nodeEnv = process.env.NODE_ENV;
cek(
  "NODE_ENV",
  nodeEnv === "production",
  `NODE_ENV saat ini '${nodeEnv}', harus 'production' di lingkungan live.`,
  `Disetel ke 'production'.`
);

// 2. Cek SESSION_SECRET
const secret = process.env.SESSION_SECRET;
const rahasiaContoh = [
  "ganti-dengan-kunci-acak-minimal-32-karakter",
  "build-time-secret-at-least-32-characters-long",
  "ganti_dengan_kunci_rahasia_kriptografi_minimal_32_karakter_acak",
];
const secretValid =
  secret &&
  secret.length >= 32 &&
  !rahasiaContoh.includes(secret);

cek(
  "SESSION_SECRET",
  Boolean(secretValid),
  `SESSION_SECRET kosong, kurang dari 32 karakter, atau masih menggunakan nilai contoh template!`,
  `Kunci rahasia kriptografi valid (${secret?.length || 0} karakter).`
);

// 3. Cek DATABASE_URL
const dbUrl = process.env.DATABASE_URL;
const dbValid = dbUrl && dbUrl.startsWith("postgresql://") && !dbUrl.includes("dummy:dummy");
cek(
  "DATABASE_URL",
  Boolean(dbValid),
  `DATABASE_URL tidak valid atau masih menggunakan kredensial dummy.`,
  `Format URI PostgreSQL terdeteksi.`
);

// 4. Cek NEXT_PUBLIC_BASE_URL
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
const urlValid = baseUrl && (baseUrl.startsWith("https://") || baseUrl.startsWith("http://"));
cek(
  "NEXT_PUBLIC_BASE_URL",
  Boolean(urlValid),
  `NEXT_PUBLIC_BASE_URL wajib diisi protokol http:// atau https://.`,
  `URL publik terpasang: '${baseUrl}'.`
);

if (baseUrl && baseUrl.startsWith("http://") && !baseUrl.includes("localhost")) {
  cek(
    "HTTPS Enforcement",
    false,
    `Domain publik '${baseUrl}' belum menggunakan protokol aman HTTPS.`,
    "",
    true
  );
}

// 5. Cek PROXY_TEPERCAYA
const proxy = process.env.PROXY_TEPERCAYA;
cek(
  "PROXY_TEPERCAYA",
  proxy !== undefined && !isNaN(Number(proxy)),
  `PROXY_TEPERCAYA belum disetel. Isi '1' jika di belakang Nginx/Cloudflare, atau '0' jika direct.`,
  `Disetel ke '${proxy}'.`
);

// 6. Cek & Pastikan Direktori Unggahan & Log
const dirUnggahan = process.env.DIREKTORI_UNGGAHAN
  ? path.resolve(process.env.DIREKTORI_UNGGAHAN)
  : path.join(cwd, "data", "unggahan");
const dirLogs = path.join(cwd, "logs");
const dirBackups = path.join(cwd, "backups");

for (const [label, dir] of [
  ["Direktori Unggahan", dirUnggahan],
  ["Direktori Log Sistem", dirLogs],
  ["Direktori Backup", dirBackups],
]) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cek(label, true, "", `Folder siap di ${path.relative(cwd, dir)}`);
  } catch (err) {
    cek(label, false, `Gagal membuat direktori: ${err.message}`, "");
  }
}

// 7. Cek Kredensial Seed Pemilik
const sandiPemilik = process.env.SEED_SANDI_PEMILIK;
const sandiLemah =
  !sandiPemilik ||
  sandiPemilik === "citarasa123" ||
  sandiPemilik.startsWith("GANTI") ||
  sandiPemilik.length < 12;
cek(
  "SEED_SANDI_PEMILIK",
  !sandiLemah,
  "Sandi pemilik masih bawaan/templat atau kurang dari 12 karakter. Ganti sebelum menjalankan db:seed!",
  "Sandi pemilik telah disesuaikan.",
  true
);

// 8. Cek Nomor Telepon Pemilik
// Nomor ini bukan sekadar catatan: itu yang dipakai pemilik untuk login, dan
// yang muncul sebagai kontak WhatsApp di situs. Nomor contoh yang lolos ke
// produksi berarti akun pemilik terdaftar dengan nomor milik orang lain.
const teleponPemilik = process.env.SEED_TELEPON_PEMILIK;
cek(
  "SEED_TELEPON_PEMILIK",
  Boolean(
    teleponPemilik &&
      /^62\d{8,13}$/.test(teleponPemilik) &&
      teleponPemilik !== "6281234567890"
  ),
  `Nomor pemilik masih contoh/tidak berformat 62xxxxxxxxxx (sekarang: '${teleponPemilik ?? "kosong"}').`,
  `Nomor pemilik terisi.`
);

// 9. Cek Data Demo
cek(
  "SEED_DEMO",
  process.env.SEED_DEMO === "0",
  "SEED_DEMO belum '0'. Pesanan dummy akan masuk ke buku kas dan merusak laporan omzet.",
  "Data demo dimatikan."
);

// 10. Cek Kredensial Database untuk Docker Compose
// docker-compose.prod.yml menolak jalan tanpa POSTGRES_PASSWORD. Diperiksa
// sebagai peringatan karena deployment PM2/Nginx tidak memerlukannya.
const sandiDb = process.env.POSTGRES_PASSWORD;
cek(
  "POSTGRES_PASSWORD",
  Boolean(sandiDb && sandiDb.length >= 16 && !sandiDb.startsWith("GANTI")),
  "Belum diisi (atau masih templat). Wajib bila memakai docker-compose.prod.yml; jalankan compose dengan --env-file .env.production.",
  "Sandi database untuk Docker Compose terisi.",
  true
);

// Ringkasan
console.log("\n-------------------------------------------------------");
if (gagal === 0) {
  console.log(`🎉 SEMUA PEMERIKSAAN UTAMA LULUS! (${peringatan} peringatan minor)`);
  console.log("Sistem telah terkonfigurasi dan siap untuk tahap produksi.");
} else {
  console.error(`🚨 DITEMUKAN ${gagal} MASALAH KESIAPAN PRODUKSI.`);
  console.error("Harap perbaiki konfigurasi di atas sebelum meluncurkan ke publik.");
}
console.log("-------------------------------------------------------\n");

process.exit(gagal > 0 ? 1 : 0);

