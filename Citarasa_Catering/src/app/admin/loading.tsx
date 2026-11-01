export default function MemuatAdmin() {
  return (
    <div aria-busy="true">
      <span className="sr-only" role="status">
        Memuat data dapur…
      </span>
      <div className="kerangka h-8 w-56" />
      <div className="kerangka mt-2 h-4 w-80 max-w-full" />
      <div className="mt-8 grid gap-4 grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((k) => (
          <div key={k} className="kerangka h-28 !rounded-2xl" />
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="kerangka h-64 !rounded-2xl" />
        <div className="kerangka h-64 !rounded-2xl" />
      </div>
    </div>
  );
}
