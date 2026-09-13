"use client";

import { useState } from "react";
import { linkWhatsapp, namaPanggilan, rupiah } from "@/lib/format";
import type { StatusBayar, StatusPesanan } from "@/generated/prisma/client";

type Props = {
  telepon: string;
  nama: string;
  kode: string;
  total: number;
  status: StatusPesanan;
  statusBayar: StatusBayar;
  tanggal: string;
  jam: string;
  namaUsaha: string;
  namaBank: string;
  nomorRekening: string;
  namaRekening: string;
};

/**
 * Pemilik usaha ini mengabari pelanggan lewat WhatsApp, bukan lewat email atau
 * notifikasi aplikasi. Daripada memaksanya mengetik ulang kalimat yang sama
 * setiap hari, kalimatnya disiapkan di sini dan tinggal dibuka di WhatsApp.
 */
export function PesanWhatsapp(p: Props) {
  const [disalin, setDisalin] = useState<string | null>(null);

  const panggilan = namaPanggilan(p.nama);
  const rekening =
    p.nomorRekening && p.namaBank
      ? `\n\nPembayaran bisa ditransfer ke:\n${p.namaBank} ${p.nomorRekening}\na.n. ${p.namaRekening}\nSejumlah ${rupiah(p.total)}`
      : "";

  const templat: { kunci: string; judul: string; isi: string }[] = [];

  if (p.status === "BARU") {
    templat.push({
      kunci: "terima",
      judul: "Pesanan diterima",
      isi:
        `Halo ${panggilan}, terima kasih sudah memesan di ${p.namaUsaha}.\n\n` +
        `Pesanan ${p.kode} sudah kami terima untuk ${p.tanggal} pukul ${p.jam} WIB. ` +
        `Total pesanan ${rupiah(p.total)}.` +
        (p.statusBayar !== "LUNAS" ? rekening : "") +
        `\n\nKami kabari lagi kalau pesanan sudah mulai kami siapkan.`,
    });
  }

  if (p.statusBayar !== "LUNAS" && p.status !== "DIBATALKAN") {
    templat.push({
      kunci: "tagih",
      judul: "Ingatkan pembayaran",
      isi:
        `Halo ${panggilan}, mengingatkan dengan hormat untuk pesanan ${p.kode} ` +
        `(${p.tanggal}, pukul ${p.jam} WIB) sebesar ${rupiah(p.total)}.` +
        rekening +
        `\n\nKalau sudah ditransfer, mohon kabari ya. Terima kasih.`,
    });
  }

  if (p.status === "DIPROSES") {
    templat.push({
      kunci: "masak",
      judul: "Sedang dimasak",
      isi:
        `Halo ${panggilan}, pesanan ${p.kode} sedang kami masak sekarang. ` +
        `Insya Allah siap tepat waktu untuk ${p.tanggal} pukul ${p.jam} WIB.`,
    });
  }

  if (p.status === "SIAP") {
    templat.push({
      kunci: "siap",
      judul: "Pesanan siap",
      isi:
        `Halo ${panggilan}, pesanan ${p.kode} sudah siap. ` +
        `Kami antar sesuai jam yang disepakati, pukul ${p.jam} WIB. Terima kasih.`,
    });
  }

  if (p.status === "SELESAI") {
    templat.push({
      kunci: "terimakasih",
      judul: "Ucapan terima kasih",
      isi:
        `Halo ${panggilan}, terima kasih sudah mempercayakan acaranya kepada ${p.namaUsaha}. ` +
        `Semoga masakannya berkenan. Kalau ada masukan, kami senang mendengarnya.`,
    });
  }

  templat.push({
    kunci: "bebas",
    judul: "Sapa biasa",
    isi: `Halo ${panggilan}, saya dari ${p.namaUsaha}, mau menanyakan soal pesanan ${p.kode}.`,
  });

  async function salin(kunci: string, isi: string) {
    try {
      await navigator.clipboard.writeText(isi);
      setDisalin(kunci);
      setTimeout(() => setDisalin(null), 2500);
    } catch {
      setDisalin(null);
    }
  }

  return (
    <section className="kartu tanpa-cetak mt-6 p-5" aria-labelledby="judul-wa">
      <h2 id="judul-wa" className="font-judul text-xl">
        Kabari pemesan lewat WhatsApp
      </h2>
      <p className="mt-1 text-[0.9rem] text-arang-muda">
        Pesannya sudah disiapkan. Tekan tombol, WhatsApp terbuka dengan teks yang
        sudah terisi, tinggal Anda kirim.
      </p>

      <ul className="mt-4 space-y-3">
        {templat.map((t) => (
          <li key={t.kunci} className="rounded-xl border-2 border-krem-tua p-4">
            <p className="font-semibold">{t.judul}</p>
            <p className="mt-1 line-clamp-3 text-[0.9rem] whitespace-pre-line text-arang-muda">
              {t.isi}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={linkWhatsapp(p.telepon, t.isi)}
                target="_blank"
                rel="noopener noreferrer"
                className="tombol tombol-hijau px-4 py-2"
              >
                Buka di WhatsApp
              </a>
              <button
                type="button"
                onClick={() => salin(t.kunci, t.isi)}
                className="tombol tombol-kedua px-4 py-2"
              >
                {disalin === t.kunci ? "Tersalin" : "Salin Teks"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
