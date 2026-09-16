import type { Metadata } from "next";
import { ambilPengaturan } from "@/lib/pengaturan";
import { KerangkaLegal, SeksiLegal } from "@/components/toko/KerangkaLegal";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description:
    "Data apa saja yang kami simpan saat Anda memesan katering, berapa lama disimpan, dan bagaimana cara meminta penghapusannya.",
};

export default async function HalamanKebijakanPrivasi() {
  const pengaturan = await ambilPengaturan();
  const kontak = pengaturan.whatsapp || "nomor WhatsApp yang tertera di beranda";

  return (
    <KerangkaLegal
      judul="Kebijakan Privasi"
      diperbaruiPada="15 September 2026"
      ringkasan="Kami hanya menyimpan data yang benar-benar dibutuhkan untuk memasak dan mengantar pesanan Anda. Tidak ada iklan, tidak ada pelacak pihak ketiga, dan data Anda tidak dijual atau dibagikan ke siapa pun."
    >
      <SeksiLegal judul="1. Siapa yang mengelola data ini">
        <p>
          Situs ini dikelola langsung oleh {pengaturan.namaUsaha}, sebuah usaha
          katering rumahan. Tidak ada perusahaan lain yang ikut mengelola data
          Anda. Untuk pertanyaan apa pun mengenai data pribadi, hubungi kami di{" "}
          {kontak}.
        </p>
      </SeksiLegal>

      <SeksiLegal judul="2. Data yang kami kumpulkan">
        <p>Saat Anda memesan, kami menyimpan:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Nama pemesan dan nomor HP</strong> — dipakai untuk
            mengonfirmasi pesanan dan menghubungi Anda bila ada perubahan.
          </li>
          <li>
            <strong>Alamat pengantaran</strong> — hanya diminta bila Anda
            memilih diantar, dan hanya dipakai oleh pengantar kami.
          </li>
          <li>
            <strong>Isi pesanan, tanggal, jam acara, dan catatan khusus</strong>{" "}
            — termasuk catatan alergi atau permintaan tidak pedas, supaya dapur
            tidak salah memasak.
          </li>
          <li>
            <strong>Foto bukti transfer</strong> — bila Anda mengunggahnya,
            untuk memverifikasi pembayaran.
          </li>
        </ul>
        <p>
          Bila Anda membuat akun, kami juga menyimpan kata sandi Anda dalam
          bentuk teracak (hash scrypt). Kami tidak pernah menyimpan kata sandi
          asli, dan tidak ada seorang pun — termasuk pemilik usaha — yang bisa
          membacanya.
        </p>
        <p>
          Kami <strong>tidak</strong> meminta email, tanggal lahir, NIK, atau
          data kartu pembayaran. Pembayaran dilakukan lewat transfer bank
          langsung, jadi tidak ada nomor kartu yang melewati situs ini.
        </p>
      </SeksiLegal>

      <SeksiLegal judul="3. Cookie yang dipakai">
        <p>
          Situs ini hanya memakai dua cookie, dan keduanya diperlukan agar situs
          berfungsi. Tidak ada cookie iklan maupun cookie pelacak pihak ketiga,
          sehingga tidak ada banner persetujuan yang perlu Anda klik.
        </p>
        <div className="overflow-x-auto rounded-2xl border border-krem-gelap">
          <table className="w-full text-sm">
            <thead className="bg-krem-tua text-kayu">
              <tr>
                <th className="text-left font-bold px-4 py-3">Nama</th>
                <th className="text-left font-bold px-4 py-3">Fungsi</th>
                <th className="text-left font-bold px-4 py-3">Umur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-krem-gelap bg-white">
              <tr>
                <td className="px-4 py-3 font-mono text-xs">sesi_citarasa</td>
                <td className="px-4 py-3">
                  Menjaga Anda tetap masuk setelah login. Hanya dibuat bila Anda
                  membuat akun dan masuk.
                </td>
                <td className="px-4 py-3">30 hari</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono text-xs">pesanan_saya</td>
                <td className="px-4 py-3">
                  Mengingat kode pesanan yang dibuat dari perangkat ini supaya
                  Anda bisa membuka rincian pesanan tanpa harus punya akun.
                </td>
                <td className="px-4 py-3">180 hari</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Keduanya bersifat <em>httpOnly</em>, artinya tidak bisa dibaca oleh
          skrip apa pun di browser Anda.
        </p>
      </SeksiLegal>

      <SeksiLegal judul="4. Statistik kunjungan">
        <p>
          Kami menghitung jumlah kunjungan harian untuk mengetahui halaman mana
          yang paling dicari pembeli. Statistik ini dibuat tanpa cookie dan
          tanpa menyimpan identitas Anda.
        </p>
        <p>
          Alamat IP Anda tidak pernah disimpan. IP dan jenis browser hanya
          dipakai sesaat untuk membuat sidik acak satu arah, dicampur dengan
          kunci acak yang berganti setiap hari dan tidak pernah disimpan. Karena
          kuncinya berganti tiap hari, kunjungan Anda hari ini tidak bisa
          dihubungkan dengan kunjungan Anda besok, dan sidik itu tidak bisa
          dikembalikan menjadi alamat IP.
        </p>
        <p>
          Tidak ada Google Analytics, Meta Pixel, atau layanan pelacak lain di
          situs ini.
        </p>
      </SeksiLegal>

      <SeksiLegal judul="5. Berapa lama data disimpan">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Data pesanan</strong> disimpan selama dibutuhkan untuk
            pembukuan usaha, karena menjadi dasar catatan kas dan laporan
            keuangan.
          </li>
          <li>
            <strong>Foto bukti transfer</strong> disimpan selama pesanan terkait
            masih tercatat, dan dihapus bila Anda menggantinya.
          </li>
          <li>
            <strong>Statistik kunjungan</strong> hanya berupa angka harian
            teragregasi — tidak ada baris data per orang yang bisa dibongkar.
          </li>
        </ul>
      </SeksiLegal>

      <SeksiLegal judul="6. Hak Anda atas data pribadi">
        <p>
          Sesuai Undang-Undang Pelindungan Data Pribadi (UU No. 27 Tahun 2022),
          Anda berhak untuk:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>meminta salinan data pribadi Anda yang kami simpan;</li>
          <li>meminta perbaikan bila ada data yang keliru;</li>
          <li>
            meminta penghapusan data Anda, sepanjang tidak sedang dibutuhkan
            untuk memenuhi kewajiban pembukuan; dan
          </li>
          <li>menarik persetujuan atas pemrosesan data Anda.</li>
        </ul>
        <p>
          Untuk menggunakan hak ini, hubungi kami di {kontak} dengan
          menyebutkan nama dan nomor HP yang Anda pakai saat memesan.
        </p>
      </SeksiLegal>

      <SeksiLegal judul="7. Keamanan">
        <p>
          Kata sandi disimpan teracak dengan scrypt, sesi login ditandatangani
          secara kriptografis, dan berkas yang diunggah diperiksa isinya — bukan
          sekadar namanya — sebelum disimpan. Meski begitu, tidak ada sistem yang
          sepenuhnya kebal. Bila terjadi kebocoran data yang berisiko merugikan
          Anda, kami akan memberi tahu pihak yang terdampak.
        </p>
      </SeksiLegal>

      <SeksiLegal judul="8. Perubahan kebijakan">
        <p>
          Bila kebijakan ini berubah, tanggal &quot;terakhir diperbarui&quot; di
          atas ikut berubah. Perubahan yang berdampak besar akan kami sampaikan
          lewat pemberitahuan di beranda.
        </p>
      </SeksiLegal>
    </KerangkaLegal>
  );
}
