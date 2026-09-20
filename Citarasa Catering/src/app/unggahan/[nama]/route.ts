import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bacaSesi } from "@/lib/auth";
import { punyaAksesPesanan } from "@/lib/akses-pesanan";
import {
  POLA_NAMA_BERKAS,
  bacaBerkasUnggahan,
  tipeMimeDariNama,
} from "@/lib/unggah";

/**
 * Pelayan berkas unggahan.
 *
 * Sebelumnya berkas ini ditaruh di `public/` sehingga dilayani langsung oleh
 * server berkas statis. Untuk foto menu itu memang tidak masalah, tetapi bukti
 * transfer memuat nama pemilik rekening, nomor rekening, dan nominal — siapa
 * pun yang memegang URL-nya bisa membukanya tanpa login, dan URL itu ikut
 * terkirim ke mana pun gambarnya ditempel. Karena itu sekarang setiap
 * permintaan gambar lewat sini dulu:
 *
 * - `menu-*` tetap terbuka untuk umum; itu katalog yang memang dipajang.
 * - `bukti-*` hanya untuk dapur, atau untuk pembeli yang memang pemilik
 *   pesanannya.
 *
 * Yang ditolak dijawab 404, bukan 403, supaya balasannya tidak memberi tahu
 * bahwa suatu berkas memang ada.
 */

export const dynamic = "force-dynamic";

function tidakDitemukan(): NextResponse {
  return new NextResponse("Berkas tidak ditemukan.", {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}

async function bolehLihatBukti(nama: string): Promise<boolean> {
  const sesi = await bacaSesi();
  if (sesi && (sesi.peran === "PEMILIK" || sesi.peran === "STAF_DAPUR")) {
    return true;
  }

  const pesanan = await db.pesanan.findFirst({
    where: { buktiBayarUrl: `/unggahan/${nama}` },
    select: { kode: true, teleponPemesan: true },
  });
  if (!pesanan) return false;

  if (sesi && sesi.telepon === pesanan.teleponPemesan) return true;

  // Pembeli tamu: haknya ada di cookie bertanda tangan yang diberikan saat ia
  // membuat pesanan atau berhasil mencocokkan nomor HP di halaman lacak.
  return punyaAksesPesanan(pesanan.kode);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ nama: string }> }
): Promise<NextResponse> {
  const { nama } = await params;

  if (!POLA_NAMA_BERKAS.test(nama)) return tidakDitemukan();

  const tipe = tipeMimeDariNama(nama);
  if (!tipe) return tidakDitemukan();

  const adalahBukti = nama.startsWith("bukti-");
  if (adalahBukti && !(await bolehLihatBukti(nama))) {
    return tidakDitemukan();
  }

  const isi = await bacaBerkasUnggahan(nama);
  if (!isi) return tidakDitemukan();

  return new NextResponse(new Uint8Array(isi), {
    status: 200,
    headers: {
      "Content-Type": tipe,
      "Content-Length": String(isi.byteLength),
      "Content-Disposition": "inline",
      // Nama berkas mengandung angka acak dan tidak pernah dipakai ulang, jadi
      // foto menu aman disimpan lama di peramban maupun di CDN. Bukti transfer
      // tidak boleh menginap di mana pun kecuali di peramban pemiliknya.
      "Cache-Control": adalahBukti
        ? "private, no-store"
        : "public, max-age=31536000, immutable",
    },
  });
}
