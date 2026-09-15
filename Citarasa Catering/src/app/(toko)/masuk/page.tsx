import { FormMasuk } from "@/components/FormMasuk";
import { IkonPengguna } from "@/components/ikon/Ikon";

export default function HalamanMasuk() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <div className="bg-white rounded-3xl border border-krem-gelap p-6 sm:p-10 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-bata-lembut text-bata mx-auto flex items-center justify-center">
            <IkonPengguna className="w-6 h-6" />
          </div>
          <h1 className="font-tampil text-2xl font-bold text-kayu">Masuk Akun</h1>
          <p className="text-xs text-kayu-sedang">
            Masuk untuk melihat riwayat pesanan Anda atau mengakses dashboard dapur.
          </p>
        </div>

        <FormMasuk />
      </div>
    </div>
  );
}

