const API_URL = '/api';
let adminMenus = [];
let adminOrders = [];
let adminVendors = [];
let siteSettings = {};
let salesHistoryData = { orders: [], summary: {} };
let ledgerData = { entries: [], summary: {} };
let adminCsrfToken = sessionStorage.getItem('adminCsrfToken') || '';

const ORDER_STATUSES = [
    'Menunggu Persetujuan',
    'Disetujui',
    'Diproses',
    'Siap Dikirim/Diambil',
    'Selesai',
    'Batal'
];

const formatPrice = (amount = 0) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(Number(amount) || 0);
};

const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const getEl = (id) => document.getElementById(id);

const setFieldValue = (id, value = '') => {
    const field = getEl(id);
    if (field) field.value = value || '';
};

async function authFetch(url, options = {}) {
    const headers = new Headers(options.headers || {});
    const method = (options.method || 'GET').toUpperCase();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && adminCsrfToken) {
        headers.set('X-CSRF-Token', adminCsrfToken);
    }

    const response = await fetch(url, {
        ...options,
        credentials: 'same-origin',
        headers
    });

    if (response.status === 401 || response.status === 403) {
        sessionStorage.removeItem('adminLoggedIn');
        sessionStorage.removeItem('adminCsrfToken');
        adminCsrfToken = '';
        const loginSection = getEl('login-section');
        const dashboardSection = getEl('dashboard-section');
        if (loginSection && dashboardSection) {
            loginSection.style.display = 'flex';
            dashboardSection.style.display = 'none';
        }
    }

    return response;
}

function showToast(message, type = 'info') {
    const root = getEl('admin-toast-root');
    if (!root) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-icon"><i class="fas ${type === 'success' ? 'fa-check' : type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-info'}"></i></div>
        <div>${escapeHtml(message)}</div>
    `;
    root.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 20);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 250);
    }, 3600);
}

function confirmAction(message, title = 'Konfirmasi') {
    const dialog = getEl('admin-dialog');
    const titleEl = getEl('admin-dialog-title');
    const messageEl = getEl('admin-dialog-message');
    const cancelBtn = getEl('admin-dialog-cancel');
    const confirmBtn = getEl('admin-dialog-confirm');
    if (!dialog || !titleEl || !messageEl || !cancelBtn || !confirmBtn) return Promise.resolve(false);

    titleEl.textContent = title;
    messageEl.textContent = message;
    dialog.classList.add('active');

    return new Promise((resolve) => {
        const cleanup = (result) => {
            dialog.classList.remove('active');
            cancelBtn.removeEventListener('click', onCancel);
            confirmBtn.removeEventListener('click', onConfirm);
            resolve(result);
        };
        const onCancel = () => cleanup(false);
        const onConfirm = () => cleanup(true);
        cancelBtn.addEventListener('click', onCancel);
        confirmBtn.addEventListener('click', onConfirm);
    });
}

function showInfoDialog(message, title = 'Detail') {
    const dialog = getEl('admin-dialog');
    const titleEl = getEl('admin-dialog-title');
    const messageEl = getEl('admin-dialog-message');
    const cancelBtn = getEl('admin-dialog-cancel');
    const confirmBtn = getEl('admin-dialog-confirm');
    if (!dialog || !titleEl || !messageEl || !cancelBtn || !confirmBtn) {
        showToast(message, 'info');
        return;
    }

    titleEl.textContent = title;
    messageEl.textContent = message;
    cancelBtn.style.display = 'none';
    confirmBtn.textContent = 'Tutup';
    dialog.classList.add('active');

    const close = () => {
        dialog.classList.remove('active');
        cancelBtn.style.display = '';
        confirmBtn.textContent = 'Lanjut';
        confirmBtn.removeEventListener('click', close);
    };
    confirmBtn.addEventListener('click', close);
}

window.toggleLoginVisibility = function() {
    const pinInput = getEl('admin-pin');
    const passInput = getEl('admin-password');
    const toggleCheckbox = getEl('toggle-password');
    if (!pinInput || !passInput || !toggleCheckbox) return;

    const isText = toggleCheckbox.checked;
    pinInput.type = isText ? 'text' : 'password';
    passInput.type = isText ? 'text' : 'password';
};

window.handleLogin = async function(event) {
    if (event) event.preventDefault();

    const pinElement = getEl('admin-pin');
    const passwordElement = getEl('admin-password');
    if (!pinElement || !passwordElement) {
        showToast('Form login tidak tersedia. Muat ulang halaman.', 'error');
        return;
    }

    const pin = pinElement.value.trim();
    const password = passwordElement.value.trim();
    if (!pin || !password) {
        showToast('Mohon isi PIN dan Password.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/login`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Login gagal.');
        }

        const data = await response.json();
        adminCsrfToken = data.csrfToken || '';
        sessionStorage.setItem('adminLoggedIn', 'true');
        sessionStorage.setItem('adminCsrfToken', adminCsrfToken);
        showDashboard();
        await loadAdminData();
    } catch (error) {
        showToast(error.message, 'error');
        pinElement.value = '';
        passwordElement.value = '';
    }
};

window.logout = async function() {
    const proceed = await confirmAction('Yakin ingin keluar dari Pusat Kendali?', 'Keluar dari Admin');
    if (!proceed) return;
    if (adminCsrfToken) {
        await authFetch(`${API_URL}/admin/logout`, { method: 'POST' }).catch(() => {});
    }
    sessionStorage.removeItem('adminLoggedIn');
    sessionStorage.removeItem('adminCsrfToken');
    adminCsrfToken = '';
    getEl('login-section').style.display = 'flex';
    getEl('dashboard-section').style.display = 'none';
    getEl('login-form').reset();
};

window.switchTab = function(event, tabId) {
    document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.sidebar-menu li').forEach(li => li.classList.remove('active'));
    const tab = getEl(tabId);
    if (tab) tab.classList.add('active');
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
};

window.loadAdminData = async function() {
    try {
        await Promise.all([loadMenuData(), loadOrderData(), loadSettingsData(), loadSalesHistory(), loadLedgerData(), loadVendorDataAdmin()]);
        populatePromoSettings(siteSettings);
        renderAdminStats();
        renderDashboardPanels();
    } catch (error) {
        console.error(error);
        showToast(error.message || 'Gagal memuat data admin.', 'error');
    }
};

async function loadMenuData() {
    const response = await authFetch(`${API_URL}/menus?includeCost=true`);
    if (!response.ok) throw new Error('Gagal memuat data menu.');
    adminMenus = await response.json();
    renderAdminMenuTable();
    populatePromoProductOptions(siteSettings.highlight?.productId);
}

async function loadOrderData() {
    const response = await authFetch(`${API_URL}/orders?includeCost=true`);
    if (!response.ok) throw new Error('Gagal memuat daftar pesanan.');
    adminOrders = await response.json();
    renderOrdersTable();
}

async function loadSettingsData() {
    const response = await authFetch(`${API_URL}/settings`);
    if (!response.ok) throw new Error('Gagal memuat pengaturan.');
    siteSettings = await response.json() || {};
    populateBusinessSettings(siteSettings);
    populateGeneralSettings(siteSettings);
    populatePromoSettings(siteSettings);
}

async function loadSalesHistory() {
    const startDate = getEl('sales-start-date')?.value || '';
    const endDate = getEl('sales-end-date')?.value || '';
    const query = new URLSearchParams();
    if (startDate) query.set('startDate', startDate);
    if (endDate) query.set('endDate', endDate);
    const response = await authFetch(`${API_URL}/sales-history${query.toString() ? `?${query}` : ''}`);
    if (!response.ok) throw new Error('Gagal memuat histori penjualan.');
    salesHistoryData = await response.json();
    renderSalesHistory();
}

async function loadLedgerData() {
    const startDate = getEl('ledger-start-date')?.value || '';
    const endDate = getEl('ledger-end-date')?.value || '';
    const query = new URLSearchParams();
    if (startDate) query.set('startDate', startDate);
    if (endDate) query.set('endDate', endDate);
    const response = await authFetch(`${API_URL}/ledger${query.toString() ? `?${query}` : ''}`);
    if (!response.ok) throw new Error('Gagal memuat pembukuan.');
    ledgerData = await response.json();
    renderLedger();
}

window.loadVendorDataAdmin = async function() {
    const response = await authFetch(`${API_URL}/admin/vendors`);
    if (!response.ok) throw new Error('Gagal memuat data pedagang.');
    adminVendors = await response.json();
    renderVendorAdmin();
};

function populateGeneralSettings(settings) {
    getEl('set-hero-title').value = settings.heroTitle || '';
    getEl('set-hero-desc').value = settings.heroDesc || '';
    getEl('set-hero-img').value = settings.heroImg || '';
    getEl('set-profile-title').value = settings.profileTitle || '';
    getEl('set-profile-desc').value = settings.profileDesc || '';
    getEl('set-profile-img').value = settings.profileImg || '';
    getEl('set-testi1-text').value = settings.testi1Text || '';
    getEl('set-testi1-name').value = settings.testi1Name || '';
    getEl('set-testi2-text').value = settings.testi2Text || '';
    getEl('set-testi2-name').value = settings.testi2Name || '';
    getEl('set-footer-desc').value = settings.footerDesc || '';
    getEl('set-footer-wa').value = settings.footerWa || '';
    getEl('set-footer-email').value = settings.footerEmail || '';
}

function populateBusinessSettings(settings) {
    const business = settings.business || {};
    setFieldValue('biz-brand-name', business.brandName || 'Rasvara');
    setFieldValue('biz-brand-subtitle', business.brandSubtitle || 'Art Catering');
    setFieldValue('biz-legal-name', business.legalName || 'Rasvara Catering');
    setFieldValue('biz-tagline', business.tagline || 'Mahakarya Rasa Keluarga');
    setFieldValue('biz-seo-title', business.seoTitle || '');
    setFieldValue('biz-seo-description', business.seoDescription || '');
    setFieldValue('biz-whatsapp', business.whatsapp || settings.footerWa || '');
    setFieldValue('biz-phone', business.phone || '');
    setFieldValue('biz-email', business.email || settings.footerEmail || '');
    setFieldValue('biz-opening-hours', business.openingHours || 'Buka setiap hari 08.00 - 17.00 WIB');
    setFieldValue('biz-copyright', business.copyrightText || '');
    setFieldValue('biz-instagram-url', business.instagramUrl || '');
    setFieldValue('biz-tiktok-url', business.tiktokUrl || '');
    setFieldValue('biz-whatsapp-url', business.whatsappUrl || '');
    setFieldValue('biz-address', business.address || 'Jl. Senopati No. 88, Kebayoran Baru, Jakarta Selatan');
    setFieldValue('biz-maps-embed-url', business.mapsEmbedUrl || '');
}

function populatePromoSettings(settings) {
    const highlight = settings.highlight || {};
    getEl('promo-status').value = highlight.status || 'aktif';
    getEl('promo-title').value = highlight.title || 'Kelembutan Tradisi';
    getEl('promo-badge').value = highlight.badge || 'Save 20%';
    getEl('promo-desc').value = highlight.desc || 'Rasakan legitnya bolu jadul resep rahasia keluarga kami.';
    getEl('promo-image').value = highlight.image || '';
    getEl('promo-price-old').value = Number(highlight.priceOld || 0) || '';
    getEl('promo-price-new').value = Number(highlight.priceNew || 0) || '';
    populatePromoProductOptions(highlight.productId);
}

function populatePromoProductOptions(selectedProductId = '') {
    const select = getEl('promo-product-id');
    if (!select) return;
    const selectedValue = String(selectedProductId || select.value || '');
    select.innerHTML = '<option value="">Pilih produk dari katalog</option>' + adminMenus.map((menu) => `
        <option value="${menu.id}" ${String(menu.id) === selectedValue ? 'selected' : ''}>
            ${escapeHtml(menu.name)} - ${formatPrice(menu.price)}
        </option>
    `).join('');
}

function showDashboard() {
    getEl('login-section').style.display = 'none';
    getEl('dashboard-section').style.display = 'flex';
}

window.saveBusinessSettings = async function() {
    try {
        const payload = {
            business: {
                brandName: getEl('biz-brand-name').value,
                brandSubtitle: getEl('biz-brand-subtitle').value,
                legalName: getEl('biz-legal-name').value,
                tagline: getEl('biz-tagline').value,
                seoTitle: getEl('biz-seo-title').value,
                seoDescription: getEl('biz-seo-description').value,
                whatsapp: getEl('biz-whatsapp').value,
                phone: getEl('biz-phone').value,
                email: getEl('biz-email').value,
                openingHours: getEl('biz-opening-hours').value,
                copyrightText: getEl('biz-copyright').value,
                instagramUrl: getEl('biz-instagram-url').value,
                tiktokUrl: getEl('biz-tiktok-url').value,
                whatsappUrl: getEl('biz-whatsapp-url').value,
                address: getEl('biz-address').value,
                mapsEmbedUrl: getEl('biz-maps-embed-url').value
            }
        };

        if (!payload.business.brandName || !payload.business.legalName || !payload.business.whatsapp || !payload.business.email) {
            showToast('Nama brand, nama bisnis lengkap, WhatsApp, dan email wajib diisi.', 'error');
            return;
        }

        await saveSettings(payload, 'Identitas bisnis berhasil disimpan.');
    } catch (error) {
        showToast(error.message || 'Gagal menyimpan identitas bisnis.', 'error');
    }
};

window.saveGeneralSettings = async function() {
    try {
        const payload = {
            heroTitle: getEl('set-hero-title').value,
            heroDesc: getEl('set-hero-desc').value,
            heroImg: getEl('set-hero-img').value,
            profileTitle: getEl('set-profile-title').value,
            profileDesc: getEl('set-profile-desc').value,
            profileImg: getEl('set-profile-img').value,
            testi1Text: getEl('set-testi1-text').value,
            testi1Name: getEl('set-testi1-name').value,
            testi2Text: getEl('set-testi2-text').value,
            testi2Name: getEl('set-testi2-name').value,
            footerDesc: getEl('set-footer-desc').value,
            footerWa: getEl('set-footer-wa').value,
            footerEmail: getEl('set-footer-email').value
        };

        await saveSettings(payload, 'Pengaturan website berhasil disimpan.');
    } catch (error) {
        showToast(error.message || 'Gagal menyimpan pengaturan website.', 'error');
    }
};

window.savePromoSettings = async function() {
    try {
        const productId = Number(getEl('promo-product-id').value || 0);
        const priceOld = Number(getEl('promo-price-old').value || 0);
        const priceNew = Number(getEl('promo-price-new').value || 0);

        if (getEl('promo-status').value === 'aktif' && !productId) {
            showToast('Pilih produk yang akan dipromokan dulu.', 'error');
            return;
        }

        if (priceOld && priceNew && priceNew > priceOld) {
            const proceed = await confirmAction('Harga promo lebih besar dari harga normal. Tetap simpan?', 'Cek Harga Promo');
            if (!proceed) return;
        }

        const payload = {
            highlight: {
                status: getEl('promo-status').value,
                title: getEl('promo-title').value,
                badge: getEl('promo-badge').value,
                desc: getEl('promo-desc').value,
                image: getEl('promo-image').value,
                priceOld,
                priceNew,
                productId
            }
        };

        await saveSettings(payload, 'Pengaturan promo berhasil disimpan.');
    } catch (error) {
        showToast(error.message || 'Gagal menyimpan promo.', 'error');
    }
};

async function saveSettings(payload, successMessage) {
    const response = await authFetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Gagal menyimpan pengaturan.');
    }

    const data = await response.json();
    siteSettings = data.settings || { ...siteSettings, ...payload };
    populatePromoSettings(siteSettings);
    renderAdminStats();
    showToast(successMessage, 'success');
}

async function uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    const response = await authFetch(`${API_URL}/upload-image`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Gagal mengunggah gambar.');
    }

    const data = await response.json();
    return data.url;
}

window.handleImageUpload = async function(event, targetInputId) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
        const url = await uploadImage(file);
        const target = getEl(targetInputId);
        if (target) target.value = url;
        showToast('Gambar berhasil diunggah.', 'success');
    } catch (error) {
        showToast(error.message || 'Gagal mengunggah gambar.', 'error');
    }
};

window.updateOrderStatus = async function(orderId, status) {
    try {
        const response = await authFetch(`${API_URL}/orders/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Gagal memperbarui status pesanan.');
        }
        await loadOrderData();
        await Promise.all([loadSalesHistory(), loadLedgerData()]);
        renderAdminStats();
        renderDashboardPanels();
        showToast('Status pesanan diperbarui.', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
};

function renderAdminMenuTable() {
    const tbody = getEl('menu-table-body');
    if (!tbody) return;
    if (!adminMenus.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">Belum ada menu.</td></tr>';
        return;
    }

    tbody.innerHTML = adminMenus.map(menu => {
        const margin = Number(menu.price || 0) - Number(menu.costPrice || 0);
        const marginPercent = menu.price ? Math.round((margin / menu.price) * 100) : 0;
        return `
            <tr>
                <td><img src="${escapeHtml(menu.image)}" alt="${escapeHtml(menu.name)}"></td>
                <td>
                    <strong>${escapeHtml(menu.name)}</strong>
                    ${menu.isPackage ? '<span class="mini-badge">Paketan</span>' : '<span class="mini-badge muted">Satuan</span>'}
                </td>
                <td style="text-transform: capitalize;">${escapeHtml(menu.category)}</td>
                <td>${escapeHtml(menu.unitType || 'porsi')}<br><small>Min. ${Number(menu.minOrder || 1)}</small></td>
                <td>${formatPrice(menu.price)}</td>
                <td>${formatPrice(menu.costPrice)}</td>
                <td><strong>${formatPrice(margin)}</strong><br><small>${marginPercent}%</small></td>
                <td>
                    <button class="btn-edit" onclick="editMenu(${menu.id})" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="deleteMenu(${menu.id})" title="Hapus"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderOrdersTable() {
    const tbody = getEl('orders-table-body');
    if (!tbody) return;

    if (!adminOrders.length) {
        tbody.innerHTML = '<tr><td colspan="10" class="empty-cell">Belum ada pesanan masuk.</td></tr>';
        return;
    }

    tbody.innerHTML = adminOrders.map(order => {
        const itemCount = (order.cartItems || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
        const profit = getOrderProfit(order);
        return `
            <tr>
                <td>${new Date(order.createdAt).toLocaleString('id-ID')}</td>
                <td>
                    <strong>${escapeHtml(order.customerName)}</strong><br>
                    <small>${escapeHtml(order.fulfillmentType || 'Antar ke alamat')}</small>
                </td>
                <td>${escapeHtml(order.phone)}</td>
                <td>${itemCount}</td>
                <td>${escapeHtml(order.orderPurpose || order.eventType || '-')}</td>
                <td>${escapeHtml(order.paymentMethod || '-')}</td>
                <td>${formatPrice(order.total)}</td>
                <td>${formatPrice(profit)}</td>
                <td>${renderStatusSelect(order)}</td>
                <td>
                    <button class="btn-edit" onclick="showOrderDetail(${order.id})" title="Detail"><i class="fas fa-eye"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderStatusSelect(order) {
    return `
        <select class="status-select" onchange="updateOrderStatus(${order.id}, this.value)">
            ${ORDER_STATUSES.map(status => `
                <option value="${status}" ${order.status === status ? 'selected' : ''}>${status}</option>
            `).join('')}
        </select>
    `;
}

function renderAdminStats() {
    const completedOrders = adminOrders.filter(order => order.status !== 'Batal');
    const totalRevenue = completedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const totalProfit = completedOrders.reduce((sum, order) => sum + getOrderProfit(order), 0);
    const activeOrders = adminOrders.filter(order => ['Menunggu Persetujuan', 'Disetujui', 'Diproses', 'Siap Dikirim/Diambil'].includes(order.status)).length;
    const uniqueCustomers = new Set(adminOrders.map(order => normalizePhone(order.phone || order.customerName))).size;

    if (getEl('admin-order-value')) getEl('admin-order-value').textContent = formatPrice(totalRevenue);
    if (getEl('admin-profit-value')) getEl('admin-profit-value').textContent = formatPrice(totalProfit);
    if (getEl('admin-active-orders')) getEl('admin-active-orders').textContent = activeOrders;
    if (getEl('admin-customer-count')) getEl('admin-customer-count').textContent = uniqueCustomers;
}

function renderDashboardPanels() {
    renderApprovalList();
    renderTopProducts();
    renderActiveOrders();
    renderCustomerHistory();
}

function renderSalesHistory() {
    const summary = salesHistoryData.summary || {};
    if (getEl('history-order-count')) getEl('history-order-count').textContent = summary.orderCount || 0;
    if (getEl('history-revenue')) getEl('history-revenue').textContent = formatPrice(summary.totalRevenue || 0);
    if (getEl('history-profit')) getEl('history-profit').textContent = formatPrice(summary.totalProfit || 0);
    if (getEl('history-items')) getEl('history-items').textContent = summary.totalItems || 0;

    const tbody = getEl('sales-history-body');
    if (!tbody) return;
    const orders = salesHistoryData.orders || [];
    if (!orders.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">Tidak ada penjualan pada rentang tanggal ini.</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => {
        const products = (order.cartItems || []).map(item => `${escapeHtml(item.name)} x ${Number(item.quantity || 0)} ${escapeHtml(item.unitType || 'porsi')}`).join('<br>');
        return `
            <tr>
                <td>${new Date(order.createdAt).toLocaleDateString('id-ID')}</td>
                <td>
                    <strong>${escapeHtml(order.customerName)}</strong><br>
                    <small>${escapeHtml(order.phone || '-')}</small>
                </td>
                <td>${products || '-'}</td>
                <td>${escapeHtml(order.paymentMethod || '-')}</td>
                <td>${formatPrice(order.total)}</td>
                <td>${formatPrice(order.totalCost)}</td>
                <td><strong>${formatPrice(getOrderProfit(order))}</strong></td>
                <td><span class="mini-badge">${escapeHtml(order.status)}</span></td>
            </tr>
        `;
    }).join('');
}

function renderLedger() {
    const summary = ledgerData.summary || {};
    if (getEl('ledger-cash-in')) getEl('ledger-cash-in').textContent = formatPrice(summary.cashIn || 0);
    if (getEl('ledger-cash-out')) getEl('ledger-cash-out').textContent = formatPrice(summary.cashOut || 0);
    if (getEl('ledger-net')) getEl('ledger-net').textContent = formatPrice(summary.netCashflow || 0);
    if (getEl('ledger-cogs')) getEl('ledger-cogs').textContent = formatPrice(summary.cogs || 0);

    const tbody = getEl('ledger-table-body');
    if (!tbody) return;
    const entries = ledgerData.entries || [];
    if (!entries.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">Belum ada catatan pembukuan manual pada rentang ini.</td></tr>';
        return;
    }

    tbody.innerHTML = entries.map(entry => `
        <tr>
            <td>${new Date(entry.date).toLocaleDateString('id-ID')}</td>
            <td><span class="mini-badge ${entry.type === 'expense' ? 'danger' : ''}">${entry.type === 'expense' ? 'Keluar' : 'Masuk'}</span></td>
            <td>
                <strong>${escapeHtml(entry.category)}</strong><br>
                <small>${escapeHtml(entry.description || '-')}</small>
            </td>
            <td>${formatPrice(entry.amount)}</td>
            <td>${escapeHtml(entry.paymentMethod || 'Kas')}</td>
            <td><button class="btn-delete" onclick="deleteLedgerEntry(${entry.id})" title="Hapus"><i class="fas fa-trash-alt"></i></button></td>
        </tr>
    `).join('');
}

window.applySalesHistoryFilter = async function() {
    await loadSalesHistory();
    showToast('Histori penjualan diperbarui.', 'success');
};

window.resetSalesHistoryFilter = async function() {
    if (getEl('sales-start-date')) getEl('sales-start-date').value = '';
    if (getEl('sales-end-date')) getEl('sales-end-date').value = '';
    await loadSalesHistory();
    showToast('Filter histori direset.', 'info');
};

window.applyLedgerFilter = async function() {
    await loadLedgerData();
    showToast('Pembukuan diperbarui.', 'success');
};

window.resetLedgerFilter = async function() {
    if (getEl('ledger-start-date')) getEl('ledger-start-date').value = '';
    if (getEl('ledger-end-date')) getEl('ledger-end-date').value = '';
    await loadLedgerData();
    showToast('Filter pembukuan direset.', 'info');
};

window.saveLedgerEntry = async function() {
    const payload = {
        date: getEl('ledger-date')?.value || new Date().toISOString().slice(0, 10),
        type: getEl('ledger-type')?.value || 'expense',
        category: getEl('ledger-category')?.value.trim() || '',
        amount: Number(getEl('ledger-amount')?.value || 0),
        paymentMethod: getEl('ledger-payment')?.value.trim() || 'Kas',
        description: getEl('ledger-description')?.value.trim() || ''
    };

    if (!payload.date || !payload.category || !Number.isFinite(payload.amount) || payload.amount <= 0) {
        showToast('Tanggal, kategori, dan nominal wajib diisi dengan benar.', 'error');
        return;
    }

    const response = await authFetch(`${API_URL}/ledger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json();
        showToast(error.message || 'Gagal menyimpan catatan pembukuan.', 'error');
        return;
    }

    ['ledger-category', 'ledger-amount', 'ledger-payment', 'ledger-description'].forEach((id) => {
        const element = getEl(id);
        if (element) element.value = id === 'ledger-payment' ? 'Kas' : '';
    });
    await loadLedgerData();
    showToast('Catatan pembukuan berhasil disimpan.', 'success');
};

window.deleteLedgerEntry = async function(entryId) {
    const proceed = await confirmAction('Hapus catatan pembukuan ini? Data kas manual akan ikut berubah.', 'Hapus Catatan');
    if (!proceed) return;

    const response = await authFetch(`${API_URL}/ledger/${entryId}`, { method: 'DELETE' });
    if (!response.ok) {
        const error = await response.json();
        showToast(error.message || 'Gagal menghapus catatan.', 'error');
        return;
    }
    await loadLedgerData();
    showToast('Catatan pembukuan dihapus.', 'success');
};

function renderApprovalList() {
    const pending = adminOrders.filter(order => order.status === 'Menunggu Persetujuan');
    const count = getEl('approval-count');
    const list = getEl('approval-list');
    if (count) count.textContent = `${pending.length} pesanan`;
    if (!list) return;
    if (!pending.length) {
        list.innerHTML = '<div class="empty-panel">Tidak ada pesanan yang menunggu approval.</div>';
        return;
    }
    list.innerHTML = pending.slice(0, 6).map(order => `
        <div class="compact-item">
            <div>
                <strong>${escapeHtml(order.customerName)}</strong>
                <span>${formatPrice(order.total)} - ${escapeHtml(order.orderPurpose || order.eventType || '-')}</span>
            </div>
            <div class="inline-actions">
                <button onclick="updateOrderStatus(${order.id}, 'Disetujui')" class="btn-mini success">Setujui</button>
                <button onclick="updateOrderStatus(${order.id}, 'Batal')" class="btn-mini danger">Tolak</button>
            </div>
        </div>
    `).join('');
}

function renderTopProducts() {
    const list = getEl('top-products-list');
    if (!list) return;
    const summary = new Map();
    adminOrders.filter(order => order.status !== 'Batal').forEach(order => {
        (order.cartItems || []).forEach(item => {
            const key = item.id || item.name;
            const current = summary.get(key) || { name: item.name, qty: 0, revenue: 0 };
            current.qty += Number(item.quantity || 0);
            current.revenue += Number(item.price || 0) * Number(item.quantity || 0);
            summary.set(key, current);
        });
    });
    const topProducts = [...summary.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
    if (!topProducts.length) {
        list.innerHTML = '<div class="empty-panel">Belum ada data penjualan produk.</div>';
        return;
    }
    list.innerHTML = topProducts.map(item => `
        <div class="compact-item">
            <div>
                <strong>${escapeHtml(item.name)}</strong>
                <span>${item.qty} item terjual</span>
            </div>
            <b>${formatPrice(item.revenue)}</b>
        </div>
    `).join('');
}

function renderActiveOrders() {
    const list = getEl('active-orders-list');
    if (!list) return;
    const active = adminOrders.filter(order => ['Disetujui', 'Diproses', 'Siap Dikirim/Diambil'].includes(order.status));
    if (!active.length) {
        list.innerHTML = '<div class="empty-panel">Belum ada pesanan berjalan.</div>';
        return;
    }
    list.innerHTML = active.slice(0, 6).map(order => `
        <div class="compact-item">
            <div>
                <strong>${escapeHtml(order.customerName)}</strong>
                <span>${escapeHtml(order.status)} - ${escapeHtml(order.eventDate || 'Tanggal fleksibel')}</span>
            </div>
            <b>${formatPrice(order.total)}</b>
        </div>
    `).join('');
}

function renderCustomerHistory() {
    const list = getEl('customer-history-list');
    if (!list) return;
    const customers = new Map();
    adminOrders.forEach(order => {
        const key = normalizePhone(order.phone || order.customerName);
        const current = customers.get(key) || {
            name: order.customerName,
            phone: order.phone,
            count: 0,
            spent: 0
        };
        current.count += 1;
        current.spent += Number(order.total || 0);
        customers.set(key, current);
    });
    const topCustomers = [...customers.values()].sort((a, b) => b.spent - a.spent).slice(0, 6);
    if (!topCustomers.length) {
        list.innerHTML = '<div class="empty-panel">Belum ada histori pembeli.</div>';
        return;
    }
    list.innerHTML = topCustomers.map(customer => `
        <div class="compact-item">
            <div>
                <strong>${escapeHtml(customer.name)}</strong>
                <span>${customer.count}x order - ${escapeHtml(customer.phone || '-')}</span>
            </div>
            <b>${formatPrice(customer.spent)}</b>
        </div>
    `).join('');
}

function getOrderProfit(order) {
    if (order.profit !== undefined) return Number(order.profit) || 0;
    const total = Number(order.total || 0);
    const totalCost = Number(order.totalCost || 0);
    if (totalCost) return total - totalCost;
    return (order.cartItems || []).reduce((sum, item) => {
        return sum + (Number(item.price || 0) - Number(item.costPrice || 0)) * Number(item.quantity || 0);
    }, 0);
}

function normalizePhone(value = '') {
    return String(value).replace(/\D/g, '') || String(value).toLowerCase();
}

window.showOrderDetail = function(orderId) {
    const order = adminOrders.find(item => item.id === orderId);
    if (!order) return showToast('Pesanan tidak ditemukan.', 'error');
    const items = (order.cartItems || []).map(item => {
        const unit = item.unitType || 'porsi';
        return `- ${item.name} x ${item.quantity} ${unit} @ ${formatPrice(item.price)}`;
    }).join('\n');
    showInfoDialog(
        `Detail Pesanan\n\n` +
        `Pemesan: ${order.customerName}\n` +
        `Kontak: ${order.phone}\n` +
        `Tujuan: ${order.orderPurpose || order.eventType || '-'}\n` +
        `Pemenuhan: ${order.fulfillmentType || '-'}\n` +
        `Alamat: ${order.address || '-'}\n` +
        `Pembayaran: ${order.paymentMethod || '-'}\n\n` +
        `Item:\n${items || '-'}\n\n` +
        `Total: ${formatPrice(order.total)}\n` +
        `Estimasi laba kotor: ${formatPrice(getOrderProfit(order))}\n` +
        `Catatan: ${order.notes || '-'}`,
        'Detail Pesanan'
    );
};

window.openMenuModal = function(menuId = null) {
    getEl('menu-modal').classList.add('active');
    const title = getEl('modal-title');
    const currentId = getEl('current-menu-id');
    const fields = getMenuFields();

    if (!menuId) {
        title.textContent = 'Tambah Menu Baru';
        currentId.value = '';
        fields.name.value = '';
        fields.category.value = 'berat';
        fields.price.value = '';
        fields.cost.value = '';
        fields.unit.value = 'porsi';
        fields.minOrder.value = 1;
        fields.isPackage.checked = false;
        fields.desc.value = '';
        fields.image.value = '';
        return;
    }

    const menu = adminMenus.find(item => item.id === menuId);
    if (!menu) return;

    title.textContent = 'Edit Menu';
    currentId.value = menu.id;
    fields.name.value = menu.name || '';
    fields.category.value = menu.category || 'berat';
    fields.price.value = menu.price || '';
    fields.cost.value = menu.costPrice || 0;
    fields.unit.value = menu.unitType || 'porsi';
    fields.minOrder.value = menu.minOrder || 1;
    fields.isPackage.checked = Boolean(menu.isPackage);
    fields.desc.value = menu.desc || '';
    fields.image.value = menu.image || '';
};

window.closeMenuModal = function() {
    getEl('menu-modal').classList.remove('active');
};

window.saveMenuData = async function() {
    const menuId = getEl('current-menu-id').value;
    const fields = getMenuFields();
    const name = fields.name.value.trim();
    const category = fields.category.value;
    const price = Number(fields.price.value);
    const costPrice = Number(fields.cost.value);
    const unitType = fields.unit.value;
    const minOrder = Math.max(1, Number(fields.minOrder.value || 1));
    const isPackage = fields.isPackage.checked;
    const desc = fields.desc.value.trim();
    const image = fields.image.value.trim();

    if (!name || !category || !unitType || !image || !Number.isFinite(price) || price <= 0 || !Number.isFinite(costPrice) || costPrice < 0) {
        showToast('Lengkapi Nama, Kategori, Satuan, Harga Jual, Harga Modal, dan Gambar menu. Harga jual wajib lebih dari 0.', 'error');
        return;
    }

    if (costPrice > price) {
        const proceed = await confirmAction('Harga modal lebih besar dari harga jual. Ini berarti margin negatif. Tetap simpan?', 'Margin Negatif');
        if (!proceed) return;
    }

    const payload = { name, category, price, costPrice, unitType, minOrder, isPackage, desc, image };
    const method = menuId ? 'PUT' : 'POST';
    const url = menuId ? `${API_URL}/menus/${menuId}` : `${API_URL}/menus`;

    const response = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json();
        showToast(error.message || 'Gagal menyimpan menu.', 'error');
        return;
    }

    await loadMenuData();
    renderAdminStats();
    renderDashboardPanels();
    closeMenuModal();
    showToast('Menu berhasil disimpan.', 'success');
};

window.deleteMenu = async function(menuId) {
    const proceed = await confirmAction('Apakah Anda yakin ingin menghapus menu ini?', 'Hapus Menu');
    if (!proceed) return;
    const response = await authFetch(`${API_URL}/menus/${menuId}`, { method: 'DELETE' });
    if (!response.ok) {
        const error = await response.json();
        showToast(error.message || 'Gagal menghapus menu.', 'error');
        return;
    }
    await loadMenuData();
    renderAdminStats();
    renderDashboardPanels();
    showToast('Menu berhasil dihapus.', 'success');
};

window.editMenu = function(menuId) {
    openMenuModal(menuId);
};

function getMenuFields() {
    return {
        name: getEl('input-menu-name'),
        category: getEl('input-menu-category'),
        price: getEl('input-menu-price'),
        cost: getEl('input-menu-cost'),
        unit: getEl('input-menu-unit'),
        minOrder: getEl('input-menu-min-order'),
        isPackage: getEl('input-menu-is-package'),
        desc: getEl('input-menu-desc'),
        image: getEl('input-menu-image')
    };
}

function renderVendorAdmin() {
    const total = adminVendors.length;
    const active = adminVendors.filter((vendor) => vendor.status === 'active').length;
    const menuTotal = adminVendors.reduce((sum, vendor) => sum + Number(vendor.stats?.menuCount || 0), 0);
    const revenueTotal = adminVendors.reduce((sum, vendor) => sum + Number(vendor.stats?.revenue || 0), 0);

    if (getEl('vendor-total-count')) getEl('vendor-total-count').textContent = total;
    if (getEl('vendor-active-count')) getEl('vendor-active-count').textContent = active;
    if (getEl('vendor-menu-total')) getEl('vendor-menu-total').textContent = menuTotal;
    if (getEl('vendor-revenue-total')) getEl('vendor-revenue-total').textContent = formatPrice(revenueTotal);

    const tbody = getEl('vendors-table-body');
    if (!tbody) return;
    if (!adminVendors.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">Belum ada pedagang terdaftar.</td></tr>';
        return;
    }

    tbody.innerHTML = adminVendors.map((vendor) => `
        <tr>
            <td>
                <strong>${escapeHtml(vendor.storeName)}</strong><br>
                <small>${escapeHtml(vendor.email || '-')}</small>
            </td>
            <td>${escapeHtml(vendor.ownerName || '-')}</td>
            <td>${escapeHtml(vendor.whatsapp || '-')}</td>
            <td>${renderVendorStatusSelect(vendor)}</td>
            <td>${Number(vendor.stats?.menuCount || 0)}</td>
            <td>${formatPrice(vendor.stats?.revenue || 0)}</td>
            <td>
                <button class="btn-edit" onclick="showVendorDetail(${vendor.id})" title="Detail"><i class="fas fa-eye"></i></button>
            </td>
        </tr>
    `).join('');
}

function renderVendorStatusSelect(vendor) {
    const statuses = [
        { value: 'active', label: 'Aktif' },
        { value: 'pending', label: 'Pending' },
        { value: 'suspended', label: 'Ditahan' }
    ];
    return `
        <select class="status-select" onchange="updateVendorStatus(${vendor.id}, this.value)">
            ${statuses.map((status) => `
                <option value="${status.value}" ${vendor.status === status.value ? 'selected' : ''}>${status.label}</option>
            `).join('')}
        </select>
    `;
}

window.showVendorDetail = async function(vendorId) {
    const panel = getEl('vendor-detail-panel');
    if (!panel) return;
    panel.innerHTML = '<div class="empty-panel">Memuat detail pedagang...</div>';

    try {
        const response = await authFetch(`${API_URL}/admin/vendors/${vendorId}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Gagal memuat detail pedagang.');
        }

        const data = await response.json();
        const vendor = data.vendor || {};
        const menuList = (data.menus || []).slice(0, 6).map((menu) => `
            <div class="compact-item">
                <div>
                    <strong>${escapeHtml(menu.name)}</strong>
                    <span>${escapeHtml(menu.category)} - ${formatPrice(menu.price)}</span>
                </div>
                <b>${escapeHtml(menu.unitType || 'porsi')}</b>
            </div>
        `).join('');
        const orderList = (data.orders || []).slice(0, 5).map((order) => `
            <div class="compact-item">
                <div>
                    <strong>${escapeHtml(order.customerName)}</strong>
                    <span>${escapeHtml(order.status)} - ${new Date(order.createdAt).toLocaleDateString('id-ID')}</span>
                </div>
                <b>${formatPrice(order.total)}</b>
            </div>
        `).join('');
        const ledgerList = (data.ledger || []).slice(0, 5).map((entry) => `
            <div class="compact-item">
                <div>
                    <strong>${escapeHtml(entry.category)}</strong>
                    <span>${escapeHtml(entry.type === 'expense' ? 'Kas keluar' : 'Kas masuk')} - ${escapeHtml(entry.paymentMethod || 'Kas')}</span>
                </div>
                <b>${formatPrice(entry.amount)}</b>
            </div>
        `).join('');
        const reviewList = (data.reviews || []).slice(0, 5).map((review) => `
            <div class="compact-item">
                <div>
                    <strong>${'★'.repeat(Number(review.rating || 0))}${'☆'.repeat(5 - Number(review.rating || 0))}</strong>
                    <span>${escapeHtml(review.customerName)} - ${escapeHtml(review.comment || '-')}</span>
                </div>
            </div>
        `).join('');

        panel.innerHTML = `
            <div class="vendor-profile-summary">
                <strong>${escapeHtml(vendor.storeName || 'Pedagang')}</strong>
                <span>${escapeHtml(vendor.ownerName || '-')} - ${escapeHtml(vendor.email || '-')}</span>
                <span>${escapeHtml(vendor.whatsapp || '-')}</span>
                <span>${escapeHtml(vendor.address || 'Alamat belum diisi.')}</span>
                <p>${escapeHtml(vendor.bio || 'Bio toko belum diisi.')}</p>
            </div>
            <div class="vendor-metric-grid">
                <span>Menu <b>${Number(vendor.stats?.menuCount || 0)}</b></span>
                <span>Pesanan <b>${Number(vendor.stats?.orderCount || 0)}</b></span>
                <span>Omzet <b>${formatPrice(vendor.stats?.revenue || 0)}</b></span>
                <span>Rating <b>${Number(vendor.stats?.averageRating || 0).toFixed(1)}</b></span>
            </div>
            <h4>Menu</h4>
            ${menuList || '<div class="empty-panel">Belum ada menu.</div>'}
            <h4>Pesanan</h4>
            ${orderList || '<div class="empty-panel">Belum ada pesanan.</div>'}
            <h4>Pembukuan</h4>
            ${ledgerList || '<div class="empty-panel">Belum ada pembukuan vendor.</div>'}
            <h4>Review</h4>
            ${reviewList || '<div class="empty-panel">Belum ada review.</div>'}
        `;
    } catch (error) {
        panel.innerHTML = `<div class="empty-panel">${escapeHtml(error.message || 'Gagal memuat detail pedagang.')}</div>`;
    }
};

window.updateVendorStatus = async function(vendorId, status) {
    try {
        const response = await authFetch(`${API_URL}/admin/vendors/${vendorId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Gagal mengubah status pedagang.');
        }
        await loadVendorDataAdmin();
        showToast('Status pedagang diperbarui.', 'success');
    } catch (error) {
        showToast(error.message || 'Gagal mengubah status pedagang.', 'error');
        await loadVendorDataAdmin().catch(() => {});
    }
};

async function checkAdminSession() {
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        try {
            const response = await authFetch(`${API_URL}/admin/session`);
            if (!response.ok) throw new Error('Sesi admin sudah berakhir.');
            const data = await response.json();
            adminCsrfToken = data.csrfToken || adminCsrfToken;
            sessionStorage.setItem('adminCsrfToken', adminCsrfToken);
            showDashboard();
            await loadAdminData();
        } catch (error) {
            sessionStorage.removeItem('adminLoggedIn');
            sessionStorage.removeItem('adminCsrfToken');
            adminCsrfToken = '';
            showToast('Sesi admin berakhir. Silakan login ulang.', 'info');
        }
    }
}

window.addEventListener('DOMContentLoaded', checkAdminSession);
