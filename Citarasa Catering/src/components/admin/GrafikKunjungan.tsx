"use client";

import { useState } from "react";
import { angka } from "@/lib/format";
import type { BarisHarian } from "@/lib/analitik";

/**
 * Dua warna ini dipilih lewat pengujian keterbacaan buta warna, bukan selera.
 * Pasangan bata (#C2410C) + daun (#15803D) — yang paling "khas merek" — hanya
 * berjarak ΔE 7 pada penglihatan deuteranopia, artinya sekitar 8% pembaca pria
 * tidak bisa membedakan kedua batang. Pasangan bata-tua + kunyit berjarak
 * ΔE 20 dan tetap memakai palet hangat yang sama.
 */
const WARNA_PENGUNJUNG = "#9A3412";
const WARNA_TAMPILAN = "#D97706";

interface GrafikKunjunganProps {
  data: BarisHarian[];
}

export function GrafikKunjungan({ data }: GrafikKunjunganProps) {
  const [disorot, setDisorot] = useState<number | null>(null);

  // Skala diberi ruang di atas batang tertinggi supaya puncaknya tidak menempel
  // ke tepi kartu dan masih terbaca sebagai puncak, bukan sebagai terpotong.
  const tertinggi = Math.max(...data.map((d) => d.tampilan), 1);
  const puncak = Math.max(1, Math.ceil(tertinggi * 1.15));

  // Label sumbu X dijarangkan supaya tidak bertabrakan saat rentang 30 hari.
  const jarakLabel = data.length > 20 ? 5 : data.length > 10 ? 2 : 1;

  return (
    <div className="bg-white rounded-3xl border border-krem-gelap shadow-sm overflow-hidden">
      <div className="p-4 bg-krem-tua/60 border-b border-krem-gelap flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-extrabold text-sm text-kayu">
          Kunjungan Harian
        </h2>

        <ul className="flex items-center gap-4 text-[11px] font-semibold text-kayu-sedang">
          <li className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ background: WARNA_PENGUNJUNG }}
              aria-hidden="true"
            />
            Pengunjung unik
          </li>
          <li className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ background: WARNA_TAMPILAN }}
              aria-hidden="true"
            />
            Halaman dibuka
          </li>
        </ul>
      </div>

      <div className="p-5">
        <div className="relative">
          {/* Garis bantu dibuat samar supaya tidak bersaing dengan data. */}
          <div
            className="absolute inset-x-0 top-0 h-48 flex flex-col justify-between pointer-events-none"
            aria-hidden="true"
          >
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="border-t border-krem-gelap/50" />
            ))}
          </div>

          <div className="absolute -top-1 left-0 text-[10px] font-semibold text-kayu-sedang pointer-events-none">
            {angka(tertinggi)}
          </div>

          <div className="relative flex items-end gap-[3px] h-48">
            {data.map((d, i) => (
              <div
                key={d.tanggal}
                className="relative flex-1 h-full flex items-end justify-center gap-[2px] group"
                onMouseEnter={() => setDisorot(i)}
                onMouseLeave={() => setDisorot(null)}
                onFocus={() => setDisorot(i)}
                onBlur={() => setDisorot(null)}
                tabIndex={0}
                aria-label={`${d.label}: ${d.pengunjung} pengunjung unik, ${d.tampilan} halaman dibuka`}
              >
                {/* Area sentuh menutupi seluruh tinggi kolom, bukan hanya batangnya. */}
                <span
                  className={`absolute inset-0 rounded-md transition-colors ${
                    disorot === i ? "bg-krem-tua/70" : "bg-transparent"
                  }`}
                  aria-hidden="true"
                />

                <div
                  className="relative w-1/2 rounded-t transition-all"
                  style={{
                    height: `${Math.max(d.pengunjung === 0 ? 0 : 3, (d.pengunjung / puncak) * 100)}%`,
                    background: WARNA_PENGUNJUNG,
                  }}
                />
                <div
                  className="relative w-1/2 rounded-t transition-all"
                  style={{
                    height: `${Math.max(d.tampilan === 0 ? 0 : 3, (d.tampilan / puncak) * 100)}%`,
                    background: WARNA_TAMPILAN,
                  }}
                />

                {disorot === i && (
                  <div
                    role="tooltip"
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 w-max max-w-[180px] px-3 py-2 rounded-xl bg-kayu text-krem shadow-lg text-[11px] leading-relaxed pointer-events-none"
                  >
                    <p className="font-extrabold mb-0.5">{d.label}</p>
                    <p>{angka(d.pengunjung)} pengunjung unik</p>
                    <p>{angka(d.tampilan)} halaman dibuka</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sumbu tanggal */}
        <div className="flex gap-[3px] mt-2">
          {data.map((d, i) => (
            <div
              key={d.tanggal}
              className="flex-1 text-center text-[10px] font-semibold text-kayu-sedang truncate"
            >
              {i % jarakLabel === 0 ? d.label : ""}
            </div>
          ))}
        </div>

        {/* Tampilan tabel: angka tetap terbaca walau warna tidak terlihat,
            dan bisa dipakai pembaca layar. */}
        <details className="mt-5 group">
          <summary className="text-xs font-bold text-bata cursor-pointer hover:underline list-none inline-flex items-center gap-1.5">
            <span className="group-open:hidden">Lihat angkanya dalam tabel</span>
            <span className="hidden group-open:inline">Sembunyikan tabel</span>
          </summary>

          <div className="mt-3 overflow-x-auto rounded-2xl border border-krem-gelap">
            <table className="w-full text-xs">
              <caption className="sr-only">
                Jumlah pengunjung unik dan halaman dibuka per hari
              </caption>
              <thead className="bg-krem-tua text-kayu">
                <tr>
                  <th scope="col" className="text-left font-bold px-4 py-2.5">
                    Tanggal
                  </th>
                  <th scope="col" className="text-right font-bold px-4 py-2.5">
                    Pengunjung unik
                  </th>
                  <th scope="col" className="text-right font-bold px-4 py-2.5">
                    Halaman dibuka
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-krem-gelap/60 bg-white">
                {data.map((d) => (
                  <tr key={d.tanggal}>
                    <td className="px-4 py-2 text-kayu-sedang">{d.tanggal}</td>
                    <td className="px-4 py-2 text-right font-semibold text-kayu">
                      {angka(d.pengunjung)}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-kayu">
                      {angka(d.tampilan)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </div>
  );
}
