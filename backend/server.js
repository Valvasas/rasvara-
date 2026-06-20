const crypto = require('crypto');
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

const { validateEnv } = require('./src/config/env');
const customerAuthRoutes = require('./src/modules/auth/customerAuth.routes');
const cartRoutes = require('./src/modules/cart/cart.routes');
const checkoutRoutes = require('./src/modules/checkout/checkout.routes');
const customerOrderRoutes = require('./src/modules/orders/customerOrder.routes');
const paymentRoutes = require('./src/modules/payments/payment.routes');
const vendorMarketplaceOrderRoutes = require('./src/modules/vendors/vendorMarketplaceOrder.routes');
const { createStorageAdapter, IMAGE_MIME_EXT } = require('./src/services/storage');

const app = express();
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const UPLOAD_DIR = path.join(PUBLIC_DIR, 'uploads');
const isProduction = process.env.NODE_ENV === 'production';

const ADMIN_PIN = process.env.ADMIN_PIN || (isProduction ? '' : '197355');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (isProduction ? '' : 'kikijen123');
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || (isProduction ? '' : 'dev-only-change-this-secret');
const SESSION_TTL_MS = Number(process.env.ADMIN_SESSION_TTL_MS || 1000 * 60 * 60 * 8);
const MAX_JSON_SIZE = process.env.MAX_JSON_SIZE || '150kb';
const MAX_IMAGE_SIZE = Number(process.env.MAX_IMAGE_SIZE || 1024 * 1024 * 3);
const LOGIN_WINDOW_MS = Number(process.env.LOGIN_WINDOW_MS || 1000 * 60 * 15);
const LOGIN_MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS || 5);
const ORDER_STATUSES = new Set([
  'Menunggu Persetujuan',
  'Disetujui',
  'Diproses',
  'Siap Dikirim/Diambil',
  'Selesai',
  'Batal'
]);
const ORDER_STATUS_STEPS = [
  'Menunggu Persetujuan',
  'Disetujui',
  'Diproses',
  'Siap Dikirim/Diambil',
  'Selesai'
];
const PUBLIC_FILES = new Set([
  '/',
  '/admin',
  '/vendor',
  '/vendor-bookkeeping',
  '/index.html',
  '/admin.html',
  '/vendor.html',
  '/vendor-bookkeeping.html',
  '/style.css',
  '/admin.css',
  '/vendor.css',
  '/script.js',
  '/admin.js',
  '/vendor.js',
  '/vendor-bookkeeping.js'
]);
const loginAttempts = new Map();
const envReport = validateEnv(process.env);
if (!envReport.ok) {
  console.error(`Konfigurasi environment belum aman:\n- ${envReport.errors.join('\n- ')}`);
  if (isProduction) process.exit(1);
}
const storageAdapter = createStorageAdapter({
  driver: process.env.STORAGE_DRIVER || 'local',
  maxImageSize: MAX_IMAGE_SIZE
});

if (isProduction && (!ADMIN_PIN || !ADMIN_PASSWORD || !SESSION_SECRET)) {
  console.error('ADMIN_PIN, ADMIN_PASSWORD, dan ADMIN_SESSION_SECRET wajib diset di production.');
  process.exit(1);
}

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    cb(null, storageAdapter.buildFileName(file));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_SIZE, files: 1, fields: 4, parts: 6 },
  fileFilter: (req, file, cb) => {
    try {
      storageAdapter.validateImage(file);
      cb(null, true);
    } catch (error) {
      return cb(error);
    }
  }
});

function getUploadErrorMessage(error) {
  if (!error) return 'Upload gambar gagal.';
  if (error.code === 'LIMIT_FILE_SIZE') return `Ukuran gambar maksimal ${Math.round(MAX_IMAGE_SIZE / (1024 * 1024))}MB.`;
  if (error.code === 'LIMIT_FILE_COUNT') return 'Upload hanya boleh 1 gambar dalam sekali kirim.';
  if (error.code === 'LIMIT_UNEXPECTED_FILE') return 'Field upload tidak valid. Pilih gambar dari tombol upload yang tersedia.';
  if (['LIMIT_FIELD_COUNT', 'LIMIT_PART_COUNT', 'LIMIT_FIELD_KEY', 'LIMIT_FIELD_VALUE'].includes(error.code)) {
    return 'Form upload gambar tidak valid. Pilih ulang 1 file gambar lalu coba lagi.';
  }
  return error.message || 'Upload gambar gagal.';
}

function sign(value) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('base64url');
}

function safeEqual(a = '', b = '') {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('base64url');
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 32, 'sha256').toString('base64url');
  return `pbkdf2:120000:${salt}:${hash}`;
}

function verifyPassword(password, stored = '') {
  const [scheme, rawIterations, salt, expected] = String(stored).split(':');
  const iterations = Number(rawIterations);
  if (scheme !== 'pbkdf2' || !iterations || !salt || !expected) return false;
  const actual = crypto.pbkdf2Sync(String(password), salt, iterations, 32, 'sha256').toString('base64url');
  return safeEqual(actual, expected);
}

function createTrackingToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function sanitizeTrackingToken(value = '') {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 96);
}

function createAdminSession() {
  const payload = {
    sub: 'admin',
    csrf: crypto.randomBytes(24).toString('base64url'),
    exp: Date.now() + SESSION_TTL_MS
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return { token: `${body}.${sign(body)}`, csrf: payload.csrf };
}

function createVendorSession(vendorId) {
  const payload = {
    sub: 'vendor',
    vendorId: Number(vendorId),
    csrf: crypto.randomBytes(24).toString('base64url'),
    exp: Date.now() + SESSION_TTL_MS
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return { token: `${body}.${sign(body)}`, csrf: payload.csrf };
}

function getClientKey(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function getLoginAttemptState(req) {
  const key = getClientKey(req);
  const now = Date.now();
  const state = loginAttempts.get(key);
  if (!state || now > state.resetAt) {
    const freshState = { count: 0, resetAt: now + LOGIN_WINDOW_MS };
    loginAttempts.set(key, freshState);
    return { key, state: freshState };
  }
  return { key, state };
}

function isLoginRateLimited(req) {
  const { state } = getLoginAttemptState(req);
  return state.count >= LOGIN_MAX_ATTEMPTS;
}

function recordFailedLogin(req) {
  const { state } = getLoginAttemptState(req);
  state.count += 1;
}

function clearLoginAttempts(req) {
  loginAttempts.delete(getClientKey(req));
}

function parseCookies(header = '') {
  return header.split(';').reduce((cookies, part) => {
    const [key, ...rawValue] = part.trim().split('=');
    if (!key) return cookies;
    cookies[key] = decodeURIComponent(rawValue.join('=') || '');
    return cookies;
  }, {});
}

function getAdminSession(req) {
  const token = parseCookies(req.headers.cookie || '').admin_session;
  if (!token || !token.includes('.')) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature || !safeEqual(sign(body), signature)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.sub !== 'admin' || Date.now() > Number(payload.exp || 0)) return null;
    return payload;
  } catch (error) {
    return null;
  }
}

function getVendorSession(req) {
  const token = parseCookies(req.headers.cookie || '').vendor_session;
  if (!token || !token.includes('.')) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature || !safeEqual(sign(body), signature)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.sub !== 'vendor' || !Number(payload.vendorId) || Date.now() > Number(payload.exp || 0)) return null;
    return payload;
  } catch (error) {
    return null;
  }
}

function requireAdmin(req, res, next) {
  const session = getAdminSession(req);
  if (!session) {
    return res.status(401).json({ ok: false, message: 'Sesi admin tidak valid. Silakan login ulang.' });
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const csrf = req.get('x-csrf-token');
    if (!csrf || csrf !== session.csrf) {
      return res.status(403).json({ ok: false, message: 'Token keamanan tidak valid. Muat ulang admin dan login ulang.' });
    }
  }

  req.adminSession = session;
  next();
}

function requireVendor(req, res, next) {
  const session = getVendorSession(req);
  if (!session) {
    return res.status(401).json({ ok: false, message: 'Sesi pedagang tidak valid. Silakan login ulang.' });
  }

  const data = loadData();
  const vendor = data.vendors.find((item) => item.id === Number(session.vendorId));
  if (!vendor || vendor.status !== 'active') {
    return res.status(403).json({ ok: false, message: 'Akun pedagang belum aktif atau sedang dinonaktifkan.' });
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const csrf = req.get('x-csrf-token');
    if (!csrf || csrf !== session.csrf) {
      return res.status(403).json({ ok: false, message: 'Token keamanan tidak valid. Login ulang lalu coba lagi.' });
    }
  }

  req.vendorSession = session;
  req.vendor = vendor;
  next();
}

function adminCookie(token) {
  const parts = [
    `admin_session=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`
  ];
  if (isProduction) parts.push('Secure');
  return parts.join('; ');
}

function clearAdminCookie() {
  const parts = ['admin_session=', 'HttpOnly', 'SameSite=Strict', 'Path=/', 'Max-Age=0'];
  if (isProduction) parts.push('Secure');
  return parts.join('; ');
}

function vendorCookie(token) {
  const parts = [
    `vendor_session=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`
  ];
  if (isProduction) parts.push('Secure');
  return parts.join('; ');
}

function clearVendorCookie() {
  const parts = ['vendor_session=', 'HttpOnly', 'SameSite=Strict', 'Path=/', 'Max-Age=0'];
  if (isProduction) parts.push('Secure');
  return parts.join('; ');
}

function loadData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(raw);
    return normalizeData(data);
  } catch (error) {
    console.error('Error membaca data file:', error.message);
    return normalizeData({ menus: [], orders: [], ledger: [], vendors: [], reviews: [], settings: {} });
  }
}

function saveData(data) {
  const tempFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tempFile, DATA_FILE);
}

function normalizeData(data) {
  const vendors = Array.isArray(data.vendors) ? data.vendors.map(normalizeVendor).filter(Boolean) : [];
  const menus = Array.isArray(data.menus) ? data.menus.map((menu) => normalizeMenu(menu, vendors)).filter(Boolean) : [];
  const orders = Array.isArray(data.orders) ? data.orders.map((order) => normalizeOrder(order, menus)).filter(Boolean) : [];
  const ledger = Array.isArray(data.ledger) ? data.ledger.map((entry) => normalizeLedgerEntry(entry, vendors)).filter(Boolean) : [];
  const reviews = Array.isArray(data.reviews) ? data.reviews.map((review) => normalizeReview(review, vendors)).filter(Boolean) : [];
  return {
    menus,
    orders,
    ledger,
    vendors,
    reviews,
    settings: sanitizeSettings(data.settings || {})
  };
}

function normalizeVendor(vendor = {}) {
  const id = Number(vendor.id) || Date.now();
  const status = ['pending', 'active', 'suspended'].includes(vendor.status) ? vendor.status : 'active';
  return {
    id,
    storeName: sanitizeText(vendor.storeName || vendor.businessName || 'Toko Jajanan', 'Toko Jajanan', 100),
    ownerName: sanitizeText(vendor.ownerName || '', '', 100),
    email: sanitizeText(String(vendor.email || '').toLowerCase(), '', 120),
    whatsapp: sanitizeText(vendor.whatsapp || '', '', 40),
    address: sanitizeText(vendor.address || '', '', 400),
    bio: sanitizeText(vendor.bio || '', '', 600),
    avatar: sanitizeImageUrl(vendor.avatar || ''),
    passwordHash: typeof vendor.passwordHash === 'string' ? vendor.passwordHash : '',
    status,
    createdAt: vendor.createdAt || new Date().toISOString(),
    updatedAt: vendor.updatedAt || vendor.createdAt || new Date().toISOString()
  };
}

function publicVendor(vendor = {}) {
  return {
    id: vendor.id,
    storeName: vendor.storeName,
    ownerName: vendor.ownerName,
    whatsapp: vendor.whatsapp,
    address: vendor.address,
    bio: vendor.bio,
    avatar: vendor.avatar,
    status: vendor.status,
    createdAt: vendor.createdAt
  };
}

function privateVendor(vendor = {}) {
  const { passwordHash, ...safeVendor } = vendor;
  return safeVendor;
}

function normalizeReview(review = {}, vendors = []) {
  const vendorId = Number(review.vendorId || 0);
  if (vendorId && vendors.length && !vendors.some((vendor) => vendor.id === vendorId)) return null;
  const rating = Math.max(1, Math.min(5, Number(review.rating || 5)));
  return {
    id: Number(review.id) || Date.now(),
    vendorId,
    menuId: Number(review.menuId || 0),
    customerName: sanitizeText(review.customerName || 'Pelanggan', 'Pelanggan', 100),
    comment: sanitizeText(review.comment || '', '', 600),
    rating,
    status: review.status === 'hidden' ? 'hidden' : 'visible',
    createdAt: review.createdAt || new Date().toISOString()
  };
}

function normalizeLedgerEntry(entry = {}, vendors = []) {
  const amount = Number(entry.amount || 0);
  const vendorId = Number(entry.vendorId || 0);
  const vendor = vendors.find((item) => item.id === vendorId);
  return {
    id: Number(entry.id) || Date.now(),
    vendorId: vendor ? vendor.id : vendorId || 0,
    vendorName: vendor ? vendor.storeName : sanitizeText(entry.vendorName || ''),
    date: getDateOnly(entry.date) || new Date().toISOString().slice(0, 10),
    type: entry.type === 'expense' ? 'expense' : 'income',
    category: sanitizeText(entry.category, 'Operasional'),
    description: sanitizeText(entry.description || ''),
    amount: Number.isFinite(amount) ? Math.max(0, amount) : 0,
    paymentMethod: sanitizeText(entry.paymentMethod || 'Kas'),
    createdAt: entry.createdAt || new Date().toISOString()
  };
}

function normalizeMenu(menu = {}, vendors = []) {
  const price = Number(menu.price ?? menu.sellingPrice ?? 0);
  const costPrice = Number(menu.costPrice ?? 0);
  const vendorId = Number(menu.vendorId || 0);
  const vendor = vendors.find((item) => item.id === vendorId);
  const availability = ['active', 'sold_out', 'draft'].includes(menu.availability) ? menu.availability : 'active';
  if (!menu.name || !Number.isFinite(price)) return null;
  return {
    ...menu,
    id: Number(menu.id) || Date.now(),
    vendorId: vendor ? vendor.id : vendorId || 0,
    vendorName: vendor ? vendor.storeName : sanitizeText(menu.vendorName || 'Rasvara Official', 'Rasvara Official', 100),
    name: sanitizeText(menu.name),
    category: sanitizeText(menu.category || 'berat'),
    desc: sanitizeText(menu.desc || ''),
    image: sanitizeImageUrl(menu.image || ''),
    price,
    sellingPrice: price,
    costPrice: Number.isFinite(costPrice) ? Math.max(0, costPrice) : 0,
    unitType: sanitizeText(menu.unitType || menu.unit || 'porsi'),
    minOrder: Math.max(1, Number(menu.minOrder || 1)),
    isPackage: Boolean(menu.isPackage || menu.category === 'catering'),
    availability
  };
}

function normalizeOrder(order = {}, menus = []) {
  const cartItems = Array.isArray(order.cartItems) ? order.cartItems.map((item) => {
    const menu = menus.find((menuItem) => menuItem.id === Number(item.id));
    const price = Number(item.price ?? menu?.price ?? 0);
    const costPrice = Number(item.costPrice ?? menu?.costPrice ?? 0);
    const quantity = Math.max(1, Number(item.quantity || 1));
    return {
      id: Number(item.id),
      vendorId: Number(menu?.vendorId || item.vendorId || 0),
      vendorName: sanitizeText(menu?.vendorName || item.vendorName || 'Rasvara Official', 'Rasvara Official', 100),
      name: sanitizeText(item.name || menu?.name || 'Menu'),
      category: sanitizeText(item.category || menu?.category || ''),
      quantity,
      price: Number.isFinite(price) ? Math.max(0, price) : 0,
      sellingPrice: Number.isFinite(price) ? Math.max(0, price) : 0,
      costPrice: Number.isFinite(costPrice) ? Math.max(0, costPrice) : 0,
      unitType: sanitizeText(item.unitType || menu?.unitType || 'porsi'),
      isPackage: Boolean(item.isPackage ?? menu?.isPackage),
      image: sanitizeImageUrl(item.image || menu?.image || '')
    };
  }) : [];
  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalCost = cartItems.reduce((sum, item) => sum + Number(item.costPrice || 0) * item.quantity, 0);
  const status = ORDER_STATUSES.has(order.status) ? order.status : 'Menunggu Persetujuan';
  const createdAt = order.createdAt || new Date().toISOString();
  const statusHistory = Array.isArray(order.statusHistory)
    ? order.statusHistory
        .map((entry) => ({
          status: ORDER_STATUSES.has(entry?.status) ? entry.status : '',
          at: entry?.at || createdAt,
          note: sanitizeText(entry?.note || '', '', 240),
          actor: ['admin', 'vendor', 'system'].includes(entry?.actor) ? entry.actor : 'system'
        }))
        .filter((entry) => entry.status)
    : [];
  if (!statusHistory.length) {
    statusHistory.push({ status: 'Menunggu Persetujuan', at: createdAt, note: 'Pesanan dibuat.', actor: 'system' });
    if (status !== 'Menunggu Persetujuan') {
      statusHistory.push({ status, at: order.updatedAt || createdAt, note: 'Status diperbarui.', actor: 'system' });
    }
  } else if (!statusHistory.some((entry) => entry.status === status)) {
    statusHistory.push({ status, at: order.updatedAt || createdAt, note: 'Status diperbarui.', actor: 'system' });
  }
  return {
    ...order,
    id: Number(order.id) || Date.now(),
    customerName: sanitizeText(order.customerName || ''),
    phone: sanitizeText(order.phone || ''),
    eventDate: getDateOnly(order.eventDate),
    eventType: sanitizeText(order.eventType || order.orderPurpose || 'Kebutuhan Pribadi'),
    orderPurpose: sanitizeText(order.orderPurpose || order.eventType || 'Kebutuhan Pribadi'),
    fulfillmentType: sanitizeText(order.fulfillmentType || 'Antar ke alamat'),
    address: sanitizeText(order.address || ''),
    notes: sanitizeText(order.notes || ''),
    paymentMethod: sanitizeText(order.paymentMethod || 'Transfer Bank'),
    cartItems,
    total: Number(order.total || total),
    totalCost: Number(order.totalCost || totalCost),
    profit: Number(order.profit ?? ((order.total || total) - (order.totalCost || totalCost))),
    status,
    trackingToken: sanitizeTrackingToken(order.trackingToken || ''),
    statusHistory,
    updatedAt: order.updatedAt || statusHistory[statusHistory.length - 1]?.at || createdAt,
    createdAt
  };
}

function sanitizeText(value, fallback = '', maxLength = 1200) {
  if (typeof value !== 'string') return fallback;
  return value.trim().replace(/[<>]/g, '').slice(0, maxLength);
}

function sanitizeRichText(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  return value
    .trim()
    .replace(/<(?!\/?(br|i|em)\b)[^>]*>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .slice(0, 800);
}

function sanitizeImageUrl(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (trimmed.startsWith('/uploads/')) return `/uploads/${path.basename(trimmed)}`;
  try {
    const url = new URL(trimmed);
    if (['https:', 'http:'].includes(url.protocol)) return url.toString();
  } catch (error) {
    return '';
  }
  return '';
}

function sanitizeSettings(settings = {}) {
  const highlight = settings.highlight || {};
  const business = sanitizeBusinessSettings(settings.business || {}, settings);
  return {
    business,
    heroTitle: sanitizeRichText(settings.heroTitle || ''),
    heroDesc: sanitizeText(settings.heroDesc || ''),
    heroImg: sanitizeImageUrl(settings.heroImg || ''),
    profileTitle: sanitizeText(settings.profileTitle || ''),
    profileDesc: sanitizeText(settings.profileDesc || ''),
    profileImg: sanitizeImageUrl(settings.profileImg || ''),
    testi1Text: sanitizeText(settings.testi1Text || ''),
    testi1Name: sanitizeText(settings.testi1Name || ''),
    testi2Text: sanitizeText(settings.testi2Text || ''),
    testi2Name: sanitizeText(settings.testi2Name || ''),
    footerDesc: sanitizeText(settings.footerDesc || ''),
    footerWa: sanitizeText(settings.footerWa || ''),
    footerEmail: sanitizeText(settings.footerEmail || ''),
    highlight: {
      status: highlight.status === 'mati' ? 'mati' : 'aktif',
      title: sanitizeText(highlight.title || ''),
      badge: sanitizeText(highlight.badge || ''),
      desc: sanitizeText(highlight.desc || ''),
      image: sanitizeImageUrl(highlight.image || ''),
      priceOld: Math.max(0, Number(highlight.priceOld || 0)),
      priceNew: Math.max(0, Number(highlight.priceNew || 0)),
      productId: Number(highlight.productId || 0)
    }
  };
}

function sanitizeBusinessSettings(business = {}, legacy = {}) {
  return {
    brandName: sanitizeText(business.brandName || legacy.brandName || 'Rasvara', 'Rasvara', 80),
    brandSubtitle: sanitizeText(business.brandSubtitle || legacy.brandSubtitle || 'Art Catering', 'Art Catering', 80),
    legalName: sanitizeText(business.legalName || legacy.legalName || 'Rasvara Catering', 'Rasvara Catering', 120),
    tagline: sanitizeText(business.tagline || legacy.tagline || 'Mahakarya Rasa Keluarga', 'Mahakarya Rasa Keluarga', 160),
    whatsapp: sanitizeText(business.whatsapp || legacy.footerWa || '', '', 40),
    phone: sanitizeText(business.phone || legacy.phone || '', '', 40),
    email: sanitizeText(business.email || legacy.footerEmail || '', '', 120),
    address: sanitizeText(business.address || legacy.address || 'Jl. Senopati No. 88, Kebayoran Baru, Jakarta Selatan', '', 400),
    openingHours: sanitizeText(business.openingHours || legacy.openingHours || 'Buka setiap hari 08.00 - 17.00 WIB', '', 160),
    instagramUrl: sanitizeExternalUrl(business.instagramUrl || ''),
    tiktokUrl: sanitizeExternalUrl(business.tiktokUrl || ''),
    whatsappUrl: sanitizeExternalUrl(business.whatsappUrl || ''),
    mapsEmbedUrl: sanitizeMapUrl(business.mapsEmbedUrl || ''),
    seoTitle: sanitizeText(business.seoTitle || legacy.seoTitle || '', '', 120),
    seoDescription: sanitizeText(business.seoDescription || legacy.seoDescription || '', '', 180),
    copyrightText: sanitizeText(business.copyrightText || legacy.copyrightText || '', '', 160)
  };
}

function sanitizeExternalUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value.trim());
    if (['https:', 'http:'].includes(url.protocol)) return url.toString();
  } catch (error) {
    return '';
  }
  return '';
}

function sanitizeMapUrl(value) {
  const url = sanitizeExternalUrl(value);
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'www.google.com' || parsed.hostname === 'maps.google.com') return url;
  } catch (error) {
    return '';
  }
  return '';
}

function buildOrderItems(cartItems, menus) {
  return cartItems.map((item) => {
    const menu = menus.find((menuItem) => menuItem.id === Number(item.id));
    if (!menu) {
      const error = new Error(`Menu "${sanitizeText(item.name || String(item.id))}" tidak ditemukan.`);
      error.status = 400;
      throw error;
    }
    if (menu.availability === 'draft' || menu.availability === 'sold_out') {
      const error = new Error(`Menu "${menu.name}" sedang tidak tersedia.`);
      error.status = 400;
      throw error;
    }
    const quantity = Math.max(1, Number(item.quantity || 1));
    return {
      id: menu.id,
      vendorId: menu.vendorId || 0,
      vendorName: menu.vendorName || 'Rasvara Official',
      name: menu.name,
      category: menu.category,
      quantity,
      price: menu.price,
      sellingPrice: menu.price,
      costPrice: menu.costPrice || 0,
      unitType: menu.unitType || 'porsi',
      isPackage: Boolean(menu.isPackage),
      image: menu.image
    };
  });
}

function getDateOnly(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function isWithinDateRange(dateValue, startDate, endDate) {
  const date = getDateOnly(dateValue);
  if (startDate && date < startDate) return false;
  if (endDate && date > endDate) return false;
  return true;
}

function buildSalesSummary(orders, startDate, endDate) {
  const filtered = (orders || []).filter((order) => (
    order.status !== 'Batal' && isWithinDateRange(order.createdAt, startDate, endDate)
  ));
  const totalRevenue = filtered.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const totalCost = filtered.reduce((sum, order) => sum + Number(order.totalCost || 0), 0);
  const totalProfit = filtered.reduce((sum, order) => sum + Number(order.profit ?? ((order.total || 0) - (order.totalCost || 0))), 0);
  const totalItems = filtered.reduce((sum, order) => sum + (order.cartItems || []).reduce((itemSum, item) => itemSum + Number(item.quantity || 0), 0), 0);
  return {
    orders: filtered,
    summary: {
      orderCount: filtered.length,
      totalItems,
      totalRevenue,
      totalCost,
      totalProfit,
      averageOrder: filtered.length ? Math.round(totalRevenue / filtered.length) : 0
    }
  };
}

function publicOrder(order, options = {}) {
  const { totalCost, profit, trackingToken, cartItems = [], ...safeOrder } = order;
  return {
    ...safeOrder,
    ...(options.includeTrackingToken && trackingToken ? { trackingToken } : {}),
    cartItems: cartItems.map(({ costPrice, ...item }) => item)
  };
}

function sanitizePhoneForMatch(value = '') {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
}

function orderMatchesPhone(order, phone = '') {
  const target = sanitizePhoneForMatch(phone);
  return target && sanitizePhoneForMatch(order.phone).endsWith(target.slice(-10));
}

function buildOrderProgress(order, options = {}) {
  const safeOrder = publicOrder(order, options);
  const currentIndex = ORDER_STATUS_STEPS.indexOf(order.status);
  return {
    ...safeOrder,
    progressSteps: ORDER_STATUS_STEPS.map((status, index) => {
      const history = (order.statusHistory || []).find((entry) => entry.status === status);
      const isCancelled = order.status === 'Batal';
      const isCompleted = !isCancelled && currentIndex >= index;
      const isActive = order.status === status;
      return {
        label: status,
        status,
        state: isCancelled ? 'cancelled' : isActive ? 'active' : isCompleted ? 'completed' : 'pending',
        completed: isCompleted,
        active: isActive,
        timestamp: history?.at || null,
        at: history?.at || null,
        note: history?.note || ''
      };
    })
  };
}

function updateOrderStatusRecord(order, status, actor = 'system', note = '') {
  const now = new Date().toISOString();
  order.status = status;
  order.updatedAt = now;
  order.statusHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [];
  order.statusHistory.push({
    status,
    at: now,
    note: sanitizeText(note || `Status diperbarui menjadi ${status}.`, '', 240),
    actor
  });
  return order;
}

function requestLogger(req, res, next) {
  const startedAt = Date.now();
  res.on('finish', () => {
    if (req.path.startsWith('/api')) {
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms`);
    }
  });
  next();
}

function setSecurityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
      "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self'",
      "frame-src https://www.google.com https://maps.google.com",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  );
  next();
}

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(setSecurityHeaders);
app.use(requestLogger);
app.use(express.json({ limit: MAX_JSON_SIZE }));
app.use('/api/auth', customerAuthRoutes);
app.use('/api/customers', customerAuthRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/orders', customerOrderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/vendor/marketplace', requireVendor, vendorMarketplaceOrderRoutes);

app.use((req, res, next) => {
  const normalizedPath = req.path.replace(/\\/g, '/');
  if (normalizedPath.startsWith('/backend') || normalizedPath.includes('/node_modules')) {
    return res.status(404).send('Not found');
  }
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, status: 'healthy' });
});

app.get('/api/ready', async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({
      ok: false,
      status: 'not_ready',
      checks: {
        database: 'DATABASE_URL belum dikonfigurasi',
        storage: storageAdapter.explain()
      }
    });
  }

  try {
    const { getPrisma } = require('./src/services/prisma');
    await getPrisma().$queryRaw`SELECT 1`;
    return res.json({
      ok: true,
      status: 'ready',
      checks: {
        database: 'ok',
        storage: storageAdapter.explain()
      }
    });
  } catch (error) {
    return res.status(503).json({
      ok: false,
      status: 'not_ready',
      checks: {
        database: 'Prisma/database belum siap',
        storage: storageAdapter.explain()
      }
    });
  }
});

app.get('/api/menus', (req, res) => {
  const data = loadData();
  if (req.query.includeCost === 'true') {
    const session = getAdminSession(req);
    if (!session) return res.status(401).json({ ok: false, message: 'Sesi admin diperlukan.' });
    return res.json(data.menus || []);
  }
  res.json((data.menus || []).filter((menu) => menu.availability !== 'draft').map(({ costPrice, ...menu }) => ({
    ...menu,
    vendor: menu.vendorId ? publicVendor(data.vendors.find((vendor) => vendor.id === menu.vendorId) || {}) : null
  })));
});

app.get('/api/settings', (req, res) => {
  const data = loadData();
  res.json(data.settings || {});
});

app.get('/api/vendors', (req, res) => {
  const data = loadData();
  const officialMenus = data.menus.filter((menu) => !menu.vendorId && menu.availability !== 'draft');
  const officialVendor = {
    id: 0,
    storeName: 'Rasvara Official',
    ownerName: 'Admin Marketplace',
    whatsapp: data.settings?.business?.whatsapp || data.settings?.footerWa || '',
    address: data.settings?.business?.address || '',
    bio: 'Etalase resmi Rasvara Marketplace untuk menu utama, paket catering, dan produk pilihan admin.',
    avatar: '',
    status: 'active',
    createdAt: '',
    menuCount: officialMenus.length,
    reviewCount: 0,
    averageRating: 0,
    isOfficial: true
  };
  const vendors = data.vendors
    .filter((vendor) => vendor.status === 'active')
    .map((vendor) => {
      const menuCount = data.menus.filter((menu) => menu.vendorId === vendor.id && menu.availability !== 'draft').length;
      const reviews = data.reviews.filter((review) => review.vendorId === vendor.id && review.status === 'visible');
      const averageRating = reviews.length
        ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10) / 10
        : 0;
      return { ...publicVendor(vendor), menuCount, reviewCount: reviews.length, averageRating };
    });
  res.json([officialVendor, ...vendors]);
});

app.get('/api/vendors/:id/reviews', (req, res) => {
  const data = loadData();
  const vendorId = Number(req.params.id);
  res.json(data.reviews.filter((review) => review.vendorId === vendorId && review.status === 'visible'));
});

app.post('/api/reviews', (req, res) => {
  const data = loadData();
  const { vendorId, menuId, customerName, rating, comment } = req.body || {};
  const vendor = data.vendors.find((item) => item.id === Number(vendorId) && item.status === 'active');
  if (!vendor || !customerName || !comment || !Number.isFinite(Number(rating))) {
    return res.status(400).json({ ok: false, message: 'Lengkapi pedagang, nama, rating, dan ulasan.' });
  }

  const review = normalizeReview({
    id: Date.now(),
    vendorId: vendor.id,
    menuId: Number(menuId || 0),
    customerName,
    rating,
    comment,
    status: 'visible',
    createdAt: new Date().toISOString()
  }, data.vendors);
  data.reviews.unshift(review);
  saveData(data);
  res.json({ ok: true, review });
});

app.post('/api/orders/recover-link', (req, res) => {
  if (isLoginRateLimited(req)) {
    return res.status(429).json({ ok: false, message: 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.' });
  }

  const data = loadData();
  const phone = sanitizeText(req.body?.phone || '', '', 40);
  const orderId = Number(req.body?.orderId || 0);
  if (!phone || !orderId) {
    return res.status(400).json({ ok: false, message: 'Masukkan nomor WhatsApp dan ID pesanan terakhir.' });
  }

  const order = data.orders.find((item) => Number(item.id) === orderId);
  if (!order || !orderMatchesPhone(order, phone)) {
    recordFailedLogin(req);
    return res.status(401).json({ ok: false, message: 'Nomor WhatsApp atau ID pesanan tidak cocok.' });
  }

  clearLoginAttempts(req);
  if (!order.trackingToken) {
    order.trackingToken = createTrackingToken();
    order.updatedAt = new Date().toISOString();
    saveData(data);
  }
  res.json({
    ok: true,
    order: buildOrderProgress(order, { includeTrackingToken: true })
  });
});

app.get('/api/admin/session', (req, res) => {
  const session = getAdminSession(req);
  if (!session) return res.status(401).json({ ok: false, message: 'Sesi admin tidak aktif.' });
  res.json({ ok: true, csrfToken: session.csrf });
});

app.post('/api/admin/login', (req, res) => {
  if (isLoginRateLimited(req)) {
    return res.status(429).json({ ok: false, message: 'Terlalu banyak percobaan login. Coba lagi beberapa menit lagi.' });
  }

  const { pin, password } = req.body || {};
  if (pin === ADMIN_PIN && password === ADMIN_PASSWORD) {
    clearLoginAttempts(req);
    const session = createAdminSession();
    res.setHeader('Set-Cookie', adminCookie(session.token));
    return res.json({ ok: true, csrfToken: session.csrf });
  }
  recordFailedLogin(req);
  return res.status(401).json({ ok: false, message: 'PIN atau Password salah.' });
});

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  res.setHeader('Set-Cookie', clearAdminCookie());
  res.json({ ok: true });
});

function buildVendorStats(vendor, data) {
  const menus = data.menus.filter((menu) => menu.vendorId === vendor.id);
  const orders = data.orders.filter((order) => (order.cartItems || []).some((item) => item.vendorId === vendor.id));
  const reviews = data.reviews.filter((review) => review.vendorId === vendor.id);
  const ledger = data.ledger.filter((entry) => entry.vendorId === vendor.id);
  const revenue = orders.reduce((sum, order) => {
    return sum + (order.cartItems || [])
      .filter((item) => item.vendorId === vendor.id)
      .reduce((itemSum, item) => itemSum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  }, 0);
  const averageRating = reviews.length
    ? Math.round((reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length) * 10) / 10
    : 0;

  return {
    ...privateVendor(vendor),
    stats: {
      menuCount: menus.length,
      orderCount: orders.length,
      reviewCount: reviews.length,
      ledgerCount: ledger.length,
      revenue,
      averageRating
    }
  };
}

function getVendorOrderItems(order, vendorId) {
  return (order.cartItems || []).filter((item) => item.vendorId === vendorId);
}

function buildVendorBookkeeping(vendor, data) {
  const orders = data.orders
    .filter((order) => getVendorOrderItems(order, vendor.id).length)
    .map((order) => {
      const cartItems = getVendorOrderItems(order, vendor.id);
      const revenue = cartItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
      const cost = cartItems.reduce((sum, item) => sum + Number(item.costPrice || 0) * Number(item.quantity || 0), 0);
      return { ...order, cartItems, vendorRevenue: revenue, vendorCost: cost, vendorProfit: revenue - cost };
    });
  const completedOrders = orders.filter((order) => order.status !== 'Batal');
  const ledger = data.ledger.filter((entry) => entry.vendorId === vendor.id);
  const salesRevenue = completedOrders.reduce((sum, order) => sum + Number(order.vendorRevenue || 0), 0);
  const salesCost = completedOrders.reduce((sum, order) => sum + Number(order.vendorCost || 0), 0);
  const ledgerIncome = ledger.filter((entry) => entry.type === 'income').reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const ledgerExpense = ledger.filter((entry) => entry.type === 'expense').reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const dailyMap = new Map();
  completedOrders.forEach((order) => {
    const date = getDateOnly(order.createdAt);
    const current = dailyMap.get(date) || { date, revenue: 0, profit: 0, orders: 0 };
    current.revenue += Number(order.vendorRevenue || 0);
    current.profit += Number(order.vendorProfit || 0);
    current.orders += 1;
    dailyMap.set(date, current);
  });
  const productMap = new Map();
  completedOrders.forEach((order) => {
    order.cartItems.forEach((item) => {
      const key = item.id || item.name;
      const current = productMap.get(key) || { name: item.name, qty: 0, revenue: 0 };
      current.qty += Number(item.quantity || 0);
      current.revenue += Number(item.price || 0) * Number(item.quantity || 0);
      productMap.set(key, current);
    });
  });
  return {
    summary: {
      orderCount: completedOrders.length,
      pendingOrderCount: orders.filter((order) => ['Menunggu Persetujuan', 'Disetujui', 'Diproses'].includes(order.status)).length,
      salesRevenue,
      salesCost,
      grossProfit: salesRevenue - salesCost,
      ledgerIncome,
      ledgerExpense,
      netCashflow: salesRevenue + ledgerIncome - ledgerExpense
    },
    dailySales: [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-14),
    topProducts: [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8),
    recentOrders: orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 12),
    ledger: ledger.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 100)
  };
}

function buildVendorNotifications(vendor, data) {
  const orderNotifications = data.orders
    .filter((order) => getVendorOrderItems(order, vendor.id).length)
    .map((order) => {
      const items = getVendorOrderItems(order, vendor.id);
      const total = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
      const itemCount = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      const isNew = order.status === 'Menunggu Persetujuan';
      return {
        id: `order-${order.id}-${order.status}`,
        type: 'order',
        title: isNew ? `Order baru dari ${order.customerName}` : `Update order: ${order.status}`,
        message: `${itemCount} item toko kamu senilai ${formatCurrency(total)}. ${isNew ? 'Segera cek dan siapkan konfirmasi.' : 'Pantau progresnya di daftar pesanan.'}`,
        createdAt: order.createdAt,
        actionLabel: 'Lihat pesanan',
        actionTarget: 'orders'
      };
    });
  const reviewNotifications = data.reviews
    .filter((review) => review.vendorId === vendor.id)
    .map((review) => ({
      id: `review-${review.id}`,
      type: 'review',
      title: `Review ${review.rating}/5 dari ${review.customerName}`,
      message: sanitizeText(review.comment || 'Pelanggan memberi review baru.', 'Pelanggan memberi review baru.', 140),
      createdAt: review.createdAt,
      actionLabel: 'Lihat review',
      actionTarget: 'reviews'
    }));
  return [...orderNotifications, ...reviewNotifications]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 30);
}

function formatCurrency(amount = 0) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(Number(amount) || 0);
}

app.get('/api/admin/vendors', requireAdmin, (req, res) => {
  const data = loadData();
  res.json(data.vendors.map((vendor) => buildVendorStats(vendor, data)));
});

app.get('/api/admin/vendors/:id', requireAdmin, (req, res) => {
  const data = loadData();
  const vendorId = Number(req.params.id);
  const vendor = data.vendors.find((item) => item.id === vendorId);
  if (!vendor) return res.status(404).json({ ok: false, message: 'Pedagang tidak ditemukan.' });
  res.json({
    vendor: buildVendorStats(vendor, data),
    menus: data.menus.filter((menu) => menu.vendorId === vendorId),
    orders: data.orders.filter((order) => (order.cartItems || []).some((item) => item.vendorId === vendorId)),
    ledger: data.ledger.filter((entry) => entry.vendorId === vendorId),
    reviews: data.reviews.filter((review) => review.vendorId === vendorId)
  });
});

app.put('/api/admin/vendors/:id/status', requireAdmin, (req, res) => {
  const data = loadData();
  const vendorId = Number(req.params.id);
  const vendor = data.vendors.find((item) => item.id === vendorId);
  const { status } = req.body || {};
  if (!vendor) return res.status(404).json({ ok: false, message: 'Pedagang tidak ditemukan.' });
  if (!['pending', 'active', 'suspended'].includes(status)) {
    return res.status(400).json({ ok: false, message: 'Status pedagang tidak valid.' });
  }
  vendor.status = status;
  vendor.updatedAt = new Date().toISOString();
  saveData(data);
  res.json({ ok: true, vendor: privateVendor(vendor) });
});

app.get('/api/orders', requireAdmin, (req, res) => {
  const data = loadData();
  if (req.query.includeCost === 'true') return res.json(data.orders || []);
  res.json((data.orders || []).map(publicOrder));
});

app.get('/api/sales-history', requireAdmin, (req, res) => {
  const data = loadData();
  const { startDate = '', endDate = '' } = req.query;
  res.json(buildSalesSummary(data.orders || [], startDate, endDate));
});

app.get('/api/ledger', requireAdmin, (req, res) => {
  const data = loadData();
  const { startDate = '', endDate = '' } = req.query;
  const entries = (data.ledger || []).filter((entry) => isWithinDateRange(entry.date || entry.createdAt, startDate, endDate));
  const sales = buildSalesSummary(data.orders || [], startDate, endDate).summary;
  const manualIncome = entries.filter((entry) => entry.type === 'income').reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const manualExpense = entries.filter((entry) => entry.type === 'expense').reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const cogs = sales.totalCost;
  const cashIn = sales.totalRevenue + manualIncome;
  const cashOut = cogs + manualExpense;

  res.json({
    entries,
    summary: {
      salesRevenue: sales.totalRevenue,
      cogs,
      manualIncome,
      manualExpense,
      cashIn,
      cashOut,
      netCashflow: cashIn - cashOut,
      grossProfit: sales.totalProfit,
      orderCount: sales.orderCount
    }
  });
});

app.post('/api/ledger', requireAdmin, (req, res) => {
  const data = loadData();
  const { date, type, category, description, amount, paymentMethod } = req.body || {};
  const finalAmount = Number(amount);

  if (!date || !['income', 'expense'].includes(type) || !category || !Number.isFinite(finalAmount) || finalAmount <= 0) {
    return res.status(400).json({ ok: false, message: 'Lengkapi tanggal, tipe transaksi, kategori, dan nominal lebih dari 0.' });
  }

  const entry = normalizeLedgerEntry({
    id: Date.now(),
    date,
    type,
    category,
    description: description || '',
    amount: finalAmount,
    paymentMethod: paymentMethod || 'Kas',
    createdAt: new Date().toISOString()
  });

  data.ledger.unshift(entry);
  saveData(data);
  res.json({ ok: true, entry });
});

app.delete('/api/ledger/:id', requireAdmin, (req, res) => {
  const data = loadData();
  const entryId = Number(req.params.id);
  const entryIndex = data.ledger.findIndex((entry) => Number(entry.id) === entryId);

  if (entryIndex === -1) {
    return res.status(404).json({ ok: false, message: 'Catatan pembukuan tidak ditemukan.' });
  }

  data.ledger.splice(entryIndex, 1);
  saveData(data);
  res.json({ ok: true });
});

app.post('/api/upload-image', requireAdmin, (req, res) => {
  upload.single('image')(req, res, (error) => {
    if (error) {
      return res.status(400).json({ ok: false, message: getUploadErrorMessage(error) });
    }
    if (!req.file) {
      return res.status(400).json({ ok: false, message: 'File gambar tidak ditemukan.' });
    }

    const url = `/uploads/${path.basename(req.file.path)}`;
    res.json({ ok: true, url });
  });
});

app.post('/api/vendor/register', (req, res) => {
  const data = loadData();
  const { storeName, ownerName, email, whatsapp, password, address, bio } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!storeName || !ownerName || !normalizedEmail || !whatsapp || !password || String(password).length < 8) {
    return res.status(400).json({ ok: false, message: 'Lengkapi nama toko, pemilik, email, WhatsApp, dan password minimal 8 karakter.' });
  }

  if (data.vendors.some((vendor) => vendor.email === normalizedEmail)) {
    return res.status(409).json({ ok: false, message: 'Email pedagang sudah terdaftar.' });
  }

  const vendor = normalizeVendor({
    id: Date.now(),
    storeName,
    ownerName,
    email: normalizedEmail,
    whatsapp,
    address: address || '',
    bio: bio || '',
    passwordHash: hashPassword(password),
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  data.vendors.push(vendor);
  saveData(data);

  const session = createVendorSession(vendor.id);
  res.setHeader('Set-Cookie', vendorCookie(session.token));
  res.json({ ok: true, csrfToken: session.csrf, vendor: privateVendor(vendor) });
});

app.post('/api/vendor/login', (req, res) => {
  if (isLoginRateLimited(req)) {
    return res.status(429).json({ ok: false, message: 'Terlalu banyak percobaan login. Coba lagi beberapa menit lagi.' });
  }

  const data = loadData();
  const { email, password } = req.body || {};
  const vendor = data.vendors.find((item) => item.email === String(email || '').trim().toLowerCase());
  if (!vendor || !verifyPassword(password || '', vendor.passwordHash)) {
    recordFailedLogin(req);
    return res.status(401).json({ ok: false, message: 'Email atau password pedagang salah.' });
  }
  if (vendor.status !== 'active') {
    return res.status(403).json({ ok: false, message: 'Akun pedagang belum aktif atau sedang dinonaktifkan.' });
  }

  clearLoginAttempts(req);
  const session = createVendorSession(vendor.id);
  res.setHeader('Set-Cookie', vendorCookie(session.token));
  res.json({ ok: true, csrfToken: session.csrf, vendor: privateVendor(vendor) });
});

app.get('/api/vendor/session', requireVendor, (req, res) => {
  res.json({ ok: true, csrfToken: req.vendorSession.csrf, vendor: privateVendor(req.vendor) });
});

app.post('/api/vendor/logout', requireVendor, (req, res) => {
  res.setHeader('Set-Cookie', clearVendorCookie());
  res.json({ ok: true });
});

app.get('/api/vendor/profile', requireVendor, (req, res) => {
  res.json(privateVendor(req.vendor));
});

app.put('/api/vendor/profile', requireVendor, (req, res) => {
  const data = loadData();
  const vendor = data.vendors.find((item) => item.id === req.vendor.id);
  const { storeName, ownerName, whatsapp, address, bio, avatar } = req.body || {};
  vendor.storeName = sanitizeText(storeName || vendor.storeName, vendor.storeName, 100);
  vendor.ownerName = sanitizeText(ownerName || vendor.ownerName, vendor.ownerName, 100);
  vendor.whatsapp = sanitizeText(whatsapp || vendor.whatsapp, vendor.whatsapp, 40);
  vendor.address = sanitizeText(address || '', '', 400);
  vendor.bio = sanitizeText(bio || '', '', 600);
  vendor.avatar = sanitizeImageUrl(avatar || '') || vendor.avatar;
  vendor.updatedAt = new Date().toISOString();

  data.menus.forEach((menu) => {
    if (menu.vendorId === vendor.id) menu.vendorName = vendor.storeName;
  });
  data.ledger.forEach((entry) => {
    if (entry.vendorId === vendor.id) entry.vendorName = vendor.storeName;
  });

  saveData(data);
  res.json({ ok: true, vendor: privateVendor(vendor) });
});

app.post('/api/vendor/upload-image', requireVendor, (req, res) => {
  upload.single('image')(req, res, (error) => {
    if (error) {
      return res.status(400).json({ ok: false, message: getUploadErrorMessage(error) });
    }
    if (!req.file) {
      return res.status(400).json({ ok: false, message: 'File gambar tidak ditemukan.' });
    }
    res.json({ ok: true, url: `/uploads/${path.basename(req.file.path)}` });
  });
});

app.get('/api/vendor/menus', requireVendor, (req, res) => {
  const data = loadData();
  res.json(data.menus.filter((menu) => menu.vendorId === req.vendor.id));
});

app.post('/api/vendor/menus', requireVendor, (req, res) => {
  const data = loadData();
  const { name, category, price, sellingPrice, costPrice, desc, image, unitType, minOrder, isPackage, availability } = req.body || {};
  const finalPrice = Number(price ?? sellingPrice);
  const finalCost = Number(costPrice);
  if (!name || !category || !Number.isFinite(finalPrice) || finalPrice <= 0 || !Number.isFinite(finalCost) || finalCost < 0 || !unitType || !image) {
    return res.status(400).json({ ok: false, message: 'Lengkapi nama, kategori, satuan, harga jual, harga modal, dan gambar menu.' });
  }

  const newMenu = normalizeMenu({
    id: Date.now(),
    vendorId: req.vendor.id,
    vendorName: req.vendor.storeName,
    name,
    category,
    price: finalPrice,
    sellingPrice: finalPrice,
    costPrice: finalCost,
    unitType,
    minOrder,
    isPackage,
    availability,
    desc: desc || '',
    image
  }, data.vendors);

  if (!newMenu.image) {
    return res.status(400).json({ ok: false, message: 'URL gambar harus valid atau hasil upload lokal.' });
  }

  data.menus.push(newMenu);
  saveData(data);
  res.json({ ok: true, menu: newMenu });
});

app.put('/api/vendor/menus/:id', requireVendor, (req, res) => {
  const data = loadData();
  const menuId = Number(req.params.id);
  const menuIndex = data.menus.findIndex((item) => item.id === menuId && item.vendorId === req.vendor.id);
  if (menuIndex === -1) return res.status(404).json({ ok: false, message: 'Menu pedagang tidak ditemukan.' });

  const currentMenu = data.menus[menuIndex];
  const { name, category, price, sellingPrice, costPrice, desc, image, unitType, minOrder, isPackage, availability } = req.body || {};
  const finalPrice = price !== undefined || sellingPrice !== undefined ? Number(price ?? sellingPrice) : currentMenu.price;
  const finalCost = costPrice !== undefined ? Number(costPrice) : currentMenu.costPrice;
  if (!Number.isFinite(finalPrice) || finalPrice <= 0 || !Number.isFinite(finalCost) || finalCost < 0) {
    return res.status(400).json({ ok: false, message: 'Harga jual harus lebih dari 0 dan harga modal minimal 0.' });
  }

  const updatedMenu = normalizeMenu({
    ...currentMenu,
    vendorId: req.vendor.id,
    vendorName: req.vendor.storeName,
    name: name || currentMenu.name,
    category: category || currentMenu.category,
    price: finalPrice,
    sellingPrice: finalPrice,
    costPrice: finalCost,
    unitType: unitType || currentMenu.unitType,
    minOrder: minOrder !== undefined ? minOrder : currentMenu.minOrder,
    isPackage: isPackage !== undefined ? isPackage : currentMenu.isPackage,
    availability: availability || currentMenu.availability,
    desc: desc !== undefined ? desc : currentMenu.desc,
    image: image || currentMenu.image
  }, data.vendors);

  if (!updatedMenu.image) {
    return res.status(400).json({ ok: false, message: 'URL gambar harus valid atau hasil upload lokal.' });
  }

  data.menus[menuIndex] = updatedMenu;
  saveData(data);
  res.json({ ok: true, menu: updatedMenu });
});

app.delete('/api/vendor/menus/:id', requireVendor, (req, res) => {
  const data = loadData();
  const menuId = Number(req.params.id);
  const menuIndex = data.menus.findIndex((item) => item.id === menuId && item.vendorId === req.vendor.id);
  if (menuIndex === -1) return res.status(404).json({ ok: false, message: 'Menu pedagang tidak ditemukan.' });
  data.menus.splice(menuIndex, 1);
  saveData(data);
  res.json({ ok: true });
});

app.get('/api/vendor/orders', requireVendor, (req, res) => {
  const data = loadData();
  res.json(data.orders
    .filter((order) => (order.cartItems || []).some((item) => item.vendorId === req.vendor.id))
    .map((order) => ({
      ...order,
      cartItems: (order.cartItems || []).filter((item) => item.vendorId === req.vendor.id)
    })));
});

app.put('/api/vendor/orders/:id/status', requireVendor, (req, res) => {
  const data = loadData();
  const orderId = Number(req.params.id);
  const order = data.orders.find((item) => item.id === orderId);
  if (!order || !getVendorOrderItems(order, req.vendor.id).length) {
    return res.status(404).json({ ok: false, message: 'Pesanan toko tidak ditemukan.' });
  }

  const { status } = req.body || {};
  if (!ORDER_STATUSES.has(status)) {
    return res.status(400).json({ ok: false, message: 'Status pesanan tidak valid.' });
  }
  updateOrderStatusRecord(order, status, 'vendor', `Status diperbarui oleh ${req.vendor.storeName}.`);
  saveData(data);
  res.json({
    ok: true,
    order: {
      ...publicOrder(order),
      cartItems: (order.cartItems || []).filter((item) => item.vendorId === req.vendor.id)
    }
  });
});

app.get('/api/vendor/bookkeeping-summary', requireVendor, (req, res) => {
  const data = loadData();
  res.json(buildVendorBookkeeping(req.vendor, data));
});

app.get('/api/vendor/notifications', requireVendor, (req, res) => {
  const data = loadData();
  res.json(buildVendorNotifications(req.vendor, data));
});

app.get('/api/vendor/ledger', requireVendor, (req, res) => {
  const data = loadData();
  res.json(data.ledger.filter((entry) => entry.vendorId === req.vendor.id));
});

app.post('/api/vendor/ledger', requireVendor, (req, res) => {
  const data = loadData();
  const { date, type, category, description, amount, paymentMethod } = req.body || {};
  const finalAmount = Number(amount);
  if (!date || !['income', 'expense'].includes(type) || !category || !Number.isFinite(finalAmount) || finalAmount <= 0) {
    return res.status(400).json({ ok: false, message: 'Lengkapi tanggal, tipe transaksi, kategori, dan nominal lebih dari 0.' });
  }

  const entry = normalizeLedgerEntry({
    id: Date.now(),
    vendorId: req.vendor.id,
    vendorName: req.vendor.storeName,
    date,
    type,
    category,
    description: description || '',
    amount: finalAmount,
    paymentMethod: paymentMethod || 'Kas',
    createdAt: new Date().toISOString()
  }, data.vendors);
  data.ledger.unshift(entry);
  saveData(data);
  res.json({ ok: true, entry });
});

app.delete('/api/vendor/ledger/:id', requireVendor, (req, res) => {
  const data = loadData();
  const entryId = Number(req.params.id);
  const entryIndex = data.ledger.findIndex((entry) => entry.id === entryId && entry.vendorId === req.vendor.id);
  if (entryIndex === -1) return res.status(404).json({ ok: false, message: 'Catatan pembukuan tidak ditemukan.' });
  data.ledger.splice(entryIndex, 1);
  saveData(data);
  res.json({ ok: true });
});

app.get('/api/vendor/reviews', requireVendor, (req, res) => {
  const data = loadData();
  res.json(data.reviews.filter((review) => review.vendorId === req.vendor.id));
});

app.post('/api/menus', requireAdmin, (req, res) => {
  const data = loadData();
  const { name, category, price, sellingPrice, costPrice, desc, image, unitType, minOrder, isPackage } = req.body || {};
  const finalPrice = Number(price ?? sellingPrice);
  const finalCost = Number(costPrice);

  if (!name || !category || !Number.isFinite(finalPrice) || finalPrice <= 0 || !Number.isFinite(finalCost) || finalCost < 0 || !unitType || !image) {
    return res.status(400).json({ ok: false, message: 'Lengkapi Nama, Kategori, Satuan, Harga Jual, Harga Modal, dan Gambar menu.' });
  }

  const newMenu = normalizeMenu({
    id: Date.now(),
    name,
    category,
    price: finalPrice,
    sellingPrice: finalPrice,
    costPrice: finalCost,
    unitType,
    minOrder,
    isPackage,
    desc: desc || '',
    image
  });

  if (!newMenu.image) {
    return res.status(400).json({ ok: false, message: 'URL gambar harus berupa HTTPS/HTTP valid atau hasil upload lokal.' });
  }

  data.menus.push(newMenu);
  saveData(data);
  res.json({ ok: true, menu: newMenu });
});

app.put('/api/menus/:id', requireAdmin, (req, res) => {
  const data = loadData();
  const menuId = Number(req.params.id);
  const menuIndex = data.menus.findIndex((item) => item.id === menuId);

  if (menuIndex === -1) {
    return res.status(404).json({ ok: false, message: 'Menu tidak ditemukan.' });
  }

  const currentMenu = data.menus[menuIndex];
  const { name, category, price, sellingPrice, costPrice, desc, image, unitType, minOrder, isPackage } = req.body || {};
  const finalPrice = price !== undefined || sellingPrice !== undefined ? Number(price ?? sellingPrice) : currentMenu.price;
  const finalCost = costPrice !== undefined ? Number(costPrice) : currentMenu.costPrice;

  if (!Number.isFinite(finalPrice) || finalPrice <= 0 || !Number.isFinite(finalCost) || finalCost < 0) {
    return res.status(400).json({ ok: false, message: 'Harga jual harus lebih dari 0 dan harga modal minimal 0.' });
  }

  const updatedMenu = normalizeMenu({
    ...currentMenu,
    name: name || currentMenu.name,
    category: category || currentMenu.category,
    price: finalPrice,
    sellingPrice: finalPrice,
    costPrice: finalCost,
    unitType: unitType || currentMenu.unitType,
    minOrder: minOrder !== undefined ? minOrder : currentMenu.minOrder,
    isPackage: isPackage !== undefined ? isPackage : currentMenu.isPackage,
    desc: desc !== undefined ? desc : currentMenu.desc,
    image: image || currentMenu.image
  });

  if (!updatedMenu.image) {
    return res.status(400).json({ ok: false, message: 'URL gambar harus berupa HTTPS/HTTP valid atau hasil upload lokal.' });
  }

  data.menus[menuIndex] = updatedMenu;
  saveData(data);
  res.json({ ok: true, menu: updatedMenu });
});

app.delete('/api/menus/:id', requireAdmin, (req, res) => {
  const data = loadData();
  const menuId = Number(req.params.id);
  const menuIndex = data.menus.findIndex((item) => item.id === menuId);

  if (menuIndex === -1) {
    return res.status(404).json({ ok: false, message: 'Menu tidak ditemukan.' });
  }

  data.menus.splice(menuIndex, 1);
  saveData(data);
  res.json({ ok: true });
});

app.post('/api/orders', (req, res) => {
  const data = loadData();
  const {
    customerName,
    phone,
    eventDate,
    eventType,
    orderPurpose,
    fulfillmentType,
    address,
    notes,
    paymentMethod,
    cartItems
  } = req.body || {};

  if (!customerName || !phone || !address || !Array.isArray(cartItems) || !cartItems.length) {
    return res.status(400).json({ ok: false, message: 'Lengkapi data pemesanan dan pastikan keranjang tidak kosong.' });
  }

  let serverItems;
  try {
    serverItems = buildOrderItems(cartItems, data.menus || []);
  } catch (error) {
    return res.status(error.status || 500).json({ ok: false, message: error.message || 'Data menu pesanan tidak valid.' });
  }

  const total = serverItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalCost = serverItems.reduce((sum, item) => sum + item.costPrice * item.quantity, 0);

  const order = normalizeOrder({
    id: Date.now(),
    customerName,
    phone,
    eventDate,
    eventType: eventType || orderPurpose || 'Kebutuhan Pribadi',
    orderPurpose: orderPurpose || eventType || 'Kebutuhan Pribadi',
    fulfillmentType: fulfillmentType || 'Antar ke alamat',
    address,
    notes: notes || '',
    paymentMethod: paymentMethod || 'Transfer Bank',
    cartItems: serverItems,
    total,
    totalCost,
    profit: total - totalCost,
    status: 'Menunggu Persetujuan',
    trackingToken: createTrackingToken(),
    createdAt: new Date().toISOString()
  }, data.menus || []);

  data.orders.unshift(order);
  saveData(data);
  res.json({ ok: true, order: publicOrder(order, { includeTrackingToken: true }) });
});

app.get('/api/orders/progress/:token', (req, res) => {
  const data = loadData();
  const token = sanitizeTrackingToken(req.params.token || '');
  if (!token || token.length < 24) {
    return res.status(400).json({ ok: false, message: 'Link progress tidak valid.' });
  }
  const order = data.orders.find((item) => item.trackingToken && safeEqual(item.trackingToken, token));
  if (!order) {
    return res.status(404).json({ ok: false, message: 'Link progress tidak ditemukan atau sudah tidak berlaku.' });
  }
  res.json({ ok: true, order: buildOrderProgress(order) });
});

app.get('/api/orders/track', (req, res) => {
  const data = loadData();
  const orderId = Number(req.query.orderId || req.query.id || 0);
  const phone = sanitizeText(req.query.phone || '', '', 40);
  if (!orderId || !phone) {
    return res.status(400).json({ ok: false, message: 'Masukkan ID pesanan dan nomor WhatsApp.' });
  }
  const order = data.orders.find((item) => item.id === orderId);
  if (!order || !orderMatchesPhone(order, phone)) {
    return res.status(404).json({ ok: false, message: 'Pesanan tidak ditemukan. Cek lagi ID pesanan dan nomor WhatsApp.' });
  }
  if (!order.trackingToken) {
    order.trackingToken = createTrackingToken();
    order.updatedAt = new Date().toISOString();
    saveData(data);
  }
  res.json({ ok: true, order: buildOrderProgress(order, { includeTrackingToken: true }) });
});

app.put('/api/orders/:id', requireAdmin, (req, res) => {
  const data = loadData();
  const orderId = Number(req.params.id);
  const orderIndex = data.orders.findIndex((item) => item.id === orderId);

  if (orderIndex === -1) {
    return res.status(404).json({ ok: false, message: 'Pesanan tidak ditemukan.' });
  }

  const { status } = req.body || {};
  if (!ORDER_STATUSES.has(status)) {
    return res.status(400).json({ ok: false, message: 'Status pesanan tidak valid.' });
  }

  updateOrderStatusRecord(data.orders[orderIndex], status, 'admin', 'Status diperbarui admin.');
  saveData(data);
  res.json({ ok: true, order: data.orders[orderIndex] });
});

app.put('/api/settings', requireAdmin, (req, res) => {
  const data = loadData();
  data.settings = sanitizeSettings({
    ...data.settings,
    ...(req.body || {}),
    business: {
      ...(data.settings?.business || {}),
      ...((req.body || {}).business || {})
    },
    highlight: {
      ...(data.settings?.highlight || {}),
      ...((req.body || {}).highlight || {})
    }
  });
  saveData(data);
  res.json({ ok: true, settings: data.settings });
});

app.use('/uploads', express.static(UPLOAD_DIR, {
  fallthrough: false,
  immutable: true,
  maxAge: '30d',
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

app.use(express.static(PUBLIC_DIR, {
  dotfiles: 'ignore',
  index: false,
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  const reqPath = req.path === '/' ? '/' : req.path;
  if (!PUBLIC_FILES.has(reqPath)) return next();

  const routeFiles = {
    '/': 'index.html',
    '/admin': 'admin.html',
    '/vendor': 'vendor.html',
    '/vendor-bookkeeping': 'vendor-bookkeeping.html'
  };
  const fileName = routeFiles[reqPath] || reqPath.slice(1);
  return res.sendFile(path.join(PUBLIC_DIR, fileName));
});

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  }
  next();
});

app.use((req, res) => {
  res.status(404).json({ ok: false, message: 'Endpoint tidak ditemukan.' });
});

app.use((error, req, res, next) => {
  console.error(error);
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ ok: false, message: 'Format JSON tidak valid.' });
  }
  res.status(500).json({ ok: false, message: 'Terjadi masalah server.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
