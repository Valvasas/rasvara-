import "dotenv/config";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { KategoriMenu } from "../src/generated/prisma/client";

const scryptAsync = promisify(scrypt);

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function hashSandi(sandi: string): Promise<string> {
  const salt = randomBytes(16);
  const turunan = (await scryptAsync(sandi, salt, 64)) as Buffer;
  return `${salt.toString("hex")}:${turunan.toString("hex")}`;
}

const TELEPON_PEMILIK = "6281234567890";
const SANDI_PEMILIK = process.env.SEED_SANDI_PEMILIK ?? "citarasa123";
const TELEPON_STAF_DAPUR = "6281234567891";
const SANDI_STAF_DAPUR = process.env.SEED_SANDI_STAF ?? "dapur123";

type BenihMenu = {
  nama: string;
  slug: string;
  deskripsi: string;
  kategori: KategoriMenu;
  harga: number;
  satuan: string;
  minPesan: number;
  preorderHari: number;
  kapasitasHarian: number | null;
  urutan: number;
};

const MENU: BenihMenu[] = [
  {
    nama: "Nasi Kotak Ayam Bakar",
    slug: "nasi-kotak-ayam-bakar",
    deskripsi:
      "Ayam bakar bumbu kecap yang dibakar dadakan, nasi putih pulen, tumis buncis, sambal, dan lalapan segar.",
    kategori: "NASI_KOTAK",
    harga: 28000,
    satuan: "kotak",
    minPesan: 10,
    preorderHari: 0,
    kapasitasHarian: 150,
    urutan: 1,
  },
  {
    nama: "Nasi Kotak Rendang Daging",
    slug: "nasi-kotak-rendang-daging",
    deskripsi:
      "Rendang daging masak semalaman sampai bumbunya meresap, dengan nasi putih, kentang balado, dan kerupuk.",
    kategori: "NASI_KOTAK",
    harga: 37000,
    satuan: "kotak",
    minPesan: 10,
    preorderHari: 1,
    kapasitasHarian: 80,
    urutan: 2,
  },
  {
    nama: "Nasi Kotak Ayam Goreng Lalapan",
    slug: "nasi-kotak-ayam-goreng-lalapan",
    deskripsi:
      "Ayam goreng kremes gurih, nasi putih hangat, tahu tempe, lalapan, dan sambal terasi buatan sendiri.",
    kategori: "NASI_KOTAK",
    harga: 25000,
    satuan: "kotak",
    minPesan: 10,
    preorderHari: 0,
    kapasitasHarian: 150,
    urutan: 3,
  },
  {
    nama: "Nasi Kotak Sayur Komplit",
    slug: "nasi-kotak-sayur-komplit",
    deskripsi:
      "Pilihan tanpa daging: orek tempe manis, tumis sayur, telur balado, dan sambal goreng kentang.",
    kategori: "NASI_KOTAK",
    harga: 22000,
    satuan: "kotak",
    minPesan: 10,
    preorderHari: 0,
    kapasitasHarian: 100,
    urutan: 4,
  },
  {
    nama: "Snack Box Isi 4",
    slug: "snack-box-isi-4",
    deskripsi:
      "Empat macam kue basah dan gorengan pilihan hari itu, ditambah air mineral gelas. Cocok untuk rapat pagi.",
    kategori: "SNACK",
    harga: 15000,
    satuan: "box",
    minPesan: 20,
    preorderHari: 0,
    kapasitasHarian: 300,
    urutan: 1,
  },
  {
    nama: "Snack Box Isi 6",
    slug: "snack-box-isi-6",
    deskripsi:
      "Enam macam isian: risoles, lemper, bolu kukus, pastel, kue lapis, dan puding, plus air mineral.",
    kategori: "SNACK",
    harga: 23000,
    satuan: "box",
    minPesan: 20,
    preorderHari: 0,
    kapasitasHarian: 200,
    urutan: 2,
  },
  {
    nama: "Paket Risoles Mayo (isi 10)",
    slug: "paket-risoles-mayo",
    deskripsi:
      "Risoles isi smoked beef, telur, dan saus mayo, digoreng renyah sebelum diantar. Satu paket isi sepuluh.",
    kategori: "SNACK",
    harga: 38000,
    satuan: "paket",
    minPesan: 2,
    preorderHari: 0,
    kapasitasHarian: 60,
    urutan: 3,
  },
  {
    nama: "Tumpeng Mini",
    slug: "tumpeng-mini",
    deskripsi:
      "Nasi kuning berbentuk kerucut dengan tujuh lauk pendamping. Pas untuk syukuran kecil 5 sampai 8 orang.",
    kategori: "TUMPENG",
    harga: 285000,
    satuan: "paket",
    minPesan: 1,
    preorderHari: 1,
    kapasitasHarian: 5,
    urutan: 1,
  },
  {
    nama: "Tumpeng Sedang",
    slug: "tumpeng-sedang",
    deskripsi:
      "Tumpeng nasi kuning lengkap dengan ayam ungkep, perkedel, urap, telur pindang, dan mi goreng. Untuk 15 orang.",
    kategori: "TUMPENG",
    harga: 575000,
    satuan: "paket",
    minPesan: 1,
    preorderHari: 2,
    kapasitasHarian: 3,
    urutan: 2,
  },
  {
    nama: "Tumpeng Komplit Besar",
    slug: "tumpeng-komplit-besar",
    deskripsi:
      "Tumpeng besar dengan sepuluh lauk, dihias daun pisang dan bunga, siap dipotong untuk 25 orang.",
    kategori: "TUMPENG",
    harga: 875000,
    satuan: "paket",
    minPesan: 1,
    preorderHari: 2,
    kapasitasHarian: 2,
    urutan: 3,
  },
  {
    nama: "Nasi Goreng Spesial",
    slug: "nasi-goreng-spesial",
    deskripsi:
      "Nasi goreng dengan telur mata sapi, suwiran ayam, bakso, acar, dan kerupuk. Digoreng di wajan besar api besar.",
    kategori: "NASI_GORENG",
    harga: 22000,
    satuan: "porsi",
    minPesan: 1,
    preorderHari: 0,
    kapasitasHarian: 120,
    urutan: 1,
  },
  {
    nama: "Nasi Goreng Kampung",
    slug: "nasi-goreng-kampung",
    deskripsi:
      "Nasi goreng sederhana dengan ikan asin, daun bawang, dan cabai rawit. Pedasnya bisa diminta sesuai selera.",
    kategori: "NASI_GORENG",
    harga: 18000,
    satuan: "porsi",
    minPesan: 1,
    preorderHari: 0,
    kapasitasHarian: 120,
    urutan: 2,
  },
  {
    nama: "Nasi Goreng Seafood",
    slug: "nasi-goreng-seafood",
    deskripsi:
      "Nasi goreng dengan udang dan cumi segar, bumbu bawang putih, dan taburan daun bawang.",
    kategori: "NASI_GORENG",
    harga: 30000,
    satuan: "porsi",
    minPesan: 1,
    preorderHari: 0,
    kapasitasHarian: 60,
    urutan: 3,
  },
];

const CERITA =
  "Citarasa Catering berawal dari dapur rumah dan satu wajan besar. " +
  "Setiap sore kami mulai menyiapkan bahan, dan saat lampu warung menyala malam hari, " +
  "pesanan pertama biasanya sudah menunggu. Sampai sekarang cara kami memasak tidak berubah: " +
  "bahan dibeli pagi itu juga, bumbu diulek sendiri, dan tidak ada pesanan yang dikirim terlambat. " +
  "Dari nasi kotak rapat kantor sampai tumpeng syukuran keluarga, semuanya kami masak seperti untuk meja makan sendiri.";

async function main() {
  console.log("Menyiapkan data awal Citarasa Catering...\n");

  const pemilik = await db.pengguna.upsert({
    where: { telepon: TELEPON_PEMILIK },
    update: { peran: "PEMILIK" },
    create: {
      nama: "Pemilik Citarasa",
      telepon: TELEPON_PEMILIK,
      sandiHash: await hashSandi(SANDI_PEMILIK),
      peran: "PEMILIK",
    },
  });
  console.log(`  Akun pemilik siap  : ${pemilik.telepon}`);

  const stafDapur = await db.pengguna.upsert({
    where: { telepon: TELEPON_STAF_DAPUR },
    update: { peran: "STAF_DAPUR" },
    create: {
      nama: "Budi (Staf Dapur)",
      telepon: TELEPON_STAF_DAPUR,
      sandiHash: await hashSandi(SANDI_STAF_DAPUR),
      peran: "STAF_DAPUR",
    },
  });
  console.log(`  Akun staf dapur siap: ${stafDapur.telepon}`);

  await db.pengaturan.upsert({
    where: { id: "utama" },
    update: {},
    create: {
      id: "utama",
      namaUsaha: "Citarasa Catering",
      tagline: "Masakan hangat, siap tepat waktu.",
      cerita: CERITA,
      whatsapp: TELEPON_PEMILIK,
      alamat: "Jl. Melati No. 17, Sukamaju",
      jamBuka: "16:00",
      jamTutup: "23:00",
      namaBank: "BCA",
      nomorRekening: "1234567890",
      namaRekening: "Citarasa Catering",
      ongkirDefault: 15000,
      minOrderAntar: 100000,
    },
  });
  console.log("  Pengaturan usaha   : siap");

  for (const menu of MENU) {
    await db.menu.upsert({
      where: { slug: menu.slug },
      update: {},
      create: menu,
    });
  }
  console.log(`  Menu terisi        : ${MENU.length} item`);

  if (process.env.SEED_DEMO === "1") {
    await isiContohPesanan(pemilik.id);
  }

  console.log("\nSelesai. Masuk ke /admin memakai:");
  console.log(`  Nomor HP : 0${TELEPON_PEMILIK.slice(2)}`);
  console.log(`  Sandi    : ${SANDI_PEMILIK}`);
  console.log("\nGanti sandi ini sebelum website dipakai sungguhan.\n");
}

/** Contoh pesanan & catatan kas supaya tampilan admin tidak kosong saat dicoba. */
async function isiContohPesanan(pemilikId: string) {
  const jumlahAda = await db.pesanan.count();
  if (jumlahAda > 0) {
    console.log("  Contoh pesanan     : dilewati (sudah ada data)");
    return;
  }

  const ayamBakar = await db.menu.findUniqueOrThrow({
    where: { slug: "nasi-kotak-ayam-bakar" },
  });
  const snack4 = await db.menu.findUniqueOrThrow({
    where: { slug: "snack-box-isi-4" },
  });
  const tumpengMini = await db.menu.findUniqueOrThrow({
    where: { slug: "tumpeng-mini" },
  });

  const hariIni = new Date();
  const besok = new Date(hariIni);
  besok.setDate(besok.getDate() + 1);
  const kemarin = new Date(hariIni);
  kemarin.setDate(kemarin.getDate() - 1);

  const contoh = [
    {
      kode: "CR-DEMO-A1",
      nama: "Ibu Sri Wahyuni",
      telepon: "628111111111",
      status: "BARU" as const,
      statusBayar: "MENUNGGU_VERIFIKASI" as const,
      tanggal: besok,
      jam: "11:00",
      menu: ayamBakar,
      jumlah: 30,
      catatan: "Sambalnya dipisah ya, ada yang tidak bisa pedas.",
    },
    {
      kode: "CR-DEMO-B2",
      nama: "Pak Hendra (Kantor Maju Jaya)",
      telepon: "628222222222",
      status: "DIPROSES" as const,
      statusBayar: "LUNAS" as const,
      tanggal: hariIni,
      jam: "09:30",
      menu: snack4,
      jumlah: 40,
      catatan: null,
    },
    {
      kode: "CR-DEMO-C3",
      nama: "Keluarga Bapak Joko",
      telepon: "628333333333",
      status: "SELESAI" as const,
      statusBayar: "LUNAS" as const,
      tanggal: kemarin,
      jam: "17:00",
      menu: tumpengMini,
      jumlah: 1,
      catatan: "Untuk syukuran rumah baru.",
    },
  ];

  for (const c of contoh) {
    const subtotal = c.menu.harga * c.jumlah;
    const pesanan = await db.pesanan.create({
      data: {
        kode: c.kode,
        namaPemesan: c.nama,
        teleponPemesan: c.telepon,
        caraAmbil: "DIANTAR",
        alamatAntar: "Jl. Contoh No. 1, Sukamaju",
        tanggalAcara: c.tanggal,
        jamAcara: c.jam,
        catatan: c.catatan,
        status: c.status,
        statusBayar: c.statusBayar,
        caraBayar: "TRANSFER",
        subtotal,
        ongkir: 15000,
        total: subtotal + 15000,
        dibayar: c.statusBayar === "LUNAS" ? subtotal + 15000 : 0,
        selesaiPada: c.status === "SELESAI" ? kemarin : null,
        dikonfirmasiPada: c.status === "BARU" ? null : new Date(),
        item: {
          create: {
            menuId: c.menu.id,
            namaMenu: c.menu.nama,
            hargaSatuan: c.menu.harga,
            satuan: c.menu.satuan,
            jumlah: c.jumlah,
            subtotal,
          },
        },
        riwayat: {
          create: { ke: c.status, catatan: "Data contoh", olehId: pemilikId },
        },
      },
    });

    if (c.statusBayar === "LUNAS") {
      await db.catatanKas.create({
        data: {
          jenis: "MASUK",
          sumber: "PESANAN",
          kategori: "Penjualan pesanan",
          keterangan: `Pesanan ${pesanan.kode} - ${c.nama}`,
          jumlah: pesanan.total,
          tanggal: pesanan.tanggalAcara,
          pesananId: pesanan.id,
          dicatatOlehId: pemilikId,
        },
      });
    }
  }

  await db.catatanKas.createMany({
    data: [
      {
        jenis: "KELUAR",
        sumber: "MANUAL",
        kategori: "Belanja bahan",
        keterangan: "Ayam, beras, dan sayur di pasar pagi",
        jumlah: 850000,
        tanggal: hariIni,
        dicatatOlehId: pemilikId,
      },
      {
        jenis: "KELUAR",
        sumber: "MANUAL",
        kategori: "Gas & air",
        keterangan: "Isi ulang 2 tabung gas melon",
        jumlah: 44000,
        tanggal: kemarin,
        dicatatOlehId: pemilikId,
      },
    ],
  });

  console.log("  Contoh pesanan     : 3 pesanan + catatan kas");
}

main()
  .catch((e) => {
    console.error("Gagal mengisi data awal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
