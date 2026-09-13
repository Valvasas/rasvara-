import { KopToko } from "@/components/toko/KopToko";
import { KakiToko } from "@/components/toko/KakiToko";

export default function LayoutToko({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <KopToko />
      <main id="isi-utama" className="flex-1">
        {children}
      </main>
      <KakiToko />
    </div>
  );
}
