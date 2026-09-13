const express = require('express');
const { z } = require('zod');
const { requireCustomer } = require('../auth/customerAuth.routes');
const { writeAuditLog } = require('../audit/audit.service');
const { createNotification, notifyVendorMembers } = require('../notifications/notification.service');
const { calculateProductPrice, summarizePricedItems } = require('../pricing/pricing.service');
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

function parseAddonIds(addons) {
  if (!addons) return [];
  if (Array.isArray(addons)) return addons.map((addon) => addon.id).filter(Boolean);
  if (Array.isArray(addons.selected)) return addons.selected.map((addon) => addon.id).filter(Boolean);
  return [];
}

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

function serializeMarketplaceOrder(order) {
  const payments = order.payments || [];
  const latestPayment = payments[0] || null;
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
    notes: order.notes,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    serviceFee: order.serviceFee,
    discountAmount: order.discountAmount,
    grandTotal: order.grandTotal,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    vendor: order.vendor ? {
      id: order.vendor.id,
      storeName: order.vendor.storeName,
      slug: order.vendor.slug
    } : null,
    latestPayment: latestPayment ? {
      id: latestPayment.id,
      provider: latestPayment.provider,
      method: latestPayment.method,
      status: latestPayment.status,
      amount: latestPayment.amount,
      expiresAt: latestPayment.expiresAt,
      paidAt: latestPayment.paidAt,
      sandbox: latestPayment.provider === 'MOCK_SANDBOX'
    } : null,
    items: (order.items || []).map((item) => ({
      id: item.id,
      productId: item.productId,
      productSnapshot: item.productSnapshot,
      variantSnapshot: item.variantSnapshot,
      addonsSnapshot: item.addonsSnapshot,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      subtotal: item.subtotal
    })),
    histories: (order.histories || []).map((history) => ({
      id: history.id,
      status: history.status,
      actorRole: history.actorRole,
      note: history.note,
      createdAt: history.createdAt
    }))
  };
}

function serializeInvoice(order) {
  const issuedAt = order.createdAt || new Date();
  return {
    invoiceNumber: `INV-${order.orderNumber}`,
    orderId: order.id,
    orderNumber: order.orderNumber,
    issuedAt,
    paymentStatus: order.paymentStatus,
    customer: order.customer ? {
      id: order.customer.id,
      name: order.customer.name,
      email: order.customer.email,
      phone: order.customer.phone
    } : null,
    recipient: {
      name: order.recipientName,
      phone: order.recipientPhone,
      address: order.address ? {
        label: order.address.label,
        recipientName: order.address.recipientName,
        phone: order.address.phone,
        addressLine: order.address.addressLine,
        city: order.address.city,
        province: order.address.province,
        postalCode: order.address.postalCode,
        notes: order.address.notes
      } : null
    },
    vendor: order.vendor ? {
      id: order.vendor.id,
      storeName: order.vendor.storeName,
      email: order.vendor.email,
      whatsapp: order.vendor.whatsapp,
      address: order.vendor.address
    } : null,
    items: (order.items || []).map((item) => ({
      id: item.id,
      productSnapshot: item.productSnapshot,
      variantSnapshot: item.variantSnapshot,
      addonsSnapshot: item.addonsSnapshot,
      appliedTier: item.appliedTier,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      subtotal: item.subtotal
    })),
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    serviceFee: order.serviceFee,
    discountAmount: order.discountAmount,
    grandTotal: order.grandTotal,
    feeSnapshot: order.feeSnapshot,
    notes: order.notes
  };
}

const marketplaceOrderInclude = {
  vendor: true,
  items: true,
  histories: {
    orderBy: { createdAt: 'asc' }
  },
  payments: {
    orderBy: { createdAt: 'desc' },
    take: 1
  }
};

router.get('/marketplace', requireCustomer, async (req, res, next) => {
  try {
    const orders = await req.prisma.order.findMany({
      where: { customerId: req.user.id },
      include: marketplaceOrderInclude,
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    return ok(res, { orders: orders.map(serializeMarketplaceOrder) });
  } catch (error) {
    next(error);
  }
});

router.get('/marketplace/:id', requireCustomer, async (req, res, next) => {
  try {
    const order = await req.prisma.order.findFirst({
      where: {
        id: req.params.id,
        customerId: req.user.id
      },
      include: marketplaceOrderInclude
    });
    if (!order) return fail(res, 404, 'ORDER_NOT_FOUND', 'Order marketplace tidak ditemukan.');
    return ok(res, { order: serializeMarketplaceOrder(order) });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/invoice', requireCustomer, async (req, res, next) => {
  try {
    const order = await req.prisma.order.findFirst({
      where: {
        id: req.params.id,
        customerId: req.user.id
      },
      include: {
        customer: true,
        vendor: true,
        address: true,
        items: true,
        payments: { orderBy: { createdAt: 'desc' }, take: 1 }
      }
    });
    if (!order) return fail(res, 404, 'ORDER_NOT_FOUND', 'Invoice order tidak ditemukan.');
    return ok(res, { invoice: serializeInvoice(order) });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/receipt', requireCustomer, async (req, res, next) => {
  try {
    const order = await req.prisma.order.findFirst({
      where: {
        id: req.params.id,
        customerId: req.user.id
      },
      include: {
        customer: true,
        vendor: true,
        address: true,
        items: true,
        payments: { orderBy: { createdAt: 'desc' }, take: 1 }
      }
    });
    if (!order) return fail(res, 404, 'ORDER_NOT_FOUND', 'Receipt order tidak ditemukan.');
    return ok(res, {
      receipt: {
        ...serializeInvoice(order),
        latestPayment: order.payments?.[0] ? {
          id: order.payments[0].id,
          provider: order.payments[0].provider,
          method: order.payments[0].method,
          status: order.payments[0].status,
          amount: order.payments[0].amount,
          paidAt: order.payments[0].paidAt
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/reorder', requireCustomer, async (req, res, next) => {
  try {
    const result = await req.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          id: req.params.id,
          customerId: req.user.id
        },
        include: { items: true }
      });
      if (!order) {
        const error = new Error('Order lama tidak ditemukan atau bukan milik akun ini.');
        error.status = 404;
        error.code = 'ORDER_NOT_FOUND';
        throw error;
      }

      const warnings = [];
      const validItems = [];
      for (const item of order.items || []) {
        if (!item.productId) {
          warnings.push(`Produk "${item.productSnapshot?.productName || 'lama'}" tidak bisa dipesan lagi karena sudah tidak terhubung ke katalog.`);
          continue;
        }

        const product = await tx.product.findFirst({
          where: {
            id: item.productId,
            status: 'ACTIVE',
            deletedAt: null,
            vendor: { status: 'ACTIVE', deletedAt: null }
          },
          include: {
            vendor: true,
            variants: true,
            priceTiers: true,
            addons: true
          }
        });
        if (!product) {
          warnings.push(`Produk "${item.productSnapshot?.productName || item.productId}" sudah tidak aktif.`);
          continue;
        }

        const addonIds = parseAddonIds(item.addonsSnapshot);
        const variantId = item.variantSnapshot?.id || undefined;
        try {
          const pricing = calculateProductPrice(product, {
            quantity: item.quantity,
            variantId,
            addonIds
          });
          if (pricing.subtotal !== item.subtotal) {
            warnings.push(`Harga "${product.name}" berubah dari Rp${item.subtotal} menjadi Rp${pricing.subtotal}.`);
          }
          validItems.push({ product, pricing, variantId, addonIds });
        } catch (error) {
          warnings.push(`${product.name}: ${error.message}`);
        }
      }

      const vendorIds = new Set(validItems.map((item) => item.product.vendorId));
      if (vendorIds.size > 1) {
        const error = new Error('Reorder menghasilkan lebih dari satu vendor. Pilih ulang item secara manual.');
        error.status = 409;
        error.code = 'REORDER_MULTI_VENDOR_NOT_SUPPORTED';
        throw error;
      }

      const activeCart = await tx.cart.findFirst({
        where: { userId: req.user.id, status: 'ACTIVE' },
        include: { items: true },
        orderBy: { createdAt: 'desc' }
      });
      if (activeCart) {
        await tx.cartItem.deleteMany({ where: { cartId: activeCart.id } });
      }
      const cart = activeCart
        ? await tx.cart.update({
            where: { id: activeCart.id },
            data: { vendorId: validItems[0]?.product.vendorId || null }
          })
        : await tx.cart.create({
            data: {
              userId: req.user.id,
              vendorId: validItems[0]?.product.vendorId || null,
              status: 'ACTIVE'
            }
          });

      for (const item of validItems) {
        await tx.cartItem.create({
          data: {
            cartId: cart.id,
            productId: item.product.id,
            variantId: item.variantId || null,
            quantity: item.pricing.quantity,
            addons: { selected: item.pricing.addons }
          }
        });
      }

      await writeAuditLog(tx, req, {
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'CUSTOMER_ORDER_REORDERED',
        entityType: 'ORDER',
        entityId: order.id,
        metadata: {
          cartId: cart.id,
          copiedItems: validItems.length,
          warnings
        }
      });

      const summary = summarizePricedItems(validItems.map((item) => ({ pricing: item.pricing })));
      return {
        cart: {
          id: cart.id,
          vendorId: cart.vendorId,
          summary,
          items: validItems.map((item) => ({
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.pricing.quantity,
            unitPrice: item.pricing.effectiveUnitPrice,
            subtotal: item.pricing.subtotal,
            variant: item.pricing.variant,
            addons: item.pricing.addons
          }))
        },
        warnings
      };
    });

    return ok(res, result, 201);
  } catch (error) {
    if (error.status) return fail(res, error.status, error.code || 'REORDER_ERROR', error.message);
    next(error);
  }
});

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
      await createNotification(tx, {
        userId: req.user.id,
        type: 'ORDER_STATUS_CHANGED',
        title: 'Order dibatalkan',
        body: `Order ${order.orderNumber} dibatalkan. ${refundResult?.refund ? 'Refund request sudah dibuat.' : ''}`,
        entityType: 'ORDER',
        entityId: order.id
      });
      await notifyVendorMembers(tx, order.vendorId, {
        type: 'ORDER_STATUS_CHANGED',
        title: 'Order dibatalkan customer',
        body: `Order ${order.orderNumber} dibatalkan customer.`,
        entityType: 'ORDER',
        entityId: order.id
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
      await createNotification(tx, {
        userId: req.user.id,
        type: 'DISPUTE_CREATED',
        title: 'Komplain dibuat',
        body: `Komplain untuk order ${order.orderNumber} sudah tercatat.`,
        entityType: 'DISPUTE',
        entityId: dispute.id
      });
      await notifyVendorMembers(tx, order.vendorId, {
        type: 'DISPUTE_CREATED',
        title: 'Komplain order baru',
        body: `Customer membuka komplain untuk order ${order.orderNumber}.`,
        entityType: 'DISPUTE',
        entityId: dispute.id
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
