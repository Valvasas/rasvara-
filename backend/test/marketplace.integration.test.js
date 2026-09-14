const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('child_process');
const path = require('path');

const { getPrisma, disconnectPrisma } = require('../src/services/prisma');

const hasDatabase = Boolean(process.env.DATABASE_URL);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForReady(baseUrl) {
  const deadline = Date.now() + 15000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) return;
      lastError = new Error(`ready returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw lastError || new Error('Server tidak siap.');
}

async function request(baseUrl, pathName, options = {}) {
  const response = await fetch(`${baseUrl}${pathName}`, {
    ...options,
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.headers || {})
    },
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body
  });
  const text = await response.text();
  return { response, body: text ? JSON.parse(text) : {} };
}

test('marketplace search, product detail, and pricing preview use active database data', { skip: !hasDatabase }, async () => {
  const port = 4200 + Math.floor(Math.random() * 500);
  const baseUrl = `http://localhost:${port}`;
  const tag = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const prisma = getPrisma();
  let activeVendor;
  let suspendedVendor;
  let activeProduct;
  let draftProduct;
  let suspendedProduct;

  const server = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      DATABASE_URL: process.env.DATABASE_URL,
      CUSTOMER_SESSION_SECRET: process.env.CUSTOMER_SESSION_SECRET || 'test-customer-session-secret-at-least-32-chars'
    },
    stdio: 'ignore',
    windowsHide: true
  });

  try {
    activeVendor = await prisma.vendor.create({
      data: {
        legacyId: `marketplace-vendor-${tag}`,
        storeName: `Catering Aktif ${tag}`,
        slug: `catering-aktif-${tag}`,
        status: 'ACTIVE',
        address: 'Bandung Timur'
      }
    });
    suspendedVendor = await prisma.vendor.create({
      data: {
        legacyId: `marketplace-suspended-vendor-${tag}`,
        storeName: `Catering Suspended ${tag}`,
        slug: `catering-suspended-${tag}`,
        status: 'SUSPENDED',
        address: 'Bandung Timur'
      }
    });
    activeProduct = await prisma.product.create({
      data: {
        legacyId: `marketplace-product-${tag}`,
        vendorId: activeVendor.id,
        name: `Snack Box Premium ${tag}`,
        slug: `snack-box-premium-${tag}`,
        description: 'Snack box untuk rapat kantor.',
        category: 'snack-box',
        basePrice: 30000,
        unit: 'box',
        minOrder: 20,
        status: 'ACTIVE',
        halalStatus: 'HALAL',
        variants: {
          create: [{ name: 'Paket B', price: 32000, isDefault: true }]
        },
        addons: {
          create: [{ name: 'Air mineral', price: 3000, status: 'ACTIVE' }]
        },
        priceTiers: {
          create: [{ minQty: 50, maxQty: 99, unitPrice: 28000 }]
        }
      },
      include: { addons: true, variants: true }
    });
    draftProduct = await prisma.product.create({
      data: {
        legacyId: `marketplace-draft-product-${tag}`,
        vendorId: activeVendor.id,
        name: `Draft Product ${tag}`,
        slug: `draft-product-${tag}`,
        category: 'snack-box',
        basePrice: 10000,
        unit: 'box',
        minOrder: 1,
        status: 'DRAFT'
      }
    });
    suspendedProduct = await prisma.product.create({
      data: {
        legacyId: `marketplace-suspended-product-${tag}`,
        vendorId: suspendedVendor.id,
        name: `Suspended Product ${tag}`,
        slug: `suspended-product-${tag}`,
        category: 'snack-box',
        basePrice: 10000,
        unit: 'box',
        minOrder: 1,
        status: 'ACTIVE'
      }
    });

    await waitForReady(baseUrl);

    const lowQuantity = await request(baseUrl, `/api/marketplace/search?keyword=${encodeURIComponent(tag)}&quantity=10`);
    assert.equal(lowQuantity.response.status, 200);
    assert.equal(lowQuantity.body.data.products.some((product) => product.marketplaceId === activeProduct.id), false);

    const browseCatalog = await request(baseUrl, `/api/marketplace/search?keyword=${encodeURIComponent(tag)}`);
    assert.equal(browseCatalog.response.status, 200);
    assert.equal(browseCatalog.body.data.products.some((product) => product.marketplaceId === activeProduct.id), true);

    const search = await request(baseUrl, `/api/marketplace/search?keyword=${encodeURIComponent(tag)}&location=Bandung&quantity=50&halal=true`);
    assert.equal(search.response.status, 200);
    const ids = search.body.data.products.map((product) => product.marketplaceId);
    assert.ok(ids.includes(activeProduct.id));
    assert.equal(ids.includes(draftProduct.id), false);
    assert.equal(ids.includes(suspendedProduct.id), false);

    const detail = await request(baseUrl, `/api/products/${activeProduct.slug}`);
    assert.equal(detail.response.status, 200);
    assert.equal(detail.body.data.product.marketplaceId, activeProduct.id);
    assert.equal(detail.body.data.product.variants.length, 1);
    assert.equal(detail.body.data.product.addons.length, 1);

    const preview = await request(baseUrl, '/api/pricing/preview', {
      method: 'POST',
      body: {
        productId: activeProduct.id,
        variantId: activeProduct.variants[0].id,
        addonIds: [activeProduct.addons[0].id],
        quantity: 50,
        fulfillmentType: 'DELIVERY'
      }
    });
    assert.equal(preview.response.status, 200);
    assert.equal(preview.body.data.unitPrice, 28000);
    assert.equal(preview.body.data.addonTotal, 150000);
    assert.equal(preview.body.data.grandTotal, (28000 + 3000) * 50);
  } finally {
    server.kill();
    await prisma.productAddon.deleteMany({ where: { productId: { in: [activeProduct?.id, draftProduct?.id, suspendedProduct?.id].filter(Boolean) } } });
    await prisma.productVariant.deleteMany({ where: { productId: { in: [activeProduct?.id, draftProduct?.id, suspendedProduct?.id].filter(Boolean) } } });
    await prisma.productPriceTier.deleteMany({ where: { productId: { in: [activeProduct?.id, draftProduct?.id, suspendedProduct?.id].filter(Boolean) } } });
    await prisma.product.deleteMany({ where: { id: { in: [activeProduct?.id, draftProduct?.id, suspendedProduct?.id].filter(Boolean) } } });
    await prisma.vendor.deleteMany({ where: { id: { in: [activeVendor?.id, suspendedVendor?.id].filter(Boolean) } } });
    await disconnectPrisma();
  }
});
