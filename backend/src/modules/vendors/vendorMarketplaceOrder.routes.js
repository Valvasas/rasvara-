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

const productChildSchemas = {
  variants: z.array(z.object({
    id: z.string().optional(),
    name: z.string().trim().min(1).max(100),
    price: z.coerce.number().int().positive(),
    sku: z.string().trim().max(80).optional().or(z.literal('')),
    isDefault: z.boolean().optional()
  })).max(20).optional(),
  addons: z.array(z.object({
    id: z.string().optional(),
    name: z.string().trim().min(1).max(100),
    price: z.coerce.number().int().nonnegative(),
    status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE')
  })).max(30).optional(),
  priceTiers: z.array(z.object({
    id: z.string().optional(),
    minQty: z.coerce.number().int().positive(),
    maxQty: z.coerce.number().int().positive().nullable().optional(),
    unitPrice: z.coerce.number().int().positive()
  })).max(20).optional()
};

const productCreateSchema = z.object({
  name: z.string().trim().min(2).max(140),
  description: z.string().trim().max(1200).optional().or(z.literal('')),
  category: z.string().trim().min(2).max(80),
  imageUrl: z.string().trim().max(500).optional().or(z.literal('')),
  basePrice: z.coerce.number().int().positive(),
  costPrice: z.coerce.number().int().nonnegative().default(0),
  unit: z.string().trim().min(1).max(40),
  minOrder: z.coerce.number().int().positive().default(1),
  maxOrder: z.coerce.number().int().positive().nullable().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'SOLD_OUT', 'ARCHIVED']).default('DRAFT'),
  allergenInfo: z.string().trim().max(500).optional().or(z.literal('')),
  halalStatus: z.string().trim().max(80).optional().or(z.literal('')),
  leadTimeHours: z.coerce.number().int().nonnegative().max(720).default(24),
  fulfillmentType: z.enum(['PICKUP', 'DELIVERY', 'BOTH']).default('BOTH'),
  serviceAreas: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
  ...productChildSchemas
}).strict();

const productUpdateSchema = productCreateSchema.partial().strict();

const productImageSchema = z.object({
  imageUrl: z.string().trim().min(1).max(500)
}).strict();

const availabilityDaySchema = z.object({
  productId: z.string().min(1),
  date: z.string().trim().min(10).max(40),
  capacity: z.coerce.number().int().nonnegative(),
  reservedQty: z.coerce.number().int().nonnegative().optional()
}).strict();

const blockedDateSchema = z.object({
  date: z.string().trim().min(10).max(40),
  reason: z.string().trim().max(240).optional().or(z.literal(''))
}).strict();

const operatingHourSchema = z.object({
  hours: z.array(z.object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    opensAt: z.string().trim().regex(/^\d{2}:\d{2}$/),
    closesAt: z.string().trim().regex(/^\d{2}:\d{2}$/),
    isClosed: z.boolean().default(false)
  })).min(1).max(7)
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

async function ensurePrismaVendor(prisma, legacyVendor = {}) {
  const legacyId = `json-vendor-${legacyVendor.id}`;
  const existing = await prisma.vendor.findUnique({ where: { legacyId } });
  if (existing) return existing;
  return prisma.vendor.create({
    data: {
      legacyId,
      storeName: legacyVendor.storeName || legacyVendor.businessName || 'Vendor Marketplace',
      slug: `${slugify(legacyVendor.storeName || legacyVendor.businessName || 'vendor')}-${Date.now().toString(36)}`,
      ownerName: legacyVendor.ownerName || null,
      email: legacyVendor.email || null,
      whatsapp: legacyVendor.whatsapp || null,
      address: legacyVendor.address || null,
      bio: legacyVendor.bio || null,
      avatarUrl: legacyVendor.avatar || null,
      status: legacyVendor.status === 'active' ? 'ACTIVE' : legacyVendor.status === 'suspended' ? 'SUSPENDED' : 'PENDING'
    }
  });
}

function slugify(value = 'produk') {
  const slug = String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || 'produk';
}

function parseDateOnly(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = match
    ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
    : new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error('Tanggal tidak valid.');
    error.code = 'INVALID_DATE';
    error.status = 400;
    throw error;
  }
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function dateKey(value) {
  return value.toISOString().slice(0, 10);
}

function monthRange(rawMonth) {
  if (!/^\d{4}-\d{2}$/.test(String(rawMonth || ''))) {
    const error = new Error('Format bulan harus YYYY-MM.');
    error.code = 'INVALID_MONTH';
    error.status = 400;
    throw error;
  }
  const [year, month] = rawMonth.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}

function serializeProduct(product = {}) {
  return {
    id: product.id,
    legacyId: product.legacyId,
    vendorId: product.vendorId,
    name: product.name,
    slug: product.slug,
    description: product.description,
    category: product.category,
    imageUrl: product.imageUrl,
    basePrice: product.basePrice,
    costPrice: product.costPrice,
    unit: product.unit,
    minOrder: product.minOrder,
    maxOrder: product.maxOrder,
    status: product.status,
    allergenInfo: product.allergenInfo,
    halalStatus: product.halalStatus,
    leadTimeHours: product.leadTimeHours,
    fulfillmentType: product.fulfillmentType,
    serviceAreas: product.serviceAreas || [],
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    variants: (product.variants || []).map((variant) => ({
      id: variant.id,
      name: variant.name,
      price: variant.price,
      sku: variant.sku,
      isDefault: variant.isDefault
    })),
    addons: (product.addons || []).map((addon) => ({
      id: addon.id,
      name: addon.name,
      price: addon.price,
      status: addon.status
    })),
    priceTiers: (product.priceTiers || []).map((tier) => ({
      id: tier.id,
      minQty: tier.minQty,
      maxQty: tier.maxQty,
      unitPrice: tier.unitPrice
    })),
    availability: (product.availability || []).map((item) => ({
      id: item.id,
      date: item.date,
      capacity: item.capacity,
      reservedQty: item.reservedQty
    }))
  };
}

function productInclude() {
  return {
    variants: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] },
    addons: { orderBy: { createdAt: 'asc' } },
    priceTiers: { orderBy: { minQty: 'asc' } },
    availability: { orderBy: { date: 'asc' } }
  };
}

async function findVendorProduct(prisma, vendorId, productId) {
  return prisma.product.findFirst({
    where: { id: productId, vendorId, deletedAt: null },
    include: productInclude()
  });
}

async function replaceProductChildren(tx, productId, data = {}) {
  if (data.variants !== undefined) {
    await tx.productVariant.deleteMany({ where: { productId } });
    if (data.variants.length) {
      await tx.productVariant.createMany({
        data: data.variants.map((variant) => ({
          productId,
          name: variant.name,
          price: variant.price,
          sku: variant.sku || null,
          isDefault: Boolean(variant.isDefault)
        }))
      });
    }
  }
  if (data.addons !== undefined) {
    await tx.productAddon.deleteMany({ where: { productId } });
    if (data.addons.length) {
      await tx.productAddon.createMany({
        data: data.addons.map((addon) => ({
          productId,
          name: addon.name,
          price: addon.price,
          status: addon.status
        }))
      });
    }
  }
  if (data.priceTiers !== undefined) {
    await tx.productPriceTier.deleteMany({ where: { productId } });
    if (data.priceTiers.length) {
      await tx.productPriceTier.createMany({
        data: data.priceTiers.map((tier) => ({
          productId,
          minQty: tier.minQty,
          maxQty: tier.maxQty ?? null,
          unitPrice: tier.unitPrice
        }))
      });
    }
  }
}

function productDataFromInput(input = {}, vendorId, existingSlug = '') {
  const data = {};
  const directFields = [
    'name',
    'description',
    'category',
    'imageUrl',
    'basePrice',
    'costPrice',
    'unit',
    'minOrder',
    'maxOrder',
    'status',
    'allergenInfo',
    'halalStatus',
    'leadTimeHours',
    'fulfillmentType',
    'serviceAreas'
  ];
  directFields.forEach((field) => {
    if (input[field] !== undefined) data[field] = input[field] === '' ? null : input[field];
  });
  if (input.name && !existingSlug) {
    data.slug = `${slugify(input.name)}-${Date.now().toString(36)}`;
  }
  if (vendorId) data.vendorId = vendorId;
  return data;
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

router.get('/products', async (req, res, next) => {
  try {
    const prisma = prismaOrSetupError(res);
    if (!prisma || res.headersSent) return;
    const vendor = await ensurePrismaVendor(prisma, req.vendor);
    const status = req.query.status ? String(req.query.status) : undefined;
    const products = await prisma.product.findMany({
      where: {
        vendorId: vendor.id,
        deletedAt: null,
        ...(status ? { status } : {})
      },
      include: productInclude(),
      orderBy: { updatedAt: 'desc' },
      take: 100
    });
    return ok(res, { products: products.map(serializeProduct) });
  } catch (error) {
    next(error);
  }
});

router.post('/products', async (req, res, next) => {
  try {
    const parsed = productCreateSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Data produk belum valid.', fieldErrorsFromZod(parsed.error));
    }

    const prisma = prismaOrSetupError(res);
    if (!prisma || res.headersSent) return;
    const product = await prisma.$transaction(async (tx) => {
      const vendor = await ensurePrismaVendor(tx, req.vendor);
      const created = await tx.product.create({
        data: productDataFromInput(parsed.data, vendor.id),
        include: productInclude()
      });
      await replaceProductChildren(tx, created.id, parsed.data);
      await writeAuditLog(tx, req, {
        action: 'VENDOR_PRODUCT_CREATED',
        entityType: 'PRODUCT',
        entityId: created.id,
        actorRole: 'VENDOR_OWNER',
        metadata: { legacyVendorId: req.vendor.id, vendorId: vendor.id },
        newValue: { name: created.name, status: created.status }
      });
      return tx.product.findUnique({ where: { id: created.id }, include: productInclude() });
    });

    return ok(res, { product: serializeProduct(product) }, 201);
  } catch (error) {
    if (error.code === 'P2002') return fail(res, 409, 'PRODUCT_SLUG_EXISTS', 'Slug produk sudah dipakai vendor ini.');
    next(error);
  }
});

router.get('/products/:id', async (req, res, next) => {
  try {
    const prisma = prismaOrSetupError(res);
    if (!prisma || res.headersSent) return;
    const vendor = await ensurePrismaVendor(prisma, req.vendor);
    const product = await findVendorProduct(prisma, vendor.id, req.params.id);
    if (!product) return fail(res, 404, 'PRODUCT_NOT_FOUND', 'Produk vendor tidak ditemukan.');
    return ok(res, { product: serializeProduct(product) });
  } catch (error) {
    next(error);
  }
});

router.patch('/products/:id', async (req, res, next) => {
  try {
    const parsed = productUpdateSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Data produk belum valid.', fieldErrorsFromZod(parsed.error));
    }

    const prisma = prismaOrSetupError(res);
    if (!prisma || res.headersSent) return;
    const product = await prisma.$transaction(async (tx) => {
      const vendor = await ensurePrismaVendor(tx, req.vendor);
      const existing = await findVendorProduct(tx, vendor.id, req.params.id);
      if (!existing) {
        const error = new Error('Produk vendor tidak ditemukan.');
        error.status = 404;
        error.code = 'PRODUCT_NOT_FOUND';
        throw error;
      }
      const updated = await tx.product.update({
        where: { id: existing.id },
        data: productDataFromInput(parsed.data, null, existing.slug),
        include: productInclude()
      });
      await replaceProductChildren(tx, existing.id, parsed.data);
      await writeAuditLog(tx, req, {
        action: 'VENDOR_PRODUCT_UPDATED',
        entityType: 'PRODUCT',
        entityId: existing.id,
        actorRole: 'VENDOR_OWNER',
        metadata: { legacyVendorId: req.vendor.id, vendorId: vendor.id },
        oldValue: { name: existing.name, status: existing.status, basePrice: existing.basePrice },
        newValue: { name: updated.name, status: updated.status, basePrice: updated.basePrice }
      });
      return tx.product.findUnique({ where: { id: existing.id }, include: productInclude() });
    });

    return ok(res, { product: serializeProduct(product) });
  } catch (error) {
    if (error.status) return fail(res, error.status, error.code || 'VENDOR_PRODUCT_ERROR', error.message);
    next(error);
  }
});

router.delete('/products/:id', async (req, res, next) => {
  try {
    const prisma = prismaOrSetupError(res);
    if (!prisma || res.headersSent) return;
    const vendor = await ensurePrismaVendor(prisma, req.vendor);
    const existing = await findVendorProduct(prisma, vendor.id, req.params.id);
    if (!existing) return fail(res, 404, 'PRODUCT_NOT_FOUND', 'Produk vendor tidak ditemukan.');
    const product = await prisma.product.update({
      where: { id: existing.id },
      data: { status: 'ARCHIVED', deletedAt: new Date() },
      include: productInclude()
    });
    await writeAuditLog(prisma, req, {
      action: 'VENDOR_PRODUCT_DELETED',
      entityType: 'PRODUCT',
      entityId: existing.id,
      actorRole: 'VENDOR_OWNER',
      metadata: { legacyVendorId: req.vendor.id, vendorId: vendor.id },
      oldValue: { status: existing.status },
      newValue: { status: 'ARCHIVED' }
    });
    return ok(res, { product: serializeProduct(product) });
  } catch (error) {
    next(error);
  }
});

router.post('/products/:id/images', async (req, res, next) => {
  try {
    const parsed = productImageSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return fail(res, 400, 'VALIDATION_ERROR', 'URL gambar belum valid.', fieldErrorsFromZod(parsed.error));
    }
    const prisma = prismaOrSetupError(res);
    if (!prisma || res.headersSent) return;
    const vendor = await ensurePrismaVendor(prisma, req.vendor);
    const existing = await findVendorProduct(prisma, vendor.id, req.params.id);
    if (!existing) return fail(res, 404, 'PRODUCT_NOT_FOUND', 'Produk vendor tidak ditemukan.');
    const product = await prisma.product.update({
      where: { id: existing.id },
      data: { imageUrl: parsed.data.imageUrl },
      include: productInclude()
    });
    return ok(res, { product: serializeProduct(product) });
  } catch (error) {
    next(error);
  }
});

router.post('/products/:id/publish', async (req, res, next) => {
  try {
    const prisma = prismaOrSetupError(res);
    if (!prisma || res.headersSent) return;
    const vendor = await ensurePrismaVendor(prisma, req.vendor);
    const existing = await findVendorProduct(prisma, vendor.id, req.params.id);
    if (!existing) return fail(res, 404, 'PRODUCT_NOT_FOUND', 'Produk vendor tidak ditemukan.');
    if (!existing.imageUrl) return fail(res, 400, 'PRODUCT_IMAGE_REQUIRED', 'Produk perlu gambar sebelum publish.');
    const product = await prisma.product.update({
      where: { id: existing.id },
      data: { status: 'ACTIVE' },
      include: productInclude()
    });
    await writeAuditLog(prisma, req, {
      action: 'VENDOR_PRODUCT_PUBLISHED',
      entityType: 'PRODUCT',
      entityId: existing.id,
      actorRole: 'VENDOR_OWNER',
      metadata: { legacyVendorId: req.vendor.id, vendorId: vendor.id },
      oldValue: { status: existing.status },
      newValue: { status: 'ACTIVE' }
    });
    return ok(res, { product: serializeProduct(product) });
  } catch (error) {
    next(error);
  }
});

router.post('/products/:id/archive', async (req, res, next) => {
  try {
    const prisma = prismaOrSetupError(res);
    if (!prisma || res.headersSent) return;
    const vendor = await ensurePrismaVendor(prisma, req.vendor);
    const existing = await findVendorProduct(prisma, vendor.id, req.params.id);
    if (!existing) return fail(res, 404, 'PRODUCT_NOT_FOUND', 'Produk vendor tidak ditemukan.');
    const product = await prisma.product.update({
      where: { id: existing.id },
      data: { status: 'ARCHIVED' },
      include: productInclude()
    });
    await writeAuditLog(prisma, req, {
      action: 'VENDOR_PRODUCT_ARCHIVED',
      entityType: 'PRODUCT',
      entityId: existing.id,
      actorRole: 'VENDOR_OWNER',
      metadata: { legacyVendorId: req.vendor.id, vendorId: vendor.id },
      oldValue: { status: existing.status },
      newValue: { status: 'ARCHIVED' }
    });
    return ok(res, { product: serializeProduct(product) });
  } catch (error) {
    next(error);
  }
});

router.get('/production-calendar', async (req, res, next) => {
  try {
    const prisma = prismaOrSetupError(res);
    if (!prisma || res.headersSent) return;
    const vendor = await ensurePrismaVendor(prisma, req.vendor);
    const { start, end } = monthRange(String(req.query.month || new Date().toISOString().slice(0, 7)));

    const [orders, productAvailability, blockedDates, operatingHours] = await Promise.all([
      prisma.order.findMany({
        where: {
          vendorId: vendor.id,
          eventDate: { gte: start, lt: end },
          status: { notIn: ['CANCELLED', 'DISPUTED'] }
        },
        include: { items: true },
        orderBy: { eventDate: 'asc' }
      }),
      prisma.productAvailability.findMany({
        where: {
          product: { vendorId: vendor.id },
          date: { gte: start, lt: end }
        },
        include: { product: { select: { id: true, name: true, unit: true } } },
        orderBy: { date: 'asc' }
      }),
      prisma.vendorBlockedDate.findMany({
        where: { vendorId: vendor.id, date: { gte: start, lt: end } },
        orderBy: { date: 'asc' }
      }),
      prisma.vendorOperatingHour.findMany({
        where: { vendorId: vendor.id },
        orderBy: { dayOfWeek: 'asc' }
      })
    ]);

    const days = {};
    for (const order of orders) {
      if (!order.eventDate) continue;
      const key = dateKey(order.eventDate);
      if (!days[key]) days[key] = { date: key, orders: [], usedCapacity: 0, productAvailability: [], blocked: null };
      const quantity = order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      days[key].usedCapacity += quantity;
      days[key].orders.push({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        quantity,
        grandTotal: order.grandTotal
      });
    }
    for (const availability of productAvailability) {
      const key = dateKey(availability.date);
      if (!days[key]) days[key] = { date: key, orders: [], usedCapacity: 0, productAvailability: [], blocked: null };
      days[key].productAvailability.push({
        id: availability.id,
        productId: availability.productId,
        productName: availability.product.name,
        capacity: availability.capacity,
        reservedQty: availability.reservedQty,
        remaining: Math.max(0, Number(availability.capacity || 0) - Number(availability.reservedQty || 0))
      });
    }
    for (const blocked of blockedDates) {
      const key = dateKey(blocked.date);
      if (!days[key]) days[key] = { date: key, orders: [], usedCapacity: 0, productAvailability: [], blocked: null };
      days[key].blocked = { id: blocked.id, reason: blocked.reason };
    }

    return ok(res, {
      calendar: {
        month: req.query.month || new Date().toISOString().slice(0, 7),
        vendor: { id: vendor.id, defaultCapacity: vendor.defaultCapacity },
        operatingHours,
        days: Object.values(days).sort((a, b) => a.date.localeCompare(b.date))
      }
    });
  } catch (error) {
    if (error.status) return fail(res, error.status, error.code || 'PRODUCTION_CALENDAR_ERROR', error.message);
    next(error);
  }
});

router.patch('/availability/day', async (req, res, next) => {
  try {
    const parsed = availabilityDaySchema.safeParse(req.body || {});
    if (!parsed.success) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Data availability belum valid.', fieldErrorsFromZod(parsed.error));
    }
    if (parsed.data.reservedQty !== undefined && parsed.data.reservedQty > parsed.data.capacity) {
      return fail(res, 400, 'CAPACITY_INVALID', 'Reserved quantity tidak boleh melebihi capacity.');
    }

    const prisma = prismaOrSetupError(res);
    if (!prisma || res.headersSent) return;
    const vendor = await ensurePrismaVendor(prisma, req.vendor);
    const product = await findVendorProduct(prisma, vendor.id, parsed.data.productId);
    if (!product) return fail(res, 404, 'PRODUCT_NOT_FOUND', 'Produk vendor tidak ditemukan.');
    const date = parseDateOnly(parsed.data.date);
    const availability = await prisma.productAvailability.upsert({
      where: { productId_date: { productId: product.id, date } },
      update: {
        capacity: parsed.data.capacity,
        ...(parsed.data.reservedQty !== undefined ? { reservedQty: parsed.data.reservedQty } : {})
      },
      create: {
        productId: product.id,
        date,
        capacity: parsed.data.capacity,
        reservedQty: parsed.data.reservedQty || 0
      }
    });
    await writeAuditLog(prisma, req, {
      action: 'VENDOR_PRODUCT_AVAILABILITY_UPDATED',
      entityType: 'PRODUCT_AVAILABILITY',
      entityId: availability.id,
      actorRole: 'VENDOR_OWNER',
      metadata: { legacyVendorId: req.vendor.id, vendorId: vendor.id, productId: product.id }
    });
    return ok(res, { availability });
  } catch (error) {
    if (error.status) return fail(res, error.status, error.code || 'AVAILABILITY_ERROR', error.message);
    next(error);
  }
});

router.post('/blocked-dates', async (req, res, next) => {
  try {
    const parsed = blockedDateSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Data tanggal tutup belum valid.', fieldErrorsFromZod(parsed.error));
    }
    const prisma = prismaOrSetupError(res);
    if (!prisma || res.headersSent) return;
    const vendor = await ensurePrismaVendor(prisma, req.vendor);
    const date = parseDateOnly(parsed.data.date);
    const blockedDate = await prisma.vendorBlockedDate.upsert({
      where: { vendorId_date: { vendorId: vendor.id, date } },
      update: { reason: parsed.data.reason || null },
      create: { vendorId: vendor.id, date, reason: parsed.data.reason || null }
    });
    await writeAuditLog(prisma, req, {
      action: 'VENDOR_BLOCKED_DATE_CREATED',
      entityType: 'VENDOR_BLOCKED_DATE',
      entityId: blockedDate.id,
      actorRole: 'VENDOR_OWNER',
      metadata: { legacyVendorId: req.vendor.id, vendorId: vendor.id }
    });
    return ok(res, { blockedDate }, 201);
  } catch (error) {
    next(error);
  }
});

router.delete('/blocked-dates/:id', async (req, res, next) => {
  try {
    const prisma = prismaOrSetupError(res);
    if (!prisma || res.headersSent) return;
    const vendor = await ensurePrismaVendor(prisma, req.vendor);
    const blockedDate = await prisma.vendorBlockedDate.findFirst({ where: { id: req.params.id, vendorId: vendor.id } });
    if (!blockedDate) return fail(res, 404, 'BLOCKED_DATE_NOT_FOUND', 'Tanggal tutup tidak ditemukan.');
    await prisma.vendorBlockedDate.delete({ where: { id: blockedDate.id } });
    return ok(res);
  } catch (error) {
    next(error);
  }
});

router.patch('/operating-hours', async (req, res, next) => {
  try {
    const parsed = operatingHourSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Jam operasional belum valid.', fieldErrorsFromZod(parsed.error));
    }
    const prisma = prismaOrSetupError(res);
    if (!prisma || res.headersSent) return;
    const vendor = await ensurePrismaVendor(prisma, req.vendor);
    const hours = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const hour of parsed.data.hours) {
        results.push(await tx.vendorOperatingHour.upsert({
          where: { vendorId_dayOfWeek: { vendorId: vendor.id, dayOfWeek: hour.dayOfWeek } },
          update: {
            opensAt: hour.opensAt,
            closesAt: hour.closesAt,
            isClosed: hour.isClosed
          },
          create: {
            vendorId: vendor.id,
            dayOfWeek: hour.dayOfWeek,
            opensAt: hour.opensAt,
            closesAt: hour.closesAt,
            isClosed: hour.isClosed
          }
        }));
      }
      await writeAuditLog(tx, req, {
        action: 'VENDOR_OPERATING_HOURS_UPDATED',
        entityType: 'VENDOR',
        entityId: vendor.id,
        actorRole: 'VENDOR_OWNER',
        metadata: { legacyVendorId: req.vendor.id, vendorId: vendor.id }
      });
      return results;
    });
    return ok(res, { hours });
  } catch (error) {
    next(error);
  }
});

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

router.post('/orders/:id/accept', async (req, res, next) => {
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
        const error = new Error('Order belum dibayar, vendor belum bisa menerima order.');
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
          note: parsed.data.note || `Order diterima oleh ${req.vendor.storeName}.`
        }
      });
      await writeAuditLog(tx, req, {
        action: 'VENDOR_ORDER_ACCEPTED',
        entityType: 'ORDER',
        entityId: order.id,
        actorRole: 'VENDOR_OWNER',
        metadata: { legacyVendorId: req.vendor.id, vendorId: vendor.id },
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

router.post('/orders/:id/start-production', async (req, res, next) => {
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

router.post('/orders/:id/mark-ready', async (req, res, next) => {
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

router.post('/orders/:id/mark-delivering', async (req, res, next) => {
  try {
    const parsed = actionSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Catatan tidak valid.', fieldErrorsFromZod(parsed.error));
    }
    const result = await advanceVendorOrder(req, res, 'DELIVERING', parsed.data.note);
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

router.post('/orders/:id/mark-completed', async (req, res, next) => {
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

router.post('/orders/:id/propose-reschedule', async (req, res, next) => {
  try {
    const parsed = actionSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Catatan tidak valid.', fieldErrorsFromZod(parsed.error));
    }
    const prisma = prismaOrSetupError(res);
    if (!prisma || res.headersSent) return;
    const { vendor, order } = await findVendorOrder(prisma, req.vendor.id, req.params.id);
    if (!vendor || !order) return fail(res, 404, 'VENDOR_ORDER_NOT_FOUND', 'Order marketplace vendor tidak ditemukan.');
    await writeAuditLog(prisma, req, {
      action: 'VENDOR_ORDER_RESCHEDULE_PROPOSED',
      entityType: 'ORDER',
      entityId: order.id,
      actorRole: 'VENDOR_OWNER',
      metadata: {
        legacyVendorId: req.vendor.id,
        vendorId: vendor.id,
        note: parsed.data.note || ''
      }
    });
    return ok(res, {
      order: serializeOrder(order),
      proposal: {
        note: parsed.data.note || '',
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
