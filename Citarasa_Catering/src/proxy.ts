import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Meneruskan path halaman yang sedang dibuka sebagai header supaya Server
 * Component bisa membacanya untuk statistik kunjungan. Proxy sengaja hanya
 * menyentuh header — tidak ada akses database di sini, karena berkas ini bisa
 * dijalankan terpisah dari kode render.
 */
export function proxy(request: NextRequest) {
  const header = new Headers(request.headers);
  header.set("x-lokasi-halaman", request.nextUrl.pathname);

  return NextResponse.next({ request: { headers: header } });
}

export const config = {
  // Lewati aset statis, berkas unggahan, dan gambar metadata yang dihasilkan
  // Next.js — semuanya bukan kunjungan halaman.
  matcher: [
    "/((?!_next/static|_next/image|unggahan|ilustrasi|icon|apple-icon|opengraph-image|manifest.webmanifest|robots.txt|sitemap.xml|favicon.ico).*)",
  ],
};
