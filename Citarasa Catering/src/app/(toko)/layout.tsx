import { KopToko } from "@/components/toko/KopToko";
import { KakiToko } from "@/components/toko/KakiToko";

export default function LayoutToko({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <KopToko />
      <main className="flex-1 pb-16">{children}</main>
      <KakiToko />
    </div>
  );
}

