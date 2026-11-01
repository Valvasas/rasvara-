/**
 * Nama kolom anti-bot, dipisah dari `anti-bot.ts` karena berkas itu memakai
 * `node:crypto` dan tidak boleh ikut terbundel ke komponen klien.
 */
export const NAMA_HONEYPOT = "situs_web";
export const NAMA_TOKEN = "token_formulir";
