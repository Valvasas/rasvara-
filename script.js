const API_URL = '/api';
const DEFAULT_WHATSAPP_NUMBER = '6281234567890';
let products = [];
let cart = (JSON.parse(localStorage.getItem('annie_cart') || '[]') || []).map(item => ({
    ...item,
    quantity: item.quantity || item.qty || 1
}));
let appSettings = {};
let highlightProductId = null;
let activeDetailProductId = null;

const formatRupiah = (number = 0) => {
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

const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const getUnitLabel = (product = {}) => {
    const unit = product.unitType || 'porsi';
    return product.isPackage ? `Paketan - per ${unit}` : `Satuan - per ${unit}`;
};

function showToast(message, type = 'info') {
    const root = document.getElementById('site-toast-root');
    if (!root) return;
    const toast = document.createElement('div');
    toast.className = `site-toast site-toast-${type}`;
    toast.innerHTML = `
        <div class="site-toast-icon"><i class="fas ${type === 'success' ? 'fa-check' : type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-info'}"></i></div>
        <div>${escapeHtml(message)}</div>
    `;
    root.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 20);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 250);
    }, 3600);
}

const setActiveCategory = (category) => {
    document.querySelectorAll('.cat-pill').forEach((button) => {
        button.classList.toggle('active', button.dataset.cat === category);
    });
};

async function initApp() {
    try {
        await Promise.all([loadSettings(), loadProducts()]);
    } catch (error) {
        console.error('Gagal memuat data:', error);
        showToast('Terjadi masalah saat memuat data. Silakan muat ulang halaman.', 'error');
    }

    renderCart();
    renderCartCount();
    showPromoPopup();
}

async function loadSettings() {
    const response = await fetch(`${API_URL}/settings`);
    if (!response.ok) throw new Error('Gagal memuat pengaturan website.');
    appSettings = await response.json();
    applySettings();
}

async function loadProducts() {
    const response = await fetch(`${API_URL}/menus`);
    if (!response.ok) throw new Error('Gagal memuat daftar menu.');
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

function renderProducts(category) {
    const container = document.getElementById('main-product-grid');
    if (!container) return;

    const visibleProducts = category === 'all' ? products : products.filter((product) => product.category === category);
    if (!visibleProducts.length) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bowl-food"></i>
                <p>Menu kategori ini sedang kosong. Silakan pilih kategori lain atau kembali ke Semua Menu.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = visibleProducts
        .map((product) => `
            <article class="product-card">
                <div class="p-image">
                    <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy">
                    <span class="p-category-tag">${escapeHtml(product.category)}</span>
                </div>
                <div class="p-body">
                    <h3>${escapeHtml(product.name)}</h3>
                    <div class="product-meta">
                        <span>${escapeHtml(getUnitLabel(product))}</span>
                        <span>Min. ${Number(product.minOrder || 1)}</span>
                    </div>
                    <p>${escapeHtml(product.desc || 'Deskripsi menu sedang diperbarui.')}</p>
                    <div class="p-footer">
                        <span class="p-price">${formatRupiah(product.price)}<small>/${escapeHtml(product.unitType || 'porsi')}</small></span>
                        <div class="product-actions">
                            <button class="btn-detail" onclick="openProductDetail(${product.id})">Detail</button>
                            <div class="quick-order">
                                <input type="number" id="qty-${product.id}" min="${Number(product.minOrder || 1)}" value="${Number(product.minOrder || 1)}" aria-label="Jumlah ${escapeHtml(product.name)}">
                                <button class="btn-add-cart" onclick="addToCart(${product.id}, getProductQty(${product.id}))">+ Tambah</button>
                            </div>
                        </div>
                    </div>
                </div>
            </article>
        `)
        .join('');
}

function renderHighlight() {
    const promoStrip = document.querySelector('.promo-strip');
    const highlight = appSettings.highlight && appSettings.highlight.status === 'aktif' ? appSettings.highlight : null;
    if (!highlight) {
        if (promoStrip) promoStrip.style.display = 'none';
        return;
    }

    if (promoStrip) promoStrip.style.display = 'grid';
    highlightProductId = highlight.productId || null;
    document.getElementById('h-badge-text').textContent = highlight.badge || 'HOT PROMO';
    document.getElementById('h-img').src = highlight.image || document.getElementById('h-img').src;
    document.getElementById('h-title').textContent = highlight.title || 'Paket Spesial';
    document.getElementById('h-desc').textContent = highlight.desc || 'Paket istimewa untuk momen spesial Anda.';
    document.getElementById('h-price-old').textContent = formatRupiah(highlight.priceOld || 0);
    document.getElementById('h-price-new').textContent = formatRupiah(highlight.priceNew || 0);
}

function filterMenu(category) {
    setActiveCategory(category);
    renderProducts(category);
}

function getProductQty(itemId) {
    const product = products.find((item) => item.id === itemId);
    const minOrder = Math.max(1, Number(product?.minOrder || 1));
    const input = document.getElementById(`qty-${itemId}`);
    const quantity = Math.max(minOrder, Number(input?.value || minOrder));
    if (input) input.value = quantity;
    return quantity;
}

function addToCart(itemId, quantityOverride = null) {
    const product = products.find((product) => product.id === itemId);
    if (!product) {
        showToast('Produk tidak ditemukan.', 'error');
        return;
    }

    const existing = cart.find((item) => item.id === product.id);
    const increment = Math.max(1, Number(quantityOverride || product.minOrder || 1));
    if (existing) {
        existing.quantity += increment;
    } else {
        cart.push({ ...product, quantity: increment });
    }

    saveCart();
    toggleCart(true);
    showToast(`${product.name} ditambahkan ke keranjang.`, 'success');
}

function addHighlightToCart() {
    if (!highlightProductId) {
        showToast('Promo belum tersedia.', 'error');
        return;
    }
    addToCart(highlightProductId);
}

function openProductDetail(itemId) {
    const product = products.find((item) => item.id === itemId);
    if (!product) {
        showToast('Produk tidak ditemukan.', 'error');
        return;
    }
    activeDetailProductId = itemId;
    document.getElementById('detail-image').src = product.image;
    document.getElementById('detail-image').alt = product.name;
    document.getElementById('detail-category').textContent = product.category || 'Menu';
    document.getElementById('detail-title').textContent = product.name;
    document.getElementById('detail-desc').textContent = product.desc || 'Deskripsi menu sedang diperbarui.';
    document.getElementById('detail-unit').textContent = getUnitLabel(product);
    document.getElementById('detail-min-order').textContent = `${Number(product.minOrder || 1)} ${product.unitType || 'porsi'}`;
    document.getElementById('detail-price').textContent = `${formatRupiah(product.price)} / ${product.unitType || 'porsi'}`;
    const quantityInput = document.getElementById('detail-quantity');
    quantityInput.min = Math.max(1, Number(product.minOrder || 1));
    quantityInput.value = Math.max(1, Number(product.minOrder || 1));
    document.getElementById('product-detail-modal').classList.add('show');
}

function closeProductDetail() {
    document.getElementById('product-detail-modal').classList.remove('show');
    activeDetailProductId = null;
}

function addDetailToCart() {
    if (!activeDetailProductId) return;
    const product = products.find((item) => item.id === activeDetailProductId);
    const minOrder = Math.max(1, Number(product?.minOrder || 1));
    const quantityInput = document.getElementById('detail-quantity');
    const quantity = Math.max(minOrder, Number(quantityInput.value || minOrder));
    quantityInput.value = quantity;
    addToCart(activeDetailProductId, quantity);
    closeProductDetail();
}

function toggleCart(open) {
    const overlay = document.getElementById('overlay');
    const sidebar = document.getElementById('cart-sidebar');
    if (!overlay || !sidebar) return;

    const shouldOpen = open !== undefined ? open : !sidebar.classList.contains('open');
    overlay.classList.toggle('active', shouldOpen);
    sidebar.classList.toggle('open', shouldOpen);
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
        container.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-shopping-bag"></i>
                <p>Keranjang Anda masih kosong.</p>
            </div>
        `;
        totalElement.textContent = formatRupiah(0);
        return;
    }

    container.innerHTML = cart
        .map((item) => {
            const itemTotal = item.price * item.quantity;
            return `
                <div class="cart-item">
                    <div class="cart-item-img">
                        <img src="${item.image}" alt="${item.name}" loading="lazy">
                    </div>
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
                        <p>${formatRupiah(item.price)} / ${item.unitType || 'porsi'} · ${item.isPackage ? 'Paketan' : 'Satuan'}</p>
                    </div>
                    <div class="cart-item-qty">
                        <button class="qty-btn" onclick="updateCartItem(${item.id}, ${item.quantity - 1})">−</button>
                        <input class="qty-input" type="number" min="1" value="${item.quantity}" aria-label="Jumlah ${escapeHtml(item.name)}" onchange="updateCartItem(${item.id}, Number(this.value || 1))">
                        <button class="qty-btn" onclick="updateCartItem(${item.id}, ${item.quantity + 1})">+</button>
                        <button class="cart-item-remove" onclick="removeFromCart(${item.id})" aria-label="Hapus item">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
        })
        .join('');

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
    const item = cart.find((product) => product.id === itemId);
    if (!item) return;
    if (quantity <= 0) {
        removeFromCart(itemId);
        return;
    }
    item.quantity = quantity;
    saveCart();
}

function removeFromCart(itemId) {
    cart = cart.filter((product) => product.id !== itemId);
    saveCart();
}

function getSelectedPaymentMethod() {
    const selected = document.querySelector('input[name="payment"]:checked');
    return selected ? selected.value : 'Transfer Bank';
}

function buildWhatsAppMessage(orderDetails) {
    let message = `Halo Naturale Art Catering,%0A%0ASaya ingin memesan:%0A`;
    orderDetails.cartItems.forEach((item) => {
        message += `- ${item.name} x ${item.quantity} ${item.unitType || 'porsi'} (${item.isPackage ? 'Paketan' : 'Satuan'}, ${formatRupiah(item.price)}/${item.unitType || 'porsi'})%0A`;
    });
    message += `%0ATotal: ${formatRupiah(orderDetails.total)}%0A`;
    message += `%0ADetail Pemesanan:%0A`;
    message += `Nama: ${orderDetails.customerName}%0A`;
    message += `WA: ${orderDetails.phone}%0A`;
    if (orderDetails.eventDate) message += `Tanggal Deadline Pesanan: ${orderDetails.eventDate}%0A`;
    message += `Tujuan Pemesanan: ${orderDetails.orderPurpose || orderDetails.eventType}%0A`;
    message += `Cara Pemenuhan: ${orderDetails.fulfillmentType}%0A`;
    message += `Alamat/Titik Ambil: ${orderDetails.address}%0A`;
    if (orderDetails.notes) message += `Catatan: ${orderDetails.notes}%0A`;
    message += `Metode Pembayaran: ${orderDetails.paymentMethod}%0A%0A`;
    message += `Mohon konfirmasi ketersediaan menu, ongkos kirim, dan estimasi waktu pengantaran.`;
    return message;
}

async function processCheckout() {
    if (!cart.length) {
        showToast('Keranjang masih kosong.', 'error');
        return;
    }

    const customerName = getInputValue('order-name');
    const phone = getInputValue('order-phone');
    const eventDate = getInputValue('order-date');
    const orderPurpose = getInputValue('order-type');
    const fulfillmentType = getInputValue('fulfillment-type');
    const address = getInputValue('order-address');
    const notes = getInputValue('order-notes');
    const paymentMethod = getSelectedPaymentMethod();

    if (!customerName || !phone || !address) {
        showToast('Isi Nama, Nomor WhatsApp, dan Alamat/Titik pengambilan terlebih dahulu.', 'error');
        return;
    }

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orderPayload = {
        customerName,
        phone,
        eventDate,
        eventType: orderPurpose,
        orderPurpose,
        fulfillmentType,
        address,
        notes,
        paymentMethod,
        cartItems: cart,
        total: subtotal
    };

    try {
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
        const waLink = `https://wa.me/${DEFAULT_WHATSAPP_NUMBER}?text=${message}`;
        window.open(waLink, '_blank');

        showToast('Pesanan berhasil dikirim. Silakan lanjut konfirmasi di WhatsApp.', 'success');
        cart = [];
        saveCart();
        document.getElementById('order-name').value = '';
        document.getElementById('order-phone').value = '';
        document.getElementById('order-date').value = '';
        document.getElementById('order-type').value = 'Konsumsi Pribadi/Keluarga';
        document.getElementById('fulfillment-type').value = 'Antar ke alamat';
        document.getElementById('order-address').value = '';
        document.getElementById('order-notes').value = '';
        const defaultPayment = document.querySelector('input[name="payment"][value="Transfer Bank"]');
        if (defaultPayment) defaultPayment.checked = true;
        toggleCart();
    } catch (error) {
        console.error('Checkout error:', error);
        showToast(error.message || 'Gagal memproses pesanan. Silakan coba lagi.', 'error');
    }
}

function closePopup() {
    const popup = document.getElementById('promo-popup');
    if (popup) popup.classList.remove('show');
}

function showPromoPopup() {
    const popup = document.getElementById('promo-popup');
    if (!popup) return;
    if (appSettings.highlight && appSettings.highlight.status === 'aktif') {
        setTimeout(() => popup.classList.add('show'), 2500);
    }
}

function goToStoreFromPopup() {
    closePopup();
    switchView('store');
    filterMenu('all');
}

function switchView(viewName) {
    document.querySelectorAll('.view-section').forEach((section) => section.classList.remove('active'));
    const view = document.getElementById(`view-${viewName}`);
    if (view) view.classList.add('active');

    document.querySelectorAll('.nav-links .nav-item').forEach((item) => item.classList.remove('active'));
    document.querySelectorAll('.nav-links .nav-item').forEach((item) => {
        const onclick = item.getAttribute('onclick');
        if (onclick && onclick.includes(`switchView('${viewName}')`)) {
            item.classList.add('active');
        }
    });

    const navLinks = document.getElementById('nav-links');
    if (navLinks) navLinks.classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToContact() {
    const section = document.getElementById('contact');
    if (section) section.scrollIntoView({ behavior: 'smooth' });
    const navLinks = document.getElementById('nav-links');
    if (navLinks) navLinks.classList.remove('open');
}

function toggleMenu() {
    const navLinks = document.getElementById('nav-links');
    if (navLinks) navLinks.classList.toggle('open');
}

window.addEventListener('DOMContentLoaded', initApp);
