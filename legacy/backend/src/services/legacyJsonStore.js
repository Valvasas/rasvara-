const fs = require('fs');
const path = require('path');

const LEGACY_DATA_DIR = path.join(__dirname, '..', '..', 'data');
const LEGACY_DATA_FILE = path.join(LEGACY_DATA_DIR, 'data.json');

function ensureLegacyDataDir() {
  if (!fs.existsSync(LEGACY_DATA_DIR)) {
    fs.mkdirSync(LEGACY_DATA_DIR, { recursive: true });
  }
}

function readLegacyJson(fallback = {}) {
  ensureLegacyDataDir();
  try {
    const raw = fs.readFileSync(LEGACY_DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`Legacy JSON fallback dipakai karena data.json gagal dibaca: ${error.message}`);
    }
    return fallback;
  }
}

function writeLegacyJson(data) {
  ensureLegacyDataDir();
  const tempFile = `${LEGACY_DATA_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tempFile, LEGACY_DATA_FILE);
}

function getLegacyDataFilePath() {
  return LEGACY_DATA_FILE;
}

module.exports = {
  LEGACY_DATA_DIR,
  LEGACY_DATA_FILE,
  readLegacyJson,
  writeLegacyJson,
  getLegacyDataFilePath
};
