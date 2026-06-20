CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'VENDOR_OWNER', 'VENDOR_STAFF', 'ADMIN', 'SUPER_ADMIN');
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED', 'DELETED');
CREATE TYPE "VendorStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SOLD_OUT', 'ARCHIVED');
CREATE TYPE "FulfillmentType" AS ENUM ('PICKUP', 'DELIVERY', 'BOTH');
CREATE TYPE "OrderStatus" AS ENUM ('WAITING_PAYMENT', 'WAITING_VENDOR_CONFIRMATION', 'CONFIRMED', 'BEING_PREPARED', 'READY', 'DELIVERING', 'COMPLETED', 'CANCELLED', 'DISPUTED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');
CREATE TYPE "BalanceTransactionType" AS ENUM ('ORDER_CREDIT', 'COMMISSION_DEBIT', 'PAYMENT_FEE_DEBIT', 'REFUND_DEBIT', 'ADJUSTMENT_CREDIT', 'ADJUSTMENT_DEBIT', 'PAYOUT_DEBIT');
CREATE TYPE "PayoutStatus" AS ENUM ('REQUESTED', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED');
CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'WAITING_VENDOR_RESPONSE', 'WAITING_CUSTOMER_RESPONSE', 'UNDER_ADMIN_REVIEW', 'RESOLVED_REFUND', 'RESOLVED_PARTIAL_REFUND', 'RESOLVED_NO_REFUND', 'CANCELLED');
CREATE TYPE "ReviewModerationStatus" AS ENUM ('VISIBLE', 'HIDDEN', 'REPORTED', 'LEGACY_UNVERIFIED');
CREATE TYPE "NotificationType" AS ENUM ('ORDER_CREATED', 'PAYMENT_PAID', 'PAYMENT_EXPIRED', 'ORDER_STATUS_CHANGED', 'NEW_MESSAGE', 'DISPUTE_CREATED', 'DISPUTE_UPDATED', 'REFUND_PROCESSED', 'PAYOUT_PROCESSED', 'SECURITY');

CREATE TABLE "users" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "phone" TEXT UNIQUE,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
  "status" "AccountStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "emailVerifiedAt" TIMESTAMP(3),
  "phoneVerifiedAt" TIMESTAMP(3),
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3)
);

CREATE TABLE "sessions" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "csrfToken" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "vendors" (
  "id" TEXT PRIMARY KEY,
  "legacyId" TEXT UNIQUE,
  "storeName" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "ownerName" TEXT,
  "email" TEXT,
  "whatsapp" TEXT,
  "address" TEXT,
  "bio" TEXT,
  "avatarUrl" TEXT,
  "status" "VendorStatus" NOT NULL DEFAULT 'PENDING',
  "defaultCapacity" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3)
);

CREATE TABLE "vendor_members" (
  "id" TEXT PRIMARY KEY,
  "vendorId" TEXT NOT NULL REFERENCES "vendors"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" "UserRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("vendorId", "userId")
);

CREATE TABLE "vendor_bank_accounts" (
  "id" TEXT PRIMARY KEY,
  "vendorId" TEXT NOT NULL REFERENCES "vendors"("id") ON DELETE CASCADE,
  "bankName" TEXT NOT NULL,
  "accountHolderName" TEXT NOT NULL,
  "accountNumberLast4" TEXT NOT NULL,
  "encryptedPayload" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "products" (
  "id" TEXT PRIMARY KEY,
  "legacyId" TEXT UNIQUE,
  "vendorId" TEXT NOT NULL REFERENCES "vendors"("id") ON DELETE RESTRICT,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL,
  "imageUrl" TEXT,
  "basePrice" INTEGER NOT NULL,
  "costPrice" INTEGER NOT NULL DEFAULT 0,
  "unit" TEXT NOT NULL,
  "minOrder" INTEGER NOT NULL DEFAULT 1,
  "maxOrder" INTEGER,
  "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
  "allergenInfo" TEXT,
  "halalStatus" TEXT,
  "leadTimeHours" INTEGER NOT NULL DEFAULT 24,
  "rushSurcharge" INTEGER NOT NULL DEFAULT 0,
  "fulfillmentType" "FulfillmentType" NOT NULL DEFAULT 'BOTH',
  "serviceAreas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  UNIQUE ("vendorId", "slug")
);

CREATE TABLE "product_variants" (
  "id" TEXT PRIMARY KEY,
  "productId" TEXT NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "sku" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "product_price_tiers" (
  "id" TEXT PRIMARY KEY,
  "productId" TEXT NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "minQty" INTEGER NOT NULL,
  "maxQty" INTEGER,
  "unitPrice" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "product_addons" (
  "id" TEXT PRIMARY KEY,
  "productId" TEXT NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "product_availability" (
  "id" TEXT PRIMARY KEY,
  "productId" TEXT NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "date" TIMESTAMP(3) NOT NULL,
  "capacity" INTEGER NOT NULL,
  "reservedQty" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("productId", "date")
);

CREATE TABLE "vendor_operating_hours" (
  "id" TEXT PRIMARY KEY,
  "vendorId" TEXT NOT NULL REFERENCES "vendors"("id") ON DELETE CASCADE,
  "dayOfWeek" INTEGER NOT NULL,
  "opensAt" TEXT NOT NULL,
  "closesAt" TEXT NOT NULL,
  "isClosed" BOOLEAN NOT NULL DEFAULT false,
  UNIQUE ("vendorId", "dayOfWeek")
);

CREATE TABLE "vendor_blocked_dates" (
  "id" TEXT PRIMARY KEY,
  "vendorId" TEXT NOT NULL REFERENCES "vendors"("id") ON DELETE CASCADE,
  "date" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("vendorId", "date")
);

CREATE TABLE "addresses" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "label" TEXT NOT NULL,
  "recipientName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "addressLine" TEXT NOT NULL,
  "city" TEXT,
  "province" TEXT,
  "postalCode" TEXT,
  "notes" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3)
);

CREATE TABLE "carts" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "vendorId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "cart_items" (
  "id" TEXT PRIMARY KEY,
  "cartId" TEXT NOT NULL REFERENCES "carts"("id") ON DELETE CASCADE,
  "productId" TEXT NOT NULL REFERENCES "products"("id") ON DELETE RESTRICT,
  "variantId" TEXT,
  "quantity" INTEGER NOT NULL,
  "addons" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "orders" (
  "id" TEXT PRIMARY KEY,
  "legacyId" TEXT UNIQUE,
  "orderNumber" TEXT NOT NULL UNIQUE,
  "customerId" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "vendorId" TEXT NOT NULL REFERENCES "vendors"("id") ON DELETE RESTRICT,
  "addressId" TEXT REFERENCES "addresses"("id") ON DELETE SET NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'WAITING_PAYMENT',
  "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "eventDate" TIMESTAMP(3),
  "slot" TEXT,
  "fulfillmentType" TEXT NOT NULL,
  "recipientName" TEXT,
  "recipientPhone" TEXT,
  "notes" TEXT,
  "subtotal" INTEGER NOT NULL,
  "deliveryFee" INTEGER NOT NULL DEFAULT 0,
  "serviceFee" INTEGER NOT NULL DEFAULT 0,
  "discountAmount" INTEGER NOT NULL DEFAULT 0,
  "grandTotal" INTEGER NOT NULL,
  "feeSnapshot" JSONB NOT NULL,
  "policySnapshot" JSONB,
  "trackingToken" TEXT UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "order_items" (
  "id" TEXT PRIMARY KEY,
  "legacyId" TEXT UNIQUE,
  "orderId" TEXT NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "productId" TEXT REFERENCES "products"("id") ON DELETE SET NULL,
  "productSnapshot" JSONB NOT NULL,
  "variantSnapshot" JSONB,
  "addonsSnapshot" JSONB,
  "appliedTier" JSONB,
  "unitPrice" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "subtotal" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "order_status_history" (
  "id" TEXT PRIMARY KEY,
  "legacyId" TEXT UNIQUE,
  "orderId" TEXT NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "status" "OrderStatus" NOT NULL,
  "note" TEXT,
  "actorId" TEXT,
  "actorRole" "UserRole",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "payments" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "provider" TEXT NOT NULL,
  "providerRef" TEXT UNIQUE,
  "method" TEXT NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "amount" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "payment_events" (
  "id" TEXT PRIMARY KEY,
  "paymentId" TEXT NOT NULL REFERENCES "payments"("id") ON DELETE CASCADE,
  "provider" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("provider", "eventId")
);

CREATE TABLE "platform_fees" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "vendor_balances" (
  "id" TEXT PRIMARY KEY,
  "vendorId" TEXT NOT NULL REFERENCES "vendors"("id") ON DELETE CASCADE,
  "currency" TEXT NOT NULL DEFAULT 'IDR',
  "pending" INTEGER NOT NULL DEFAULT 0,
  "available" INTEGER NOT NULL DEFAULT 0,
  "held" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("vendorId", "currency")
);

CREATE TABLE "vendor_balance_transactions" (
  "id" TEXT PRIMARY KEY,
  "vendorId" TEXT NOT NULL REFERENCES "vendors"("id") ON DELETE CASCADE,
  "orderId" TEXT,
  "payoutId" TEXT,
  "type" "BalanceTransactionType" NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'IDR',
  "description" TEXT,
  "metadata" JSONB,
  "idempotencyKey" TEXT UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "payouts" (
  "id" TEXT PRIMARY KEY,
  "vendorId" TEXT NOT NULL REFERENCES "vendors"("id") ON DELETE RESTRICT,
  "amount" INTEGER NOT NULL,
  "status" "PayoutStatus" NOT NULL DEFAULT 'REQUESTED',
  "bankSnapshot" JSONB NOT NULL,
  "requestedBy" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "refunds" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "paymentId" TEXT REFERENCES "payments"("id") ON DELETE SET NULL,
  "amount" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
  "providerRef" TEXT UNIQUE,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "disputes" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "customerId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "vendorId" TEXT NOT NULL REFERENCES "vendors"("id") ON DELETE RESTRICT,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "requestedAmount" INTEGER,
  "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
  "vendorResponse" TEXT,
  "adminDecision" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "dispute_evidence" (
  "id" TEXT PRIMARY KEY,
  "disputeId" TEXT NOT NULL REFERENCES "disputes"("id") ON DELETE CASCADE,
  "fileUrl" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "reviews" (
  "id" TEXT PRIMARY KEY,
  "legacyId" TEXT UNIQUE,
  "orderId" TEXT REFERENCES "orders"("id") ON DELETE SET NULL,
  "customerId" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "vendorId" TEXT NOT NULL REFERENCES "vendors"("id") ON DELETE RESTRICT,
  "productId" TEXT REFERENCES "products"("id") ON DELETE SET NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT NOT NULL,
  "photoUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "moderationStatus" "ReviewModerationStatus" NOT NULL DEFAULT 'VISIBLE',
  "vendorResponse" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("orderId", "customerId")
);

CREATE TABLE "conversations" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL UNIQUE REFERENCES "orders"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "conversation_members" (
  "id" TEXT PRIMARY KEY,
  "conversationId" TEXT NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "lastReadAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("conversationId", "userId")
);

CREATE TABLE "messages" (
  "id" TEXT PRIMARY KEY,
  "conversationId" TEXT NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "senderId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "body" TEXT,
  "imageUrl" TEXT,
  "reportedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "notifications" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "audit_logs" (
  "id" TEXT PRIMARY KEY,
  "actorId" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "actorRole" "UserRole",
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "oldValue" JSONB,
  "newValue" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "users_role_idx" ON "users"("role");
CREATE INDEX "users_status_idx" ON "users"("status");
CREATE INDEX "sessions_user_revoked_idx" ON "sessions"("userId", "revokedAt");
CREATE INDEX "sessions_expires_idx" ON "sessions"("expiresAt");
CREATE INDEX "vendors_status_idx" ON "vendors"("status");
CREATE INDEX "vendor_members_user_role_idx" ON "vendor_members"("userId", "role");
CREATE INDEX "products_vendor_status_idx" ON "products"("vendorId", "status");
CREATE INDEX "products_category_idx" ON "products"("category");
CREATE INDEX "orders_customer_created_idx" ON "orders"("customerId", "createdAt");
CREATE INDEX "orders_vendor_status_idx" ON "orders"("vendorId", "status");
CREATE INDEX "orders_payment_status_idx" ON "orders"("paymentStatus");
CREATE INDEX "order_status_history_order_created_idx" ON "order_status_history"("orderId", "createdAt");
CREATE INDEX "payment_events_payment_idx" ON "payment_events"("paymentId");
CREATE INDEX "vendor_balance_transactions_vendor_created_idx" ON "vendor_balance_transactions"("vendorId", "createdAt");
CREATE INDEX "reviews_vendor_moderation_idx" ON "reviews"("vendorId", "moderationStatus");
CREATE INDEX "messages_conversation_created_idx" ON "messages"("conversationId", "createdAt");
CREATE INDEX "notifications_user_read_created_idx" ON "notifications"("userId", "readAt", "createdAt");
CREATE INDEX "audit_logs_actor_created_idx" ON "audit_logs"("actorId", "createdAt");
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs"("entityType", "entityId");
CREATE INDEX "audit_logs_action_created_idx" ON "audit_logs"("action", "createdAt");
