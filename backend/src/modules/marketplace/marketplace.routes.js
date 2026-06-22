const express = require('express');
const { z } = require('zod');
const { calculateProductPrice } = require('../pricing/pricing.service');
const { getPrisma } = require('../../services/prisma');
const { fail, fieldErrorsFromZod, ok } = require('../../utils/http');

const router = express.Router();
const booleanQuery = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return value;
}, z.boolean());

const searchSchema = z.object({
  keyword: z.string().trim().max(120).optional().or(z.literal('')),
  q: z.string().trim().max(120).optional().or(z.literal('')),
  location: z.string().trim().max(120).optional().or(z.literal('')),
  date: z.string().trim().max(40).optional().or(z.literal('')),
  quantity: z.coerce.number().int().positive().optional(),
  minQuantity: z.coerce.number().int().positive().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  category: z.string().trim().max(80).optional().or(z.literal('')),
  halal: booleanQuery.optional(),
  vegetarian: booleanQuery.optional(),
  fulfillmentType: z.enum(['PICKUP', 'DELIVERY', 'BOTH']).optional(),
  verifiedVendor: booleanQuery.optional(),
  sort: z.enum(['featured', 'price-low', 'price-high', 'min-order', 'newest']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(48).default(18)
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

function parseDateOnly(value) {
  if (!value) return null;
  const text = String(value).trim();
  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnly
    ? new Date(Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])))
    : new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function legacyNumber(legacyId = '') {
  const match = String(legacyId || '').match(/^json-(?:menu|vendor)-(\d+)$/);
  return match ? Number(match[1]) : null;
}

function publicVendor(vendor = {}, stats = {}) {
  return {
    id: legacyNumber(vendor.legacyId) ?? vendor.id,
    marketplaceId: vendor.id,
    legacyId: vendor.legacyId,
    storeName: vendor.storeName,
    slug: vendor.slug,
    ownerName: vendor.ownerName,
    whatsapp: vendor.whatsapp,
    address: vendor.address,
    bio: vendor.bio,
    avatar: vendor.avatarUrl,
    status: vendor.status,
    isVerified: vendor.status === 'ACTIVE',
    menuCount: stats.menuCount ?? vendor._count?.products ?? 0,
    reviewCount: stats.reviewCount ?? vendor._count?.reviews ?? 0,
    averageRating: Number(stats.averageRating || 0)
  };
}

function publicProduct(product = {}) {
  const reviewCount = product._count?.reviews || 0;
  const averageRating = product.reviews?.length
    ? product.reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / product.reviews.length
    : 0;
  return {
    id: legacyNumber(product.legacyId) ?? product.id,
    marketplaceId: product.id,
    legacyId: product.legacyId,
    name: product.name,
    slug: product.slug,
    desc: product.description || '',
    description: product.description || '',
    category: product.category,
    image: product.imageUrl || '',
    imageUrl: product.imageUrl || '',
    price: product.basePrice,
    basePrice: product.basePrice,
    unitType: product.unit,
    unit: product.unit,
    minOrder: product.minOrder,
    maxOrder: product.maxOrder,
    availability: product.status === 'SOLD_OUT' ? 'sold_out' : product.status === 'DRAFT' ? 'draft' : 'active',
    status: product.status,
    halalStatus: product.halalStatus,
    allergenInfo: product.allergenInfo,
    leadTimeHours: product.leadTimeHours,
    fulfillmentType: product.fulfillmentType,
    serviceAreas: product.serviceAreas || [],
    vendorId: legacyNumber(product.vendor?.legacyId) ?? product.vendorId,
    vendor: product.vendor ? publicVendor(product.vendor) : null,
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
    rating: {
      average: Number(averageRating.toFixed(1)),
      count: reviewCount
    }
  };
}

function buildProductLookup(value = '') {
  const normalized = String(value || '').trim();
  const aliases = new Set([normalized]);
  if (/^\d+$/.test(normalized)) aliases.add(`json-menu-${normalized}`);
  return {
    OR: [
      { id: normalized },
      { slug: normalized },
      { legacyId: { in: [...aliases] } }
    ],
    status: 'ACTIVE',
    deletedAt: null,
    vendor: { status: 'ACTIVE', deletedAt: null }
  };
}

function availabilityWarning(product, date, quantity) {
  if (!date) return null;
  const blocked = (product.vendor?.blockedDates || []).some((blockedDate) => {
    return blockedDate.date.toISOString().slice(0, 10) === date.toISOString().slice(0, 10);
  });
  if (blocked) return 'Vendor menutup tanggal ini.';

  const dayAvailability = (product.availability || []).find((item) => {
    return item.date.toISOString().slice(0, 10) === date.toISOString().slice(0, 10);
  });
  if (!dayAvailability) return null;
  const remaining = Number(dayAvailability.capacity || 0) - Number(dayAvailability.reservedQty || 0);
  if (remaining < quantity) return `Kapasitas tersisa ${Math.max(0, remaining)} ${product.unit}.`;
  return null;
}

function productInclude() {
  return {
    vendor: {
      include: {
        blockedDates: true,
        _count: { select: { products: true, reviews: true } }
      }
    },
    variants: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] },
    addons: { where: { status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } },
    priceTiers: { orderBy: { minQty: 'asc' } },
    availability: true,
    reviews: {
      where: { moderationStatus: 'VISIBLE' },
      select: { rating: true },
      take: 50
    },
    _count: { select: { reviews: true } }
  };
}

router.get('/search', async (req, res, next) => {
  try {
    const parsed = searchSchema.safeParse(req.query || {});
    if (!parsed.success) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Filter marketplace belum valid.', fieldErrorsFromZod(parsed.error));
    }

    const prisma = prismaOrSetupError(res);
    if (!prisma || res.headersSent) return;

    const keyword = parsed.data.keyword || parsed.data.q || '';
    const quantity = parsed.data.quantity ?? parsed.data.minQuantity ?? null;
    const eventDate = parseDateOnly(parsed.data.date);
    const where = {
      status: 'ACTIVE',
      deletedAt: null,
      ...(quantity !== null ? { minOrder: { lte: quantity } } : {}),
      vendor: {
        status: 'ACTIVE',
        deletedAt: null,
        ...(parsed.data.location ? { OR: [
          { address: { contains: parsed.data.location, mode: 'insensitive' } },
          { storeName: { contains: parsed.data.location, mode: 'insensitive' } }
        ] } : {})
      },
      ...(keyword ? { OR: [
        { name: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
        { category: { contains: keyword, mode: 'insensitive' } },
        { vendor: { storeName: { contains: keyword, mode: 'insensitive' } } }
      ] } : {}),
      ...(parsed.data.category ? { category: parsed.data.category } : {}),
      ...(parsed.data.maxPrice !== undefined ? { basePrice: { lte: parsed.data.maxPrice } } : {}),
      ...(parsed.data.halal ? { halalStatus: { contains: 'halal', mode: 'insensitive' } } : {}),
      ...(parsed.data.fulfillmentType && parsed.data.fulfillmentType !== 'BOTH'
        ? { fulfillmentType: { in: [parsed.data.fulfillmentType, 'BOTH'] } }
        : {})
    };

    const orderBy = parsed.data.sort === 'price-high'
      ? [{ basePrice: 'desc' }]
      : parsed.data.sort === 'price-low'
        ? [{ basePrice: 'asc' }]
        : parsed.data.sort === 'min-order'
          ? [{ minOrder: 'asc' }, { basePrice: 'asc' }]
          : parsed.data.sort === 'newest'
            ? [{ createdAt: 'desc' }]
            : [{ updatedAt: 'desc' }];

    const skip = (parsed.data.page - 1) * parsed.data.limit;
    const [total, rawProducts] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: productInclude(),
        orderBy,
        skip,
        take: parsed.data.limit
      })
    ]);

    const products = rawProducts
      .map((product) => ({
        product,
        warning: availabilityWarning(product, eventDate, quantity ?? product.minOrder ?? 1)
      }))
      .filter((item) => !item.warning)
      .map((item) => publicProduct(item.product));

    return ok(res, {
      data: {
        products,
        pagination: {
          page: parsed.data.page,
          limit: parsed.data.limit,
          total,
          hasMore: skip + rawProducts.length < total
        },
        appliedFilters: {
          keyword,
          location: parsed.data.location || '',
          date: parsed.data.date || '',
          quantity,
          category: parsed.data.category || '',
          maxPrice: parsed.data.maxPrice ?? null
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/categories', async (req, res, next) => {
  try {
    const prisma = prismaOrSetupError(res);
    if (!prisma || res.headersSent) return;
    const groups = await prisma.product.groupBy({
      by: ['category'],
      where: { status: 'ACTIVE', deletedAt: null, vendor: { status: 'ACTIVE', deletedAt: null } },
      _count: { category: true },
      orderBy: { category: 'asc' }
    });
    return ok(res, {
      data: {
        categories: groups.map((group) => ({ name: group.category, count: group._count.category }))
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/vendors', async (req, res, next) => {
  try {
    const prisma = prismaOrSetupError(res);
    if (!prisma || res.headersSent) return;
    const vendors = await prisma.vendor.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      include: {
        _count: { select: { products: true, reviews: true } },
        reviews: { where: { moderationStatus: 'VISIBLE' }, select: { rating: true }, take: 50 }
      },
      orderBy: { storeName: 'asc' }
    });
    return ok(res, {
      data: {
        vendors: vendors.map((vendor) => publicVendor(vendor, {
          averageRating: vendor.reviews.length
            ? vendor.reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / vendor.reviews.length
            : 0
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/vendors/:slug', async (req, res, next) => {
  try {
    const prisma = prismaOrSetupError(res);
    if (!prisma || res.headersSent) return;
    const vendor = await prisma.vendor.findFirst({
      where: {
        OR: [{ slug: req.params.slug }, { id: req.params.slug }, { legacyId: /^\d+$/.test(req.params.slug) ? `json-vendor-${req.params.slug}` : req.params.slug }],
        status: 'ACTIVE',
        deletedAt: null
      },
      include: {
        _count: { select: { products: true, reviews: true } },
        reviews: { where: { moderationStatus: 'VISIBLE' }, select: { rating: true }, take: 50 },
        products: {
          where: { status: 'ACTIVE', deletedAt: null },
          include: productInclude(),
          take: 24,
          orderBy: { updatedAt: 'desc' }
        }
      }
    });
    if (!vendor) return fail(res, 404, 'VENDOR_NOT_FOUND', 'Vendor aktif tidak ditemukan.');
    return ok(res, {
      data: {
        vendor: publicVendor(vendor, {
          averageRating: vendor.reviews.length
            ? vendor.reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / vendor.reviews.length
            : 0
        }),
        products: vendor.products.map(publicProduct)
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/products/:slug', async (req, res, next) => {
  try {
    const prisma = prismaOrSetupError(res);
    if (!prisma || res.headersSent) return;
    const product = await prisma.product.findFirst({
      where: buildProductLookup(req.params.slug),
      include: productInclude()
    });
    if (!product) return fail(res, 404, 'PRODUCT_NOT_FOUND', 'Produk aktif tidak ditemukan.');
    return ok(res, { data: { product: publicProduct(product) } });
  } catch (error) {
    next(error);
  }
});

router.get('/products/:id/availability', async (req, res, next) => {
  try {
    const prisma = prismaOrSetupError(res);
    if (!prisma || res.headersSent) return;
    const product = await prisma.product.findFirst({
      where: buildProductLookup(req.params.id),
      include: { vendor: { include: { blockedDates: true } }, availability: true }
    });
    if (!product) return fail(res, 404, 'PRODUCT_NOT_FOUND', 'Produk aktif tidak ditemukan.');

    const date = parseDateOnly(req.query.date);
    const quantity = Number(req.query.quantity || product.minOrder || 1);
    const warning = availabilityWarning(product, date, quantity);
    const availability = date
      ? product.availability.find((item) => item.date.toISOString().slice(0, 10) === date.toISOString().slice(0, 10))
      : null;
    const remaining = availability ? Number(availability.capacity || 0) - Number(availability.reservedQty || 0) : null;
    return ok(res, {
      data: {
        available: !warning,
        warning,
        date: req.query.date || null,
        remainingCapacity: remaining,
        minOrder: product.minOrder
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/availability', async (req, res, next) => {
  try {
    const prisma = prismaOrSetupError(res);
    if (!prisma || res.headersSent) return;
    const product = await prisma.product.findFirst({
      where: buildProductLookup(req.params.id),
      include: { vendor: { include: { blockedDates: true } }, availability: true }
    });
    if (!product) return fail(res, 404, 'PRODUCT_NOT_FOUND', 'Produk aktif tidak ditemukan.');

    const date = parseDateOnly(req.query.date);
    const quantity = Number(req.query.quantity || product.minOrder || 1);
    const warning = availabilityWarning(product, date, quantity);
    const availability = date
      ? product.availability.find((item) => item.date.toISOString().slice(0, 10) === date.toISOString().slice(0, 10))
      : null;
    const remaining = availability ? Number(availability.capacity || 0) - Number(availability.reservedQty || 0) : null;
    return ok(res, {
      data: {
        available: !warning,
        warning,
        date: req.query.date || null,
        remainingCapacity: remaining,
        minOrder: product.minOrder
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const prisma = prismaOrSetupError(res);
    if (!prisma || res.headersSent) return;
    const product = await prisma.product.findFirst({
      where: buildProductLookup(req.params.slug),
      include: productInclude()
    });
    if (!product) return fail(res, 404, 'PRODUCT_NOT_FOUND', 'Produk aktif tidak ditemukan.');
    return ok(res, { data: { product: publicProduct(product) } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
module.exports.publicProduct = publicProduct;
module.exports.productInclude = productInclude;
module.exports.buildProductLookup = buildProductLookup;
