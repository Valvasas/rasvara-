const express = require('express');
const { z } = require('zod');
const { writeAuditLog } = require('../audit/audit.service');
const {
  BALANCE_TRANSACTION_TYPES,
  getVendorFinanceSnapshot,
  releaseVendorAvailableSettlement
} = require('../finance/vendorLedger.service');
const { assertOrderTransition, listAllowedTransitions } = require('../orders/orderTransitions');
const { getPrisma } = require('../../services/prisma');
const { fail, fieldErrorsFromZod, ok } = require('../../utils/http');

const router = express.Router();

const actionSchema = z.object({
  note: z.string().trim().max(240).optional().or(z.literal(''))
}).strict();

const financeQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().trim().min(1).optional(),
  currency: z.string().trim().length(3).default('IDR'),
  type: z.enum(BALANCE_TRANSACTION_TYPES).optional()
});

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

async function getPrismaVendor(prisma, legacyVendorId) {
  return prisma.vendor.findUnique({
    where: { legacyId: `json-vendor-${legacyVendorId}` }
  });
}

function serializeOrder(order) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    fulfillmentType: order.fulfillmentType,
    eventDate: order.eventDate,
    slot: order.slot,
    recipientName: order.recipientName,
    recipientPhone: order.recipientPhone,
    subtotal: order.subtotal,
    grandTotal: order.grandTotal,
    allowedTransitions: listAllowedTransitions(order.status),
    items: (order.items || []).map((item) => ({
      id: item.id,
      productSnapshot: item.productSnapshot,
      variantSnapshot: item.variantSnapshot,
      addonsSnapshot: item.addonsSnapshot,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      subtotal: item.subtotal
    }))
  };
}

async function findVendorOrder(prisma, legacyVendorId, orderId) {
  const vendor = await getPrismaVendor(prisma, legacyVendorId);
  if (!vendor) return { vendor: null, order: null };

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      vendorId: vendor.id
    },
    include: {
      items: true
    }
  });

  return { vendor, order };
}

function productionNote(status, vendorName) {
  const map = {
    BEING_PREPARED: `Order mulai diproduksi oleh ${vendorName}.`,
    READY: `Order siap dikirim/diambil dari ${vendorName}.`,
    COMPLETED: `Order diselesaikan oleh ${vendorName}.`
  };
  return map[status] || `Status order diperbarui oleh ${vendorName}.`;
}

function productionAction(status) {
  const map = {
    BEING_PREPARED: 'VENDOR_ORDER_PREPARED',
    READY: 'VENDOR_ORDER_READY',
    COMPLETED: 'VENDOR_ORDER_COMPLETED'
  };
  return map[status] || 'VENDOR_ORDER_STATUS_UPDATED';
}

async function advanceVendorOrder(req, res, nextStatus, note) {
  const prisma = prismaOrSetupError(res);
  if (!prisma || res.headersSent) return null;

  return prisma.$transaction(async (tx) => {
    const { vendor, order } = await findVendorOrder(tx, req.vendor.id, req.params.id);
    if (!vendor || !order) {
      const error = new Error('Order marketplace vendor tidak ditemukan.');
      error.status = 404;
      error.code = 'VENDOR_ORDER_NOT_FOUND';
      throw error;
    }
    if (order.paymentStatus !== 'PAID') {
      const error = new Error('Order belum dibayar, status produksi belum bisa diubah.');
      error.status = 409;
      error.code = 'ORDER_PAYMENT_NOT_PAID';
      throw error;
    }

    assertOrderTransition(order.status, nextStatus);
    const nextOrder = await tx.order.update({
      where: { id: order.id },
      data: { status: nextStatus },
      include: { items: true }
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: nextStatus,
        actorRole: 'VENDOR_OWNER',
        note: note || productionNote(nextStatus, req.vendor.storeName)
      }
    });

    let balanceRelease = null;
    if (nextStatus === 'COMPLETED') {
      balanceRelease = await releaseVendorAvailableSettlement(tx, nextOrder);
    }

    await writeAuditLog(tx, req, {
      action: productionAction(nextStatus),
      entityType: 'ORDER',
      entityId: order.id,
      metadata: {
        legacyVendorId: req.vendor.id,
        vendorId: vendor.id,
        balanceRelease
      },
      oldValue: { status: order.status },
      newValue: { status: nextStatus }
    });

    return { order: nextOrder, balanceRelease };
  });
}

router.get('/orders', async (req, res, next) => {
  try {
    const prisma = prismaOrSetupError(res);
    if (!prisma || res.headersSent) return;

    const vendor = await getPrismaVendor(prisma, req.vendor.id);
    if (!vendor) return ok(res, { orders: [] });

    const status = req.query.status ? String(req.query.status) : undefined;
    const orders = await prisma.order.findMany({
      where: {
        vendorId: vendor.id,
        ...(status ? { status } : {})
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return ok(res, { orders: orders.map(serializeOrder) });
  } catch (error) {
    next(error);
  }
});

router.get('/finance', async (req, res, next) => {
  try {
    const parsed = financeQuerySchema.safeParse(req.query || {});
    if (!parsed.success) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Filter finance tidak valid.', fieldErrorsFromZod(parsed.error));
    }

    const prisma = prismaOrSetupError(res);
    if (!prisma || res.headersSent) return;

    const vendor = await getPrismaVendor(prisma, req.vendor.id);
    if (!vendor) {
      return ok(res, {
        finance: {
          balance: { currency: parsed.data.currency, pending: 0, available: 0, held: 0 },
          totals: {
            grossCredits: 0,
            platformCommissions: 0,
            paymentFees: 0,
            refunds: 0,
            adjustmentCredits: 0,
            adjustmentDebits: 0,
            payouts: 0,
            byType: Object.fromEntries(BALANCE_TRANSACTION_TYPES.map((type) => [type, { amount: 0, count: 0 }]))
          },
          transactions: [],
          pagination: {
            limit: parsed.data.limit,
            count: 0,
            total: 0,
            hasMore: false,
            nextCursor: null
          }
        }
      });
    }

    const finance = await getVendorFinanceSnapshot(prisma, vendor.id, parsed.data);
    return ok(res, { finance });
  } catch (error) {
    if (error.code === 'P2025') {
      return fail(res, 400, 'INVALID_LEDGER_CURSOR', 'Cursor ledger tidak ditemukan.');
    }
    next(error);
  }
});

router.post('/orders/:id/confirm', async (req, res, next) => {
  try {
    const parsed = actionSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Catatan tidak valid.', fieldErrorsFromZod(parsed.error));
    }

    const prisma = prismaOrSetupError(res);
    if (!prisma || res.headersSent) return;

    const updated = await prisma.$transaction(async (tx) => {
      const { vendor, order } = await findVendorOrder(tx, req.vendor.id, req.params.id);
      if (!vendor || !order) {
        const error = new Error('Order marketplace vendor tidak ditemukan.');
        error.status = 404;
        error.code = 'VENDOR_ORDER_NOT_FOUND';
        throw error;
      }
      if (order.paymentStatus !== 'PAID') {
        const error = new Error('Order belum dibayar, vendor belum bisa konfirmasi.');
        error.status = 409;
        error.code = 'ORDER_PAYMENT_NOT_PAID';
        throw error;
      }

      assertOrderTransition(order.status, 'CONFIRMED');
      const nextOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: 'CONFIRMED' },
        include: { items: true }
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: 'CONFIRMED',
          actorRole: 'VENDOR_OWNER',
          note: parsed.data.note || `Order dikonfirmasi oleh ${req.vendor.storeName}.`
        }
      });
      await writeAuditLog(tx, req, {
        action: 'VENDOR_ORDER_CONFIRMED',
        entityType: 'ORDER',
        entityId: order.id,
        metadata: {
          legacyVendorId: req.vendor.id,
          vendorId: vendor.id
        },
        oldValue: { status: order.status },
        newValue: { status: 'CONFIRMED' }
      });
      return nextOrder;
    });

    return ok(res, { order: serializeOrder(updated) });
  } catch (error) {
    if (error.status) return fail(res, error.status, error.code || 'VENDOR_ORDER_ERROR', error.message);
    next(error);
  }
});

router.post('/orders/:id/reject', async (req, res, next) => {
  try {
    const parsed = actionSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Catatan tidak valid.', fieldErrorsFromZod(parsed.error));
    }

    const prisma = prismaOrSetupError(res);
    if (!prisma || res.headersSent) return;

    const updated = await prisma.$transaction(async (tx) => {
      const { vendor, order } = await findVendorOrder(tx, req.vendor.id, req.params.id);
      if (!vendor || !order) {
        const error = new Error('Order marketplace vendor tidak ditemukan.');
        error.status = 404;
        error.code = 'VENDOR_ORDER_NOT_FOUND';
        throw error;
      }
      assertOrderTransition(order.status, 'CANCELLED');
      const nextOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
        include: { items: true }
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: 'CANCELLED',
          actorRole: 'VENDOR_OWNER',
          note: parsed.data.note || `Order ditolak oleh ${req.vendor.storeName}. Refund perlu diproses manual/admin.`
        }
      });
      await writeAuditLog(tx, req, {
        action: 'VENDOR_ORDER_REJECTED',
        entityType: 'ORDER',
        entityId: order.id,
        metadata: {
          legacyVendorId: req.vendor.id,
          vendorId: vendor.id,
          refundRequired: order.paymentStatus === 'PAID'
        },
        oldValue: { status: order.status },
        newValue: { status: 'CANCELLED' }
      });
      return {
        order: nextOrder,
        refundRequired: order.paymentStatus === 'PAID'
      };
    });

    return ok(res, {
      order: serializeOrder(updated.order),
      refundRequired: updated.refundRequired
    });
  } catch (error) {
    if (error.status) return fail(res, error.status, error.code || 'VENDOR_ORDER_ERROR', error.message);
    next(error);
  }
});

router.post('/orders/:id/prepare', async (req, res, next) => {
  try {
    const parsed = actionSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Catatan tidak valid.', fieldErrorsFromZod(parsed.error));
    }
    const result = await advanceVendorOrder(req, res, 'BEING_PREPARED', parsed.data.note);
    if (!result) return;
    return ok(res, { order: serializeOrder(result.order) });
  } catch (error) {
    if (error.status) return fail(res, error.status, error.code || 'VENDOR_ORDER_ERROR', error.message);
    next(error);
  }
});

router.post('/orders/:id/ready', async (req, res, next) => {
  try {
    const parsed = actionSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Catatan tidak valid.', fieldErrorsFromZod(parsed.error));
    }
    const result = await advanceVendorOrder(req, res, 'READY', parsed.data.note);
    if (!result) return;
    return ok(res, { order: serializeOrder(result.order) });
  } catch (error) {
    if (error.status) return fail(res, error.status, error.code || 'VENDOR_ORDER_ERROR', error.message);
    next(error);
  }
});

router.post('/orders/:id/complete', async (req, res, next) => {
  try {
    const parsed = actionSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Catatan tidak valid.', fieldErrorsFromZod(parsed.error));
    }
    const result = await advanceVendorOrder(req, res, 'COMPLETED', parsed.data.note);
    if (!result) return;
    return ok(res, {
      order: serializeOrder(result.order),
      balanceRelease: result.balanceRelease
    });
  } catch (error) {
    if (error.status) return fail(res, error.status, error.code || 'VENDOR_ORDER_ERROR', error.message);
    next(error);
  }
});

module.exports = router;
