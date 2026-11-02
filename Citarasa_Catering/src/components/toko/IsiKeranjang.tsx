"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IlustrasiKeranjangKosong } from "@/components/ilustrasi/Ilustrasi";
import { IkonKalender, IkonMangkuk, IkonPanahKanan, IkonPeringatan, IkonSampah } from "@/components/ikon/Ikon";
import { kabari } from "@/components/Pemberitahuan";
import { KontrolJumlah } from "@/components/toko/KontrolJumlah";
import { rupiah } from "@/lib/format";
import {
  hapusDariKeranjang,
  kosongkanKeranjang,
  selaraskanKeranjang,
  ubahJumlahKeranjang,
  useKeranjang,
  type DataMenuKeranjang,
} from "@/lib/keranjang";

/** Gambar kecil menu, dengan cadangan ikon bila menu belum berfoto. */
export function GambarMini({ url, nama, ukuran = "w-20 h-20" }: { url: string | null; nama: string; ukuran?: string }) {
  return (
    <span className={`relative ${ukuran} shrink-0 overflow-hidden rounded-xl bg-beras-tua flex items-center justify-center`}>
      {url ? (
        <Image src={url} alt="" fill sizes="80px" className="object-cover" />
      ) : (
        <IkonMangkuk className="w-8 h-8 text-pandan/40" strokeWidth={1.3} aria-label={nama} />
      )}
    </span>
  );
}

export function IsiKeranjang({ menuTerbaru }: { menuTerbaru: DataMenuKeranjang[] }) {
  const isi = useKeranjang();
  const [siap, setSiap] = useState(false);
  const [dibuang, setDibuang] = useState<string[]>([]);
  const [yakinKosongkan, setYakinKosongkan] = useState(false);

  // Harga & status menu bisa berubah sejak pembeli menaruhnya di keranjang
  // (mungkin berhari-hari lalu). Data tampilan selalu diselaraskan dengan
  // katalog terbaru sebelum pembeli melihat total.
  const peta = useMemo(() => new Map(menuTerbaru.map((m) => [m.menuId, m])), [menuTerbaru]);
  useEffect(() => {
    setDibuang(selaraskanKeranjang(peta));
    setSiap(true);
  }, [peta]);

  const subtotal = isi.reduce((n, i) => n + i.harga * i.jumlah, 0);
  const totalPorsi = isi.reduce((n, i) => n + i.jumlah, 0);
  const maxPreorder = isi.reduce((n, i) => Math.max(n, i.preorderHari), 0);

  if (!siap) {
    return (
      <div className="grid gap-3" aria-busy="true" aria-label="Memuat keranjang">
        {[0, 1, 2].map((i) => (
          <div key={i} className="kerangka h-28" />
        ))}
      </div>
    );
  }

  if (isi.length === 0) {
    return (
      <div className="kartu kartu-isi text-center max-w-md mx-auto anim-masuk">
        <IlustrasiKeranjangKosong className="w-56 mx-auto" />
        <h2 className="mt-2 text-xl font-bold text-arang">Keranjangmu masih kosong</h2>
        <p className="teks-redup mt-1">Yuk pilih nasi kotak, tumpeng, atau snack box untuk acaramu.</p>
        {dibuang.length > 0 && (
          <p className="mt-4 kotak-peringatan text-left">
            {dibuang.join(", ")} sudah tidak dijual, jadi kami keluarkan dari keranjang.
          </p>
        )}
        <Link href="/menu" className="tombol-utama tombol-besar w-full mt-6">
          Lihat menu
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
      <div className="space-y-3 min-w-0">
        {dibuang.length > 0 && (
          <p role="status" className="kotak-peringatan flex items-start gap-2">
            <IkonPeringatan className="w-5 h-5 shrink-0 mt-0.5" />
            <span>
              <strong>{dibuang.join(", ")}</strong> sudah tidak dijual, jadi kami keluarkan dari keranjang.
            </span>
          </p>
        )}
        {maxPreorder > 0 && (
          <p className="kotak-info bg-kunyit-lembut/70 text-kunyit-tua border-kunyit/30 flex items-start gap-2">
            <IkonKalender className="w-5 h-5 shrink-0 mt-0.5" />
            <span>
              Ada menu yang perlu dipesan <strong>paling lambat H-{maxPreorder}</strong> sebelum acara.
            </span>
          </p>
        )}

        <ul className="kartu divide-y divide-beras-gelap overflow-hidden">
          {isi.map((i) => (
            <li key={i.menuId} className="p-4 sm:p-5 flex gap-3 sm:gap-4 anim-masuk">
              <Link href={`/menu/${i.slug}`} tabIndex={-1} aria-hidden="true">
                <GambarMini url={i.fotoUrl} nama={i.nama} />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/menu/${i.slug}`} className="font-semibold text-arang leading-snug hover:text-pandan line-clamp-2">
                    {i.nama}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      hapusDariKeranjang(i.menuId);
                      kabari(`${i.nama} dihapus dari keranjang`, { jenis: "info" });
                    }}
                    aria-label={`Hapus ${i.nama}`}
                    className="tombol-ikon -mt-2 -mr-2 shrink-0 hover:!text-bahaya"
                  >
                    <IkonSampah className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-[14px] text-arang-sedang">
                  <span className="angka-tabel">{rupiah(i.harga)}</span> / {i.satuan} · min. {i.minPesan}
                  {i.preorderHari > 0 && ` · H-${i.preorderHari}`}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <KontrolJumlah
                    ukuran="kecil"
                    jumlah={i.jumlah}
                    min={i.minPesan}
                    satuan={i.satuan}
                    nama={i.nama}
                    onUbah={(n) => ubahJumlahKeranjang(i.menuId, n)}
                  />
                  <span className="font-bold text-arang angka-tabel">{rupiah(i.harga * i.jumlah)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <Link href="/menu" className="tombol-hantu tombol-kecil text-pandan hover:!text-pandan-tua">
            + Tambah menu lain
          </Link>
          {yakinKosongkan ? (
            <span className="flex items-center gap-2 text-[14px]">
              Kosongkan semua?
              <button
                type="button"
                onClick={() => {
                  kosongkanKeranjang();
                  setYakinKosongkan(false);
                }}
                className="tombol-bahaya tombol-kecil"
              >
                Ya, kosongkan
              </button>
              <button type="button" onClick={() => setYakinKosongkan(false)} className="tombol-hantu tombol-kecil">
                Batal
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setYakinKosongkan(true)} className="tombol-hantu tombol-kecil">
              Kosongkan keranjang
            </button>
          )}
        </div>
      </div>

      <aside aria-labelledby="judul-ringkasan-keranjang" className="kartu kartu-isi lg:sticky lg:top-24">
        <h2 id="judul-ringkasan-keranjang" className="judul-bagian">
          Ringkasan belanja
        </h2>
        <dl className="mt-4 space-y-2 text-[15px]">
          <div className="flex justify-between">
            <dt className="text-arang-sedang">
              {isi.length} menu · {totalPorsi} porsi
            </dt>
            <dd className="angka-tabel">{rupiah(subtotal)}</dd>
          </div>
          <div className="flex justify-between text-arang-sedang">
            <dt>Ongkir &amp; voucher</dt>
            <dd>di langkah berikutnya</dd>
          </div>
          <div className="flex justify-between items-baseline pt-3 border-t border-beras-gelap">
            <dt className="font-semibold text-arang">Subtotal</dt>
            <dd className="text-2xl font-bold text-arang angka-tabel">{rupiah(subtotal)}</dd>
          </div>
        </dl>
        <Link href="/pesan" className="hidden md:inline-flex tombol-utama tombol-besar w-full mt-5">
          Lanjut atur jadwal &amp; bayar
          <IkonPanahKanan className="w-5 h-5" />
        </Link>
      </aside>

      {/* Bar checkout menempel di bawah — ponsel */}
      <div aria-hidden="true" className="md:hidden h-20" />
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/97 backdrop-blur-md border-t border-beras-gelap shadow-[var(--shadow-mengambang)] aman-bawah">
        <div className="px-4 pt-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] text-arang-sedang">Subtotal ({isi.length} menu)</p>
            <p className="text-lg font-bold text-arang angka-tabel leading-tight">{rupiah(subtotal)}</p>
          </div>
          <Link href="/pesan" className="tombol-utama">
            Checkout
            <IkonPanahKanan className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
