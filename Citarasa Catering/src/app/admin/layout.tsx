import { redirect } from "next/navigation";
import { bacaSesi } from "@/lib/auth";
import { Wordmark } from "@/components/Wordmark";
import { TombolKeluar } from "@/components/TombolKeluar";
import { NavAdmin } from "@/components/admin/NavAdmin";

export default async function LayoutAdmin({
  children,
}: {
  children: React.ReactNode;
}) {
  const sesi = await bacaSesi();

  if (!sesi) {
    redirect("/masuk");
  }

  if (sesi.peran !== "PEMILIK") {
    redirect("/riwayat");
  }

  return (
    <div className="min-h-screen bg-krem flex flex-col">
      {/* Header Dapur Admin */}
      <header className="sticky top-0 z-40 bg-kayu text-krem border-b border-kayu-sedang shadow-md">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <Wordmark href="/admin" compact={true} className="text-white" />
            <span className="text-xs font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-kunyit text-kayu">
              Dapur
            </span>
          </div>

          {/* Navigasi Admin Dapur - Tombol Besar & Jelas */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 w-full sm:w-auto">
            <NavAdmin />
            <div className="ml-2 pl-2 border-l border-kayu-sedang shrink-0">
              <TombolKeluar label="Keluar" className="min-h-[42px] text-xs py-1.5" />
            </div>
          </div>
        </div>
      </header>

      {/* Konten Utama Admin */}
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        {children}
      </main>
    </div>
  );
}

