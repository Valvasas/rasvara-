-- Row Level Security di SEMUA tabel skema aplikasi.
--
-- Di Supabase, setiap tabel di skema public otomatis bisa dibaca & ditulis
-- lewat Data API (PostgREST) memakai anon key — kunci yang memang publik.
-- Aplikasi ini tidak memakai Data API sama sekali (semua akses lewat Prisma
-- di server), jadi RLS tanpa satu pun policy berarti: tertutup total bagi
-- anon/authenticated, sementara aplikasi tetap jalan karena terhubung
-- sebagai pemilik tabel (pemilik tabel melewati RLS).
--
-- Di PostgreSQL biasa (VPS/Docker) perintah ini aman dan tidak mengubah
-- perilaku aplikasi, karena pengguna aplikasi juga pemilik tabelnya.
--
-- PENTING: tabel baru di migrasi mendatang wajib diberi
-- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` juga (cek Supabase Advisors).
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = current_schema() LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END
$$;
