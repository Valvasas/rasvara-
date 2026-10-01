export default function MemuatAdmin() {
  return (
    <div aria-busy="true">
      <span className="sr-only" role="status">Memuat data dapur...</span>
      <div className="h-8 w-56 rounded-lg bg-krem-gelap/60 animate-pulse" />
      <div className="mt-2 h-4 w-80 max-w-full rounded bg-krem-gelap/40 animate-pulse" />
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((k) => (
          <div key={k} className="space-y-3">
            <div className="h-5 w-24 rounded bg-krem-gelap/60 animate-pulse" />
            {[0, 1].map((i) => (
              <div key={i} className="h-36 kartu animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
