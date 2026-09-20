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
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${info.kelas} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-75" />
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
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${info.kelas} ${className}`}
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
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-krem-tua text-kayu-sedang border border-krem-gelap ${className}`}
    >
      {label}
    </span>
  );
}

