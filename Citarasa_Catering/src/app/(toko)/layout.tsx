import { KopToko } from "@/components/toko/KopToko";
import { KakiToko } from "@/components/toko/KakiToko";
import { catatKunjungan } from "@/lib/analitik";

export default async function LayoutToko({
  children,
}: {
  children: React.ReactNode;
}) {
  // Dicatat di satu tempat supaya halaman toko baru otomatis ikut terhitung
  // tanpa perlu menambahkan apa pun di tiap berkas halaman.
  await catatKunjungan();

  return (
    <div className="flex flex-col min-h-screen">
      <KopToko />
      <main className="flex-1 pb-16">{children}</main>
      <KakiToko />
    </div>
  );
}

