const API_URL = '/api';
let adminMenus = [];
let adminOrders = [];

window.toggleLoginVisibility = function() {
    const pinInput = document.getElementById('admin-pin');
    const passInput = document.getElementById('admin-password');
    const toggleCheckbox = document.getElementById('toggle-password');
    if (!pinInput || !passInput || !toggleCheckbox) return;

    const isText = toggleCheckbox.checked;
    pinInput.type = isText ? 'text' : 'password';
    passInput.type = isText ? 'text' : 'password';
};

window.handleLogin = async function(event) {
    if (event) event.preventDefault();

    const pinElement = document.getElementById('admin-pin');
    const passwordElement = document.getElementById('admin-password');
    if (!pinElement || !passwordElement) {
        alert('Form login tidak tersedia. Muat ulang halaman.');
        return;
    }

    const pin = pinElement.value.trim();
    const password = passwordElement.value.trim();
    if (!pin || !password) {
        alert('Mohon isi PIN dan Password.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Login gagal.');
        }

        sessionStorage.setItem('adminLoggedIn', 'true');
        showDashboard();
        await loadAdminData();
    } catch (error) {
        alert(error.message);
        pinElement.value = '';
        passwordElement.value = '';
    }
};

function logout() {
    if (!confirm('Yakin ingin keluar dari Pusat Kendali?')) return;
    sessionStorage.removeItem('adminLoggedIn');
    document.getElementById('login-section').style.display = 'flex';
    document.getElementById('dashboard-section').style.display = 'none';
    document.getElementById('login-form').reset();
}

function switchTab(event, tabId) {
    document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.sidebar-menu li').forEach(li => li.classList.remove('active'));
    const tab = document.getElementById(tabId);
    if (tab) tab.classList.add('active');
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
}

async function loadAdminData() {
    await Promise.all([loadMenuData(), loadOrderData(), loadSettingsData()]);
}

async function loadMenuData() {
    const response = await fetch(`${API_URL}/menus`);
    if (!response.ok) throw new Error('Gagal memuat data menu.');
    adminMenus = await response.json();
    renderAdminMenuTable();
}

async function loadOrderData() {
    const response = await fetch(`${API_URL}/orders`);
    if (!response.ok) throw new Error('Gagal memuat daftar pesanan.');
    adminOrders = await response.json();
    renderOrdersTable();
}

async function loadSettingsData() {
    const response = await fetch(`${API_URL}/settings`);
    if (!response.ok) throw new Error('Gagal memuat pengaturan.');
    const settings = await response.json();
    populateGeneralSettings(settings);
    populatePromoSettings(settings);
}

function populateGeneralSettings(settings) {
    document.getElementById('set-hero-title').value = settings.heroTitle || '';
    document.getElementById('set-hero-desc').value = settings.heroDesc || '';
    document.getElementById('set-hero-img').value = settings.heroImg || '';
    document.getElementById('set-profile-title').value = settings.profileTitle || '';
    document.getElementById('set-profile-desc').value = settings.profileDesc || '';
    document.getElementById('set-profile-img').value = settings.profileImg || '';
    document.getElementById('set-testi1-text').value = settings.testi1Text || '';
    document.getElementById('set-testi1-name').value = settings.testi1Name || '';
    document.getElementById('set-testi2-text').value = settings.testi2Text || '';
    document.getElementById('set-testi2-name').value = settings.testi2Name || '';
    document.getElementById('set-footer-desc').value = settings.footerDesc || '';
    document.getElementById('set-footer-wa').value = settings.footerWa || '';
    document.getElementById('set-footer-email').value = settings.footerEmail || '';
}

function populatePromoSettings(settings) {
    const highlight = settings.highlight || {};
    document.getElementById('promo-status').value = highlight.status || 'aktif';
    document.getElementById('promo-title').value = highlight.title || 'Kelembutan Tradisi';
    document.getElementById('promo-badge').value = highlight.badge || 'Save 20%';
    document.getElementById('promo-desc').value = highlight.desc || 'Rasakan legitnya bolu jadul resep rahasia keluarga kami.';
    document.getElementById('promo-image').value = highlight.image || '';
}

function showDashboard() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'flex';
}

async function saveGeneralSettings() {
    const payload = {
        heroTitle: document.getElementById('set-hero-title').value,
        heroDesc: document.getElementById('set-hero-desc').value,
        heroImg: document.getElementById('set-hero-img').value,
        profileTitle: document.getElementById('set-profile-title').value,
        profileDesc: document.getElementById('set-profile-desc').value,
        profileImg: document.getElementById('set-profile-img').value,
        testi1Text: document.getElementById('set-testi1-text').value,
        testi1Name: document.getElementById('set-testi1-name').value,
        testi2Text: document.getElementById('set-testi2-text').value,
        testi2Name: document.getElementById('set-testi2-name').value,
        footerDesc: document.getElementById('set-footer-desc').value,
        footerWa: document.getElementById('set-footer-wa').value,
        footerEmail: document.getElementById('set-footer-email').value
    };

    await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    alert('Pengaturan website berhasil disimpan.');
}

async function savePromoSettings() {
    const payload = {
        highlight: {
            status: document.getElementById('promo-status').value,
            title: document.getElementById('promo-title').value,
            badge: document.getElementById('promo-badge').value,
            desc: document.getElementById('promo-desc').value,
            image: document.getElementById('promo-image').value,
            priceOld: 500000,
            priceNew: 450000,
            productId: 1
        }
    };

    await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    alert('Pengaturan promo berhasil disimpan.');
}

function renderAdminMenuTable() {
    const tbody = document.getElementById('menu-table-body');
    if (!tbody) return;
    tbody.innerHTML = adminMenus.map(menu => `
        <tr>
            <td><img src="${menu.image}" alt="${menu.name}"></td>
            <td style="font-weight: 600;">${menu.name}</td>
            <td style="text-transform: capitalize;">${menu.category}</td>
            <td>${formatPrice(menu.price)}</td>
            <td>
                <button class="btn-edit" onclick="editMenu(${menu.id})" title="Edit"><i class="fas fa-edit"></i></button>
                <button class="btn-delete" onclick="deleteMenu(${menu.id})" title="Hapus"><i class="fas fa-trash-alt"></i></button>
            </td>
        </tr>
    `).join('');
}

function renderOrdersTable() {
    const tbody = document.getElementById('orders-table-body');
    if (!tbody) return;
    tbody.innerHTML = adminOrders.map(order => `
        <tr>
            <td>${new Date(order.createdAt).toLocaleString('id-ID')}</td>
            <td>${order.customerName}</td>
            <td>${order.phone}</td>
            <td>${order.cartItems.reduce((sum, item) => sum + item.quantity, 0)}</td>
            <td>${formatPrice(order.total)}</td>
            <td>${order.status}</td>
        </tr>
    `).join('');
}

function formatPrice(amount) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

function openMenuModal(menuId = null) {
    document.getElementById('menu-modal').classList.add('active');
    const title = document.getElementById('modal-title');
    const currentId = document.getElementById('current-menu-id');
    const nameInput = document.getElementById('input-menu-name');
    const categoryInput = document.getElementById('input-menu-category');
    const priceInput = document.getElementById('input-menu-price');
    const descInput = document.getElementById('input-menu-desc');
    const imageInput = document.getElementById('input-menu-image');

    if (!menuId) {
        title.textContent = 'Tambah Menu Baru';
        currentId.value = '';
        nameInput.value = '';
        categoryInput.value = 'berat';
        priceInput.value = '';
        descInput.value = '';
        imageInput.value = '';
        return;
    }

    const menu = adminMenus.find(item => item.id === menuId);
    if (!menu) return;

    title.textContent = 'Edit Menu';
    currentId.value = menu.id;
    nameInput.value = menu.name;
    categoryInput.value = menu.category;
    priceInput.value = menu.price;
    descInput.value = menu.desc || '';
    imageInput.value = menu.image;
}

function closeMenuModal() {
    document.getElementById('menu-modal').classList.remove('active');
}

async function saveMenuData() {
    const menuId = document.getElementById('current-menu-id').value;
    const name = document.getElementById('input-menu-name').value.trim();
    const category = document.getElementById('input-menu-category').value;
    const price = Number(document.getElementById('input-menu-price').value);
    const desc = document.getElementById('input-menu-desc').value.trim();
    const image = document.getElementById('input-menu-image').value.trim();

    if (!name || !price || !image) {
        return alert('Lengkapi Nama, Harga, dan Gambar menu.');
    }

    const payload = { name, category, price, desc, image };
    const method = menuId ? 'PUT' : 'POST';
    const url = menuId ? `${API_URL}/menus/${menuId}` : `${API_URL}/menus`;

    const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json();
        return alert(error.message || 'Gagal menyimpan menu.');
    }

    await loadMenuData();
    closeMenuModal();
    alert('Menu berhasil disimpan.');
}

async function deleteMenu(menuId) {
    if (!confirm('Apakah Anda yakin ingin menghapus menu ini?')) return;
    const response = await fetch(`${API_URL}/menus/${menuId}`, { method: 'DELETE' });
    if (!response.ok) {
        const error = await response.json();
        return alert(error.message || 'Gagal menghapus menu.');
    }
    await loadMenuData();
    alert('Menu berhasil dihapus.');
}

function editMenu(menuId) {
    openMenuModal(menuId);
}

async function checkAdminSession() {
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        showDashboard();
        try { await loadAdminData(); } catch (error) { console.error(error); }
    }
}

window.addEventListener('DOMContentLoaded', checkAdminSession);
