/*
  Penyusun berkas Excel (XLSX) — fungsi murni: menerima data yang sudah
  dikumpulkan, mengembalikan Workbook. Tidak menyentuh database supaya bisa
  diuji dengan membaca balik berkasnya.

  Prinsip tampilan untuk pemilik usaha (bukan akuntan):
  - Lembar pertama langsung menjawab "bulan ini bagaimana?".
  - Angka uang selalu berformat Rupiah asli Excel (bisa dijumlah ulang), tanggal
    berupa tanggal Excel asli (bisa disaring/diurutkan), bukan teks.
  - Baris total & saldo memakai RUMUS, bukan angka mati, supaya bisa diaudit.
  - Header dibekukan, ada saringan otomatis, dan siap dicetak landscape.
*/
import ExcelJS from "exceljs";

export const FORMAT_RUPIAH = '"Rp"#,##0;[Red]-"Rp"#,##0';
const FORMAT_TANGGAL = "d mmm yyyy";
const FORMAT_PERSEN = "0%";

// Palet sama dengan situs (krem/bata/kayu) — lembut, kontras teks tetap AA.
const WARNA = {
  judul: "FF9E3714", // bata-tua
  teks: "FF2B211B", // kayu
  redup: "FF6B5C52", // kayu-sedang
  header: "FFF7F1E8", // krem-tua
  garis: "FFE9DFD1", // krem-gelap
  total: "FFFCEDE5", // bata-lembut
};

// ------------------------------------------------------------------- Tipe

export interface KpiRekap {
  nilaiPesananSelesai: number;
  pesananSelesai: number;
  pesananBatal: number;
  porsiSelesai: number;
  kasMasuk: number;
  kasKeluar: number;
}

export interface DataRekap {
  bulan: string; // "2026-09"
  labelBulan: string; // "September 2026"
  labelBulanLalu: string;
  namaUsaha: string;
  dibuatPada: Date;
  kpi: KpiRekap;
  kpiLalu: KpiRekap;
  pengeluaranKategori: { kategori: string; jumlah: number }[];
  harian: { tanggal: string; pesanan: number; porsi: number; nilai: number; kasMasuk: number; kasKeluar: number }[];
  pesanan: {
    kode: string;
    tanggalAcara: string;
    jamAcara: string;
    namaPemesan: string;
    telepon: string;
    sumber: string;
    status: string;
    statusBayar: string;
    caraBayar: string;
    subtotal: number;
    diskon: number;
    ongkir: number;
    total: number;
    dibayar: number;
  }[];
  menu: { nama: string; porsi: number; omzet: number; hpp: number | null; laba: number | null; margin: number | null; catatan: string }[];
  saldoAwal: number;
  kas: { tanggal: string; jenis: "MASUK" | "KELUAR"; kategori: string; keterangan: string; kodePesanan: string; jumlah: number }[];
  piutang: { kode: string; namaPemesan: string; telepon: string; tanggalAcara: string; total: number; dibayar: number; umur: string }[];
  pelangganTeratas: { nama: string; telepon: string; pesanan: number; total: number }[];
}

// ---------------------------------------------------------------- Pembantu

/**
 * Teks dari pengguna (nama, keterangan) tidak boleh terbaca sebagai rumus bila
 * berkas disimpan ulang sebagai CSV atau sel diedit. Sel tetap bertipe teks;
 * awalan berbahaya diberi tanda kutip tunggal, sama seperti ekspor CSV.
 */
export function teksAman(nilai: string | null | undefined): string {
  if (!nilai) return "";
  // Karakter kontrol tidak sah di XML/XLSX dan membuat Excel menolak berkas — sengaja dibuang.
  // eslint-disable-next-line no-control-regex
  const t = nilai.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").slice(0, 32_000);
  return /^[=+\-@\t\r]/.test(t) ? `'${t}` : t;
}

/** "2026-09-12" → Date tengah malam UTC: Excel menampilkannya tepat 12 Sep, tanpa geser zona. */
export function tanggalExcel(kunci: string): Date {
  const [t, b, h] = kunci.split("-").map(Number);
  return new Date(Date.UTC(t, b - 1, h));
}

const NAMA_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function judulLembar(ws: ExcelJS.Worksheet, judul: string, sub: string, lebarKolom: number) {
  ws.mergeCells(1, 1, 1, lebarKolom);
  ws.mergeCells(2, 1, 2, lebarKolom);
  const a = ws.getCell(1, 1);
  a.value = judul;
  a.font = { bold: true, size: 14, color: { argb: WARNA.judul } };
  const b = ws.getCell(2, 1);
  b.value = sub;
  b.font = { size: 10, color: { argb: WARNA.redup } };
  ws.getRow(1).height = 22;
}

interface Kolom {
  judul: string;
  lebar: number;
  format?: string;
  rataKanan?: boolean;
}

/** Tulis header tabel pada baris `baris`; kembalikan nomor baris pertama data. */
function header(ws: ExcelJS.Worksheet, baris: number, kolom: Kolom[], kolomAwal = 1): number {
  const r = ws.getRow(baris);
  kolom.forEach((k, i) => {
    const c = r.getCell(kolomAwal + i);
    c.value = k.judul;
    c.font = { bold: true, color: { argb: WARNA.teks } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WARNA.header } };
    c.border = { bottom: { style: "thin", color: { argb: WARNA.garis } } };
    c.alignment = { vertical: "middle", horizontal: k.rataKanan || k.format ? "right" : "left", wrapText: true };
  });
  r.height = 20;
  return baris + 1;
}

function aturKolom(ws: ExcelJS.Worksheet, kolom: Kolom[]) {
  kolom.forEach((k, i) => {
    const c = ws.getColumn(i + 1);
    c.width = k.lebar;
    if (k.format) c.numFmt = k.format;
  });
}

function barisTotal(r: ExcelJS.Row, dariKolom: number, sampaiKolom: number) {
  for (let i = dariKolom; i <= sampaiKolom; i++) {
    const c = r.getCell(i);
    c.font = { bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WARNA.total } };
    c.border = { top: { style: "thin", color: { argb: WARNA.garis } } };
  }
}

function siapCetak(ws: ExcelJS.Worksheet, barisHeader: number) {
  ws.pageSetup = {
    orientation: "landscape",
    paperSize: 9, // A4
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    printTitlesRow: `${barisHeader}:${barisHeader}`,
  };
  ws.headerFooter = { oddFooter: "&L&8&A&R&8Halaman &P dari &N" };
}

function lembarTabel(
  wb: ExcelJS.Workbook,
  nama: string,
  judul: string,
  sub: string,
  kolom: Kolom[],
  isi: (ExcelJS.CellValue | null)[][],
  opsi: { total?: (jml: (kol: number) => ExcelJS.CellFormulaValue, barisAkhir: number) => (ExcelJS.CellValue | null)[]; kosong?: string } = {}
) {
  const ws = wb.addWorksheet(nama, { views: [{ state: "frozen", ySplit: 4, xSplit: 0 }], properties: { defaultRowHeight: 18 } });
  aturKolom(ws, kolom);
  judulLembar(ws, judul, sub, kolom.length);
  const awal = header(ws, 4, kolom);
  if (isi.length === 0) {
    ws.getCell(awal, 1).value = opsi.kosong ?? "Tidak ada data pada bulan ini.";
    ws.getCell(awal, 1).font = { italic: true, color: { argb: WARNA.redup } };
  } else {
    isi.forEach((b, i) => isiBaris(ws.getRow(awal + i), [...b]));
    const akhir = awal + isi.length - 1;
    ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: akhir, column: kolom.length } };
    if (opsi.total) {
      const r = ws.getRow(akhir + 1);
      const jml = (kol: number): ExcelJS.CellFormulaValue => ({
        formula: `SUM(${huruf(kol)}${awal}:${huruf(kol)}${akhir})`,
        result: isi.reduce((n, b) => n + nilaiSel(b[kol - 1]), 0),
      });
      isiBaris(r, [...opsi.total(jml, akhir)]);
      barisTotal(r, 1, kolom.length);
    }
  }
  siapCetak(ws, 4);
  return ws;
}

/** Isi sel mulai kolom 1 (ExcelJS memakai indeks 1, jadi `row.values = [...]` butuh slot kosong di depan). */
function isiBaris(r: ExcelJS.Row, nilai: (ExcelJS.CellValue | null)[]) {
  nilai.forEach((v, i) => {
    r.getCell(i + 1).value = v;
  });
}

const huruf = (n: number) => String.fromCharCode(64 + n);
/**
 * Rumus + hasilnya. Hasil disimpan di berkas karena pratinjau di ponsel (WA, Drive,
 * Files) tidak menghitung rumus — tanpa hasil tersimpan, total tampil kosong.
 */
const R = (formula: string, result: number | string): ExcelJS.CellFormulaValue => ({ formula, result });

function nilaiSel(v: ExcelJS.CellValue | null | undefined): number {
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && "result" in v && typeof v.result === "number") return v.result;
  return 0;
}

const persenUbah = (a: number, b: number) => (b === 0 ? "" : (a - b) / Math.abs(b));
const SUM = (kol: number, a: number, b: number, hasil: number): ExcelJS.CellFormulaValue => R(`SUM(${huruf(kol)}${a}:${huruf(kol)}${b})`, hasil);

// -------------------------------------------------------- Rekap bulanan

export function susunWorkbook(d: DataRekap): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = d.namaUsaha;
  wb.title = `Rekap ${d.labelBulan}`;
  wb.created = d.dibuatPada;
  // Excel/LibreOffice tetap menghitung ulang semua rumus saat berkas dibuka.
  wb.calcProperties.fullCalcOnLoad = true;
  const sub = `${d.namaUsaha} · data asli dari sistem, dibuat ${d.dibuatPada.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" })} WIB`;

  // ---------------- Ringkasan
  {
    const ws = wb.addWorksheet("Ringkasan", { properties: { defaultRowHeight: 18 } });
    ws.columns = [{ width: 34 }, { width: 18 }, { width: 18 }, { width: 14 }];
    judulLembar(ws, `Rekap Bulanan — ${d.labelBulan}`, sub, 4);

    let r = header(ws, 4, [
      { judul: "Indikator", lebar: 34 },
      { judul: d.labelBulan, lebar: 18, rataKanan: true },
      { judul: d.labelBulanLalu, lebar: 18, rataKanan: true },
      { judul: "Perubahan", lebar: 14, rataKanan: true },
    ]);
    const rataRata = (k: KpiRekap) => (k.pesananSelesai ? Math.round(k.nilaiPesananSelesai / k.pesananSelesai) : 0);
    const kpi: [string, number, number, string][] = [
      ["Nilai pesanan selesai", d.kpi.nilaiPesananSelesai, d.kpiLalu.nilaiPesananSelesai, FORMAT_RUPIAH],
      ["Jumlah pesanan selesai", d.kpi.pesananSelesai, d.kpiLalu.pesananSelesai, "#,##0"],
      ["Rata-rata nilai per pesanan", rataRata(d.kpi), rataRata(d.kpiLalu), FORMAT_RUPIAH],
      ["Porsi terjual", d.kpi.porsiSelesai, d.kpiLalu.porsiSelesai, "#,##0"],
      ["Pesanan dibatalkan", d.kpi.pesananBatal, d.kpiLalu.pesananBatal, "#,##0"],
      ["Kas masuk", d.kpi.kasMasuk, d.kpiLalu.kasMasuk, FORMAT_RUPIAH],
      ["Kas keluar", d.kpi.kasKeluar, d.kpiLalu.kasKeluar, FORMAT_RUPIAH],
    ];
    const barisKpi = r;
    for (const [label, a, b, fmt] of kpi) {
      const row = ws.getRow(r);
      isiBaris(row, [label, a, b, R(`IF(C${r}=0,"",(B${r}-C${r})/ABS(C${r}))`, persenUbah(a, b))]);
      row.getCell(2).numFmt = fmt;
      row.getCell(3).numFmt = fmt;
      row.getCell(4).numFmt = '+0%;-0%;0%';
      r++;
    }
    // Selisih kas sebagai rumus dari dua baris di atasnya.
    const masuk = barisKpi + 5;
    const keluar = barisKpi + 6;
    const rs = ws.getRow(r);
    const selisih = d.kpi.kasMasuk - d.kpi.kasKeluar;
    const selisihLalu = d.kpiLalu.kasMasuk - d.kpiLalu.kasKeluar;
    isiBaris(rs, [
      "Selisih kas (masuk − keluar)",
      R(`B${masuk}-B${keluar}`, selisih),
      R(`C${masuk}-C${keluar}`, selisihLalu),
      R(`IF(C${r}=0,"",(B${r}-C${r})/ABS(C${r}))`, persenUbah(selisih, selisihLalu)),
    ]);
    rs.getCell(2).numFmt = FORMAT_RUPIAH;
    rs.getCell(3).numFmt = FORMAT_RUPIAH;
    rs.getCell(4).numFmt = '+0%;-0%;0%';
    barisTotal(rs, 1, 4);
    r += 2;

    // Pengeluaran per kategori
    ws.getCell(r, 1).value = "Pengeluaran per kategori";
    ws.getCell(r, 1).font = { bold: true, size: 12, color: { argb: WARNA.judul } };
    r = header(ws, r + 1, [
      { judul: "Kategori", lebar: 34 },
      { judul: "Jumlah", lebar: 18, rataKanan: true },
      { judul: "Porsi dari total", lebar: 18, rataKanan: true },
    ]);
    if (d.pengeluaranKategori.length === 0) {
      ws.getCell(r, 1).value = "Belum ada pengeluaran tercatat.";
      ws.getCell(r, 1).font = { italic: true, color: { argb: WARNA.redup } };
      r += 2;
    } else {
      const a = r;
      const b = r + d.pengeluaranKategori.length - 1;
      const totalKeluar = d.pengeluaranKategori.reduce((n, p) => n + p.jumlah, 0);
      for (const p of d.pengeluaranKategori) {
        const row = ws.getRow(r);
        isiBaris(row, [teksAman(p.kategori), p.jumlah, R(`IF(SUM(B$${a}:B$${b})=0,0,B${r}/SUM(B$${a}:B$${b}))`, totalKeluar ? p.jumlah / totalKeluar : 0)]);
        row.getCell(2).numFmt = FORMAT_RUPIAH;
        row.getCell(3).numFmt = FORMAT_PERSEN;
        r++;
      }
      const t = ws.getRow(r);
      isiBaris(t, ["Total", SUM(2, a, b, totalKeluar)]);
      t.getCell(2).numFmt = FORMAT_RUPIAH;
      barisTotal(t, 1, 3);
      r += 2;
    }

    // 10 menu terlaris
    ws.getCell(r, 1).value = "10 menu terlaris (menurut omzet)";
    ws.getCell(r, 1).font = { bold: true, size: 12, color: { argb: WARNA.judul } };
    r = header(ws, r + 1, [
      { judul: "Menu", lebar: 34 },
      { judul: "Porsi", lebar: 18, rataKanan: true },
      { judul: "Omzet", lebar: 18, rataKanan: true },
    ]);
    const teratas = d.menu.slice(0, 10);
    if (teratas.length === 0) {
      ws.getCell(r, 1).value = "Belum ada pesanan selesai.";
      ws.getCell(r, 1).font = { italic: true, color: { argb: WARNA.redup } };
      r++;
    }
    for (const m of teratas) {
      const row = ws.getRow(r);
      isiBaris(row, [teksAman(m.nama), m.porsi, m.omzet]);
      row.getCell(2).numFmt = "#,##0";
      row.getCell(3).numFmt = FORMAT_RUPIAH;
      r++;
    }

    r++;
    const catatan = [
      "Catatan:",
      "• Pesanan dihitung menurut tanggal acaranya; kas menurut tanggal transaksinya. Karena DP bisa masuk sebelum acara, kas masuk tidak selalu sama dengan nilai pesanan selesai.",
      "• Lembar Harian, Kas, dan Piutang memakai rumus (SUM/saldo berjalan) sehingga bisa diperiksa ulang.",
    ];
    for (const c of catatan) {
      ws.mergeCells(r, 1, r, 4);
      const cell = ws.getCell(r, 1);
      cell.value = c;
      cell.alignment = { wrapText: true, vertical: "top" };
      cell.font = { size: 9, color: { argb: WARNA.redup }, bold: c === "Catatan:" };
      ws.getRow(r).height = c.length > 90 ? 30 : 16;
      r++;
    }
    ws.pageSetup = { orientation: "portrait", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  }

  // ---------------- Harian
  lembarTabel(
    wb,
    "Harian",
    `Harian — ${d.labelBulan}`,
    sub,
    [
      { judul: "Tanggal", lebar: 14, format: FORMAT_TANGGAL },
      { judul: "Hari", lebar: 10 },
      { judul: "Pesanan selesai", lebar: 14, format: "#,##0" },
      { judul: "Porsi", lebar: 10, format: "#,##0" },
      { judul: "Nilai pesanan", lebar: 18, format: FORMAT_RUPIAH },
      { judul: "Kas masuk", lebar: 18, format: FORMAT_RUPIAH },
      { judul: "Kas keluar", lebar: 18, format: FORMAT_RUPIAH },
      { judul: "Selisih kas", lebar: 18, format: FORMAT_RUPIAH },
    ],
    d.harian.map((h, i) => {
      const t = tanggalExcel(h.tanggal);
      const baris = 5 + i;
      return [t, NAMA_HARI[t.getUTCDay()], h.pesanan, h.porsi, h.nilai, h.kasMasuk, h.kasKeluar, R(`F${baris}-G${baris}`, h.kasMasuk - h.kasKeluar)];
    }),
    { total: (jml) => ["Total", null, jml(3), jml(4), jml(5), jml(6), jml(7), jml(8)] }
  );

  // ---------------- Pesanan
  lembarTabel(
    wb,
    "Pesanan",
    `Semua pesanan — ${d.labelBulan}`,
    `${sub} · menurut tanggal acara`,
    [
      { judul: "Kode", lebar: 18 },
      { judul: "Tanggal acara", lebar: 14, format: FORMAT_TANGGAL },
      { judul: "Jam", lebar: 7 },
      { judul: "Pemesan", lebar: 24 },
      { judul: "Telepon", lebar: 16 },
      { judul: "Sumber", lebar: 12 },
      { judul: "Status", lebar: 14 },
      { judul: "Pembayaran", lebar: 16 },
      { judul: "Cara bayar", lebar: 11 },
      { judul: "Subtotal", lebar: 15, format: FORMAT_RUPIAH },
      { judul: "Diskon", lebar: 13, format: FORMAT_RUPIAH },
      { judul: "Ongkir", lebar: 13, format: FORMAT_RUPIAH },
      { judul: "Total", lebar: 15, format: FORMAT_RUPIAH },
      { judul: "Dibayar", lebar: 15, format: FORMAT_RUPIAH },
      { judul: "Sisa", lebar: 15, format: FORMAT_RUPIAH },
    ],
    d.pesanan.map((p, i) => [
      p.kode,
      tanggalExcel(p.tanggalAcara),
      p.jamAcara,
      teksAman(p.namaPemesan),
      p.telepon,
      p.sumber,
      p.status,
      p.statusBayar,
      p.caraBayar,
      p.subtotal,
      p.diskon,
      p.ongkir,
      p.total,
      p.dibayar,
      R(`M${5 + i}-N${5 + i}`, p.total - p.dibayar),
    ]),
    { total: (jml) => ["Total", null, null, null, null, null, null, null, null, jml(10), jml(11), jml(12), jml(13), jml(14), jml(15)] }
  );

  // ---------------- Menu & margin
  lembarTabel(
    wb,
    "Menu & margin",
    `Menu & margin — ${d.labelBulan}`,
    `${sub} · pesanan selesai, sebelum diskon & ongkir`,
    [
      { judul: "Menu", lebar: 30 },
      { judul: "Porsi", lebar: 10, format: "#,##0" },
      { judul: "Omzet", lebar: 17, format: FORMAT_RUPIAH },
      { judul: "HPP (biaya bahan)", lebar: 17, format: FORMAT_RUPIAH },
      { judul: "Laba kotor", lebar: 17, format: FORMAT_RUPIAH },
      { judul: "Margin", lebar: 10, format: FORMAT_PERSEN },
      { judul: "Keterangan", lebar: 40 },
    ],
    d.menu.map((m) => [teksAman(m.nama), m.porsi, m.omzet, m.hpp, m.laba, m.margin === null ? null : m.margin / 100, m.catatan]),
    { total: (jml) => ["Total", jml(2), jml(3), jml(4), jml(5), null, "Total HPP & laba hanya dari menu yang punya resep"] }
  );

  // ---------------- Kas (saldo berjalan)
  {
    const kolom: Kolom[] = [
      { judul: "Tanggal", lebar: 14, format: FORMAT_TANGGAL },
      { judul: "Jenis", lebar: 9 },
      { judul: "Kategori", lebar: 20 },
      { judul: "Keterangan", lebar: 40 },
      { judul: "Kode pesanan", lebar: 18 },
      { judul: "Masuk", lebar: 16, format: FORMAT_RUPIAH },
      { judul: "Keluar", lebar: 16, format: FORMAT_RUPIAH },
      { judul: "Saldo", lebar: 17, format: FORMAT_RUPIAH },
    ];
    const isi: (ExcelJS.CellValue | null)[][] = [[null, null, "Saldo awal", "Saldo kas sebelum bulan ini", null, null, null, d.saldoAwal]];
    let saldo = d.saldoAwal;
    d.kas.forEach((k, i) => {
      const baris = 6 + i;
      saldo += k.jenis === "MASUK" ? k.jumlah : -k.jumlah;
      isi.push([
        tanggalExcel(k.tanggal),
        k.jenis === "MASUK" ? "Masuk" : "Keluar",
        teksAman(k.kategori),
        teksAman(k.keterangan),
        k.kodePesanan,
        k.jenis === "MASUK" ? k.jumlah : null,
        k.jenis === "KELUAR" ? k.jumlah : null,
        R(`H${baris - 1}+F${baris}-G${baris}`, saldo),
      ]);
    });
    lembarTabel(wb, "Kas", `Buku kas — ${d.labelBulan}`, `${sub} · saldo berjalan`, kolom, isi, {
      total: (jml, akhir) => ["Total bulan ini", null, null, null, null, jml(6), jml(7), R(`H${akhir}`, saldo)],
    });
  }

  // ---------------- Piutang
  lembarTabel(
    wb,
    "Piutang",
    `Piutang dari pesanan ${d.labelBulan}`,
    `${sub} · posisi saat berkas dibuat`,
    [
      { judul: "Kode", lebar: 18 },
      { judul: "Pemesan", lebar: 24 },
      { judul: "Telepon", lebar: 16 },
      { judul: "Tanggal acara", lebar: 14, format: FORMAT_TANGGAL },
      { judul: "Total", lebar: 15, format: FORMAT_RUPIAH },
      { judul: "Dibayar", lebar: 15, format: FORMAT_RUPIAH },
      { judul: "Sisa", lebar: 15, format: FORMAT_RUPIAH },
      { judul: "Umur", lebar: 18 },
    ],
    d.piutang.map((p, i) => [p.kode, teksAman(p.namaPemesan), p.telepon, tanggalExcel(p.tanggalAcara), p.total, p.dibayar, R(`E${5 + i}-F${5 + i}`, p.total - p.dibayar), p.umur]),
    { total: (jml) => ["Total", null, null, null, jml(5), jml(6), jml(7), null], kosong: "Tidak ada piutang — semua pesanan bulan ini sudah lunas." }
  );

  // ---------------- Pelanggan teratas
  lembarTabel(
    wb,
    "Pelanggan teratas",
    `Pelanggan teratas — ${d.labelBulan}`,
    `${sub} · pesanan tidak batal, menurut total belanja`,
    [
      { judul: "Peringkat", lebar: 10, format: "0" },
      { judul: "Nama", lebar: 28 },
      { judul: "Telepon", lebar: 16 },
      { judul: "Jumlah pesanan", lebar: 15, format: "#,##0" },
      { judul: "Total belanja", lebar: 18, format: FORMAT_RUPIAH },
    ],
    d.pelangganTeratas.map((p, i) => [i + 1, teksAman(p.nama), p.telepon, p.pesanan, p.total])
  );

  return wb;
}

// --------------------------------------------------------- Produksi harian

export interface DataProduksiXlsx {
  namaUsaha: string;
  tanggal: string;
  labelTanggal: string;
  sertakanBaru: boolean;
  porsi: { namaMenu: string; satuan: string; jumlah: number }[];
  denganHarga: boolean;
  belanja: { namaBahan: string; satuan: string; jumlahBeli: number; perkiraanBiaya: number; dipakaiUntuk: string[] }[];
  tanpaResep: string[];
  jadwal: { jamAcara: string; kode: string; namaPemesan: string; caraAmbil: string; alamatAntar: string | null; isi: string; catatan: string | null }[];
}

export function susunWorkbookProduksi(d: DataProduksiXlsx): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = d.namaUsaha;
  wb.title = `Produksi ${d.tanggal}`;
  wb.calcProperties.fullCalcOnLoad = true;
  const sub = `${d.namaUsaha} · ${d.sertakanBaru ? "termasuk pesanan baru yang belum diterima" : "hanya pesanan yang sudah diterima"}`;

  lembarTabel(
    wb,
    "Yang dimasak",
    `Produksi — ${d.labelTanggal}`,
    sub,
    [
      { judul: "Menu", lebar: 34 },
      { judul: "Jumlah", lebar: 12, format: "#,##0" },
      { judul: "Satuan", lebar: 12 },
    ],
    d.porsi.map((p) => [teksAman(p.namaMenu), p.jumlah, p.satuan]),
    { total: (jml) => ["Total porsi", jml(2), null], kosong: "Tidak ada pesanan untuk tanggal ini." }
  );

  {
    const kolom: Kolom[] = [
      { judul: "✓", lebar: 5 },
      { judul: "Bahan", lebar: 28 },
      { judul: "Jumlah", lebar: 12, format: "#,##0.0##" },
      { judul: "Satuan", lebar: 10 },
      ...(d.denganHarga ? [{ judul: "Perkiraan biaya", lebar: 17, format: FORMAT_RUPIAH }] : []),
      { judul: "Untuk menu", lebar: 44 },
    ];
    const ws = lembarTabel(
      wb,
      "Daftar belanja",
      `Daftar belanja — ${d.labelTanggal}`,
      `${sub} · dibulatkan ke atas${d.denganHarga ? ", harga perkiraan dari daftar bahan" : ""}`,
      kolom,
      d.belanja.map((b) => [
        "☐",
        teksAman(b.namaBahan),
        b.jumlahBeli,
        b.satuan,
        ...(d.denganHarga ? [b.perkiraanBiaya] : []),
        teksAman(b.dipakaiUntuk.join(", ")),
      ]),
      {
        total: d.denganHarga ? (jml) => [null, "Total perkiraan", null, null, jml(5), null] : undefined,
        kosong: "Belum ada resep untuk menu-menu ini.",
      }
    );
    if (d.tanpaResep.length) {
      const r = ws.rowCount + 2;
      ws.getCell(r, 2).value = teksAman(`Belum punya resep (tidak masuk daftar): ${d.tanpaResep.join(", ")}`);
      ws.getCell(r, 2).font = { italic: true, color: { argb: WARNA.redup } };
    }
  }

  lembarTabel(
    wb,
    "Jadwal siap",
    `Jadwal siap — ${d.labelTanggal}`,
    sub,
    [
      { judul: "Jam", lebar: 7 },
      { judul: "Kode", lebar: 18 },
      { judul: "Pemesan", lebar: 22 },
      { judul: "Cara", lebar: 12 },
      { judul: "Isi pesanan", lebar: 44 },
      { judul: "Alamat / catatan", lebar: 40 },
    ],
    d.jadwal.map((j) => [
      j.jamAcara,
      j.kode,
      teksAman(j.namaPemesan),
      j.caraAmbil === "DIANTAR" ? "Diantar" : "Ambil",
      teksAman(j.isi),
      teksAman([j.alamatAntar, j.catatan].filter(Boolean).join(" · ")),
    ]),
    { kosong: "Tidak ada pesanan untuk tanggal ini." }
  );

  return wb;
}

/** Nama berkas aman untuk header Content-Disposition. */
export function namaBerkasAman(teks: string): string {
  return teks.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "berkas";
}
