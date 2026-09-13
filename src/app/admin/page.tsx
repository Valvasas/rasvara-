import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { bacaSesi } from "@/lib/auth";
import { Lencana } from "@/components/Lencana";
import { AksiPesanan } from "@/components/admin/AksiPesanan";
import { INFO_BAYAR, INFO_STATUS } from "@/lib/pesanan";
import { rentangHari, ringkasanKas } from "@/lib/laporan";
import {
  hariIniWib,
  jamTampil,
  labelHari,
  namaPanggilan,
  rupiah,
  tanggalPanjang,
  teleponTampil,
  waktuRelatif,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Beranda Pemilik" };

function tambahHari(kunci: string, jumlah: number): string {
  const [t, b, h] = kunci.split("-").map(Number);
  const d = new Date(Date.UTC(t, b - 1, h));
  d.setUTCDate(d.getUTCDate() + jumlah);
  return d.toISOString().slice(0, 10);
}

export default async function BerandaAdmin() {
  const sesi = await bacaSesi();
  const kunciHariIni = hariIniWib();
  const hariIni = rentangHari(kunciHariIni);
  const besok = rentangHari(tambahHari(kunciHariIni, 1));

  const [pesananBaru, masakHariIni, masakBesok, kas] = await Promise.all([
    db.pesanan.findMany({
      where: { status: "BARU" },
      include: { item: true },
      orderBy: { dibuatPada: "asc" },
      take: 6,
    }),
    db.pesanan.findMany({
      where: {
        tanggalAcara: hariIni,
        status: { notIn: ["DIBATALKAN", "SELESAI"] },
      },
      include: { item: true },
      orderBy: { jamAcara: "asc" },
    }),
    db.pesanan.findMany({
      where: { tanggalAcara: besok, status: { not: "DIBATALKAN" } },
      include: { item: true },
      orderBy: { jamAcara: "asc" },
    }),
    ringkasanKas(hariIni),
  ]);

  // Rekap dapur: semua pesanan hari ini dijumlahkan per menu, supaya pemilik
  // tahu total masakan yang harus disiapkan tanpa menghitung satu per satu.
  const rekapDapur = new Map<string, { jumlah: number; satuan: string }>();
  for (const pesanan of masakHariIni) {
    for (const item of pesanan.item) {
      const ada = rekapDapur.get(item.namaMenu);
      rekapDapur.set(item.namaMenu, {
        jumlah: (ada?.jumlah ?? 0) + item.jumlah,
        satuan: item.satuan,
      });
    }
  }
  const daftarRekap = [...rekapDapur.entries()].sort(
    (a, b) => b[1].jumlah - a[1].jumlah
  );

  const perluDitagih = masakHariIni.filter((p) => p.statusBayar !== "LUNAS");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header>
        <p className="label-kolom">{tanggalPanjang(new Date())}</p>
        <h1 className="mt-1 text-3xl sm:text-4xl">
          Selamat datang, {sesi ? namaPanggilan(sesi.nama) : "Pemilik"}.
        </h1>
        <p className="mt-2 text-arang-muda">
          Ini ringkasan hari ini. Semua yang perlu Anda kerjakan ada di bawah.
        </p>
      </header>

      {/* ---- Empat angka penting ---- */}
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/admin/pesanan"
          className={`kartu p-5 transition-shadow hover:shadow-hangat-lg ${
            pesananBaru.length > 0 ? "border-bata bg-bata-lembut" : ""
          }`}
        >
          <p className="label-kolom">Pesanan baru</p>
          <p className="mt-1 font-judul text-4xl text-bata">
            {pesananBaru.length}
          </p>
          <p className="mt-1 text-[0.9rem] text-arang-muda">
            {pesananBaru.length > 0
              ? "Menunggu jawaban Anda"
              : "Tidak ada yang menunggu"}
          </p>
        </Link>

        <div className="kartu p-5">
          <p className="label-kolom">Uang masuk hari ini</p>
          <p className="mt-1 font-judul text-4xl text-daun-tua">
            {rupiah(kas.masuk)}
          </p>
          <p className="mt-1 text-[0.9rem] text-arang-muda">
            Dari pesanan lunas &amp; catatan manual
          </p>
        </div>

        <div className="kartu p-5">
          <p className="label-kolom">Uang keluar hari ini</p>
          <p className="mt-1 font-judul text-4xl text-kayu-tua">
            {rupiah(kas.keluar)}
          </p>
          <Link
            href="/admin/keuangan"
            className="mt-1 inline-block text-[0.9rem] font-semibold text-bata underline underline-offset-4"
          >
            Catat pengeluaran
          </Link>
        </div>

        <div
          className={`kartu p-5 ${
            kas.selisih < 0 ? "border-bahaya/40 bg-bahaya-lembut" : ""
          }`}
        >
          <p className="label-kolom">Sisa hari ini</p>
          <p
            className={`mt-1 font-judul text-4xl ${
              kas.selisih < 0 ? "text-bahaya" : "text-arang"
            }`}
          >
            {rupiah(kas.selisih)}
          </p>
          <p className="mt-1 text-[0.9rem] text-arang-muda">
            {kas.selisih < 0
              ? "Pengeluaran lebih besar dari pemasukan"
              : "Uang masuk dikurangi uang keluar"}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        {/* ---- Pesanan baru ---- */}
        <section className="lg:col-span-7" aria-labelledby="judul-baru">
          <div className="flex items-center justify-between gap-3">
            <h2 id="judul-baru" className="text-2xl">
              Pesanan menunggu jawaban
            </h2>
            <Link
              href="/admin/pesanan"
              className="text-[0.95rem] font-semibold text-bata underline underline-offset-4"
            >
              Buka papan pesanan
            </Link>
          </div>

          {pesananBaru.length === 0 ? (
            <p className="kartu mt-4 p-8 text-center text-arang-muda">
              Tidak ada pesanan baru. Semua sudah terjawab.
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {pesananBaru.map((p) => (
                <li key={p.id} className="kartu p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{p.namaPemesan}</p>
                      <p className="text-[0.9rem] text-arang-muda">
                        {teleponTampil(p.teleponPemesan)} &middot; masuk{" "}
                        {waktuRelatif(p.dibuatPada)}
                      </p>
                    </div>
                    <Lencana kelas={INFO_BAYAR[p.statusBayar].kelas}>
                      {INFO_BAYAR[p.statusBayar].label}
                    </Lencana>
                  </div>

                  <p className="mt-3">
                    {p.item
                      .map((i) => `${i.namaMenu} (${i.jumlah} ${i.satuan})`)
                      .join(", ")}
                  </p>

                  <p className="mt-2 text-[0.95rem]">
                    <span className="text-arang-muda">Dibutuhkan </span>
                    <span className="font-semibold">
                      {labelHari(p.tanggalAcara)}, {jamTampil(p.jamAcara)}
                    </span>
                    <span className="text-arang-muda"> &middot; total </span>
                    <span className="font-semibold">{rupiah(p.total)}</span>
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <AksiPesanan
                      id={p.id}
                      status={p.status}
                      statusBayar={p.statusBayar}
                      total={p.total}
                      ringkas
                    />
                    <Link
                      href={`/admin/pesanan/${p.kode}`}
                      className="tombol tombol-kedua"
                    >
                      Lihat Rincian
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---- Rekap dapur ---- */}
        <aside className="space-y-6 lg:col-span-5">
          <section className="kartu p-5" aria-labelledby="judul-dapur">
            <h2 id="judul-dapur" className="font-judul text-xl">
              Yang harus dimasak hari ini
            </h2>
            <p className="mt-1 text-[0.9rem] text-arang-muda">
              Gabungan semua pesanan yang dibutuhkan hari ini.
            </p>

            {daftarRekap.length === 0 ? (
              <p className="mt-4 text-arang-muda">
                Tidak ada pesanan yang harus disiapkan hari ini.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-krem-tua">
                {daftarRekap.map(([nama, isi]) => (
                  <li
                    key={nama}
                    className="flex items-baseline justify-between gap-3 py-2.5"
                  >
                    <span>{nama}</span>
                    <span className="shrink-0 font-judul text-xl">
                      {isi.jumlah}{" "}
                      <span className="text-[0.85rem] font-normal text-arang-muda">
                        {isi.satuan}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {masakHariIni.length > 0 ? (
              <p className="mt-4 border-t border-krem-tua pt-3 text-[0.9rem] text-arang-muda">
                Dari {masakHariIni.length} pesanan. Pengantaran paling awal pukul{" "}
                <span className="font-semibold text-arang">
                  {jamTampil(masakHariIni[0].jamAcara)}
                </span>
                .
              </p>
            ) : null}
          </section>

          {perluDitagih.length > 0 ? (
            <section
              className="kartu border-kunyit/40 bg-kunyit-lembut p-5"
              aria-labelledby="judul-tagih"
            >
              <h2 id="judul-tagih" className="font-judul text-xl text-kunyit-tua">
                Belum lunas untuk hari ini
              </h2>
              <ul className="mt-3 space-y-2">
                {perluDitagih.map((p) => (
                  <li key={p.id} className="flex justify-between gap-3">
                    <Link
                      href={`/admin/pesanan/${p.kode}`}
                      className="underline underline-offset-4"
                    >
                      {p.namaPemesan}
                    </Link>
                    <span className="shrink-0 font-semibold">
                      {rupiah(p.total)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="kartu p-5" aria-labelledby="judul-besok">
            <h2 id="judul-besok" className="font-judul text-xl">
              Siap-siap untuk besok
            </h2>
            {masakBesok.length === 0 ? (
              <p className="mt-3 text-arang-muda">
                Belum ada pesanan untuk besok.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {masakBesok.map((p) => (
                  <li key={p.id} className="flex justify-between gap-3">
                    <span>
                      <Link
                        href={`/admin/pesanan/${p.kode}`}
                        className="font-medium underline underline-offset-4"
                      >
                        {p.namaPemesan}
                      </Link>
                      <span className="block text-[0.88rem] text-arang-muda">
                        {p.item.map((i) => `${i.jumlah} ${i.satuan}`).join(", ")}{" "}
                        &middot; {jamTampil(p.jamAcara)}
                      </span>
                    </span>
                    <Lencana kelas={INFO_STATUS[p.status].kelas}>
                      {INFO_STATUS[p.status].label}
                    </Lencana>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
