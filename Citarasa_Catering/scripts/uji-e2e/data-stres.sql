-- 137 menu tambahan (total 150)
INSERT INTO "Menu" (id, nama, slug, deskripsi, kategori, harga, satuan, "minPesan", aktif, "preorderHari", urutan, "diubahPada")
SELECT 'stres-menu-'||g, 'Menu Uji '||g, 'menu-uji-'||g,
  'Deskripsi menu uji nomor '||g||' berisi nasi, lauk utama, sayur, dan sambal.',
  (ARRAY['NASI_KOTAK','SNACK','TUMPENG','NASI_GORENG'])[1+(g%4)]::"KategoriMenu",
  10000 + (g*1373 % 90000), (ARRAY['kotak','box','paket','porsi'])[1+(g%4)], 1+(g%10), (g%9<>0), g%3, 100+g, now()
FROM generate_series(1,137) g;

-- 1200 pesanan, tanggal acara -60..+14 hari
INSERT INTO "Pesanan" (id, kode, "namaPemesan", "teleponPemesan", "caraAmbil", "tanggalAcara", "jamAcara", status, "statusBayar", "caraBayar", subtotal, ongkir, total, "dibuatPada", "diubahPada", "alamatAntar", sumber)
SELECT 'stres-p-'||g, 'CR-UJI-'||lpad(g::text,5,'0'), 'Pemesan Uji '||g, '62813'||lpad((g*7919 % 100000000)::text,8,'0'),
  CASE WHEN g%3=0 THEN 'DIANTAR' ELSE 'AMBIL_SENDIRI' END::"CaraAmbil",
  (date_trunc('day', now() AT TIME ZONE 'Asia/Jakarta') + ((g % 75) - 60) * interval '1 day' + interval '12 hours') AT TIME ZONE 'Asia/Jakarta',
  lpad((7 + g%12)::text,2,'0')||':'||(CASE WHEN g%2=0 THEN '00' ELSE '30' END),
  CASE WHEN (g%75)-60 < 0 THEN (CASE WHEN g%11=0 THEN 'DIBATALKAN' ELSE 'SELESAI' END)
       ELSE (ARRAY['BARU','DIKONFIRMASI','DIPROSES','SIAP'])[1+(g%4)] END::"StatusPesanan",
  CASE WHEN (g%75)-60 < 0 AND g%11<>0 THEN 'LUNAS' WHEN g%5=0 THEN 'MENUNGGU_VERIFIKASI' ELSE 'BELUM_BAYAR' END::"StatusBayar",
  CASE WHEN g%4=0 THEN 'TUNAI' ELSE 'TRANSFER' END::"CaraBayar",
  (20+g%80)*25000, 0, (20+g%80)*25000, now() - ((75-(g%75)) * interval '1 day'), now(),
  CASE WHEN g%3=0 THEN 'Jl. Uji No. '||g||', Sukamaju' END,
  (ARRAY['WEBSITE','WEBSITE','WHATSAPP','TELEPON'])[1+(g%4)]::"SumberPesanan"
FROM generate_series(1,1200) g;

INSERT INTO "ItemPesanan" (id, "pesananId", "menuId", "namaMenu", "hargaSatuan", satuan, jumlah, subtotal)
SELECT 'stres-i-'||g||'-'||k, 'stres-p-'||g, 'stres-menu-'||(1+((g+k*31)%137)), 'Menu Uji '||(1+((g+k*31)%137)), 25000, 'kotak', (20+g%80) / (1 + (g%3)), 25000*((20+g%80)/(1+(g%3)))
FROM generate_series(1,1200) g, generate_series(1,1+(g%3)) k;

-- pembayaran + kas untuk pesanan lunas (invarian #3: satu pembayaran = satu baris kas)
UPDATE "Pesanan" SET dibayar = total WHERE "statusBayar"='LUNAS' AND id LIKE 'stres-%';
-- sebagian pesanan aktif sudah membayar DP 50%
UPDATE "Pesanan" SET dibayar = total/2, "minimalDp" = total/2, "statusBayar"='SEBAGIAN'
  WHERE id LIKE 'stres-%' AND status IN ('DIKONFIRMASI','DIPROSES') AND "statusBayar"='BELUM_BAYAR' AND (substring(id from 9)::int % 2) = 0;
INSERT INTO "Pembayaran" (id, "pesananId", jenis, metode, jumlah, "dibuatPada")
SELECT 'stres-b-'||p.id, p.id, CASE WHEN p.dibayar >= p.total THEN 'PELUNASAN' ELSE 'DP' END::"JenisPembayaran", p."caraBayar", p.dibayar, LEAST(p."tanggalAcara", now() - interval '1 day')
FROM "Pesanan" p WHERE p.id LIKE 'stres-%' AND p.dibayar > 0;
INSERT INTO "CatatanKas" (id, jenis, sumber, kategori, keterangan, jumlah, tanggal, "pesananId", "pembayaranId")
SELECT 'stres-k-'||b.id, 'MASUK', 'PESANAN', 'Penjualan pesanan', 'Pembayaran pesanan '||p.kode, b.jumlah, b."dibuatPada", p.id, b.id
FROM "Pembayaran" b JOIN "Pesanan" p ON p.id = b."pesananId" WHERE b.id LIKE 'stres-b-%';
INSERT INTO "CatatanKas" (id, jenis, sumber, kategori, keterangan, jumlah, tanggal)
SELECT 'stres-m-'||g, 'KELUAR', 'MANUAL', (ARRAY['Belanja bahan','Gas & air','Kemasan','Transport'])[1+(g%4)], 'Pengeluaran uji '||g, 50000 + (g*977 % 400000), now() - ((g%60) * interval '1 day')
FROM generate_series(1,800) g;
SELECT (SELECT count(*) FROM "Menu") menu, (SELECT count(*) FROM "Pesanan") pesanan, (SELECT count(*) FROM "CatatanKas") kas,
  (SELECT count(*) FROM "Pesanan" WHERE status IN ('BARU','DIKONFIRMASI','DIPROSES','SIAP')) aktif;
