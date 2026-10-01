import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { bacaSesi } from "@/lib/auth";
import { FormMenu } from "@/components/admin/FormMenu";
import { IkonPanahKiri } from "@/components/ikon/Ikon";

export const metadata: Metadata = { title: "Tambah menu" };

export default async function HalamanTambahMenu() {
  const sesi = await bacaSesi();
  if (sesi?.peran !== "PEMILIK") redirect("/admin");

  return (
    <div className="max-w-3xl">
      <Link href="/admin/menu" className="inline-flex items-center gap-1.5 text-sm text-kayu-sedang hover:text-kayu">
        <IkonPanahKiri className="w-4 h-4" /> Menu
      </Link>
      <h1 className="judul-halaman mt-3">Tambah menu</h1>
      <p className="teks-redup mt-1">Foto bisa ditambahkan setelah menu disimpan.</p>
      <div className="kartu kartu-isi mt-6">
        <FormMenu />
      </div>
    </div>
  );
}
