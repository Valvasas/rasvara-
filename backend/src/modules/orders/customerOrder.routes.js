const express = require('express');
const { z } = require('zod');
const { requireCustomer } = require('../auth/customerAuth.routes');
const { writeAuditLog } = require('../audit/audit.service');
const {
  createRefundRequestForOrder,
  holdVendorSettlementForDispute
} = require('../finance/vendorLedger.service');
const { assertOrderTransition } = require('./orderTransitions');
const { fail, fieldErrorsFromZod, ok } = require('../../utils/http');

const router = express.Router();

const cancelSchema = z.object({
  reason: z.string().trim().min(5).max(240).default('Customer requested cancellation.')
}).strict();

const disputeSchema = z.object({
  category: z.string().trim().min(3).max(80),
  description: z.string().trim().min(20).max(1000),
  requestedAmount: z.coerce.number().int().positive().optional()
}).strict();

function serializeRefund(refund) {
  if (!refund) return null;
  return {
    id: refund.id,
    orderId: refund.orderId,
    paymentId: refund.paymentId,
    amount: refund.amount,
    reason: refund.reason,
    status: refund.status,
    providerRef: refund.providerRef,
    metadata: refund.metadata,
    createdAt: refund.createdAt
  };
}

function serializeDispute(dispute) {
  return {
    id: dispute.id,
    orderId: dispute.orderId,
    customerId: dispute.customerId,
    vendorId: dispute.vendorId,
    category: dispute.category,
    description: dispute.description,
    requestedAmount: dispute.requestedAmount,
    status: dispute.status,
    vendorResponse: dispute.vendorResponse,
    adminDecision: dispute.adminDecision,
    createdAt: dispute.createdAt
  };
}

function serializeOrderLifecycle(order) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    grandTotal: order.grandTotal
  };
}

router.post('/:id/cancel', requireCustomer, async (req, res, next) => {
  try {
    const parsed = cancelSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Alasan pembatalan tidak valid.', fieldErrorsFromZod(parsed.error));
    }

    const result = await req.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          id: req.params.id,
          customerId: req.user.id
        }
      });
      if (!order) {
        const error = new Error('Order tidak ditemukan atau bukan milik akun ini.');
        error.status = 404;
        error.code = 'ORDER_NOT_FOUND';
        throw error;
      }

      assertOrderTransition(order.status, 'CANCELLED');

      let refundResult = null;
      if (order.paymentStatus === 'PAID') {
        refundResult = await createRefundRequestForOrder(tx, order, parsed.data.reason, order.grandTotal);
      }

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' }
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: 'CANCELLED',
          actorId: req.user.id,
          actorRole: req.user.role,
          note: parsed.data.reason
        }
      });
      await writeAuditLog(tx, req, {
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'CUSTOMER_ORDER_CANCELLED',
        entityType: 'ORDER',
        entityId: order.id,
        metadata: {
          refundRequested: Boolean(refundResult?.refund),
          refundId: refundResult?.refund?.id || null
        },
        oldValue: { status: order.status },
        newValue: { status: 'CANCELLED' }
      });

      return {
        order: updatedOrder,
        refund: refundResult?.refund || null,
        refundCreated: Boolean(refundResult?.created)
      };
    });

    return ok(res, {
      order: serializeOrderLifecycle(result.order),
      refund: serializeRefund(result.refund),
      refundCreated: result.refundCreated
    });
  } catch (error) {
    if (error.status) return fail(res, error.status, error.code || 'ORDER_CANCEL_ERROR', error.message);
    next(error);
  }
});

router.post('/:id/disputes', requireCustomer, async (req, res, next) => {
  try {
    const parsed = disputeSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Data dispute belum valid.', fieldErrorsFromZod(parsed.error));
    }

    const result = await req.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          id: req.params.id,
          customerId: req.user.id
        }
      });
      if (!order) {
        const error = new Error('Order tidak ditemukan atau bukan milik akun ini.');
        error.status = 404;
        error.code = 'ORDER_NOT_FOUND';
        throw error;
      }
      if (order.paymentStatus !== 'PAID') {
        const error = new Error('Dispute hanya bisa dibuka untuk order yang sudah dibayar.');
        error.status = 409;
        error.code = 'ORDER_PAYMENT_NOT_PAID';
        throw error;
      }

      const existing = await tx.dispute.findFirst({
        where: {
          orderId: order.id,
          status: {
            in: ['OPEN', 'WAITING_VENDOR_RESPONSE', 'WAITING_CUSTOMER_RESPONSE', 'UNDER_ADMIN_REVIEW']
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      if (existing) {
        return { order, dispute: existing, balanceHold: { created: false }, duplicate: true };
      }

      assertOrderTransition(order.status, 'DISPUTED');

      const requestedAmount = parsed.data.requestedAmount
        ? Math.min(parsed.data.requestedAmount, order.grandTotal)
        : null;
      const dispute = await tx.dispute.create({
        data: {
          orderId: order.id,
          customerId: req.user.id,
          vendorId: order.vendorId,
          category: parsed.data.category,
          description: parsed.data.description,
          requestedAmount,
          status: 'OPEN'
        }
      });

      const balanceHold = await holdVendorSettlementForDispute(tx, order);
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: 'DISPUTED' }
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: 'DISPUTED',
          actorId: req.user.id,
          actorRole: req.user.role,
          note: `Dispute dibuka customer: ${parsed.data.category}.`
        }
      });
      await writeAuditLog(tx, req, {
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'CUSTOMER_ORDER_DISPUTED',
        entityType: 'ORDER',
        entityId: order.id,
        metadata: {
          disputeId: dispute.id,
          balanceHold
        },
        oldValue: { status: order.status },
        newValue: { status: 'DISPUTED' }
      });

      return { order: updatedOrder, dispute, balanceHold, duplicate: false };
    });

    return ok(res, {
      order: serializeOrderLifecycle(result.order),
      dispute: serializeDispute(result.dispute),
      balanceHold: result.balanceHold,
      duplicate: result.duplicate
    }, result.duplicate ? 200 : 201);
  } catch (error) {
    if (error.status) return fail(res, error.status, error.code || 'ORDER_DISPUTE_ERROR', error.message);
    next(error);
  }
});

module.exports = router;
