(function () {
    'use strict';

    var carouselIndex = 0;
    var SLIDES_PER_VIEW = 4;
    var GAP = 20;
    var currentProducts = [];

    var SAMPLE_CATEGORIAS = [
        { nombre: 'Marcadores', foto: '' },
        { nombre: 'Papeleria', foto: '' },
        { nombre: 'Arte', foto: '' }
    ];
    var SAMPLE_MARCAS = [
        { nombre: 'Crayola', foto: '' },
        { nombre: 'Kores', foto: '' },
        { nombre: 'Sharpie', foto: '' }
    ];

    function getPlaceholderProducts() {
        return [
            { _placeholder: true, nombre: 'Producto Destacado 1', categoria: 'Pronto', marca: 'Lettering', precio: 0, fotos: [] },
            { _placeholder: true, nombre: 'Producto Destacado 2', categoria: 'Pronto', marca: 'Lettering', precio: 0, fotos: [] },
            { _placeholder: true, nombre: 'Producto Destacado 3', categoria: 'Pronto', marca: 'Lettering', precio: 0, fotos: [] },
            { _placeholder: true, nombre: 'Producto Destacado 4', categoria: 'Pronto', marca: 'Lettering', precio: 0, fotos: [] },
            { _placeholder: true, nombre: 'Producto Destacado 5', categoria: 'Pronto', marca: 'Lettering', precio: 0, fotos: [] },
            { _placeholder: true, nombre: 'Producto Destacado 6', categoria: 'Pronto', marca: 'Lettering', precio: 0, fotos: [] },
            { _placeholder: true, nombre: 'Producto Destacado 7', categoria: 'Pronto', marca: 'Lettering', precio: 0, fotos: [] },
            { _placeholder: true, nombre: 'Producto Destacado 8', categoria: 'Pronto', marca: 'Lettering', precio: 0, fotos: [] }
        ];
    }

    function safeArray(raw) {
        if (!raw) return [];
        try { var parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch (e) { return []; }
    }

    async function getInventario() {
        if (window.DB && typeof window.DB.getProducts === 'function') {
            try {
                var prods = await window.DB.getProducts();
                if (prods && prods.length > 0) return prods.filter(function (p) { return p && p.nombre; });
            } catch (e) { /* fallback */ }
        }
        return safeArray(localStorage.getItem('inventario')).filter(function (p) { return p && typeof p === 'object' && p.nombre; });
    }

    async function getCategorias() {
        if (window.DB && typeof window.DB.getCategories === 'function') {
            try {
                var cats = await window.DB.getCategories();
                if (cats && cats.length > 0) return cats.filter(function (c) { return c && c.nombre; });
            } catch (e) { /* fallback */ }
        }
        var cats = safeArray(localStorage.getItem('categoriasObj'));
        if (cats.length === 0) { try { localStorage.setItem('categoriasObj', JSON.stringify(SAMPLE_CATEGORIAS)); } catch (e) {} return SAMPLE_CATEGORIAS.slice(); }
        return cats.filter(function (c) { return c && c.nombre; });
    }

    async function getMarcas() {
        if (window.DB && typeof window.DB.getBrands === 'function') {
            try {
                var brs = await window.DB.getBrands();
                if (brs && brs.length > 0) return brs.filter(function (b) { return b && b.nombre; });
            } catch (e) { /* fallback */ }
        }
        var ms = safeArray(localStorage.getItem('marcasObj'));
        if (ms.length === 0) { try { localStorage.setItem('marcasObj', JSON.stringify(SAMPLE_MARCAS)); } catch (e) {} return SAMPLE_MARCAS.slice(); }
        return ms.filter(function (m) { return m && m.nombre; });
    }

    function initSampleData() {
        try {
            var cats = safeArray(localStorage.getItem('categoriasObj'));
            if (cats.length === 0) localStorage.setItem('categoriasObj', JSON.stringify(SAMPLE_CATEGORIAS));
        } catch (e) {}
        try {
            var ms = safeArray(localStorage.getItem('marcasObj'));
            if (ms.length === 0) localStorage.setItem('marcasObj', JSON.stringify(SAMPLE_MARCAS));
        } catch (e) {}
    }

    function escapeHtml(s) { return String(s || '').replace(/[&<>\"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

    function safeCurrency(fn, fallback) {
        return window.Currency && typeof window.Currency[fn] === 'function' ? window.Currency[fn]() : fallback;
    }

    function renderProductCard(p) {
        var foto = (p.fotos && p.fotos[0]) || null;
        var noPhoto = !foto;
        var isPlaceholder = p._placeholder === true;
        var tag = p.marca || p.categoria || '';
        var bgStyle = foto ? "background-image:url('" + foto + "')" : '';
        var imgClass = 'producto-card-image' + (noPhoto ? ' no-photo' : '');
        var actionsHtml = isPlaceholder
            ? '<button class=\"btn-add-cart\" disabled style=\"opacity:0.55; cursor:not-allowed;\"> Proximamente</button>'
            : '<button class=\"btn-add-cart\" onclick=\"Home.addToCart(\\'' + escapeAttr(p.nombre) + '\\', event)\"> Anadir</button>';
        var priceHtml = isPlaceholder
            ? '<span class=\"price-usd\" style=\"color: var(--color-primary);\">Proximamente</span><span class=\"price-bs\">.00</span>'
            : '<span class=\"price-usd\">' + (window.Currency ? window.Currency.formatUSD(p.precio) : '$' + parseFloat(p.precio).toFixed(2)) + '</span>'
            + '<span class=\"price-bs\">' + (window.Currency ? window.Currency.formatBS(window.Currency.usdToBs(p.precio)) : 'Bs. ' + (parseFloat(p.precio) * 36.5).toFixed(2)) + '</span>';
        var imageClick = isPlaceholder ? '' : 'onclick=\"Home.openProduct(\\'' + escapeAttr(p.nombre) + '\\')\"';
        return '<div class=\"carousel-slide\"><div class=\"producto-card' + (isPlaceholder ? ' is-placeholder' : '') + '\">'
            + (tag ? '<span class=\"producto-card-tag\">' + escapeHtml(tag) + '</span>' : '')
            + '<div class=\"' + imgClass + '\" style=\"' + bgStyle + '\" ' + imageClick + ' role=\"img\" aria-label=\"' + escapeHtml(p.nombre) + '\"></div>'
            + '<div class=\"producto-card-body\">'
            + '<h3 class=\"producto-card-name\">' + escapeHtml(p.nombre) + '</h3>'
            + '<p class=\"producto-card-brand\">' + escapeHtml(p.categoria || 'General') + '</p>'
            + '<div class=\"producto-card-prices\">' + priceHtml + '</div>'
            + '<div class=\"producto-card-actions\">' + actionsHtml + '</div></div></div></div>';
    }

    function escapeAttr(s) { return String(s || '').replace(/'/g, "\\'"); }

    async function renderCarousel() {
        var track = document.getElementById('home-carousel-track');
        if (!track) return;
        currentProducts = await getInventario();
        if (currentProducts.length === 0) currentProducts = getPlaceholderProducts();
        track.innerHTML = currentProducts.map(renderProductCard).join('');
        carouselIndex = 0;
        renderIndicators();
        updateCountBadge();
        updateCarouselPosition();
    }

    function getMaxIndex() {
        var perView = getSlidesPerView();
        return Math.max(0, Math.ceil(currentProducts.length / perView) - 1);
    }

    function renderIndicators() {
        var container = document.getElementById('carousel-indicators');
        if (!container) return;
        var max = getMaxIndex();
        if (max <= 0) { container.innerHTML = ''; return; }
        var html = '';
        for (var i = 0; i <= max; i++) html += '<button class=\"carousel-dot' + (i === 0 ? ' active' : '') + '\" data-index=\"' + i + '\" aria-label=\"Ir al grupo ' + (i + 1) + '\"></button>';
        container.innerHTML = html;
        container.querySelectorAll('.carousel-dot').forEach(function (dot) {
            dot.addEventListener('click', function () {
                var idx = parseInt(dot.getAttribute('data-index'), 10);
                if (!isNaN(idx)) goToCarousel(idx);
            });
        });
    }

    function updateIndicators() {
        document.querySelectorAll('#carousel-indicators .carousel-dot').forEach(function (dot, i) { dot.classList.toggle('active', i === carouselIndex); });
    }

    function updateCountBadge() { /* noop */ }

    function getSlidesPerView() {
        var track = document.getElementById('home-carousel-track');
        if (!track) return SLIDES_PER_VIEW;
        var slide = track.querySelector('.carousel-slide');
        if (!slide) return SLIDES_PER_VIEW;
        var slideWidth = slide.getBoundingClientRect().width;
        var viewport = track.parentElement;
        if (!viewport) return SLIDES_PER_VIEW;
        var viewportWidth = viewport.getBoundingClientRect().width;
        if (!slideWidth) return SLIDES_PER_VIEW;
        return Math.min(4, Math.max(1, Math.round(viewportWidth / (slideWidth + GAP))));
    }

    function carouselNext() {
        if (carouselIndex < getMaxIndex()) { carouselIndex++; updateCarouselPosition(); }
        else if (getMaxIndex() > 0) { carouselIndex = 0; updateCarouselPosition(); }
    }

    function carouselPrev() {
        if (carouselIndex > 0) { carouselIndex--; updateCarouselPosition(); }
        else if (getMaxIndex() > 0) { carouselIndex = getMaxIndex(); updateCarouselPosition(); }
    }

    function goToCarousel(idx) {
        var max = getMaxIndex();
        if (idx < 0) idx = 0;
        if (idx > max) idx = max;
        if (idx === carouselIndex) return;
        carouselIndex = idx;
        updateCarouselPosition();
    }

    function updateCarouselPosition() {
        var track = document.getElementById('home-carousel-track');
        if (!track) return;
        var perView = getSlidesPerView();
        var firstSlide = track.querySelector('.carousel-slide');
        if (!firstSlide) return;
        var slideWidth = firstSlide.getBoundingClientRect().width;
        if (!slideWidth) return;
        track.style.transform = 'translateX(-' + (carouselIndex * perView * (slideWidth + GAP)) + 'px)';
        updateIndicators();
    }

    var autoplayTimer = null;
    var AUTOPLAY_MS = 5000;

    function startAutoplay() {
        stopAutoplay();
        if (getMaxIndex() <= 0) return;
        autoplayTimer = setInterval(carouselNext, AUTOPLAY_MS);
    }

    function stopAutoplay() { if (autoplayTimer) { clearInterval(autoplayTimer); autoplayTimer = null; } }

    function restartAutoplay() { if (autoplayTimer) startAutoplay(); }

    async function renderCategorias() {
        var container = document.getElementById('home-categories');
        if (!container) return;
        var categorias = await getCategorias();
        var inventario = await getInventario();
        if (categorias.length === 0) {
            container.innerHTML = '<div class=\"empty-state\"><div class=\"empty-state-icon\"></div><h3>Sin categorias aun</h3><p>Estamos organizando nuestro catalogo. Vuelve pronto.</p></div>';
            return;
        }
        container.className = 'cards-grid';
        container.innerHTML = categorias.map(function (c) {
            var count = inventario.filter(function (p) { return p.categoria === c.nombre; }).length;
            var foto = c.foto;
            var hasFoto = foto && foto.length > 0;
            return '<a href=\"' + (window.LETTERING_BASE || '') + '/productos/?categoria=' + encodeURIComponent(c.nombre) + '\" class=\"filter-card\">'
                + '<div class=\"filter-card-image' + (hasFoto ? '' : ' is-placeholder') + '\" style=\"' + (hasFoto ? "background-image:url('" + foto + "')" : '') + '\">' + (hasFoto ? '' : escapeHtml(c.nombre.charAt(0).toUpperCase())) + '</div>'
                + '<div class=\"filter-card-body\"><p class=\"filter-card-name\">' + escapeHtml(c.nombre) + '</p><p class=\"filter-card-count\">' + count + ' producto' + (count !== 1 ? 's' : '') + '</p></div></a>';
        }).join('');
    }

    async function renderMarcas() {
        var container = document.getElementById('home-brands');
        if (!container) return;
        var marcas = await getMarcas();
        var inventario = await getInventario();
        if (marcas.length === 0) {
            container.innerHTML = '<div class=\"empty-state\"><div class=\"empty-state-icon\"></div><h3>Sin marcas aun</h3><p>Estamos organizando nuestro catalogo. Vuelve pronto.</p></div>';
            return;
        }
        container.className = 'cards-grid';
        container.innerHTML = marcas.map(function (m) {
            var count = inventario.filter(function (p) { return p.marca === m.nombre; }).length;
            var foto = m.foto;
            var hasFoto = foto && foto.length > 0;
            return '<a href=\"' + (window.LETTERING_BASE || '') + '/productos/?marca=' + encodeURIComponent(m.nombre) + '\" class=\"filter-card\">'
                + '<div class=\"filter-card-image' + (hasFoto ? '' : ' is-placeholder') + '\" style=\"' + (hasFoto ? "background-image:url('" + foto + "')" : '') + '\">' + (hasFoto ? '' : escapeHtml(m.nombre.charAt(0).toUpperCase())) + '</div>'
                + '<div class=\"filter-card-body\"><p class=\"filter-card-name\">' + escapeHtml(m.nombre) + '</p><p class=\"filter-card-count\">' + count + ' producto' + (count !== 1 ? 's' : '') + '</p></div></a>';
        }).join('');
    }

    function openProduct(nombre) {
        window.location.href = (window.LETTERING_BASE || '') + '/productos/detalle.html?producto=' + encodeURIComponent(nombre);
    }

    function addToCart(nombre, ev) {
        var p = currentProducts.find(function (i) { return i.nombre === nombre; });
        if (!p) return;
        window.Cart.add(p, 1);
        var btn = ev && (ev.currentTarget || ev.target);
        if (btn) {
            var original = btn.innerHTML;
            btn.innerHTML = 'V Anadido';
            btn.style.background = '#10b981';
            btn.style.color = 'white';
            setTimeout(function () { btn.innerHTML = original; btn.style.background = ''; btn.style.color = ''; }, 1200);
        }
    }

    document.addEventListener('tasaCambiada', function () { renderCarousel(); });

    window.Home = {
        carouselNext: carouselNext,
        carouselPrev: carouselPrev,
        goToCarousel: goToCarousel,
        openProduct: openProduct,
        addToCart: addToCart
    };

    document.addEventListener('DOMContentLoaded', async function () {
        initSampleData();
        await renderCarousel();
        await renderCategorias();
        await renderMarcas();
        var carouselEl = document.getElementById('home-carousel');
        if (carouselEl) {
            carouselEl.addEventListener('mouseenter', stopAutoplay);
            carouselEl.addEventListener('mouseleave', startAutoplay);
            carouselEl.addEventListener('focusin', stopAutoplay);
            carouselEl.addEventListener('focusout', startAutoplay);
        }
        var resizeTimer = null;
        window.addEventListener('resize', function () {
            if (resizeTimer) clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                var max = getMaxIndex();
                if (carouselIndex > max) carouselIndex = max;
                renderIndicators();
                updateCarouselPosition();
            }, 150);
        });
        setTimeout(startAutoplay, 1000);
    });
})();
