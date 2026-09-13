const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const { getPrisma, disconnectPrisma } = require('../src/services/prisma');

const DATA_FILE = path.join(__dirname, '..', 'data', 'data.json');
const BACKUP_DIR = path.join(__dirname, '..', 'data', 'backups');
const REPORT_DIR = path.join(__dirname, '..', 'data', 'migration-reports');

function slugify(value, fallback = 'item') {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || fallback;
}

function stableSuffix(value) {
  return crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 8);
}

function toDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function money(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
}

function orderStatusFromLegacy(status) {
  const map = {
    'Menunggu Persetujuan': 'WAITING_VENDOR_CONFIRMATION',
    Disetujui: 'CONFIRMED',
    Diproses: 'BEING_PREPARED',
    'Siap Dikirim/Diambil': 'READY',
    Selesai: 'COMPLETED',
    Batal: 'CANCELLED'
  };
  return map[status] || 'WAITING_VENDOR_CONFIRMATION';
}

function productStatusFromLegacy(availability) {
  if (availability === 'draft') return 'DRAFT';
  if (availability === 'sold_out') return 'SOLD_OUT';
  return 'ACTIVE';
}

function readLegacyData() {
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error(`File JSON lama tidak ditemukan: ${DATA_FILE}`);
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function backupLegacyFile() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const backupFile = path.join(BACKUP_DIR, `data-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.copyFileSync(DATA_FILE, backupFile);
  return backupFile;
}

async function upsertOfficialVendor(prisma, legacyData) {
  const business = legacyData.settings?.business || {};
  return prisma.vendor.upsert({
    where: { legacyId: 'json-vendor-0' },
    update: {
      storeName: `${business.brandName || 'Rasvara'} Official`,
      email: business.email || null,
      whatsapp: business.whatsapp || business.phone || null,
      address: business.address || null,
      status: 'ACTIVE'
    },
    create: {
      legacyId: 'json-vendor-0',
      storeName: `${business.brandName || 'Rasvara'} Official`,
      slug: `official-${stableSuffix('json-vendor-0')}`,
      ownerName: 'Admin Marketplace',
      email: business.email || null,
      whatsapp: business.whatsapp || business.phone || null,
      address: business.address || null,
      status: 'ACTIVE'
    }
  });
}

async function migrateVendors(prisma, legacyData, report) {
  const vendorMap = new Map();
  const officialVendor = await upsertOfficialVendor(prisma, legacyData);
  vendorMap.set(0, officialVendor);
  report.vendors.migrated += 1;

  for (const vendor of legacyData.vendors || []) {
    try {
      const legacyId = `json-vendor-${vendor.id}`;
      const migrated = await prisma.vendor.upsert({
        where: { legacyId },
        update: {
          storeName: vendor.storeName || vendor.businessName || 'Toko Catering',
          ownerName: vendor.ownerName || null,
          email: vendor.email || null,
          whatsapp: vendor.whatsapp || null,
          address: vendor.address || null,
          bio: vendor.bio || null,
          avatarUrl: vendor.avatar || null,
          status: vendor.status === 'suspended' ? 'SUSPENDED' : 'ACTIVE'
        },
        create: {
          legacyId,
          storeName: vendor.storeName || vendor.businessName || 'Toko Catering',
          slug: `${slugify(vendor.storeName || vendor.businessName || 'vendor')}-${stableSuffix(legacyId)}`,
          ownerName: vendor.ownerName || null,
          email: vendor.email || null,
          whatsapp: vendor.whatsapp || null,
          address: vendor.address || null,
          bio: vendor.bio || null,
          avatarUrl: vendor.avatar || null,
          status: vendor.status === 'suspended' ? 'SUSPENDED' : 'ACTIVE',
          createdAt: toDate(vendor.createdAt) || new Date()
        }
      });
      vendorMap.set(Number(vendor.id), migrated);
      report.vendors.migrated += 1;
    } catch (error) {
      report.vendors.failed.push({ legacyId: vendor.id, error: error.message });
    }
  }

  return vendorMap;
}

async function migrateProducts(prisma, legacyData, vendorMap, report) {
  const productMap = new Map();
  for (const menu of legacyData.menus || []) {
    try {
      const legacyId = `json-menu-${menu.id}`;
      const vendor = vendorMap.get(Number(menu.vendorId || 0)) || vendorMap.get(0);
      const migrated = await prisma.product.upsert({
        where: { legacyId },
        update: {
          vendorId: vendor.id,
          name: menu.name,
          description: menu.desc || null,
          category: menu.category || 'lainnya',
          imageUrl: menu.image || null,
          basePrice: money(menu.price ?? menu.sellingPrice),
          costPrice: money(menu.costPrice),
          unit: menu.unitType || menu.unit || 'porsi',
          minOrder: Math.max(1, Number(menu.minOrder || 1)),
          status: productStatusFromLegacy(menu.availability)
        },
        create: {
          legacyId,
          vendorId: vendor.id,
          name: menu.name,
          slug: `${slugify(menu.name, 'menu')}-${stableSuffix(legacyId)}`,
          description: menu.desc || null,
          category: menu.category || 'lainnya',
          imageUrl: menu.image || null,
          basePrice: money(menu.price ?? menu.sellingPrice),
          costPrice: money(menu.costPrice),
          unit: menu.unitType || menu.unit || 'porsi',
          minOrder: Math.max(1, Number(menu.minOrder || 1)),
          status: productStatusFromLegacy(menu.availability)
        }
      });
      productMap.set(Number(menu.id), migrated);
      report.products.migrated += 1;
    } catch (error) {
      report.products.failed.push({ legacyId: menu.id, error: error.message });
    }
  }
  return productMap;
}

async function migrateOrders(prisma, legacyData, vendorMap, productMap, report) {
  for (const order of legacyData.orders || []) {
    try {
      const legacyId = `json-order-${order.id}`;
      const firstItem = Array.isArray(order.cartItems) ? order.cartItems[0] : null;
      const vendor = vendorMap.get(Number(firstItem?.vendorId || 0)) || vendorMap.get(0);
      const subtotal = money(order.total);
      const migrated = await prisma.order.upsert({
        where: { legacyId },
        update: {
          status: orderStatusFromLegacy(order.status),
          paymentStatus: order.status === 'Batal' ? 'FAILED' : 'PENDING',
          subtotal,
          grandTotal: subtotal,
          notes: order.notes || null,
          trackingToken: order.trackingToken || null
        },
        create: {
          legacyId,
          orderNumber: `LEGACY-${order.id}`,
          vendorId: vendor.id,
          status: orderStatusFromLegacy(order.status),
          paymentStatus: order.status === 'Batal' ? 'FAILED' : 'PENDING',
          eventDate: toDate(order.eventDate),
          fulfillmentType: order.fulfillmentType || 'Antar ke alamat',
          recipientName: order.customerName || null,
          recipientPhone: order.phone || null,
          notes: order.notes || null,
          subtotal,
          grandTotal: subtotal,
          feeSnapshot: {
            commissionRate: 0,
            commissionAmount: 0,
            serviceFee: 0,
            paymentFee: 0,
            deliveryFee: 0,
            discountAllocation: 0,
            vendorNetAmount: subtotal,
            platformRevenue: 0,
            migratedFrom: 'json'
          },
          policySnapshot: { migratedLegacyPolicy: true },
          trackingToken: order.trackingToken || null,
          createdAt: toDate(order.createdAt) || new Date()
        }
      });

      for (const item of order.cartItems || []) {
        const product = productMap.get(Number(item.id));
        const itemLegacyId = `${legacyId}-item-${item.id}`;
        const unitPrice = money(item.price ?? item.sellingPrice);
        const quantity = Math.max(1, Number(item.quantity || 1));
        await prisma.orderItem.upsert({
          where: { legacyId: itemLegacyId },
          update: {
            orderId: migrated.id,
            productId: product?.id || null,
            unitPrice,
            quantity,
            subtotal: unitPrice * quantity
          },
          create: {
            legacyId: itemLegacyId,
            orderId: migrated.id,
            productId: product?.id || null,
            productSnapshot: {
              legacyItemId: itemLegacyId,
              productName: item.name,
              vendorName: item.vendorName,
              image: item.image,
              unit: item.unitType,
              migratedFrom: 'json'
            },
            unitPrice,
            quantity,
            subtotal: unitPrice * quantity
          }
        });
      }

      const histories = Array.isArray(order.statusHistory) ? order.statusHistory : [];
      for (const [index, history] of histories.entries()) {
        await prisma.orderStatusHistory.upsert({
          where: { legacyId: `${legacyId}-status-${index}` },
          update: {
            status: orderStatusFromLegacy(history.status),
            note: history.note || 'Migrated legacy status.'
          },
          create: {
            legacyId: `${legacyId}-status-${index}`,
            orderId: migrated.id,
            status: orderStatusFromLegacy(history.status),
            note: history.note || 'Migrated legacy status.',
            createdAt: toDate(history.at) || toDate(order.createdAt) || new Date()
          }
        });
      }

      report.orders.migrated += 1;
    } catch (error) {
      report.orders.failed.push({ legacyId: order.id, error: error.message });
    }
  }
}

async function migrateLedger(prisma, legacyData, vendorMap, report) {
  for (const entry of legacyData.ledger || []) {
    try {
      const legacyId = `json-ledger-${entry.id}`;
      const vendor = vendorMap.get(Number(entry.vendorId || 0)) || vendorMap.get(0);
      await prisma.vendorBalanceTransaction.upsert({
        where: { idempotencyKey: legacyId },
        update: {},
        create: {
          vendorId: vendor.id,
          type: entry.type === 'expense' ? 'ADJUSTMENT_DEBIT' : 'ADJUSTMENT_CREDIT',
          amount: money(entry.amount),
          description: entry.description || entry.category || 'Migrated legacy ledger',
          metadata: { legacy: entry },
          idempotencyKey: legacyId,
          createdAt: toDate(entry.createdAt || entry.date) || new Date()
        }
      });
      report.ledger.migrated += 1;
    } catch (error) {
      report.ledger.failed.push({ legacyId: entry.id, error: error.message });
    }
  }
}

async function migrateReviews(prisma, legacyData, vendorMap, productMap, report) {
  for (const review of legacyData.reviews || []) {
    try {
      const legacyId = `json-review-${review.id}`;
      const vendor = vendorMap.get(Number(review.vendorId || 0)) || vendorMap.get(0);
      const product = productMap.get(Number(review.menuId || 0));
      await prisma.review.upsert({
        where: { legacyId },
        update: {
          rating: Math.max(1, Math.min(5, Number(review.rating || 5))),
          comment: review.comment || '',
          moderationStatus: review.status === 'hidden' ? 'HIDDEN' : 'LEGACY_UNVERIFIED'
        },
        create: {
          legacyId,
          vendorId: vendor.id,
          productId: product?.id || null,
          rating: Math.max(1, Math.min(5, Number(review.rating || 5))),
          comment: review.comment || '',
          isVerified: false,
          moderationStatus: review.status === 'hidden' ? 'HIDDEN' : 'LEGACY_UNVERIFIED',
          createdAt: toDate(review.createdAt) || new Date()
        }
      });
      report.reviews.migrated += 1;
    } catch (error) {
      report.reviews.failed.push({ legacyId: review.id, error: error.message });
    }
  }
}

async function main() {
  const legacyData = readLegacyData();
  const backupFile = backupLegacyFile();
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  const report = {
    startedAt: new Date().toISOString(),
    backupFile,
    vendors: { migrated: 0, failed: [] },
    products: { migrated: 0, failed: [] },
    orders: { migrated: 0, failed: [] },
    ledger: { migrated: 0, failed: [] },
    reviews: { migrated: 0, failed: [] }
  };

  const prisma = getPrisma();
  const vendorMap = await migrateVendors(prisma, legacyData, report);
  const productMap = await migrateProducts(prisma, legacyData, vendorMap, report);
  await migrateOrders(prisma, legacyData, vendorMap, productMap, report);
  await migrateLedger(prisma, legacyData, vendorMap, report);
  await migrateReviews(prisma, legacyData, vendorMap, productMap, report);

  report.finishedAt = new Date().toISOString();
  const reportFile = path.join(REPORT_DIR, `json-migration-${report.finishedAt.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf8');
  console.log(`Migrasi selesai. Report: ${reportFile}`);
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
