const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { spawn } = require('child_process');
const path = require('path');

const { getPrisma, disconnectPrisma } = require('../src/services/prisma');

const hasDatabase = Boolean(process.env.DATABASE_URL);
const LEGACY_VENDOR_ID = 1781849794865;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForReady(baseUrl) {
  const deadline = Date.now() + 15000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) return;
      lastError = new Error(`ready returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw lastError || new Error('Server tidak siap.');
}

function hmac(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function vendorCookie(secret, csrf) {
  const payload = {
    sub: 'vendor',
    vendorId: LEGACY_VENDOR_ID,
    csrf,
    exp: Date.now() + 1000 * 60 * 60
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `vendor_session=${encodeURIComponent(`${body}.${hmac(body, secret)}`)}`;
}

async function request(baseUrl, pathName, options = {}, cookie = '') {
  const headers = {
    ...(options.body ? { 'content-type': 'application/json' } : {}),
    ...(cookie ? { cookie } : {}),
    ...(options.headers || {})
  };
  const response = await fetch(`${baseUrl}${pathName}`, {
    ...options,
    headers,
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body
  });
  const text = await response.text();
  return { response, body: text ? JSON.parse(text) : {} };
}

test('vendor marketplace product management and production calendar are vendor-scoped', { skip: !hasDatabase }, async () => {
  const port = 5100 + Math.floor(Math.random() * 500);
  const baseUrl = `http://localhost:${port}`;
  const tag = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const adminSecret = `vendor-product-secret-${tag}-at-least-32`;
  const vendorCsrf = `vendor-csrf-${tag}`;
  const cookie = vendorCookie(adminSecret, vendorCsrf);
  let productId;
  let blockedDateId;
  let previousSaturday;

  const server = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      DATABASE_URL: process.env.DATABASE_URL,
      ADMIN_SESSION_SECRET: adminSecret,
      CUSTOMER_SESSION_SECRET: process.env.CUSTOMER_SESSION_SECRET || 'test-customer-session-secret-at-least-32-chars'
    },
    stdio: 'ignore',
    windowsHide: true
  });

  try {
    await waitForReady(baseUrl);
    const prisma = getPrisma();
    const vendor = await prisma.vendor.findUnique({ where: { legacyId: `json-vendor-${LEGACY_VENDOR_ID}` } });
    assert.ok(vendor, 'vendor legacy harus sudah termigrasi ke Prisma');
    previousSaturday = await prisma.vendorOperatingHour.findUnique({
      where: { vendorId_dayOfWeek: { vendorId: vendor.id, dayOfWeek: 6 } }
    });

    const create = await request(baseUrl, '/api/vendor/marketplace/products', {
      method: 'POST',
      headers: { 'x-csrf-token': vendorCsrf },
      body: {
        name: `Vendor Product ${tag}`,
        description: 'Produk test dari dashboard vendor.',
        category: 'snack-box',
        basePrice: 25000,
        costPrice: 12000,
        unit: 'box',
        minOrder: 20,
        status: 'DRAFT',
        halalStatus: 'HALAL',
        variants: [{ name: 'Paket Premium', price: 32000, isDefault: true }],
        addons: [{ name: 'Air mineral', price: 3000, status: 'ACTIVE' }],
        priceTiers: [{ minQty: 50, maxQty: null, unitPrice: 28000 }]
      }
    }, cookie);
    assert.equal(create.response.status, 201);
    assert.equal(create.body.product.status, 'DRAFT');
    assert.equal(create.body.product.variants.length, 1);
    assert.equal(create.body.product.addons.length, 1);
    assert.equal(create.body.product.priceTiers.length, 1);
    productId = create.body.product.id;

    const publishWithoutImage = await request(baseUrl, `/api/vendor/marketplace/products/${productId}/publish`, {
      method: 'POST',
      headers: { 'x-csrf-token': vendorCsrf },
      body: {}
    }, cookie);
    assert.equal(publishWithoutImage.response.status, 400);
    assert.equal(publishWithoutImage.body.error.code, 'PRODUCT_IMAGE_REQUIRED');

    const image = await request(baseUrl, `/api/vendor/marketplace/products/${productId}/images`, {
      method: 'POST',
      headers: { 'x-csrf-token': vendorCsrf },
      body: { imageUrl: '/uploads/test-product.jpg' }
    }, cookie);
    assert.equal(image.response.status, 200);
    assert.equal(image.body.product.imageUrl, '/uploads/test-product.jpg');

    const publish = await request(baseUrl, `/api/vendor/marketplace/products/${productId}/publish`, {
      method: 'POST',
      headers: { 'x-csrf-token': vendorCsrf },
      body: {}
    }, cookie);
    assert.equal(publish.response.status, 200);
    assert.equal(publish.body.product.status, 'ACTIVE');

    const update = await request(baseUrl, `/api/vendor/marketplace/products/${productId}`, {
      method: 'PATCH',
      headers: { 'x-csrf-token': vendorCsrf },
      body: {
        basePrice: 27000,
        variants: [{ name: 'Paket Hemat', price: 27000, isDefault: true }]
      }
    }, cookie);
    assert.equal(update.response.status, 200);
    assert.equal(update.body.product.basePrice, 27000);
    assert.equal(update.body.product.variants.length, 1);
    assert.equal(update.body.product.variants[0].name, 'Paket Hemat');

    const availability = await request(baseUrl, '/api/vendor/marketplace/availability/day', {
      method: 'PATCH',
      headers: { 'x-csrf-token': vendorCsrf },
      body: {
        productId,
        date: '2026-07-12',
        capacity: 120,
        reservedQty: 20
      }
    }, cookie);
    assert.equal(availability.response.status, 200);
    assert.equal(availability.body.availability.capacity, 120);

    const blocked = await request(baseUrl, '/api/vendor/marketplace/blocked-dates', {
      method: 'POST',
      headers: { 'x-csrf-token': vendorCsrf },
      body: {
        date: '2026-07-13',
        reason: `Libur test ${tag}`
      }
    }, cookie);
    assert.equal(blocked.response.status, 201);
    blockedDateId = blocked.body.blockedDate.id;

    const hours = await request(baseUrl, '/api/vendor/marketplace/operating-hours', {
      method: 'PATCH',
      headers: { 'x-csrf-token': vendorCsrf },
      body: {
        hours: [{ dayOfWeek: 6, opensAt: '08:00', closesAt: '16:00', isClosed: false }]
      }
    }, cookie);
    assert.equal(hours.response.status, 200);
    assert.equal(hours.body.hours[0].dayOfWeek, 6);

    const calendar = await request(baseUrl, '/api/vendor/marketplace/production-calendar?month=2026-07', {
      method: 'GET'
    }, cookie);
    assert.equal(calendar.response.status, 200);
    const availabilityDay = calendar.body.calendar.days.find((day) => day.date === '2026-07-12');
    assert.ok(availabilityDay);
    assert.equal(availabilityDay.productAvailability[0].remaining, 100);
    const blockedDay = calendar.body.calendar.days.find((day) => day.date === '2026-07-13');
    assert.ok(blockedDay.blocked);

    const archive = await request(baseUrl, `/api/vendor/marketplace/products/${productId}/archive`, {
      method: 'POST',
      headers: { 'x-csrf-token': vendorCsrf },
      body: {}
    }, cookie);
    assert.equal(archive.response.status, 200);
    assert.equal(archive.body.product.status, 'ARCHIVED');
  } finally {
    server.kill();
    const prisma = getPrisma();
    if (productId) {
      await prisma.productAvailability.deleteMany({ where: { productId } }).catch(() => null);
      await prisma.productVariant.deleteMany({ where: { productId } }).catch(() => null);
      await prisma.productAddon.deleteMany({ where: { productId } }).catch(() => null);
      await prisma.productPriceTier.deleteMany({ where: { productId } }).catch(() => null);
      await prisma.auditLog.deleteMany({ where: { entityType: 'PRODUCT', entityId: productId } }).catch(() => null);
      await prisma.product.delete({ where: { id: productId } }).catch(() => null);
    }
    if (blockedDateId) {
      await prisma.vendorBlockedDate.delete({ where: { id: blockedDateId } }).catch(() => null);
    }
    const vendor = await prisma.vendor.findUnique({ where: { legacyId: `json-vendor-${LEGACY_VENDOR_ID}` } }).catch(() => null);
    if (vendor) {
      if (previousSaturday) {
        await prisma.vendorOperatingHour.upsert({
          where: { vendorId_dayOfWeek: { vendorId: vendor.id, dayOfWeek: 6 } },
          update: {
            opensAt: previousSaturday.opensAt,
            closesAt: previousSaturday.closesAt,
            isClosed: previousSaturday.isClosed
          },
          create: {
            vendorId: vendor.id,
            dayOfWeek: 6,
            opensAt: previousSaturday.opensAt,
            closesAt: previousSaturday.closesAt,
            isClosed: previousSaturday.isClosed
          }
        }).catch(() => null);
      } else {
        await prisma.vendorOperatingHour.deleteMany({ where: { vendorId: vendor.id, dayOfWeek: 6 } }).catch(() => null);
      }
    }
    await disconnectPrisma();
  }
});
