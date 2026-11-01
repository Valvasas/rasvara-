-- Siap serverless (Vercel): pembatas laju & garam analitik dibagi semua instans,
-- plus pengaturan jeda minimum pesanan hari-H dan voucher sekali per nomor HP.
-- AlterTable
ALTER TABLE "Pengaturan" ADD COLUMN     "jedaMinimumMenit" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Voucher" ADD COLUMN     "sekaliPerNomor" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "BatasLaju" (
    "kunci" TEXT NOT NULL,
    "hitungan" INTEGER NOT NULL DEFAULT 0,
    "kedaluwarsa" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BatasLaju_pkey" PRIMARY KEY ("kunci")
);

-- CreateTable
CREATE TABLE "GaramHarian" (
    "tanggal" TEXT NOT NULL,
    "nilai" TEXT NOT NULL,

    CONSTRAINT "GaramHarian_pkey" PRIMARY KEY ("tanggal")
);

-- CreateIndex
CREATE INDEX "BatasLaju_kedaluwarsa_idx" ON "BatasLaju"("kedaluwarsa");

