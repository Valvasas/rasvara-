"use client";

import { useState } from "react";
import Link from "next/link";
import {
  jamTampil,
  rupiah,
  tanggalPanjang,
  tanggalPendek,
  teleponTampil,
} from "@/lib/format";
import { LABEL_AMBIL, LABEL_BAYAR } from "@/lib/pesanan";
import type { ItemPesanan, Pengaturan, Pesanan } from "@/generated/prisma/client";

interface TampilanCetakPesananProps {
  pesanan: Pesanan & { item: ItemPesanan[] };
  pengaturan: Pengaturan;
}

export function TampilanCetakPesanan({
  pesanan,
  pengaturan,
}: TampilanCetakPesananProps) {
  const [modeCetak, setModeCetak] = useState<"dapur" | "nota">("dapur");

  const jalankanCetak = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-krem-tua/40 py-6 px-4 print:bg-white print:p-0 print:m-0">
      {/* Kontrol di Layar (Disembunyikan saat dicetak / print) */}
      <div className="max-w-2xl mx-auto mb-6 bg-white p-4 rounded-2xl border border-krem-gelap shadow-sm space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin"
            className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold text-kayu bg-krem hover:bg-krem-gelap transition-colors inline-flex items-center gap-1.5"
          >
            <span>&larr;</span> Kembali ke Papan Pesanan
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={jalankanCetak}
              className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-extrabold bg-bata text-white hover:bg-bata-tua shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <span>🖨️</span>
              <span>Cetak Dokumen (Ctrl+P)</span>
            </button>
          </div>
        </div>

        {/* Tab Pilihan Dokumen */}
        <div className="flex items-center gap-2 pt-2 border-t border-krem-gelap">
          <span className="text-xs font-bold text-kayu-sedang shrink-0">Format:</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setModeCetak("dapur")}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                modeCetak === "dapur"
                  ? "bg-kayu text-white shadow-sm"
                  : "bg-krem text-kayu hover:bg-krem-gelap"
              }`}
            >
              👨‍🍳 Lembar Dapur (KOT / Tempel Box)
            </button>
            <button
              type="button"
              onClick={() => setModeCetak("nota")}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                modeCetak === "nota"
                  ? "bg-kayu text-white shadow-sm"
                  : "bg-krem text-kayu hover:bg-krem-gelap"
              }`}
            >
              🧾 Struk / Nota Pembelian
            </button>
          </div>
        </div>

        <p className="text-[11px] text-kayu-sedang italic">
          💡 Format ini otomatis menyesuaikan ukuran printer thermal (80mm) maupun kertas A4 standar tanpa memotong informasi penting.
        </p>
      </div>

      {/* DOKUMEN CETAK UTAMA */}
      <div className="max-w-xl mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-krem-gelap shadow-md print:shadow-none print:border-none print:p-2 print:m-0 print:max-w-none text-black font-sans">
        {modeCetak === "dapur" ? (
          /* ================= MODE LEMBAR KERJA DAPUR (KOT) ================= */
          <div className="space-y-4 text-xs">
            {/* Header Dokumen */}
            <div className="text-center border-b-2 border-black pb-3 space-y-1">
              <h1 className="text-lg font-black uppercase tracking-wider">
                {pengaturan.namaUsaha}
              </h1>
              <div className="inline-block px-3 py-1 bg-black text-white font-mono font-bold text-sm uppercase rounded">
                Lembar Kerja Dapur (KOT)
              </div>
              <p className="font-mono text-base font-extrabold tracking-widest pt-1">
                {pesanan.kode}
              </p>
            </div>

            {/* Kotak Waktu Acara yang Sangat Mencolok */}
            <div className="border-2 border-black p-3 rounded-lg bg-gray-50 print:bg-white text-center space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-700">
                WAKTU SIAP / PENGIRIMAN
              </div>
              <div className="text-xl sm:text-2xl font-black text-black font-mono">
                🕒 {jamTampil(pesanan.jamAcara)} WIB
              </div>
              <div className="text-xs font-bold text-black">
                📅 {tanggalPanjang(pesanan.tanggalAcara)}
              </div>
            </div>

            {/* Informasi Pemesan & Pengambilan */}
            <div className="border border-black p-3 rounded-lg space-y-1.5 text-xs">
              <div className="flex justify-between items-start">
                <span className="font-bold text-gray-700">Pemesan:</span>
                <span className="font-extrabold text-right">
                  {pesanan.namaPemesan} ({teleponTampil(pesanan.teleponPemesan)})
                </span>
              </div>
              <div className="flex justify-between items-start">
                <span className="font-bold text-gray-700">Metode:</span>
                <span className="font-extrabold uppercase text-right">
                  {LABEL_AMBIL[pesanan.caraAmbil as keyof typeof LABEL_AMBIL]}
                </span>
              </div>
              {pesanan.alamatAntar && (
                <div className="pt-1 border-t border-dashed border-gray-400">
                  <span className="font-bold text-gray-700 block">Alamat Antar:</span>
                  <p className="font-semibold text-xs mt-0.5 whitespace-pre-line">
                    {pesanan.alamatAntar}
                  </p>
                </div>
              )}
              <div className="pt-1 border-t border-dashed border-gray-400 flex justify-between items-center">
                <span className="font-bold text-gray-700">Status Bayar:</span>
                <span className="font-mono font-bold uppercase">
                  {pesanan.statusBayar === "LUNAS" ? "✅ SUDAH LUNAS" : `⚠️ TAGIH TUNAI (${rupiah(pesanan.total)})`}
                </span>
              </div>
            </div>

            {/* Tabel Menu & Checklist Masak */}
            <div>
              <div className="font-black text-xs uppercase tracking-wider mb-1.5 pb-1 border-b border-black flex justify-between">
                <span>Rincian Masakan</span>
                <span>Checklist QC</span>
              </div>

              <div className="divide-y divide-gray-300">
                {pesanan.item.map((it, idx) => (
                  <div key={it.id} className="py-2.5 flex items-start justify-between gap-3">
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center gap-1.5 font-bold text-sm text-black">
                        <span className="text-xs text-gray-500 font-mono">#{idx + 1}</span>
                        <span>{it.namaMenu}</span>
                      </div>
                      {it.catatan && (
                        <p className="text-xs italic bg-gray-100 print:bg-transparent px-1.5 py-0.5 rounded inline-block font-semibold border border-gray-300">
                          Catatan: {it.catatan}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      {/* Porsi Besar */}
                      <span className="text-base font-black font-mono border-b-2 border-black pb-0.5">
                        {it.jumlah} {it.satuan}
                      </span>

                      {/* Kotak Checklist Fisik */}
                      <div className="flex items-center gap-2 font-mono text-[10px] text-gray-700">
                        <span className="border border-black px-1 py-0.5 rounded text-center">
                          [ &nbsp; ] Masak
                        </span>
                        <span className="border border-black px-1 py-0.5 rounded text-center">
                          [ &nbsp; ] Kemas
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Catatan Pesanan Keseluruhan */}
            {pesanan.catatan && (
              <div className="p-3 border-2 border-black bg-gray-50 print:bg-transparent rounded-lg space-y-1">
                <span className="font-black uppercase tracking-wider block text-xs">
                  ⚠️ CATATAN KHUSUS DARI PEMESAN:
                </span>
                <p className="text-xs font-semibold whitespace-pre-line">
                  {pesanan.catatan}
                </p>
              </div>
            )}

            {/* Area Tanda Tangan QC Dapur */}
            <div className="pt-4 border-t-2 border-dashed border-black grid grid-cols-2 text-center text-xs gap-4">
              <div>
                <p className="font-bold text-gray-600">Koki / Tim Masak</p>
                <div className="h-10 border-b border-gray-400 mt-2"></div>
                <span className="text-[10px] text-gray-500">(Nama & Paraf)</span>
              </div>
              <div>
                <p className="font-bold text-gray-600">Checker / Pengemas</p>
                <div className="h-10 border-b border-gray-400 mt-2"></div>
                <span className="text-[10px] text-gray-500">(Nama & Paraf)</span>
              </div>
            </div>

            <div className="text-center text-[10px] text-gray-400 pt-2 font-mono">
              Dicetak pada: {tanggalPendek(new Date())} • Citarasa Catering KOT System
            </div>
          </div>
        ) : (
          /* ================= MODE STRUK / NOTA PEMBELIAN ================= */
          <div className="space-y-4 text-xs font-mono">
            {/* Header Toko */}
            <div className="text-center border-b border-dashed border-black pb-3 space-y-1">
              <h1 className="text-base font-black uppercase font-sans">
                {pengaturan.namaUsaha}
              </h1>
              {pengaturan.tagline && (
                <p className="text-[11px] font-sans text-gray-600">{pengaturan.tagline}</p>
              )}
              {pengaturan.alamat && (
                <p className="text-[10px] text-gray-600">{pengaturan.alamat}</p>
              )}
              {pengaturan.whatsapp && (
                <p className="text-[10px] text-gray-600">
                  WA: {teleponTampil(pengaturan.whatsapp)}
                </p>
              )}
              <div className="pt-2 font-bold text-sm tracking-wider uppercase font-sans">
                NOTA PEMESANAN
              </div>
            </div>

            {/* Info Nota */}
            <div className="space-y-1 text-xs border-b border-dashed border-black pb-2">
              <div className="flex justify-between">
                <span>No. Pesanan</span>
                <span className="font-bold">{pesanan.kode}</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal Acara</span>
                <span>{tanggalPendek(pesanan.tanggalAcara)}</span>
              </div>
              <div className="flex justify-between">
                <span>Jam Acara</span>
                <span>{jamTampil(pesanan.jamAcara)} WIB</span>
              </div>
              <div className="flex justify-between">
                <span>Pemesan</span>
                <span>{pesanan.namaPemesan}</span>
              </div>
              <div className="flex justify-between">
                <span>Telepon</span>
                <span>{teleponTampil(pesanan.teleponPemesan)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pengambilan</span>
                <span>{LABEL_AMBIL[pesanan.caraAmbil as keyof typeof LABEL_AMBIL]}</span>
              </div>
              <div className="flex justify-between">
                <span>Metode Bayar</span>
                <span>{LABEL_BAYAR[pesanan.caraBayar as keyof typeof LABEL_BAYAR]}</span>
              </div>
            </div>

            {/* Rincian Item Pesanan */}
            <div className="border-b border-dashed border-black pb-2 space-y-2">
              {pesanan.item.map((it) => (
                <div key={it.id} className="space-y-0.5">
                  <div className="flex justify-between font-bold">
                    <span>{it.namaMenu}</span>
                    <span>{rupiah(it.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-600">
                    <span>
                      {it.jumlah} {it.satuan} &times; {rupiah(it.hargaSatuan)}
                    </span>
                    {it.catatan && <span className="italic">({it.catatan})</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Ringkasan Biaya */}
            <div className="space-y-1 text-xs border-b border-dashed border-black pb-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{rupiah(pesanan.subtotal)}</span>
              </div>
              {pesanan.ongkir > 0 && (
                <div className="flex justify-between">
                  <span>Ongkos Kirim</span>
                  <span>{rupiah(pesanan.ongkir)}</span>
                </div>
              )}
              {pesanan.diskon > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Diskon</span>
                  <span>-{rupiah(pesanan.diskon)}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-dashed border-black">
                <span>TOTAL</span>
                <span>{rupiah(pesanan.total)}</span>
              </div>
            </div>

            {/* Status Bayar & Rekening */}
            <div className="text-center py-2 bg-gray-50 print:bg-transparent rounded border border-dashed border-black space-y-1">
              <div className="font-extrabold text-sm uppercase">
                {pesanan.statusBayar === "LUNAS" ? "✅ LUNAS" : "⚠️ BELUM LUNAS / TAGIH SAAT TERIMA"}
              </div>
              {pesanan.statusBayar !== "LUNAS" && pengaturan.nomorRekening && (
                <div className="text-[11px]">
                  <span>Transfer: {pengaturan.namaBank} </span>
                  <span className="font-bold">{pengaturan.nomorRekening}</span>
                  <span> a.n. {pengaturan.namaRekening}</span>
                </div>
              )}
            </div>

            {/* Footer Nota */}
            <div className="text-center text-[11px] pt-2 space-y-1 font-sans">
              <p className="font-bold">Terima kasih atas pesanan Anda!</p>
              <p className="text-gray-500 text-[10px]">
                Masakan hangat, siap tepat waktu untuk momen spesial Anda.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

