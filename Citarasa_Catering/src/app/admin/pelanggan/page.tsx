import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { bacaSesi } from "@/lib/auth";
import { ambilPengaturan } from "@/lib/pengaturan";
import { linkWhatsapp, namaPanggilan, rupiah, tanggalPendek, teleponTampil, waktuRelatif } from "@/lib/format";
import { KomponenPaginasi } from "@/components/KomponenPaginasi";
import { TombolResetSandi } from "@/components/admin/TombolResetSandi";
import { IkonCari, IkonOrang, IkonWhatsapp } from "@/components/ikon/Ikon";
import type { Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Pelanggan" };

const PER_HALAMAN = 20;

interface Props {
  searchParams: Promise<{ q?: string; urut?: string; halaman?: string }>;
}

/**
 * Pelanggan berakun: siapa yang setia, siapa yang baru, dan pintu bantuan
 * "lupa sandi". Angka belanja hanya dari pesanan yang tidak batal, sama
 * dengan aturan laporan & buku kas.
 */
export default async function HalamanPelanggan({ searchParams }: Props) {
  const sesi = await bacaSesi();
  if (sesi?.peran !== "PEMILIK") redirect("/admin");

  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 60);
  const urut = params.urut === "belanja" ? "belanja" : "terbaru";
  const halaman = Math.max(1, Math.min(10_000, Number.parseInt(params.halaman ?? "1", 10) || 1));
  const digit = q.replace(/\D/g, "");
  // "0812…" diketik pemilik, tersimpan "62812…": cari bagian setelah 0/62.
  const digitCari = digit.replace(/^(62|0)/, "");

  const saring: Prisma.PenggunaWhereInput = {
    peran: "PELANGGAN",
    ...(q
      ? {
          OR: [
            { nama: { contains: q, mode: "insensitive" as const } },
            ...(digitCari.length >= 3 ? [{ telepon: { contains: digitCari } }] : []),
          ],
        }
      : {}),
  };
  const sejak30 = new Date(Date.now() - 30 * 86_400_000);

  const [pengaturan, total, totalSemua, baru30, [ulang], [tamu]] = await Promise.all([
    ambilPengaturan(),
    db.pengguna.count({ where: saring }),
    db.pengguna.count({ where: { peran: "PELANGGAN" } }),
    db.pengguna.count({ where: { peran: "PELANGGAN", dibuatPada: { gte: sejak30 } } }),
    db.$queryRaw<{ pernah: number; berulang: number }[]>`
      SELECT COUNT(*)::int AS pernah, COUNT(*) FILTER (WHERE n >= 2)::int AS berulang
      FROM (
        SELECT "penggunaId", COUNT(*) AS n FROM "Pesanan"
        WHERE "penggunaId" IS NOT NULL AND status <> 'DIBATALKAN'
        GROUP BY 1
      ) t`,
    db.$queryRaw<{ jumlah: number }[]>`
      SELECT COUNT(DISTINCT "teleponPemesan")::int AS jumlah FROM "Pesanan"
      WHERE "penggunaId" IS NULL AND status <> 'DIBATALKAN'`,
  ]);

  const totalHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN));
  const halamanAman = Math.min(halaman, totalHalaman);
  const lewati = (halamanAman - 1) * PER_HALAMAN;

  // Urut belanja: diurutkan di database lewat agregat, lalu baris akunnya diambil.
  let daftar: { id: string; nama: string; telepon: string; dibuatPada: Date }[];
  if (urut === "belanja") {
    const peringkat = await db.$queryRaw<{ id: string }[]>`
      SELECT u.id FROM "Pengguna" u
      LEFT JOIN "Pesanan" p ON p."penggunaId" = u.id AND p.status <> 'DIBATALKAN'
      WHERE u.peran = 'PELANGGAN'
        AND (${q} = '' OR u.nama ILIKE '%' || ${q} || '%' OR (${digitCari.length >= 3} AND u.telepon LIKE '%' || ${digitCari} || '%'))
      GROUP BY u.id
      ORDER BY COALESCE(SUM(p.total), 0) DESC, u."dibuatPada" DESC
      LIMIT ${PER_HALAMAN} OFFSET ${lewati}`;
    const ids = peringkat.map((r) => r.id);
    const baris = await db.pengguna.findMany({
      where: { id: { in: ids } },
      select: { id: true, nama: true, telepon: true, dibuatPada: true },
    });
    daftar = ids.map((id) => baris.find((b) => b.id === id)!).filter(Boolean);
  } else {
    daftar = await db.pengguna.findMany({
      where: saring,
      select: { id: true, nama: true, telepon: true, dibuatPada: true },
      orderBy: { dibuatPada: "desc" },
      skip: lewati,
      take: PER_HALAMAN,
    });
  }

  const statistik = daftar.length
    ? await db.pesanan.groupBy({
        by: ["penggunaId"],
        where: { penggunaId: { in: daftar.map((d) => d.id) }, status: { not: "DIBATALKAN" } },
        _count: { _all: true },
        _sum: { total: true },
        _max: { dibuatPada: true },
      })
    : [];
  const peta = new Map(statistik.map((s) => [s.penggunaId, s]));
  const persenUlang = ulang.pernah > 0 ? Math.round((ulang.berulang / ulang.pernah) * 100) : null;

  const ringkasan = [
    { label: "Pelanggan berakun", nilai: totalSemua.toLocaleString("id-ID"), ket: "terdaftar di toko" },
    { label: "Baru 30 hari", nilai: baru30.toLocaleString("id-ID"), ket: "akun baru" },
    {
      label: "Pesan lagi",
      nilai: persenUlang === null ? "—" : `${persenUlang}%`,
      ket: ulang.pernah ? `${ulang.berulang} dari ${ulang.pernah} pembeli berakun` : "belum ada pesanan berakun",
    },
    { label: "Pemesan tamu", nilai: tamu.jumlah.toLocaleString("id-ID"), ket: "nomor tanpa akun" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-atas">Toko</p>
          <h1 className="judul-halaman mt-1 flex items-center gap-3">
            <IkonOrang className="w-8 h-8 text-pandan" />
            Pelanggan
          </h1>
          <p className="teks-redup mt-1">Siapa yang setia, siapa yang baru — dan bantuan untuk yang lupa kata sandi.</p>
        </div>
      </header>

      <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {ringkasan.map((r) => (
          <li key={r.label} className="kartu p-4">
            <p className="label-atas">{r.label}</p>
            <p className="mt-2 font-presisi text-[1.9rem] font-bold leading-none text-arang">{r.nilai}</p>
            <p className="mt-1.5 text-[13px] text-arang-sedang">{r.ket}</p>
          </li>
        ))}
      </ul>

      <form method="get" className="kartu p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <label htmlFor="q" className="label">
            Cari pelanggan
          </label>
          <div className="relative">
            <IkonCari className="w-[18px] h-[18px] text-arang-sedang absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input id="q" name="q" type="search" defaultValue={q} maxLength={60} placeholder="Nama atau nomor HP" className="isian pl-10" />
          </div>
        </div>
        <div className="sm:w-56">
          <label htmlFor="urut" className="label">
            Urutkan
          </label>
          <select id="urut" name="urut" defaultValue={urut} className="isian">
            <option value="terbaru">Terbaru mendaftar</option>
            <option value="belanja">Total belanja terbesar</option>
          </select>
        </div>
        <button type="submit" className="tombol-utama">
          Terapkan
        </button>
      </form>

      {daftar.length === 0 ? (
        <div className="kartu kartu-isi text-center">
          <p className="font-semibold text-arang">{q ? `Tidak ada pelanggan yang cocok dengan “${q}”.` : "Belum ada pelanggan berakun."}</p>
          <p className="teks-redup mt-1">
            {q ? (
              <Link href="/admin/pelanggan" className="font-semibold text-pandan-tua hover:underline">
                Hapus pencarian
              </Link>
            ) : (
              "Pembeli yang mendaftar saat memesan akan muncul di sini."
            )}
          </p>
        </div>
      ) : (
        <div className="kartu overflow-hidden">
          <div className="overflow-x-auto gulir-tipis">
            <table className="tabel min-w-[880px]">
              <caption className="sr-only">Daftar pelanggan berakun</caption>
              <thead>
                <tr>
                  <th scope="col">Pelanggan</th>
                  <th scope="col">Bergabung</th>
                  <th scope="col" className="!text-right">Pesanan</th>
                  <th scope="col" className="!text-right">Total belanja</th>
                  <th scope="col">Terakhir pesan</th>
                  <th scope="col">Bantuan</th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((p) => {
                  const s = peta.get(p.id);
                  const wa = linkWhatsapp(p.telepon, `Halo ${namaPanggilan(p.nama)}, ini dari ${pengaturan.namaUsaha}.`);
                  return (
                    <tr key={p.id}>
                      <td>
                        <p className="font-semibold text-arang">{p.nama}</p>
                        <a
                          href={wa}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-presisi text-[13px] text-arang-sedang hover:text-pandan-tua"
                        >
                          <IkonWhatsapp className="w-3.5 h-3.5 text-[#1A9E4B]" />
                          {teleponTampil(p.telepon)}
                        </a>
                      </td>
                      <td className="text-[14px] text-arang-sedang whitespace-nowrap">{tanggalPendek(p.dibuatPada)}</td>
                      <td className="text-right font-presisi font-semibold">
                        {s?._count._all ?? 0}
                        {(s?._count._all ?? 0) >= 2 && (
                          <span className="ml-2 lencana !text-[11px] bg-kunyit-lembut text-kunyit-tua border-kunyit/30">setia</span>
                        )}
                      </td>
                      <td className="text-right font-presisi font-semibold whitespace-nowrap">{rupiah(s?._sum.total ?? 0)}</td>
                      <td className="text-[14px] text-arang-sedang whitespace-nowrap">
                        {s?._max.dibuatPada ? waktuRelatif(s._max.dibuatPada) : "Belum pernah"}
                      </td>
                      <td>
                        <TombolResetSandi penggunaId={p.id} nama={p.nama} namaUsaha={pengaturan.namaUsaha} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <KomponenPaginasi
        halamanAktif={halamanAman}
        totalHalaman={totalHalaman}
        basePath="/admin/pelanggan"
        queryLain={{ q: q || undefined, urut: urut === "belanja" ? "belanja" : undefined }}
      />

      <p className="text-[13px] text-arang-sedang">
        Reset sandi hanya untuk pelanggan. Sandi sementara dikirim ke nomor yang terdaftar di akun — bukan ke nomor yang
        meminta — supaya orang yang mengaku-ngaku tidak bisa mengambil alih akun.
      </p>
    </div>
  );
}
