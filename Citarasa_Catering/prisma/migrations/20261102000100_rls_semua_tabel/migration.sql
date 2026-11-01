-- Row Level Security di SEMUA tabel skema aplikasi.
--
-- Di Supabase, setiap tabel di skema public otomatis bisa dibaca & ditulis
-- lewat Data API (PostgREST) memakai anon key — kunci yang memang publik.
-- Tanpa ini, siapa pun bisa, misalnya, menyisipkan akun PEMILIK sendiri ke
-- tabel "Pengguna" lewat HTTP. Aplikasi ini tidak memakai Data API sama
-- sekali (semua akses lewat Prisma di server), jadi RLS tanpa satu pun policy
-- berarti: tertutup total bagi anon/authenticated, sementara aplikasi tetap
-- jalan karena terhubung sebagai pemilik tabel (pemilik tabel melewati RLS).
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

-- Lapis kedua, khusus Supabase (peran anon/authenticated hanya ada di sana):
-- cabut hak tabel yang diberikan otomatis, dan hentikan pemberian otomatis itu
-- untuk tabel yang dibuat migrasi mendatang — supaya tabel baru yang lupa
-- diberi RLS tetap tidak terbuka. TRUNCATE juga tidak tunduk pada RLS, jadi
-- hak itu memang harus dicabut, bukan hanya ditutup policy.
DO $$
DECLARE
  peran text;
BEGIN
  FOREACH peran IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = peran) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM %I', current_schema(), peran);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA %I FROM %I', current_schema(), peran);
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL ON TABLES FROM %I',
        current_user, current_schema(), peran
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL ON SEQUENCES FROM %I',
        current_user, current_schema(), peran
      );
    END IF;
  END LOOP;
END
$$;
