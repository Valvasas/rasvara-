-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Peran" AS ENUM ('PEMILIK', 'PELANGGAN');

-- CreateEnum
CREATE TYPE "KategoriMenu" AS ENUM ('SNACK', 'NASI_KOTAK', 'TUMPENG', 'NASI_GORENG');

-- CreateEnum
CREATE TYPE "StatusPesanan" AS ENUM ('BARU', 'DIKONFIRMASI', 'DIPROSES', 'SIAP', 'SELESAI', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "StatusBayar" AS ENUM ('BELUM_BAYAR', 'MENUNGGU_VERIFIKASI', 'LUNAS');

-- CreateEnum
CREATE TYPE "CaraAmbil" AS ENUM ('AMBIL_SENDIRI', 'DIANTAR');

-- CreateEnum
CREATE TYPE "CaraBayar" AS ENUM ('TRANSFER', 'TUNAI');

-- CreateEnum
CREATE TYPE "JenisKas" AS ENUM ('MASUK', 'KELUAR');

-- CreateEnum
CREATE TYPE "SumberKas" AS ENUM ('PESANAN', 'MANUAL');

-- CreateTable
CREATE TABLE "Pengguna" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "telepon" TEXT NOT NULL,
    "email" TEXT,
    "sandiHash" TEXT NOT NULL,
    "peran" "Peran" NOT NULL DEFAULT 'PELANGGAN',
    "alamat" TEXT,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diubahPada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pengguna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Menu" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "kategori" "KategoriMenu" NOT NULL,
    "harga" INTEGER NOT NULL,
    "satuan" TEXT NOT NULL DEFAULT 'porsi',
    "minPesan" INTEGER NOT NULL DEFAULT 1,
    "fotoUrl" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "preorderHari" INTEGER NOT NULL DEFAULT 0,
    "kapasitasHarian" INTEGER,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diubahPada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pesanan" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "penggunaId" TEXT,
    "namaPemesan" TEXT NOT NULL,
    "teleponPemesan" TEXT NOT NULL,
    "alamatAntar" TEXT,
    "caraAmbil" "CaraAmbil" NOT NULL DEFAULT 'AMBIL_SENDIRI',
    "tanggalAcara" TIMESTAMP(3) NOT NULL,
    "jamAcara" TEXT NOT NULL,
    "catatan" TEXT,
    "status" "StatusPesanan" NOT NULL DEFAULT 'BARU',
    "statusBayar" "StatusBayar" NOT NULL DEFAULT 'BELUM_BAYAR',
    "caraBayar" "CaraBayar" NOT NULL DEFAULT 'TRANSFER',
    "subtotal" INTEGER NOT NULL,
    "ongkir" INTEGER NOT NULL DEFAULT 0,
    "diskon" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "dibayar" INTEGER NOT NULL DEFAULT 0,
    "buktiBayarUrl" TEXT,
    "dikonfirmasiPada" TIMESTAMP(3),
    "selesaiPada" TIMESTAMP(3),
    "alasanBatal" TEXT,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diubahPada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pesanan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPesanan" (
    "id" TEXT NOT NULL,
    "pesananId" TEXT NOT NULL,
    "menuId" TEXT,
    "namaMenu" TEXT NOT NULL,
    "hargaSatuan" INTEGER NOT NULL,
    "satuan" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "catatan" TEXT,
    "subtotal" INTEGER NOT NULL,

    CONSTRAINT "ItemPesanan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiwayatStatus" (
    "id" TEXT NOT NULL,
    "pesananId" TEXT NOT NULL,
    "dari" "StatusPesanan",
    "ke" "StatusPesanan" NOT NULL,
    "catatan" TEXT,
    "olehId" TEXT,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiwayatStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatatanKas" (
    "id" TEXT NOT NULL,
    "jenis" "JenisKas" NOT NULL,
    "sumber" "SumberKas" NOT NULL DEFAULT 'MANUAL',
    "kategori" TEXT NOT NULL,
    "keterangan" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "pesananId" TEXT,
    "dicatatOlehId" TEXT,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatatanKas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TanggalTutup" (
    "id" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "alasan" TEXT,

    CONSTRAINT "TanggalTutup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pengaturan" (
    "id" TEXT NOT NULL DEFAULT 'utama',
    "namaUsaha" TEXT NOT NULL DEFAULT 'Citarasa Catering',
    "tagline" TEXT NOT NULL DEFAULT 'Masakan hangat, siap tepat waktu.',
    "cerita" TEXT NOT NULL DEFAULT '',
    "whatsapp" TEXT NOT NULL DEFAULT '',
    "alamat" TEXT NOT NULL DEFAULT '',
    "jamBuka" TEXT NOT NULL DEFAULT '16:00',
    "jamTutup" TEXT NOT NULL DEFAULT '23:00',
    "namaBank" TEXT NOT NULL DEFAULT '',
    "nomorRekening" TEXT NOT NULL DEFAULT '',
    "namaRekening" TEXT NOT NULL DEFAULT '',
    "ongkirDefault" INTEGER NOT NULL DEFAULT 0,
    "minOrderAntar" INTEGER NOT NULL DEFAULT 0,
    "diubahPada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pengaturan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pengguna_telepon_key" ON "Pengguna"("telepon");

-- CreateIndex
CREATE INDEX "Pengguna_peran_idx" ON "Pengguna"("peran");

-- CreateIndex
CREATE UNIQUE INDEX "Menu_slug_key" ON "Menu"("slug");

-- CreateIndex
CREATE INDEX "Menu_kategori_aktif_idx" ON "Menu"("kategori", "aktif");

-- CreateIndex
CREATE INDEX "Menu_aktif_urutan_idx" ON "Menu"("aktif", "urutan");

-- CreateIndex
CREATE UNIQUE INDEX "Pesanan_kode_key" ON "Pesanan"("kode");

-- CreateIndex
CREATE INDEX "Pesanan_status_tanggalAcara_idx" ON "Pesanan"("status", "tanggalAcara");

-- CreateIndex
CREATE INDEX "Pesanan_tanggalAcara_idx" ON "Pesanan"("tanggalAcara");

-- CreateIndex
CREATE INDEX "Pesanan_teleponPemesan_idx" ON "Pesanan"("teleponPemesan");

-- CreateIndex
CREATE INDEX "Pesanan_dibuatPada_idx" ON "Pesanan"("dibuatPada");

-- CreateIndex
CREATE INDEX "ItemPesanan_pesananId_idx" ON "ItemPesanan"("pesananId");

-- CreateIndex
CREATE INDEX "RiwayatStatus_pesananId_dibuatPada_idx" ON "RiwayatStatus"("pesananId", "dibuatPada");

-- CreateIndex
CREATE UNIQUE INDEX "CatatanKas_pesananId_key" ON "CatatanKas"("pesananId");

-- CreateIndex
CREATE INDEX "CatatanKas_tanggal_idx" ON "CatatanKas"("tanggal");

-- CreateIndex
CREATE INDEX "CatatanKas_jenis_tanggal_idx" ON "CatatanKas"("jenis", "tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "TanggalTutup_tanggal_key" ON "TanggalTutup"("tanggal");

-- AddForeignKey
ALTER TABLE "Pesanan" ADD CONSTRAINT "Pesanan_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPesanan" ADD CONSTRAINT "ItemPesanan_pesananId_fkey" FOREIGN KEY ("pesananId") REFERENCES "Pesanan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPesanan" ADD CONSTRAINT "ItemPesanan_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiwayatStatus" ADD CONSTRAINT "RiwayatStatus_pesananId_fkey" FOREIGN KEY ("pesananId") REFERENCES "Pesanan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiwayatStatus" ADD CONSTRAINT "RiwayatStatus_olehId_fkey" FOREIGN KEY ("olehId") REFERENCES "Pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatatanKas" ADD CONSTRAINT "CatatanKas_pesananId_fkey" FOREIGN KEY ("pesananId") REFERENCES "Pesanan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatatanKas" ADD CONSTRAINT "CatatanKas_dicatatOlehId_fkey" FOREIGN KEY ("dicatatOlehId") REFERENCES "Pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;
