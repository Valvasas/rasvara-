const test = require('node:test');
const assert = require('node:assert/strict');

const { hashPassword, verifyPassword } = require('../src/utils/crypto');
const { canAccessVendorResource, hasRole } = require('../src/middleware/rbac');
const { assertAllowedImage } = require('../src/services/storage');
const { validateEnv } = require('../src/config/env');

test('password hash verifies correct password and rejects wrong password', () => {
  const stored = hashPassword('StrongPass123');
  assert.match(stored, /^pbkdf2:120000:/);
  assert.equal(verifyPassword('StrongPass123', stored), true);
  assert.equal(verifyPassword('wrong-password', stored), false);
});

test('vendor ownership check blocks cross-vendor access', () => {
  const vendorUser = {
    role: 'VENDOR_STAFF',
    vendorMemberships: [{ vendorId: 'vendor-a', role: 'VENDOR_STAFF' }]
  };
  assert.equal(canAccessVendorResource(vendorUser, 'vendor-a'), true);
  assert.equal(canAccessVendorResource(vendorUser, 'vendor-b'), false);
});

test('admin roles can access vendor resource without membership', () => {
  assert.equal(canAccessVendorResource({ role: 'ADMIN', vendorMemberships: [] }, 'vendor-b'), true);
  assert.equal(hasRole({ role: 'CUSTOMER' }, ['ADMIN']), false);
});

test('image validation allows supported MIME and rejects active content', () => {
  assert.doesNotThrow(() => assertAllowedImage({ mimetype: 'image/png', size: 1000 }, 2000));
  assert.throws(() => assertAllowedImage({ mimetype: 'text/html', size: 1000 }, 2000), /Format gambar/);
  assert.throws(() => assertAllowedImage({ mimetype: 'image/png', size: 5000 }, 2000), /maksimal/);
});

test('production env validation rejects missing database and weak secrets', () => {
  const result = validateEnv({
    NODE_ENV: 'production',
    PORT: '3000',
    ADMIN_PIN: 'change-this-pin',
    ADMIN_PASSWORD: 'change-this-password',
    ADMIN_SESSION_SECRET: 'short',
    CUSTOMER_SESSION_SECRET: 'short',
    STORAGE_DRIVER: 'local'
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((message) => message.includes('DATABASE_URL')));
  assert.ok(result.errors.some((message) => message.includes('ADMIN_SESSION_SECRET')));
  assert.ok(result.errors.some((message) => message.includes('STORAGE_DRIVER')));
});
