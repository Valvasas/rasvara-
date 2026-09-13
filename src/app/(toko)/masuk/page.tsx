import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormMasuk } from "@/components/FormMasuk";
import { bacaSesi } from "@/lib/auth";

export const metadata: Metadata = { title: "Masuk" };

export default async function HalamanMasuk() {
  const sesi = await bacaSesi();
  if (sesi) redirect(sesi.peran === "PEMILIK" ? "/admin" : "/riwayat");

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl sm:text-4xl">Masuk ke akun</h1>
      <p className="mt-3 text-arang-muda">
        Masuk untuk melihat riwayat pesanan Anda. Untuk sekadar memesan, Anda
        tidak wajib punya akun.
      </p>

      <div className="kartu mt-7 p-6">
        <FormMasuk mode="masuk" />
      </div>
    </div>
  );
}
