const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('child_process');
const path = require('path');

const { getPrisma, disconnectPrisma } = require('../src/services/prisma');

const hasDatabase = Boolean(process.env.DATABASE_URL);

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

function getCookie(response) {
  const raw = response.headers.get('set-cookie');
  return raw ? raw.split(';')[0] : '';
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
  const body = text ? JSON.parse(text) : {};
  return { response, body, cookie: getCookie(response) };
}

async function ensureSecondVendorProduct(prisma, tag) {
  const vendor = await prisma.vendor.upsert({
    where: { legacyId: `test-vendor-${tag}` },
    update: { status: 'ACTIVE' },
    create: {
      legacyId: `test-vendor-${tag}`,
      storeName: `Vendor Test ${tag}`,
      slug: `vendor-test-${tag}`,
      status: 'ACTIVE'
    }
  });

  return prisma.product.upsert({
    where: { legacyId: `test-product-${tag}` },
    update: { status: 'ACTIVE' },
    create: {
      legacyId: `test-product-${tag}`,
      vendorId: vendor.id,
      name: `Produk Test ${tag}`,
      slug: `produk-test-${tag}`,
      category: 'test',
      basePrice: 12345,
      unit: 'box',
      minOrder: 1,
      status: 'ACTIVE'
    }
  });
}

test('customer auth and cart enforce server pricing, min order, and one vendor', { skip: !hasDatabase }, async () => {
  const port = 3200 + Math.floor(Math.random() * 500);
  const baseUrl = `http://localhost:${port}`;
  const tag = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const email = `cart-test-${tag}@example.com`;
  const server = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      DATABASE_URL: process.env.DATABASE_URL,
      CUSTOMER_SESSION_SECRET: process.env.CUSTOMER_SESSION_SECRET || 'test-customer-session-secret-at-least-32-chars'
    },
    stdio: 'ignore',
    windowsHide: true
  });

  try {
    await waitForReady(baseUrl);

    const prisma = getPrisma();
    const firstProduct = await prisma.product.findFirst({
      where: { status: 'ACTIVE', deletedAt: null, minOrder: 1 },
      include: { vendor: true },
      orderBy: { createdAt: 'asc' }
    });
    assert.ok(firstProduct, 'butuh minimal satu produk aktif dengan minOrder 1 dari migrasi legacy');

    const minOrderProduct = await prisma.product.findFirst({
      where: { status: 'ACTIVE', deletedAt: null, minOrder: { gt: 1 } },
      orderBy: { minOrder: 'desc' }
    });
    assert.ok(minOrderProduct, 'butuh minimal satu produk aktif dengan minOrder > 1 dari migrasi legacy');

    const secondProduct = await ensureSecondVendorProduct(prisma, tag);
    assert.notEqual(firstProduct.vendorId, secondProduct.vendorId);

    const register = await request(baseUrl, '/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Cart Test Customer',
        email,
        password: 'StrongPass123'
      }
    });
    assert.equal(register.response.status, 201);
    assert.ok(register.body.csrfToken);
    const cookie = register.cookie;
    const csrf = register.body.csrfToken;

    const minOrderRejected = await request(baseUrl, '/api/cart/items', {
      method: 'POST',
      headers: { 'x-csrf-token': csrf },
      body: {
        productId: minOrderProduct.id,
        quantity: 1,
        price: 1
      }
    }, cookie);
    assert.equal(minOrderRejected.response.status, 400);
    assert.equal(minOrderRejected.body.error.code, 'MINIMUM_ORDER_NOT_MET');

    const addFirst = await request(baseUrl, '/api/cart/items', {
      method: 'POST',
      headers: { 'x-csrf-token': csrf },
      body: {
        productId: firstProduct.id,
        quantity: 2,
        price: 1,
        vendorId: secondProduct.vendorId
      }
    }, cookie);
    assert.equal(addFirst.response.status, 200);
    assert.equal(addFirst.body.cart.items.length, 1);
    assert.equal(addFirst.body.cart.items[0].pricing.unitPrice, firstProduct.basePrice);
    assert.equal(addFirst.body.cart.summary.subtotal, firstProduct.basePrice * 2);

    const clearBeforeAlias = await request(baseUrl, '/api/cart', {
      method: 'DELETE',
      headers: { 'x-csrf-token': csrf }
    }, cookie);
    assert.equal(clearBeforeAlias.response.status, 200);

    const addByLegacyAlias = await request(baseUrl, '/api/cart/items', {
      method: 'POST',
      headers: { 'x-csrf-token': csrf },
      body: {
        productId: firstProduct.legacyId,
        quantity: 1
      }
    }, cookie);
    assert.equal(addByLegacyAlias.response.status, 200);
    assert.equal(addByLegacyAlias.body.cart.items[0].productId, firstProduct.id);

    const vendorConflict = await request(baseUrl, '/api/cart/items', {
      method: 'POST',
      headers: { 'x-csrf-token': csrf },
      body: {
        productId: secondProduct.id,
        quantity: 1
      }
    }, cookie);
    assert.equal(vendorConflict.response.status, 409);
    assert.equal(vendorConflict.body.error.code, 'CART_VENDOR_CONFLICT');

    const clear = await request(baseUrl, '/api/cart', {
      method: 'DELETE',
      headers: { 'x-csrf-token': csrf }
    }, cookie);
    assert.equal(clear.response.status, 200);
    assert.equal(clear.body.cart.items.length, 0);

    const addSecondAfterClear = await request(baseUrl, '/api/cart/items', {
      method: 'POST',
      headers: { 'x-csrf-token': csrf },
      body: {
        productId: secondProduct.id,
        quantity: 1
      }
    }, cookie);
    assert.equal(addSecondAfterClear.response.status, 200);
    assert.equal(addSecondAfterClear.body.cart.vendorId, secondProduct.vendorId);
  } finally {
    server.kill();
    const prisma = getPrisma();
    const testUser = await prisma.user.findUnique({ where: { email } }).catch(() => null);
    if (testUser) {
      const carts = await prisma.cart.findMany({ where: { userId: testUser.id }, select: { id: true } });
      const cartIds = carts.map((cart) => cart.id);
      if (cartIds.length) await prisma.cartItem.deleteMany({ where: { cartId: { in: cartIds } } });
      await prisma.cart.deleteMany({ where: { userId: testUser.id } });
      await prisma.session.deleteMany({ where: { userId: testUser.id } });
      await prisma.address.deleteMany({ where: { userId: testUser.id } });
      await prisma.auditLog.deleteMany({ where: { actorId: testUser.id } });
      await prisma.user.delete({ where: { id: testUser.id } });
    }
    await prisma.product.deleteMany({ where: { legacyId: `test-product-${tag}` } });
    await prisma.vendor.deleteMany({ where: { legacyId: `test-vendor-${tag}` } });
    await disconnectPrisma();
  }
});
