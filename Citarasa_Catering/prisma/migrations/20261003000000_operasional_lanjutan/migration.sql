-- CreateEnum
CREATE TYPE "SumberPesanan" AS ENUM ('WEBSITE', 'WHATSAPP', 'TELEPON', 'LANGSUNG');

-- CreateEnum
CREATE TYPE "JenisPembayaran" AS ENUM ('DP', 'PELUNASAN', 'REFUND');

-- AlterEnum
ALTER TYPE "StatusBayar" ADD VALUE 'SEBAGIAN';

-- DropIndex
DROP INDEX "CatatanKas_pesananId_key";

-- AlterTable
ALTER TABLE "CatatanKas" ADD COLUMN     "pembayaranId" TEXT;

-- AlterTable
ALTER TABLE "ItemPesanan" ADD COLUMN     "hppSatuan" INTEGER;

-- AlterTable
ALTER TABLE "Pengaturan" ADD COLUMN     "batasBayarJam" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "persenDp" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tugasTerakhir" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Pesanan" ADD COLUMN     "minimalDp" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sumber" "SumberPesanan" NOT NULL DEFAULT 'WEBSITE';

-- CreateTable
CREATE TABLE "Pembayaran" (
    "id" TEXT NOT NULL,
    "pesananId" TEXT NOT NULL,
    "jenis" "JenisPembayaran" NOT NULL,
    "metode" "CaraBayar" NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "buktiUrl" TEXT,
    "catatan" TEXT,
    "dicatatOlehId" TEXT,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pembayaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bahan" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "satuan" TEXT NOT NULL,
    "hargaPerSatuan" INTEGER NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diubahPada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bahan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResepMenu" (
    "id" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "bahanId" TEXT NOT NULL,
    "jumlahPerPorsi" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ResepMenu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogAktivitas" (
    "id" TEXT NOT NULL,
    "penggunaId" TEXT,
    "aksi" TEXT NOT NULL,
    "target" TEXT,
    "rincian" TEXT,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogAktivitas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RekapBulanan" (
    "id" TEXT NOT NULL,
    "bulan" TEXT NOT NULL,
    "berkas" TEXT NOT NULL,
    "ukuran" INTEGER NOT NULL,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RekapBulanan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pembayaran_pesananId_dibuatPada_idx" ON "Pembayaran"("pesananId", "dibuatPada");

-- CreateIndex
CREATE INDEX "Pembayaran_buktiUrl_idx" ON "Pembayaran"("buktiUrl");

-- CreateIndex
CREATE UNIQUE INDEX "Bahan_nama_key" ON "Bahan"("nama");

-- CreateIndex
CREATE INDEX "ResepMenu_bahanId_idx" ON "ResepMenu"("bahanId");

-- CreateIndex
CREATE UNIQUE INDEX "ResepMenu_menuId_bahanId_key" ON "ResepMenu"("menuId", "bahanId");

-- CreateIndex
CREATE INDEX "LogAktivitas_dibuatPada_idx" ON "LogAktivitas"("dibuatPada");

-- CreateIndex
CREATE UNIQUE INDEX "RekapBulanan_bulan_key" ON "RekapBulanan"("bulan");

-- CreateIndex
CREATE UNIQUE INDEX "CatatanKas_pembayaranId_key" ON "CatatanKas"("pembayaranId");

-- CreateIndex
CREATE INDEX "CatatanKas_pesananId_idx" ON "CatatanKas"("pesananId");

-- CreateIndex
CREATE INDEX "ItemPesanan_menuId_idx" ON "ItemPesanan"("menuId");

-- CreateIndex
CREATE INDEX "Pesanan_diubahPada_idx" ON "Pesanan"("diubahPada");

-- CreateIndex
CREATE INDEX "Pesanan_statusBayar_idx" ON "Pesanan"("statusBayar");

-- AddForeignKey
ALTER TABLE "CatatanKas" ADD CONSTRAINT "CatatanKas_pembayaranId_fkey" FOREIGN KEY ("pembayaranId") REFERENCES "Pembayaran"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pembayaran" ADD CONSTRAINT "Pembayaran_pesananId_fkey" FOREIGN KEY ("pesananId") REFERENCES "Pesanan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pembayaran" ADD CONSTRAINT "Pembayaran_dicatatOlehId_fkey" FOREIGN KEY ("dicatatOlehId") REFERENCES "Pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResepMenu" ADD CONSTRAINT "ResepMenu_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResepMenu" ADD CONSTRAINT "ResepMenu_bahanId_fkey" FOREIGN KEY ("bahanId") REFERENCES "Bahan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogAktivitas" ADD CONSTRAINT "LogAktivitas_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ============================================================
-- Migrasi data: setiap catatan kas lama yang lahir dari pelunasan pesanan
-- menjadi satu baris Pembayaran (PELUNASAN) yang tertaut ke kas itu, lalu
-- Pesanan.dibayar diisi. Tanpa ini pesanan lunas lama akan terlihat
-- "belum dibayar" di logika baru yang menghitung dari kolom dibayar.
-- ============================================================
INSERT INTO "Pembayaran" ("id", "pesananId", "jenis", "metode", "jumlah", "dicatatOlehId", "catatan", "dibuatPada")
SELECT 'mig-' || k."id", k."pesananId", 'PELUNASAN', p."caraBayar", k."jumlah", k."dicatatOlehId",
       'Dipindahkan dari catatan kas lama', k."dibuatPada"
FROM "CatatanKas" k
JOIN "Pesanan" p ON p."id" = k."pesananId"
WHERE k."pesananId" IS NOT NULL AND k."jenis" = 'MASUK';

UPDATE "CatatanKas" k SET "pembayaranId" = 'mig-' || k."id"
WHERE k."pesananId" IS NOT NULL AND k."jenis" = 'MASUK'
  AND EXISTS (SELECT 1 FROM "Pembayaran" b WHERE b."id" = 'mig-' || k."id");

UPDATE "Pesanan" p SET "dibayar" = s.jumlah
FROM (SELECT "pesananId", SUM("jumlah")::int AS jumlah FROM "Pembayaran" GROUP BY "pesananId") s
WHERE s."pesananId" = p."id";

-- Pesanan berstatus LUNAS tanpa catatan kas (data yang sudah tidak konsisten
-- sejak awal) dianggap lunas penuh supaya tidak tiba-tiba muncul sebagai piutang.
UPDATE "Pesanan" SET "dibayar" = "total" WHERE "statusBayar" = 'LUNAS' AND "dibayar" < "total";
