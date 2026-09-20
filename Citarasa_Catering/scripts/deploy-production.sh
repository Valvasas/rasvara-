#!/usr/bin/env bash
# ==============================================================================
# CITARASA CATERING - SKRIP DEPLOYMENT OTOMATIS PRODUKSI (LINUX / VPS)
# ==============================================================================
# Cara penggunaan:
#   chmod +x scripts/deploy-production.sh
#   ./scripts/deploy-production.sh
# ==============================================================================

set -eo pipefail

WARNA_HIJAU='\033[0;32m'
WARNA_MERAH='\033[0;31m'
WARNA_KUNING='\033[1;33m'
WARNA_RESET='\033[0m'

echo -e "${WARNA_HIJAU}🚀 Memulai proses deployment produksi Citarasa Catering...${WARNA_RESET}\n"

# 1. Periksa berkas environment
if [ ! -f ".env.production" ] && [ ! -f ".env" ]; then
    echo -e "${WARNA_MERAH}❌ Berkas .env.production atau .env tidak ditemukan!${WARNA_RESET}"
    echo -e "Silakan salin .env.production.example ke .env.production terlebih dahulu."
    exit 1
fi

# 2. Jalankan audit kesiapan produksi
echo -e "${WARNA_KUNING}📋 Langkah 1/5: Menjalankan audit kesiapan produksi...${WARNA_RESET}"
node scripts/verify-production.mjs

# 3. Pasang dependensi secara bersih
echo -e "\n${WARNA_KUNING}📦 Langkah 2/5: Mengunduh dependensi (npm ci)...${WARNA_RESET}"
npm ci

# 4. Terapkan migrasi database PostgreSQL
echo -e "\n${WARNA_KUNING}🗄️ Langkah 3/5: Menerapkan migrasi database (db:deploy)...${WARNA_RESET}"
npm run db:deploy

# 5. Build aplikasi Next.js
echo -e "\n${WARNA_KUNING}🔨 Langkah 4/5: Membangun aset Next.js produksi (npm run build)...${WARNA_RESET}"
npm run build

# 6. Restart PM2 jika PM2 terpasang
echo -e "\n${WARNA_KUNING}🔄 Langkah 5/5: Merestart proses server...${WARNA_RESET}"
if command -v pm2 &> /dev/null; then
    pm2 reload ecosystem.config.cjs --env production || pm2 start ecosystem.config.cjs --env production
    pm2 save
    echo -e "${WARNA_HIJAU}✅ Proses PM2 berhasil direload.${WARNA_RESET}"
else
    echo -e "${WARNA_KUNING}⚠️ PM2 tidak terdeteksi di PATH global.${WARNA_RESET}"
    echo -e "Jalankan 'npm run start' atau gunakan Docker Compose untuk memulai aplikasi."
fi

# 7. Validasi health check
echo -e "\n${WARNA_KUNING}🩺 Menguji endpoint kesehatan (/api/health)...${WARNA_RESET}"
sleep 3
if command -v curl &> /dev/null; then
    RESP=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health || true)
    if [ "$RESP" = "200" ]; then
        echo -e "${WARNA_HIJAU}✅ Health check berhasil! Respon HTTP 200 OK.${WARNA_RESET}"
    else
        echo -e "${WARNA_KUNING}⚠️ Respons health check HTTP ${RESP} (pastikan server sudah aktif di port 3000).${WARNA_RESET}"
    fi
fi

echo -e "\n${WARNA_HIJAU}✨ DEPLOYMENT PRODUKSI SELESAI DENGAN SUKSES! ✨${WARNA_RESET}\n"

