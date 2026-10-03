import path from "node:path";
import { mkdir, rename, stat, writeFile } from "node:fs/promises";
import { db } from "@/lib/db";
import { hariIniWib } from "@/lib/format";
import { bulanSebelumnya, POLA_BULAN } from "@/lib/bulan";
import { ambilPengaturan, lupakanSinggahanPengaturan } from "@/lib/pengaturan";
import { catatAktivitas } from "@/lib/log-aktivitas";
import { kumpulkanDataRekap } from "@/lib/rekap-data";
import { susunWorkbook } from "@/lib/rekap-xlsx";

/*
  Tugas otomatis yang dijalankan cron server lewat POST /api/tugas/jalankan.
  Setiap tugas IDEMPOTEN: dipanggil dua kali berturut-turut tidak menggandakan
  apa pun, karena cron bisa saja terlambat, dobel, atau diulang manual.
*/

export function direktoriLaporan(): string {
  const disetel = process.env.DIREKTORI_LAPORAN?.trim();
  return disetel ? path.resolve(disetel) : path.join(process.cwd(), "data", "laporan");
}

/** Nama berkas arsip hanya dibentuk dari bulan yang lolos regex — tidak pernah dari input mentah. */
export function berkasArsip(bulan: string): string {
  if (!POLA_BULAN.test(bulan)) throw new Error("Bulan tidak sah");
  return path.join(direktoriLaporan(), `rekap-${bulan}.xlsx`);
}

async function adaBerkas(p: string): Promise<boolean> {
  try {
    return (await stat(p)).isFile();
  } catch {
    return false;
  }
}

/** Buat (atau buat ulang bila berkasnya hilang) arsip rekap satu bulan. */
export async function arsipkanRekap(bulan: string, paksa = false): Promise<"dibuat" | "sudah_ada"> {
  const tujuan = berkasArsip(bulan);
  const ada = await db.rekapBulanan.findUnique({ where: { bulan } });
  if (ada && !paksa && (await adaBerkas(tujuan))) return "sudah_ada";

  const wb = susunWorkbook(await kumpulkanDataRekap(bulan));
  const isi = Buffer.from(await wb.xlsx.writeBuffer());
  await mkdir(direktoriLaporan(), { recursive: true });
  // Tulis ke berkas sementara lalu rename: pengunduh tidak pernah melihat berkas setengah jadi.
  const sementara = `${tujuan}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(sementara, isi, { mode: 0o640 });
  await rename(sementara, tujuan);

  await db.rekapBulanan.upsert({
    where: { bulan },
    create: { bulan, berkas: path.basename(tujuan), ukuran: isi.length },
    update: { berkas: path.basename(tujuan), ukuran: isi.length, dibuatPada: new Date() },
  });
  return "dibuat";
}

const BATCH_BATAL = 200;

/**
 * Batalkan pesanan transfer dari website yang belum dibayar sama sekali
 * (tanpa bukti, tanpa DP) setelah `batasJam` sejak dibuat. Pesanan dari
 * WA/telepon tidak disentuh: itu dicatat pemilik sendiri dan disepakati lisan.
 */
export async function batalkanTanpaBayar(batasJam: number): Promise<string[]> {
  if (batasJam <= 0) return [];
  const batas = new Date(Date.now() - batasJam * 3_600_000);
  const kandidat = await db.pesanan.findMany({
    where: {
      status: "BARU",
      sumber: "WEBSITE",
      caraBayar: "TRANSFER",
      statusBayar: "BELUM_BAYAR",
      dibayar: 0,
      buktiBayarUrl: null,
      dibuatPada: { lt: batas },
    },
    select: { id: true, kode: true, voucherId: true },
    orderBy: { dibuatPada: "asc" },
    take: BATCH_BATAL,
  });

  const alasan = `Dibatalkan otomatis: belum ada pembayaran dalam ${batasJam} jam. Silakan pesan ulang bila masih membutuhkan.`;
  const dibatalkan: string[] = [];
  for (const p of kandidat) {
    const ok = await db.$transaction(async (tx) => {
      // Syarat diulang di klausa where: bila bukti/pembayaran masuk sesaat sebelumnya, baris ini dilewati.
      const r = await tx.pesanan.updateMany({
        where: { id: p.id, status: "BARU", statusBayar: "BELUM_BAYAR", dibayar: 0, buktiBayarUrl: null },
        data: { status: "DIBATALKAN", alasanBatal: alasan },
      });
      if (r.count === 0) return false;
      if (p.voucherId) {
        await tx.voucher.updateMany({ where: { id: p.voucherId, terpakai: { gt: 0 } }, data: { terpakai: { decrement: 1 } } });
      }
      await tx.riwayatStatus.create({ data: { pesananId: p.id, dari: "BARU", ke: "DIBATALKAN", catatan: alasan } });
      await catatAktivitas({ aksi: "batal_otomatis", target: p.kode, rincian: `Lewat ${batasJam} jam tanpa pembayaran` }, tx);
      return true;
    });
    if (ok) dibatalkan.push(p.kode);
  }
  return dibatalkan;
}

export interface HasilTugas {
  arsip: { bulan: string; hasil: "dibuat" | "sudah_ada" | "gagal" };
  dibatalkan: string[];
  waktu: string;
}

export async function jalankanTugas(): Promise<HasilTugas> {
  // Baca langsung dari database, bukan singgahan: di PM2 cluster tiap proses punya
  // singgahan sendiri, dan pembatalan otomatis tidak boleh memakai batas waktu basi.
  const pengaturan = (await db.pengaturan.findUnique({ where: { id: "utama" } })) ?? (await ambilPengaturan());
  const bulanLalu = bulanSebelumnya(hariIniWib().slice(0, 7));

  let arsip: HasilTugas["arsip"];
  try {
    arsip = { bulan: bulanLalu, hasil: await arsipkanRekap(bulanLalu) };
  } catch (e) {
    console.error("[tugas] arsip rekap gagal", e);
    arsip = { bulan: bulanLalu, hasil: "gagal" };
  }

  const dibatalkan = await batalkanTanpaBayar(pengaturan.batasBayarJam);

  const sekarang = new Date();
  await db.pengaturan.update({ where: { id: "utama" }, data: { tugasTerakhir: sekarang } });
  lupakanSinggahanPengaturan();

  // Log hanya bila ada yang terjadi — cron tiap 15 menit tidak boleh membanjiri log.
  if (arsip.hasil === "dibuat" || dibatalkan.length) {
    await catatAktivitas({
      aksi: "tugas_otomatis",
      rincian: [arsip.hasil === "dibuat" ? `arsip rekap ${bulanLalu}` : "", dibatalkan.length ? `${dibatalkan.length} pesanan dibatalkan otomatis` : ""]
        .filter(Boolean)
        .join("; "),
    });
  }
  return { arsip, dibatalkan, waktu: sekarang.toISOString() };
}
