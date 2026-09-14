const crypto = require('crypto');
const path = require('path');

const IMAGE_MIME_EXT = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp']
]);

function assertAllowedImage(file = {}, maxSize = 1024 * 1024 * 3) {
  if (!IMAGE_MIME_EXT.has(file.mimetype)) {
    const error = new Error('Format gambar harus JPG, PNG, atau WEBP.');
    error.code = 'UNSUPPORTED_IMAGE_TYPE';
    throw error;
  }
  if (file.size && file.size > maxSize) {
    const error = new Error(`Ukuran gambar maksimal ${Math.round(maxSize / (1024 * 1024))}MB.`);
    error.code = 'IMAGE_TOO_LARGE';
    throw error;
  }
}

function buildSafeImageName(file = {}) {
  const ext = IMAGE_MIME_EXT.get(file.mimetype);
  if (!ext) throw new Error('Unsupported format');
  return `${Date.now()}-${crypto.randomUUID()}${ext}`;
}

function createStorageAdapter(config = {}) {
  const driver = config.driver || 'local';
  if (driver !== 'local') {
    return {
      driver,
      ready: false,
      publicPathPrefix: '',
      buildFileName: buildSafeImageName,
      validateImage: (file) => assertAllowedImage(file, config.maxImageSize),
      explain: () => `${driver} storage belum dikonfigurasi. Gunakan local untuk development atau lengkapi provider production.`
    };
  }

  return {
    driver: 'local',
    ready: true,
    publicPathPrefix: '/uploads',
    buildFileName: buildSafeImageName,
    validateImage: (file) => assertAllowedImage(file, config.maxImageSize),
    explain: () => 'Local storage aktif untuk development.'
  };
}

module.exports = {
  IMAGE_MIME_EXT,
  assertAllowedImage,
  buildSafeImageName,
  createStorageAdapter
};
