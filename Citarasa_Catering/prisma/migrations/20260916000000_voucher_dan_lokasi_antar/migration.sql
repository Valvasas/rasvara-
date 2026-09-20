-- CreateEnum
CREATE TYPE "JenisPotongan" AS ENUM ('NOMINAL', 'PERSEN');

-- AlterTable
ALTER TABLE "Pesanan" ADD COLUMN     "kodeVoucher" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "voucherId" TEXT;

-- CreateTable
CREATE TABLE "Voucher" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "deskripsi" TEXT,
    "jenis" "JenisPotongan" NOT NULL DEFAULT 'NOMINAL',
    "nilai" INTEGER NOT NULL,
    "maksPotongan" INTEGER,
    "minBelanja" INTEGER NOT NULL DEFAULT 0,
    "kuota" INTEGER,
    "terpakai" INTEGER NOT NULL DEFAULT 0,
    "mulaiPada" TIMESTAMP(3),
    "berakhirPada" TIMESTAMP(3),
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diubahPada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_kode_key" ON "Voucher"("kode");

-- CreateIndex
CREATE INDEX "Voucher_aktif_berakhirPada_idx" ON "Voucher"("aktif", "berakhirPada");

-- AddForeignKey
ALTER TABLE "Pesanan" ADD CONSTRAINT "Pesanan_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

