const API_URL = '/api';
let vendorCsrfToken = sessionStorage.getItem('vendorCsrfToken') || '';
let currentVendor = null;
let vendorMenus = [];
let vendorOrders = [];
let vendorReviews = [];
let vendorNotifications = [];
let vendorNotificationTimer = null;
const VENDOR_ORDER_STATUSES = [
    'Menunggu Persetujuan',
    'Disetujui',
    'Diproses',
    'Siap Dikirim/Diambil',
    'Selesai',
    'Batal'
];

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

function focusField(id) {
    const field = getEl(id);
    if (!field) return;
    field.focus();
    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function showVendorToast(message, type = 'info') {
    const root = getEl('vendor-toast-root');
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

async function vendorFetch(url, options = {}) {
    const headers = new Headers(options.headers || {});
    const method = (options.method || 'GET').toUpperCase();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && vendorCsrfToken) {
        headers.set('X-CSRF-Token', vendorCsrfToken);
    }
    const response = await fetch(url, { ...options, credentials: 'same-origin', headers });
    if (response.status === 401 || response.status === 403) showVendorAuth();
    return response;
}

function switchVendorAuth(mode) {
    getEl('vendor-login-form').classList.toggle('hidden', mode !== 'login');
    getEl('vendor-register-form').classList.toggle('hidden', mode !== 'register');
    getEl('vendor-login-tab').classList.toggle('active', mode === 'login');
    getEl('vendor-register-tab').classList.toggle('active', mode === 'register');
}

function showVendorAuth() {
    sessionStorage.removeItem('vendorCsrfToken');
    vendorCsrfToken = '';
    getEl('vendor-auth-section').style.display = 'grid';
    getEl('vendor-dashboard-section').style.display = 'none';
}

function showVendorDashboard(vendor) {
    currentVendor = vendor;
    getEl('vendor-auth-section').style.display = 'none';
    
    if (vendor.status === 'pending') {
        getEl('vendor-pending-section').style.display = 'flex';
        getEl('vendor-dashboard-section').style.display = 'none';
        return;
    }
    
    if (getEl('vendor-pending-section')) getEl('vendor-pending-section').style.display = 'none';
    getEl('vendor-dashboard-section').style.display = 'flex';
    getEl('vendor-sidebar-store').innerHTML = `${escapeHtml(vendor.storeName || 'Pedagang')}<span style="color:#E8C547;">.</span>`;
    populateVendorProfile(vendor);
}

function openVendorBookkeeping() {
    window.location.href = '/vendor-bookkeeping';
}

async function handleVendorLogin(event) {
    event.preventDefault();
    try {
        const response = await fetch(`${API_URL}/vendor/login`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: getEl('vendor-login-email').value,
                password: getEl('vendor-login-password').value
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Login pedagang gagal.');
        vendorCsrfToken = data.csrfToken || '';
        sessionStorage.setItem('vendorCsrfToken', vendorCsrfToken);
        showVendorDashboard(data.vendor);
        await loadVendorData();
    } catch (error) {
        showVendorToast(error.message, 'error');
    }
}

async function handleVendorRegister(event) {
    event.preventDefault();
    try {
        const password = getEl('vendor-reg-password').value;
        const confirmPassword = getEl('vendor-reg-password-confirm').value;
        if (password !== confirmPassword) {
            focusField('vendor-reg-password-confirm');
            throw new Error('Konfirmasi password belum sama.');
        }
        const response = await fetch(`${API_URL}/vendor/register`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                storeName: getEl('vendor-reg-store').value,
                ownerName: getEl('vendor-reg-owner').value,
                email: getEl('vendor-reg-email').value,
                whatsapp: getEl('vendor-reg-whatsapp').value,
                password
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Pendaftaran pedagang gagal.');
        vendorCsrfToken = data.csrfToken || '';
        sessionStorage.setItem('vendorCsrfToken', vendorCsrfToken);
        showVendorDashboard(data.vendor);
        await loadVendorData();
        showVendorToast('Akun pedagang dibuat. Mulai lengkapi profil dan menu.', 'success');
    } catch (error) {
        showVendorToast(error.message, 'error');
    }
}

async function vendorLogout() {
    await vendorFetch(`${API_URL}/vendor/logout`, { method: 'POST' }).catch(() => {});
    showVendorAuth();
}

function switchVendorTab(event, tabId) {
    document.querySelectorAll('.admin-tab').forEach((tab) => tab.classList.remove('active'));
    document.querySelectorAll('.sidebar-menu li').forEach((item) => item.classList.remove('active'));
    getEl(tabId)?.classList.add('active');
    event?.currentTarget?.classList.add('active');
}

async function loadVendorData() {
    const [profileRes, menusRes, ordersRes, reviewsRes, notificationsRes] = await Promise.all([
        vendorFetch(`${API_URL}/vendor/profile`),
        vendorFetch(`${API_URL}/vendor/menus`),
        vendorFetch(`${API_URL}/vendor/orders`),
        vendorFetch(`${API_URL}/vendor/reviews`),
        vendorFetch(`${API_URL}/vendor/notifications`)
    ]);
    if (!profileRes.ok) throw new Error('Sesi pedagang perlu login ulang.');
    currentVendor = await profileRes.json();
    vendorMenus = await menusRes.json();
    vendorOrders = await ordersRes.json();
    vendorReviews = await reviewsRes.json();
    vendorNotifications = notificationsRes.ok ? await notificationsRes.json() : [];
    showVendorDashboard(currentVendor);
    renderVendorDashboard();
    renderVendorMenus();
    renderVendorOrders();
    renderVendorReviews();
    renderVendorNotifications();
    maybeSendBrowserNotifications();
    startVendorNotificationPolling();
}

function populateVendorProfile(vendor) {
    getEl('vendor-store-name').value = vendor.storeName || '';
    getEl('vendor-owner-name').value = vendor.ownerName || '';
    getEl('vendor-whatsapp').value = vendor.whatsapp || '';
    getEl('vendor-address').value = vendor.address || '';
    getEl('vendor-avatar').value = vendor.avatar || '';
    getEl('vendor-bio').value = vendor.bio || '';
    renderUploadPreview('vendor-avatar-preview', vendor.avatar, 'Belum ada logo/foto toko.');
}

async function saveVendorProfile() {
    try {
        const response = await vendorFetch(`${API_URL}/vendor/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                storeName: getEl('vendor-store-name').value,
                ownerName: getEl('vendor-owner-name').value,
                whatsapp: getEl('vendor-whatsapp').value,
                address: getEl('vendor-address').value,
                avatar: getEl('vendor-avatar').value,
                bio: getEl('vendor-bio').value
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Gagal menyimpan profil.');
        currentVendor = data.vendor;
        showVendorDashboard(currentVendor);
        showVendorToast('Profil toko disimpan.', 'success');
    } catch (error) {
        showVendorToast(error.message, 'error');
    }
}

async function handleVendorImageUpload(event, targetInputId) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
        const formData = new FormData();
        formData.append('image', file);
        const response = await vendorFetch(`${API_URL}/vendor/upload-image`, { method: 'POST', body: formData });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Upload gagal.');
        getEl(targetInputId).value = data.url;
        renderUploadPreview(`${targetInputId}-preview`, data.url, 'Gambar berhasil diunggah.');
        showVendorToast('Gambar berhasil diunggah.', 'success');
    } catch (error) {
        showVendorToast(error.message, 'error');
    }
}

function renderVendorDashboard() {
    const revenue = vendorOrders.reduce((sum, order) => {
        return sum + (order.cartItems || []).reduce((itemSum, item) => itemSum + Number(item.price || 0) * Number(item.quantity || 0), 0);
    }, 0);
    const avgRating = vendorReviews.length
        ? (vendorReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / vendorReviews.length).toFixed(1)
        : '0.0';
    getEl('vendor-stat-menu').textContent = vendorMenus.length;
    getEl('vendor-stat-order').textContent = vendorOrders.length;
    getEl('vendor-stat-revenue').textContent = formatPrice(revenue);
    getEl('vendor-stat-rating').textContent = avgRating;
    getEl('vendor-menu-count').textContent = `${vendorMenus.length} menu`;
    getEl('vendor-review-count').textContent = `${vendorReviews.length} review`;
    getEl('vendor-recent-menu').innerHTML = vendorMenus.slice(0, 5).map((menu) => `
        <div class="compact-item"><div><strong>${escapeHtml(menu.name)}</strong><span>${formatPrice(menu.price)} - ${escapeHtml(menu.category)}</span></div><b>${escapeHtml(menu.unitType || 'porsi')}</b></div>
    `).join('') || '<div class="empty-panel">Belum ada menu.</div>';
    getEl('vendor-recent-reviews').innerHTML = vendorReviews.slice(0, 5).map((review) => `
        <div class="compact-item"><div><strong>${escapeHtml(review.customerName)}</strong><span>${escapeHtml(review.comment)}</span></div><b>${'★'.repeat(Number(review.rating || 0))}</b></div>
    `).join('') || '<div class="empty-panel">Belum ada review.</div>';
    getEl('vendor-recent-notifications').innerHTML = vendorNotifications.slice(0, 4).map(renderNotificationItem).join('') || '<div class="empty-panel">Belum ada notifikasi baru.</div>';
}

function renderVendorMenus() {
    const tbody = getEl('vendor-menu-body');
    tbody.innerHTML = vendorMenus.map((menu) => `
        <tr>
            <td><img src="${escapeHtml(menu.image)}" alt="${escapeHtml(menu.name)}"></td>
            <td><strong>${escapeHtml(menu.name)}</strong><br><small>${escapeHtml(menu.desc || '-')}</small><br>${renderMenuAvailability(menu.availability)}</td>
            <td>${escapeHtml(menu.category)}</td>
            <td>${escapeHtml(menu.unitType || 'porsi')}<br><small>Min. ${Number(menu.minOrder || 1)}</small></td>
            <td>${formatPrice(menu.price)}</td>
            <td>${formatPrice(menu.costPrice)}</td>
            <td>
                <button class="btn-edit" onclick="editVendorMenu(${menu.id})"><i class="fas fa-edit"></i></button>
                <button class="btn-delete" onclick="deleteVendorMenu(${menu.id})"><i class="fas fa-trash-alt"></i></button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="7" class="empty-cell">Belum ada menu.</td></tr>';
}

function renderMenuAvailability(availability = 'active') {
    const labels = {
        active: 'Aktif',
        sold_out: 'Habis',
        draft: 'Draft'
    };
    const className = availability === 'active' ? '' : availability === 'sold_out' ? 'warning' : 'muted';
    return `<span class="mini-badge ${className}">${escapeHtml(labels[availability] || 'Aktif')}</span>`;
}

function openVendorMenuModal(menuId = null) {
    const menu = vendorMenus.find((item) => item.id === menuId);
    getEl('vendor-menu-modal').classList.add('active');
    getEl('vendor-menu-modal-title').textContent = menu ? 'Edit Menu' : 'Tambah Menu';
    getEl('vendor-current-menu-id').value = menu?.id || '';
    getEl('vendor-menu-name').value = menu?.name || '';
    getEl('vendor-menu-category').value = menu?.category || 'manis';
    getEl('vendor-menu-availability').value = menu?.availability || 'active';
    getEl('vendor-menu-price').value = menu?.price || '';
    getEl('vendor-menu-cost').value = menu?.costPrice || '';
    getEl('vendor-menu-unit').value = menu?.unitType || 'porsi';
    getEl('vendor-menu-min').value = menu?.minOrder || 1;
    getEl('vendor-menu-package').checked = Boolean(menu?.isPackage);
    getEl('vendor-menu-desc').value = menu?.desc || '';
    getEl('vendor-menu-image').value = menu?.image || '';
    getEl('vendor-menu-image-file').value = '';
    renderUploadPreview('vendor-menu-image-preview', menu?.image || '', 'Belum ada gambar menu.');
    setTimeout(() => focusField('vendor-menu-name'), 50);
}

function closeVendorMenuModal() {
    getEl('vendor-menu-modal').classList.remove('active');
}

function editVendorMenu(menuId) {
    openVendorMenuModal(menuId);
}

async function saveVendorMenu() {
    const saveButton = document.querySelector('#vendor-menu-modal .btn-save');
    try {
        const menuId = getEl('vendor-current-menu-id').value;
        const payload = {
            name: getEl('vendor-menu-name').value.trim(),
            category: getEl('vendor-menu-category').value,
            availability: getEl('vendor-menu-availability').value,
            price: Number(getEl('vendor-menu-price').value),
            costPrice: Number(getEl('vendor-menu-cost').value),
            unitType: getEl('vendor-menu-unit').value.trim(),
            minOrder: Number(getEl('vendor-menu-min').value || 1),
            isPackage: getEl('vendor-menu-package').checked,
            desc: getEl('vendor-menu-desc').value.trim(),
            image: getEl('vendor-menu-image').value.trim()
        };
        const missing = validateVendorMenuPayload(payload);
        if (missing) {
            focusField(missing.id);
            throw new Error(missing.message);
        }
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
        }
        const response = await vendorFetch(`${API_URL}/vendor/menus${menuId ? `/${menuId}` : ''}`, {
            method: menuId ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Gagal menyimpan menu.');
        await loadVendorData();
        closeVendorMenuModal();
        showVendorToast('Menu disimpan.', 'success');
    } catch (error) {
        showVendorToast(error.message, 'error');
    } finally {
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.innerHTML = 'Simpan Menu';
        }
    }
}

function validateVendorMenuPayload(payload) {
    if (!payload.name) return { id: 'vendor-menu-name', message: 'Nama menu wajib diisi.' };
    if (!payload.category) return { id: 'vendor-menu-category', message: 'Kategori menu wajib dipilih.' };
    if (!Number.isFinite(payload.price) || payload.price <= 0) return { id: 'vendor-menu-price', message: 'Harga jual wajib diisi dan harus lebih dari 0.' };
    if (!Number.isFinite(payload.costPrice) || payload.costPrice < 0) return { id: 'vendor-menu-cost', message: 'Harga modal/HPP wajib diisi minimal 0.' };
    if (!payload.unitType) return { id: 'vendor-menu-unit', message: 'Satuan menu wajib diisi, misalnya pcs, box, porsi.' };
    if (!Number.isFinite(payload.minOrder) || payload.minOrder < 1) return { id: 'vendor-menu-min', message: 'Minimal order wajib minimal 1.' };
    if (!payload.image) return { id: 'vendor-menu-image-file', message: 'Gambar menu wajib diunggah dari perangkat dulu.' };
    return null;
}

async function deleteVendorMenu(menuId) {
    if (!confirm('Hapus menu ini dari toko?')) return;
    const response = await vendorFetch(`${API_URL}/vendor/menus/${menuId}`, { method: 'DELETE' });
    if (!response.ok) return showVendorToast('Gagal menghapus menu.', 'error');
    await loadVendorData();
    showVendorToast('Menu dihapus.', 'success');
}

function renderVendorOrders() {
    const tbody = getEl('vendor-orders-body');
    tbody.innerHTML = vendorOrders.map((order) => {
        const itemTotal = (order.cartItems || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
        const items = (order.cartItems || []).map((item) => `${escapeHtml(item.name)} x ${Number(item.quantity || 0)}`).join('<br>');
        const statusOptions = VENDOR_ORDER_STATUSES.map((status) => `
            <option value="${escapeHtml(status)}" ${status === order.status ? 'selected' : ''}>${escapeHtml(status)}</option>
        `).join('');
        return `
            <tr>
                <td><strong>#${escapeHtml(order.id)}</strong><br><small>${new Date(order.createdAt).toLocaleString('id-ID')}</small></td>
                <td>${escapeHtml(order.customerName)}</td>
                <td>${escapeHtml(order.phone)}</td>
                <td>${items}</td>
                <td>${formatPrice(itemTotal)}</td>
                <td>
                    <label class="status-control">
                        <span>Update progress</span>
                        <select class="vendor-status-select" onchange="updateVendorOrderStatus('${escapeHtml(order.id)}', this.value)">
                            ${statusOptions}
                        </select>
                    </label>
                </td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="6" class="empty-cell">Belum ada pesanan.</td></tr>';
}

async function updateVendorOrderStatus(orderId, status) {
    try {
        const response = await vendorFetch(`${API_URL}/vendor/orders/${encodeURIComponent(orderId)}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Gagal update status pesanan.');
        vendorOrders = vendorOrders.map((order) => String(order.id) === String(orderId) ? data.order : order);
        renderVendorOrders();
        renderVendorDashboard();
        showVendorToast(`Progress pesanan #${orderId} diperbarui.`, 'success');
    } catch (error) {
        showVendorToast(error.message || 'Gagal update status pesanan.', 'error');
        renderVendorOrders();
    }
}

function renderVendorReviews() {
    const list = getEl('vendor-review-list');
    list.innerHTML = vendorReviews.map((review) => `
        <article class="review-card">
            <strong>${escapeHtml(review.customerName)}</strong>
            <div class="review-stars">${'★'.repeat(Number(review.rating || 0))}${'☆'.repeat(5 - Number(review.rating || 0))}</div>
            <p>${escapeHtml(review.comment)}</p>
            <small>${new Date(review.createdAt).toLocaleString('id-ID')}</small>
        </article>
    `).join('') || '<div class="empty-panel">Belum ada review pelanggan.</div>';
}

function renderUploadPreview(previewId, imageUrl, emptyText) {
    const preview = getEl(previewId);
    if (!preview) return;
    if (imageUrl) {
        preview.innerHTML = `<img src="${escapeHtml(imageUrl)}" alt="Preview upload"><span>Gambar lokal siap dipakai.</span>`;
    } else {
        preview.innerHTML = `<i class="fas fa-image"></i><span>${escapeHtml(emptyText)}</span>`;
    }
}

function renderVendorNotifications() {
    const list = getEl('vendor-notification-list');
    const count = getEl('vendor-notification-count');
    const unreadCount = getUnreadNotifications().length;
    if (count) count.textContent = unreadCount;
    updateNotificationStatus();
    if (!list) return;
    list.innerHTML = vendorNotifications.map(renderNotificationItem).join('') || '<div class="empty-panel">Belum ada notifikasi.</div>';
}

function renderNotificationItem(notification) {
    return `
        <button class="notification-item ${isNotificationRead(notification.id) ? '' : 'unread'}" onclick="handleVendorNotificationAction('${escapeHtml(notification.id)}', '${escapeHtml(notification.actionTarget || '')}')">
            <span class="notification-icon"><i class="fas ${notification.type === 'review' ? 'fa-star' : 'fa-receipt'}"></i></span>
            <span>
                <strong>${escapeHtml(notification.title)}</strong>
                <small>${escapeHtml(notification.message)}</small>
                <em>${new Date(notification.createdAt).toLocaleString('id-ID')}</em>
            </span>
        </button>
    `;
}

function getReadNotificationIds() {
    try {
        return JSON.parse(localStorage.getItem('vendor_read_notifications') || '[]');
    } catch (error) {
        return [];
    }
}

function setReadNotificationIds(ids) {
    localStorage.setItem('vendor_read_notifications', JSON.stringify([...new Set(ids)].slice(-200)));
}

function isNotificationRead(id) {
    return getReadNotificationIds().includes(id);
}

function getUnreadNotifications() {
    return vendorNotifications.filter((notification) => !isNotificationRead(notification.id));
}

function handleVendorNotificationAction(notificationId, target) {
    setReadNotificationIds([...getReadNotificationIds(), notificationId]);
    renderVendorNotifications();
    if (target === 'orders') {
        switchVendorTab(null, 'vendor-tab-orders');
    } else if (target === 'reviews') {
        switchVendorTab(null, 'vendor-tab-reviews');
    }
}

async function requestVendorNotificationPermission() {
    if (!('Notification' in window)) {
        showVendorToast('Browser ini belum mendukung notifikasi.', 'error');
        return;
    }
    const permission = await Notification.requestPermission();
    updateNotificationStatus();
    showVendorToast(permission === 'granted' ? 'Notifikasi browser aktif.' : 'Izin notifikasi belum diberikan.', permission === 'granted' ? 'success' : 'error');
}

function updateNotificationStatus() {
    const status = getEl('vendor-notification-status');
    if (!status) return;
    if (!('Notification' in window)) {
        status.textContent = 'Browser tidak mendukung notifikasi';
    } else if (Notification.permission === 'granted') {
        status.textContent = 'Notifikasi browser aktif saat dashboard terbuka';
    } else if (Notification.permission === 'denied') {
        status.textContent = 'Izin notifikasi ditolak di browser';
    } else {
        status.textContent = 'Klik aktifkan untuk notifikasi saat dashboard terbuka';
    }
}

function maybeSendBrowserNotifications() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    getUnreadNotifications().slice(0, 3).forEach((notification) => {
        new Notification(notification.title, {
            body: notification.message,
            tag: notification.id
        });
    });
}

function startVendorNotificationPolling() {
    if (vendorNotificationTimer) return;
    vendorNotificationTimer = setInterval(async () => {
        try {
            const response = await vendorFetch(`${API_URL}/vendor/notifications`);
            if (!response.ok) return;
            vendorNotifications = await response.json();
            renderVendorNotifications();
            renderVendorDashboard();
            maybeSendBrowserNotifications();
        } catch (error) {
            console.warn('Gagal memuat notifikasi vendor', error);
        }
    }, 30000);
}

async function checkVendorSession() {
    try {
        const response = await vendorFetch(`${API_URL}/vendor/session`);
        if (!response.ok) return showVendorAuth();
        const data = await response.json();
        vendorCsrfToken = data.csrfToken || vendorCsrfToken;
        sessionStorage.setItem('vendorCsrfToken', vendorCsrfToken);
        showVendorDashboard(data.vendor);
        await loadVendorData();
    } catch (error) {
        showVendorAuth();
    }
}

window.addEventListener('DOMContentLoaded', checkVendorSession);

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && getEl('vendor-menu-modal')?.classList.contains('active')) {
        closeVendorMenuModal();
    }
});

getEl('vendor-menu-modal')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) closeVendorMenuModal();
});
