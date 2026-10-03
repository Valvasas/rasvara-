-- 137 menu tambahan (total 150)
INSERT INTO "Menu" (id, nama, slug, deskripsi, kategori, harga, satuan, "minPesan", aktif, "preorderHari", urutan, "diubahPada")
SELECT 'stres-menu-'||g, 'Menu Uji '||g, 'menu-uji-'||g,
  'Deskripsi menu uji nomor '||g||' berisi nasi, lauk utama, sayur, dan sambal.',
  (ARRAY['NASI_KOTAK','SNACK','TUMPENG','NASI_GORENG'])[1+(g%4)]::"KategoriMenu",
  10000 + (g*1373 % 90000), (ARRAY['kotak','box','paket','porsi'])[1+(g%4)], 1+(g%10), (g%9<>0), g%3, 100+g, now()
FROM generate_series(1,137) g;

-- 1200 pesanan, tanggal acara -60..+14 hari, 400 pelanggan berulang.
-- Jarak pesan 0..13 hari ((g*9)%14 — 9 dan 14 koprima, jadi semua nilai muncul).
-- Pesanan mendatang yang "seharusnya belum dibuat" dijepit ke sekarang supaya jumlah
-- pesanan aktif (dipakai uji regresi) tetap; akibatnya perkiraan di data uji sedikit tinggi.
INSERT INTO "Pesanan" (id, kode, "namaPemesan", "teleponPemesan", "caraAmbil", "tanggalAcara", "jamAcara", status, "statusBayar", "caraBayar", subtotal, ongkir, total, "dibuatPada", "diubahPada", "alamatAntar", sumber)
SELECT 'stres-p-'||g, 'CR-UJI-'||lpad(g::text,5,'0'), 'Pemesan Uji '||(1+g%400), '62813'||lpad(((1+g%400)*7919 % 100000000)::text,8,'0'),
  CASE WHEN g%3=0 THEN 'DIANTAR' ELSE 'AMBIL_SENDIRI' END::"CaraAmbil",
  (date_trunc('day', now() AT TIME ZONE 'Asia/Jakarta') + ((g % 75) - 60) * interval '1 day' + interval '12 hours') AT TIME ZONE 'Asia/Jakarta',
  lpad((7 + g%12)::text,2,'0')||':'||(CASE WHEN g%2=0 THEN '00' ELSE '30' END),
  CASE WHEN (g%75)-60 < 0 THEN (CASE WHEN g%11=0 THEN 'DIBATALKAN' ELSE 'SELESAI' END)
       ELSE (ARRAY['BARU','DIKONFIRMASI','DIPROSES','SIAP'])[1+(g%4)] END::"StatusPesanan",
  CASE WHEN (g%75)-60 < 0 AND g%11<>0 THEN 'LUNAS' WHEN g%5=0 THEN 'MENUNGGU_VERIFIKASI' ELSE 'BELUM_BAYAR' END::"StatusBayar",
  CASE WHEN g%4=0 THEN 'TUNAI' ELSE 'TRANSFER' END::"CaraBayar",
  (20+g%80)*25000, 0, (20+g%80)*25000,
  LEAST(now() - interval '5 minutes', (date_trunc('day', now() AT TIME ZONE 'Asia/Jakarta') + ((g % 75) - 60) * interval '1 day' + interval '9 hours') AT TIME ZONE 'Asia/Jakarta' - ((g*9) % 14) * interval '1 day'), now(),
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
-- bahan & resep: 4 dari 5 menu uji punya resep; sebagian sengaja bermargin tipis
INSERT INTO "Bahan" (id, nama, satuan, "hargaPerSatuan", aktif, "diubahPada") VALUES
  ('stres-bh-1','Uji Ayam potong','kg',38000,true,now()), ('stres-bh-2','Uji Beras','kg',14000,true,now()),
  ('stres-bh-3','Uji Daging sapi','kg',130000,true,now()), ('stres-bh-4','Uji Telur','butir',2000,true,now()),
  ('stres-bh-5','Uji Tahu','pcs',500,true,now()), ('stres-bh-6','Uji Bumbu dasar','kg',50000,true,now()),
  ('stres-bh-7','Uji Kotak nasi','pcs',1500,true,now());
INSERT INTO "ResepMenu" (id, "menuId", "bahanId", "jumlahPerPorsi")
SELECT 'stres-r-'||m||'-'||b, 'stres-menu-'||m, 'stres-bh-'||b, j
FROM generate_series(1,137) m
CROSS JOIN LATERAL (VALUES
  (7, 1.0), (2, 0.15),
  (CASE m%4 WHEN 0 THEN 1 WHEN 1 THEN 3 WHEN 2 THEN 4 ELSE 1 END, CASE m%4 WHEN 0 THEN 0.15 WHEN 1 THEN 0.1 WHEN 2 THEN 1.0 ELSE 0.2 END),
  -- baris ke-4 selalu bahan 5/6 (tidak pernah bentrok dengan protein 1/3/4); m%7=0 → bumbu boros → margin tipis
  (CASE WHEN m%4=2 THEN 5 ELSE 6 END, CASE WHEN m%4=2 THEN 2.0 WHEN m%7=0 THEN 0.25 ELSE 0.05 END)
) AS r(b, j)
WHERE m % 5 <> 0;
-- snapshot HPP hanya untuk pesanan 30 hari terakhir (resep "baru dicatat") → jalur perkiraan ikut teruji
UPDATE "ItemPesanan" i SET "hppSatuan" = h.hpp
FROM (SELECT r."menuId", round(sum(r."jumlahPerPorsi" * b."hargaPerSatuan"))::int hpp
      FROM "ResepMenu" r JOIN "Bahan" b ON b.id = r."bahanId" WHERE r.id LIKE 'stres-r-%' GROUP BY r."menuId") h,
     "Pesanan" p
WHERE i."menuId" = h."menuId" AND p.id = i."pesananId" AND p.id LIKE 'stres-%' AND p."dibuatPada" > now() - interval '30 days';

SELECT (SELECT count(*) FROM "Menu") menu, (SELECT count(*) FROM "Pesanan") pesanan, (SELECT count(*) FROM "CatatanKas") kas,
  (SELECT count(*) FROM "Pesanan" WHERE status IN ('BARU','DIKONFIRMASI','DIPROSES','SIAP')) aktif;
