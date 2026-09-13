import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormMasuk } from "@/components/FormMasuk";
import { bacaSesi } from "@/lib/auth";

export const metadata: Metadata = { title: "Daftar Akun" };

export default async function HalamanDaftar() {
  const sesi = await bacaSesi();
  if (sesi) redirect(sesi.peran === "PEMILIK" ? "/admin" : "/riwayat");

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl sm:text-4xl">Buat akun</h1>
      <p className="mt-3 text-arang-muda">
        Dengan akun, pesanan lama Anda tersimpan rapi dan tidak perlu mengetik
        ulang nama serta nomor HP setiap memesan.
      </p>

      <div className="kartu mt-7 p-6">
        <FormMasuk mode="daftar" />
      </div>
    </div>
  );
}
