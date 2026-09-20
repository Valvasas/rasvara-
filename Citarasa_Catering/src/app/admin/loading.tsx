export default function MemuatAdmin() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Memuat data dapur...</span>

      <div className="h-24 rounded-3xl bg-white border border-krem-gelap animate-pulse" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[0, 1, 2, 3].map((kolom) => (
          <div
            key={kolom}
            className="bg-krem-tua/50 rounded-3xl border border-krem-gelap/80 p-4 space-y-3"
          >
            <div
              className="h-5 w-24 rounded-full bg-krem-gelap/70 animate-pulse"
              style={{ animationDelay: `${kolom * 60}ms` }}
            />
            {[0, 1].map((kartu) => (
              <div
                key={kartu}
                className="h-40 rounded-2xl bg-white border border-krem-gelap/70 animate-pulse"
                style={{ animationDelay: `${kolom * 60 + kartu * 90}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
