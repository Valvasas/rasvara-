export default function MemuatToko() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14" aria-busy="true">
      <span className="sr-only" role="status">Memuat halaman...</span>
      <div className="h-9 w-48 rounded-lg bg-krem-gelap/60 animate-pulse" />
      <div className="mt-3 h-4 w-72 max-w-full rounded bg-krem-gelap/40 animate-pulse" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="kartu overflow-hidden animate-pulse">
            <div className="aspect-[4/3] bg-krem-tua" />
            <div className="p-5 space-y-3">
              <div className="h-4 w-3/4 rounded bg-krem-gelap/60" />
              <div className="h-3 w-full rounded bg-krem-gelap/40" />
              <div className="h-4 w-1/3 rounded bg-krem-gelap/60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
