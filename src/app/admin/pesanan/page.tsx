import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Lencana } from "@/components/Lencana";
import { AksiPesanan } from "@/components/admin/AksiPesanan";
import { INFO_BAYAR, INFO_STATUS, KOLOM_PAPAN } from "@/lib/pesanan";
import {
  jamTampil,
  labelHari,
  rupiah,
  tanggalPendek,
  teleponTampil,
  waktuRelatif,
} from "@/lib/format";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Papan Pesanan" };

type PesananLengkap = Prisma.PesananGetPayload<{ include: { item: true } }>;

export default async function PapanPesanan({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; cari?: string }>;
}) {
  const { tab, cari } = await searchParams;
  const tabAktif = tab === "riwayat" ? "riwayat" : "papan";
  const kataCari = (cari ?? "").trim();

  const penyaringCari: Prisma.PesananWhereInput = kataCari
    ? {
        OR: [
          { kode: { contains: kataCari, mode: "insensitive" } },
          { namaPemesan: { contains: kataCari, mode: "insensitive" } },
          { teleponPemesan: { contains: kataCari.replace(/\D/g, "") } },
        ],
      }
    : {};

  const pesanan = await db.pesanan.findMany({
    where: {
      ...penyaringCari,
      status:
        tabAktif === "papan"
          ? { notIn: ["SELESAI", "DIBATALKAN"] }
          : { in: ["SELESAI", "DIBATALKAN"] },
    },
    include: { item: true },
    orderBy:
      tabAktif === "papan"
        ? [{ tanggalAcara: "asc" }, { jamAcara: "asc" }]
        : [{ dibuatPada: "desc" }],
    take: tabAktif === "papan" ? 200 : 100,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-kolom">Pesanan</p>
          <h1 className="mt-1 text-3xl sm:text-4xl">Papan pesanan</h1>
          <p className="mt-2 text-arang-muda">
            Pesanan bergerak dari kiri ke kanan mengikuti alur dapur. Tekan
            tombol di kartunya untuk memajukan tahap.
          </p>
        </div>

        <form action="/admin/pesanan" className="flex gap-2">
          {tabAktif === "riwayat" ? (
            <input type="hidden" name="tab" value="riwayat" />
          ) : null}
          <input
            type="search"
            name="cari"
            defaultValue={kataCari}
            placeholder="Cari nama, kode, atau nomor HP"
            aria-label="Cari pesanan"
            className="kolom-isian w-64"
          />
          <button type="submit" className="tombol tombol-kedua">
            Cari
          </button>
        </form>
      </header>

      <nav aria-label="Pilih tampilan" className="mt-6 flex gap-2">
        <Link
          href="/admin/pesanan"
          aria-current={tabAktif === "papan" ? "page" : undefined}
          className={`tombol ${tabAktif === "papan" ? "tombol-utama" : "tombol-kedua"}`}
        >
          Sedang Berjalan
        </Link>
        <Link
          href="/admin/pesanan?tab=riwayat"
          aria-current={tabAktif === "riwayat" ? "page" : undefined}
          className={`tombol ${tabAktif === "riwayat" ? "tombol-utama" : "tombol-kedua"}`}
        >
          Riwayat
        </Link>
      </nav>

      {kataCari ? (
        <p className="mt-4 text-arang-muda">
          Menampilkan hasil pencarian &ldquo;{kataCari}&rdquo; ({pesanan.length}{" "}
          pesanan).{" "}
          <Link
            href={tabAktif === "riwayat" ? "/admin/pesanan?tab=riwayat" : "/admin/pesanan"}
            className="font-semibold text-bata underline underline-offset-4"
          >
            Hapus pencarian
          </Link>
        </p>
      ) : null}

      {tabAktif === "papan" ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          {KOLOM_PAPAN.map((status) => {
            const isi = pesanan.filter((p) => p.status === status);
            const info = INFO_STATUS[status];

            return (
              <section
                key={status}
                aria-labelledby={`kolom-${status}`}
                className="rounded-2xl border-2 border-krem-tua bg-krem-tua/40 p-3"
              >
                <div className="flex items-center justify-between gap-2 px-1 pb-3">
                  <h2 id={`kolom-${status}`} className="font-judul text-lg">
                    {info.label}
                  </h2>
                  <span className="rounded-full bg-kertas px-2.5 py-0.5 text-[0.85rem] font-bold">
                    {isi.length}
                  </span>
                </div>

                {isi.length === 0 ? (
                  <p className="px-1 py-6 text-center text-[0.9rem] text-arang-muda">
                    Kosong
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {isi.map((p) => (
                      <KartuPapan key={p.id} pesanan={p} />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="mt-6">
          {pesanan.length === 0 ? (
            <p className="kartu p-10 text-center text-arang-muda">
              Belum ada pesanan yang selesai atau dibatalkan.
            </p>
          ) : (
            <ul className="space-y-3">
              {pesanan.map((p) => (
                <li key={p.id} className="kartu flex flex-wrap items-center gap-4 p-4">
                  <div className="min-w-[10rem] flex-1">
                    <Link
                      href={`/admin/pesanan/${p.kode}`}
                      className="font-semibold underline underline-offset-4"
                    >
                      {p.namaPemesan}
                    </Link>
                    <p className="text-[0.88rem] text-arang-muda">
                      {p.kode} &middot; {teleponTampil(p.teleponPemesan)}
                    </p>
                  </div>

                  <p className="text-[0.9rem] text-arang-muda">
                    {tanggalPendek(p.tanggalAcara)}, {jamTampil(p.jamAcara)}
                  </p>

                  <Lencana kelas={INFO_STATUS[p.status].kelas}>
                    {INFO_STATUS[p.status].label}
                  </Lencana>
                  <Lencana kelas={INFO_BAYAR[p.statusBayar].kelas}>
                    {INFO_BAYAR[p.statusBayar].label}
                  </Lencana>

                  <p className="w-28 text-right font-semibold">{rupiah(p.total)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function KartuPapan({ pesanan }: { pesanan: PesananLengkap }) {
  const mendesak = pesanan.status === "BARU";

  return (
    <li className="kartu p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link
            href={`/admin/pesanan/${pesanan.kode}`}
            className="font-semibold underline underline-offset-4"
          >
            {pesanan.namaPemesan}
          </Link>
          <p className="text-[0.82rem] text-arang-muda">
            {teleponTampil(pesanan.teleponPemesan)}
          </p>
        </div>
        <Lencana kelas={INFO_BAYAR[pesanan.statusBayar].kelas}>
          {INFO_BAYAR[pesanan.statusBayar].label}
        </Lencana>
      </div>

      <ul className="mt-3 space-y-0.5 text-[0.9rem]">
        {pesanan.item.map((i) => (
          <li key={i.id}>
            <span className="font-semibold">{i.jumlah}</span> {i.satuan}{" "}
            {i.namaMenu}
          </li>
        ))}
      </ul>

      {pesanan.catatan ? (
        <p className="mt-2 rounded-lg bg-kunyit-lembut px-2.5 py-1.5 text-[0.85rem] text-kunyit-tua">
          {pesanan.catatan}
        </p>
      ) : null}

      <p className="mt-3 border-t border-krem-tua pt-2 text-[0.88rem]">
        <span className="font-semibold">{labelHari(pesanan.tanggalAcara)}</span>
        <span className="text-arang-muda">
          {" "}
          pukul {jamTampil(pesanan.jamAcara)} &middot; {rupiah(pesanan.total)}
        </span>
      </p>

      {mendesak ? (
        <p className="mt-1 text-[0.82rem] text-arang-muda">
          Masuk {waktuRelatif(pesanan.dibuatPada)}
        </p>
      ) : null}

      <div className="mt-3">
        <AksiPesanan
          id={pesanan.id}
          status={pesanan.status}
          statusBayar={pesanan.statusBayar}
          total={pesanan.total}
          ringkas
        />
      </div>
    </li>
  );
}
