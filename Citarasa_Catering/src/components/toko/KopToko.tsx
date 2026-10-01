import { bacaSesi } from "@/lib/auth";
import { Wordmark } from "@/components/Wordmark";
import { NavToko } from "@/components/toko/NavToko";

export async function KopToko() {
  const sesi = await bacaSesi();

  return (
    <header className="sticky top-0 z-40 bg-krem/90 backdrop-blur-md border-b border-krem-gelap/70">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Wordmark href="/" compact />
        <NavToko peran={sesi?.peran ?? null} />
      </div>
    </header>
  );
}
