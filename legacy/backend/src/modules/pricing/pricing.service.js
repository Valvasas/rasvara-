function pickPriceTier(product, quantity) {
  const tiers = [...(product.priceTiers || [])]
    .filter((tier) => quantity >= tier.minQty && (tier.maxQty === null || quantity <= tier.maxQty))
    .sort((a, b) => b.minQty - a.minQty);
  return tiers[0] || null;
}

function pickVariant(product, variantId) {
  if (!variantId) return null;
  return (product.variants || []).find((variant) => variant.id === variantId) || null;
}

function pickAddons(product, addonIds = []) {
  const requested = new Set(addonIds);
  return (product.addons || []).filter((addon) => requested.has(addon.id) && addon.status === 'ACTIVE');
}

function calculateProductPrice(product, input = {}) {
  const quantity = Number(input.quantity || 0);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    const error = new Error('Quantity harus bilangan bulat lebih dari 0.');
    error.code = 'INVALID_QUANTITY';
    error.status = 400;
    throw error;
  }

  if (quantity < Number(product.minOrder || 1)) {
    const error = new Error(`Minimum order produk ini adalah ${product.minOrder} ${product.unit}.`);
    error.code = 'MINIMUM_ORDER_NOT_MET';
    error.status = 400;
    throw error;
  }

  const variant = pickVariant(product, input.variantId);
  if (input.variantId && !variant) {
    const error = new Error('Varian produk tidak valid.');
    error.code = 'INVALID_VARIANT';
    error.status = 400;
    throw error;
  }

  const requestedAddonIds = Array.isArray(input.addonIds) ? input.addonIds : [];
  const addons = pickAddons(product, requestedAddonIds);
  if (addons.length !== new Set(requestedAddonIds).size) {
    const error = new Error('Addon produk tidak valid.');
    error.code = 'INVALID_ADDON';
    error.status = 400;
    throw error;
  }

  const tier = pickPriceTier(product, quantity);
  const baseUnitPrice = variant ? variant.price : product.basePrice;
  const unitPrice = tier ? tier.unitPrice : baseUnitPrice;
  const addonUnitTotal = addons.reduce((sum, addon) => sum + addon.price, 0);
  const effectiveUnitPrice = unitPrice + addonUnitTotal;

  return {
    quantity,
    unitPrice,
    addonUnitTotal,
    effectiveUnitPrice,
    subtotal: effectiveUnitPrice * quantity,
    appliedTier: tier ? {
      id: tier.id,
      minQty: tier.minQty,
      maxQty: tier.maxQty,
      unitPrice: tier.unitPrice
    } : null,
    variant: variant ? {
      id: variant.id,
      name: variant.name,
      price: variant.price
    } : null,
    addons: addons.map((addon) => ({
      id: addon.id,
      name: addon.name,
      price: addon.price
    }))
  };
}

function summarizePricedItems(items = []) {
  return items.reduce((summary, item) => {
    return {
      quantity: summary.quantity + item.pricing.quantity,
      subtotal: summary.subtotal + item.pricing.subtotal
    };
  }, { quantity: 0, subtotal: 0 });
}

module.exports = {
  calculateProductPrice,
  summarizePricedItems
};
