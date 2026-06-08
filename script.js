/* =========================================================
   1. DATA & STATE
========================================================= */
const API_URL = '/api';
let products = [];
let cart = JSON.parse(localStorage.getItem('annie_cart') || '[]');
let appSettings = {};
let highlightProductId = null;

/* =========================================================
   2. UTILITIES
========================================================= */
const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(number);
};

const getInputValue = (id) => {
    const element = document.getElementById(id);
    return element ? element.value.trim() : '';
};

/* =========================================================
   3. INIT APPLICATION
========================================================= */
async function initApp() {
    try {
        await Promise.all([loadSettings(), loadProducts()]);
    } catch (error) {
        console.error('Gagal memuat data:', error);
        alert('Terjadi masalah saat memuat data. Silakan muat ulang halaman.');
    }

    renderCart();
    renderCartCount();

    setTimeout(() => {
        const promoPopup = document.getElementById('promo-popup');
        if (promoPopup) promoPopup.style.display = 'flex';
    }, 2500);
}

async function loadSettings() {
    const response = await fetch(`${API_URL}/settings`);
    if (!response.ok) throw new Error('Gagal memuat pengaturan website');
    appSettings = await response.json();
    applySettings();
}

async function loadProducts() {
    const response = await fetch(`${API_URL}/menus`);
    if (!response.ok) throw new Error('Gagal memuat daftar menu');
    products = await response.json();
    renderProducts('all');
    renderHighlight();
}

function applySettings() {
    const heroTitle = document.getElementById('hero-title');
    const heroDesc = document.getElementById('hero-desc');
    const heroImg = document.getElementById('hero-img');
    const profileTitle = document.getElementById('profile-title');
    const profileDesc = document.getElementById('profile-desc');
    const profileImg = document.getElementById('profile-img');
    const testi1Text = document.getElementById('testi1-text');
    const testi1Name = document.getElementById('testi1-name');
    const testi2Text = document.getElementById('testi2-text');
    const testi2Name = document.getElementById('testi2-name');
    const footerDesc = document.getElementById('footer-desc');
    const footerWa = document.getElementById('footer-wa');
    const footerEmail = document.getElementById('footer-email');

    if (heroTitle) heroTitle.innerHTML = appSettings.heroTitle || heroTitle.innerHTML;
    if (heroDesc) heroDesc.textContent = appSettings.heroDesc || heroDesc.textContent;
    if (heroImg && appSettings.heroImg) heroImg.src = appSettings.heroImg;
    if (profileTitle) profileTitle.textContent = appSettings.profileTitle || profileTitle.textContent;
    if (profileDesc) profileDesc.textContent = appSettings.profileDesc || profileDesc.textContent;
    if (profileImg && appSettings.profileImg) profileImg.src = appSettings.profileImg;
    if (testi1Text) testi1Text.textContent = appSettings.testi1Text || testi1Text.textContent;
    if (testi1Name) testi1Name.textContent = appSettings.testi1Name || testi1Name.textContent;
    if (testi2Text) testi2Text.textContent = appSettings.testi2Text || testi2Text.textContent;
    if (testi2Name) testi2Name.textContent = appSettings.testi2Name || testi2Name.textContent;
    if (footerDesc) footerDesc.textContent = appSettings.footerDesc || footerDesc.textContent;
    if (footerWa) footerWa.textContent = appSettings.footerWa || footerWa.textContent;
    if (footerEmail) footerEmail.textContent = appSettings.footerEmail || footerEmail.textContent;
}

/* =========================================================
   4. RENDER MENU & HIGHLIGHT
========================================================= */
function renderProducts(category) {
    const container = document.getElementById('main-product-grid');
    if (!container) return;

    const visibleProducts = category === 'all' ? products : products.filter(product => product.category === category);
    if (!visibleProducts.length) {
        container.innerHTML = '<div class="empty-cart-msg">Menu kategori ini sedang kosong. Silakan pilih kategori lain.</div>';
        return;
    }

    container.innerHTML = visibleProducts.map(product => `
        <div class="product-card">
            <div class="p-img-box"><img src="${product.image}" alt="${product.name}"></div>
            <div class="p-details">
                <h3>${product.name}</h3>
                <p>${product.desc}</p>
                <div class="p-action">
                    <span class="price">${formatRupiah(product.price)}</span>
                    <button class="btn-add" onclick="addToCart(${product.id})">Tambah</button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderHighlight() {
    const highlight = appSettings.highlight && appSettings.highlight.status === 'aktif' ? appSettings.highlight : null;
    if (!highlight) return;

    highlightProductId = highlight.productId || null;
    document.getElementById('h-badge-text').textContent = highlight.badge || 'HOT PROMO';
    document.getElementById('h-img').src = highlight.image || document.getElementById('h-img').src;
    document.getElementById('h-title').textContent = highlight.title || 'Paket Spesial';
    document.getElementById('h-desc').textContent = highlight.desc || 'Paket istimewa untuk momen spesial Anda.';
    document.getElementById('h-price-old').textContent = formatRupiah(highlight.priceOld || 0);
    document.getElementById('h-price-new').textContent = formatRupiah(highlight.priceNew || 0);
}

function filterMenu(category) {
    document.querySelectorAll('.cat-btn').forEach(button => {
        button.classList.remove('active');
        const text = button.textContent.toLowerCase();
        if ((category === 'all' && text.includes('semua')) || (category !== 'all' && text.includes(category))) {
            button.classList.add('active');
        }
    });
    renderProducts(category);
}

/* =========================================================
   5. KERANJANG (CART) LOGIC
========================================================= */
function addToCart(itemId) {
    const product = products.find(product => product.id === itemId);
    if (!product) {
        alert('Produk tidak ditemukan.');
        return;
    }

    const existing = cart.find(item => item.id === product.id);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    saveCart();
    toggleCart(true);
}

function addHighlightToCart() {
    if (!highlightProductId) {
        alert('Promo belum tersedia.');
        return;
    }
    addToCart(highlightProductId);
}

function toggleCart(forceOpen = false) {
    const cartSidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('overlay');
    if (!cartSidebar || !overlay) return;
    const isOpen = cartSidebar.classList.contains('open');
    if (forceOpen || !isOpen) {
        cartSidebar.classList.add('open');
        overlay.classList.add('active');
    } else {
        cartSidebar.classList.remove('open');
        overlay.classList.remove('active');
    }
}

function saveCart() {
    localStorage.setItem('annie_cart', JSON.stringify(cart));
    renderCart();
    renderCartCount();
}

function renderCart() {
    const container = document.getElementById('cart-items-container');
    const totalElement = document.getElementById('cart-total');
    if (!container || !totalElement) return;

    if (!cart.length) {
        container.innerHTML = '<div class="empty-cart-msg">Keranjang Anda masih kosong.</div>';
        totalElement.textContent = formatRupiah(0);
        return;
    }

    container.innerHTML = cart.map(item => `
        <div class="cart-item-row">
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p>${formatRupiah(item.price)} x ${item.quantity}</p>
            </div>
            <div class="cart-item-actions">
                <button class="btn-add" onclick="updateCartItem(${item.id}, ${item.quantity - 1})">-</button>
                <span>${item.quantity}</span>
                <button class="btn-add" onclick="updateCartItem(${item.id}, ${item.quantity + 1})">+</button>
                <button class="cart-item-remove" onclick="removeFromCart(${item.id})">×</button>
            </div>
        </div>
    `).join('');

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    totalElement.textContent = formatRupiah(subtotal);
}

function renderCartCount() {
    const countElement = document.getElementById('cart-count');
    if (!countElement) return;
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    countElement.textContent = totalItems;
}

function updateCartItem(itemId, quantity) {
    const item = cart.find(product => product.id === itemId);
    if (!item) return;
    if (quantity <= 0) {
        removeFromCart(itemId);
        return;
    }
    item.quantity = quantity;
    saveCart();
}

function removeFromCart(itemId) {
    cart = cart.filter(product => product.id !== itemId);
    saveCart();
}

function getSelectedPaymentMethod() {
    const selected = document.querySelector('input[name="payment"]:checked');
    return selected ? selected.value : 'Transfer Bank';
}

function buildWhatsAppMessage(orderDetails) {
    let message = `Halo Naturale Art Catering,%0A%0ASaya ingin memesan:%0A`;
    orderDetails.cartItems.forEach(item => {
        message += `- ${item.name} x ${item.quantity} (${formatRupiah(item.price)})%0A`;
    });
    message += `%0ATotal: ${formatRupiah(orderDetails.total)}%0A`;
    message += `%0ADetail Pemesanan:%0A`;
    message += `Nama: ${orderDetails.customerName}%0A`;
    message += `WA: ${orderDetails.phone}%0A`;
    if (orderDetails.eventDate) message += `Tanggal Acara: ${orderDetails.eventDate}%0A`;
    message += `Jenis Acara: ${orderDetails.eventType}%0A`;
    message += `Alamat: ${orderDetails.address}%0A`;
    if (orderDetails.notes) message += `Catatan: ${orderDetails.notes}%0A`;
    message += `Metode Pembayaran: ${orderDetails.paymentMethod}%0A%0A`;
    message += `Mohon konfirmasi ketersediaan menu, ongkos kirim, dan estimasi waktu pengantaran.`;
    return message;
}

async function processCheckout() {
    if (!cart.length) {
        alert('Keranjang masih kosong.');
        return;
    }

    const customerName = getInputValue('order-name');
    const phone = getInputValue('order-phone');
    const eventDate = getInputValue('order-date');
    const eventType = getInputValue('order-type');
    const address = getInputValue('order-address');
    const notes = getInputValue('order-notes');
    const paymentMethod = getSelectedPaymentMethod();

    if (!customerName || !phone || !address) {
        alert('Isi Nama, Nomor WhatsApp, dan Alamat acara terlebih dahulu.');
        return;
    }

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orderPayload = {
        customerName,
        phone,
        eventDate,
        eventType,
        address,
        notes,
        paymentMethod,
        cartItems: cart,
        total: subtotal
    };

    const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal mengirim pesanan.');
    }

    const data = await response.json();
    const message = buildWhatsAppMessage(data.order);
    const waLink = `https://wa.me/6281234567890?text=${message}`;
    window.open(waLink, '_blank');
    alert('Pesanan berhasil dikirim ke WhatsApp. Silakan konfirmasi lebih lanjut di chat.');

    cart = [];
    saveCart();
    document.getElementById('order-name').value = '';
    document.getElementById('order-phone').value = '';
    document.getElementById('order-date').value = '';
    document.getElementById('order-address').value = '';
    document.getElementById('order-notes').value = '';
    toggleCart();
}

function closePopup() {
    const popup = document.getElementById('promo-popup');
    if (popup) popup.style.display = 'none';
}

function goToStoreFromPopup() {
    closePopup();
    switchView('store');
}

function switchView(viewName) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    const view = document.getElementById(`view-${viewName}`);
    if (view) view.classList.add('active');
    document.querySelectorAll('.nav-links .nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-links .nav-item').forEach(el => {
        if (el.getAttribute('onclick') && el.getAttribute('onclick').includes(`switchView('${viewName}')`)) {
            el.classList.add('active');
        }
    });
    document.querySelector('.nav-links').classList.remove('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToContact() {
    document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
    document.querySelector('.nav-links').classList.remove('active');
}

function toggleMenu() {
    document.querySelector('.nav-links').classList.toggle('active');
}

window.addEventListener('DOMContentLoaded', initApp);