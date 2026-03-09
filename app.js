(function () {
  const API_BASE = 'https://trippsi-backend-production.up.railway.app';
  let products = [];
  let categories = [];

  const $ = function (id) { return document.getElementById(id); };
  const productGrid = $('productGrid');
  const categoryTabs = $('categoryTabs');
  const promoBanner = $('promoBanner');

  function renderPromoBanner(store) {
    if (!promoBanner) return;
    var active = store && (store.promo_active === '1' || store.promo_active === true);
    var text = (store && store.promo_banner) ? String(store.promo_banner).trim() : '';
    if (!active || !text) {
      promoBanner.classList.remove('visible');
      promoBanner.innerHTML = '';
      return;
    }
    var escaped = escapeHtml(text);
    promoBanner.innerHTML = '<div class="promo-banner-inner"><p class="promo-banner-text">' + escaped + '</p></div>';
    promoBanner.classList.add('visible');
  }

  function setGridState(state, message) {
    if (!productGrid) return;
    if (state === 'loading') {
      productGrid.innerHTML = '<div class="products-loading-cell">' +
        '<div class="products-spinner"></div>' +
        '<p>Loading products…</p></div>';
      productGrid.classList.add('products-state');
      return;
    }
    if (state === 'empty') {
      productGrid.innerHTML = '<div class="products-empty-cell">' +
        '<span class="products-empty-icon" aria-hidden="true">📦</span>' +
        '<p>' + (message || 'No products in this category.') + '</p></div>';
      productGrid.classList.add('products-state');
      return;
    }
    if (state === 'error') {
      productGrid.innerHTML = '<div class="products-error-cell">' +
        '<span class="products-error-icon" aria-hidden="true">⚠️</span>' +
        '<p>' + (message || 'Unable to load products. Please try again later.') + '</p></div>';
      productGrid.classList.add('products-state');
      return;
    }
    productGrid.classList.remove('products-state');
  }

  function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function buildTags(brands) {
    if (!brands) return '';
    return brands.split(/[,&]/).map(function (b) { return b.trim(); }).filter(Boolean).slice(0, 4).map(function (b) {
      return '<span>' + escapeHtml(b) + '</span>';
    }).join('');
  }

  function renderProductCard(p) {
    var catSlug = (p.category_slug || '').toLowerCase();
    var imgContent = p.image_url
      ? '<img src="' + escapeHtml(p.image_url) + '" alt="' + escapeHtml(p.name) + '" loading="lazy"/>'
      : '<div class="pcat-placeholder" aria-hidden="true">' + escapeHtml(p.category_icon || '') + '</div>';
    var stockClass = p.in_stock ? 'in-stock' : 'out-of-stock';
    var stockText = p.in_stock ? 'In stock' : 'Check availability';
    var priceHtml = p.price_label ? '<div class="pcat-price">' + escapeHtml(p.price_label) + '</div>' : '';
    var tagsHtml = buildTags(p.brands);
    var desc = (p.description || '').substring(0, 120);
    if (p.description && p.description.length > 120) desc += '…';
    var descHtml = desc ? '<div class="pcat-desc">' + escapeHtml(desc) + '</div>' : '';
    return '<div class="pcat-card reveal" data-cat="' + escapeHtml(catSlug) + '">' +
      '<div class="pcat-img-wrap">' + imgContent +
      '<span class="pcat-badge">' + escapeHtml(p.category_name || '') + '</span>' +
      '<div class="pcat-overlay"><span>' + stockText + '</span></div>' +
      '</div>' +
      '<div class="pcat-body">' +
      '<div class="pcat-name">' + escapeHtml(p.name) + '</div>' +
      descHtml +
      priceHtml +
      '<div class="pcat-stock ' + stockClass + '">' + stockText + '</div>' +
      (tagsHtml ? '<div class="pcat-tags">' + tagsHtml + '</div>' : '') +
      '</div></div>';
  }

  function renderGrid(filterSlug) {
    if (!productGrid) return;
    var filtered = filterSlug === 'all' || !filterSlug
      ? products
      : products.filter(function (p) { return (p.category_slug || '').toLowerCase() === filterSlug; });
    if (filtered.length === 0) {
      setGridState('empty', 'No products in this category.');
      return;
    }
    productGrid.classList.remove('products-state');
    productGrid.innerHTML = filtered.map(renderProductCard).join('');
    productGrid.querySelectorAll('.pcat-card').forEach(function (el, i) {
      el.style.animationDelay = (i * 0.05) + 's';
    });
    var observer = window.__revealObserver;
    if (observer) productGrid.querySelectorAll('.reveal').forEach(function (el) { observer.observe(el); });
  }

  function buildCategoryTabs() {
    if (!categoryTabs) return;
    categoryTabs.innerHTML = '<button class="cat-tab active" data-cat="all" type="button">All Products</button>' +
      categories.map(function (c) {
        return '<button class="cat-tab" data-cat="' + escapeHtml(c.slug) + '" type="button">' +
          (c.icon || '') + ' ' + escapeHtml(c.name) + '</button>';
      }).join('');
    categoryTabs.querySelectorAll('.cat-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        categoryTabs.querySelectorAll('.cat-tab').forEach(function (t) { t.classList.remove('active'); });
        this.classList.add('active');
        renderGrid(this.getAttribute('data-cat'));
      });
    });
  }

  function init() {
    fetch(API_BASE + '/api/store').then(function (r) { return r.ok ? r.json() : null; }).then(function (store) {
      renderPromoBanner(store);
    }).catch(function () { if (promoBanner) { promoBanner.classList.remove('visible'); promoBanner.innerHTML = ''; } });

    if (!productGrid) return;
    setGridState('loading');
    Promise.all([
      fetch(API_BASE + '/api/categories').then(function (r) { return r.ok ? r.json() : []; }),
      fetch(API_BASE + '/api/products').then(function (r) { return r.ok ? r.json() : []; })
    ]).then(function (results) {
      var cats = results[0] || [];
      var prods = results[1] || [];
      categories = cats.filter(function (c) { return c.visible !== 0; }).sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
      products = prods.filter(function (p) { return p.visible !== 0; }).sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
      buildCategoryTabs();
      renderGrid('all');
    }).catch(function () {
      setGridState('error', 'Unable to load products. Please check your connection and try again.');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
