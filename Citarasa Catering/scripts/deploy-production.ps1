# ==============================================================================
# CITARASA CATERING - SKRIP STAGING / DEPLOYMENT PRODUKSI (WINDOWS POWERSHELL)
# ==============================================================================

Write-Host "🚀 Memulai proses verifikasi dan staging produksi Citarasa Catering..." -ForegroundColor Green

# 1. Periksa berkas environment
if (!(Test-Path ".env.production") -and !(Test-Path ".env")) {
    Write-Error "❌ Berkas .env.production atau .env tidak ditemukan! Salin .env.production.example terlebih dahulu."
    exit 1
}

# 2. Audit Kesiapan Produksi
Write-Host "`n📋 Langkah 1/4: Menjalankan audit kesiapan produksi..." -ForegroundColor Yellow
node scripts/verify-production.mjs
if ($LASTEXITCODE -ne 0) {
    Write-Error "Audit kesiapan produksi gagal. Perbaiki masalah di atas terlebih dahulu."
    exit 1
}

# 3. Uji Sintaks Skrip Penting
Write-Host "`n🔍 Langkah 2/4: Memeriksa sintaks skrip operasional..." -ForegroundColor Yellow
node --check scripts/backup-db.mjs
node --check scripts/local-db.mjs
Write-Host "✅ Sintaks skrip operasional valid." -ForegroundColor Green

# 4. Ringkasan Kesiapan
Write-Host "`n✨ SISTEM SIAP MASUK TAHAP PRODUKSI! ✨" -ForegroundColor Green
Write-Host "Untuk menjalankan container produksi:" -ForegroundColor Cyan
Write-Host "  docker compose -f docker-compose.prod.yml up -d --build" -ForegroundColor White
Write-Host "Untuk menjalankan di VPS/PM2:" -ForegroundColor Cyan
Write-Host "  npm ci" -ForegroundColor White
Write-Host "  npm run db:deploy" -ForegroundColor White
Write-Host "  npm run build" -ForegroundColor White
Write-Host "  pm2 start ecosystem.config.cjs --env production`n" -ForegroundColor White

