const express = require('express');
const { z } = require('zod');
const { requireCustomer } = require('../auth/customerAuth.routes');
const { calculateProductPrice, summarizePricedItems } = require('../pricing/pricing.service');
const { fail, fieldErrorsFromZod, ok } = require('../../utils/http');

const router = express.Router();

const addItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).optional().or(z.literal('')),
  quantity: z.coerce.number().int().positive(),
  addonIds: z.array(z.string().min(1)).default([])
}).passthrough();

const updateItemSchema = z.object({
  quantity: z.coerce.number().int().positive()
}).strict();

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

async function getActiveCart(prisma, userId) {
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

async function ensureActiveCart(prisma, userId, vendorId) {
  const cart = await prisma.cart.findFirst({
    where: { userId, status: 'ACTIVE' },
    include: { items: true },
    orderBy: { createdAt: 'desc' }
  });

  if (!cart) {
    return prisma.cart.create({
      data: { userId, vendorId, status: 'ACTIVE' }
    });
  }

  if (cart.vendorId && cart.vendorId !== vendorId && cart.items.length > 0) {
    const error = new Error('Keranjang hanya boleh berisi produk dari satu vendor. Kosongkan cart sebelum mengganti vendor.');
    error.code = 'CART_VENDOR_CONFLICT';
    error.status = 409;
    throw error;
  }

  if (cart.vendorId !== vendorId) {
    return prisma.cart.update({
      where: { id: cart.id },
      data: { vendorId }
    });
  }

  return cart;
}

function serializeCart(cart) {
  if (!cart) {
    return {
      id: null,
      vendorId: null,
      items: [],
      summary: { quantity: 0, subtotal: 0 }
    };
  }

  const items = (cart.items || []).map((item) => {
    const addonIds = parseAddonIds(item.addons);
    const pricing = calculateProductPrice(item.product, {
      quantity: item.quantity,
      variantId: item.variantId || undefined,
      addonIds
    });

    return {
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        imageUrl: item.product.imageUrl,
        unit: item.product.unit,
        minOrder: item.product.minOrder,
        status: item.product.status,
        vendor: {
          id: item.product.vendor.id,
          storeName: item.product.vendor.storeName,
          slug: item.product.vendor.slug
        }
      },
      pricing
    };
  });

  return {
    id: cart.id,
    vendorId: cart.vendorId,
    items,
    summary: summarizePricedItems(items)
  };
}

async function sendCart(req, res) {
  const cart = await getActiveCart(req.prisma, req.user.id);
  return ok(res, { cart: serializeCart(cart) });
}

router.get('/', requireCustomer, async (req, res, next) => {
  try {
    return sendCart(req, res);
  } catch (error) {
    next(error);
  }
});

router.post('/items', requireCustomer, async (req, res, next) => {
  try {
    const parsed = addItemSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Data item cart belum valid.', fieldErrorsFromZod(parsed.error));
    }

    const product = await req.prisma.product.findFirst({
      where: {
        id: parsed.data.productId,
        status: 'ACTIVE',
        deletedAt: null,
        vendor: { status: 'ACTIVE', deletedAt: null }
      },
      include: productInclude()
    });
    if (!product) return fail(res, 404, 'PRODUCT_NOT_FOUND', 'Produk aktif tidak ditemukan.');

    const pricing = calculateProductPrice(product, parsed.data);

    await req.prisma.$transaction(async (tx) => {
      const cart = await ensureActiveCart(tx, req.user.id, product.vendorId);
      const existing = await tx.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId: product.id,
          variantId: parsed.data.variantId || null
        }
      });

      const addonsSnapshot = {
        selected: pricing.addons
      };

      if (existing) {
        await tx.cartItem.update({
          where: { id: existing.id },
          data: {
            quantity: pricing.quantity,
            addons: addonsSnapshot
          }
        });
      } else {
        await tx.cartItem.create({
          data: {
            cartId: cart.id,
            productId: product.id,
            variantId: parsed.data.variantId || null,
            quantity: pricing.quantity,
            addons: addonsSnapshot
          }
        });
      }
    });

    return sendCart(req, res);
  } catch (error) {
    if (error.status) return fail(res, error.status, error.code || 'CART_ERROR', error.message);
    next(error);
  }
});

router.put('/items/:id', requireCustomer, async (req, res, next) => {
  try {
    const parsed = updateItemSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Quantity item belum valid.', fieldErrorsFromZod(parsed.error));
    }

    const cart = await getActiveCart(req.prisma, req.user.id);
    const item = cart?.items?.find((cartItem) => cartItem.id === req.params.id);
    if (!item) return fail(res, 404, 'CART_ITEM_NOT_FOUND', 'Item cart tidak ditemukan.');

    calculateProductPrice(item.product, {
      quantity: parsed.data.quantity,
      variantId: item.variantId || undefined,
      addonIds: parseAddonIds(item.addons)
    });

    await req.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: parsed.data.quantity }
    });

    return sendCart(req, res);
  } catch (error) {
    if (error.status) return fail(res, error.status, error.code || 'CART_ERROR', error.message);
    next(error);
  }
});

router.delete('/items/:id', requireCustomer, async (req, res, next) => {
  try {
    const cart = await getActiveCart(req.prisma, req.user.id);
    const item = cart?.items?.find((cartItem) => cartItem.id === req.params.id);
    if (!item) return fail(res, 404, 'CART_ITEM_NOT_FOUND', 'Item cart tidak ditemukan.');

    await req.prisma.cartItem.delete({ where: { id: item.id } });

    const remaining = await req.prisma.cartItem.count({ where: { cartId: cart.id } });
    if (remaining === 0) {
      await req.prisma.cart.update({ where: { id: cart.id }, data: { vendorId: null } });
    }

    return sendCart(req, res);
  } catch (error) {
    next(error);
  }
});

router.delete('/', requireCustomer, async (req, res, next) => {
  try {
    const cart = await req.prisma.cart.findFirst({ where: { userId: req.user.id, status: 'ACTIVE' } });
    if (cart) {
      await req.prisma.$transaction([
        req.prisma.cartItem.deleteMany({ where: { cartId: cart.id } }),
        req.prisma.cart.update({ where: { id: cart.id }, data: { vendorId: null } })
      ]);
    }
    return ok(res, { cart: serializeCart(null) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
