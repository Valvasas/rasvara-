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

test('checkout creates immutable order snapshot and clears active cart', { skip: !hasDatabase }, async () => {
  const port = 3700 + Math.floor(Math.random() * 500);
  const baseUrl = `http://localhost:${port}`;
  const tag = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const email = `checkout-test-${tag}@example.com`;
  let testUserId;
  let addressId;
  let orderId;
  let productId;
  let originalProduct;

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
    originalProduct = await prisma.product.findFirst({
      where: { status: 'ACTIVE', deletedAt: null, minOrder: 1 },
      orderBy: { createdAt: 'asc' }
    });
    assert.ok(originalProduct, 'butuh minimal satu produk aktif dengan minOrder 1 dari migrasi legacy');
    productId = originalProduct.id;

    const register = await request(baseUrl, '/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Checkout Test Customer',
        email,
        password: 'StrongPass123'
      }
    });
    assert.equal(register.response.status, 201);
    testUserId = register.body.user.id;
    const cookie = register.cookie;
    const csrf = register.body.csrfToken;

    const emptyCheckout = await request(baseUrl, '/api/checkout', {
      method: 'POST',
      headers: { 'x-csrf-token': csrf },
      body: {
        fulfillmentType: 'PICKUP',
        termsAccepted: true
      }
    }, cookie);
    assert.equal(emptyCheckout.response.status, 400);
    assert.equal(emptyCheckout.body.error.code, 'CART_EMPTY');

    const address = await request(baseUrl, '/api/customers/addresses', {
      method: 'POST',
      headers: { 'x-csrf-token': csrf },
      body: {
        label: 'Rumah',
        recipientName: 'Checkout Receiver',
        phone: '081234567890',
        addressLine: 'Jl. Checkout Snapshot No. 1',
        city: 'Indramayu',
        province: 'Jawa Barat',
        isDefault: true
      }
    }, cookie);
    assert.equal(address.response.status, 201);
    addressId = address.body.address.id;

    const addItem = await request(baseUrl, '/api/cart/items', {
      method: 'POST',
      headers: { 'x-csrf-token': csrf },
      body: {
        productId: originalProduct.id,
        quantity: 2,
        price: 1,
        grandTotal: 1
      }
    }, cookie);
    assert.equal(addItem.response.status, 200);

    const eventDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const checkout = await request(baseUrl, '/api/checkout', {
      method: 'POST',
      headers: { 'x-csrf-token': csrf },
      body: {
        addressId,
        eventDate,
        slot: '10:00-12:00',
        fulfillmentType: 'DELIVERY',
        recipientName: 'Checkout Receiver',
        recipientPhone: '081234567890',
        notes: 'Abaikan total dari frontend.',
        grandTotal: 1,
        termsAccepted: true
      }
    }, cookie);
    assert.equal(checkout.response.status, 201);
    assert.equal(checkout.body.order.status, 'WAITING_PAYMENT');
    assert.equal(checkout.body.order.paymentStatus, 'PENDING');
    assert.equal(checkout.body.order.grandTotal, originalProduct.basePrice * 2);
    assert.equal(checkout.body.order.items[0].productSnapshot.productName, originalProduct.name);
    assert.equal(checkout.body.order.items[0].unitPrice, originalProduct.basePrice);
    orderId = checkout.body.order.id;

    const activeCart = await request(baseUrl, '/api/cart', { method: 'GET' }, cookie);
    assert.equal(activeCart.response.status, 200);
    assert.equal(activeCart.body.cart.items.length, 0);

    await prisma.product.update({
      where: { id: originalProduct.id },
      data: {
        name: `Changed Product ${tag}`,
        basePrice: originalProduct.basePrice + 9999
      }
    });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    });
    assert.equal(order.grandTotal, originalProduct.basePrice * 2);
    assert.equal(order.items[0].productSnapshot.productName, originalProduct.name);
    assert.equal(order.items[0].unitPrice, originalProduct.basePrice);

    const secondCheckout = await request(baseUrl, '/api/checkout', {
      method: 'POST',
      headers: { 'x-csrf-token': csrf },
      body: {
        fulfillmentType: 'PICKUP',
        termsAccepted: true
      }
    }, cookie);
    assert.equal(secondCheckout.response.status, 400);
    assert.equal(secondCheckout.body.error.code, 'CART_EMPTY');
  } finally {
    server.kill();
    const prisma = getPrisma();
    if (originalProduct?.id) {
      await prisma.product.update({
        where: { id: originalProduct.id },
        data: {
          name: originalProduct.name,
          basePrice: originalProduct.basePrice
        }
      }).catch(() => null);
    }
    if (orderId) {
      await prisma.orderItem.deleteMany({ where: { orderId } });
      await prisma.orderStatusHistory.deleteMany({ where: { orderId } });
      await prisma.auditLog.deleteMany({ where: { entityType: 'ORDER', entityId: orderId } });
      await prisma.order.delete({ where: { id: orderId } }).catch(() => null);
    }
    if (testUserId) {
      const carts = await prisma.cart.findMany({ where: { userId: testUserId }, select: { id: true } });
      const cartIds = carts.map((cart) => cart.id);
      if (cartIds.length) await prisma.cartItem.deleteMany({ where: { cartId: { in: cartIds } } });
      await prisma.cart.deleteMany({ where: { userId: testUserId } });
      await prisma.session.deleteMany({ where: { userId: testUserId } });
      await prisma.address.deleteMany({ where: { userId: testUserId } });
      await prisma.auditLog.deleteMany({ where: { actorId: testUserId } });
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => null);
    }
    await disconnectPrisma();
  }
});
