import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

/**
 * Di server, konfigurasi ada di `.env.production`, sedangkan `dotenv/config`
 * hanya membaca `.env`. Cron backup yang memakai dotenv saja akan berjalan
 * tanpa DATABASE_URL dan gagal diam-diam setiap malam.
 */
function muatEnv() {
  for (const berkas of [".env.production", ".env"]) {
    const lokasi = path.join(process.cwd(), berkas);
    if (!existsSync(lokasi)) continue;
    try {
      process.loadEnvFile(lokasi);
      return;
    } catch {
      // Berkas rusak atau tidak terbaca; coba berkas berikutnya.
    }
  }
}

muatEnv();

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/**
 * Menyalin berkas unggahan ke folder cadangan.
 *
 * Bukti transfer adalah bukti pembayaran, dan foto menu adalah katalog — dua
 * hal yang isinya TIDAK ada di database; yang tersimpan di sana hanya nama
 * berkasnya. Cadangan yang cuma berisi JSON database akan memulihkan pesanan
 * dengan tautan gambar yang semuanya rusak.
 *
 * Disalin secara bertahap: berkas yang sudah pernah dicadangkan dilewati, jadi
 * cron harian tidak menggandakan seluruh isi folder setiap malam.
 */
async function cadangkanUnggahan(direktoriBackup) {
  const asal = process.env.DIREKTORI_UNGGAHAN
    ? path.resolve(process.env.DIREKTORI_UNGGAHAN)
    : path.join(process.cwd(), "data", "unggahan");

  if (!existsSync(asal)) {
    console.info("ℹ️  Folder unggahan belum ada, dilewati.");
    return;
  }

  const tujuan = path.join(direktoriBackup, "unggahan");
  await fs.mkdir(tujuan, { recursive: true });

  const berkas = await fs.readdir(asal, { withFileTypes: true });
  let baru = 0;

  for (const entri of berkas) {
    if (!entri.isFile()) continue;
    const pathTujuan = path.join(tujuan, entri.name);
    if (existsSync(pathTujuan)) continue;
    await fs.copyFile(path.join(asal, entri.name), pathTujuan);
    baru++;
  }

  console.info(
    `🖼️  Berkas unggahan: ${baru} baru disalin (total tercadangkan: ${
      (await fs.readdir(tujuan)).length
    }).`
  );
}

async function main() {
  console.info("📦 Memulai pencadangan (backup) database Citarasa Catering...");

  const direktoriBackup = path.join(process.cwd(), "backups");
  await fs.mkdir(direktoriBackup, { recursive: true });

  const sekarang = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const namaFile = `backup-${sekarang.getFullYear()}${pad(sekarang.getMonth() + 1)}${pad(sekarang.getDate())}-${pad(sekarang.getHours())}${pad(sekarang.getMinutes())}${pad(sekarang.getSeconds())}.json`;
  const pathTujuan = path.join(direktoriBackup, namaFile);

  try {
    const [
      pengaturan,
      pengguna,
      menu,
      fotoMenu,
      pesanan,
      itemPesanan,
      riwayatStatus,
      catatanKas,
      voucher,
      tanggalTutup,
      kunjunganHarian,
      jejakPengunjung,
      peristiwaAnalitik,
    ] = await Promise.all([
      db.pengaturan.findMany(),
      db.pengguna.findMany({
        select: {
          id: true,
          nama: true,
          telepon: true,
          email: true,
          peran: true,
          alamat: true,
          sandiHash: true,
          dibuatPada: true,
          diubahPada: true,
        },
      }),
      db.menu.findMany(),
      db.fotoMenu.findMany(),
      db.pesanan.findMany(),
      db.itemPesanan.findMany(),
      db.riwayatStatus.findMany(),
      db.catatanKas.findMany(),
      db.voucher.findMany(),
      db.tanggalTutup.findMany(),
      db.kunjunganHarian.findMany(),
      db.jejakPengunjung.findMany(),
      db.peristiwaAnalitik.findMany(),
    ]);

    const dataBackup = {
      meta: {
        versi: "1.1.0",
        dibuatPada: sekarang.toISOString(),
        totalTabel: 13,
      },
      tabel: {
        pengaturan,
        pengguna,
        menu,
        fotoMenu,
        pesanan,
        itemPesanan,
        riwayatStatus,
        catatanKas,
        voucher,
        tanggalTutup,
        kunjunganHarian,
        jejakPengunjung,
        peristiwaAnalitik,
      },
      ringkasan: {
        totalPengguna: pengguna.length,
        totalMenu: menu.length,
        totalFotoMenu: fotoMenu.length,
        totalPesanan: pesanan.length,
        totalItemPesanan: itemPesanan.length,
        totalRiwayatStatus: riwayatStatus.length,
        totalCatatanKas: catatanKas.length,
        totalVoucher: voucher.length,
        totalTanggalTutup: tanggalTutup.length,
        totalKunjunganHarian: kunjunganHarian.length,
        totalPeristiwaAnalitik: peristiwaAnalitik.length,
      },
    };

    await fs.writeFile(pathTujuan, JSON.stringify(dataBackup, null, 2), "utf-8");
    await cadangkanUnggahan(direktoriBackup);

    console.info(`✅ Backup berhasil disimpan ke: ${pathTujuan}`);
    console.info("📊 Ringkasan Data:");
    console.info(`   - Pengguna            : ${pengguna.length}`);
    console.info(`   - Menu                : ${menu.length}`);
    console.info(`   - Foto Menu           : ${fotoMenu.length}`);
    console.info(`   - Pesanan             : ${pesanan.length}`);
    console.info(`   - Item Pesanan        : ${itemPesanan.length}`);
    console.info(`   - Riwayat Status      : ${riwayatStatus.length}`);
    console.info(`   - Catatan Kas         : ${catatanKas.length}`);
    console.info(`   - Voucher             : ${voucher.length}`);
    console.info(`   - Tanggal Tutup       : ${tanggalTutup.length}`);
    console.info(`   - Kunjungan Harian    : ${kunjunganHarian.length}`);
    console.info(`   - Peristiwa Analitik  : ${peristiwaAnalitik.length}`);
  } catch (err) {
    console.error("❌ Gagal melakukan backup database:", err);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
