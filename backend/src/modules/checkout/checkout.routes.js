const crypto = require('crypto');
const express = require('express');
const { z } = require('zod');
const { requireCustomer } = require('../auth/customerAuth.routes');
const { writeAuditLog } = require('../audit/audit.service');
const { createNotification, notifyVendorMembers } = require('../notifications/notification.service');
const { calculateProductPrice, summarizePricedItems } = require('../pricing/pricing.service');
const { fail, fieldErrorsFromZod, ok } = require('../../utils/http');

const router = express.Router();
const DEFAULT_COMMISSION_BPS = Number(process.env.DEFAULT_PLATFORM_COMMISSION_BPS || 500);

const checkoutSchema = z.object({
  addressId: z.string().min(1).optional().or(z.literal('')),
  eventDate: z.string().trim().min(10).max(40).optional().or(z.literal('')),
  slot: z.string().trim().max(80).optional().or(z.literal('')),
  fulfillmentType: z.enum(['PICKUP', 'DELIVERY']).default('DELIVERY'),
  recipientName: z.string().trim().min(2).max(100).optional().or(z.literal('')),
  recipientPhone: z.string().trim().min(8).max(40).optional().or(z.literal('')),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
  termsAccepted: z.literal(true)
}).passthrough();

function productInclude() {
  return {
    vendor: true,
    variants: true,
    priceTiers: true,
    addons: true
  };
}

function parseAddonIds(addons) {
  if (!addons) return [];
  if (Array.isArray(addons)) return addons.map((addon) => addon.id).filter(Boolean);
  if (Array.isArray(addons.selected)) return addons.selected.map((addon) => addon.id).filter(Boolean);
  return [];
}

function generateOrderNumber() {
  const date = new Date();
  const stamp = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0')
  ].join('');
  return `ORD-${stamp}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function createTrackingToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function parseEventDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error('Tanggal acara tidak valid.');
    error.code = 'INVALID_EVENT_DATE';
    error.status = 400;
    throw error;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) {
    const error = new Error('Tanggal acara tidak boleh di masa lalu.');
    error.code = 'EVENT_DATE_IN_PAST';
    error.status = 400;
    throw error;
  }
  return date;
}

function getCartForCheckout(prisma, userId) {
  return prisma.cart.findFirst({
    where: { userId, status: 'ACTIVE' },
    include: {
      items: {
        include: {
          product: {
            include: productInclude()
          }
        },
        orderBy: { createdAt: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

function priceCartItems(cart) {
  const items = (cart.items || []).map((item) => {
    if (item.product.status !== 'ACTIVE' || item.product.deletedAt || item.product.vendor.status !== 'ACTIVE' || item.product.vendor.deletedAt) {
      const error = new Error(`Produk ${item.product.name} sudah tidak tersedia.`);
      error.code = 'PRODUCT_UNAVAILABLE';
      error.status = 409;
      throw error;
    }

    const pricing = calculateProductPrice(item.product, {
      quantity: item.quantity,
      variantId: item.variantId || undefined,
      addonIds: parseAddonIds(item.addons)
    });

    return { cartItem: item, pricing };
  });

  const vendorIds = new Set(items.map((item) => item.cartItem.product.vendorId));
  if (vendorIds.size !== 1) {
    const error = new Error('Checkout hanya boleh berisi produk dari satu vendor.');
    error.code = 'MULTI_VENDOR_CHECKOUT_NOT_SUPPORTED';
    error.status = 409;
    throw error;
  }

  return items;
}

function buildFeeSnapshot(subtotal) {
  const commissionAmount = Math.round((subtotal * DEFAULT_COMMISSION_BPS) / 10000);
  return {
    commissionRateBps: DEFAULT_COMMISSION_BPS,
    commissionAmount,
    serviceFee: 0,
    paymentFee: 0,
    deliveryFee: 0,
    discountAllocation: 0,
    vendorNetAmount: subtotal - commissionAmount,
    platformRevenue: commissionAmount,
    source: 'checkout_mvp'
  };
}

async function parseAndValidateCheckout(req, res) {
  const parsed = checkoutSchema.safeParse(req.body || {});
  if (!parsed.success) {
    fail(res, 400, 'VALIDATION_ERROR', 'Data checkout belum valid.', fieldErrorsFromZod(parsed.error));
    return null;
  }

  const eventDate = parseEventDate(parsed.data.eventDate);
  const address = parsed.data.addressId
    ? await req.prisma.address.findFirst({
        where: { id: parsed.data.addressId, userId: req.user.id, deletedAt: null }
      })
    : null;
  if (parsed.data.fulfillmentType === 'DELIVERY' && !address) {
    fail(res, 400, 'ADDRESS_REQUIRED', 'Alamat aktif wajib dipilih untuk pengiriman.');
    return null;
  }
  if (parsed.data.addressId && !address) {
    fail(res, 404, 'ADDRESS_NOT_FOUND', 'Alamat tidak ditemukan atau bukan milik akun ini.');
    return null;
  }

  return { parsed, eventDate, address };
}

async function buildCheckoutPreview(prisma, userId) {
  const cart = await getCartForCheckout(prisma, userId);
  if (!cart || !cart.items.length) {
    const error = new Error('Cart masih kosong.');
    error.code = 'CART_EMPTY';
    error.status = 400;
    throw error;
  }

  const pricedItems = priceCartItems(cart);
  const summary = summarizePricedItems(pricedItems.map((item) => ({ pricing: item.pricing })));
  const feeSnapshot = buildFeeSnapshot(summary.subtotal);
  const grandTotal = summary.subtotal + feeSnapshot.deliveryFee + feeSnapshot.serviceFee - feeSnapshot.discountAllocation;
  return {
    cart,
    pricedItems,
    summary,
    feeSnapshot,
    grandTotal,
    vendorId: pricedItems[0].cartItem.product.vendorId
  };
}

function serializeCheckoutPreview(preview) {
  return {
    vendorId: preview.vendorId,
    itemCount: preview.pricedItems.length,
    quantity: preview.summary.quantity,
    subtotal: preview.summary.subtotal,
    deliveryFee: preview.feeSnapshot.deliveryFee,
    serviceFee: preview.feeSnapshot.serviceFee,
    discountAmount: preview.feeSnapshot.discountAllocation,
    grandTotal: preview.grandTotal,
    feeSnapshot: preview.feeSnapshot,
    items: preview.pricedItems.map(({ cartItem, pricing }) => ({
      cartItemId: cartItem.id,
      productId: cartItem.product.id,
      productName: cartItem.product.name,
      vendorId: cartItem.product.vendorId,
      quantity: pricing.quantity,
      unitPrice: pricing.effectiveUnitPrice,
      subtotal: pricing.subtotal,
      variant: pricing.variant,
      addons: pricing.addons,
      appliedTier: pricing.appliedTier
    }))
  };
}

function serializeOrder(order) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    eventDate: order.eventDate,
    slot: order.slot,
    fulfillmentType: order.fulfillmentType,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    serviceFee: order.serviceFee,
    discountAmount: order.discountAmount,
    grandTotal: order.grandTotal,
    trackingToken: order.trackingToken,
    feeSnapshot: order.feeSnapshot,
    items: (order.items || []).map((item) => ({
      id: item.id,
      productId: item.productId,
      productSnapshot: item.productSnapshot,
      variantSnapshot: item.variantSnapshot,
      addonsSnapshot: item.addonsSnapshot,
      appliedTier: item.appliedTier,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      subtotal: item.subtotal
    }))
  };
}

async function handleCheckoutConfirm(req, res, next) {
  try {
    const checkoutInput = await parseAndValidateCheckout(req, res);
    if (!checkoutInput || res.headersSent) return;
    const { parsed, eventDate, address } = checkoutInput;

    const createdOrder = await req.prisma.$transaction(async (tx) => {
      const preview = await buildCheckoutPreview(tx, req.user.id);

      const order = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          customerId: req.user.id,
          vendorId: preview.vendorId,
          addressId: address?.id || null,
          status: 'WAITING_PAYMENT',
          paymentStatus: 'PENDING',
          eventDate,
          slot: parsed.data.slot || null,
          fulfillmentType: parsed.data.fulfillmentType,
          recipientName: parsed.data.recipientName || address?.recipientName || req.user.name,
          recipientPhone: parsed.data.recipientPhone || address?.phone || req.user.phone || null,
          notes: parsed.data.notes || null,
          subtotal: preview.summary.subtotal,
          deliveryFee: preview.feeSnapshot.deliveryFee,
          serviceFee: preview.feeSnapshot.serviceFee,
          discountAmount: preview.feeSnapshot.discountAllocation,
          grandTotal: preview.grandTotal,
          feeSnapshot: preview.feeSnapshot,
          policySnapshot: {
            cancellationPolicy: 'MVP: pembatalan/refund mengikuti review admin/vendor sampai policy final aktif.',
            termsAcceptedAt: new Date().toISOString()
          },
          trackingToken: createTrackingToken(),
          items: {
            create: preview.pricedItems.map(({ cartItem, pricing }) => ({
              productId: cartItem.product.id,
              productSnapshot: {
                productId: cartItem.product.id,
                productName: cartItem.product.name,
                productSlug: cartItem.product.slug,
                vendorId: cartItem.product.vendor.id,
                vendorName: cartItem.product.vendor.storeName,
                unit: cartItem.product.unit,
                imageUrl: cartItem.product.imageUrl,
                minOrder: cartItem.product.minOrder,
                statusAtCheckout: cartItem.product.status
              },
              variantSnapshot: pricing.variant,
              addonsSnapshot: pricing.addons,
              appliedTier: pricing.appliedTier,
              unitPrice: pricing.effectiveUnitPrice,
              quantity: pricing.quantity,
              subtotal: pricing.subtotal
            }))
          },
          histories: {
            create: {
              status: 'WAITING_PAYMENT',
              actorId: req.user.id,
              actorRole: req.user.role,
              note: 'Order dibuat dari cart customer.'
            }
          }
        },
        include: { items: true }
      });

      await tx.cartItem.deleteMany({ where: { cartId: preview.cart.id } });
      await tx.cart.update({ where: { id: preview.cart.id }, data: { status: 'CHECKED_OUT', vendorId: null } });
      await createNotification(tx, {
        userId: req.user.id,
        type: 'ORDER_CREATED',
        title: 'Order marketplace dibuat',
        body: `Order ${order.orderNumber} menunggu pembayaran sandbox.`,
        entityType: 'ORDER',
        entityId: order.id
      });
      await notifyVendorMembers(tx, order.vendorId, {
        type: 'ORDER_CREATED',
        title: 'Order baru masuk',
        body: `Order ${order.orderNumber} dibuat dan menunggu pembayaran customer.`,
        entityType: 'ORDER',
        entityId: order.id
      });
      await writeAuditLog(tx, req, {
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'ORDER_CHECKOUT_CREATED',
        entityType: 'ORDER',
        entityId: order.id,
        newValue: {
          orderNumber: order.orderNumber,
          grandTotal: order.grandTotal,
          itemCount: preview.pricedItems.length
        }
      });

      return order;
    });

    return ok(res, { order: serializeOrder(createdOrder) }, 201);
  } catch (error) {
    if (error.status) return fail(res, error.status, error.code || 'CHECKOUT_ERROR', error.message);
    next(error);
  }
}

router.post('/preview', requireCustomer, async (req, res, next) => {
  try {
    const checkoutInput = await parseAndValidateCheckout(req, res);
    if (!checkoutInput || res.headersSent) return;
    const preview = await buildCheckoutPreview(req.prisma, req.user.id);
    return ok(res, { preview: serializeCheckoutPreview(preview) });
  } catch (error) {
    if (error.status) return fail(res, error.status, error.code || 'CHECKOUT_PREVIEW_ERROR', error.message);
    next(error);
  }
});

router.post('/confirm', requireCustomer, handleCheckoutConfirm);
router.post('/', requireCustomer, handleCheckoutConfirm);

module.exports = router;
