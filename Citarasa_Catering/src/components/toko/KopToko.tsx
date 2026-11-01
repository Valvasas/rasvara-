import { bacaSesi } from "@/lib/auth";
import { NavBawah, NavToko } from "@/components/toko/NavToko";

export async function KopToko() {
  const sesi = await bacaSesi();

  return (
    <header
      className="sticky top-0 z-40 bg-krem/90 backdrop-blur-md border-b border-krem-gelap/70"
      // Kepala tidak ikut bergeser saat perpindahan halaman beranimasi —
      // ia jangkar pandangan, yang bergerak hanya isinya.
      style={{ viewTransitionName: "kop-toko" }}
    >
      <NavToko peran={sesi?.peran ?? null} nama={sesi?.nama ?? null} />
    </header>
  );
}

/** Bar navigasi bawah ponsel; dipisah supaya layout bisa menaruhnya setelah kaki halaman. */
export async function NavBawahToko() {
  const sesi = await bacaSesi();
  return <NavBawah peran={sesi?.peran ?? null} />;
}
