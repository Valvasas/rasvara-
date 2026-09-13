const express = require('express');
const { z } = require('zod');
const { buildProductLookup, productInclude } = require('../marketplace/marketplace.routes');
const { calculateProductPrice } = require('./pricing.service');
const { getPrisma } = require('../../services/prisma');
const { fail, fieldErrorsFromZod, ok } = require('../../utils/http');

const router = express.Router();

const previewSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).optional().or(z.literal('')),
  addonIds: z.array(z.string().min(1)).default([]),
  quantity: z.coerce.number().int().positive(),
  date: z.string().trim().max(40).optional().or(z.literal('')),
  fulfillmentType: z.enum(['PICKUP', 'DELIVERY']).default('DELIVERY'),
  addressId: z.string().min(1).optional().or(z.literal('')),
  location: z.string().trim().max(180).optional().or(z.literal(''))
}).passthrough();

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

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function getAvailabilityWarning(product, date, quantity) {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) return 'Tanggal acara tidak boleh di masa lalu.';

  const blocked = (product.vendor?.blockedDates || []).some((item) => {
    return item.date.toISOString().slice(0, 10) === date.toISOString().slice(0, 10);
  });
  if (blocked) return 'Vendor menutup tanggal ini.';

  const day = (product.availability || []).find((item) => {
    return item.date.toISOString().slice(0, 10) === date.toISOString().slice(0, 10);
  });
  if (!day) return null;
  const remaining = Number(day.capacity || 0) - Number(day.reservedQty || 0);
  if (remaining < quantity) return `Kapasitas tersisa ${Math.max(0, remaining)} ${product.unit}.`;
  return null;
}

router.post('/preview', async (req, res, next) => {
  try {
    const parsed = previewSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Data preview harga belum valid.', fieldErrorsFromZod(parsed.error));
    }

    const prisma = prismaOrSetupError(res);
    if (!prisma || res.headersSent) return;

    const product = await prisma.product.findFirst({
      where: buildProductLookup(parsed.data.productId),
      include: {
        ...productInclude(),
        vendor: {
          include: {
            blockedDates: true,
            _count: { select: { products: true, reviews: true } }
          }
        }
      }
    });
    if (!product) return fail(res, 404, 'PRODUCT_NOT_FOUND', 'Produk aktif tidak ditemukan.');
    if (!['BOTH', parsed.data.fulfillmentType].includes(product.fulfillmentType)) {
      return fail(res, 400, 'FULFILLMENT_NOT_SUPPORTED', 'Cara pemenuhan tidak didukung produk ini.');
    }

    const pricing = calculateProductPrice(product, parsed.data);
    const warnings = [];
    const eventDate = parseDate(parsed.data.date);
    const availabilityWarning = getAvailabilityWarning(product, eventDate, pricing.quantity);
    if (availabilityWarning) warnings.push(availabilityWarning);

    const deliveryFee = parsed.data.fulfillmentType === 'DELIVERY' ? 0 : 0;
    const serviceFee = 0;
    const discount = 0;
    return ok(res, {
      data: {
        productId: product.id,
        unitPrice: pricing.unitPrice,
        addonTotal: pricing.addonUnitTotal * pricing.quantity,
        addonUnitTotal: pricing.addonUnitTotal,
        subtotal: pricing.subtotal,
        deliveryFee,
        serviceFee,
        discount,
        grandTotal: pricing.subtotal + deliveryFee + serviceFee - discount,
        quantity: pricing.quantity,
        variant: pricing.variant,
        addons: pricing.addons,
        appliedTier: pricing.appliedTier,
        warnings
      }
    });
  } catch (error) {
    if (error.status) return fail(res, error.status, error.code || 'PRICING_ERROR', error.message);
    next(error);
  }
});

module.exports = router;
