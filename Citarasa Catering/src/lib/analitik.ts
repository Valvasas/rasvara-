import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { dariInputTanggal, hariIniWib, kunciHari } from "@/lib/format";
import { rapikanPath } from "@/lib/analitik-path";
import type { JenisPeristiwa } from "@/generated/prisma/client";

/**
 * Garam harian untuk menyidik pengunjung.
 *
 * Nilainya acak, hanya hidup di memori proses, dan tidak pernah ditulis ke
 * database maupun berkas. Begitu harinya berganti, garamnya diganti dan yang
 * lama hilang selamanya — sehingga sidik kemarin tidak bisa dicocokkan dengan
 * sidik hari ini, dan tidak ada jalan untuk mengembalikan sidik menjadi alamat
 * IP. Inilah yang membuat statistik ini tidak memerlukan persetujuan cookie.
 */
let garamCache: { tanggal: string; nilai: string } | null = null;

function garamHarian(): string {
  const hariIni = hariIniWib();
  if (!garamCache || garamCache.tanggal !== hariIni) {
    garamCache = { tanggal: hariIni, nilai: randomBytes(32).toString("hex") };
  }
  return garamCache.nilai;
}

/*
  Pencatatan ditampung di memori dulu, lalu disetor berkala.

  Sebelumnya tiap tampilan halaman menulis langsung ke database sambil ditunggu
  oleh layout, sehingga pembeli baru melihat halaman setelah dua perjalanan ke
  database selesai. Lebih buruk lagi, semua pengunjung halaman yang sama menimpa
  SATU baris `kunjunganHarian` yang sama — Postgres mengunci baris itu per
  penulisan, jadi seratus pengunjung serentak berbaris menunggu giliran dan
  halaman ikut melambat bersama antreannya.

  Dengan penampung ini, seratus tampilan halaman yang sama menjadi satu
  penambahan angka di memori dan satu penulisan saat disetor.
*/

const JEDA_SETOR_MS = 10_000;

/** Penjaga memori kalau database sedang tidak bisa dihubungi berkepanjangan. */
const MAKS_PENAMPUNG = 10_000;

const penampungTampilan = new Map<string, number>();
const penampungPengunjung = new Set<string>();
const penampungPeristiwa = new Map<string, number>();

let pengaturSetor: ReturnType<typeof setTimeout> | null = null;

function jadwalkanSetor(): void {
  if (pengaturSetor) return;
  pengaturSetor = setTimeout(() => {
    pengaturSetor = null;
    void setorAnalitik();
  }, JEDA_SETOR_MS);
  pengaturSetor.unref?.();
}

/**
 * Menyetor seluruh penampung ke database. Penampung dikosongkan lebih dulu
 * supaya kunjungan yang datang saat penyetoran berlangsung tidak ikut terhapus
 * bila penyetorannya gagal.
 */
async function setorAnalitik(): Promise<void> {
  if (
    penampungTampilan.size === 0 &&
    penampungPengunjung.size === 0 &&
    penampungPeristiwa.size === 0
  ) {
    return;
  }

  const tampilan = [...penampungTampilan.entries()];
  const pengunjung = [...penampungPengunjung];
  const peristiwa = [...penampungPeristiwa.entries()];
  penampungTampilan.clear();
  penampungPengunjung.clear();
  penampungPeristiwa.clear();

  try {
    await Promise.all([
      ...tampilan.map(([kunci, jumlah]) => {
        const [hari, path] = pisah(kunci);
        const tanggal = dariInputTanggal(hari);
        return db.kunjunganHarian.upsert({
          where: { tanggal_path: { tanggal, path } },
          create: { tanggal, path, tampilan: jumlah },
          update: { tampilan: { increment: jumlah } },
        });
      }),
      ...pengunjung.map((kunci) => {
        const [hari, sidik] = pisah(kunci);
        const tanggal = dariInputTanggal(hari);
        return db.jejakPengunjung.upsert({
          where: { tanggal_sidik: { tanggal, sidik } },
          create: { tanggal, sidik },
          update: {},
        });
      }),
      ...peristiwa.map(([kunci, jumlah]) => {
        const [hari, jenis] = pisah(kunci);
        const tanggal = dariInputTanggal(hari);
        return db.peristiwaAnalitik.upsert({
          where: { tanggal_jenis: { tanggal, jenis: jenis as JenisPeristiwa } },
          create: { tanggal, jenis: jenis as JenisPeristiwa, jumlah },
          update: { jumlah: { increment: jumlah } },
        });
      }),
    ]);
  } catch {
    // Database sedang tidak siap: hitungan periode ini dilepas. Statistik boleh
    // kehilangan sedikit angka, halaman pembeli tidak boleh ikut gagal.
  }
}

function pisah(kunci: string): [string, string] {
  const batas = kunci.indexOf("|");
  return [kunci.slice(0, batas), kunci.slice(batas + 1)];
}

function tambah(penampung: Map<string, number>, kunci: string): void {
  if (!penampung.has(kunci) && penampung.size >= MAKS_PENAMPUNG) return;
  penampung.set(kunci, (penampung.get(kunci) ?? 0) + 1);
  jadwalkanSetor();
}

// Setor sisa hitungan saat proses diberhentikan dengan tertib (mis. `docker stop`).
if (typeof process !== "undefined" && typeof process.once === "function") {
  for (const sinyal of ["SIGTERM", "SIGINT", "beforeExit"] as const) {
    process.once(sinyal, () => {
      void setorAnalitik();
    });
  }
}

/**
 * Mencatat satu kunjungan halaman. Dipanggil dari layout toko, dan sengaja
 * tidak pernah melempar error: statistik tidak boleh menjatuhkan halaman yang
 * sedang dilihat pembeli.
 */
export async function catatKunjungan(): Promise<void> {
  try {
    const daftarHeader = await headers();
    const pathMentah = daftarHeader.get("x-lokasi-halaman");
    if (!pathMentah) return;

    const path = rapikanPath(pathMentah);
    if (!path) return;

    const hari = hariIniWib();

    const ip =
      daftarHeader.get("x-forwarded-for")?.split(",")[0].trim() ||
      daftarHeader.get("x-real-ip")?.trim() ||
      "tanpa-ip";
    const agen = daftarHeader.get("user-agent") ?? "tanpa-agen";

    const sidik = createHash("sha256")
      .update(`${ip}|${agen}|${garamHarian()}`)
      .digest("hex");

    tambah(penampungTampilan, `${hari}|${path}`);

    if (penampungPengunjung.size < MAKS_PENAMPUNG) {
      penampungPengunjung.add(`${hari}|${sidik}`);
      jadwalkanSetor();
    }
  } catch {
    // Di luar konteks request: lewati pencatatan tanpa mengganggu halaman.
  }
}

/** Menambah hitungan satu peristiwa corong pemesanan. */
export async function catatPeristiwa(jenis: JenisPeristiwa): Promise<void> {
  tambah(penampungPeristiwa, `${hariIniWib()}|${jenis}`);
}

export interface BarisHarian {
  tanggal: string;
  label: string;
  tampilan: number;
  pengunjung: number;
}

export interface RingkasanAnalitik {
  harian: BarisHarian[];
  totalTampilan: number;
  totalPengunjung: number;
  rerataTampilanHarian: number;
  puncakTampilan: number;
  halamanTeratas: { path: string; tampilan: number }[];
  peristiwa: Record<JenisPeristiwa, number>;
  adaData: boolean;
}

const LABEL_HARI_SINGKAT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

/**
 * Menyusun laporan performa untuk rentang beberapa hari terakhir.
 * Semua agregasi dilakukan di database, bukan dengan menarik seluruh baris ke
 * memori, supaya tetap ringan saat data sudah menumpuk bertahun-tahun.
 */
export async function ringkasanAnalitik(
  jumlahHari: number
): Promise<RingkasanAnalitik> {
  const kosong: RingkasanAnalitik = {
    harian: [],
    totalTampilan: 0,
    totalPengunjung: 0,
    rerataTampilanHarian: 0,
    puncakTampilan: 0,
    halamanTeratas: [],
    peristiwa: {
      MENU_DILIHAT: 0,
      FORM_PESAN_DIBUKA: 0,
      PESANAN_DIBUAT: 0,
      LACAK_DIPAKAI: 0,
    },
    adaData: false,
  };

  try {
    // Pemilik harus melihat angka hari ini, bukan angka sepuluh detik lalu.
    await setorAnalitik();

    const hariIni = dariInputTanggal(hariIniWib());
    const mulai = new Date(hariIni);
    mulai.setUTCDate(mulai.getUTCDate() - (jumlahHari - 1));

    const [kunjungan, pengunjung, peristiwa] = await Promise.all([
      db.kunjunganHarian.groupBy({
        by: ["tanggal"],
        where: { tanggal: { gte: mulai, lte: hariIni } },
        _sum: { tampilan: true },
      }),
      db.jejakPengunjung.groupBy({
        by: ["tanggal"],
        where: { tanggal: { gte: mulai, lte: hariIni } },
        _count: { _all: true },
      }),
      db.peristiwaAnalitik.groupBy({
        by: ["jenis"],
        where: { tanggal: { gte: mulai, lte: hariIni } },
        _sum: { jumlah: true },
      }),
    ]);

    const halamanTeratasMentah = await db.kunjunganHarian.groupBy({
      by: ["path"],
      where: { tanggal: { gte: mulai, lte: hariIni } },
      _sum: { tampilan: true },
      orderBy: { _sum: { tampilan: "desc" } },
      take: 8,
    });

    const petaTampilan = new Map(
      kunjungan.map((k) => [kunciHari(k.tanggal), k._sum.tampilan ?? 0])
    );
    const petaPengunjung = new Map(
      pengunjung.map((p) => [kunciHari(p.tanggal), p._count._all])
    );

    const harian: BarisHarian[] = [];
    for (let i = 0; i < jumlahHari; i++) {
      const hari = new Date(mulai);
      hari.setUTCDate(hari.getUTCDate() + i);
      const kunci = kunciHari(hari);
      harian.push({
        tanggal: kunci,
        label: `${LABEL_HARI_SINGKAT[hari.getUTCDay()]} ${Number(kunci.slice(8, 10))}`,
        tampilan: petaTampilan.get(kunci) ?? 0,
        pengunjung: petaPengunjung.get(kunci) ?? 0,
      });
    }

    const totalTampilan = harian.reduce((a, b) => a + b.tampilan, 0);
    const totalPengunjung = harian.reduce((a, b) => a + b.pengunjung, 0);

    const hitungPeristiwa = { ...kosong.peristiwa };
    for (const p of peristiwa) {
      hitungPeristiwa[p.jenis] = p._sum.jumlah ?? 0;
    }

    return {
      harian,
      totalTampilan,
      totalPengunjung,
      rerataTampilanHarian: Math.round(totalTampilan / jumlahHari),
      puncakTampilan: harian.reduce((a, b) => Math.max(a, b.tampilan), 0),
      halamanTeratas: halamanTeratasMentah.map((h) => ({
        path: h.path,
        tampilan: h._sum.tampilan ?? 0,
      })),
      peristiwa: hitungPeristiwa,
      adaData: totalTampilan > 0,
    };
  } catch {
    return kosong;
  }
}
