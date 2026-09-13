import type { StatusPesanan } from "@/generated/prisma/client";

const TAHAP: { status: StatusPesanan; label: string; isi: string }[] = [
  { status: "BARU", label: "Pesanan masuk", isi: "Kami sudah menerima pesanan Anda." },
  { status: "DIKONFIRMASI", label: "Dikonfirmasi", isi: "Pesanan diterima dan masuk antrean dapur." },
  { status: "DIPROSES", label: "Sedang dimasak", isi: "Dapur sedang mengerjakan pesanan Anda." },
  { status: "SIAP", label: "Siap", isi: "Pesanan siap diambil atau diantar." },
  { status: "SELESAI", label: "Selesai", isi: "Pesanan sudah diterima. Terima kasih." },
];

export function JejakStatus({ status }: { status: StatusPesanan }) {
  if (status === "DIBATALKAN") {
    return (
      <div className="rounded-xl border-2 border-bahaya/30 bg-bahaya-lembut px-5 py-4">
        <p className="font-semibold text-bahaya">Pesanan ini dibatalkan.</p>
        <p className="mt-1 text-[0.95rem] text-bahaya/85">
          Kalau ini di luar dugaan Anda, silakan hubungi kami lewat WhatsApp.
        </p>
      </div>
    );
  }

  const indeksSekarang = TAHAP.findIndex((t) => t.status === status);

  return (
    <ol className="grid gap-3 sm:grid-cols-5 sm:gap-2">
      {TAHAP.map((tahap, i) => {
        const lewat = i < indeksSekarang;
        const sekarang = i === indeksSekarang;

        return (
          <li key={tahap.status} className="flex gap-3 sm:block">
            <div className="flex items-center gap-2 sm:mb-2">
              <span
                aria-hidden="true"
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[0.8rem] font-bold ${
                  lewat
                    ? "border-daun bg-daun text-white"
                    : sekarang
                      ? "border-bata bg-bata text-white"
                      : "border-krem-tua bg-kertas text-arang-muda"
                }`}
              >
                {lewat ? "✓" : i + 1}
              </span>
              <span
                aria-hidden="true"
                className={`hidden h-0.5 flex-1 sm:block ${
                  lewat ? "bg-daun" : "bg-krem-tua"
                } ${i === TAHAP.length - 1 ? "sm:hidden" : ""}`}
              />
            </div>

            <div>
              <p
                className={`font-semibold ${
                  sekarang ? "text-bata" : lewat ? "text-arang" : "text-arang-muda"
                }`}
              >
                {tahap.label}
                {sekarang ? (
                  <span className="khusus-pembaca-layar"> (tahap saat ini)</span>
                ) : null}
              </p>
              {sekarang ? (
                <p className="text-[0.88rem] text-arang-muda">{tahap.isi}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
