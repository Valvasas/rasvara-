import { bacaSesi } from "@/lib/auth";
import { ambilPengaturan } from "@/lib/pengaturan";
import { menitSekarangWib, sedangBuka } from "@/lib/format";
import { jamSiapTercepatHariIni } from "@/lib/jadwal";
import { NavBawah, NavToko } from "@/components/toko/NavToko";
import { PitaStatusDapur } from "@/components/toko/PitaStatusDapur";

export async function KopToko() {
  const [sesi, pengaturan] = await Promise.all([bacaSesi(), ambilPengaturan()]);

  return (
    <>
      {/* Pita status ikut tergulir pergi; hanya baris navigasi yang menempel. */}
      <PitaStatusDapur
        jamBuka={pengaturan.jamBuka}
        jamTutup={pengaturan.jamTutup}
        jedaMenit={pengaturan.jedaMinimumMenit}
        awal={{
          buka: sedangBuka(pengaturan.jamBuka, pengaturan.jamTutup),
          tercepat: jamSiapTercepatHariIni({ menitSekarang: menitSekarangWib(), jedaMenit: pengaturan.jedaMinimumMenit }),
        }}
      />
      <header
        className="sticky top-0 z-40 bg-white/92 backdrop-blur-md border-b border-beras-gelap"
        // Kepala tidak ikut bergeser saat perpindahan halaman beranimasi —
        // ia jangkar pandangan, yang bergerak hanya isinya.
        style={{ viewTransitionName: "kop-toko" }}
      >
        <NavToko peran={sesi?.peran ?? null} nama={sesi?.nama ?? null} namaUsaha={pengaturan.namaUsaha} />
      </header>
    </>
  );
}

/** Bar navigasi bawah ponsel; dipisah supaya layout bisa menaruhnya setelah kaki halaman. */
export async function NavBawahToko() {
  const sesi = await bacaSesi();
  return <NavBawah peran={sesi?.peran ?? null} />;
}
