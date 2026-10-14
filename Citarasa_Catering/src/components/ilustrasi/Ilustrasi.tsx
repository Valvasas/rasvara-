import type { SVGProps } from "react";
import type { KategoriMenu } from "@/generated/prisma/client";

/**
 * Ilustrasi hidangan & suasana dapur, digambar sebagai SVG inline.
 *
 * Kenapa bukan gambar raster/maskot: SVG ini ikut palet di `globals.css`
 * (warna merek dipanggil lewat `var(--color-*)`), tajam di layar apa pun,
 * beratnya hanya beberapa KB di dalam HTML, dan tidak menambah satu pun
 * permintaan jaringan — penting untuk pembeli yang memakai data seluler.
 *
 * Aturan gaya supaya semuanya terasa satu keluarga:
 *   - bidang datar tanpa gradien, garis tepi cokelat hangat yang sama
 *   - tidak ada `id`/<defs>, jadi aman dirender berkali-kali di satu halaman
 *     (gradien atau pola ber-id bentrok dan rusak di dalam elemen tersembunyi)
 *   - semuanya `aria-hidden`: hiasan, bukan isi. Nama menu tetap ditulis teks.
 *   - tidak ada warna dingin; biru/ungu menurunkan selera makan.
 */

type PropsSvg = SVGProps<SVGSVGElement>;

/** Garis tepi: cokelat kayu hangat, lebih lembut dari hitam pekat. */
const GARIS = "#4A2E1F";

/** Warna bahan makanan. Warna merek diambil dari token agar ikut berubah. */
const W = {
  bata: "var(--color-bata)",
  bataTua: "var(--color-bata-tua)",
  bataLembut: "var(--color-bata-lembut)",
  kunyit: "var(--color-kunyit)",
  kunyitLembut: "var(--color-kunyit-lembut)",
  daun: "var(--color-daun)",
  daunMuda: "#5FA874",
  kremTua: "var(--color-krem-tua)",
  kremGelap: "var(--color-krem-gelap)",
  kertas: "#FFF8EE",
  kardus: "#F3DDB8",
  kardusTua: "#E5C38E",
  nasi: "#FFFFFF",
  butirNasi: "#EADFCF",
  nasiKuning: "#F2C14E",
  nasiKuningGelap: "#E2A631",
  ayam: "#A8461B",
  ayamGelap: "#6E2A0E",
  tulang: "#FFF1DC",
  sambal: "#D2381E",
  sambalTerang: "#F07A5A",
  buncis: "#4E9A55",
  timun: "#D8EDC0",
  timunTepi: "#8DBE6E",
  kuningTelur: "#F5A623",
  kuningTelurTerang: "#FFD68A",
  risoles: "#D99A3A",
  remah: "#B9772A",
  lapis: "#E07B5F",
  bolu: "#EBA084",
  tampah: "#D8AE6E",
  anyaman: "#B98A4A",
  nasiGoreng: "#D78A3B",
  kerupuk: "#F6E2B0",
  lubangKerupuk: "#EBCB86",
  tomat: "#E0533A",
  tempe: "#8A5410",
  perkedel: "#B5702F",
};

type Palet = Record<keyof typeof W, string>;

/**
 * Palet yang sama dengan nilai hex untuk renderer tanpa CSS (gambar Open
 * Graph / ikon via next/og), yang tidak bisa membaca `var(--color-*)`.
 * Nilainya WAJIB sama dengan token @theme di globals.css.
 */
export const PALET_HEX: Palet = {
  ...W,
  bata: "#C2461C",
  bataTua: "#9E3714",
  bataLembut: "#FCEDE5",
  kunyit: "#E39B2E",
  kunyitLembut: "#FDF4DF",
  daun: "#2E7D4F",
  kremTua: "#F7F1E8",
  kremGelap: "#E9DFD1",
};

/** Atribut garis yang dipakai hampir semua bidang. */
const TEPI = {
  stroke: GARIS,
  strokeWidth: 2.5,
  strokeLinejoin: "round" as const,
  strokeLinecap: "round" as const,
};

/**
 * Lingkaran bergerigi (kerupuk, urap). Dihitung sekali saat modul dimuat dan
 * hasilnya deterministik, jadi server dan browser menghasilkan string yang sama.
 */
function lingkaranBergerigi(cx: number, cy: number, r: number, gerigi: number, tinggi: number) {
  const titik: string[] = [];
  const langkah = (Math.PI * 2) / (gerigi * 2);
  for (let i = 0; i < gerigi * 2; i++) {
    const rr = i % 2 === 0 ? r + tinggi : r - tinggi;
    const sudut = i * langkah;
    titik.push(`${(cx + rr * Math.cos(sudut)).toFixed(1)} ${(cy + rr * Math.sin(sudut) * 0.82).toFixed(1)}`);
  }
  return `M${titik.join(" L")} Z`;
}

const JALUR_KERUPUK = lingkaranBergerigi(76, 88, 26, 14, 2.6);

/* ------------------------------------------------------------------ */
/* Isi hidangan — fragmen <g> berkoordinat 240×180 (rasio kartu 4:3).  */
/* Diekspor terpisah supaya bisa disusun ulang menjadi satu adegan.    */
/* ------------------------------------------------------------------ */

function Bayangan({ cx = 120, cy = 152, rx = 82 }: { cx?: number; cy?: number; rx?: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={8} fill={GARIS} opacity={0.09} />;
}

/** Nasi kotak terbuka: nasi putih, ayam bakar, sambal, buncis, timun. */
export function IsiNasiKotak({ w = W }: { w?: Palet } = {}) {
  return (
    <g>
      <Bayangan />
      {/* tutup kotak yang terbuka ke belakang */}
      <path d="M66 70 L60 28 Q60 24 64 24 H176 Q180 24 180 28 L174 70 Z" fill={w.kertas} {...TEPI} />
      {/* stiker merek: mangkuk beruap, sama dengan logo */}
      <rect x="98" y="33" width="44" height="24" rx="12" fill={w.bata} />
      <path d="M109 46 H131 C131 51 127 54 120 54 C113 54 109 51 109 46 Z" fill={w.kertas} />
      <path
        d="M114.5 43 C113.2 41.6 115.8 40.4 114.5 38.6 M120 42.4 C118.7 41 121.3 39.8 120 37.6 M125.5 43 C124.2 41.6 126.8 40.4 125.5 38.6"
        stroke={w.kertas}
        strokeWidth={1.3}
        strokeLinecap="round"
        fill="none"
      />
      {/* ruang dalam */}
      <path d="M54 98 L67 68 H173 L186 98 Z" fill={w.kardusTua} {...TEPI} />
      {/* nasi putih */}
      <path d="M64 99 C62 80 76 70 96 70 C116 70 128 80 126 99 Z" fill={w.nasi} {...TEPI} />
      <g fill={w.butirNasi}>
        <ellipse cx="84" cy="83" rx="3" ry="1.6" transform="rotate(-20 84 83)" />
        <ellipse cx="99" cy="78" rx="3" ry="1.6" transform="rotate(15 99 78)" />
        <ellipse cx="109" cy="88" rx="3" ry="1.6" transform="rotate(-10 109 88)" />
        <ellipse cx="90" cy="92" rx="3" ry="1.6" transform="rotate(25 90 92)" />
        <ellipse cx="116" cy="80" rx="3" ry="1.6" transform="rotate(-30 116 80)" />
      </g>
      {/* buncis */}
      <path d="M72 96 L88 87" stroke={w.buncis} strokeWidth={5} strokeLinecap="round" />
      <path d="M80 98 L95 91" stroke={w.buncis} strokeWidth={5} strokeLinecap="round" />
      {/* ayam bakar: tulang dulu, daging menutupi pangkalnya */}
      <g transform="rotate(-16 152 86)">
        <rect x="164" y="82" width="20" height="8" rx="4" fill={w.tulang} {...TEPI} />
        <circle cx="185" cy="81" r="4.5" fill={w.tulang} {...TEPI} />
        <circle cx="185" cy="91" r="4.5" fill={w.tulang} {...TEPI} />
        <ellipse cx="148" cy="86" rx="25" ry="15" fill={w.ayam} {...TEPI} />
        <path d="M134 81 L144 77 M138 91 L152 85 M150 79 L160 75" stroke={w.ayamGelap} strokeWidth={2.2} strokeLinecap="round" />
        <path d="M134 90 C138 95 148 97 156 94" stroke={w.sambalTerang} strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.7} />
      </g>
      {/* sambal */}
      <ellipse cx="128" cy="93" rx="10" ry="6" fill={w.sambal} {...TEPI} />
      <ellipse cx="125" cy="91" rx="3.2" ry="1.6" fill={w.sambalTerang} />
      {/* timun */}
      <circle cx="171" cy="94" r="7" fill={w.timun} {...TEPI} />
      <circle cx="171" cy="94" r="3" fill="none" stroke={w.timunTepi} strokeWidth={1.5} />
      {/* sisi depan */}
      <path d="M50 98 H190 L183 142 Q182 148 175 148 H65 Q58 148 57 142 Z" fill={w.kertas} {...TEPI} />
      <path d="M62 114 H178" stroke={w.kremGelap} strokeWidth={2} strokeLinecap="round" />
      <rect x="94" y="122" width="52" height="13" rx="6.5" fill={w.bataLembut} />
    </g>
  );
}

/** Snack box kardus: lemper, risoles, kue lapis, bolu kukus, plus air gelas. */
export function IsiSnack({ w = W }: { w?: Palet } = {}) {
  return (
    <g>
      <Bayangan cx={124} rx={88} />
      {/* tutup */}
      <path d="M52 70 L46 30 Q46 26 50 26 H156 Q160 26 160 30 L154 70 Z" fill={w.kardus} {...TEPI} />
      <circle cx="103" cy="47" r="10" fill={w.bata} />
      <path d="M98 47 C100 43 106 51 108 47" stroke={w.kertas} strokeWidth={2.2} fill="none" strokeLinecap="round" />
      {/* ruang dalam */}
      <path d="M40 98 L53 68 H153 L166 98 Z" fill={w.kardusTua} {...TEPI} />
      {/* lemper berbungkus daun */}
      <rect x="50" y="72" width="24" height="28" rx="7" fill={w.daun} {...TEPI} />
      <path d="M55 79 L69 93" stroke={w.daunMuda} strokeWidth={2} strokeLinecap="round" />
      <path d="M62 70 V74" stroke={GARIS} strokeWidth={2} strokeLinecap="round" />
      {/* risoles */}
      <ellipse cx="92" cy="88" rx="14" ry="11" fill={w.risoles} {...TEPI} />
      <g fill={w.remah}>
        <circle cx="86" cy="85" r="1.4" />
        <circle cx="94" cy="82" r="1.4" />
        <circle cx="98" cy="90" r="1.4" />
        <circle cx="89" cy="92" r="1.4" />
      </g>
      {/* kue lapis */}
      <rect x="110" y="78" width="21" height="21" rx="3" fill={w.kertas} />
      <rect x="110" y="83" width="21" height="4" fill={w.lapis} />
      <rect x="110" y="91" width="21" height="4" fill={w.lapis} />
      <rect x="110" y="78" width="21" height="21" rx="3" fill="none" {...TEPI} />
      {/* bolu kukus mekar */}
      <path d="M135 99 L137 88 H155 L157 99 Z" fill={w.nasi} {...TEPI} />
      <path d="M134 89 C134 75 158 75 158 89 Z" fill={w.bolu} {...TEPI} />
      <path d="M146 78 V86 M140 82 L143 87 M152 82 L149 87" stroke={GARIS} strokeWidth={1.6} strokeLinecap="round" opacity={0.6} />
      {/* sisi depan */}
      <path d="M36 98 H170 L164 142 Q163 148 156 148 H50 Q43 148 42 142 Z" fill={w.kardus} {...TEPI} />
      <rect x="80" y="113" width="46" height="20" rx="4" fill={w.kertas} {...TEPI} strokeWidth={2} />
      <path d="M88 120 H118 M88 126 H108" stroke={w.kremGelap} strokeWidth={2} strokeLinecap="round" />
      {/* air mineral gelas */}
      <path d="M181 105 L185 147 Q185 150 188 150 H205 Q208 150 208 147 L212 105 Z" fill={w.nasi} {...TEPI} />
      <rect x="183.5" y="119" width="26" height="12" fill={w.kunyitLembut} />
      <path d="M183.5 119 H209.5 M184.7 131 H208.3" stroke={GARIS} strokeWidth={1.5} opacity={0.35} />
      <ellipse cx="196.5" cy="105" rx="16.5" ry="5" fill={w.kremTua} {...TEPI} />
    </g>
  );
}

/** Tumpeng nasi kuning di atas tampah beralas daun pisang, dengan lauk keliling. */
export function IsiTumpeng({ w = W }: { w?: Palet } = {}) {
  return (
    <g>
      <Bayangan cy={158} rx={98} />
      {/* tampah anyaman bambu */}
      <ellipse cx="120" cy="137" rx="102" ry="26" fill={w.tampah} {...TEPI} />
      <ellipse cx="120" cy="136" rx="90" ry="21" fill="none" stroke={w.anyaman} strokeWidth={1.5} />
      {/* daun pisang */}
      <ellipse cx="120" cy="132" rx="84" ry="18" fill={w.daun} {...TEPI} />
      <path d="M44 132 H196" stroke={w.daunMuda} strokeWidth={2} />
      <path d="M62 124 L72 132 M86 119 L96 132 M150 119 L142 132 M176 124 L166 132" stroke={w.daunMuda} strokeWidth={1.6} strokeLinecap="round" />
      {/* lauk di belakang */}
      <circle cx="66" cy="123" r="9" fill={w.perkedel} {...TEPI} />
      <ellipse cx="172" cy="121" rx="14" ry="9" fill={w.ayam} {...TEPI} />
      <path d="M166 118 L174 115 M168 124 L178 120" stroke={w.ayamGelap} strokeWidth={1.8} strokeLinecap="round" />
      {/* kerucut nasi kuning */}
      <path d="M120 30 C127 44 152 104 160 126 Q120 140 80 126 C88 104 113 44 120 30 Z" fill={w.nasiKuning} {...TEPI} />
      <path d="M121 34 C128 52 150 106 157 125 Q147 130 136 132 C136 100 129 62 121 34 Z" fill={w.nasiKuningGelap} opacity={0.55} />
      <g fill="#F8D77E">
        <ellipse cx="108" cy="92" rx="2.6" ry="1.4" transform="rotate(-20 108 92)" />
        <ellipse cx="118" cy="70" rx="2.6" ry="1.4" transform="rotate(20 118 70)" />
        <ellipse cx="102" cy="112" rx="2.6" ry="1.4" transform="rotate(10 102 112)" />
        <ellipse cx="124" cy="104" rx="2.6" ry="1.4" transform="rotate(-25 124 104)" />
        <ellipse cx="113" cy="120" rx="2.6" ry="1.4" transform="rotate(15 113 120)" />
      </g>
      {/* topi daun & cabai di puncak */}
      <path d="M109 48 L120 24 L131 48 Q120 53 109 48 Z" fill={w.daun} {...TEPI} />
      <path d="M121 23 C117 14 121 7 128 6 C127 11 126 17 124 23 Z" fill={w.sambal} {...TEPI} strokeWidth={2} />
      {/* lauk di depan */}
      <ellipse cx="82" cy="139" rx="13" ry="8.5" fill={w.nasi} {...TEPI} />
      <circle cx="82" cy="139" r="4.6" fill={w.kuningTelur} />
      <path
        d="M98 148 C96 141 104 138 108 141 C111 136 119 138 119 143 C124 142 126 148 121 151 Q109 155 98 148 Z"
        fill="#6FAE5A"
        {...TEPI}
      />
      <path d="M128 147 L140 141 M131 151 L145 146 M137 152 L148 149" stroke={w.tempe} strokeWidth={3} strokeLinecap="round" />
      <circle cx="160" cy="141" r="7" fill={w.timun} {...TEPI} />
      <circle cx="160" cy="141" r="3" fill="none" stroke={w.timunTepi} strokeWidth={1.5} />
      <path d="M174 135 C182 133 188 138 186 145 C183 141 178 139 174 139 Z" fill={w.sambal} {...TEPI} strokeWidth={2} />
    </g>
  );
}

/** Nasi goreng di piring dengan telur ceplok, kerupuk, timun, dan tomat. */
export function IsiNasiGoreng({ w = W }: { w?: Palet } = {}) {
  return (
    <g>
      <Bayangan cy={154} rx={94} />
      {/* piring */}
      <ellipse cx="120" cy="127" rx="98" ry="30" fill={w.nasi} {...TEPI} />
      <ellipse cx="120" cy="125" rx="78" ry="22" fill={w.kremTua} stroke={w.kremGelap} strokeWidth={1.5} />
      {/* kerupuk bersandar di belakang */}
      <path d={JALUR_KERUPUK} fill={w.kerupuk} {...TEPI} />
      <g fill={w.lubangKerupuk}>
        <circle cx="66" cy="82" r="2.4" />
        <circle cx="80" cy="76" r="2" />
        <circle cx="86" cy="92" r="2.4" />
        <circle cx="70" cy="96" r="1.8" />
      </g>
      {/* gunungan nasi goreng */}
      <path d="M56 124 C54 98 84 80 120 80 C156 80 186 98 184 124 Q120 137 56 124 Z" fill={w.nasiGoreng} {...TEPI} />
      <g>
        <circle cx="78" cy="112" r="2.4" fill={w.buncis} />
        <circle cx="96" cy="100" r="2" fill={w.buncis} />
        <circle cx="150" cy="104" r="2.4" fill={w.buncis} />
        <circle cx="166" cy="116" r="2" fill={w.buncis} />
        <circle cx="88" cy="120" r="2" fill={w.bata} />
        <circle cx="140" cy="118" r="2.2" fill={w.bata} />
        <circle cx="160" cy="98" r="1.8" fill={w.bata} />
        <circle cx="108" cy="116" r="2.6" fill="#F6C453" />
        <circle cx="130" cy="122" r="2.2" fill="#F6C453" />
        <circle cx="72" cy="104" r="1.8" fill="#F6C453" />
        <circle cx="176" cy="110" r="2" fill="#F6C453" />
      </g>
      {/* telur ceplok */}
      <path
        d="M98 86 C95 74 110 69 118 72 C127 65 143 70 145 80 C151 86 145 95 134 94 C124 99 104 97 98 86 Z"
        fill="#FFFDF8"
        {...TEPI}
      />
      <circle cx="121" cy="82" r="8.5" fill={w.kuningTelur} {...TEPI} strokeWidth={2} />
      <ellipse cx="118" cy="79" rx="2.6" ry="1.6" fill={w.kuningTelurTerang} />
      {/* timun & tomat */}
      <circle cx="170" cy="130" r="7" fill={w.timun} {...TEPI} />
      <circle cx="170" cy="130" r="3" fill="none" stroke={w.timunTepi} strokeWidth={1.5} />
      <circle cx="183" cy="122" r="6" fill={w.timun} {...TEPI} />
      <path d="M146 136 A9 9 0 0 1 164 136 Z" fill={w.tomat} {...TEPI} />
      {/* uap panas */}
      <g stroke={GARIS} strokeWidth={2.4} strokeLinecap="round" fill="none" opacity={0.28}>
        <path d="M104 62 C98 55 110 50 104 42" />
        <path d="M124 58 C118 50 130 45 124 36" />
        <path d="M144 62 C138 55 150 50 144 42" />
      </g>
    </g>
  );
}

const ISI_KATEGORI: Record<KategoriMenu, (p: { w?: Palet }) => React.JSX.Element> = {
  NASI_KOTAK: IsiNasiKotak,
  SNACK: IsiSnack,
  TUMPENG: IsiTumpeng,
  NASI_GORENG: IsiNasiGoreng,
};

/** Latar lembut per kategori — satu keluarga hangat, beda nada tipis. */
export const LATAR_KATEGORI: Record<KategoriMenu, string> = {
  NASI_KOTAK: "bg-[#F8E9DE]",
  SNACK: "bg-[#FAF0DC]",
  TUMPENG: "bg-[#F1EEDB]",
  NASI_GORENG: "bg-[#F7E6DA]",
};

/**
 * Ilustrasi hidangan untuk satu kategori. Dipakai sebagai pengganti foto
 * selama pemilik belum mengunggah foto asli, supaya katalog tetap menggugah
 * selera dan tidak terlihat seperti kotak kosong yang belum selesai.
 */
export function IlustrasiKategori({ kategori, ...props }: PropsSvg & { kategori: KategoriMenu }) {
  const Isi = ISI_KATEGORI[kategori];
  return (
    <svg viewBox="0 0 240 180" fill="none" aria-hidden="true" focusable="false" {...props}>
      <Isi />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Adegan & keadaan kosong                                             */
/* ------------------------------------------------------------------ */

/** Bintang kilau empat sudut. */
function Kilau({ x, y, s = 1, warna }: { x: number; y: number; s?: number; warna: string }) {
  return (
    <path
      d="M0 -10 C1.5 -3 3 -1.5 10 0 C3 1.5 1.5 3 0 10 C-1.5 3 -3 1.5 -10 0 C-3 -1.5 -1.5 -3 0 -10 Z"
      transform={`translate(${x} ${y}) scale(${s})`}
      fill={warna}
    />
  );
}

/**
 * Adegan pembuka beranda: tumpeng, nasi kotak, dan snack box di atas daun
 * pisang. Menjawab "jual apa?" dalam sekali lihat, sebelum pembeli membaca.
 */
export function IlustrasiHero({ palet = "css", ...props }: PropsSvg & { palet?: "css" | "hex" }) {
  const w = palet === "hex" ? PALET_HEX : W;
  return (
    <svg viewBox="0 0 560 460" fill="none" aria-hidden="true" focusable="false" {...props}>
      {/* bidang latar organik */}
      <path
        d="M286 40 C392 34 500 96 520 206 C540 316 470 414 350 430 C230 446 96 418 52 318 C8 218 60 122 140 76 C186 50 236 42 286 40 Z"
        fill={w.bataLembut}
      />
      {/* daun pisang besar menyilang */}
      <path d="M58 392 C150 256 330 128 528 118 C430 226 262 364 58 392 Z" fill={w.daun} {...TEPI} />
      <path d="M58 392 C204 292 364 176 528 118" stroke={w.daunMuda} strokeWidth={3} strokeLinecap="round" />
      <g stroke={w.daunMuda} strokeWidth={2} strokeLinecap="round">
        <path d="M170 312 L196 340" />
        <path d="M232 268 L262 298" />
        <path d="M296 226 L330 254" />
        <path d="M362 186 L398 210" />
        <path d="M188 300 L170 272" />
        <path d="M252 254 L238 222" />
        <path d="M318 212 L308 182" />
      </g>
      <svg x="136" y="4" width="330" height="248" viewBox="0 0 240 180">
        <IsiTumpeng w={w} />
      </svg>
      <svg x="6" y="200" width="304" height="228" viewBox="0 0 240 180">
        <IsiNasiKotak w={w} />
      </svg>
      <svg x="270" y="222" width="290" height="218" viewBox="0 0 240 180">
        <IsiSnack w={w} />
      </svg>
      <Kilau x={490} y={78} s={1.5} warna={w.kunyit} />
      <Kilau x={96} y={136} s={1.1} warna={w.kunyit} />
      <Kilau x={452} y={34} s={0.8} warna={w.bata} />
      <Kilau x={540} y={300} s={0.8} warna={w.bata} />
      {/* cabai tergeletak */}
      <path d="M232 434 C254 426 280 430 292 442 C276 444 252 444 232 434 Z" fill={w.sambal} {...TEPI} strokeWidth={2} />
      <path d="M232 434 C226 430 222 432 220 428" stroke={w.daun} strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

/** Piring kosong dengan sendok-garpu: menu tidak ditemukan, riwayat kosong, 404. */
export function IlustrasiPiringKosong(props: PropsSvg) {
  return (
    <svg viewBox="0 0 220 160" fill="none" aria-hidden="true" focusable="false" {...props}>
      <ellipse cx="110" cy="140" rx="84" ry="7" fill={GARIS} opacity={0.08} />
      {/* garpu */}
      <path d="M28 30 V58 M35 30 V58 M42 30 V58" stroke={GARIS} strokeWidth={2.5} strokeLinecap="round" />
      <path d="M26 56 Q35 72 44 56" fill={W.kremGelap} {...TEPI} />
      <rect x="32" y="66" width="6" height="66" rx="3" fill={W.kremGelap} {...TEPI} />
      {/* sendok */}
      <ellipse cx="188" cy="46" rx="11" ry="17" fill={W.kremGelap} {...TEPI} />
      <rect x="185" y="62" width="6" height="70" rx="3" fill={W.kremGelap} {...TEPI} />
      {/* piring */}
      <ellipse cx="110" cy="102" rx="66" ry="27" fill={W.nasi} {...TEPI} />
      <ellipse cx="110" cy="99" rx="48" ry="17" fill={W.kremTua} stroke={W.kremGelap} strokeWidth={1.5} />
      {/* daun hiasan di tepi piring */}
      <path d="M150 90 C158 78 172 78 176 82 C170 92 160 94 150 90 Z" fill={W.daun} {...TEPI} strokeWidth={2} />
      <path d="M152 89 L170 82" stroke={W.daunMuda} strokeWidth={1.5} strokeLinecap="round" />
      <circle cx="92" cy="96" r="2" fill={W.kunyit} opacity={0.7} />
      <circle cx="104" cy="104" r="1.6" fill={W.kunyit} opacity={0.7} />
      <circle cx="122" cy="94" r="1.8" fill={W.kunyit} opacity={0.7} />
    </svg>
  );
}

/**
 * Rantang susun tiga — wadah antar makanan khas rumah Indonesia. Dipakai di
 * halaman lacak, masuk/daftar, dan konfirmasi pesanan.
 */
export function IlustrasiRantang(props: PropsSvg) {
  const bunga = (cy: number) => (
    <g transform={`translate(100 ${cy})`} fill={W.kertas} opacity={0.92}>
      <ellipse cx="-5" cy="-5" rx="3.2" ry="5.5" transform="rotate(-45 -5 -5)" />
      <ellipse cx="5" cy="-5" rx="3.2" ry="5.5" transform="rotate(45 5 -5)" />
      <ellipse cx="-5" cy="5" rx="3.2" ry="5.5" transform="rotate(45 -5 5)" />
      <ellipse cx="5" cy="5" rx="3.2" ry="5.5" transform="rotate(-45 5 5)" />
    </g>
  );
  return (
    <svg viewBox="0 0 200 200" fill="none" aria-hidden="true" focusable="false" {...props}>
      <ellipse cx="100" cy="186" rx="62" ry="7" fill={GARIS} opacity={0.09} />
      {/* gagang */}
      <path d="M58 64 C58 22 142 22 142 64" stroke={GARIS} strokeWidth={9} strokeLinecap="round" />
      <path d="M58 64 C58 22 142 22 142 64" stroke={W.kunyit} strokeWidth={4.5} strokeLinecap="round" />
      {/* tiang penjepit */}
      <rect x="40" y="60" width="9" height="116" rx="4" fill={W.kremGelap} {...TEPI} />
      <rect x="151" y="60" width="9" height="116" rx="4" fill={W.kremGelap} {...TEPI} />
      {/* tutup */}
      <path d="M48 70 Q100 50 152 70 V76 H48 Z" fill={W.bataTua} {...TEPI} />
      <circle cx="100" cy="58" r="6" fill={W.bataTua} {...TEPI} />
      {/* susun */}
      <rect x="48" y="76" width="104" height="32" rx="6" fill={W.bata} {...TEPI} />
      <rect x="48" y="110" width="104" height="32" rx="6" fill={W.kunyit} {...TEPI} />
      <rect x="48" y="144" width="104" height="32" rx="6" fill={W.daun} {...TEPI} />
      {bunga(92)}
      {bunga(126)}
      {bunga(160)}
      {/* pengait */}
      <rect x="38" y="86" width="13" height="7" rx="3" fill={W.kunyit} {...TEPI} strokeWidth={2} />
      <rect x="149" y="86" width="13" height="7" rx="3" fill={W.kunyit} {...TEPI} strokeWidth={2} />
      {/* uap hangat */}
      <g stroke={GARIS} strokeWidth={2.4} strokeLinecap="round" opacity={0.25}>
        <path d="M84 16 C79 10 89 6 84 0" />
        <path d="M116 16 C111 10 121 6 116 0" />
      </g>
    </svg>
  );
}

/** Kompor & wajan — dipakai di halaman galat "dapur sedang ada gangguan". */
export function IlustrasiWajan(props: PropsSvg) {
  return (
    <svg viewBox="0 0 220 160" fill="none" aria-hidden="true" focusable="false" {...props}>
      <ellipse cx="110" cy="146" rx="80" ry="7" fill={GARIS} opacity={0.08} />
      {/* kompor */}
      <rect x="40" y="112" width="140" height="30" rx="8" fill={W.kremGelap} {...TEPI} />
      <circle cx="66" cy="127" r="5" fill={W.kertas} {...TEPI} strokeWidth={2} />
      <circle cx="154" cy="127" r="5" fill={W.kertas} {...TEPI} strokeWidth={2} />
      {/* api kecil yang padam */}
      <path d="M100 112 C100 104 106 102 106 96 C112 102 114 106 112 112 Z" fill={W.kunyit} {...TEPI} strokeWidth={2} opacity={0.55} />
      {/* wajan */}
      <path d="M44 74 H176 C176 96 148 108 110 108 C72 108 44 96 44 74 Z" fill={GARIS} opacity={0.9} />
      <path d="M44 74 H176 C176 96 148 108 110 108 C72 108 44 96 44 74 Z" stroke={GARIS} strokeWidth={2.5} strokeLinejoin="round" />
      <ellipse cx="110" cy="74" rx="66" ry="12" fill="#5A3B2A" {...TEPI} />
      <path d="M176 76 L206 66" stroke={GARIS} strokeWidth={7} strokeLinecap="round" />
      <path d="M176 76 L206 66" stroke={W.tempe} strokeWidth={3} strokeLinecap="round" />
      {/* asap tanda tanya */}
      <path
        d="M98 50 C96 38 106 30 116 32 C126 34 128 46 120 50 C114 53 112 56 112 60"
        stroke={GARIS}
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.35}
      />
      <circle cx="112" cy="68" r="2" fill={GARIS} opacity={0.35} />
    </svg>
  );
}
