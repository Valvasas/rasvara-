import { test } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { FORMAT_RUPIAH, namaBerkasAman, susunWorkbook, susunWorkbookProduksi, teksAman, type DataRekap } from "../src/lib/rekap-xlsx";

const kpi = { nilaiPesananSelesai: 3_000_000, pesananSelesai: 2, pesananBatal: 1, porsiSelesai: 150, kasMasuk: 2_500_000, kasKeluar: 900_000 };

function contoh(): DataRekap {
  return {
    bulan: "2026-09",
    labelBulan: "September 2026",
    labelBulanLalu: "Agustus 2026",
    namaUsaha: "Dapur Uji",
    dibuatPada: new Date("2026-10-01T01:00:00Z"),
    kpi,
    kpiLalu: { ...kpi, nilaiPesananSelesai: 2_000_000 },
    pengeluaranKategori: [
      { kategori: "Bahan baku", jumlah: 700_000 },
      { kategori: "Gas", jumlah: 200_000 },
    ],
    harian: [
      { tanggal: "2026-09-01", pesanan: 1, porsi: 100, nilai: 2_000_000, kasMasuk: 2_000_000, kasKeluar: 700_000 },
      { tanggal: "2026-09-02", pesanan: 1, porsi: 50, nilai: 1_000_000, kasMasuk: 500_000, kasKeluar: 200_000 },
    ],
    pesanan: [
      {
        kode: "CR-1", tanggalAcara: "2026-09-01", jamAcara: "11:00", namaPemesan: '=HYPERLINK("http://jahat","klik")', telepon: "0812",
        sumber: "Website", status: "Selesai", statusBayar: "Lunas", caraBayar: "Transfer", subtotal: 2_000_000, diskon: 0, ongkir: 0, total: 2_000_000, dibayar: 2_000_000,
      },
    ],
    menu: [{ nama: "Nasi Kotak", porsi: 150, omzet: 3_000_000, hpp: 1_800_000, laba: 1_200_000, margin: 40, catatan: "" }],
    saldoAwal: 1_000_000,
    kas: [
      { tanggal: "2026-09-01", jenis: "MASUK", kategori: "Penjualan", keterangan: "Pelunasan CR-1", kodePesanan: "CR-1", jumlah: 2_000_000 },
      { tanggal: "2026-09-01", jenis: "KELUAR", kategori: "Bahan baku", keterangan: "+62 belanja pasar", kodePesanan: "", jumlah: 700_000 },
    ],
    piutang: [{ kode: "CR-2", namaPemesan: "Budi", telepon: "0813", tanggalAcara: "2026-09-02", total: 1_000_000, dibayar: 500_000, umur: "> 30 hari" }],
    pelangganTeratas: [{ nama: "@admin", telepon: "0812", pesanan: 2, total: 3_000_000 }],
  };
}

async function bacaBalik(wb: ExcelJS.Workbook): Promise<ExcelJS.Workbook> {
  const buf = await wb.xlsx.writeBuffer();
  const balik = new ExcelJS.Workbook();
  await balik.xlsx.load(buf as ArrayBuffer);
  return balik;
}

test("rekap: semua lembar ada, urut dari ringkasan", async () => {
  const wb = await bacaBalik(susunWorkbook(contoh()));
  assert.deepEqual(
    wb.worksheets.map((w) => w.name),
    ["Ringkasan", "Harian", "Pesanan", "Menu & margin", "Kas", "Piutang", "Pelanggan teratas"]
  );
});

test("rekap: teks dari pengguna tidak pernah menjadi rumus", async () => {
  const wb = await bacaBalik(susunWorkbook(contoh()));
  const nama = wb.getWorksheet("Pesanan")!.getCell("D5");
  assert.equal(typeof nama.value, "string");
  assert.ok(String(nama.value).startsWith("'="), "awalan = diberi kutip");
  assert.equal(nama.formula, undefined);
  assert.equal(wb.getWorksheet("Pelanggan teratas")!.getCell("B5").value, "'@admin");
  assert.equal(wb.getWorksheet("Kas")!.getCell("D7").value, "'+62 belanja pasar");
});

test("rekap: total & saldo memakai rumus yang menunjuk baris yang benar", async () => {
  const wb = await bacaBalik(susunWorkbook(contoh()));
  const harian = wb.getWorksheet("Harian")!;
  // Data di baris 5–6, total di baris 7.
  assert.equal(harian.getCell("A7").value, "Total");
  assert.equal(harian.getCell("E7").formula, "SUM(E5:E6)");
  assert.equal(harian.getCell("H5").formula, "F5-G5");

  const kas = wb.getWorksheet("Kas")!;
  assert.equal(kas.getCell("H5").value, 1_000_000, "saldo awal");
  assert.equal(kas.getCell("H6").formula, "H5+F6-G6");
  assert.equal(kas.getCell("H7").formula, "H6+F7-G7");
  assert.equal(kas.getCell("F6").value, 2_000_000);
  assert.equal(kas.getCell("G7").value, 700_000);

  const piutang = wb.getWorksheet("Piutang")!;
  assert.equal(piutang.getCell("G5").formula, "E5-F5");
});

test("rekap: rumus membawa hasil tersimpan (pratinjau ponsel tidak menghitung rumus)", async () => {
  const wb = await bacaBalik(susunWorkbook(contoh()));
  const hasil = (lembar: string, sel: string) => (wb.getWorksheet(lembar)!.getCell(sel).value as { result?: unknown }).result;
  assert.equal(hasil("Harian", "E7"), 3_000_000, "total nilai pesanan");
  assert.equal(hasil("Harian", "H5"), 1_300_000, "selisih kas hari pertama");
  assert.equal(hasil("Kas", "H6"), 3_000_000, "saldo setelah masuk");
  assert.equal(hasil("Kas", "H7"), 2_300_000, "saldo setelah keluar");
  assert.equal(hasil("Kas", "H8"), 2_300_000, "saldo akhir di baris total");
  assert.equal(hasil("Kas", "F8"), 2_000_000);
  assert.equal(hasil("Piutang", "G5"), 500_000);
  assert.equal(hasil("Ringkasan", "D5"), 0.5, "naik 50% dari bulan lalu");
  assert.equal(hasil("Ringkasan", "B12"), 1_600_000, "selisih kas");
  // Ditulis sebagai <calcPr fullCalcOnLoad="1"/>; exceljs tidak membacanya balik, jadi dicek di objek asal.
  assert.equal(susunWorkbook(contoh()).calcProperties.fullCalcOnLoad, true);
});

test("rekap: uang berformat Rupiah, tanggal berupa tanggal Excel asli", async () => {
  const wb = await bacaBalik(susunWorkbook(contoh()));
  const p = wb.getWorksheet("Pesanan")!;
  assert.equal(p.getCell("M5").numFmt, FORMAT_RUPIAH);
  assert.equal(p.getCell("M5").value, 2_000_000);
  const t = p.getCell("B5").value;
  assert.ok(t instanceof Date, "tanggal bukan teks");
  assert.equal((t as Date).toISOString().slice(0, 10), "2026-09-01");
  assert.equal(p.views[0]?.state, "frozen", "header dibekukan");
  assert.ok(p.autoFilter, "ada saringan otomatis");
});

test("rekap: bulan tanpa data tetap menghasilkan berkas yang sah", async () => {
  const d = { ...contoh(), pengeluaranKategori: [], harian: [], pesanan: [], menu: [], kas: [], piutang: [], pelangganTeratas: [] };
  const wb = await bacaBalik(susunWorkbook(d));
  assert.match(String(wb.getWorksheet("Piutang")!.getCell("A5").value), /Tidak ada piutang/);
  assert.equal(wb.getWorksheet("Kas")!.getCell("H5").value, 1_000_000);
});

test("produksi: staf tidak mendapat kolom harga", async () => {
  const dasar = {
    namaUsaha: "Dapur Uji",
    tanggal: "2026-10-04",
    labelTanggal: "Minggu, 4 Oktober 2026",
    sertakanBaru: false,
    porsi: [{ namaMenu: "Nasi Kotak", satuan: "kotak", jumlah: 50 }],
    belanja: [{ namaBahan: "Ayam", satuan: "kg", jumlahBeli: 7.5, perkiraanBiaya: 285_000, dipakaiUntuk: ["Nasi Kotak"] }],
    tanpaResep: [],
    jadwal: [],
  };
  const pemilik = await bacaBalik(susunWorkbookProduksi({ ...dasar, denganHarga: true }));
  const staf = await bacaBalik(susunWorkbookProduksi({ ...dasar, denganHarga: false }));
  const judul = (wb: ExcelJS.Workbook) => (wb.getWorksheet("Daftar belanja")!.getRow(4).values as unknown[]).filter(Boolean);
  assert.ok(judul(pemilik).includes("Perkiraan biaya"));
  assert.ok(!judul(staf).includes("Perkiraan biaya"));
  assert.ok(!JSON.stringify(staf.getWorksheet("Daftar belanja")!.getSheetValues()).includes("285000"));
});

test("pembantu: teksAman & nama berkas", () => {
  assert.equal(teksAman("-5 kg"), "'-5 kg");
  assert.equal(teksAman("Biasa"), "Biasa");
  assert.equal(teksAman("a\u0000b"), "ab");
  assert.equal(teksAman(null), "");
  assert.equal(namaBerkasAman('Dapur "Bu Sri"\r\n/../x'), "dapur-bu-sri-x");
});
