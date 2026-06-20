const API_URL = '/api';
const DEFAULT_WHATSAPP_NUMBER = '6281234567890';
let products = [];
let vendors = [];
let cart = (JSON.parse(localStorage.getItem('rasvara_cart') || '[]') || []).map(item => ({
    ...item,
    quantity: item.quantity || item.qty || 1
}));
let appSettings = {};
let highlightProductId = null;
let activeDetailProductId = null;
let activeDetailVendorId = null;
let activeStoreVendorId = null;
let activeCategory = 'all';
let activeVendorFilter = 'all';
let catalogSearch = '';
let catalogSort = 'featured';
let catalogView = 'storefront';
let catalogAvailability = 'all';
let catalogMaxPrice = '';
const SAVED_TRACKING_KEY = 'rasvara_tracking_orders';
let lastSuccessfulOrder = null;
const vendorReviewsCache = new Map();
const ORDER_PROGRESS_STATUSES = [
    'Menunggu Persetujuan',
    'Disetujui',
    'Diproses',
    'Siap Dikirim/Diambil',
    'Selesai'
];

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

const sanitizeAllowedMarkup = (value = '') => escapeHtml(value)
    .replace(/&lt;br\s*\/?&gt;/gi, '<br>')
    .replace(/&lt;(\/?)(i|em)&gt;/gi, '<$1$2>');

const normalizeWhatsappNumber = (value = '') => {
    const digits = String(value).replace(/\D/g, '');
    if (!digits) return DEFAULT_WHATSAPP_NUMBER;
    if (digits.startsWith('0')) return `62${digits.slice(1)}`;
    return digits;
};

const buildWhatsAppLink = (message = '') => {
    const business = getBusinessSettings();
    const explicitLink = business.whatsappUrl || '';
    const text = message ? `?text=${encodeURIComponent(message)}` : '';

    if (explicitLink) {
        try {
            const url = new URL(explicitLink);
            if (url.hostname.includes('wa.me') || url.hostname.includes('whatsapp.com')) {
                if (message && !url.searchParams.has('text')) url.searchParams.set('text', message);
                return url.toString();
            }
        } catch (error) {
            return `https://wa.me/${normalizeWhatsappNumber(business.whatsapp || appSettings.footerWa)}${text}`;
        }
    }

    return `https://wa.me/${normalizeWhatsappNumber(business.whatsapp || appSettings.footerWa)}${text}`;
};

const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element && value) element.textContent = value;
};

const setMultilineText = (id, value) => {
    const element = document.getElementById(id);
    if (element && value) element.innerHTML = escapeHtml(value).replace(/\n/g, '<br>');
};

const setLink = (id, href) => {
    const element = document.getElementById(id);
    if (!element) return;
    if (href) {
        element.href = href;
        element.target = '_blank';
        element.rel = 'noopener noreferrer';
        element.style.display = '';
    } else {
        element.style.display = 'none';
    }
};

const getBusinessSettings = () => appSettings.business || {};

const getUnitLabel = (product = {}) => {
    const unit = product.unitType || 'porsi';
    return product.isPackage ? `Paketan - per ${unit}` : `Satuan - per ${unit}`;
};

const getVendorName = (product = {}) => product.vendor?.storeName || product.vendorName || 'Rasvara Official';
const getVendorId = (product = {}) => Number(product.vendor?.id ?? product.vendorId ?? 0);
const isProductOrderable = (product = {}) => product.availability !== 'sold_out' && product.availability !== 'draft';
const getInitials = (value = 'TK') => String(value).trim().split(/\s+/).slice(0, 2).map((word) => word[0] || '').join('').toUpperCase() || 'TK';
const renderAvatar = (vendor = {}, fallback = 'TK') => vendor.avatar
    ? `<img src="${escapeHtml(vendor.avatar)}" alt="${escapeHtml(vendor.storeName || fallback)}">`
    : escapeHtml(getInitials(vendor.storeName || fallback));

const getVendorWhatsapp = (vendor = {}) => vendor.whatsapp || getBusinessSettings().whatsapp || appSettings.footerWa || '';
const getVendorAddress = (vendor = {}) => vendor.address || getBusinessSettings().address || '';
const getSellerRating = (vendor = {}) => Number(vendor.averageRating || 0).toFixed(1);
const getProductHash = (itemId) => `produk-${itemId}`;
const getMapSearchLink = (address = '') => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || 'Rasvara Catering')}`;

const buildSellerChatMessage = (vendor = {}, product = null) => {
    const productLine = product ? `Saya mau tanya produk "${product.name}". ` : '';
    return `Halo ${vendor.storeName || 'Penjual'}, ${productLine}Apakah masih tersedia dan bisa dipesan?`;
};

function getFallbackReviews(vendorId) {
    if (Number(vendorId) !== 0) return [];
    const candidates = [
        {
            id: 'testi-1',
            customerName: appSettings.testi1Name || 'Amanda R.',
            rating: 5,
            comment: appSettings.testi1Text || 'Tumpengnya cantik dan rasanya otentik.',
            createdAt: new Date().toISOString()
        },
        {
            id: 'testi-2',
            customerName: appSettings.testi2Name || 'dr. Faisal',
            rating: 5,
            comment: appSettings.testi2Text || 'Packaging elegan dan cocok untuk hampers.',
            createdAt: new Date().toISOString()
        }
    ];
    return candidates.filter((review) => review.comment);
}

async function getVendorReviews(vendorId) {
    const key = String(vendorId);
    if (vendorReviewsCache.has(key)) return vendorReviewsCache.get(key);
    try {
        const response = await fetch(`${API_URL}/vendors/${vendorId}/reviews`);
        if (!response.ok) throw new Error('Gagal memuat review toko.');
        const reviews = await response.json();
        const normalized = Array.isArray(reviews) && reviews.length ? reviews : getFallbackReviews(vendorId);
        vendorReviewsCache.set(key, normalized);
        return normalized;
    } catch (error) {
        const fallback = getFallbackReviews(vendorId);
        vendorReviewsCache.set(key, fallback);
        return fallback;
    }
}

function renderReviewStars(rating = 0) {
    const fullStars = Math.max(0, Math.min(5, Math.round(Number(rating || 0))));
    return `${'★'.repeat(fullStars)}${'☆'.repeat(5 - fullStars)}`;
}

function formatReviewDate(value = '') {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return 'Baru saja';
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

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

function hideSiteLoader() {
    const loader = document.getElementById('site-loader');
    if (!loader || loader.classList.contains('is-hidden')) return;
    loader.classList.add('is-hidden');
    setTimeout(() => loader.remove(), 520);
}

async function initApp() {
    try {
        await Promise.all([loadSettings(), loadProducts(), loadVendors()]);
        renderSellerRail();
        renderProducts();
        renderHighlight();
        renderSavedTrackingOrders();
        openTrackingFromUrl();
        openRouteFromHash();
    } catch (error) {
        console.error('Gagal memuat data:', error);
        showToast('Terjadi masalah saat memuat data. Silakan muat ulang halaman.', 'error');
    }

    renderCart();
    renderCartCount();
    showPromoPopup();
    hideSiteLoader();
}

function openProductFromHash() {
    const match = window.location.hash.match(/^#produk-(\d+)$/);
    if (!match) return;
    switchView('store', { keepStore: true });
    openProductDetail(Number(match[1]), { skipHash: true });
}

function openRouteFromHash() {
    const productMatch = window.location.hash.match(/^#produk-(\d+)$/);
    const storeMatch = window.location.hash.match(/^#toko-(\d+)$/);
    if (productMatch) {
        switchView('store', { keepStore: true });
        openProductDetail(Number(productMatch[1]), { skipHash: true });
        return true;
    }
    if (storeMatch) {
        switchView('store', { keepStore: true });
        openStorePage(Number(storeMatch[1]), { skipHash: true });
        return true;
    }
    return false;
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
}

async function loadVendors() {
    const response = await fetch(`${API_URL}/vendors`);
    if (!response.ok) throw new Error('Gagal memuat daftar toko.');
    vendors = await response.json();
}

function applySettings() {
    const business = getBusinessSettings();
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
    const footerWaLink = document.getElementById('footer-wa-link');
    const footerEmail = document.getElementById('footer-email');
    const footerEmailLink = document.getElementById('footer-email-link');
    const footerMap = document.getElementById('footer-map');

    const legalName = business.legalName || `${business.brandName || 'Rasvara'} ${business.brandSubtitle || 'Catering'}`.trim();
    const seoTitle = business.seoTitle || `${legalName} — ${business.tagline || 'Mahakarya Rasa Keluarga'}`;
    document.title = seoTitle;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription && business.seoDescription) metaDescription.setAttribute('content', business.seoDescription);
    setText('nav-brand-name', business.brandName);
    setText('nav-brand-subtitle', business.brandSubtitle);
    setText('loader-brand-name', business.brandName);
    setText('loader-brand-subtitle', business.brandSubtitle);
    setText('footer-brand-name', business.brandName || legalName);
    setText('footer-tagline', business.tagline);
    setMultilineText('footer-hours', business.openingHours);
    setMultilineText('footer-address', business.address);
    setText('footer-copyright', business.copyrightText || `© ${new Date().getFullYear()} ${legalName}`);
    setLink('social-instagram', business.instagramUrl);
    setLink('social-tiktok', business.tiktokUrl);
    setLink('social-whatsapp', buildWhatsAppLink('Halo, saya ingin bertanya tentang menu dan pemesanan catering.'));
    if (footerMap && business.mapsEmbedUrl) footerMap.src = business.mapsEmbedUrl;

    if (heroTitle) heroTitle.innerHTML = appSettings.heroTitle ? sanitizeAllowedMarkup(appSettings.heroTitle) : heroTitle.innerHTML;
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
    if (footerWa) footerWa.textContent = business.whatsapp || appSettings.footerWa || footerWa.textContent;
    if (footerWaLink) {
        footerWaLink.href = buildWhatsAppLink('Halo, saya ingin bertanya tentang menu dan pemesanan catering.');
        footerWaLink.target = '_blank';
        footerWaLink.rel = 'noopener noreferrer';
    }
    if (footerEmail) footerEmail.textContent = business.email || appSettings.footerEmail || footerEmail.textContent;
    if (footerEmailLink && (business.email || appSettings.footerEmail)) {
        footerEmailLink.href = `mailto:${business.email || appSettings.footerEmail}`;
    }
}

function getVendorProfile(vendorId) {
    return vendors.find((vendor) => Number(vendor.id) === Number(vendorId)) || {
        id: vendorId,
        storeName: vendorId ? 'Toko Pedagang' : 'Rasvara Official',
        bio: vendorId ? 'Pedagang marketplace Rasvara.' : 'Etalase resmi Rasvara Marketplace.',
        menuCount: products.filter((product) => getVendorId(product) === Number(vendorId)).length,
        averageRating: 0,
        reviewCount: 0,
        isOfficial: Number(vendorId) === 0
    };
}

function getFilteredProducts() {
    const query = catalogSearch.trim().toLowerCase();
    const filtered = products.filter((product) => {
        const matchesCategory = activeCategory === 'all' || product.category === activeCategory;
        const matchesVendor = activeVendorFilter === 'all' || getVendorId(product) === Number(activeVendorFilter);
        const matchesAvailability = catalogAvailability === 'all'
            || (catalogAvailability === 'ready' && isProductOrderable(product))
            || (catalogAvailability === 'sold_out' && product.availability === 'sold_out');
        const matchesMaxPrice = !catalogMaxPrice || Number(product.price || 0) <= Number(catalogMaxPrice);
        const searchable = `${product.name || ''} ${product.desc || ''} ${product.category || ''} ${getVendorName(product)}`.toLowerCase();
        const matchesSearch = !query || searchable.includes(query);
        return matchesCategory && matchesVendor && matchesAvailability && matchesMaxPrice && matchesSearch;
    });

    return filtered.sort((a, b) => {
        if (catalogSort === 'price-low') return Number(a.price || 0) - Number(b.price || 0);
        if (catalogSort === 'price-high') return Number(b.price || 0) - Number(a.price || 0);
        if (catalogSort === 'min-order') return Number(a.minOrder || 1) - Number(b.minOrder || 1);
        return Number(b.availability === 'active') - Number(a.availability === 'active') || Number(a.price || 0) - Number(b.price || 0);
    });
}

function groupProductsByVendor(items) {
    return items.reduce((groups, product) => {
        const vendorId = getVendorId(product);
        if (!groups.has(vendorId)) groups.set(vendorId, []);
        groups.get(vendorId).push(product);
        return groups;
    }, new Map());
}

function renderProducts() {
    const container = document.getElementById('main-product-grid');
    const storefront = document.getElementById('storefront-list');
    if (!container) return;

    const visibleProducts = getFilteredProducts();
    renderCatalogStatus(visibleProducts.length);
    if (!visibleProducts.length) {
        if (storefront) storefront.innerHTML = '';
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bowl-food"></i>
                <p>Menu belum ditemukan. Coba ubah toko, kategori, atau kata pencarian.</p>
            </div>
        `;
        return;
    }

    if (catalogView === 'storefront') {
        container.innerHTML = '';
        if (storefront) {
            const grouped = groupProductsByVendor(visibleProducts);
            storefront.innerHTML = [...grouped.entries()].map(([vendorId, items], index) => renderStorefrontGroup(vendorId, items, index)).join('');
        }
    } else {
        if (storefront) storefront.innerHTML = '';
        container.innerHTML = visibleProducts.map((product, index) => renderProductCard(product, index)).join('');
    }
}

function renderProductCard(product, index = 0) {
    const vendor = getVendorProfile(getVendorId(product));
    return `
        <article class="product-card catalog-animate" style="animation-delay:${Math.min(index * 45, 360)}ms">
            <button class="p-image product-open-area" onclick="openProductDetail(${product.id})" aria-label="Buka detail ${escapeHtml(product.name)}">
                <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy">
                <span class="p-category-tag">${product.availability === 'sold_out' ? 'Habis' : escapeHtml(product.category)}</span>
            </button>
            <div class="p-body">
                <button class="vendor-line vendor-line-rich" onclick="openStorePage(${getVendorId(product)})">
                    <span class="vendor-mini-avatar">${renderAvatar(vendor, getVendorName(product))}</span>
                    <span>${escapeHtml(getVendorName(product))}</span>
                </button>
                <button class="product-title-button" onclick="openProductDetail(${product.id})">
                    <h3>${escapeHtml(product.name)}</h3>
                </button>
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
                            <button class="btn-add-cart" onclick="addToCart(${product.id}, getProductQty(${product.id}))" ${isProductOrderable(product) ? '' : 'disabled'}>${isProductOrderable(product) ? '+ Tambah' : 'Habis'}</button>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    `;
}

function renderStorefrontGroup(vendorId, items, index = 0) {
    const vendor = getVendorProfile(vendorId);
    const topItems = items.slice(0, 6);
    return `
        <section class="storefront-group catalog-animate" style="animation-delay:${Math.min(index * 70, 420)}ms">
            <div class="storefront-head">
                <div class="seller-avatar seller-avatar-lg">${renderAvatar(vendor, 'Toko')}</div>
                <div>
                    <span class="seller-type">${vendor.isOfficial ? 'Official Store' : 'Pedagang'}</span>
                    <h3>${escapeHtml(vendor.storeName || 'Toko')}</h3>
                    <p>${escapeHtml(vendor.bio || 'Etalase jajanan pilihan dari marketplace.')}</p>
                    <div class="seller-meta">
                        <span><i class="fas fa-bowl-food"></i> ${items.length} menu cocok</span>
                        <span><i class="fas fa-star"></i> ${Number(vendor.averageRating || 0).toFixed(1)} rating</span>
                        <span><i class="fas fa-location-dot"></i> ${escapeHtml(vendor.address || getBusinessSettings().address || 'Lokasi fleksibel')}</span>
                    </div>
                </div>
                <div class="storefront-actions">
                    <button class="btn-mini-link" onclick="openStorePage(${Number(vendorId)})">Buka toko</button>
                    <button class="btn-mini-link solid" onclick="openSellerChat('${vendorId}')"><i class="fab fa-whatsapp"></i> Chat</button>
                </div>
            </div>
            <div class="product-grid storefront-products">
                ${topItems.map((product, productIndex) => renderProductCard(product, productIndex)).join('')}
            </div>
        </section>
    `;
}

function renderSellerRail() {
    const rail = document.getElementById('seller-rail');
    if (!rail) return;
    const vendorSummaries = vendors.length ? vendors : [getVendorProfile(0)];
    rail.innerHTML = [
        `<button class="seller-card ${activeVendorFilter === 'all' ? 'active' : ''}" onclick="selectVendorFilter('all')">
            <span class="seller-avatar"><i class="fas fa-border-all"></i></span>
            <strong>Semua Toko</strong>
            <small>${products.length} menu tersedia</small>
        </button>`,
        ...vendorSummaries.map((vendor) => `
            <button class="seller-card ${String(activeVendorFilter) === String(vendor.id) ? 'active' : ''}" onclick="openStorePage(${Number(vendor.id)})">
                <span class="seller-avatar">${renderAvatar(vendor, 'TK')}</span>
                <strong>${escapeHtml(vendor.storeName)}</strong>
                <small>${Number(vendor.menuCount || products.filter((product) => getVendorId(product) === Number(vendor.id)).length)} menu · ${Number(vendor.averageRating || 0).toFixed(1)}★</small>
            </button>
        `)
    ].join('');
}

function renderCatalogStatus(count) {
    const status = document.getElementById('catalog-status');
    if (!status) return;
    const vendorName = activeVendorFilter === 'all' ? 'semua toko' : getVendorProfile(activeVendorFilter).storeName;
    status.innerHTML = `
        <span>${count} menu ditemukan dari ${escapeHtml(vendorName)}${activeCategory !== 'all' ? ` · kategori ${escapeHtml(activeCategory)}` : ''}</span>
        ${activeVendorFilter !== 'all' || activeCategory !== 'all' || catalogSearch || catalogAvailability !== 'all' || catalogMaxPrice ? '<button onclick="resetCatalogFilters()">Reset filter</button>' : ''}
    `;
    status.classList.remove('pulse');
    void status.offsetWidth;
    status.classList.add('pulse');
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

    const popupImage = document.getElementById('popup-image');
    const popupTitle = document.getElementById('popup-title');
    const popupDesc = document.getElementById('popup-desc');
    if (popupImage && highlight.image) popupImage.src = highlight.image;
    if (popupTitle) popupTitle.textContent = highlight.title || popupTitle.textContent;
    if (popupDesc) popupDesc.textContent = highlight.desc || popupDesc.textContent;
}

function filterMenu(category) {
    activeCategory = category;
    setActiveCategory(category);
    renderProducts();
}

function selectVendorFilter(vendorId) {
    activeVendorFilter = vendorId;
    renderSellerRail();
    renderProducts();
    const store = document.getElementById('view-store');
    if (store) store.scrollIntoView({ behavior: 'smooth' });
}

function setCatalogHomeVisible(isVisible) {
    document.querySelectorAll('.catalog-home').forEach((element) => {
        element.style.display = isVisible ? '' : 'none';
    });
    const shopPage = document.getElementById('shop-page');
    if (shopPage) shopPage.classList.toggle('active', !isVisible);
}

async function openStorePage(vendorId, options = {}) {
    const vendor = getVendorProfile(vendorId);
    activeStoreVendorId = Number(vendorId);
    setCatalogHomeVisible(false);
    renderShopPage(vendor, [], true);
    const reviews = await getVendorReviews(vendorId);
    if (activeStoreVendorId === Number(vendorId)) renderShopPage(vendor, reviews, false);
    if (!options.skipHash && window.location.hash !== `#toko-${vendorId}`) {
        history.pushState({ vendorId }, '', `#toko-${vendorId}`);
    }
    document.getElementById('shop-page')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeStorePage(options = {}) {
    activeStoreVendorId = null;
    setCatalogHomeVisible(true);
    if (!options.skipHash && window.location.hash.startsWith('#toko-')) {
        history.pushState(null, '', window.location.pathname + window.location.search);
    }
}

function renderShopPage(vendor = {}, reviews = [], isLoading = false) {
    const page = document.getElementById('shop-page');
    if (!page) return;
    const storeProducts = products.filter((product) => getVendorId(product) === Number(vendor.id) && product.availability !== 'draft');
    const readyProducts = storeProducts.filter(isProductOrderable);
    const average = reviews.length
        ? (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1)
        : getSellerRating(vendor);
    page.innerHTML = `
        <button class="shop-back" onclick="closeStorePage()"><i class="fas fa-arrow-left"></i> Kembali ke katalog</button>
        <section class="shop-hero">
            <div class="shop-hero-card">
                <div class="seller-avatar shop-avatar">${renderAvatar(vendor, 'TK')}</div>
                <div>
                    <span>${vendor.isOfficial ? 'Official Store' : 'Pedagang Terverifikasi'}</span>
                    <h1>${escapeHtml(vendor.storeName || 'Toko')}</h1>
                    <p>${escapeHtml(vendor.bio || 'Etalase jajanan pilihan dari Rasvara Marketplace.')}</p>
                </div>
                <div class="shop-actions">
                    <button onclick="openSellerChat(${Number(vendor.id)})"><i class="fab fa-whatsapp"></i> Chat Penjual</button>
                    <button onclick="window.open('${getMapSearchLink(getVendorAddress(vendor))}', '_blank', 'noopener')"><i class="fas fa-location-dot"></i> Lokasi</button>
                </div>
            </div>
            <div class="shop-stats">
                <div><strong>${storeProducts.length}</strong><span>Produk</span></div>
                <div><strong>${readyProducts.length}</strong><span>Siap dipesan</span></div>
                <div><strong>${average}</strong><span>Rating</span></div>
                <div><strong>${Number(vendor.reviewCount || reviews.length || 0)}</strong><span>Review</span></div>
            </div>
        </section>
        <nav class="shop-tabs" aria-label="Navigasi toko">
            <a href="#shop-products">Produk</a>
            <a href="#shop-reviews">Review</a>
            <a href="#shop-info">Info Toko</a>
        </nav>
        <section id="shop-products" class="shop-section">
            <div class="section-mini-head">
                <div>
                    <span class="label-tag">Etalase Produk</span>
                    <h2>Produk dari ${escapeHtml(vendor.storeName || 'toko ini')}</h2>
                </div>
            </div>
            <div class="product-grid storefront-products">
                ${storeProducts.length ? storeProducts.map((product, index) => renderProductCard(product, index)).join('') : '<div class="empty-state"><i class="fas fa-store-slash"></i><p>Toko ini belum punya produk aktif.</p></div>'}
            </div>
        </section>
        <section id="shop-reviews" class="shop-section">
            <div class="section-mini-head">
                <div>
                    <span class="label-tag">Review Pembeli</span>
                    <h2>Kepercayaan toko</h2>
                </div>
                <span class="shop-review-score">${isLoading ? 'Memuat...' : `${average}/5`}</span>
            </div>
            <div class="shop-review-grid">
                ${isLoading ? '<div class="detail-review-empty">Mengambil review toko.</div>' : reviews.length ? reviews.slice(0, 6).map((review) => `
                    <article class="detail-review-item">
                        <div><strong>${escapeHtml(review.customerName || 'Pelanggan')}</strong><span>${escapeHtml(formatReviewDate(review.createdAt))}</span></div>
                        <small>${renderReviewStars(review.rating)}</small>
                        <p>${escapeHtml(review.comment || 'Pembeli memberi rating tanpa komentar.')}</p>
                    </article>
                `).join('') : '<div class="detail-review-empty">Belum ada review untuk toko ini.</div>'}
            </div>
        </section>
        <section id="shop-info" class="shop-section shop-info">
            <span class="label-tag">Info Toko</span>
            <h2>Lokasi dan layanan</h2>
            <p><i class="fas fa-location-dot"></i> ${escapeHtml(getVendorAddress(vendor) || 'Lokasi toko belum diatur.')}</p>
            <p><i class="fab fa-whatsapp"></i> ${escapeHtml(getVendorWhatsapp(vendor) || 'WhatsApp belum diatur.')}</p>
        </section>
    `;
}

function updateCatalogSearch(value) {
    catalogSearch = value || '';
    renderProducts();
}

function updateCatalogSort(value) {
    catalogSort = value || 'featured';
    renderProducts();
}

function updateCatalogView(value) {
    catalogView = value || 'storefront';
    renderProducts();
}

function updateCatalogAvailability(value) {
    catalogAvailability = value || 'all';
    renderProducts();
}

function updateCatalogMaxPrice(value) {
    catalogMaxPrice = value || '';
    renderProducts();
}

function resetCatalogFilters() {
    activeCategory = 'all';
    activeVendorFilter = 'all';
    catalogSearch = '';
    catalogSort = 'featured';
    catalogAvailability = 'all';
    catalogMaxPrice = '';
    setActiveCategory('all');
    const search = document.getElementById('catalog-search');
    const sort = document.getElementById('catalog-sort');
    const view = document.getElementById('catalog-view');
    const availability = document.getElementById('catalog-availability');
    const maxPrice = document.getElementById('catalog-max-price');
    if (search) search.value = '';
    if (sort) sort.value = 'featured';
    if (availability) availability.value = 'all';
    if (maxPrice) maxPrice.value = '';
    if (view) view.value = catalogView;
    renderSellerRail();
    renderProducts();
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
    if (!isProductOrderable(product)) {
        showToast('Menu ini sedang tidak tersedia.', 'error');
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

async function openProductDetail(itemId, options = {}) {
    const product = products.find((item) => item.id === itemId);
    if (!product) {
        showToast('Produk tidak ditemukan.', 'error');
        return;
    }
    activeDetailProductId = itemId;
    activeDetailVendorId = getVendorId(product);
    const vendor = getVendorProfile(activeDetailVendorId);
    document.getElementById('detail-image').src = product.image;
    document.getElementById('detail-image').alt = product.name;
    document.getElementById('detail-category').textContent = product.category || 'Menu';
    const detailVendor = document.getElementById('detail-vendor');
    if (detailVendor) detailVendor.textContent = getVendorName(product);
    document.getElementById('detail-title').textContent = product.name;
    document.getElementById('detail-desc').textContent = product.desc || 'Deskripsi menu sedang diperbarui.';
    document.getElementById('detail-unit').textContent = getUnitLabel(product);
    document.getElementById('detail-min-order').textContent = `${Number(product.minOrder || 1)} ${product.unitType || 'porsi'}`;
    document.getElementById('detail-price').textContent = `${formatRupiah(product.price)} / ${product.unitType || 'porsi'}`;
    const detailButton = document.querySelector('.btn-detail-cart');
    if (detailButton) {
        detailButton.disabled = !isProductOrderable(product);
        detailButton.innerHTML = isProductOrderable(product)
            ? '<i class="fas fa-shopping-bag"></i> Tambah ke Keranjang'
            : '<i class="fas fa-ban"></i> Menu Habis';
    }
    const quantityInput = document.getElementById('detail-quantity');
    quantityInput.min = Math.max(1, Number(product.minOrder || 1));
    quantityInput.value = Math.max(1, Number(product.minOrder || 1));
    document.getElementById('product-detail-modal').classList.add('show');
    renderDetailSeller(vendor, product, []);
    renderDetailReviews([], true);
    const reviews = await getVendorReviews(activeDetailVendorId);
    if (activeDetailProductId === itemId) {
        renderDetailSeller(vendor, product, reviews);
        renderDetailReviews(reviews);
    }
    if (!options.skipHash && window.location.hash !== `#${getProductHash(itemId)}`) {
        history.pushState({ productId: itemId }, '', `#${getProductHash(itemId)}`);
    }
}

function closeProductDetail(options = {}) {
    document.getElementById('product-detail-modal').classList.remove('show');
    activeDetailProductId = null;
    activeDetailVendorId = null;
    if (!options.skipHash && window.location.hash.startsWith('#produk-')) {
        history.pushState(null, '', window.location.pathname + window.location.search);
    }
}

function renderDetailSeller(vendor = {}, product = null, reviews = []) {
    const avatar = document.getElementById('detail-seller-avatar');
    const sellerType = document.getElementById('detail-seller-type');
    const sellerName = document.getElementById('detail-seller-name');
    const sellerBio = document.getElementById('detail-seller-bio');
    const sellerRating = document.getElementById('detail-seller-rating');
    const sellerReviews = document.getElementById('detail-seller-reviews');
    const sellerMenuCount = document.getElementById('detail-seller-menu-count');
    const sellerAddress = document.getElementById('detail-seller-address');
    const average = reviews.length
        ? (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1)
        : getSellerRating(vendor);

    if (avatar) avatar.innerHTML = renderAvatar(vendor, vendor.storeName || getVendorName(product || {}));
    if (sellerType) sellerType.textContent = vendor.isOfficial ? 'Official Store' : 'Pedagang Terverifikasi';
    if (sellerName) sellerName.textContent = vendor.storeName || getVendorName(product || {});
    if (sellerBio) sellerBio.textContent = vendor.bio || 'Etalase jajanan pilihan dari marketplace Rasvara.';
    if (sellerRating) sellerRating.textContent = average;
    if (sellerReviews) sellerReviews.textContent = Number(vendor.reviewCount || reviews.length || 0);
    if (sellerMenuCount) sellerMenuCount.textContent = Number(vendor.menuCount || products.filter((item) => getVendorId(item) === Number(vendor.id)).length || 0);
    if (sellerAddress) sellerAddress.textContent = getVendorAddress(vendor) || 'Lokasi toko belum diatur.';
}

function renderDetailReviews(reviews = [], isLoading = false) {
    const list = document.getElementById('detail-review-list');
    const summary = document.getElementById('detail-review-summary');
    if (!list || !summary) return;
    if (isLoading) {
        summary.textContent = 'Memuat review...';
        list.innerHTML = '<div class="detail-review-empty">Mengambil review toko.</div>';
        return;
    }
    if (!reviews.length) {
        summary.textContent = 'Belum ada review';
        list.innerHTML = '<div class="detail-review-empty">Belum ada review untuk toko ini. Pembeli pertama nanti bakal sangat membantu toko ini.</div>';
        return;
    }
    const average = (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1);
    summary.textContent = `${average}/5 dari ${reviews.length} review`;
    list.innerHTML = reviews.slice(0, 4).map((review) => `
        <article class="detail-review-item">
            <div>
                <strong>${escapeHtml(review.customerName || 'Pelanggan')}</strong>
                <span>${escapeHtml(formatReviewDate(review.createdAt))}</span>
            </div>
            <small aria-label="Rating ${Number(review.rating || 0)} dari 5">${renderReviewStars(review.rating)}</small>
            <p>${escapeHtml(review.comment || 'Pembeli memberi rating tanpa komentar.')}</p>
        </article>
    `).join('');
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

function openSellerChat(vendorId, product = null) {
    const vendor = getVendorProfile(vendorId);
    const number = normalizeWhatsappNumber(getVendorWhatsapp(vendor));
    const message = buildSellerChatMessage(vendor, product);
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
}

function chatActiveSeller() {
    if (activeDetailVendorId === null) return;
    const product = products.find((item) => item.id === activeDetailProductId);
    openSellerChat(activeDetailVendorId, product);
}

function openActiveSellerLocation() {
    if (activeDetailVendorId === null) return;
    const vendor = getVendorProfile(activeDetailVendorId);
    window.open(getMapSearchLink(getVendorAddress(vendor)), '_blank', 'noopener');
}

function focusActiveSellerStore() {
    if (activeDetailVendorId === null) return;
    const vendorId = activeDetailVendorId;
    closeProductDetail();
    switchView('store');
    openStorePage(vendorId);
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
    localStorage.setItem('rasvara_cart', JSON.stringify(cart));
    renderCart();
    renderCartCount();
    renderCheckoutSummary();
}

function renderCart() {
    const container = document.getElementById('cart-items-container');
    const totalElement = document.getElementById('cart-total');
    const summaryItems = document.getElementById('cart-summary-items');
    if (!container || !totalElement) return;
    const subtotal = getCartSubtotal();
    const totalItems = getCartItemCount();
    totalElement.textContent = formatRupiah(subtotal);
    if (summaryItems) summaryItems.textContent = `${totalItems} item`;

    if (!cart.length) {
        container.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-shopping-bag"></i>
                <p>Keranjang Anda masih kosong.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = cart
        .map((item) => {
            const minOrder = Math.max(1, Number(item.minOrder || 1));
            const itemTotal = Number(item.price || 0) * Number(item.quantity || 0);
            return `
                <div class="cart-item">
                    <div class="cart-item-img">
                        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy">
                    </div>
                    <div class="cart-item-info">
                        <h4>${escapeHtml(item.name)}</h4>
                        <span class="cart-vendor">${escapeHtml(getVendorName(item))}</span>
                        <p>${formatRupiah(item.price)} / ${escapeHtml(item.unitType || 'porsi')} · Min. ${minOrder}</p>
                        <strong>${formatRupiah(itemTotal)}</strong>
                    </div>
                    <div class="cart-item-qty">
                        <button class="qty-btn" onclick="updateCartItem(${item.id}, ${item.quantity - 1})" ${item.quantity <= minOrder ? 'disabled' : ''}>−</button>
                        <input class="qty-input" type="number" min="${minOrder}" value="${item.quantity}" aria-label="Jumlah ${escapeHtml(item.name)}" onchange="updateCartItem(${item.id}, Number(this.value || ${minOrder}))">
                        <button class="qty-btn" onclick="updateCartItem(${item.id}, ${item.quantity + 1})">+</button>
                        <button class="cart-item-remove" onclick="removeFromCart(${item.id})" aria-label="Hapus item">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
        })
        .join('');
}

function renderCartCount() {
    const countElement = document.getElementById('cart-count');
    if (!countElement) return;
    countElement.textContent = getCartItemCount();
}

function getCartSubtotal() {
    return cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
}

function getCartItemCount() {
    return cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

function updateCartItem(itemId, quantity) {
    const item = cart.find((product) => product.id === itemId);
    if (!item) return;
    const minOrder = Math.max(1, Number(item.minOrder || 1));
    item.quantity = Math.max(minOrder, Number(quantity || minOrder));
    saveCart();
}

function removeFromCart(itemId) {
    cart = cart.filter((product) => product.id !== itemId);
    saveCart();
    if (!cart.length) closeCheckout();
}

function clearCart() {
    if (!cart.length) {
        showToast('Keranjang sudah kosong.', 'info');
        return;
    }
    cart = [];
    saveCart();
    closeCheckout();
    showToast('Keranjang dikosongkan.', 'info');
}

function openCheckout() {
    if (!cart.length) {
        showToast('Tambahkan menu ke keranjang dulu.', 'error');
        return;
    }
    renderCheckoutSummary();
    toggleCart(false);
    const checkout = document.getElementById('checkout-modal');
    if (checkout) checkout.classList.add('show');
}

function closeCheckout() {
    const checkout = document.getElementById('checkout-modal');
    if (checkout) checkout.classList.remove('show');
}

function renderCheckoutSummary() {
    const container = document.getElementById('checkout-summary-items');
    const total = document.getElementById('checkout-total');
    if (!container || !total) return;

    if (!cart.length) {
        container.innerHTML = '<div class="checkout-empty">Keranjang masih kosong.</div>';
        total.textContent = formatRupiah(0);
        return;
    }

    container.innerHTML = cart.map((item) => `
        <div class="checkout-summary-item">
            <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">
            <div>
                <strong>${escapeHtml(item.name)}</strong>
                <small>${escapeHtml(getVendorName(item))}</small>
                <span>${Number(item.quantity || 0)} ${escapeHtml(item.unitType || 'porsi')} x ${formatRupiah(item.price)}</span>
            </div>
            <b>${formatRupiah(Number(item.price || 0) * Number(item.quantity || 0))}</b>
        </div>
    `).join('');
    total.textContent = formatRupiah(getCartSubtotal());
}

function getSelectedPaymentMethod() {
    const selected = document.querySelector('input[name="payment"]:checked');
    return selected ? selected.value : 'Transfer Bank';
}

function buildWhatsAppMessage(orderDetails) {
    let message = `Halo Rasvara Catering,\n\nSaya ingin memesan:\n`;
    orderDetails.cartItems.forEach((item) => {
        message += `- ${item.name} x ${item.quantity} ${item.unitType || 'porsi'} dari ${getVendorName(item)} (${item.isPackage ? 'Paketan' : 'Satuan'}, ${formatRupiah(item.price)}/${item.unitType || 'porsi'})\n`;
    });
    message += `\nTotal: ${formatRupiah(orderDetails.total)}\n`;
    message += `\nDetail Pemesanan:\n`;
    if (orderDetails.id) message += `ID Pesanan: ${orderDetails.id}\n`;
    if (orderDetails.trackingToken) message += `Link Progress: ${getTrackingUrl(orderDetails.trackingToken)}\n`;
    message += `Nama: ${orderDetails.customerName}\n`;
    message += `WA: ${orderDetails.phone}\n`;
    if (orderDetails.eventDate) message += `Tanggal Deadline Pesanan: ${orderDetails.eventDate}\n`;
    message += `Tujuan Pemesanan: ${orderDetails.orderPurpose || orderDetails.eventType}\n`;
    message += `Cara Pemenuhan: ${orderDetails.fulfillmentType}\n`;
    message += `Alamat/Titik Ambil: ${orderDetails.address}\n`;
    if (orderDetails.notes) message += `Catatan: ${orderDetails.notes}\n`;
    message += `Metode Pembayaran: ${orderDetails.paymentMethod}\n\n`;
    message += `Simpan pesan ini sebagai bukti pesanan. Mohon konfirmasi ketersediaan menu, ongkos kirim, estimasi waktu pengantaran, dan update progress pesanan.`;
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

    const subtotal = getCartSubtotal();
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
        window.open(buildWhatsAppLink(message), '_blank', 'noopener');

        const trackOrderId = document.getElementById('track-order-id');
        const trackPhone = document.getElementById('track-phone');
        if (trackOrderId) trackOrderId.value = data.order.id || '';
        if (trackPhone) trackPhone.value = phone;
        saveTrackingOrder(data.order);
        renderSavedTrackingOrders();
        showOrderSuccess(data.order);
        showToast(`Pesanan #${data.order.id} berhasil dibuat. Link progress sudah disiapkan.`, 'success');
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
        closeCheckout();
        toggleCart(false);
    } catch (error) {
        console.error('Checkout error:', error);
        showToast(error.message || 'Gagal memproses pesanan. Silakan coba lagi.', 'error');
    }
}

function closePopup() {
    const popup = document.getElementById('promo-popup');
    if (popup) popup.classList.remove('show');
    sessionStorage.setItem('promo_popup_seen', '1');
}

function showPromoPopup() {
    const popup = document.getElementById('promo-popup');
    if (!popup) return;
    if (new URLSearchParams(window.location.search).get('promo') === '1') {
        popup.classList.add('show');
    }
}

function goToStoreFromPopup() {
    closePopup();
    switchView('store');
    filterMenu('all');
}

function openWhatsAppChat(message = 'Halo, saya ingin bertanya tentang menu dan pemesanan catering.') {
    window.open(buildWhatsAppLink(message), '_blank', 'noopener');
}

function formatOrderDate(value = '') {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function formatShortDate(value = '') {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short'
    }).format(date);
}

function formatPhoneDisplay(value = '') {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '-';
    return digits.startsWith('62') ? `+${digits}` : digits;
}

function getTrackingUrl(token = '') {
    if (!token) return window.location.origin;
    return `${window.location.origin}${window.location.pathname}#progress?t=${encodeURIComponent(token)}`;
}

function getSavedTrackingOrders() {
    try {
        const orders = JSON.parse(localStorage.getItem(SAVED_TRACKING_KEY) || '[]');
        return Array.isArray(orders) ? orders.filter((order) => order && order.id && order.trackingToken) : [];
    } catch (error) {
        return [];
    }
}

function saveTrackingOrder(order = {}) {
    if (!order.id || !order.trackingToken) return;
    const saved = getSavedTrackingOrders().filter((item) => String(item.id) !== String(order.id));
    const summary = {
        id: order.id,
        trackingToken: order.trackingToken,
        customerName: order.customerName || 'Pembeli',
        phoneMasked: maskPhone(order.phone || ''),
        total: Number(order.total || 0),
        status: order.status || 'Menunggu Persetujuan',
        createdAt: order.createdAt || new Date().toISOString(),
        itemCount: (order.cartItems || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)
    };
    localStorage.setItem(SAVED_TRACKING_KEY, JSON.stringify([summary, ...saved].slice(0, 8)));
}

function maskPhone(value = '') {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length <= 5) return digits || '-';
    return `${digits.slice(0, 4)}****${digits.slice(-3)}`;
}

function renderSavedTrackingOrders() {
    const root = document.getElementById('saved-tracking-list');
    if (!root) return;
    const orders = getSavedTrackingOrders();
    if (!orders.length) {
        root.innerHTML = `
            <div class="tracking-empty">
                <i class="fas fa-receipt"></i>
                <p>Belum ada pesanan tersimpan di browser ini. Setelah checkout, bukti pesanan akan muncul di sini otomatis.</p>
            </div>
        `;
        return;
    }
    root.innerHTML = orders.map((order) => `
        <article class="saved-tracking-card">
            <div>
                <span>#${escapeHtml(order.id)}</span>
                <h3>${escapeHtml(order.customerName || 'Pembeli')}</h3>
                <p>${escapeHtml(formatOrderDate(order.createdAt))} · ${Number(order.itemCount || 0)} item · ${escapeHtml(order.phoneMasked || '-')}</p>
            </div>
            <strong>${formatRupiah(order.total || 0)}</strong>
            <button onclick="loadProgressByToken('${escapeHtml(order.trackingToken)}')"><i class="fas fa-route"></i> Cek</button>
        </article>
    `).join('');
}

function clearSavedTrackingOrders() {
    localStorage.removeItem(SAVED_TRACKING_KEY);
    renderSavedTrackingOrders();
    showToast('Daftar pesanan tersimpan di perangkat ini dibersihkan.', 'success');
}

function getTrackingTokenFromUrl() {
    const hash = window.location.hash || '';
    if (hash.startsWith('#progress')) {
        const queryIndex = hash.indexOf('?');
        if (queryIndex !== -1) return new URLSearchParams(hash.slice(queryIndex + 1)).get('t') || '';
    }
    return new URLSearchParams(window.location.search).get('t') || '';
}

function openTrackingFromUrl() {
    const token = getTrackingTokenFromUrl();
    if (!token) return false;
    switchView('progress');
    loadProgressByToken(token);
    return true;
}

async function loadProgressByToken(token = '') {
    const result = document.getElementById('progress-result');
    if (!token) {
        showToast('Link progress tidak valid.', 'error');
        return;
    }
    if (result) {
        result.innerHTML = '<div class="progress-empty"><i class="fas fa-spinner fa-spin"></i><p>Mengambil progress pesanan...</p></div>';
    }
    try {
        const response = await fetch(`${API_URL}/orders/progress/${encodeURIComponent(token)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Link progress tidak ditemukan.');
        saveTrackingOrder({ ...data.order, trackingToken: token });
        renderSavedTrackingOrders();
        renderOrderProgress(data.order);
        document.getElementById('progress-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
        if (result) {
            result.innerHTML = `
                <div class="progress-empty error">
                    <i class="fas fa-circle-exclamation"></i>
                    <p>${escapeHtml(error.message || 'Gagal memuat progress pesanan.')}</p>
                </div>
            `;
        }
        showToast(error.message || 'Gagal memuat progress pesanan.', 'error');
    }
}

async function recoverTrackingLink(event) {
    event?.preventDefault();
    const orderId = getInputValue('track-order-id');
    const phone = getInputValue('track-phone');
    const result = document.getElementById('progress-result');

    if (!orderId || !phone) {
        showToast('Isi ID pesanan dan nomor WhatsApp yang dipakai saat checkout.', 'error');
        return;
    }

    if (result) {
        result.innerHTML = '<div class="progress-empty"><i class="fas fa-spinner fa-spin"></i><p>Memulihkan link progress...</p></div>';
    }

    try {
        const response = await fetch(`${API_URL}/orders/recover-link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, phone })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Pesanan tidak ditemukan.');
        saveTrackingOrder(data.order);
        renderSavedTrackingOrders();
        renderOrderProgress(data.order);
        showToast('Link progress berhasil dipulihkan dan disimpan di perangkat ini.', 'success');
    } catch (error) {
        if (result) {
            result.innerHTML = `
                <div class="progress-empty error">
                    <i class="fas fa-circle-exclamation"></i>
                    <p>${escapeHtml(error.message || 'Gagal memuat progress pesanan.')}</p>
                </div>
            `;
        }
        showToast(error.message || 'Gagal memuat progress pesanan.', 'error');
    }
}

function showOrderSuccess(order = {}) {
    lastSuccessfulOrder = order;
    setText('success-order-id', `#${order.id || '-'}`);
    setText('success-order-total', formatRupiah(order.total || 0));
    setText('success-order-status', order.status || 'Menunggu Persetujuan');
    const modal = document.getElementById('order-success-modal');
    if (modal) modal.classList.add('show');
}

function closeOrderSuccess() {
    const modal = document.getElementById('order-success-modal');
    if (modal) modal.classList.remove('show');
}

async function copySuccessOrderId() {
    if (!lastSuccessfulOrder?.id) return;
    try {
        await navigator.clipboard.writeText(String(lastSuccessfulOrder.id));
        showToast('ID pesanan disalin.', 'success');
    } catch (error) {
        showToast(`ID Pesanan: ${lastSuccessfulOrder.id}`, 'info');
    }
}

function openSuccessTracking() {
    if (!lastSuccessfulOrder?.trackingToken) return;
    closeOrderSuccess();
    window.location.hash = `progress?t=${encodeURIComponent(lastSuccessfulOrder.trackingToken)}`;
    openTrackingFromUrl();
}

function sendSuccessWhatsApp() {
    if (!lastSuccessfulOrder) return;
    window.open(buildWhatsAppLink(buildWhatsAppMessage(lastSuccessfulOrder)), '_blank', 'noopener');
}

function renderOrderProgress(order = {}) {
    const result = document.getElementById('progress-result');
    if (!result) return;
    const items = Array.isArray(order.cartItems) ? order.cartItems : [];
    const steps = Array.isArray(order.progressSteps) && order.progressSteps.length
        ? order.progressSteps
        : ORDER_PROGRESS_STATUSES.map((label) => ({ label, state: label === order.status ? 'active' : '' }));
    const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];

    result.innerHTML = `
        <article class="progress-detail">
            <div class="progress-summary">
                <div>
                    <span class="label-tag">ID Pesanan</span>
                    <h2>#${escapeHtml(order.id)}</h2>
                    <p>Dibuat ${escapeHtml(formatOrderDate(order.createdAt))}</p>
                </div>
                <div class="progress-status-pill">${escapeHtml(order.status || 'Menunggu Persetujuan')}</div>
            </div>
            <div class="progress-order-items">
                ${items.map((item) => `
                    <div>
                        <span>${escapeHtml(item.name || 'Menu')}</span>
                        <strong>${Number(item.quantity || 0)} ${escapeHtml(item.unitType || 'porsi')}</strong>
                    </div>
                `).join('') || '<div><span>Item pesanan belum terbaca.</span><strong>-</strong></div>'}
            </div>
            <div class="progress-total">
                <span>Total pesanan</span>
                <strong>${formatRupiah(order.total || 0)}</strong>
            </div>
            <div class="progress-timeline" aria-label="Timeline progress pesanan">
                ${steps.map((step) => `
                    <div class="progress-step ${escapeHtml(step.state || '')}">
                        <span class="progress-dot"><i class="fas ${step.state === 'completed' ? 'fa-check' : step.state === 'cancelled' ? 'fa-xmark' : 'fa-circle'}"></i></span>
                        <div>
                            <strong>${escapeHtml(step.label)}</strong>
                            <small>${escapeHtml((step.timestamp || step.at) ? formatOrderDate(step.timestamp || step.at) : step.state === 'active' ? 'Sedang berjalan' : 'Menunggu update toko')}</small>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="progress-history">
                <h3>Catatan update</h3>
                ${history.slice().reverse().map((entry) => `
                    <p><strong>${escapeHtml(entry.status || 'Update')}</strong><span>${escapeHtml(formatOrderDate(entry.timestamp || entry.at))}${entry.note ? ` - ${escapeHtml(entry.note)}` : ''}</span></p>
                `).join('') || '<p><strong>Belum ada catatan</strong><span>Pedagang akan mengupdate status dari dashboard.</span></p>'}
            </div>
        </article>
    `;
}

function switchView(viewName, options = {}) {
    if (activeDetailProductId && viewName !== 'store') {
        closeProductDetail();
    }
    if (activeStoreVendorId !== null && (viewName !== 'store' || !options.keepStore)) {
        closeStorePage({ skipHash: Boolean(options.keepStore) });
    }
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
window.addEventListener('load', () => setTimeout(hideSiteLoader, 1200));
window.addEventListener('popstate', () => {
    if (openTrackingFromUrl()) return;
    if (openRouteFromHash()) return;
    if (activeDetailProductId) {
        closeProductDetail({ skipHash: true });
    }
    if (activeStoreVendorId !== null) {
        closeStorePage({ skipHash: true });
    }
});
