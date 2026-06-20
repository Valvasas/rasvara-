const express = require('express');
const { z } = require('zod');
const { requireCustomer } = require('../auth/customerAuth.routes');
const { getPrisma } = require('../../services/prisma');
const { fail, fieldErrorsFromZod, ok } = require('../../utils/http');
const {
  createMockPayment,
  processMockWebhook,
  serializePayment,
  verifyMockWebhookSignature
} = require('./mockPayment.service');

const router = express.Router();

const createPaymentSchema = z.object({
  orderId: z.string().min(1),
  method: z.enum(['MOCK_QRIS', 'MOCK_VA', 'MOCK_EWALLET']).default('MOCK_QRIS')
}).strict();

const webhookSchema = z.object({
  eventId: z.string().min(8).max(120),
  providerRef: z.string().min(8).max(200),
  status: z.enum(['PAID', 'EXPIRED', 'FAILED']),
  amount: z.coerce.number().int().nonnegative()
}).strict();

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

router.post('/', requireCustomer, async (req, res, next) => {
  try {
    const parsed = createPaymentSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Data pembayaran belum valid.', fieldErrorsFromZod(parsed.error));
    }

    const order = await req.prisma.order.findFirst({
      where: {
        id: parsed.data.orderId,
        customerId: req.user.id
      }
    });
    if (!order) return fail(res, 404, 'ORDER_NOT_FOUND', 'Order tidak ditemukan atau bukan milik akun ini.');
    if (order.status !== 'WAITING_PAYMENT' || order.paymentStatus !== 'PENDING') {
      return fail(res, 409, 'ORDER_NOT_PAYABLE', 'Order ini tidak berada pada status menunggu pembayaran.');
    }

    const payment = await createMockPayment(req.prisma, order, parsed.data.method);
    return ok(res, { payment: serializePayment(payment) }, 201);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', requireCustomer, async (req, res, next) => {
  try {
    const payment = await req.prisma.payment.findFirst({
      where: {
        id: req.params.id,
        order: { customerId: req.user.id }
      }
    });
    if (!payment) return fail(res, 404, 'PAYMENT_NOT_FOUND', 'Payment tidak ditemukan.');
    return ok(res, { payment: serializePayment(payment) });
  } catch (error) {
    next(error);
  }
});

router.post('/mock/webhook', async (req, res, next) => {
  try {
    const parsed = webhookSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Payload webhook sandbox belum valid.', fieldErrorsFromZod(parsed.error));
    }

    const signature = req.get('x-mock-signature') || '';
    if (!verifyMockWebhookSignature(parsed.data, signature)) {
      return fail(res, 401, 'WEBHOOK_SIGNATURE_INVALID', 'Signature webhook sandbox tidak valid.');
    }

    const prisma = prismaOrSetupError(res);
    if (!prisma || res.headersSent) return;

    const result = await processMockWebhook(prisma, parsed.data);
    return ok(res, {
      duplicate: result.duplicate,
      payment: result.payment ? serializePayment(result.payment) : undefined,
      order: result.order ? {
        id: result.order.id,
        status: result.order.status,
        paymentStatus: result.order.paymentStatus
      } : undefined
    });
  } catch (error) {
    if (error.status) return fail(res, error.status, error.code || 'PAYMENT_WEBHOOK_ERROR', error.message);
    next(error);
  }
});

module.exports = router;
