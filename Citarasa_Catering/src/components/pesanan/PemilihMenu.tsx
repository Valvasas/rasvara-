"use client";

import { useEffect, useMemo, useState } from "react";
import { rupiah } from "@/lib/format";
import { LABEL_KATEGORI, URUTAN_KATEGORI } from "@/lib/pesanan";
import { IkonCari, IkonTambah } from "@/components/ikon/Ikon";
import { KontrolJumlah } from "@/components/pesanan/KontrolJumlah";
import type { MenuUntukPemesanan } from "@/lib/menu";
import type { KategoriMenu } from "@/generated/prisma/client";

/**
 * Berapa baris menu yang tampil sebelum tombol "tampilkan lainnya". Katalog
 * bisa ratusan item; menumpuk semuanya membuat bagian di bawahnya tak terlihat.
 */
const TAMPIL_AWAL = 10;

interface PemilihMenuProps {
  daftarMenu: MenuUntukPemesanan[];
  jumlahMenu: Record<string, number>;
  onUbah: (menuId: string, jumlah: number) => void;
  /** Menu yang disematkan paling atas (mis. dibawa dari tombol "Pesan"). */
  idSematan?: string | null;
  idCari: string;
  /** Dashboard boleh menerima jumlah di bawah minimal (pesanan khusus). */
  abaikanMinimal?: boolean;
}

/** Pencarian + saringan kategori + daftar menu dengan kontrol jumlah. */
export function PemilihMenu({ daftarMenu, jumlahMenu, onUbah, idSematan, idCari, abaikanMinimal }: PemilihMenuProps) {
  const [cari, setCari] = useState("");
  const [kategoriAktif, setKategoriAktif] = useState<KategoriMenu | "SEMUA">("SEMUA");
  const [batasTampil, setBatasTampil] = useState(TAMPIL_AWAL);

  const kategoriTersedia = useMemo(() => {
    const ada = new Set(daftarMenu.map((m) => m.kategori));
    return URUTAN_KATEGORI.filter((k) => ada.has(k));
  }, [daftarMenu]);

  const menuTersaring = useMemo(() => {
    const kunci = cari.trim().toLowerCase();
    return daftarMenu.filter((m) => {
      if (kategoriAktif !== "SEMUA" && m.kategori !== kategoriAktif) return false;
      if (!kunci) return true;
      return m.nama.toLowerCase().includes(kunci) || m.deskripsi.toLowerCase().includes(kunci);
    });
  }, [daftarMenu, cari, kategoriAktif]);

  useEffect(() => {
    setBatasTampil(TAMPIL_AWAL);
  }, [cari, kategoriAktif]);

  const menuUrut = useMemo(() => {
    if (!idSematan) return menuTersaring;
    const sematan = menuTersaring.find((m) => m.id === idSematan);
    return sematan ? [sematan, ...menuTersaring.filter((m) => m.id !== idSematan)] : menuTersaring;
  }, [menuTersaring, idSematan]);
  const menuTampil = menuUrut.slice(0, batasTampil);

  return (
    <>
      <div className="mt-4 relative">
        <label htmlFor={idCari} className="sr-only">
          Cari menu
        </label>
        <IkonCari className="w-4 h-4 text-kayu-sedang absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          id={idCari}
          type="search"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari menu"
          autoComplete="off"
          className="isian pl-10"
        />
      </div>

      {kategoriTersedia.length > 1 && (
        <div className="mt-3 -mx-5 px-5 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto tanpa-scrollbar">
          {(["SEMUA", ...kategoriTersedia] as const).map((k) => {
            const aktif = kategoriAktif === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKategoriAktif(k)}
                aria-pressed={aktif}
                className={`pil cursor-pointer ${aktif ? "pil-aktif" : ""}`}
              >
                {k === "SEMUA" ? "Semua" : LABEL_KATEGORI[k]}
              </button>
            );
          })}
        </div>
      )}

      <ul className="mt-4 divide-y divide-krem-gelap border-y border-krem-gelap">
        {menuTampil.map((m) => {
          const jml = jumlahMenu[m.id] ?? 0;
          const minimal = abaikanMinimal ? 1 : m.minPesan;
          return (
            <li
              key={m.id}
              className={`flex items-center gap-4 py-4 ${jml > 0 ? "bg-bata-lembut/30 -mx-5 px-5 sm:-mx-6 sm:px-6" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-kayu">{m.nama}</p>
                <p className="text-sm text-kayu-sedang mt-0.5">
                  <span className="text-kayu angka-tabel">{rupiah(m.harga)}</span> / {m.satuan}
                  <span aria-hidden="true"> · </span>
                  min. {m.minPesan}
                  {m.preorderHari > 0 && (
                    <>
                      <span aria-hidden="true"> · </span>H-{m.preorderHari}
                    </>
                  )}
                </p>
              </div>
              {jml > 0 ? (
                <KontrolJumlah
                  jumlah={jml}
                  min={minimal}
                  satuan={m.satuan}
                  nama={m.nama}
                  onUbah={(n) => onUbah(m.id, n)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onUbah(m.id, m.minPesan)}
                  className="tombol-kedua tombol-kecil"
                  aria-label={`Tambah ${m.nama}`}
                >
                  <IkonTambah className="w-3.5 h-3.5" />
                  Tambah
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {menuTersaring.length === 0 && <p className="py-6 text-center teks-redup">Tidak ada menu yang cocok.</p>}

      {menuTersaring.length > menuTampil.length && (
        <button type="button" onClick={() => setBatasTampil((n) => n + TAMPIL_AWAL * 2)} className="tombol-hantu w-full mt-3">
          Tampilkan {menuTersaring.length - menuTampil.length} menu lainnya
        </button>
      )}
    </>
  );
}
