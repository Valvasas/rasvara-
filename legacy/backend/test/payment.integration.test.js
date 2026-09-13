const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('child_process');
const path = require('path');

const { getPrisma, disconnectPrisma } = require('../src/services/prisma');
const { signMockWebhook } = require('../src/modules/payments/mockPayment.service');

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

async function cleanupUserData(prisma, userId, orderId) {
  if (orderId) {
    const order = await prisma.order.findUnique({ where: { id: orderId } }).catch(() => null);
    const netAmount = Number(order?.feeSnapshot?.vendorNetAmount || 0);
    const payments = await prisma.payment.findMany({ where: { orderId }, select: { id: true } });
    const paymentIds = payments.map((payment) => payment.id);
    if (paymentIds.length) await prisma.paymentEvent.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await prisma.payment.deleteMany({ where: { orderId } });
    await prisma.vendorBalanceTransaction.deleteMany({ where: { orderId } });
    if (order?.vendorId && netAmount > 0) {
      await prisma.vendorBalance.updateMany({
        where: { vendorId: order.vendorId, currency: 'IDR' },
        data: { pending: { decrement: netAmount } }
      });
      await prisma.vendorBalance.deleteMany({
        where: {
          vendorId: order.vendorId,
          currency: 'IDR',
          pending: 0,
          available: 0,
          held: 0
        }
      });
    }
    await prisma.orderItem.deleteMany({ where: { orderId } });
    await prisma.orderStatusHistory.deleteMany({ where: { orderId } });
    await prisma.auditLog.deleteMany({ where: { entityType: 'ORDER', entityId: orderId } });
    await prisma.order.delete({ where: { id: orderId } }).catch(() => null);
  }
  if (userId) {
    const carts = await prisma.cart.findMany({ where: { userId }, select: { id: true } });
    const cartIds = carts.map((cart) => cart.id);
    if (cartIds.length) await prisma.cartItem.deleteMany({ where: { cartId: { in: cartIds } } });
    await prisma.cart.deleteMany({ where: { userId } });
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.address.deleteMany({ where: { userId } });
    await prisma.auditLog.deleteMany({ where: { actorId: userId } });
    await prisma.user.delete({ where: { id: userId } }).catch(() => null);
  }
}

test('mock payment webhook is signed, idempotent, and advances order lifecycle', { skip: !hasDatabase }, async () => {
  const port = 4200 + Math.floor(Math.random() * 500);
  const baseUrl = `http://localhost:${port}`;
  const tag = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const email = `payment-test-${tag}@example.com`;
  const secret = `mock-payment-secret-${tag}-at-least-32`;
  let userId;
  let orderId;
  let paymentId;

  const server = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      DATABASE_URL: process.env.DATABASE_URL,
      CUSTOMER_SESSION_SECRET: process.env.CUSTOMER_SESSION_SECRET || 'test-customer-session-secret-at-least-32-chars',
      MOCK_PAYMENT_WEBHOOK_SECRET: secret
    },
    stdio: 'ignore',
    windowsHide: true
  });

  try {
    await waitForReady(baseUrl);
    const prisma = getPrisma();
    const product = await prisma.product.findFirst({
      where: { status: 'ACTIVE', deletedAt: null, minOrder: 1 },
      orderBy: { createdAt: 'asc' }
    });
    assert.ok(product, 'butuh minimal satu produk aktif dengan minOrder 1');

    const register = await request(baseUrl, '/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Payment Test Customer',
        email,
        password: 'StrongPass123'
      }
    });
    assert.equal(register.response.status, 201);
    userId = register.body.user.id;
    const cookie = register.cookie;
    const csrf = register.body.csrfToken;

    await request(baseUrl, '/api/cart/items', {
      method: 'POST',
      headers: { 'x-csrf-token': csrf },
      body: { productId: product.id, quantity: 1 }
    }, cookie);

    const checkout = await request(baseUrl, '/api/checkout', {
      method: 'POST',
      headers: { 'x-csrf-token': csrf },
      body: {
        fulfillmentType: 'PICKUP',
        termsAccepted: true
      }
    }, cookie);
    assert.equal(checkout.response.status, 201);
    orderId = checkout.body.order.id;

    const createPayment = await request(baseUrl, '/api/payments', {
      method: 'POST',
      headers: { 'x-csrf-token': csrf },
      body: {
        orderId,
        method: 'MOCK_QRIS'
      }
    }, cookie);
    assert.equal(createPayment.response.status, 201);
    assert.equal(createPayment.body.payment.status, 'PENDING');
    assert.equal(createPayment.body.payment.amount, product.basePrice);
    paymentId = createPayment.body.payment.id;

    const event = {
      eventId: `evt-${tag}`,
      providerRef: createPayment.body.payment.providerRef,
      status: 'PAID',
      amount: createPayment.body.payment.amount
    };

    const unsigned = await request(baseUrl, '/api/payments/mock/webhook', {
      method: 'POST',
      body: event
    });
    assert.equal(unsigned.response.status, 401);
    assert.equal(unsigned.body.error.code, 'WEBHOOK_SIGNATURE_INVALID');

    const signature = signMockWebhook(event, secret);
    const paid = await request(baseUrl, '/api/payments/mock/webhook', {
      method: 'POST',
      headers: { 'x-mock-signature': signature },
      body: event
    });
    assert.equal(paid.response.status, 200);
    assert.equal(paid.body.duplicate, false);
    assert.equal(paid.body.payment.status, 'PAID');
    assert.equal(paid.body.order.status, 'WAITING_VENDOR_CONFIRMATION');
    assert.equal(paid.body.order.paymentStatus, 'PAID');

    const duplicate = await request(baseUrl, '/api/payments/mock/webhook', {
      method: 'POST',
      headers: { 'x-mock-signature': signature },
      body: event
    });
    assert.equal(duplicate.response.status, 200);
    assert.equal(duplicate.body.duplicate, true);

    const eventCount = await prisma.paymentEvent.count({
      where: { provider: 'MOCK_SANDBOX', eventId: event.eventId }
    });
    assert.equal(eventCount, 1);

    const histories = await prisma.orderStatusHistory.findMany({ where: { orderId } });
    assert.equal(histories.filter((history) => history.status === 'WAITING_VENDOR_CONFIRMATION').length, 1);

    const payAgain = await request(baseUrl, '/api/payments', {
      method: 'POST',
      headers: { 'x-csrf-token': csrf },
      body: {
        orderId,
        method: 'MOCK_QRIS'
      }
    }, cookie);
    assert.equal(payAgain.response.status, 409);
    assert.equal(payAgain.body.error.code, 'ORDER_NOT_PAYABLE');

    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    assert.equal(payment.status, 'PAID');
    assert.equal(order.status, 'WAITING_VENDOR_CONFIRMATION');
    assert.equal(order.paymentStatus, 'PAID');

    const cancel = await request(baseUrl, `/api/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: { 'x-csrf-token': csrf },
      body: { reason: 'Customer test cancellation after payment.' }
    }, cookie);
    assert.equal(cancel.response.status, 200);
    assert.equal(cancel.body.order.status, 'CANCELLED');
    assert.equal(cancel.body.refundCreated, true);
    assert.equal(cancel.body.refund.status, 'REQUESTED');
    assert.equal(cancel.body.refund.amount, createPayment.body.payment.amount);

    const cancelAgain = await request(baseUrl, `/api/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: { 'x-csrf-token': csrf },
      body: { reason: 'Repeat cancellation should fail.' }
    }, cookie);
    assert.equal(cancelAgain.response.status, 409);
    assert.equal(cancelAgain.body.error.code, 'INVALID_ORDER_STATUS_TRANSITION');
  } finally {
    server.kill();
    const prisma = getPrisma();
    await cleanupUserData(prisma, userId, orderId);
    await disconnectPrisma();
  }
});
