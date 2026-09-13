import Link from "next/link";
import type { Metadata } from "next";
import { FormLacak } from "@/components/toko/FormLacak";
import { ambilPengaturan } from "@/lib/pengaturan";
import { linkWhatsapp } from "@/lib/format";

export const metadata: Metadata = {
  title: "Lacak Pesanan",
  description: "Cek status pesanan Citarasa Catering memakai kode pesanan.",
};

export default async function HalamanLacak({
  searchParams,
}: {
  searchParams: Promise<{ kode?: string }>;
}) {
  const [param, pengaturan] = await Promise.all([
    searchParams,
    ambilPengaturan(),
  ]);

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl sm:text-4xl">Lacak pesanan</h1>
      <p className="mt-3 text-arang-muda">
        Masukkan kode pesanan dan nomor HP yang Anda pakai saat memesan. Keduanya
        diminta supaya data pesanan Anda tidak bisa dibuka orang lain.
      </p>

      <div className="kartu mt-7 p-6">
        <FormLacak kodeAwal={param.kode ?? ""} />
      </div>

      <div className="mt-6 space-y-2 text-center text-[0.95rem] text-arang-muda">
        <p>
          Lupa kode pesanan?{" "}
          {pengaturan.whatsapp ? (
            <a
              href={linkWhatsapp(
                pengaturan.whatsapp,
                "Halo Citarasa Catering, saya lupa kode pesanan saya."
              )}
              className="font-semibold text-bata underline underline-offset-4"
            >
              Tanya lewat WhatsApp
            </a>
          ) : (
            "Hubungi kami langsung."
          )}
        </p>
        <p>
          Punya akun?{" "}
          <Link
            href="/masuk"
            className="font-semibold text-bata underline underline-offset-4"
          >
            Masuk
          </Link>{" "}
          untuk melihat semua pesanan Anda sekaligus.
        </p>
      </div>
    </div>
  );
}
