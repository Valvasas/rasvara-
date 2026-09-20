/**
 * ==============================================================================
 * CITARASA CATERING - KONFIGURASI PM2 PROCESS MANAGER (PRODUKSI)
 * ==============================================================================
 * Cara menjalankan di server:
 *   1. Pasang PM2 global: npm install -g pm2
 *   2. Jalankan aplikasi: pm2 start ecosystem.config.cjs --env production
 *   3. Simpan state PM2:  pm2 save
 *   4. Setup auto-start:  pm2 startup
 * ==============================================================================
 */

module.exports = {
  apps: [
    {
      name: "citarasa-catering",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "./",
      instances: 1, // Next.js mengelola worker internal; 1 instance per 2 core ideal
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "500M",
      autorestart: true,
      exp_backoff_restart_delay: 100,
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "0.0.0.0",
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "logs/pm2-error.log",
      out_file: "logs/pm2-out.log",
      merge_logs: true,
      time: true,
    },
  ],
};

