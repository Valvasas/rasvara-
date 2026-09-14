#include <iostream>
#include <limits>
#include <string>

using namespace std;

// Membaca satu nilai dari input, mengulang jika input bukan angka
// atau di luar rentang 0-100 (nilai akademik valid).
double bacaNilai(const string& label) {
    double nilai;
    while (true) {
        cout << "Masukkan nilai " << label << ": ";
        if (cin >> nilai && nilai >= 0.0 && nilai <= 100.0) {
            break;
        }
        cout << "Input tidak valid! Masukkan angka antara 0-100.\n";
        cin.clear();
        cin.ignore(numeric_limits<streamsize>::max(), '\n');
    }
    return nilai;
}

int main() {
    cout << "=== Program Penghitung Rata-Rata Nilai ===\n\n";

    double uts   = bacaNilai("UTS");
    double uas   = bacaNilai("UAS");
    double kuis  = bacaNilai("KUIS");
    double tugas = bacaNilai("TUGAS");

    double rataRata = (uts + uas + kuis + tugas) / 4.0;

    cout << "\n--- Hasil ---\n";
    cout << "UTS   : " << uts << "\n";
    cout << "UAS   : " << uas << "\n";
    cout << "KUIS  : " << kuis << "\n";
    cout << "TUGAS : " << tugas << "\n";
    cout << "Rata-rata nilai kamu adalah: " << rataRata << "\n";

    return 0;
}
