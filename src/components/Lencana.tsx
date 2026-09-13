export function Lencana({
  children,
  kelas = "",
}: {
  children: React.ReactNode;
  kelas?: string;
}) {
  return <span className={`lencana ${kelas}`}>{children}</span>;
}

/** Titik kecil penanda status, dipakai di dalam lencana. */
export function Titik({ kelas = "bg-current" }: { kelas?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${kelas}`}
    />
  );
}
