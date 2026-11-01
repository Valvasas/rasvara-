import { jamTampil, namaPanggilan, rupiah, tanggalPanjang } from "@/lib/format";
import type { CaraAmbil, CaraBayar, StatusBayar, StatusPesanan } from "@/generated/prisma/client";

/**
 * Templat pesan WhatsApp dari dapur ke pembeli, sesuai tahap pesanan.
 *
 * Penjual katering rumahan mengetik kalimat yang sama puluhan kali sehari:
 * "pesanan sudah kami terima", "sedang dimasak", "sudah siap diambil",
 * "mohon transfer ke ...". Satu tombol "Kabari pembeli" di kartu pesanan
 * membuka WhatsApp dengan kalimat yang sudah rapi dan datanya tepat (kode,
 * jadwal, total, rekening) — penjual tinggal menekan kirim, dan tidak ada
 * salah ketik nominal transfer.
 *
 * Ditulis sebagai fungsi murni supaya bisa diuji tanpa database.
 */

export type DataPesananWa = {
  kode: string;
  namaPemesan: string;
  status: StatusPesanan;
  statusBayar: StatusBayar;
  caraBayar: CaraBayar;
  caraAmbil: CaraAmbil;
  total: number;
  tanggalAcara: Date | string;
  jamAcara: string;
  alasanBatal?: string | null;
};

export type DataUsahaWa = {
  namaUsaha: string;
  alamat: string;
  namaBank: string;
  nomorRekening: string;
  namaRekening: string;
  alamatSitus: string;
};

function belumLunasTransfer(p: DataPesananWa) {
  return p.caraBayar === "TRANSFER" && p.statusBayar === "BELUM_BAYAR" && p.status !== "DIBATALKAN";
}

function blokRekening(p: DataPesananWa, u: DataUsahaWa): string {
  if (!u.nomorRekening) return "";
  return (
    `\n\nPembayaran transfer sebesar *${rupiah(p.total)}* ke:\n` +
    `${u.namaBank} ${u.nomorRekening}\na.n. ${u.namaRekening}\n` +
    `Bukti transfer bisa diunggah di tautan di bawah ya.`
  );
}

function tautan(p: DataPesananWa, u: DataUsahaWa) {
  return `\n\nPantau pesanan: ${u.alamatSitus.replace(/\/$/, "")}/pesanan/${p.kode}`;
}

/**
 * Label tombol + isi pesan untuk tahap pesanan saat ini.
 *
 * `tanpaNominal`: untuk staf dapur, yang memang tidak diberi akses ke angka
 * uang — pesannya tetap berguna, tapi total & rekening tidak ikut tertulis.
 */
export function pesanWaStatus(
  p: DataPesananWa,
  u: DataUsahaWa,
  opsi: { tanpaNominal?: boolean } = {}
): { label: string; pesan: string } {
  const uang = !opsi.tanpaNominal;
  const sapa = `Halo ${namaPanggilan(p.namaPemesan)}`;
  const jadwal = `${tanggalPanjang(p.tanggalAcara)} pukul ${jamTampil(p.jamAcara)} WIB`;
  const ttd = `\n\nTerima kasih,\n${u.namaUsaha}`;

  switch (p.status) {
    case "BARU":
      return {
        label: "Kabari: pesanan diterima",
        pesan:
          `${sapa}, terima kasih sudah memesan di ${u.namaUsaha}.\n\n` +
          `Pesanan *${p.kode}* untuk ${jadwal} sudah kami terima dan sedang kami cek.` +
          (uang ? ` Total: *${rupiah(p.total)}*.` : "") +
          (uang && belumLunasTransfer(p) ? blokRekening(p, u) : "") +
          tautan(p, u) +
          ttd,
      };
    case "DIKONFIRMASI":
      return {
        label: "Kabari: pesanan dikonfirmasi",
        pesan:
          `${sapa}, pesanan *${p.kode}* sudah kami konfirmasi dan masuk jadwal masak untuk ${jadwal}.` +
          (uang && belumLunasTransfer(p) ? blokRekening(p, u) : "") +
          tautan(p, u) +
          ttd,
      };
    case "DIPROSES":
      return {
        label: "Kabari: sedang dimasak",
        pesan: `${sapa}, pesanan *${p.kode}* sedang kami masak sekarang. Siap sesuai jadwal ${jadwal}.` + tautan(p, u) + ttd,
      };
    case "SIAP": {
      const tunai =
        p.caraBayar === "TUNAI" && p.statusBayar !== "LUNAS"
          ? `\nMohon siapkan pembayaran tunai${uang ? ` *${rupiah(p.total)}*` : ""}.`
          : "";
      return {
        label: p.caraAmbil === "DIANTAR" ? "Kabari: sedang diantar" : "Kabari: siap diambil",
        pesan:
          p.caraAmbil === "DIANTAR"
            ? `${sapa}, pesanan *${p.kode}* sudah siap dan sedang dalam perjalanan ke alamat Anda.${tunai}` + ttd
            : `${sapa}, pesanan *${p.kode}* sudah siap diambil${u.alamat ? ` di ${u.alamat}` : ""}.${tunai}` + ttd,
      };
    }
    case "SELESAI":
      return {
        label: "Ucapkan terima kasih",
        pesan:
          `${sapa}, terima kasih sudah mempercayakan acaranya ke ${u.namaUsaha}. Semoga lancar dan semua tamu puas!\n\n` +
          `Ditunggu pesanan berikutnya ya.` +
          ttd,
      };
    case "DIBATALKAN":
      return {
        label: "Kabari: pesanan dibatalkan",
        pesan:
          `${sapa}, mohon maaf, pesanan *${p.kode}* untuk ${jadwal} kami batalkan.` +
          (p.alasanBatal ? `\nAlasan: ${p.alasanBatal}` : "") +
          `\n\nSilakan balas pesan ini bila ada pertanyaan.` +
          ttd,
      };
  }
}

/** Pengingat bayar untuk pesanan transfer yang belum dibayar — atau null bila tidak relevan. */
export function pesanWaTagihan(p: DataPesananWa, u: DataUsahaWa): string | null {
  if (!belumLunasTransfer(p) || !u.nomorRekening) return null;
  return (
    `Halo ${namaPanggilan(p.namaPemesan)}, mengingatkan pembayaran pesanan *${p.kode}* untuk ${tanggalPanjang(p.tanggalAcara)}.` +
    blokRekening(p, u) +
    tautan(p, u) +
    `\n\nTerima kasih,\n${u.namaUsaha}`
  );
}
