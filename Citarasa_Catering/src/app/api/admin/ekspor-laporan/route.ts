import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { wajibPemilik } from "@/lib/auth";
import { rentangBulan } from "@/lib/laporan";
import { amankanCsv, hariIniWib, kunciHari } from "@/lib/format";

export async function GET(request: Request) {
  try {
    await wajibPemilik();
  } catch {
    return new NextResponse("Tidak berwenang. Silakan login sebagai pemilik.", {
      status: 401,
    });
  }

  const { searchParams } = new URL(request.url);
  const sekarangWib = hariIniWib();
  const diminta = searchParams.get("bulan");

  // Nilainya ikut masuk ke kueri tanggal dan ke nama berkas di header balasan.
  // "2026-13" menghasilkan Date tidak sah yang membuat Prisma melempar, dan
  // tanda kutip di dalamnya merusak header Content-Disposition.
  const bulan =
    diminta && /^\d{4}-(0[1-9]|1[0-2])$/.test(diminta)
      ? diminta
      : sekarangWib.slice(0, 7);

  const rentang = rentangBulan(bulan);

  const dataKas = await db.catatanKas.findMany({
    where: {
      tanggal: rentang,
    },
    include: {
      pesanan: true,
    },
    orderBy: {
      tanggal: "asc",
    },
  });

  // Susun baris CSV
  const barisCsv: string[] = [];
  barisCsv.push("Tanggal,Jenis,Kategori,Keterangan,Jumlah (Rp),Kode Pesanan,Nama Pemesan");

  for (const row of dataKas) {
    const tanggalTeks = kunciHari(row.tanggal);
    const jenis = row.jenis;
    const kategori = amankanCsv(row.kategori);
    const keterangan = amankanCsv(row.keterangan);
    const jumlah = row.jumlah;
    const kodePesanan = amankanCsv(row.pesanan?.kode);
    const namaPemesan = amankanCsv(row.pesanan?.namaPemesan);

    barisCsv.push(
      `${tanggalTeks},${jenis},${kategori},${keterangan},${jumlah},${kodePesanan},${namaPemesan}`
    );
  }

  const csvKonten = "\uFEFF" + barisCsv.join("\r\n"); // UTF-8 BOM agar rapi di Microsoft Excel

  return new NextResponse(csvKonten, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="laporan-kas-citarasa-${bulan}.csv"`,
    },
  });
}

