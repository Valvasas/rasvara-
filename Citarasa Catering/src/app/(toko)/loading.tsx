export default function MemuatToko() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl space-y-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Memuat halaman...</span>

      <div className="mx-auto max-w-2xl space-y-3 text-center">
        <div className="h-4 w-40 mx-auto rounded-full bg-krem-gelap/70 animate-pulse" />
        <div className="h-8 w-64 mx-auto rounded-full bg-krem-gelap/70 animate-pulse" />
        <div className="h-4 w-80 max-w-full mx-auto rounded-full bg-krem-gelap/50 animate-pulse" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-krem-gelap p-6 space-y-4 animate-pulse"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center justify-between">
              <div className="h-5 w-20 rounded-full bg-krem-gelap/70" />
              <div className="h-5 w-16 rounded-md bg-krem-gelap/50" />
            </div>
            <div className="h-5 w-3/4 rounded bg-krem-gelap/70" />
            <div className="h-3 w-full rounded bg-krem-gelap/50" />
            <div className="h-3 w-2/3 rounded bg-krem-gelap/50" />
            <div className="pt-4 border-t border-krem-gelap/50 flex justify-between">
              <div className="h-6 w-24 rounded bg-krem-gelap/70" />
              <div className="h-6 w-16 rounded bg-krem-gelap/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
