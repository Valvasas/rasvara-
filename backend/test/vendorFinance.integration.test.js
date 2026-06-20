const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { spawn } = require('child_process');
const path = require('path');

const { getPrisma, disconnectPrisma } = require('../src/services/prisma');
const { signMockWebhook } = require('../src/modules/payments/mockPayment.service');

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

async function cleanup(prisma, context) {
  if (context.orderId) {
    const order = await prisma.order.findUnique({ where: { id: context.orderId } }).catch(() => null);
    const netAmount = Number(order?.feeSnapshot?.vendorNetAmount || 0);
    const releaseTx = await prisma.vendorBalanceTransaction.findFirst({
      where: {
        orderId: context.orderId,
        type: 'ADJUSTMENT_CREDIT'
      }
    });
    const holdTx = await prisma.vendorBalanceTransaction.findFirst({
      where: {
        orderId: context.orderId,
        type: 'ADJUSTMENT_DEBIT'
      }
    });
    const payments = await prisma.payment.findMany({ where: { orderId: context.orderId }, select: { id: true } });
    const paymentIds = payments.map((payment) => payment.id);
    const disputes = await prisma.dispute.findMany({ where: { orderId: context.orderId }, select: { id: true } });
    const disputeIds = disputes.map((dispute) => dispute.id);
    if (disputeIds.length) await prisma.disputeEvidence.deleteMany({ where: { disputeId: { in: disputeIds } } });
    await prisma.dispute.deleteMany({ where: { orderId: context.orderId } });
    await prisma.refund.deleteMany({ where: { orderId: context.orderId } });
    if (paymentIds.length) await prisma.paymentEvent.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await prisma.payment.deleteMany({ where: { orderId: context.orderId } });
    await prisma.vendorBalanceTransaction.deleteMany({ where: { orderId: context.orderId } });
    if (context.vendorId && netAmount > 0) {
      await prisma.vendorBalance.updateMany({
        where: { vendorId: context.vendorId, currency: 'IDR' },
        data: holdTx
          ? { held: { decrement: netAmount } }
          : releaseTx
          ? { available: { decrement: netAmount } }
          : { pending: { decrement: netAmount } }
      });
      await prisma.vendorBalance.deleteMany({
        where: {
          vendorId: context.vendorId,
          currency: 'IDR',
          pending: 0,
          available: 0,
          held: 0
        }
      });
    }
    await prisma.orderItem.deleteMany({ where: { orderId: context.orderId } });
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: context.orderId } });
    await prisma.auditLog.deleteMany({ where: { entityType: 'ORDER', entityId: context.orderId } });
    await prisma.order.delete({ where: { id: context.orderId } }).catch(() => null);
  }

  if (context.userId) {
    const carts = await prisma.cart.findMany({ where: { userId: context.userId }, select: { id: true } });
    const cartIds = carts.map((cart) => cart.id);
    if (cartIds.length) await prisma.cartItem.deleteMany({ where: { cartId: { in: cartIds } } });
    await prisma.cart.deleteMany({ where: { userId: context.userId } });
    await prisma.session.deleteMany({ where: { userId: context.userId } });
    await prisma.address.deleteMany({ where: { userId: context.userId } });
    await prisma.auditLog.deleteMany({ where: { actorId: context.userId } });
    await prisma.user.delete({ where: { id: context.userId } }).catch(() => null);
  }

  if (context.productId) {
    await prisma.product.delete({ where: { id: context.productId } }).catch(() => null);
  }
}

test('paid payment creates idempotent vendor ledger and vendor can confirm owned order', { skip: !hasDatabase }, async () => {
  const port = 4700 + Math.floor(Math.random() * 500);
  const baseUrl = `http://localhost:${port}`;
  const tag = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const email = `vendor-finance-${tag}@example.com`;
  const adminSecret = `vendor-session-secret-${tag}-at-least-32`;
  const mockSecret = `mock-payment-secret-${tag}-at-least-32`;
  const vendorCsrf = `vendor-csrf-${tag}`;
  const context = {};

  const server = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      DATABASE_URL: process.env.DATABASE_URL,
      ADMIN_SESSION_SECRET: adminSecret,
      CUSTOMER_SESSION_SECRET: process.env.CUSTOMER_SESSION_SECRET || 'test-customer-session-secret-at-least-32-chars',
      MOCK_PAYMENT_WEBHOOK_SECRET: mockSecret
    },
    stdio: 'ignore',
    windowsHide: true
  });

  try {
    await waitForReady(baseUrl);
    const prisma = getPrisma();
    const vendor = await prisma.vendor.findUnique({
      where: { legacyId: `json-vendor-${LEGACY_VENDOR_ID}` }
    });
    assert.ok(vendor, 'vendor legacy harus sudah termigrasi ke Prisma');
    context.vendorId = vendor.id;

    const product = await prisma.product.create({
      data: {
        legacyId: `vendor-finance-product-${tag}`,
        vendorId: vendor.id,
        name: `Vendor Finance Product ${tag}`,
        slug: `vendor-finance-product-${tag}`,
        category: 'test',
        basePrice: 100000,
        unit: 'box',
        minOrder: 1,
        status: 'ACTIVE'
      }
    });
    context.productId = product.id;

    const register = await request(baseUrl, '/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Vendor Finance Customer',
        email,
        password: 'StrongPass123'
      }
    });
    assert.equal(register.response.status, 201);
    context.userId = register.body.user.id;
    const customerCookie = register.cookie;
    const customerCsrf = register.body.csrfToken;

    await request(baseUrl, '/api/cart/items', {
      method: 'POST',
      headers: { 'x-csrf-token': customerCsrf },
      body: { productId: product.id, quantity: 1 }
    }, customerCookie);

    const checkout = await request(baseUrl, '/api/checkout', {
      method: 'POST',
      headers: { 'x-csrf-token': customerCsrf },
      body: {
        fulfillmentType: 'PICKUP',
        termsAccepted: true
      }
    }, customerCookie);
    assert.equal(checkout.response.status, 201);
    context.orderId = checkout.body.order.id;
    assert.equal(checkout.body.order.feeSnapshot.vendorNetAmount, 95000);

    const payment = await request(baseUrl, '/api/payments', {
      method: 'POST',
      headers: { 'x-csrf-token': customerCsrf },
      body: {
        orderId: context.orderId,
        method: 'MOCK_QRIS'
      }
    }, customerCookie);
    assert.equal(payment.response.status, 201);

    const event = {
      eventId: `evt-finance-${tag}`,
      providerRef: payment.body.payment.providerRef,
      status: 'PAID',
      amount: payment.body.payment.amount
    };
    const signature = signMockWebhook(event, mockSecret);
    const paid = await request(baseUrl, '/api/payments/mock/webhook', {
      method: 'POST',
      headers: { 'x-mock-signature': signature },
      body: event
    });
    assert.equal(paid.response.status, 200);
    assert.equal(paid.body.order.status, 'WAITING_VENDOR_CONFIRMATION');

    const duplicate = await request(baseUrl, '/api/payments/mock/webhook', {
      method: 'POST',
      headers: { 'x-mock-signature': signature },
      body: event
    });
    assert.equal(duplicate.response.status, 200);
    assert.equal(duplicate.body.duplicate, true);

    const balance = await prisma.vendorBalance.findUnique({
      where: { vendorId_currency: { vendorId: vendor.id, currency: 'IDR' } }
    });
    assert.equal(balance.pending, 95000);

    const ledger = await prisma.vendorBalanceTransaction.findMany({
      where: { orderId: context.orderId },
      orderBy: { type: 'asc' }
    });
    assert.equal(ledger.length, 2);
    assert.equal(ledger.find((entry) => entry.type === 'ORDER_CREDIT').amount, 100000);
    assert.equal(ledger.find((entry) => entry.type === 'COMMISSION_DEBIT').amount, 5000);

    const vendorSessionCookie = vendorCookie(adminSecret, vendorCsrf);
    const list = await request(baseUrl, '/api/vendor/marketplace/orders', {
      method: 'GET'
    }, vendorSessionCookie);
    assert.equal(list.response.status, 200);
    assert.ok(list.body.orders.some((order) => order.id === context.orderId));

    const financePending = await request(baseUrl, '/api/vendor/marketplace/finance?limit=5', {
      method: 'GET'
    }, vendorSessionCookie);
    assert.equal(financePending.response.status, 200);
    assert.equal(financePending.body.finance.balance.pending, 95000);
    assert.equal(financePending.body.finance.balance.available, 0);
    assert.equal(financePending.body.finance.totals.grossCredits, 100000);
    assert.equal(financePending.body.finance.totals.platformCommissions, 5000);
    assert.equal(financePending.body.finance.pagination.total, 2);
    assert.ok(financePending.body.finance.transactions.some((entry) => entry.type === 'ORDER_CREDIT'));

    const financeCommissionOnly = await request(
      baseUrl,
      '/api/vendor/marketplace/finance?type=COMMISSION_DEBIT&limit=1',
      { method: 'GET' },
      vendorSessionCookie
    );
    assert.equal(financeCommissionOnly.response.status, 200);
    assert.equal(financeCommissionOnly.body.finance.transactions.length, 1);
    assert.equal(financeCommissionOnly.body.finance.transactions[0].type, 'COMMISSION_DEBIT');
    assert.equal(financeCommissionOnly.body.finance.pagination.total, 1);

    const confirm = await request(baseUrl, `/api/vendor/marketplace/orders/${context.orderId}/confirm`, {
      method: 'POST',
      headers: { 'x-csrf-token': vendorCsrf },
      body: { note: 'Siap diproses.' }
    }, vendorSessionCookie);
    assert.equal(confirm.response.status, 200);
    assert.equal(confirm.body.order.status, 'CONFIRMED');

    const confirmAgain = await request(baseUrl, `/api/vendor/marketplace/orders/${context.orderId}/confirm`, {
      method: 'POST',
      headers: { 'x-csrf-token': vendorCsrf },
      body: { note: 'double confirm' }
    }, vendorSessionCookie);
    assert.equal(confirmAgain.response.status, 409);
    assert.equal(confirmAgain.body.error.code, 'INVALID_ORDER_STATUS_TRANSITION');

    const completeTooEarly = await request(baseUrl, `/api/vendor/marketplace/orders/${context.orderId}/complete`, {
      method: 'POST',
      headers: { 'x-csrf-token': vendorCsrf },
      body: { note: 'skip production' }
    }, vendorSessionCookie);
    assert.equal(completeTooEarly.response.status, 409);
    assert.equal(completeTooEarly.body.error.code, 'INVALID_ORDER_STATUS_TRANSITION');

    const prepare = await request(baseUrl, `/api/vendor/marketplace/orders/${context.orderId}/prepare`, {
      method: 'POST',
      headers: { 'x-csrf-token': vendorCsrf },
      body: { note: 'Mulai produksi.' }
    }, vendorSessionCookie);
    assert.equal(prepare.response.status, 200);
    assert.equal(prepare.body.order.status, 'BEING_PREPARED');

    const ready = await request(baseUrl, `/api/vendor/marketplace/orders/${context.orderId}/ready`, {
      method: 'POST',
      headers: { 'x-csrf-token': vendorCsrf },
      body: { note: 'Sudah siap.' }
    }, vendorSessionCookie);
    assert.equal(ready.response.status, 200);
    assert.equal(ready.body.order.status, 'READY');

    const complete = await request(baseUrl, `/api/vendor/marketplace/orders/${context.orderId}/complete`, {
      method: 'POST',
      headers: { 'x-csrf-token': vendorCsrf },
      body: { note: 'Order selesai.' }
    }, vendorSessionCookie);
    assert.equal(complete.response.status, 200);
    assert.equal(complete.body.order.status, 'COMPLETED');
    assert.equal(complete.body.balanceRelease.created, true);
    assert.equal(complete.body.balanceRelease.netAmount, 95000);

    const balanceAfterComplete = await prisma.vendorBalance.findUnique({
      where: { vendorId_currency: { vendorId: vendor.id, currency: 'IDR' } }
    });
    assert.equal(balanceAfterComplete.pending, 0);
    assert.equal(balanceAfterComplete.available, 95000);

    const financeReleased = await request(baseUrl, '/api/vendor/marketplace/finance?limit=5', {
      method: 'GET'
    }, vendorSessionCookie);
    assert.equal(financeReleased.response.status, 200);
    assert.equal(financeReleased.body.finance.balance.pending, 0);
    assert.equal(financeReleased.body.finance.balance.available, 95000);
    assert.equal(financeReleased.body.finance.totals.adjustmentCredits, 95000);
    assert.equal(financeReleased.body.finance.pagination.total, 3);

    const dispute = await request(baseUrl, `/api/orders/${context.orderId}/disputes`, {
      method: 'POST',
      headers: { 'x-csrf-token': customerCsrf },
      body: {
        category: 'late_delivery',
        description: 'Order sudah selesai tetapi test membuka dispute untuk memastikan saldo vendor ditahan.',
        requestedAmount: 50000
      }
    }, customerCookie);
    assert.equal(dispute.response.status, 201);
    assert.equal(dispute.body.order.status, 'DISPUTED');
    assert.equal(dispute.body.dispute.status, 'OPEN');
    assert.equal(dispute.body.balanceHold.created, true);
    assert.equal(dispute.body.balanceHold.netAmount, 95000);

    const duplicateDispute = await request(baseUrl, `/api/orders/${context.orderId}/disputes`, {
      method: 'POST',
      headers: { 'x-csrf-token': customerCsrf },
      body: {
        category: 'late_delivery',
        description: 'Duplicate dispute should return the existing open dispute instead of creating another one.'
      }
    }, customerCookie);
    assert.equal(duplicateDispute.response.status, 200);
    assert.equal(duplicateDispute.body.duplicate, true);

    const financeHeld = await request(baseUrl, '/api/vendor/marketplace/finance?limit=5', {
      method: 'GET'
    }, vendorSessionCookie);
    assert.equal(financeHeld.response.status, 200);
    assert.equal(financeHeld.body.finance.balance.available, 0);
    assert.equal(financeHeld.body.finance.balance.held, 95000);
    assert.equal(financeHeld.body.finance.totals.adjustmentDebits, 95000);
    assert.equal(financeHeld.body.finance.pagination.total, 4);

    const completeAgain = await request(baseUrl, `/api/vendor/marketplace/orders/${context.orderId}/complete`, {
      method: 'POST',
      headers: { 'x-csrf-token': vendorCsrf },
      body: { note: 'double complete' }
    }, vendorSessionCookie);
    assert.equal(completeAgain.response.status, 409);
    assert.equal(completeAgain.body.error.code, 'INVALID_ORDER_STATUS_TRANSITION');

    const historyCount = await prisma.orderStatusHistory.count({
      where: { orderId: context.orderId, status: 'CONFIRMED' }
    });
    assert.equal(historyCount, 1);

    const releaseLedger = await prisma.vendorBalanceTransaction.findMany({
      where: {
        orderId: context.orderId,
        type: 'ADJUSTMENT_CREDIT'
      }
    });
    assert.equal(releaseLedger.length, 1);
    assert.equal(releaseLedger[0].amount, 95000);
  } finally {
    server.kill();
    const prisma = getPrisma();
    await cleanup(prisma, context);
    await disconnectPrisma();
  }
});
