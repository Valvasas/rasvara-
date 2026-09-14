import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

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
      pesanan,
      itemPesanan,
      catatanKas,
      riwayatStatus,
      tanggalTutup,
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
      db.pesanan.findMany(),
      db.itemPesanan.findMany(),
      db.catatanKas.findMany(),
      db.riwayatStatus.findMany(),
      db.tanggalTutup.findMany(),
    ]);

    const dataBackup = {
      meta: {
        versi: "1.0.0",
        dibuatPada: sekarang.toISOString(),
        totalTabel: 8,
      },
      tabel: {
        pengaturan,
        pengguna,
        menu,
        pesanan,
        itemPesanan,
        catatanKas,
        riwayatStatus,
        tanggalTutup,
      },
      ringkasan: {
        totalPengguna: pengguna.length,
        totalMenu: menu.length,
        totalPesanan: pesanan.length,
        totalItemPesanan: itemPesanan.length,
        totalCatatanKas: catatanKas.length,
        totalRiwayatStatus: riwayatStatus.length,
      },
    };

    await fs.writeFile(pathTujuan, JSON.stringify(dataBackup, null, 2), "utf-8");

    console.info(`✅ Backup berhasil disimpan ke: ${pathTujuan}`);
    console.info("📊 Ringkasan Data:");
    console.info(`   - Pengguna       : ${pengguna.length}`);
    console.info(`   - Menu           : ${menu.length}`);
    console.info(`   - Pesanan        : ${pesanan.length}`);
    console.info(`   - Item Pesanan   : ${itemPesanan.length}`);
    console.info(`   - Catatan Kas    : ${catatanKas.length}`);
    console.info(`   - Riwayat Status : ${riwayatStatus.length}`);
  } catch (err) {
    console.error("❌ Gagal melakukan backup database:", err);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
