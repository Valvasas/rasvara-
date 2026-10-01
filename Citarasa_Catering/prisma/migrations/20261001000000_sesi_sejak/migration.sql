-- Waktu mulai berlakunya sesi. Token yang terbit sebelum ini ditolak untuk
-- pemilik & staf dapur, sehingga ganti sandi mencabut sesi di perangkat lain.
ALTER TABLE "Pengguna" ADD COLUMN "sesiSejak" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
