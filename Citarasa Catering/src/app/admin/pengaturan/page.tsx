import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { bacaSesi } from "@/lib/auth";
import { ambilPengaturan } from "@/lib/pengaturan";
import { FormPengaturan } from "@/components/admin/FormPengaturan";
import { DaftarStafDapur } from "@/components/admin/DaftarStafDapur";

export default async function HalamanAdminPengaturan() {
  const sesi = await bacaSesi();
  if (sesi?.peran !== "PEMILIK") {
    redirect("/admin");
  }

  const [pengaturan, daftarStaf] = await Promise.all([
    ambilPengaturan(),
    db.pengguna.findMany({
      where: { peran: "STAF_DAPUR" },
      select: { id: true, nama: true, telepon: true, dibuatPada: true },
      orderBy: { dibuatPada: "asc" },
    }),
  ]);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="permukaan-kartu p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="judul-utama text-2xl text-kayu">
            Pengaturan Usaha & Rekening
          </h1>
          <p className="text-xs text-kayu-sedang mt-0.5">
            Informasi ini ditampilkan di nota digital pembeli, halaman beranda, dan
            bagian footer.
          </p>
        </div>
      </div>

      <FormPengaturan awal={pengaturan} />

      <DaftarStafDapur daftarAwal={daftarStaf} />
    </div>
  );
}

