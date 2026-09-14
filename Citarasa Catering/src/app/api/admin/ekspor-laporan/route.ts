import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { wajibPemilik } from "@/lib/auth";
import { rentangBulan } from "@/lib/laporan";
import { hariIniWib, kunciHari } from "@/lib/format";

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
  const bulan = searchParams.get("bulan") || sekarangWib.slice(0, 7);

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
    const kategori = `"${row.kategori.replace(/"/g, '""')}"`;
    const keterangan = `"${row.keterangan.replace(/"/g, '""')}"`;
    const jumlah = row.jumlah;
    const kodePesanan = row.pesanan?.kode || "-";
    const namaPemesan = row.pesanan ? `"${row.pesanan.namaPemesan.replace(/"/g, '""')}"` : "-";

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

