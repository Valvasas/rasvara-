"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as PetaLeaflet, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";

interface PetaLokasiAntarProps {
  latitude: number | null;
  longitude: number | null;
  onPindah: (lat: number, lng: number) => void;
  onHapus: () => void;
}

/** Titik awal saat pembeli belum menandai apa pun: pusat Jakarta. */
const AWAL: [number, number] = [-6.2, 106.816667];

/**
 * Peta penanda titik antar memakai Leaflet + ubin OpenStreetMap.
 *
 * Dipilih menggantikan Google Maps JS API karena tidak memerlukan kunci API
 * maupun akun penagihan — untuk usaha katering rumahan, biaya per pemuatan peta
 * tidak sebanding dengan manfaatnya. Navigasi pengantar tetap memakai aplikasi
 * Google Maps di ponselnya lewat tautan koordinat, jadi tidak ada yang hilang.
 *
 * Komponen ini sengaja hanya dirender saat pembeli memilih diantar: memuat peta
 * berarti mengirim alamat IP pembeli ke server ubin pihak ketiga, dan itu tidak
 * boleh terjadi pada orang yang hanya ingin ambil sendiri.
 *
 * Peta bukan satu-satunya jalan: alamat tertulis tetap wajib diisi, sehingga
 * pembeli yang memakai pembaca layar atau menolak izin lokasi tetap bisa memesan.
 */
export function PetaLokasiAntar({
  latitude,
  longitude,
  onPindah,
  onHapus,
}: PetaLokasiAntarProps) {
  const wadahRef = useRef<HTMLDivElement>(null);
  const petaRef = useRef<PetaLeaflet | null>(null);
  const penandaRef = useRef<Marker | null>(null);
  const onPindahRef = useRef(onPindah);

  const [siap, setSiap] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [sedangCariLokasi, setSedangCariLokasi] = useState(false);

  // Handler disimpan di ref supaya peta tidak perlu dibangun ulang tiap render.
  useEffect(() => {
    onPindahRef.current = onPindah;
  }, [onPindah]);

  useEffect(() => {
    let dibatalkan = false;

    // Leaflet menyentuh `window` saat diimpor, jadi hanya boleh dimuat di peramban.
    import("leaflet").then((L) => {
      if (dibatalkan || !wadahRef.current || petaRef.current) return;

      const peta = L.map(wadahRef.current, {
        center: latitude != null && longitude != null ? [latitude, longitude] : AWAL,
        zoom: latitude != null && longitude != null ? 17 : 12,
        // Gulir halaman di ponsel tidak boleh tersangkut di dalam peta.
        scrollWheelZoom: false,
      });

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(peta);

      // Penanda dibuat dari HTML, bukan berkas gambar bawaan Leaflet yang
      // jalurnya rusak begitu dibundel.
      const ikon = L.divIcon({
        className: "",
        html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;
                 background:#C2410C;border:3px solid #FBF7EE;
                 transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 26],
      });

      function taruhPenanda(lat: number, lng: number) {
        if (penandaRef.current) {
          penandaRef.current.setLatLng([lat, lng]);
        } else {
          const penanda = L.marker([lat, lng], { icon: ikon, draggable: true });
          penanda.addTo(peta);
          penanda.on("dragend", () => {
            const p = penanda.getLatLng();
            onPindahRef.current(p.lat, p.lng);
          });
          penandaRef.current = penanda;
        }
        onPindahRef.current(lat, lng);
      }

      peta.on("click", (e) => {
        taruhPenanda(e.latlng.lat, e.latlng.lng);
      });

      if (latitude != null && longitude != null) {
        const penanda = L.marker([latitude, longitude], {
          icon: ikon,
          draggable: true,
        });
        penanda.addTo(peta);
        penanda.on("dragend", () => {
          const p = penanda.getLatLng();
          onPindahRef.current(p.lat, p.lng);
        });
        penandaRef.current = penanda;
      }

      petaRef.current = peta;
      setSiap(true);

      // Ukuran wadah baru pasti setelah tata letak selesai; tanpa ini ubin peta
      // bisa tampil separuh abu-abu.
      setTimeout(() => peta.invalidateSize(), 120);
    });

    return () => {
      dibatalkan = true;
      petaRef.current?.remove();
      petaRef.current = null;
      penandaRef.current = null;
    };
    // Sengaja dijalankan sekali saja. Koordinat awal hanya dipakai untuk
    // memusatkan tampilan; perubahan berikutnya diurus lewat penandaRef supaya
    // peta tidak dibangun ulang setiap pembeli menggeser penanda.
  }, []);

  function pakaiLokasiSaya() {
    if (!navigator.geolocation) {
      setGalat("Peramban ini tidak mendukung deteksi lokasi.");
      return;
    }

    setSedangCariLokasi(true);
    setGalat(null);

    navigator.geolocation.getCurrentPosition(
      (posisi) => {
        setSedangCariLokasi(false);
        const { latitude: lat, longitude: lng } = posisi.coords;
        onPindah(lat, lng);

        const peta = petaRef.current;
        if (peta) {
          peta.setView([lat, lng], 17);
          penandaRef.current?.setLatLng([lat, lng]);
          if (!penandaRef.current) {
            // Penanda dibuat oleh efek di atas saat prop koordinat berubah;
            // di sini cukup memusatkan tampilan.
            peta.fire("click", { latlng: { lat, lng } });
          }
        }
      },
      () => {
        setSedangCariLokasi(false);
        setGalat(
          "Tidak bisa membaca lokasi. Izinkan akses lokasi di peramban, atau tandai sendiri titiknya di peta."
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const adaTitik = latitude != null && longitude != null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="block text-xs font-bold uppercase tracking-wider text-kayu-sedang">
          Titik Antar di Peta (opsional)
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={pakaiLokasiSaya}
            disabled={sedangCariLokasi}
            className="min-h-[40px] px-3 py-2 rounded-lg text-[11px] font-bold text-bata bg-bata-lembut hover:bg-bata hover:text-white disabled:opacity-50 transition-colors cursor-pointer"
          >
            {sedangCariLokasi ? "Mencari..." : "Pakai lokasi saya"}
          </button>

          {adaTitik && (
            <button
              type="button"
              onClick={() => {
                penandaRef.current?.remove();
                penandaRef.current = null;
                onHapus();
              }}
              className="min-h-[40px] px-3 py-2 rounded-lg text-[11px] font-bold text-kayu-sedang hover:text-bahaya transition-colors cursor-pointer"
            >
              Hapus titik
            </button>
          )}
        </div>
      </div>

      <div
        ref={wadahRef}
        className="w-full h-64 rounded-2xl overflow-hidden border border-krem-gelap bg-krem-tua z-0"
        aria-label="Peta untuk menandai titik pengantaran"
        role="application"
      />

      {!siap && (
        <p className="text-[11px] text-kayu-sedang">Memuat peta...</p>
      )}

      {galat && (
        <p role="status" className="text-[11px] font-semibold text-bahaya">
          {galat}
        </p>
      )}

      <p className="text-[11px] text-kayu-sedang leading-relaxed">
        {adaTitik ? (
          <>
            Titik tersimpan di {latitude!.toFixed(5)}, {longitude!.toFixed(5)}.
            Geser penandanya bila belum pas.
          </>
        ) : (
          <>
            Ketuk peta untuk menandai lokasi, atau lewati saja — alamat tertulis
            di atas sudah cukup. Menandai titik membantu pengantar menemukan gang
            yang tidak ada namanya di peta.
          </>
        )}
      </p>

      <p className="text-[10px] text-kayu-sedang/80">
        Peta disediakan OpenStreetMap. Saat peta terbuka, peramban Anda
        menghubungi server mereka untuk mengambil gambar peta.
      </p>
    </div>
  );
}
