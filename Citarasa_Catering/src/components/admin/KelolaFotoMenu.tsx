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
  const [terbuka, setTerbuka] = useState(false);
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

  function hapus(id: string) {
    const yakin = window.confirm(
      "Hapus foto ini? Foto yang sudah dihapus tidak bisa dikembalikan."
    );
    if (!yakin) return;

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
      <button
        type="button"
        onClick={() => setTerbuka((v) => !v)}
        aria-expanded={terbuka}
        className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border border-krem-gelap bg-krem/40 text-kayu hover:bg-krem-tua transition-colors inline-flex items-center gap-2 cursor-pointer"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span>
          Foto ({foto.length}/{MAKS_FOTO_PER_MENU})
        </span>
        <span aria-hidden="true">{terbuka ? "▲" : "▼"}</span>
      </button>

      {terbuka && (
        <div className="mt-3 p-4 rounded-2xl border border-krem-gelap bg-krem/30 space-y-4">
          <p className="text-[11px] text-kayu-sedang">
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
                      <span className="absolute top-1.5 left-1.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-daun text-white shadow">
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
                        className="flex-1 min-h-[36px] px-1.5 py-1 rounded-lg text-[10px] font-bold text-daun-tua bg-daun-lembut hover:bg-daun hover:text-white disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        Jadikan Sampul
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => hapus(f.id)}
                      disabled={sedangUbah}
                      aria-label={`Hapus foto ${index + 1} dari ${namaMenu}`}
                      className="min-h-[36px] px-2 py-1 rounded-lg text-[10px] font-bold text-bahaya bg-bahaya-lembut hover:bg-bahaya hover:text-white disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      Hapus
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-kayu-sedang italic">
              Belum ada foto. Menu tanpa foto tampil sebagai ikon kategori di
              katalog.
            </p>
          )}

          {pesanUbah && (
            <p
              role="status"
              className="text-xs font-semibold text-daun-tua bg-daun-lembut border border-daun/20 rounded-xl px-3 py-2"
            >
              {pesanUbah}
            </p>
          )}

          {state && (
            <p
              role="status"
              className={`text-xs font-semibold rounded-xl px-3 py-2 border ${
                state.sukses
                  ? "text-daun-tua bg-daun-lembut border-daun/20"
                  : "text-bahaya bg-bahaya-lembut border-bahaya/20"
              }`}
            >
              {state.pesan}
            </p>
          )}

          {penuh ? (
            <p className="text-xs font-semibold text-kunyit-tua bg-kunyit-lembut border border-kunyit/20 rounded-xl px-3 py-2">
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
                className="hidden"
                disabled={sedangUnggah}
              />

              <label
                htmlFor={`foto-menu-${menuId}`}
                className="min-h-[48px] px-4 py-2.5 rounded-xl border-2 border-dashed border-bata/40 bg-bata-lembut/30 hover:bg-bata-lembut/50 text-bata font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
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
                      className="min-h-[48px] px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-daun hover:bg-daun-tua disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {sedangUnggah ? "Mengunggah..." : "Unggah Foto"}
                    </button>
                  </div>
                </>
              )}

              <p className="text-[11px] text-kayu-sedang sm:ml-auto">
                JPG, PNG, atau WebP. Maksimal 5 MB.
              </p>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
