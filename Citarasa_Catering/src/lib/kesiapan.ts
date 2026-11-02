/**
 * Daftar periksa "siap menerima pesanan" untuk pemilik — fungsi murni.
 *
 * Tiap butir adalah hal yang, bila kosong, merusak pengalaman pembeli secara
 * nyata (tidak bisa transfer, tidak bisa chat, foto tidak bisa diunggah,
 * janji jam siap tidak tampil). Bukan daftar "fitur yang belum dipakai".
 */

export type ButirKesiapan = {
  kunci: string;
  judul: string;
  keterangan: string;
  beres: boolean;
  href: string;
  /** Kritis = pembeli langsung terdampak / ada risiko keamanan. */
  kritis: boolean;
};

export type MasukanKesiapan = {
  whatsapp: string;
  alamat: string;
  rekeningLengkap: boolean;
  jedaMinimumMenit: number;
  menuAktif: number;
  menuBerfoto: number;
  /** Hasil periksaPenyimpanan(): "supabase" | "lokal" = sehat. */
  penyimpanan: string;
  /** Hanya diketahui saat login (lihat sandiLemah) — undefined = tidak diketahui. */
  sandiBawaan?: boolean;
};

export function daftarKesiapan(m: MasukanKesiapan): ButirKesiapan[] {
  const penyimpananSehat = m.penyimpanan === "supabase" || m.penyimpanan === "lokal";
  const butir: ButirKesiapan[] = [];

  if (m.sandiBawaan) {
    butir.push({
      kunci: "sandi",
      judul: "Ganti kata sandi bawaan",
      keterangan: "Akun ini masih memakai sandi contoh yang tertulis di dokumentasi. Siapa pun bisa menebaknya.",
      beres: false,
      href: "/admin/pengaturan#ganti-sandi",
      kritis: true,
    });
  }

  butir.push(
    {
      kunci: "penyimpanan",
      judul: "Penyimpanan foto & bukti transfer",
      keterangan: penyimpananSehat
        ? "Unggahan foto menu dan bukti transfer berfungsi."
        : `Unggahan ditolak (status: ${m.penyimpanan}). Isi SUPABASE_SERVICE_ROLE_KEY di Vercel lalu redeploy.`,
      beres: penyimpananSehat,
      href: "/api/health",
      kritis: true,
    },
    {
      kunci: "whatsapp",
      judul: "Nomor WhatsApp dapur",
      keterangan: m.whatsapp.trim() ? "Pembeli bisa chat & menerima kabar pesanan." : "Tanpa ini tombol chat & konsultasi tidak muncul.",
      beres: Boolean(m.whatsapp.trim()),
      href: "/admin/pengaturan",
      kritis: true,
    },
    {
      kunci: "rekening",
      judul: "Rekening untuk transfer",
      keterangan: m.rekeningLengkap ? "Pembayaran transfer aktif." : "Selama kosong, pembeli hanya bisa bayar tunai.",
      beres: m.rekeningLengkap,
      href: "/admin/pengaturan",
      kritis: false,
    },
    {
      kunci: "alamat",
      judul: "Alamat dapur",
      keterangan: m.alamat.trim() ? "Tampil di kaki halaman & untuk ambil sendiri." : "Pembeli yang ambil sendiri tidak tahu harus ke mana.",
      beres: Boolean(m.alamat.trim()),
      href: "/admin/pengaturan",
      kritis: false,
    },
    {
      kunci: "jeda",
      judul: "Jeda persiapan pesanan hari-H",
      keterangan:
        m.jedaMinimumMenit > 0
          ? "Beranda menampilkan jam siap tercepat yang jujur."
          : "Isi supaya pesanan mendadak tidak masuk & beranda bisa menampilkan “siap tercepat”.",
      beres: m.jedaMinimumMenit > 0,
      href: "/admin/pengaturan",
      kritis: false,
    },
    {
      kunci: "foto",
      judul: "Foto untuk semua menu aktif",
      keterangan:
        m.menuAktif === 0
          ? "Belum ada menu aktif."
          : `${m.menuBerfoto} dari ${m.menuAktif} menu sudah berfoto. Pembeli katering memutuskan lewat mata.`,
      beres: m.menuAktif > 0 && m.menuBerfoto >= m.menuAktif,
      href: "/admin/menu",
      kritis: false,
    }
  );

  // Yang kritis & belum beres selalu di atas.
  return butir.sort((a, b) => Number(a.beres) - Number(b.beres) || Number(b.kritis) - Number(a.kritis));
}

/**
 * Sandi yang wajib diganti: sandi contoh dari seed/dokumentasi, atau nomor HP
 * pemiliknya sendiri. Diperiksa saat login (satu-satunya saat sandi asli
 * terlihat server) — hash tidak bisa dibandingkan belakangan.
 */
const SANDI_CONTOH = new Set(["citarasa123", "dapur123", "password", "12345678", "admin123"]);

/** Sandi contoh dari dokumentasi/seed atau yang paling umum ditebak. */
export function sandiContohUmum(sandi: string): boolean {
  return SANDI_CONTOH.has(sandi.trim().toLowerCase());
}

export function sandiLemah(sandi: string, teleponNormal: string): boolean {
  if (sandiContohUmum(sandi)) return true;
  const digit = sandi.replace(/\D/g, "");
  if (digit.length >= 8 && (teleponNormal.endsWith(digit) || ("62" + digit.replace(/^0/, "")) === teleponNormal)) return true;
  return false;
}
