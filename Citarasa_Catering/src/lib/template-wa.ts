import { jamTampil, namaPanggilan, rupiah, tanggalPanjang } from "@/lib/format";
import { sisaTagihan } from "@/lib/pembayaran";
import { alamatSitus } from "@/lib/situs";

/**
 * Templat pesan WhatsApp dari dapur ke pemesan. Fungsi murni: tidak ada
 * jaringan, cukup menyusun teks yang kemudian dibuka lewat tautan wa.me.
 * Bahasanya sopan dan pendek — pesan WA yang panjang jarang dibaca habis.
 */

export type PesananUntukWa = {
  kode: string;
  namaPemesan: string;
  tanggalAcara: Date | string;
  jamAcara: string;
  caraAmbil: "AMBIL_SENDIRI" | "DIANTAR";
  total: number;
  dibayar: number;
  minimalDp: number;
  item: { namaMenu: string; jumlah: number; satuan: string }[];
};

export type UsahaUntukWa = {
  namaUsaha: string;
  alamatSitus: string;
  namaBank: string;
  nomorRekening: string;
  namaRekening: string;
};

export type JenisTemplat =
  | "konfirmasi"
  | "tagih_dp"
  | "tagih_pelunasan"
  | "siap"
  | "pengingat"
  | "terima_kasih";

export const LABEL_TEMPLAT: Record<JenisTemplat, string> = {
  konfirmasi: "Konfirmasi pesanan",
  tagih_dp: "Tagih DP",
  tagih_pelunasan: "Tagih pelunasan",
  siap: "Pesanan siap",
  pengingat: "Pengingat H-1",
  terima_kasih: "Terima kasih",
};

function rekening(u: UsahaUntukWa): string {
  if (!u.namaBank || !u.nomorRekening) return "";
  return `\n\nTransfer ke ${u.namaBank} ${u.nomorRekening} a.n. ${u.namaRekening}.`;
}

function ringkasMenu(p: PesananUntukWa): string {
  const tampil = p.item.slice(0, 4).map((i) => `• ${i.namaMenu} × ${i.jumlah} ${i.satuan}`);
  if (p.item.length > 4) tampil.push(`• dan ${p.item.length - 4} menu lain`);
  return tampil.join("\n");
}

/** Templat mana yang relevan untuk keadaan pesanan saat ini (urutan = prioritas). */
export function templatRelevan(p: PesananUntukWa & { status: string }): JenisTemplat[] {
  const sisa = sisaTagihan(p.total, p.dibayar);
  const daftar: JenisTemplat[] = [];
  if (p.status === "BARU" || p.status === "DIKONFIRMASI") daftar.push("konfirmasi");
  if (sisa > 0 && p.dibayar < p.minimalDp) daftar.push("tagih_dp");
  if (sisa > 0) daftar.push("tagih_pelunasan");
  if (p.status === "DIKONFIRMASI" || p.status === "DIPROSES") daftar.push("pengingat");
  if (p.status === "SIAP") daftar.push("siap");
  if (p.status === "SELESAI") daftar.push("terima_kasih");
  return daftar;
}

export function susunPesanWa(jenis: JenisTemplat, p: PesananUntukWa, u: UsahaUntukWa): string {
  const sapa = `Halo ${namaPanggilan(p.namaPemesan)},`;
  const jadwal = `${tanggalPanjang(p.tanggalAcara)} pukul ${jamTampil(p.jamAcara)} WIB`;
  const lacak = `${u.alamatSitus}/lacak?kode=${encodeURIComponent(p.kode)}`;
  const sisa = sisaTagihan(p.total, p.dibayar);
  const kekuranganDp = Math.max(0, p.minimalDp - p.dibayar);

  switch (jenis) {
    case "konfirmasi":
      return (
        `${sapa} pesanan ${p.kode} sudah kami terima untuk ${jadwal}.\n\n${ringkasMenu(p)}\n\n` +
        `Total ${rupiah(p.total)}.` +
        (p.minimalDp > p.dibayar ? ` Mohon DP ${rupiah(kekuranganDp)} agar jadwal masak kami kunci.` : "") +
        rekening(u) +
        `\n\nPantau status: ${lacak}\n\nTerima kasih — ${u.namaUsaha}`
      );
    case "tagih_dp":
      return (
        `${sapa} untuk mengunci pesanan ${p.kode} (${jadwal}), mohon DP ${rupiah(kekuranganDp)}.` +
        rekening(u) +
        `\n\nSetelah transfer, unggah bukti di: ${lacak}\n\nTerima kasih — ${u.namaUsaha}`
      );
    case "tagih_pelunasan":
      return (
        `${sapa} sisa pembayaran pesanan ${p.kode} sebesar ${rupiah(sisa)}` +
        (p.dibayar > 0 ? ` (sudah diterima ${rupiah(p.dibayar)}).` : ".") +
        rekening(u) +
        `\n\nBukti bisa diunggah di: ${lacak}\n\nTerima kasih — ${u.namaUsaha}`
      );
    case "siap":
      return (
        `${sapa} pesanan ${p.kode} sudah siap ` +
        (p.caraAmbil === "DIANTAR" ? "dan segera kami antar." : "untuk diambil di dapur kami.") +
        (sisa > 0 ? `\n\nSisa pembayaran ${rupiah(sisa)} bisa dibayar saat serah terima.` : "") +
        `\n\nTerima kasih — ${u.namaUsaha}`
      );
    case "pengingat":
      return (
        `${sapa} mengingatkan pesanan ${p.kode} untuk ${jadwal}.\n\n${ringkasMenu(p)}\n\n` +
        `Bila ada perubahan jumlah atau jam, kabari kami hari ini ya.` +
        (sisa > 0 ? `\nSisa pembayaran: ${rupiah(sisa)}.` : "") +
        `\n\n— ${u.namaUsaha}`
      );
    case "terima_kasih":
      return (
        `${sapa} terima kasih sudah memesan di ${u.namaUsaha}. Semoga acaranya lancar!\n\n` +
        `Kalau berkenan, kirimkan kesan atau foto hidangannya — sangat berarti untuk dapur kecil kami.`
      );
  }
}

/** Pesan sapaan untuk pelanggan lama yang sudah lama tidak memesan. */
export function pesanSapaPelanggan(nama: string, namaUsaha: string, alamatSitus: string): string {
  return (
    `Halo ${namaPanggilan(nama)}, apa kabar? Sudah lama tidak memesan di ${namaUsaha}. ` +
    `Ada acara atau rapat dalam waktu dekat? Menu terbaru kami bisa dilihat di ${alamatSitus}/menu\n\n` +
    `Kami siap bantu siapkan. Terima kasih!`
  );
}

/** Pesan penagihan piutang yang sudah lewat tanggal acaranya. */
export function pesanTagihPiutang(p: PesananUntukWa, u: UsahaUntukWa): string {
  return (
    `Halo ${namaPanggilan(p.namaPemesan)}, terima kasih sudah memesan di ${u.namaUsaha} (pesanan ${p.kode}, ${tanggalPanjang(p.tanggalAcara)}). ` +
    `Kami catat masih ada sisa pembayaran ${rupiah(sisaTagihan(p.total, p.dibayar))}.` +
    rekening(u) +
    `\n\nMohon kabari bila sudah ditransfer. Terima kasih!`
  );
}

/** Data usaha untuk templat, dari baris Pengaturan. */
export function usahaUntukWa(p: { namaUsaha: string; namaBank: string; nomorRekening: string; namaRekening: string }): UsahaUntukWa {
  return {
    namaUsaha: p.namaUsaha,
    alamatSitus: alamatSitus(),
    namaBank: p.namaBank,
    nomorRekening: p.nomorRekening,
    namaRekening: p.namaRekening,
  };
}
