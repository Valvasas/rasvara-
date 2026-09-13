const fs = require('fs');
const path = 'C:/Users/INFINIX/Documents/Annie_Catering/backend/server.js';
let content = fs.readFileSync(path, 'utf8');
const routesToUpdate = [
  "app.use('/api/vendor/marketplace', requireVendor, vendorMarketplaceOrderRoutes);",
  "app.post('/api/vendor/upload-image', requireVendor, (req, res) => {",
  "app.get('/api/vendor/menus', requireVendor, (req, res) => {",
  "app.post('/api/vendor/menus', requireVendor, (req, res) => {",
  "app.put('/api/vendor/menus/:id', requireVendor, (req, res) => {",
  "app.delete('/api/vendor/menus/:id', requireVendor, (req, res) => {",
  "app.get('/api/vendor/orders', requireVendor, (req, res) => {",
  "app.put('/api/vendor/orders/:id/status', requireVendor, (req, res) => {",
  "app.get('/api/vendor/bookkeeping-summary', requireVendor, (req, res) => {",
  "app.get('/api/vendor/ledger', requireVendor, (req, res) => {",
  "app.post('/api/vendor/ledger', requireVendor, (req, res) => {",
  "app.delete('/api/vendor/ledger/:id', requireVendor, (req, res) => {",
  "app.get('/api/vendor/reviews', requireVendor, (req, res) => {"
];
for (const route of routesToUpdate) {
  content = content.replace(route, route.replace('requireVendor', 'requireActiveVendor'));
}
fs.writeFileSync(path, content, 'utf8');
console.log('done');
