import type { Metadata } from "next";
import { ambilPengaturan } from "@/lib/pengaturan";
import { rupiah, jamTampil } from "@/lib/format";
import { KerangkaLegal, SeksiLegal } from "@/components/toko/KerangkaLegal";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan",
  description:
    "Aturan pemesanan katering: jadwal pesan, pembayaran, pengantaran, pembatalan, dan penanganan keluhan.",
};

export default async function HalamanSyaratKetentuan() {
  const pengaturan = await ambilPengaturan();
  const kontak = pengaturan.whatsapp || "nomor WhatsApp yang tertera di beranda";

  return (
    <KerangkaLegal
      judul="Syarat & Ketentuan"
      diperbaruiPada="16 September 2026"
      ringkasan="Pesanan dianggap pasti setelah kami konfirmasi. Beberapa menu perlu dipesan beberapa hari sebelumnya karena dimasak dadakan. Pembatalan masih mungkin selama dapur belum mulai memasak."
    >
      <SeksiLegal judul="1. Tentang layanan ini">
        <p>
          {pengaturan.namaUsaha} adalah usaha katering rumahan yang melayani
          pemesanan snack box, nasi kotak, tumpeng, dan nasi goreng. Situs ini
          dipakai untuk memesan dan melacak status pesanan.
        </p>
        <p>
          Jam operasional dapur: {jamTampil(pengaturan.jamBuka)} –{" "}
          {jamTampil(pengaturan.jamTutup)} WIB. Pesanan yang masuk di luar jam
          tersebut tetap tercatat dan akan kami tanggapi pada jam buka
          berikutnya.
        </p>
      </SeksiLegal>

      <SeksiLegal judul="2. Cara pemesanan">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            Anda dapat memesan tanpa membuat akun. Kode pesanan akan tersimpan di
            perangkat yang Anda pakai memesan.
          </li>
          <li>
            Setiap menu punya jumlah pesanan minimum dan sebagian punya waktu
            persiapan (pre-order). Keterangannya tertera di halaman masing-masing
            menu.
          </li>
          <li>
            Dapur memiliki kapasitas harian. Bila kuota suatu menu untuk tanggal
            yang Anda pilih sudah penuh, sistem akan memberi tahu saat Anda
            memesan dan menyarankan jumlah yang masih tersedia.
          </li>
          <li>
            Pesanan berstatus <strong>Baru</strong> belum mengikat. Pesanan baru
            dianggap pasti setelah statusnya kami ubah menjadi{" "}
            <strong>Dikonfirmasi</strong>.
          </li>
        </ul>
      </SeksiLegal>

      <SeksiLegal judul="3. Harga dan pembayaran">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            Harga yang berlaku adalah harga yang tercatat di sistem saat pesanan
            dibuat. Harga tersebut dibekukan pada nota Anda, sehingga perubahan
            harga menu setelahnya tidak memengaruhi pesanan yang sudah masuk.
          </li>
          <li>
            Pembayaran dilakukan melalui transfer bank ke rekening yang tertera
            pada rincian pesanan, atau tunai saat serah terima.
          </li>
          <li>
            Bila Anda transfer, unggah bukti transfer pada halaman pesanan.
            Status akan berubah menjadi lunas setelah kami verifikasi secara
            manual.
          </li>
          <li>
            Situs ini tidak memproses kartu kredit/debit dan tidak menyimpan data
            pembayaran apa pun.
          </li>
        </ul>
      </SeksiLegal>

      <SeksiLegal judul="3b. Voucher dan potongan harga">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            Satu pesanan hanya dapat memakai satu kode voucher, dan potongan
            hanya berlaku untuk harga hidangan — ongkos antar tetap dibayarkan
            penuh.
          </li>
          <li>
            Voucher dapat memiliki syarat minimal belanja, kuota pemakaian, dan
            masa berlaku. Syarat yang berlaku ditampilkan saat kode dimasukkan.
          </li>
          <li>
            Besaran potongan dihitung ulang oleh sistem kami saat pesanan dibuat.
            Bila Anda mengubah jumlah pesanan setelah memasukkan kode, potongan
            ikut menyesuaikan dan bisa menjadi tidak berlaku.
          </li>
          <li>
            Voucher tidak dapat ditukar dengan uang tunai dan tidak berlaku surut
            untuk pesanan yang sudah dibuat.
          </li>
        </ul>
      </SeksiLegal>

      <SeksiLegal judul="4. Pengantaran dan pengambilan">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            Anda dapat memilih mengambil sendiri di dapur kami atau diantar ke
            alamat Anda.
          </li>
          <li>
            Ongkos antar mengikuti pengaturan yang berlaku saat pemesanan
            {pengaturan.minOrderAntar > 0 && (
              <>
                {" "}
                dan gratis untuk pesanan mulai{" "}
                {rupiah(pengaturan.minOrderAntar)}
              </>
            )}
            . Jumlahnya ditampilkan sebelum Anda menyelesaikan pesanan.
          </li>
          <li>
            Mohon pastikan alamat dan nomor HP yang Anda isi benar dan dapat
            dihubungi pada jam acara. Keterlambatan akibat alamat keliru atau
            penerima tidak dapat dihubungi berada di luar tanggung jawab kami.
          </li>
        </ul>
      </SeksiLegal>

      <SeksiLegal judul="5. Perubahan dan pembatalan">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            Perubahan jumlah, menu, tanggal, atau alamat masih dapat dilakukan
            selama status pesanan belum <strong>Sedang Dimasak</strong>. Hubungi
            kami di {kontak}.
          </li>
          <li>
            Setelah dapur mulai memasak, bahan sudah dibeli dan diolah sehingga
            pembatalan tidak lagi dapat dilayani sepenuhnya.
          </li>
          <li>
            Bila Anda sudah membayar dan pesanan dibatalkan sebelum dimasak,
            pengembalian dana dilakukan melalui transfer ke rekening pemesan.
          </li>
        </ul>
      </SeksiLegal>

      <SeksiLegal judul="6. Keluhan">
        <p>
          Bila ada yang tidak sesuai — jumlah kurang, menu keliru, atau kualitas
          tidak seperti seharusnya — hubungi kami di {kontak} pada hari yang sama
          dengan menyertakan kode pesanan dan foto. Kami akan menindaklanjuti
          setiap keluhan yang masuk pada hari acara.
        </p>
      </SeksiLegal>

      <SeksiLegal judul="7. Alergi dan kandungan makanan">
        <p>
          Semua masakan diolah di satu dapur yang sama, sehingga kami tidak dapat
          menjamin makanan bebas sepenuhnya dari kontak silang dengan bahan
          tertentu (antara lain kacang, telur, seafood, dan produk susu). Bila
          ada alergi, tuliskan pada kolom catatan saat memesan dan konfirmasikan
          kembali kepada kami.
        </p>
      </SeksiLegal>
    </KerangkaLegal>
  );
}
