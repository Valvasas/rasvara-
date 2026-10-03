"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
} from "react";
import {
  aksiHapusFotoMenu,
  aksiJadikanSampulFotoMenu,
  aksiUnggahFotoMenu,
} from "@/app/aksi/menu";
import { MAKS_FOTO_PER_MENU, type HasilFotoMenu } from "@/lib/foto-menu";

export interface FotoMenuRingkas {
  id: string;
  url: string;
  urutan: number;
}

interface KelolaFotoMenuProps {
  menuId: string;
  namaMenu: string;
  foto: FotoMenuRingkas[];
}

export function KelolaFotoMenu({ menuId, namaMenu, foto }: KelolaFotoMenuProps) {
  const [akanDihapus, setAkanDihapus] = useState<string | null>(null);
  const [pratinjau, setPratinjau] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, sedangUnggah] = useActionState<
    HasilFotoMenu | null,
    FormData
  >(aksiUnggahFotoMenu, null);

  const [sedangUbah, mulaiTransisi] = useTransition();
  const [pesanUbah, setPesanUbah] = useState<string | null>(null);

  // Bersihkan pratinjau setelah unggahan sukses supaya form siap dipakai lagi.
  useEffect(() => {
    if (state?.sukses) {
      setPratinjau(null);
      if (inputRef.current) inputRef.current.value = "";
      formRef.current?.reset();
    }
  }, [state]);

  // URL objek pratinjau menahan memori browser sampai dilepas.
  useEffect(() => {
    return () => {
      if (pratinjau) URL.revokeObjectURL(pratinjau);
    };
  }, [pratinjau]);

  const penuh = foto.length >= MAKS_FOTO_PER_MENU;

  function pilihGambar(e: ChangeEvent<HTMLInputElement>) {
    const berkas = e.target.files?.[0];
    if (!berkas) return;
    setPratinjau((lama) => {
      if (lama) URL.revokeObjectURL(lama);
      return URL.createObjectURL(berkas);
    });
  }

  // Dua langkah (klik "Hapus", lalu "Yakin") menggantikan confirm() bawaan
  // peramban yang memblokir seluruh halaman.
  function hapus(id: string) {
    if (akanDihapus !== id) {
      setAkanDihapus(id);
      return;
    }
    setAkanDihapus(null);
    mulaiTransisi(async () => {
      const hasil = await aksiHapusFotoMenu(id);
      setPesanUbah(hasil.pesan ?? null);
    });
  }

  function jadikanSampul(id: string) {
    mulaiTransisi(async () => {
      const hasil = await aksiJadikanSampulFotoMenu(id);
      setPesanUbah(hasil.pesan ?? null);
    });
  }

  return (
    <div className="w-full">
      {
        <div className="space-y-4">
          <p className="teks-redup">
            Foto pertama dipakai sebagai sampul di katalog. Tambahkan foto isi
            box, porsi, dan penyajian supaya pembeli tahu persis yang akan
            datang.
          </p>

          {foto.length > 0 ? (
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {foto.map((f, index) => (
                <li
                  key={f.id}
                  className="relative rounded-xl overflow-hidden border border-krem-gelap bg-white"
                >
                  <div className="relative aspect-square bg-krem/40">
                    {/* Berkas lokal di /unggahan tidak lewat optimasi Next Image. */}
                    <img
                      src={f.url}
                      alt={`Foto ${index + 1} dari ${namaMenu}`}
                      className="w-full h-full object-cover"
                    />
                    {index === 0 && (
                      <span className="absolute top-1.5 left-1.5 lencana bg-white/95 text-kayu border-transparent">
                        Sampul
                      </span>
                    )}
                  </div>

                  <div className="p-1.5 flex items-center gap-1">
                    {index !== 0 && (
                      <button
                        type="button"
                        onClick={() => jadikanSampul(f.id)}
                        disabled={sedangUbah}
                        className="tombol-hantu tombol-kecil flex-1 px-1"
                      >
                        Jadikan sampul
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => hapus(f.id)}
                      disabled={sedangUbah}
                      aria-label={`Hapus foto ${index + 1} dari ${namaMenu}`}
                      className={`tombol tombol-kecil px-2 ${akanDihapus === f.id ? "bg-bahaya text-white" : "text-bahaya hover:bg-bahaya-lembut"}`}
                    >
                      {akanDihapus === f.id ? "Yakin?" : "Hapus"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="teks-redup">
              Belum ada foto. Menu tanpa foto tampil sebagai ikon kategori di
              katalog.
            </p>
          )}

          {pesanUbah && (
            <p
              role="status"
              className="kotak-sukses"
            >
              {pesanUbah}
            </p>
          )}

          {state && (
            <p
              role="status"
              className={state.sukses ? "kotak-sukses" : "kotak-galat"}
            >
              {state.pesan}
            </p>
          )}

          {penuh ? (
            <p className="kotak-peringatan">
              Sudah mencapai batas {MAKS_FOTO_PER_MENU} foto. Hapus satu foto
              dulu kalau mau menambah yang baru.
            </p>
          ) : (
            <form
              ref={formRef}
              action={formAction}
              className="flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <input type="hidden" name="menuId" value={menuId} />
              <input
                ref={inputRef}
                type="file"
                name="berkas"
                id={`foto-menu-${menuId}`}
                accept="image/jpeg,image/png,image/webp"
                onChange={pilihGambar}
                className="sr-only"
                disabled={sedangUnggah}
              />

              <label
                htmlFor={`foto-menu-${menuId}`}
                className="tombol-kedua border-dashed has-[:focus-visible]:ring-2"
              >
                {pratinjau ? "Ganti foto pilihan" : "Pilih foto menu"}
              </label>

              {pratinjau && (
                <>
                  <div className="flex items-center gap-2">
                    <img
                      src={pratinjau}
                      alt="Pratinjau foto yang akan diunggah"
                      className="w-12 h-12 rounded-lg object-cover border border-krem-gelap"
                    />
                    <button
                      type="submit"
                      disabled={sedangUnggah}
                      className="tombol-utama"
                    >
                      {sedangUnggah ? "Mengunggah..." : "Unggah foto"}
                    </button>
                  </div>
                </>
              )}

              <p className="text-xs text-kayu-sedang sm:ml-auto">
                JPG, PNG, atau WebP. Maksimal 5 MB.
              </p>
            </form>
          )}
        </div>
      }
    </div>
  );
}
