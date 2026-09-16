import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { bacaSesi } from "@/lib/auth";
import { rupiah } from "@/lib/format";
import { LABEL_KATEGORI, URUTAN_KATEGORI } from "@/lib/pesanan";
import { TombolToggleMenu } from "@/components/admin/TombolToggleMenu";
import { KelolaFotoMenu } from "@/components/admin/KelolaFotoMenu";
import type { FotoMenu, KategoriMenu, Menu } from "@/generated/prisma/client";

type MenuDenganFoto = Menu & { foto: FotoMenu[] };

interface HalamanAdminMenuProps {
  searchParams: Promise<{ q?: string; kategori?: string }>;
}

export default async function HalamanAdminMenu({
  searchParams,
}: HalamanAdminMenuProps) {
  const sesi = await bacaSesi();
  if (sesi?.peran !== "PEMILIK") {
    redirect("/admin");
  }

  const params = await searchParams;
  const kataKunci = params.q?.trim() || "";
  const filterKategori = params.kategori || "";

  const filterKategoriEnum =
    filterKategori && URUTAN_KATEGORI.includes(filterKategori as KategoriMenu)
      ? (filterKategori as KategoriMenu)
      : undefined;

  const kondisiPencarian = kataKunci
    ? [
        { nama: { contains: kataKunci, mode: "insensitive" as const } },
        { deskripsi: { contains: kataKunci, mode: "insensitive" as const } },
      ]
    : undefined;

  let daftarMenu: MenuDenganFoto[] = [];

  try {
    daftarMenu = await db.menu.findMany({
      where: {
        ...(filterKategoriEnum ? { kategori: filterKategoriEnum } : {}),
        ...(kondisiPencarian ? { OR: kondisiPencarian } : {}),
      },
      orderBy: [{ kategori: "asc" }, { urutan: "asc" }, { nama: "asc" }],
      include: { foto: { orderBy: { urutan: "asc" } } },
    });
  } catch {
    // Fallback saat DB belum jalan
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-krem-gelap flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-kayu">
            Kelola Menu & Kuota Harian
          </h1>
          <p className="text-xs text-kayu-sedang mt-0.5">
            Nyalakan atau matikan menu yang kehabisan bahan di pasar. Menu yang
            dinonaktifkan tidak akan muncul di katalog pembeli.
          </p>
        </div>

        <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-krem-tua text-kayu border border-krem-gelap">
          Total {daftarMenu.length} Menu Terdaftar
        </span>
      </div>

      {/* Baris Pencarian & Filter Menu */}
      <form method="get" className="bg-white p-4 rounded-2xl border border-krem-gelap flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex-1 min-w-[240px] flex items-center gap-2">
          <span className="text-sm">🔍</span>
          <input
            type="text"
            name="q"
            defaultValue={kataKunci}
            placeholder="Cari nama menu atau deskripsi bahan..."
            className="w-full min-h-[44px] px-3 py-1.5 rounded-xl border border-krem-gelap bg-krem/30 text-xs font-medium text-kayu placeholder:text-kayu-sedang/60 focus:outline-none focus:border-bata"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            name="kategori"
            defaultValue={filterKategori}
            className="min-h-[44px] px-3 py-1.5 rounded-xl border border-krem-gelap bg-krem/30 text-xs font-medium text-kayu focus:outline-none focus:border-bata"
          >
            <option value="">Semua Kategori</option>
            {URUTAN_KATEGORI.map((k) => (
              <option key={k} value={k}>
                {LABEL_KATEGORI[k]}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="min-h-[44px] px-4 py-2 rounded-xl font-bold text-xs bg-kayu text-white hover:bg-kayu-sedang transition-colors cursor-pointer"
          >
            Filter
          </button>

          {(kataKunci || filterKategori) && (
            <Link
              href="/admin/menu"
              className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold text-bahaya bg-bahaya-lembut hover:bg-bahaya hover:text-white transition-colors inline-flex items-center"
            >
              Reset
            </Link>
          )}
        </div>
      </form>

      {/* Tabel / Daftar Menu per Kategori */}
      <div className="space-y-6">
        {URUTAN_KATEGORI.map((kat) => {
          const menuKategori = daftarMenu.filter((m) => m.kategori === kat);
          if (menuKategori.length === 0) return null;

          return (
            <div
              key={kat}
              className="bg-white rounded-3xl border border-krem-gelap overflow-hidden shadow-sm space-y-3"
            >
              <div className="p-4 bg-krem-tua/60 border-b border-krem-gelap flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="font-extrabold text-sm text-kayu">
                    {LABEL_KATEGORI[kat]}
                  </h2>
                  <span className="text-xs font-semibold text-kayu-sedang">
                    ({menuKategori.length} varian)
                  </span>
                </div>
              </div>

              <div className="divide-y divide-krem-gelap/60">
                {menuKategori.map((item) => (
                  <div key={item.id} className="p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm text-kayu">
                          {item.nama}
                        </h3>
                        {item.foto.length === 0 && (
                          <span className="text-[10px] font-semibold text-kunyit-tua bg-kunyit-lembut px-2 py-0.5 rounded">
                            Belum ada foto
                          </span>
                        )}
                        {item.preorderHari > 0 ? (
                          <span className="text-[10px] font-semibold text-kunyit-tua bg-kunyit-lembut px-2 py-0.5 rounded">
                            Preorder {item.preorderHari} hari
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-daun-tua bg-daun-lembut px-2 py-0.5 rounded">
                            Bisa hari ini
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-kayu-sedang line-clamp-1">
                        {item.deskripsi}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-kayu-sedang">
                        <span>
                          Harga: <strong className="text-bata">{rupiah(item.harga)}</strong> / {item.satuan}
                        </span>
                        <span>&bull;</span>
                        <span>Min. Pesan: {item.minPesan}</span>
                        {item.kapasitasHarian && (
                          <>
                            <span>&bull;</span>
                            <span>Kapasitas: {item.kapasitasHarian}/hari</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <TombolToggleMenu id={item.id} aktif={item.aktif} />
                    </div>
                    </div>

                    <KelolaFotoMenu
                      menuId={item.id}
                      namaMenu={item.nama}
                      foto={item.foto.map((f) => ({
                        id: f.id,
                        url: f.url,
                        urutan: f.urutan,
                      }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

