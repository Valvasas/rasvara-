const API_URL = '/api';
let vendorCsrfToken = sessionStorage.getItem('vendorCsrfToken') || '';
let bookkeepingData = { summary: {}, dailySales: [], topProducts: [], recentOrders: [], ledger: [] };

const getEl = (id) => document.getElementById(id);
const formatPrice = (amount = 0) => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
}).format(Number(amount) || 0);
const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

function showBookToast(message, type = 'info') {
    const root = getEl('book-toast-root');
    if (!root) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<div class="toast-icon"><i class="fas ${type === 'error' ? 'fa-triangle-exclamation' : 'fa-check'}"></i></div><div>${escapeHtml(message)}</div>`;
    root.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 20);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 250);
    }, 3400);
}

async function bookFetch(url, options = {}) {
    const headers = new Headers(options.headers || {});
    const method = (options.method || 'GET').toUpperCase();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && vendorCsrfToken) {
        headers.set('X-CSRF-Token', vendorCsrfToken);
    }
    const response = await fetch(url, { ...options, credentials: 'same-origin', headers });
    if (response.status === 401 || response.status === 403) window.location.href = '/vendor';
    return response;
}

async function loadBookkeepingData() {
    try {
        const sessionRes = await bookFetch(`${API_URL}/vendor/session`);
        if (!sessionRes.ok) throw new Error('Sesi pedagang perlu login ulang.');
        const session = await sessionRes.json();
        vendorCsrfToken = session.csrfToken || vendorCsrfToken;
        sessionStorage.setItem('vendorCsrfToken', vendorCsrfToken);
        getEl('bookkeeping-store-name').textContent = `${session.vendor.storeName} - laporan penjualan dan cashflow`;

        const response = await bookFetch(`${API_URL}/vendor/bookkeeping-summary`);
        if (!response.ok) throw new Error('Gagal memuat pembukuan.');
        bookkeepingData = await response.json();
        renderBookkeeping();
    } catch (error) {
        showBookToast(error.message || 'Gagal memuat pembukuan.', 'error');
    }
}

function renderBookkeeping() {
    const summary = bookkeepingData.summary || {};
    getEl('book-sales-revenue').textContent = formatPrice(summary.salesRevenue || 0);
    getEl('book-gross-profit').textContent = formatPrice(summary.grossProfit || 0);
    getEl('book-net-cashflow').textContent = formatPrice(summary.netCashflow || 0);
    getEl('book-order-count').textContent = summary.orderCount || 0;
    getEl('book-pending-orders').textContent = `${summary.pendingOrderCount || 0} berjalan`;
    renderSalesChart();
    renderTopProducts();
    renderRecentOrders();
    renderLedgerTable();
}

function renderSalesChart() {
    const chart = getEl('book-sales-chart');
    const days = bookkeepingData.dailySales || [];
    if (!chart) return;
    if (!days.length) {
        chart.innerHTML = '<div class="empty-panel">Belum ada data omzet.</div>';
        return;
    }
    const maxRevenue = Math.max(...days.map((day) => Number(day.revenue || 0)), 1);
    chart.innerHTML = days.map((day) => {
        const height = Math.max(8, Math.round((Number(day.revenue || 0) / maxRevenue) * 180));
        return `
            <div class="bar-item" title="${escapeHtml(day.date)} - ${formatPrice(day.revenue)}">
                <div class="bar-fill" style="height:${height}px"></div>
                <div class="bar-label">${escapeHtml(day.date.slice(5))}</div>
            </div>
        `;
    }).join('');
}

function renderTopProducts() {
    const list = getEl('book-top-products');
    const products = bookkeepingData.topProducts || [];
    if (!list) return;
    list.innerHTML = products.map((product) => `
        <div class="compact-item">
            <div>
                <strong>${escapeHtml(product.name)}</strong>
                <span>${Number(product.qty || 0)} item terjual</span>
            </div>
            <b>${formatPrice(product.revenue)}</b>
        </div>
    `).join('') || '<div class="empty-panel">Belum ada produk terjual.</div>';
}

function renderRecentOrders() {
    const list = getEl('book-recent-orders');
    const orders = bookkeepingData.recentOrders || [];
    if (!list) return;
    list.innerHTML = orders.map((order) => `
        <div class="compact-item">
            <div>
                <strong>${escapeHtml(order.customerName)}</strong>
                <span>${escapeHtml(order.status)} - ${new Date(order.createdAt).toLocaleString('id-ID')}</span>
            </div>
            <b>${formatPrice(order.vendorRevenue)}</b>
        </div>
    `).join('') || '<div class="empty-panel">Belum ada order.</div>';
}

function renderLedgerTable() {
    const tbody = getEl('book-ledger-body');
    const ledger = bookkeepingData.ledger || [];
    if (!tbody) return;
    tbody.innerHTML = ledger.map((entry) => `
        <tr>
            <td>${new Date(entry.date).toLocaleDateString('id-ID')}</td>
            <td><span class="mini-badge ${entry.type === 'expense' ? 'danger' : ''}">${entry.type === 'expense' ? 'Keluar' : 'Masuk'}</span></td>
            <td><strong>${escapeHtml(entry.category)}</strong><br><small>${escapeHtml(entry.description || '-')}</small></td>
            <td>${formatPrice(entry.amount)}</td>
            <td>${escapeHtml(entry.paymentMethod || 'Kas')}</td>
            <td><button class="btn-delete" onclick="deleteBookLedger(${entry.id})"><i class="fas fa-trash-alt"></i></button></td>
        </tr>
    `).join('') || '<tr><td colspan="6" class="empty-cell">Belum ada catatan kas manual.</td></tr>';
}

async function saveBookLedger() {
    try {
        const payload = {
            date: getEl('book-ledger-date').value || new Date().toISOString().slice(0, 10),
            type: getEl('book-ledger-type').value,
            category: getEl('book-ledger-category').value.trim(),
            amount: Number(getEl('book-ledger-amount').value),
            paymentMethod: getEl('book-ledger-payment').value.trim() || 'Kas',
            description: getEl('book-ledger-description').value.trim()
        };
        if (!payload.category || !Number.isFinite(payload.amount) || payload.amount <= 0) {
            throw new Error('Kategori dan nominal wajib diisi dengan benar.');
        }
        const response = await bookFetch(`${API_URL}/vendor/ledger`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Gagal menyimpan catatan.');
        ['book-ledger-category', 'book-ledger-amount', 'book-ledger-payment', 'book-ledger-description'].forEach((id) => { getEl(id).value = ''; });
        await loadBookkeepingData();
        showBookToast('Catatan pembukuan disimpan.', 'success');
    } catch (error) {
        showBookToast(error.message || 'Gagal menyimpan catatan.', 'error');
    }
}

async function deleteBookLedger(entryId) {
    const response = await bookFetch(`${API_URL}/vendor/ledger/${entryId}`, { method: 'DELETE' });
    if (!response.ok) return showBookToast('Gagal menghapus catatan.', 'error');
    await loadBookkeepingData();
    showBookToast('Catatan dihapus.', 'success');
}

window.addEventListener('DOMContentLoaded', loadBookkeepingData);
