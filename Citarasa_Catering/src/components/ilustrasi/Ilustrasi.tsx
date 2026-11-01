import type { SVGProps } from "react";
import type { StatusPesanan } from "@/generated/prisma/client";

/**
 * Ilustrasi Citarasa — digambar sebagai SVG inline, bukan PNG.
 *
 * Alasannya praktis: (1) tetap tajam di layar ponsel ber-DPI tinggi, (2) ukuran
 * berkasnya hitungan kilobyte dan ikut terkompresi bersama HTML, tanpa satu
 * pun permintaan jaringan tambahan, (3) warnanya memakai palet yang sama
 * dengan antarmuka, dan (4) bagiannya bisa digerakkan dengan CSS — uap yang
 * mengepul, kotak yang mengambang — tanpa pustaka animasi.
 *
 * Semua ilustrasi bersifat dekoratif (aria-hidden); maknanya selalu sudah
 * tertulis di teks di sebelahnya. Gerakannya otomatis berhenti bila pengguna
 * memilih "kurangi gerakan" di sistem operasinya (lihat globals.css).
 */

type Props = SVGProps<SVGSVGElement>;

const W = {
  bata: "#C2461C",
  bataTerang: "#E8673A",
  bataLembut: "#FCEDE5",
  kunyit: "#E39B2E",
  kunyitTerang: "#F6C453",
  kunyitLembut: "#FDF4DF",
  daun: "#2E7D4F",
  daunTerang: "#5DAA6E",
  daunLembut: "#E6F4EB",
  krem: "#FFFCF7",
  kremTua: "#F7F1E8",
  kremGelap: "#E9DFD1",
  kayu: "#2B211B",
  kayuSedang: "#6B5C52",
  rotan: "#B9773A",
  rotanMuda: "#D69A55",
  ayam: "#B5541F",
  ayamTerang: "#D7783A",
  uap: "#D9C9B6",
  bahaya: "#B42318",
};

function Svg({ children, viewBox, ...props }: Props & { viewBox: string }) {
  return (
    <svg viewBox={viewBox} fill="none" aria-hidden="true" focusable="false" {...props}>
      {children}
    </svg>
  );
}

/** Tiga garis uap yang mengepul bergantian. */
function Uap({ x, y, skala = 1, warna = W.uap }: { x: number; y: number; skala?: number; warna?: string }) {
  const garis = [-14, 0, 14];
  return (
    <g transform={`translate(${x} ${y}) scale(${skala})`} stroke={warna} strokeWidth={4} strokeLinecap="round">
      {garis.map((dx, i) => (
        <path
          key={dx}
          className="uap"
          style={{ ["--tunda" as string]: `${i * 0.7}s` }}
          d={`M${dx} 0 q-7 -10 0 -20 q7 -10 0 -20`}
        />
      ))}
    </g>
  );
}

/** Kilau bintang empat sudut. */
function Kilau({ x, y, r = 8, warna = W.kunyit, className }: { x: number; y: number; r?: number; warna?: string; className?: string }) {
  return (
    <path
      className={className}
      fill={warna}
      d={`M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}Z`}
    />
  );
}

function Daun({ x, y, rot = 0, skala = 1, warna = W.daunTerang }: { x: number; y: number; rot?: number; skala?: number; warna?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${skala})`}>
      <path d="M0 0 C 10 -14, 30 -14, 40 0 C 30 14, 10 14, 0 0 Z" fill={warna} />
      <path d="M3 0 H36" stroke={W.daun} strokeWidth={1.6} strokeLinecap="round" opacity={0.6} />
    </g>
  );
}

function Cabai({ x, y, rot = 0, skala = 1 }: { x: number; y: number; rot?: number; skala?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${skala})`}>
      <path d="M0 0 C 6 18, 26 30, 46 26 C 30 22, 16 12, 10 -4 Z" fill={W.bata} />
      <path d="M6 2 C 10 12, 18 18, 28 21" stroke={W.bataTerang} strokeWidth={3} strokeLinecap="round" opacity={0.7} />
      <path d="M2 -2 C -2 -8, 4 -14, 12 -12 C 10 -8, 8 -4, 8 0 Z" fill={W.daun} />
    </g>
  );
}

/** Kotak nasi terbuka, isinya mengintip. */
function KotakNasi({ x, y, skala = 1 }: { x: number; y: number; skala?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${skala})`}>
      {/* tutup terbuka di belakang */}
      <path d="M6 -6 L94 -6 L104 -38 L-4 -38 Z" fill={W.kremTua} />
      <path d="M-4 -38 L104 -38 L101 -30 L-1 -30 Z" fill={W.kremGelap} />
      {/* isi */}
      <path d="M14 4 C 16 -22, 52 -24, 56 4 Z" fill="#FFFFFF" />
      <path d="M20 -6 q4 -3 8 0 M34 -12 q4 -3 8 0 M30 -2 q4 -3 8 0" stroke={W.kremGelap} strokeWidth={2} strokeLinecap="round" />
      <ellipse cx={74} cy={-2} rx={17} ry={11} fill={W.ayam} transform="rotate(-12 74 -2)" />
      <ellipse cx={70} cy={-5} rx={8} ry={4} fill={W.ayamTerang} transform="rotate(-12 70 -5)" />
      <path d="M50 2 C 54 -12, 66 -14, 64 2 Z" fill={W.daunTerang} />
      <circle cx={88} cy={2} r={6} fill={W.bata} />
      {/* badan kotak */}
      <rect x={0} y={0} width={100} height={60} rx={10} fill="#FFFFFF" />
      <rect x={0} y={0} width={100} height={10} rx={5} fill={W.kremTua} />
      <rect x={0} y={22} width={100} height={16} fill={W.bata} />
      <circle cx={50} cy={30} r={11} fill={W.krem} />
      <path d="M45 30 q5 -8 10 0" stroke={W.bata} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M44 33 h12" stroke={W.bata} strokeWidth={2.4} strokeLinecap="round" />
      <rect x={0} y={0} width={100} height={60} rx={10} stroke={W.kremGelap} strokeWidth={2} />
    </g>
  );
}

/** Kotak snack berisi klepon & kue. */
function KotakSnack({ x, y, skala = 1 }: { x: number; y: number; skala?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${skala})`}>
      <circle cx={18} cy={-4} r={14} fill={W.daunTerang} />
      {[[-4, -8], [2, -14], [8, -6], [-2, 0]].map(([dx, dy], i) => (
        <circle key={i} cx={18 + dx} cy={-4 + dy} r={1.8} fill="#FFFFFF" />
      ))}
      <circle cx={46} cy={-8} r={15} fill={W.kunyit} />
      <path d="M36 -10 q10 -10 20 0" stroke={W.kunyitTerang} strokeWidth={4} strokeLinecap="round" />
      <circle cx={74} cy={-4} r={14} fill="#7A3E22" />
      <path d="M66 -8 q8 -7 16 0" stroke="#A35A33" strokeWidth={3} strokeLinecap="round" />
      <rect x={0} y={0} width={92} height={46} rx={10} fill={W.bataLembut} />
      <rect x={0} y={0} width={92} height={46} rx={10} stroke={W.bata} strokeOpacity={0.25} strokeWidth={2} />
      <path d="M0 16 H92" stroke={W.bata} strokeOpacity={0.25} strokeWidth={2} />
      <rect x={30} y={22} width={32} height={14} rx={7} fill={W.daun} />
    </g>
  );
}

/** Pemandangan utama beranda: tumpeng di atas tampah, kotak nasi & kotak snack mengambang. */
export function IlustrasiHero(props: Props) {
  return (
    <Svg viewBox="0 0 520 440" {...props}>
      {/* latar */}
      <path
        d="M78 120 C 110 40, 250 10, 350 40 C 450 70, 500 150, 488 250 C 476 350, 380 420, 250 414 C 120 408, 30 340, 28 250 C 26 190, 52 160, 78 120 Z"
        fill={W.kunyitLembut}
      />
      <circle cx={400} cy={110} r={70} fill={W.bataLembut} />
      <g className="anim-putar-pelan" style={{ transformOrigin: "400px 110px" }}>
        <circle cx={400} cy={110} r={88} stroke={W.kunyit} strokeOpacity={0.35} strokeWidth={2} strokeDasharray="4 10" />
      </g>

      {/* bayangan tampah */}
      <ellipse cx={262} cy={402} rx={190} ry={14} fill={W.kayu} opacity={0.08} />

      {/* tampah anyaman */}
      <ellipse cx={262} cy={352} rx={204} ry={50} fill={W.rotan} />
      <ellipse cx={262} cy={346} rx={190} ry={42} fill={W.rotanMuda} />
      {[0.86, 0.7, 0.54].map((k) => (
        <ellipse key={k} cx={262} cy={346} rx={190 * k} ry={42 * k} stroke={W.rotan} strokeWidth={2} strokeDasharray="10 6" opacity={0.6} />
      ))}

      {/* daun pisang */}
      <path d="M96 342 C 140 300, 384 300, 428 342 C 384 372, 140 372, 96 342 Z" fill={W.daun} />
      <path d="M112 342 C 150 312, 374 312, 412 342 C 374 362, 150 362, 112 342 Z" fill={W.daunTerang} />
      {[-120, -80, -40, 0, 40, 80, 120].map((dx) => (
        <path key={dx} d={`M262 342 L${262 + dx * 1.2} ${dx === 0 ? 318 : 322 + Math.abs(dx) * 0.05}`} stroke={W.daun} strokeWidth={1.6} opacity={0.5} />
      ))}

      {/* uap tumpeng */}
      <Uap x={262} y={86} skala={1.1} />

      {/* tumpeng */}
      <path
        d="M262 98 C 270 98 274 106 278 116 L 346 326 Q 349 336 338 336 L 186 336 Q 175 336 178 326 L 246 116 C 250 106 254 98 262 98 Z"
        fill={W.kunyitTerang}
      />
      <path d="M262 98 C 270 98 274 106 278 116 L 346 326 Q 349 336 338 336 L 292 336 L 268 104 Z" fill={W.kunyit} opacity={0.55} />
      {[
        [238, 200], [270, 170], [254, 250], [292, 240], [226, 290], [270, 300], [310, 300], [250, 140], [284, 210],
      ].map(([cx, cy], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={3.4} ry={2} fill="#FFFFFF" opacity={0.55} transform={`rotate(${i * 25} ${cx} ${cy})`} />
      ))}
      {/* hiasan puncak: daun pisang kerucut & cabai merah, seperti tumpeng sungguhan */}
      <path d="M250 112 L262 70 L274 112 Z" fill={W.daun} />
      <path d="M262 74 V110" stroke={W.daunTerang} strokeWidth={2} />
      <Cabai x={266} y={84} rot={20} skala={0.5} />

      {/* lauk mengelilingi tumpeng */}
      <g>
        {/* telur */}
        <ellipse cx={160} cy={340} rx={22} ry={14} fill="#FFFFFF" />
        <circle cx={164} cy={338} r={8} fill={W.kunyitTerang} />
        <ellipse cx={366} cy={338} rx={22} ry={14} fill="#FFFFFF" />
        <circle cx={362} cy={336} r={8} fill={W.kunyitTerang} />
        {/* ayam goreng */}
        <path d="M196 352 C 186 336, 206 322, 226 330 C 242 336, 244 352, 230 360 C 220 366, 204 364, 196 352 Z" fill={W.ayam} />
        <path d="M204 344 C 208 336, 220 334, 228 340" stroke={W.ayamTerang} strokeWidth={4} strokeLinecap="round" />
        <rect x={228} y={352} width={20} height={7} rx={3.5} fill="#FFFFFF" transform="rotate(20 228 352)" />
        {/* tempe orek */}
        <rect x={300} y={344} width={34} height={18} rx={5} fill="#D9A35B" transform="rotate(-10 300 344)" />
        <path d="M306 350 l4 2 M316 348 l4 2 M314 356 l4 2" stroke="#B9773A" strokeWidth={2} strokeLinecap="round" />
        {/* sambal */}
        <path d="M262 360 C 248 360, 246 346, 262 344 C 278 346, 276 360, 262 360 Z" fill={W.bata} />
        {/* timun */}
        <circle cx={128} cy={354} r={10} fill={W.daunTerang} />
        <circle cx={128} cy={354} r={6.5} fill="#EAF6E2" />
        <circle cx={396} cy={354} r={10} fill={W.daunTerang} />
        <circle cx={396} cy={354} r={6.5} fill="#EAF6E2" />
      </g>

      {/* kotak nasi mengambang */}
      <ellipse cx={104} cy={262} rx={44} ry={6} fill={W.kayu} opacity={0.07} />
      <g className="anim-ayun">
        <KotakNasi x={50} y={170} skala={1.08} />
        <Uap x={88} y={118} skala={0.7} />
      </g>

      {/* kotak snack mengambang */}
      <ellipse cx={432} cy={252} rx={40} ry={5} fill={W.kayu} opacity={0.07} />
      <g className="anim-ayun-lambat">
        <KotakSnack x={384} y={176} skala={1.05} />
      </g>

      {/* hiasan */}
      <g className="anim-ayun-lambat">
        <Cabai x={60} y={74} rot={-20} skala={0.9} />
      </g>
      <g className="anim-ayun">
        <Daun x={448} y={300} rot={-30} />
      </g>
      <Daun x={30} y={300} rot={210} skala={0.8} />
      <Kilau x={170} y={70} r={10} className="anim-kedip" />
      <Kilau x={350} y={190} r={7} warna={W.bataTerang} />
      <Kilau x={480} y={40} r={9} className="anim-kedip" />
    </Svg>
  );
}

/** Bakul anyaman yang masih kosong. */
export function IlustrasiKeranjangKosong(props: Props) {
  return (
    <Svg viewBox="0 0 240 200" {...props}>
      <circle cx={120} cy={104} r={86} fill={W.kunyitLembut} />
      <ellipse cx={120} cy={184} rx={70} ry={7} fill={W.kayu} opacity={0.08} />
      <path d="M72 98 C 72 30, 168 30, 168 98" stroke={W.rotan} strokeWidth={9} strokeLinecap="round" />
      <path d="M52 102 L188 102 L170 170 Q168 178 160 178 L80 178 Q72 178 70 170 Z" fill={W.rotanMuda} />
      {[120, 138, 156].map((y) => (
        <path key={y} d={`M${57 + (y - 102) * 0.26} ${y} H${183 - (y - 102) * 0.26}`} stroke={W.rotan} strokeWidth={3} strokeDasharray="12 6" />
      ))}
      <rect x={44} y={92} width={152} height={16} rx={8} fill={W.rotan} />
      <g className="anim-ayun">
        <Daun x={140} y={58} rot={-35} skala={0.9} />
      </g>
      <Kilau x={52} y={56} r={8} className="anim-kedip" />
      <Kilau x={196} y={70} r={6} warna={W.bataTerang} />
    </Svg>
  );
}

/** Nota kosong — belum ada pesanan. */
export function IlustrasiPesananKosong(props: Props) {
  return (
    <Svg viewBox="0 0 240 200" {...props}>
      <circle cx={120} cy={100} r={86} fill={W.bataLembut} />
      <ellipse cx={120} cy={186} rx={60} ry={6} fill={W.kayu} opacity={0.08} />
      <g className="anim-ayun">
        <path
          d="M74 30 H166 V166 l-11.5 -8 l-11.5 8 l-11.5 -8 l-11.5 8 l-11.5 -8 l-11.5 8 l-11.5 -8 l-11.5 8 Z"
          fill="#FFFFFF"
          stroke={W.kremGelap}
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        <rect x={90} y={50} width={60} height={10} rx={5} fill={W.bata} opacity={0.85} />
        {[76, 94, 112].map((y) => (
          <g key={y}>
            <rect x={90} y={y} width={38} height={7} rx={3.5} fill={W.kremGelap} />
            <rect x={136} y={y} width={14} height={7} rx={3.5} fill={W.kremGelap} />
          </g>
        ))}
        <path d="M90 134 H150" stroke={W.kremGelap} strokeWidth={2.5} strokeDasharray="4 5" strokeLinecap="round" />
      </g>
      <g transform="translate(176 116) rotate(18)">
        <rect x={-4} y={0} width={8} height={56} rx={4} fill={W.kayuSedang} />
        <ellipse cx={0} cy={-6} rx={11} ry={15} fill={W.kayuSedang} />
      </g>
      <Kilau x={50} y={60} r={8} className="anim-kedip" />
    </Svg>
  );
}

/** Ponsel berisi kotak nasi — halaman masuk & daftar. */
export function IlustrasiMasuk(props: Props) {
  return (
    <Svg viewBox="0 0 340 300" {...props}>
      <path d="M50 120 C 60 50, 180 20, 260 50 C 330 76, 330 180, 290 230 C 240 290, 110 290, 70 240 C 40 200, 44 160, 50 120 Z" fill={W.kunyitLembut} />
      <ellipse cx={170} cy={284} rx={80} ry={8} fill={W.kayu} opacity={0.08} />
      <g className="anim-ayun-lambat">
        <rect x={110} y={40} width={120} height={232} rx={22} fill={W.kayu} />
        <rect x={118} y={48} width={104} height={216} rx={16} fill={W.krem} />
        <rect x={150} y={56} width={40} height={6} rx={3} fill={W.kayu} />
        <rect x={130} y={74} width={80} height={10} rx={5} fill={W.kremGelap} />
        <KotakNasi x={130} y={136} skala={0.8} />
        <Uap x={170} y={104} skala={0.5} />
        <rect x={130} y={196} width={80} height={10} rx={5} fill={W.kremGelap} />
        <rect x={130} y={214} width={50} height={10} rx={5} fill={W.kremGelap} />
        <rect x={130} y={236} width={80} height={18} rx={9} fill={W.bata} />
      </g>
      <g className="anim-ayun">
        <circle cx={238} cy={74} r={22} fill={W.daun} />
        <path d="M228 74 l7 7 l13 -14" stroke="#FFFFFF" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <Cabai x={52} y={196} rot={-30} skala={0.8} />
      <Daun x={264} y={196} rot={-20} />
      <Kilau x={84} y={84} r={10} className="anim-kedip" />
      <Kilau x={290} y={130} r={7} warna={W.bataTerang} />
    </Svg>
  );
}

/** Kotak berpita dengan tanda centang — pesanan berhasil. */
export function IlustrasiSukses(props: Props) {
  return (
    <Svg viewBox="0 0 260 220" {...props}>
      <circle cx={130} cy={112} r={92} fill={W.daunLembut} />
      <ellipse cx={130} cy={204} rx={70} ry={7} fill={W.kayu} opacity={0.08} />
      <g className="anim-ayun">
        <rect x={72} y={98} width={116} height={84} rx={12} fill="#FFFFFF" />
        <rect x={64} y={80} width={132} height={28} rx={10} fill={W.kremTua} />
        <rect x={122} y={80} width={16} height={102} fill={W.bata} />
        <path d="M130 80 C 112 56, 92 66, 106 80 Z M130 80 C 148 56, 168 66, 154 80 Z" fill={W.bata} />
        <rect x={72} y={98} width={116} height={84} rx={12} stroke={W.kremGelap} strokeWidth={2} />
      </g>
      <g className="anim-masuk-skala" style={{ ["--tunda" as string]: "250ms" }}>
        <circle cx={186} cy={74} r={28} fill={W.daun} />
        <path d="M173 74 l9 9 l17 -18" stroke="#FFFFFF" strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <Kilau x={50} y={64} r={10} className="anim-kedip" />
      <Kilau x={226} y={140} r={8} warna={W.bataTerang} className="anim-kedip" />
      <Kilau x={70} y={170} r={6} />
    </Svg>
  );
}

/** Peta kecil dengan rute putus-putus & penanda — halaman lacak. */
export function IlustrasiLacak(props: Props) {
  return (
    <Svg viewBox="0 0 280 220" {...props}>
      <circle cx={140} cy={110} r={96} fill={W.kunyitLembut} />
      <ellipse cx={140} cy={206} rx={86} ry={7} fill={W.kayu} opacity={0.08} />
      <g transform="rotate(-6 140 120)">
        <rect x={50} y={52} width={180} height={136} rx={16} fill="#FFFFFF" stroke={W.kremGelap} strokeWidth={2.5} />
        <path d="M50 110 H230 M120 52 V188" stroke={W.kremTua} strokeWidth={14} />
        <path d="M80 160 C 100 120, 150 150, 170 110 S 196 80, 200 78" stroke={W.bata} strokeWidth={4} strokeDasharray="2 9" strokeLinecap="round" />
        <g transform="translate(64 146)">
          <rect x={0} y={0} width={32} height={22} rx={5} fill={W.bataLembut} stroke={W.bata} strokeWidth={2} />
          <path d="M0 8 H32" stroke={W.bata} strokeWidth={2} />
        </g>
      </g>
      <g className="anim-ayun">
        <path d="M204 34 C 186 34, 176 48, 176 60 C 176 80, 204 100, 204 100 C 204 100, 232 80, 232 60 C 232 48, 222 34, 204 34 Z" fill={W.bata} />
        <circle cx={204} cy={60} r={10} fill="#FFFFFF" />
      </g>
      <ellipse cx={204} cy={104} rx={12} ry={3} fill={W.kayu} opacity={0.12} />
      <Kilau x={40} y={50} r={9} className="anim-kedip" />
    </Svg>
  );
}

/** Mangkuk terbalik dengan nasi tumpah — halaman tidak ditemukan. */
export function Ilustrasi404(props: Props) {
  return (
    <Svg viewBox="0 0 280 220" {...props}>
      <circle cx={140} cy={112} r={96} fill={W.kremTua} />
      <ellipse cx={140} cy={192} rx={100} ry={10} fill={W.kayu} opacity={0.07} />
      {[[70, 178], [92, 186], [196, 182], [214, 188], [120, 190], [178, 190], [60, 188]].map(([cx, cy], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={5} ry={3} fill="#FFFFFF" stroke={W.kremGelap} strokeWidth={1.5} transform={`rotate(${i * 30} ${cx} ${cy})`} />
      ))}
      <path d="M80 182 C 80 120, 200 120, 200 182 Z" fill={W.bata} />
      <path d="M92 174 C 96 136, 184 136, 188 174" stroke={W.bataTerang} strokeWidth={5} strokeLinecap="round" opacity={0.6} />
      <rect x={124} y={112} width={32} height={12} rx={6} fill={W.bataTerang} />
      <g className="anim-ayun">
        <circle cx={206} cy={70} r={30} fill="#FFFFFF" stroke={W.kremGelap} strokeWidth={2.5} />
        <path d="M196 62 C 196 50, 216 50, 216 62 C 216 72, 206 70, 206 80" stroke={W.kayu} strokeWidth={5} strokeLinecap="round" fill="none" />
        <circle cx={206} cy={90} r={3.5} fill={W.kayu} />
      </g>
      <Uap x={120} y={100} skala={0.6} />
    </Svg>
  );
}

/** Panci gosong berasap — halaman galat. */
export function IlustrasiGalat(props: Props) {
  return (
    <Svg viewBox="0 0 280 220" {...props}>
      <circle cx={140} cy={112} r={96} fill={W.bataLembut} />
      <ellipse cx={140} cy={196} rx={90} ry={8} fill={W.kayu} opacity={0.08} />
      <Uap x={140} y={84} skala={1.1} warna="#A99A8E" />
      <rect x={66} y={106} width={148} height={16} rx={8} fill={W.kayuSedang} />
      <path d="M80 120 H200 V170 Q200 190 180 190 H100 Q80 190 80 170 Z" fill="#5A4A40" />
      <path d="M90 136 H190" stroke="#7A685C" strokeWidth={4} strokeLinecap="round" />
      <rect x={44} y={130} width={36} height={10} rx={5} fill={W.kayuSedang} />
      <rect x={200} y={130} width={36} height={10} rx={5} fill={W.kayuSedang} />
      <rect x={128} y={94} width={24} height={14} rx={7} fill={W.kayuSedang} />
      <Kilau x={56} y={70} r={8} warna={W.bata} className="anim-kedip" />
    </Svg>
  );
}

/** Wajan di atas kompor dengan api berkedip — dipakai untuk "sedang dimasak". */
function AdeganMasak() {
  return (
    <>
      <circle cx={140} cy={110} r={92} fill={W.bataLembut} />
      <Uap x={142} y={70} skala={1} />
      {/* api */}
      <g className="anim-kedip">
        <path d="M110 186 C 106 170, 118 164, 116 152 C 128 162, 132 176, 124 186 Z" fill={W.kunyit} />
        <path d="M136 186 C 130 166, 146 156, 142 140 C 158 154, 162 172, 150 186 Z" fill={W.bataTerang} />
        <path d="M164 186 C 160 170, 172 164, 170 152 C 182 162, 186 176, 178 186 Z" fill={W.kunyit} />
      </g>
      <rect x={86} y={184} width={112} height={12} rx={6} fill={W.kayuSedang} />
      {/* wajan */}
      <path d="M70 120 H214 C 210 150, 186 166, 142 166 C 98 166, 74 150, 70 120 Z" fill={W.kayu} />
      <path d="M214 124 L262 108" stroke={W.kayu} strokeWidth={10} strokeLinecap="round" />
      <path d="M82 122 H202" stroke="#4A3B32" strokeWidth={4} strokeLinecap="round" />
      {/* isi wajan */}
      <path d="M92 122 C 100 104, 124 100, 140 110 C 156 98, 184 104, 192 122 Z" fill={W.kunyitTerang} />
      <circle cx={116} cy={112} r={5} fill={W.bata} />
      <circle cx={160} cy={110} r={4} fill={W.daunTerang} />
      <circle cx={140} cy={116} r={4} fill={W.ayam} />
      <circle cx={176} cy={116} r={3} fill={W.bata} />
    </>
  );
}

function Nota({ children }: { children?: React.ReactNode }) {
  return (
    <>
      <path
        d="M96 34 H184 V178 l-11 -8 l-11 8 l-11 -8 l-11 8 l-11 -8 l-11 8 l-11 -8 l-11 8 Z"
        fill="#FFFFFF"
        stroke={W.kremGelap}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      {[60, 78, 96, 114].map((y) => (
        <g key={y}>
          <rect x={110} y={y} width={36} height={7} rx={3.5} fill={W.kremGelap} />
          <rect x={154} y={y} width={16} height={7} rx={3.5} fill={W.kremGelap} />
        </g>
      ))}
      {children}
    </>
  );
}

/** Ilustrasi sesuai tahap pesanan — kepala halaman status pesanan. */
export function IlustrasiStatus({ status, ...props }: Props & { status: StatusPesanan }) {
  return (
    <Svg viewBox="0 0 280 210" {...props}>
      <ellipse cx={140} cy={200} rx={84} ry={6} fill={W.kayu} opacity={0.08} />
      {status === "DIPROSES" ? (
        <AdeganMasak />
      ) : status === "SIAP" || status === "SELESAI" ? (
        <>
          <circle cx={140} cy={108} r={92} fill={W.daunLembut} />
          <g className="anim-ayun">
            <KotakNasi x={58} y={128} skala={0.95} />
            <g transform="translate(118 76)">
              <rect x={0} y={0} width={104} height={62} rx={10} fill="#FFFFFF" stroke={W.kremGelap} strokeWidth={2} />
              <rect x={46} y={0} width={12} height={62} fill={W.bata} />
              <path d="M52 0 C 38 -18, 22 -10, 34 0 Z M52 0 C 66 -18, 82 -10, 70 0 Z" fill={W.bata} />
            </g>
          </g>
          {status === "SELESAI" && (
            <g className="anim-masuk-skala">
              <circle cx={222} cy={60} r={22} fill={W.daun} />
              <path d="M212 60 l7 7 l13 -14" stroke="#FFFFFF" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          )}
          <Kilau x={52} y={70} r={9} className="anim-kedip" />
          <Kilau x={236} y={150} r={7} warna={W.bataTerang} className="anim-kedip" />
        </>
      ) : status === "DIBATALKAN" ? (
        <>
          <circle cx={140} cy={106} r={92} fill={W.kremTua} />
          <g opacity={0.75}>
            <Nota />
          </g>
          <circle cx={190} cy={150} r={24} fill={W.bahaya} />
          <path d="M181 141 l18 18 M199 141 l-18 18" stroke="#FFFFFF" strokeWidth={4.5} strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx={140} cy={106} r={92} fill={W.kunyitLembut} />
          <g className="anim-ayun">
            <Nota />
          </g>
          {status === "BARU" ? (
            <g className="anim-ayun-lambat">
              <circle cx={198} cy={146} r={26} fill={W.kunyit} />
              <circle cx={198} cy={146} r={19} fill="#FFFFFF" />
              <path d="M198 134 V146 L206 152" stroke={W.kayu} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          ) : (
            <g className="anim-masuk-skala">
              <circle cx={198} cy={146} r={26} fill={W.daun} />
              <path d="M186 146 l8 8 l16 -16" stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          )}
          <Kilau x={64} y={62} r={9} className="anim-kedip" />
        </>
      )}
    </Svg>
  );
}

/** Topi koki & sendok kayu — sapaan di dashboard dapur. */
export function IlustrasiKoki(props: Props) {
  return (
    <Svg viewBox="0 0 200 160" {...props}>
      <circle cx={100} cy={84} r={70} fill={W.kunyitLembut} />
      <g className="anim-ayun">
        <path d="M60 86 C 40 84, 36 52, 62 48 C 64 26, 96 18, 106 38 C 120 22, 150 30, 146 54 C 168 58, 164 88, 142 86 Z" fill="#FFFFFF" stroke={W.kremGelap} strokeWidth={2.5} />
        <rect x={62} y={84} width={78} height={30} rx={6} fill="#FFFFFF" stroke={W.kremGelap} strokeWidth={2.5} />
        <path d="M78 92 V108 M100 92 V108 M122 92 V108" stroke={W.kremGelap} strokeWidth={2.5} strokeLinecap="round" />
      </g>
      <g transform="translate(152 40) rotate(28)">
        <rect x={-3.5} y={10} width={7} height={70} rx={3.5} fill={W.rotan} />
        <ellipse cx={0} cy={6} rx={11} ry={16} fill={W.rotanMuda} />
      </g>
      <Kilau x={36} y={40} r={8} className="anim-kedip" />
    </Svg>
  );
}

const WARNA_KONFETI = [W.bata, W.kunyit, W.daunTerang, W.bataTerang, W.kunyitTerang];

/**
 * Hujan konfeti sekali jalan — dirender di server, digerakkan CSS. Posisinya
 * deterministik (bukan Math.random) supaya HTML server & klien sama persis.
 */
export function Konfeti({ jumlah = 26 }: { jumlah?: number }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-0 overflow-visible">
      {Array.from({ length: jumlah }, (_, i) => {
        const kiri = (i * 37) % 100;
        const x = ((i * 53) % 120) - 60;
        const tunda = (i % 7) * 70;
        const r = 360 + ((i * 97) % 540);
        const bulat = i % 3 === 0;
        return (
          <span
            key={i}
            className="absolute top-0 block"
            style={{
              left: `${kiri}%`,
              width: bulat ? 8 : 7,
              height: bulat ? 8 : 12,
              borderRadius: bulat ? 999 : 2,
              background: WARNA_KONFETI[i % WARNA_KONFETI.length],
              animation: `konfeti ${1.6 + (i % 5) * 0.18}s cubic-bezier(.2,.6,.4,1) ${tunda}ms both`,
              ["--x" as string]: `${x}px`,
              ["--r" as string]: `${r}deg`,
            }}
          />
        );
      })}
    </div>
  );
}
