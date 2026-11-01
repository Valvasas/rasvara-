/** Kerangka katalog dengan kilau — terasa "sedang dimuat", bukan macet. */
export default function MemuatToko() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-5 pb-10 sm:pt-10" aria-busy="true">
      <span className="sr-only" role="status">
        Memuat halaman…
      </span>
      <div className="kerangka h-9 w-48" />
      <div className="kerangka mt-3 h-4 w-72 max-w-full" />
      <div className="mt-6 flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="kerangka h-10 w-24 !rounded-full" />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="kartu overflow-hidden">
            <div className="kerangka aspect-square sm:aspect-[4/3] !rounded-none" />
            <div className="p-3 sm:p-4 space-y-2.5">
              <div className="kerangka h-4 w-4/5" />
              <div className="kerangka h-5 w-1/2" />
              <div className="kerangka h-10 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
