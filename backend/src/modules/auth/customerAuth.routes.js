const express = require('express');
const { z } = require('zod');
const { writeAuditLog } = require('../audit/audit.service');
const { getPrisma } = require('../../services/prisma');
const { hashPassword, randomToken, sha256, verifyPassword } = require('../../utils/crypto');
const { fail, fieldErrorsFromZod, ok, parseCookies } = require('../../utils/http');

const router = express.Router();
const isProduction = process.env.NODE_ENV === 'production';
const SESSION_TTL_MS = Number(process.env.CUSTOMER_SESSION_TTL_MS || 1000 * 60 * 60 * 24 * 14);
const LOGIN_WINDOW_MS = Number(process.env.LOGIN_WINDOW_MS || 1000 * 60 * 15);
const LOGIN_MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS || 5);
const loginAttempts = new Map();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(160).transform((value) => value.toLowerCase()),
  phone: z.string().trim().min(8).max(40).optional().or(z.literal('')),
  password: z.string().min(10).max(128)
    .regex(/[a-z]/, 'Password harus punya huruf kecil.')
    .regex(/[A-Z]/, 'Password harus punya huruf besar.')
    .regex(/[0-9]/, 'Password harus punya angka.')
});

const loginSchema = z.object({
  email: z.string().trim().email().max(160).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128)
});

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().min(8).max(40).optional().or(z.literal(''))
});

const addressSchema = z.object({
  label: z.string().trim().min(2).max(60),
  recipientName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(8).max(40),
  addressLine: z.string().trim().min(8).max(600),
  city: z.string().trim().max(120).optional().or(z.literal('')),
  province: z.string().trim().max(120).optional().or(z.literal('')),
  postalCode: z.string().trim().max(20).optional().or(z.literal('')),
  notes: z.string().trim().max(240).optional().or(z.literal('')),
  isDefault: z.boolean().optional()
});

function getClientKey(req) {
  return `${req.ip || req.socket?.remoteAddress || 'unknown'}:${req.body?.email || ''}`;
}

function isLoginRateLimited(req) {
  const key = getClientKey(req);
  const now = Date.now();
  const state = loginAttempts.get(key);
  if (!state || now > state.resetAt) {
    loginAttempts.set(key, { count: 0, resetAt: now + LOGIN_WINDOW_MS });
    return false;
  }
  return state.count >= LOGIN_MAX_ATTEMPTS;
}

function recordFailedLogin(req) {
  const key = getClientKey(req);
  const now = Date.now();
  const state = loginAttempts.get(key) || { count: 0, resetAt: now + LOGIN_WINDOW_MS };
  state.count += 1;
  loginAttempts.set(key, state);
}

function clearLoginAttempts(req) {
  loginAttempts.delete(getClientKey(req));
}

function publicUser(user = {}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt,
    phoneVerifiedAt: user.phoneVerifiedAt,
    createdAt: user.createdAt
  };
}

function customerCookie(token) {
  const parts = [
    `customer_session=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`
  ];
  if (isProduction) parts.push('Secure');
  return parts.join('; ');
}

function clearCustomerCookie() {
  const parts = ['customer_session=', 'HttpOnly', 'SameSite=Strict', 'Path=/', 'Max-Age=0'];
  if (isProduction) parts.push('Secure');
  return parts.join('; ');
}

function prismaOrSetupError(res) {
  try {
    return getPrisma();
  } catch (error) {
    return fail(
      res,
      503,
      'DATABASE_CLIENT_NOT_READY',
      'Database marketplace belum siap. Jalankan npm install, npm run db:generate, dan Prisma migration terlebih dahulu.'
    );
  }
}

async function createSession(prisma, req, userId) {
  const rawToken = randomToken(48);
  const csrfToken = randomToken(24);
  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash: sha256(rawToken),
      csrfToken,
      ipAddress: req.ip || req.socket?.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS)
    }
  });
  return { rawToken, csrfToken, session };
}

async function requireCustomer(req, res, next) {
  const prisma = prismaOrSetupError(res);
  if (!prisma || res.headersSent) return;

  const token = parseCookies(req.headers.cookie || '').customer_session;
  if (!token) return fail(res, 401, 'SESSION_REQUIRED', 'Silakan login sebagai customer.');

  const session = await prisma.session.findFirst({
    where: {
      tokenHash: sha256(token),
      revokedAt: null,
      expiresAt: { gt: new Date() }
    },
    include: {
      user: {
        include: {
          vendorMemberships: true
        }
      }
    }
  });

  if (!session || !session.user || session.user.deletedAt || session.user.status === 'SUSPENDED') {
    return fail(res, 401, 'SESSION_INVALID', 'Sesi tidak valid atau akun tidak aktif.');
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const csrf = req.get('x-csrf-token');
    if (!csrf || csrf !== session.csrfToken) {
      return fail(res, 403, 'CSRF_INVALID', 'Token keamanan tidak valid. Muat ulang halaman lalu coba lagi.');
    }
  }

  req.prisma = prisma;
  req.customerSession = session;
  req.user = session.user;
  next();
}

router.post('/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Data registrasi belum valid.', fieldErrorsFromZod(parsed.error));
    }

    const prisma = prismaOrSetupError(res);
    if (!prisma || res.headersSent) return;

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone || null,
          passwordHash: hashPassword(parsed.data.password),
          role: 'CUSTOMER',
          status: 'ACTIVE'
        }
      });
      const session = await createSession(tx, req, user.id);
      await writeAuditLog(tx, req, {
        actorId: user.id,
        actorRole: user.role,
        action: 'CUSTOMER_REGISTERED',
        entityType: 'USER',
        entityId: user.id
      });
      return { user, session };
    });

    res.setHeader('Set-Cookie', customerCookie(created.session.rawToken));
    return ok(res, { user: publicUser(created.user), csrfToken: created.session.csrfToken }, 201);
  } catch (error) {
    if (error.code === 'P2002') {
      return fail(res, 409, 'ACCOUNT_EXISTS', 'Email atau nomor telepon sudah terdaftar.');
    }
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    if (isLoginRateLimited(req)) {
      return fail(res, 429, 'LOGIN_RATE_LIMITED', 'Terlalu banyak percobaan login. Coba lagi beberapa menit lagi.');
    }

    const parsed = loginSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Email dan password wajib valid.', fieldErrorsFromZod(parsed.error));
    }

    const prisma = prismaOrSetupError(res);
    if (!prisma || res.headersSent) return;

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user || user.deletedAt || !verifyPassword(parsed.data.password, user.passwordHash)) {
      recordFailedLogin(req);
      await writeAuditLog(prisma, req, {
        action: 'CUSTOMER_LOGIN_FAILED',
        entityType: 'USER',
        entityId: user?.id || null,
        metadata: { email: parsed.data.email }
      });
      return fail(res, 401, 'INVALID_CREDENTIALS', 'Email atau password salah.');
    }

    if (user.status === 'SUSPENDED') {
      return fail(res, 403, 'ACCOUNT_SUSPENDED', 'Akun sedang dinonaktifkan.');
    }

    clearLoginAttempts(req);
    const session = await createSession(prisma, req, user.id);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await writeAuditLog(prisma, req, {
      actorId: user.id,
      actorRole: user.role,
      action: 'CUSTOMER_LOGGED_IN',
      entityType: 'SESSION',
      entityId: session.session.id
    });

    res.setHeader('Set-Cookie', customerCookie(session.rawToken));
    return ok(res, { user: publicUser(user), csrfToken: session.csrfToken });
  } catch (error) {
    next(error);
  }
});

router.get('/session', requireCustomer, (req, res) => {
  return ok(res, {
    user: publicUser(req.user),
    csrfToken: req.customerSession.csrfToken,
    session: {
      id: req.customerSession.id,
      expiresAt: req.customerSession.expiresAt,
      createdAt: req.customerSession.createdAt
    }
  });
});

router.post('/logout', requireCustomer, async (req, res, next) => {
  try {
    await req.prisma.session.update({
      where: { id: req.customerSession.id },
      data: { revokedAt: new Date() }
    });
    await writeAuditLog(req.prisma, req, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'CUSTOMER_LOGGED_OUT',
      entityType: 'SESSION',
      entityId: req.customerSession.id
    });
    res.setHeader('Set-Cookie', clearCustomerCookie());
    return ok(res);
  } catch (error) {
    next(error);
  }
});

router.get('/sessions', requireCustomer, async (req, res, next) => {
  try {
    const sessions = await req.prisma.session.findMany({
      where: { userId: req.user.id, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, ipAddress: true, userAgent: true, createdAt: true, expiresAt: true }
    });
    return ok(res, { sessions });
  } catch (error) {
    next(error);
  }
});

router.delete('/sessions/:id', requireCustomer, async (req, res, next) => {
  try {
    const session = await req.prisma.session.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!session) return fail(res, 404, 'SESSION_NOT_FOUND', 'Session tidak ditemukan.');
    await req.prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    return ok(res);
  } catch (error) {
    next(error);
  }
});

router.delete('/sessions', requireCustomer, async (req, res, next) => {
  try {
    await req.prisma.session.updateMany({
      where: { userId: req.user.id, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    res.setHeader('Set-Cookie', clearCustomerCookie());
    return ok(res);
  } catch (error) {
    next(error);
  }
});

router.get('/profile', requireCustomer, (req, res) => {
  return ok(res, { user: publicUser(req.user) });
});

router.put('/profile', requireCustomer, async (req, res, next) => {
  try {
    const parsed = profileSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Data profil belum valid.', fieldErrorsFromZod(parsed.error));
    }
    const user = await req.prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(parsed.data.name ? { name: parsed.data.name } : {}),
        ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone || null } : {})
      }
    });
    await writeAuditLog(req.prisma, req, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'CUSTOMER_PROFILE_UPDATED',
      entityType: 'USER',
      entityId: req.user.id
    });
    return ok(res, { user: publicUser(user) });
  } catch (error) {
    if (error.code === 'P2002') return fail(res, 409, 'PHONE_EXISTS', 'Nomor telepon sudah digunakan akun lain.');
    next(error);
  }
});

router.get('/addresses', requireCustomer, async (req, res, next) => {
  try {
    const addresses = await req.prisma.address.findMany({
      where: { userId: req.user.id, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }]
    });
    return ok(res, { addresses });
  } catch (error) {
    next(error);
  }
});

router.post('/addresses', requireCustomer, async (req, res, next) => {
  try {
    const parsed = addressSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Alamat belum valid.', fieldErrorsFromZod(parsed.error));
    }
    const address = await req.prisma.$transaction(async (tx) => {
      if (parsed.data.isDefault) {
        await tx.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
      }
      return tx.address.create({
        data: { ...parsed.data, userId: req.user.id }
      });
    });
    return ok(res, { address }, 201);
  } catch (error) {
    next(error);
  }
});

router.put('/addresses/:id', requireCustomer, async (req, res, next) => {
  try {
    const parsed = addressSchema.partial().safeParse(req.body || {});
    if (!parsed.success) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Alamat belum valid.', fieldErrorsFromZod(parsed.error));
    }
    const existing = await req.prisma.address.findFirst({
      where: { id: req.params.id, userId: req.user.id, deletedAt: null }
    });
    if (!existing) return fail(res, 404, 'ADDRESS_NOT_FOUND', 'Alamat tidak ditemukan.');

    const address = await req.prisma.$transaction(async (tx) => {
      if (parsed.data.isDefault) {
        await tx.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
      }
      return tx.address.update({
        where: { id: existing.id },
        data: parsed.data
      });
    });
    return ok(res, { address });
  } catch (error) {
    next(error);
  }
});

router.delete('/addresses/:id', requireCustomer, async (req, res, next) => {
  try {
    const existing = await req.prisma.address.findFirst({
      where: { id: req.params.id, userId: req.user.id, deletedAt: null }
    });
    if (!existing) return fail(res, 404, 'ADDRESS_NOT_FOUND', 'Alamat tidak ditemukan.');
    await req.prisma.address.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });
    return ok(res);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
module.exports.requireCustomer = requireCustomer;
module.exports.publicUser = publicUser;
