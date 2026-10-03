import type {
  KategoriMenu,
  StatusBayar,
  StatusPesanan,
} from "@/generated/prisma/client";
import {
  INFO_BAYAR,
  INFO_STATUS,
  LABEL_KATEGORI,
} from "@/lib/pesanan";

interface LencanaStatusProps {
  status: StatusPesanan;
  untukPelanggan?: boolean;
  className?: string;
}

export function LencanaStatus({
  status,
  untukPelanggan = false,
  className = "",
}: LencanaStatusProps) {
  const info = INFO_STATUS[status];
  const teks = untukPelanggan ? info.labelPelanggan : info.label;

  return (
    <span
      className={`lencana ${info.kelas} ${className}`}
    >
      <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {teks}
    </span>
  );
}

interface LencanaBayarProps {
  statusBayar: StatusBayar;
  className?: string;
}

export function LencanaBayar({
  statusBayar,
  className = "",
}: LencanaBayarProps) {
  const info = INFO_BAYAR[statusBayar];

  return (
    <span
      className={`lencana ${info.kelas} ${className}`}
    >
      {info.label}
    </span>
  );
}

interface LencanaKategoriProps {
  kategori: KategoriMenu;
  className?: string;
}

export function LencanaKategori({
  kategori,
  className = "",
}: LencanaKategoriProps) {
  const label = LABEL_KATEGORI[kategori] || kategori;

  return (
    <span
      className={`lencana bg-krem-tua text-kayu-sedang border-transparent ${className}`}
    >
      {label}
    </span>
  );
}

