#include <iostream>
#include <limits>

// Membaca satu nilai dari input, mengulang jika input bukan angka
// atau di luar rentang 0-100 (nilai akademik valid).
double bacaNilai(const std::string& label) {
    double nilai;
    while (true) {
        std::cout << "Masukkan nilai " << label << ": ";
        if (std::cin >> nilai && nilai >= 0.0 && nilai <= 100.0) {
            break;
        }
        std::cout << "Input tidak valid! Masukkan angka antara 0-100.\n";
        std::cin.clear();
        std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
    }
    return nilai;
}

int main() {
    std::cout << "=== Program Penghitung Rata-Rata Nilai ===\n\n";

    double uts   = bacaNilai("UTS");
    double uas   = bacaNilai("UAS");
    double kuis  = bacaNilai("KUIS");
    double tugas = bacaNilai("TUGAS");

    double rataRata = (uts + uas + kuis + tugas) / 4.0;

    std::cout << "\n--- Hasil ---\n";
    std::cout << "UTS   : " << uts << "\n";
    std::cout << "UAS   : " << uas << "\n";
    std::cout << "KUIS  : " << kuis << "\n";
    std::cout << "TUGAS : " << tugas << "\n";
    std::cout << "Rata-rata nilai kamu adalah: " << rataRata << "\n";

    return 0;
}
