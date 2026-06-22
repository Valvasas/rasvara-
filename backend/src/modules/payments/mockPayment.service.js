const crypto = require('crypto');
const { assertOrderTransition } = require('../orders/orderTransitions');
const { recordVendorPendingSettlement } = require('../finance/vendorLedger.service');
const { createNotification, notifyVendorMembers } = require('../notifications/notification.service');

const PROVIDER = 'MOCK_SANDBOX';
const DEFAULT_SECRET = 'dev-only-mock-payment-secret-change-me';

function getWebhookSecret() {
  return process.env.MOCK_PAYMENT_WEBHOOK_SECRET || DEFAULT_SECRET;
}

function mockSignaturePayload(event = {}) {
  return [
    event.eventId || '',
    event.providerRef || '',
    event.status || '',
    Number(event.amount || 0)
  ].join('.');
}

function signMockWebhook(event = {}, secret = getWebhookSecret()) {
  return crypto
    .createHmac('sha256', secret)
    .update(mockSignaturePayload(event))
    .digest('hex');
}

function verifyMockWebhookSignature(event = {}, signature = '') {
  const expected = signMockWebhook(event);
  const left = Buffer.from(String(signature));
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function createProviderRef(orderId) {
  return `mock_${orderId}_${crypto.randomBytes(6).toString('hex')}`;
}

function serializePayment(payment = {}) {
  return {
    id: payment.id,
    orderId: payment.orderId,
    provider: payment.provider,
    providerRef: payment.providerRef,
    method: payment.method,
    status: payment.status,
    amount: payment.amount,
    expiresAt: payment.expiresAt,
    paidAt: payment.paidAt,
    sandbox: payment.provider === PROVIDER,
    instructions: payment.provider === PROVIDER
      ? 'Sandbox only. Gunakan webhook mock bertanda tangan untuk mengubah status pembayaran.'
      : undefined
  };
}

async function createMockPayment(prisma, order, method = 'MOCK_QRIS') {
  const existing = await prisma.payment.findFirst({
    where: {
      orderId: order.id,
      provider: PROVIDER,
      status: 'PENDING'
    },
    orderBy: { createdAt: 'desc' }
  });
  if (existing) return existing;

  return prisma.payment.create({
    data: {
      orderId: order.id,
      provider: PROVIDER,
      providerRef: createProviderRef(order.id),
      method,
      status: 'PENDING',
      amount: order.grandTotal,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      metadata: {
        sandbox: true,
        notice: 'Mock payment tidak memproses uang sungguhan.'
      }
    }
  });
}

async function processMockWebhook(prisma, event) {
  return prisma.$transaction(async (tx) => {
    const existingEvent = await tx.paymentEvent.findUnique({
      where: {
        provider_eventId: {
          provider: PROVIDER,
          eventId: event.eventId
        }
      }
    });
    if (existingEvent) {
      return { duplicate: true, paymentEvent: existingEvent };
    }

    const payment = await tx.payment.findUnique({
      where: { providerRef: event.providerRef },
      include: { order: true }
    });
    if (!payment || payment.provider !== PROVIDER) {
      const error = new Error('Payment sandbox tidak ditemukan.');
      error.code = 'PAYMENT_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (Number(event.amount) !== payment.amount) {
      const error = new Error('Nominal webhook tidak sesuai invoice.');
      error.code = 'PAYMENT_AMOUNT_MISMATCH';
      error.status = 400;
      throw error;
    }

    const paymentEvent = await tx.paymentEvent.create({
      data: {
        paymentId: payment.id,
        provider: PROVIDER,
        eventId: event.eventId,
        eventType: event.status,
        payload: event,
        processedAt: new Date()
      }
    });

    let updatedPayment = payment;
    let updatedOrder = payment.order;
    if (payment.status === 'PENDING') {
      if (event.status === 'PAID') {
        assertOrderTransition(payment.order.status, 'WAITING_VENDOR_CONFIRMATION');
        updatedPayment = await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'PAID', paidAt: new Date() }
        });
        updatedOrder = await tx.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: 'PAID',
            status: 'WAITING_VENDOR_CONFIRMATION'
          }
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: payment.orderId,
            status: 'WAITING_VENDOR_CONFIRMATION',
            note: 'Pembayaran sandbox terverifikasi via webhook.',
            actorRole: 'ADMIN'
          }
        });
        await recordVendorPendingSettlement(tx, updatedOrder);
        if (payment.order.customerId) {
          await createNotification(tx, {
            userId: payment.order.customerId,
            type: 'PAYMENT_PAID',
            title: 'Pembayaran sandbox berhasil',
            body: `Pembayaran order ${payment.order.orderNumber} terverifikasi. Menunggu konfirmasi vendor.`,
            entityType: 'ORDER',
            entityId: payment.orderId
          });
        }
        await notifyVendorMembers(tx, payment.order.vendorId, {
          type: 'PAYMENT_PAID',
          title: 'Order sudah dibayar',
          body: `Order ${payment.order.orderNumber} sudah dibayar dan menunggu konfirmasi.`,
          entityType: 'ORDER',
          entityId: payment.orderId
        });
      } else if (event.status === 'EXPIRED' || event.status === 'FAILED') {
        updatedPayment = await tx.payment.update({
          where: { id: payment.id },
          data: { status: event.status }
        });
        updatedOrder = await tx.order.update({
          where: { id: payment.orderId },
          data: { paymentStatus: event.status }
        });
        if (payment.order.customerId) {
          await createNotification(tx, {
            userId: payment.order.customerId,
            type: event.status === 'EXPIRED' ? 'PAYMENT_EXPIRED' : 'ORDER_STATUS_CHANGED',
            title: event.status === 'EXPIRED' ? 'Pembayaran kedaluwarsa' : 'Pembayaran gagal',
            body: `Pembayaran order ${payment.order.orderNumber} berstatus ${event.status}.`,
            entityType: 'ORDER',
            entityId: payment.orderId
          });
        }
      }
    }

    return {
      duplicate: false,
      paymentEvent,
      payment: updatedPayment,
      order: updatedOrder
    };
  });
}

module.exports = {
  PROVIDER,
  createMockPayment,
  processMockWebhook,
  serializePayment,
  signMockWebhook,
  verifyMockWebhookSignature
};
