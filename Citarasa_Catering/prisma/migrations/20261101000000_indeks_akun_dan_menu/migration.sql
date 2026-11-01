-- Indeks pendukung "Pesanan saya" berbasis akun, antrean cek pembayaran,
-- dan agregasi per menu (kuota harian, hitungan terjual, rekap produksi).
-- CreateIndex
CREATE INDEX "Pesanan_penggunaId_dibuatPada_idx" ON "Pesanan"("penggunaId", "dibuatPada");

-- CreateIndex
CREATE INDEX "Pesanan_statusBayar_status_idx" ON "Pesanan"("statusBayar", "status");

-- CreateIndex
CREATE INDEX "ItemPesanan_menuId_idx" ON "ItemPesanan"("menuId");
