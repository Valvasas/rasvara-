import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { bacaSesi } from "@/lib/auth";
import { rupiah, tanggalPanjang, teleponTampil } from "@/lib/format";
import { LencanaBayar, LencanaStatus } from "@/components/Lencana";
import { TombolKeluar } from "@/components/TombolKeluar";

export default async function HalamanRiwayat() {
  const sesi = await bacaSesi();

  if (!sesi) {
    redirect("/masuk");
  }

  const [pesananSaya, pengguna] = await Promise.all([
    db.pesanan.findMany({
      where: {
        OR: [
          { penggunaId: sesi.id },
          { teleponPemesan: sesi.telepon },
        ],
      },
      include: {
        item: true,
      },
      orderBy: { dibuatPada: "desc" },
    }),
    db.pengguna.findUnique({
      where: { id: sesi.id },
    }),
  ]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      {/* Header Profil & Tombol Keluar */}
      <div className="bg-white rounded-3xl border border-krem-gelap p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-kayu-sedang">
            Akun Pelanggan
          </span>
          <h1 className="text-2xl font-extrabold text-kayu">{pengguna?.nama}</h1>
          <p className="text-xs text-kayu-sedang">
            No. Telepon: {teleponTampil(sesi.telepon)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/pesan"
            className="min-h-[48px] px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-bata hover:bg-bata-tua transition-colors inline-flex items-center justify-center shadow-sm"
          >
            + Pesan Baru
          </Link>
          <TombolKeluar />
        </div>
      </div>

      {/* Daftar Riwayat Pesanan */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-kayu">Riwayat Pesanan Anda</h2>

        {pesananSaya.length === 0 ? (
          <div className="bg-white rounded-2xl border border-krem-gelap p-12 text-center max-w-md mx-auto space-y-4">
            <div className="text-4xl">📋</div>
            <h3 className="text-base font-bold text-kayu">
              Belum Ada Pesanan
            </h3>
            <p className="text-xs text-kayu-sedang">
              Anda belum pernah membuat pesanan katering dengan akun ini.
            </p>
            <Link
              href="/menu"
              className="min-h-[48px] px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-bata hover:bg-bata-tua transition-colors inline-flex items-center justify-center"
            >
              Lihat Menu Sekarang
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {pesananSaya.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-krem-gelap p-6 hover:border-bata/40 hover:shadow-sm transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-krem-gelap/60 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm text-kayu">
                      {p.kode}
                    </span>
                    <span className="text-xs text-kayu-sedang">
                      {tanggalPanjang(p.tanggalAcara)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <LencanaStatus status={p.status} untukPelanggan={true} />
                    <LencanaBayar statusBayar={p.statusBayar} />
                  </div>
                </div>

                <div className="text-xs text-kayu-sedang">
                  <span className="font-semibold text-kayu">Menu: </span>
                  {p.item.map((it) => `${it.namaMenu} (${it.jumlah} ${it.satuan})`).join(", ")}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <span className="text-xs text-kayu-sedang block">Total</span>
                    <span className="text-base font-extrabold text-bata">
                      {rupiah(p.total)}
                    </span>
                  </div>

                  <Link
                    href={`/pesanan/${p.kode}`}
                    className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold text-kayu bg-krem-tua hover:bg-krem-gelap transition-colors inline-flex items-center justify-center"
                  >
                    Buka Nota Pesanan &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

