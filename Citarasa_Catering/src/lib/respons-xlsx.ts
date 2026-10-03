import { NextResponse } from "next/server";
import type ExcelJS from "exceljs";

export const TIPE_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Respons unduhan XLSX: tidak di-cache (berisi data keuangan) dan tidak boleh di-sniff. */
export function responsBerkasXlsx(isi: Buffer | Uint8Array, namaBerkas: string): NextResponse {
  return new NextResponse(new Uint8Array(isi), {
    status: 200,
    headers: {
      "Content-Type": TIPE_XLSX,
      // namaBerkas selalu dari namaBerkasAman / regex — tanpa kutip atau baris baru.
      "Content-Disposition": `attachment; filename="${namaBerkas}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function responsWorkbook(wb: ExcelJS.Workbook, namaBerkas: string): Promise<NextResponse> {
  return responsBerkasXlsx(Buffer.from(await wb.xlsx.writeBuffer()), namaBerkas);
}
