const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url().optional(),
  ADMIN_PIN: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  ADMIN_SESSION_SECRET: z.string().optional(),
  CUSTOMER_SESSION_SECRET: z.string().optional(),
  CUSTOMER_SESSION_TTL_MS: z.coerce.number().int().positive().default(1000 * 60 * 60 * 24 * 14),
  STORAGE_DRIVER: z.enum(['local', 's3', 'supabase', 'cloudinary']).default('local'),
  LOCAL_UPLOAD_DIR: z.string().optional(),
  MAX_JSON_SIZE: z.string().default('150kb'),
  MAX_IMAGE_SIZE: z.coerce.number().int().positive().default(1024 * 1024 * 3),
  LOGIN_WINDOW_MS: z.coerce.number().int().positive().default(1000 * 60 * 15),
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5)
}).passthrough();

function validateEnv(rawEnv = process.env) {
  const parsed = envSchema.safeParse(rawEnv);
  if (!parsed.success) {
    return {
      ok: false,
      env: null,
      errors: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    };
  }

  const env = parsed.data;
  const errors = [];
  if (env.NODE_ENV === 'production') {
    if (!env.DATABASE_URL) errors.push('DATABASE_URL wajib diset di production.');
    if (!env.ADMIN_PIN || env.ADMIN_PIN === 'change-this-pin') errors.push('ADMIN_PIN production tidak boleh kosong/default.');
    if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD === 'change-this-password') errors.push('ADMIN_PASSWORD production tidak boleh kosong/default.');
    if (!env.ADMIN_SESSION_SECRET || env.ADMIN_SESSION_SECRET.length < 32) errors.push('ADMIN_SESSION_SECRET minimal 32 karakter di production.');
    if (!env.CUSTOMER_SESSION_SECRET || env.CUSTOMER_SESSION_SECRET.length < 32) errors.push('CUSTOMER_SESSION_SECRET minimal 32 karakter di production.');
    if (env.STORAGE_DRIVER === 'local') errors.push('STORAGE_DRIVER=local tidak disarankan untuk production; gunakan storage object resmi.');
  }

  return { ok: errors.length === 0, env, errors };
}

module.exports = {
  validateEnv
};
