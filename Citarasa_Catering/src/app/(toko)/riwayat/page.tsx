import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { bacaSesi } from "@/lib/auth";
import { rupiah, tanggalPendek, teleponTampil } from "@/lib/format";
import { LencanaStatus } from "@/components/Lencana";
import { TombolKeluar } from "@/components/TombolKeluar";
import { KomponenPaginasi } from "@/components/KomponenPaginasi";
import { FormGantiSandi } from "@/components/FormGantiSandi";
import { IkonPanahKanan } from "@/components/ikon/Ikon";

export const metadata: Metadata = { title: "Pesanan saya", robots: { index: false } };

const UKURAN_HALAMAN = 10;

interface HalamanRiwayatProps {
  searchParams: Promise<{ halaman?: string }>;
}

export default async function HalamanRiwayat({ searchParams }: HalamanRiwayatProps) {
  const [sesi, params] = await Promise.all([bacaSesi(), searchParams]);
  if (!sesi) redirect("/masuk");

  const where = { OR: [{ penggunaId: sesi.id }, { teleponPemesan: sesi.telepon }] };
  const diminta = Math.max(1, Math.floor(Number(params.halaman) || 1));

  const total = await db.pesanan.count({ where });
  const totalHalaman = Math.max(1, Math.ceil(total / UKURAN_HALAMAN));
  const halaman = Math.min(diminta, totalHalaman);

  const [daftar, pengguna] = await Promise.all([
    db.pesanan.findMany({
      where,
      select: {
        kode: true,
        tanggalAcara: true,
        status: true,
        statusBayar: true,
        total: true,
        item: { select: { namaMenu: true, jumlah: true, satuan: true }, take: 2 },
        _count: { select: { item: true } },
      },
      orderBy: { dibuatPada: "desc" },
      skip: (halaman - 1) * UKURAN_HALAMAN,
      take: UKURAN_HALAMAN,
    }),
    db.pengguna.findUnique({ where: { id: sesi.id }, select: { nama: true } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-tampil text-3xl font-bold text-kayu">Pesanan saya</h1>
          <p className="teks-redup mt-1.5">
            {pengguna?.nama} · {teleponTampil(sesi.telepon)}
          </p>
        </div>
        <div className="flex gap-2">
          <TombolKeluar />
          <Link href="/pesan" className="tombol-utama">
            Pesan lagi
          </Link>
        </div>
      </header>

      {daftar.length === 0 ? (
        <div className="kartu kartu-isi mt-8 text-center">
          <p className="font-semibold text-kayu">Belum ada pesanan</p>
          <p className="teks-redup mt-1">Pesanan yang kamu buat dengan nomor ini akan muncul di sini.</p>
          <Link href="/menu" className="tombol-kedua mt-5">
            Lihat menu
          </Link>
        </div>
      ) : (
        <ul className="kartu mt-8 divide-y divide-krem-gelap overflow-hidden">
          {daftar.map((p) => {
            const lainnya = p._count.item - p.item.length;
            return (
              <li key={p.kode}>
                <Link
                  href={`/pesanan/${p.kode}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-krem transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-mono text-sm font-medium text-kayu">{p.kode}</span>
                      <LencanaStatus status={p.status} untukPelanggan />
                    </div>
                    <p className="mt-1 text-sm text-kayu-sedang truncate">
                      {p.item.map((i) => `${i.namaMenu} (${i.jumlah})`).join(", ")}
                      {lainnya > 0 ? ` +${lainnya} lainnya` : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-kayu-sedang">Acara {tanggalPendek(p.tanggalAcara)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-kayu angka-tabel">{rupiah(p.total)}</p>
                    <p className="text-xs text-kayu-sedang">
                      {p.statusBayar === "LUNAS" ? "Lunas" : p.status === "DIBATALKAN" ? "—" : "Belum lunas"}
                    </p>
                  </div>
                  <IkonPanahKanan className="w-4 h-4 text-kayu-sedang shrink-0 hidden sm:block" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <KomponenPaginasi halamanAktif={halaman} totalHalaman={totalHalaman} basePath="/riwayat" />

      <details className="kartu mt-10 group">
        <summary className="kartu-isi cursor-pointer list-none flex items-center justify-between font-medium text-kayu">
          Keamanan akun
          <span className="text-sm text-kayu-sedang group-open:hidden">Ganti kata sandi</span>
        </summary>
        <div className="px-5 sm:px-6 pb-6">
          <FormGantiSandi />
        </div>
      </details>
    </div>
  );
}
