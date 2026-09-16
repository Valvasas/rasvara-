-- CreateEnum
CREATE TYPE "JenisPeristiwa" AS ENUM ('MENU_DILIHAT', 'FORM_PESAN_DIBUKA', 'PESANAN_DIBUAT', 'LACAK_DIPAKAI');

-- CreateTable
CREATE TABLE "FotoMenu" (
    "id" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "keterangan" TEXT,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FotoMenu_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FotoMenu_menuId_urutan_idx" ON "FotoMenu"("menuId", "urutan");

-- AddForeignKey
ALTER TABLE "FotoMenu" ADD CONSTRAINT "FotoMenu_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Pindahkan foto tunggal yang sudah ada menjadi foto sampul (urutan 0) di galeri
-- baru. Ini WAJIB berjalan sebelum kolom lama dihapus, kalau tidak foto menu yang
-- sudah diunggah pemilik akan hilang permanen saat migrasi dijalankan di produksi.
INSERT INTO "FotoMenu" ("id", "menuId", "url", "urutan", "dibuatPada")
SELECT
    'foto_' || md5(random()::text || clock_timestamp()::text || "id"),
    "id",
    "fotoUrl",
    0,
    CURRENT_TIMESTAMP
FROM "Menu"
WHERE "fotoUrl" IS NOT NULL AND "fotoUrl" <> '';

-- AlterTable
ALTER TABLE "Menu" DROP COLUMN "fotoUrl";

-- CreateTable
CREATE TABLE "KunjunganHarian" (
    "id" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "path" TEXT NOT NULL,
    "tampilan" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "KunjunganHarian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JejakPengunjung" (
    "id" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "sidik" TEXT NOT NULL,

    CONSTRAINT "JejakPengunjung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeristiwaAnalitik" (
    "id" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "jenis" "JenisPeristiwa" NOT NULL,
    "jumlah" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PeristiwaAnalitik_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KunjunganHarian_tanggal_idx" ON "KunjunganHarian"("tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "KunjunganHarian_tanggal_path_key" ON "KunjunganHarian"("tanggal", "path");

-- CreateIndex
CREATE INDEX "JejakPengunjung_tanggal_idx" ON "JejakPengunjung"("tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "JejakPengunjung_tanggal_sidik_key" ON "JejakPengunjung"("tanggal", "sidik");

-- CreateIndex
CREATE INDEX "PeristiwaAnalitik_tanggal_idx" ON "PeristiwaAnalitik"("tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "PeristiwaAnalitik_tanggal_jenis_key" ON "PeristiwaAnalitik"("tanggal", "jenis");
