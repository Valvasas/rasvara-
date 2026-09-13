const crypto = require('crypto');

function safeEqual(a = '', b = '') {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('base64url');
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 32, 'sha256').toString('base64url');
  return `pbkdf2:120000:${salt}:${hash}`;
}

function verifyPassword(password, stored = '') {
  const [scheme, rawIterations, salt, expected] = String(stored).split(':');
  const iterations = Number(rawIterations);
  if (scheme !== 'pbkdf2' || !iterations || !salt || !expected) return false;
  const actual = crypto.pbkdf2Sync(String(password), salt, iterations, 32, 'sha256').toString('base64url');
  return safeEqual(actual, expected);
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('base64url');
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(String(value)).digest('base64url');
}

module.exports = {
  hashPassword,
  randomToken,
  safeEqual,
  sha256,
  sign,
  verifyPassword
};
