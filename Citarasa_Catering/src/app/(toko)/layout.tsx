import { KopToko } from "@/components/toko/KopToko";
import { KakiToko } from "@/components/toko/KakiToko";
import { NavBawahToko } from "@/components/toko/NavBawahToko";
import { bacaSesi } from "@/lib/auth";
import { catatKunjungan } from "@/lib/analitik";

export default async function LayoutToko({
  children,
}: {
  children: React.ReactNode;
}) {
  // Dicatat di satu tempat supaya halaman toko baru otomatis ikut terhitung
  // tanpa perlu menambahkan apa pun di tiap berkas halaman.
  const [sesi] = await Promise.all([bacaSesi(), catatKunjungan()]);

  return (
    <div className="flex flex-col min-h-screen">
      <KopToko />
      <main id="isi" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <KakiToko />
      <NavBawahToko peran={sesi?.peran ?? null} />
    </div>
  );
}
