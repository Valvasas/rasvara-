const fs = require('fs');

const styleOverrides = `
/* UI OVERRIDES */
.hero { padding: 8rem 0; text-align: center; background: linear-gradient(to bottom, var(--cream-deep), var(--cream)); }
.hero h1 { font-size: clamp(3rem, 5vw, 5rem); margin-bottom: 1.5rem; letter-spacing: -0.02em; }
.hero-cta { display: inline-flex; gap: 1rem; margin-top: 2rem; justify-content: center; }
.btn-primary { background: var(--sage-dark); color: var(--white); padding: 1rem 2.5rem; border-radius: 50px; font-weight: 500; transition: transform 0.3s var(--ease-out), box-shadow 0.3s var(--ease-out); }
.btn-primary:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.trust-indicator { display: flex; justify-content: center; gap: 2rem; margin-top: 4rem; opacity: 0.7; font-size: 0.9rem; }
.filter-bar { display: flex; gap: 1rem; overflow-x: auto; padding: 1rem 0; border-bottom: 1px solid rgba(0,0,0,0.05); margin-bottom: 2rem; }
.filter-btn { padding: 0.5rem 1.5rem; border-radius: 40px; border: 1px solid var(--sand); background: transparent; transition: all 0.3s ease; }
.filter-btn.active, .filter-btn:hover { background: var(--sage); color: white; border-color: var(--sage); }
.product-card { background: white; border-radius: 16px; overflow: hidden; box-shadow: var(--shadow-xs); transition: all 0.4s var(--ease-out); border: 1px solid rgba(0,0,0,0.03); }
.product-card:hover { transform: translateY(-8px); box-shadow: var(--shadow-md); }
.vendor-card { padding: 2rem; background: white; border-radius: 16px; text-align: center; box-shadow: var(--shadow-sm); }
.cart-panel { border-left: 1px solid rgba(0,0,0,0.05); box-shadow: -10px 0 30px rgba(0,0,0,0.02); }
.empty-state { padding: 4rem 2rem; text-align: center; color: var(--muted); }
.loading-skeleton { animation: pulse 1.5s infinite ease-in-out; background: var(--sand-light); border-radius: 8px; }
@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
@media (max-width: 768px) { .hero-cta { flex-direction: column; } }
`;
fs.appendFileSync('C:/Users/INFINIX/Documents/Annie_Catering/public/style.css', styleOverrides, 'utf8');

const adminOverrides = `
/* ADMIN UI OVERRIDES */
.kpi-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
.kpi-card { background: white; padding: 1.5rem; border-radius: 12px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 0.5rem; border-top: 4px solid var(--sage-dark); }
.kpi-card span { font-size: 0.9rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
.kpi-card strong { font-size: 2rem; color: var(--charcoal); font-family: var(--font-display); }
.action-buttons { display: flex; gap: 0.5rem; }
.action-buttons button { padding: 0.5rem; border-radius: 8px; transition: all 0.2s ease; background: var(--cream); border: 1px solid var(--sand); }
.action-buttons button:hover { background: var(--white); transform: scale(1.05); box-shadow: var(--shadow-xs); }
.status-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; }
.status-badge.active { background: #e8f5e9; color: #2e7d32; }
.status-badge.pending { background: #fff3e0; color: #ef6c00; }
.status-badge.suspended { background: #ffebee; color: #c62828; }
.sidebar { background: var(--ink); color: var(--cream); }
.sidebar-menu li.active { background: rgba(255,255,255,0.1); border-left-color: var(--terracotta); }
.form-group { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.5rem; }
.form-group label { font-weight: 600; color: var(--charcoal); }
.form-group input, .form-group select, .form-group textarea { padding: 0.75rem; border: 1px solid var(--sand); border-radius: 8px; font-family: var(--font-body); }
.form-group input:focus { outline: none; border-color: var(--sage); box-shadow: 0 0 0 3px var(--sage-light); }
`;
fs.appendFileSync('C:/Users/INFINIX/Documents/Annie_Catering/public/admin.css', adminOverrides, 'utf8');

const vendorOverrides = `
/* VENDOR UI OVERRIDES */
.kpi-vendor { background: linear-gradient(135deg, var(--sage-dark), var(--sage)); color: white; padding: 2rem; border-radius: 16px; margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; box-shadow: var(--shadow-md); }
.recent-orders { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: var(--shadow-xs); }
.menu-table { width: 100%; border-collapse: separate; border-spacing: 0; }
.menu-table th { background: var(--cream-deep); padding: 1rem; text-align: left; font-weight: 600; }
.menu-table td { padding: 1rem; border-bottom: 1px solid var(--sand-light); vertical-align: middle; }
.menu-preview { width: 60px; height: 60px; border-radius: 8px; object-fit: cover; }
.inline-error { color: #d32f2f; font-size: 0.8rem; margin-top: 0.25rem; }
`;
fs.appendFileSync('C:/Users/INFINIX/Documents/Annie_Catering/public/vendor.css', vendorOverrides, 'utf8');
console.log('Styles appended successfully.');
