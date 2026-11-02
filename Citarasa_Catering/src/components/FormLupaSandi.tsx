"use client";

import { useState } from "react";
import { InputTelepon } from "@/components/InputTelepon";
import { IkonWhatsapp } from "@/components/ikon/Ikon";
import { linkWhatsapp, teleponHpSah, teleponTampil } from "@/lib/format";

/**
 * Menyusun pesan WhatsApp permintaan atur ulang sandi. Sepenuhnya di
 * peramban: tidak ada yang dikirim ke server kita, jadi halaman ini tidak
 * bisa dipakai untuk menebak nomor mana yang punya akun.
 */
export function FormLupaSandi({ whatsappDapur, namaUsaha }: { whatsappDapur: string; namaUsaha: string }) {
  const [telepon, setTelepon] = useState("");
  const sah = teleponHpSah(telepon);
  const tautan = sah
    ? linkWhatsapp(
        whatsappDapur,
        `Halo ${namaUsaha}, saya lupa kata sandi akun saya.\nNomor akun: ${teleponTampil(telepon)}\nMohon dibuatkan kata sandi sementara. Terima kasih.`
      )
    : null;

  return (
    <div className="space-y-4">
      <InputTelepon
        id="telepon-lupa"
        name="telepon"
        label="Nomor HP akunmu"
        nilai={telepon}
        onNilai={setTelepon}
        petunjuk="Nomor yang kamu pakai saat mendaftar."
        required
      />
      {tautan ? (
        <a href={tautan} target="_blank" rel="noopener noreferrer" className="tombol-utama tombol-besar w-full">
          <IkonWhatsapp className="w-5 h-5" />
          Kirim permintaan lewat WhatsApp
        </a>
      ) : (
        <button type="button" disabled className="tombol-utama tombol-besar w-full">
          <IkonWhatsapp className="w-5 h-5" />
          Isi nomor dulu
        </button>
      )}
    </div>
  );
}
