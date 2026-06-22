(function () {
    'use strict';

    var currentProduct = null;
    var currentImages = [];

    async function getInventario() {
        if (window.DB && typeof window.DB.getProducts === 'function') {
            try {
                var data = await window.DB.getProducts();
                if (data && data.length > 0) return data;
            } catch (e) { console.error('getInventario DB fallback:', e); }
        }
        try { return JSON.parse(localStorage.getItem('inventario')) || []; } catch (e) { return []; }
    }

    function escapeHtml(s) {
        return String(s || '').replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function getProductFromURL() {
        var params = new URLSearchParams(window.location.search);
        return params.get('producto') || '';
    }

    function selectImage(index) {
        var thumbs = document.querySelectorAll('.detalle-thumb');
        thumbs.forEach(function (t, i) {
            t.classList.toggle('active', i === index);
        });
        var mainImg = document.getElementById('detalle-img-main');
        var placeholder = document.getElementById('detalle-img-placeholder');
        if (currentImages[index]) {
            mainImg.src = currentImages[index];
            mainImg.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';
        } else {
            mainImg.style.display = 'none';
            if (placeholder) placeholder.style.display = 'flex';
        }
    }

    function renderRelated() {
        var grid = document.getElementById('detalle-related-grid');
        if (!grid || !currentProduct) return;
        getInventario().then(function (inventario) {
            var related = inventario.filter(function (p) {
                if (p.nombre === currentProduct.nombre) return false;
                var catMatch = p.categoria && currentProduct.categoria && p.categoria === currentProduct.categoria;
                var marMatch = p.marca && currentProduct.marca && p.marca === currentProduct.marca;
                return catMatch || marMatch;
            }).slice(0, 8);

            if (related.length === 0) {
                document.getElementById('detalle-related').style.display = 'none';
                return;
            }

            grid.innerHTML = related.map(function (p) {
                var foto = (p.fotos && p.fotos[0]) || null;
                var imgStyle = foto ? "background-image:url('" + foto + "')" : '';
                var imgClass = 'related-card-image' + (foto ? '' : ' no-photo');
                return '<a href="detalle.html?producto=' + encodeURIComponent(p.nombre) + '" class="related-card">'
                    +   '<div class="' + imgClass + '" style="' + imgStyle + '"></div>'
                    +   '<div class="related-card-body">'
                    +       '<h4>' + escapeHtml(p.nombre) + '</h4>'
                    +       '<span class="related-card-price">' + (window.Currency ? window.Currency.formatUSD(p.precio) : '$' + parseFloat(p.precio).toFixed(2)) + '</span>'
                    +   '</div>'
                    + '</a>';
            }).join('');
        });
    }

    async function loadProduct() {
        var loader = document.getElementById('detalle-loader');
        var error = document.getElementById('detalle-error');
        var content = document.getElementById('detalle-content');
        var productName = getProductFromURL();

        if (!productName) {
            if (loader) loader.style.display = 'none';
            if (error) error.style.display = 'block';
            return;
        }

        var inventario = await getInventario();
        var p = inventario.find(function (i) { return i.nombre === productName; });

        if (!p) {
            if (loader) loader.style.display = 'none';
            if (error) error.style.display = 'block';
            return;
        }

        currentProduct = p;
        currentImages = (p.fotos && p.fotos.length > 0) ? p.fotos : [];

        if (loader) loader.style.display = 'none';
        if (error) error.style.display = 'none';
        if (content) content.style.display = 'block';

        var mainImg = document.getElementById('detalle-img-main');
        var placeholder = document.getElementById('detalle-img-placeholder');
        if (currentImages.length > 0) {
            mainImg.src = currentImages[0];
            mainImg.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';
        } else {
            mainImg.style.display = 'none';
            if (placeholder) placeholder.style.display = 'flex';
        }

        var thumbs = document.getElementById('detalle-thumbs');
        if (currentImages.length > 1) {
            thumbs.innerHTML = currentImages.map(function (img, i) {
                return '<div class="detalle-thumb' + (i === 0 ? ' active' : '') + '" onclick="ProductoDetalle.selectImage(' + i + ')">'
                    +   '<img src="' + img + '" alt="">'
                    + '</div>';
            }).join('');
            thumbs.style.display = 'flex';
        } else {
            thumbs.style.display = 'none';
        }

        document.getElementById('detalle-name').textContent = p.nombre;

        var bc = document.getElementById('detalle-breadcrumb');
        bc.innerHTML = ''
            + '<a href="index.html">Productos</a>'
            + (p.categoria ? ' <span class="bc-sep">›</span> <a href="index.html?categoria=' + encodeURIComponent(p.categoria) + '">' + escapeHtml(p.categoria) + '</a>' : '')
            + (p.marca ? ' <span class="bc-sep">›</span> <span>' + escapeHtml(p.marca) + '</span>' : '');

        document.getElementById('detalle-brand').textContent = (p.marca ? 'Marca: ' + p.marca : '') + (p.categoria ? ' — ' + p.categoria : '');

        document.getElementById('detalle-price-usd').textContent = window.Currency ? window.Currency.formatUSD(p.precio) : '$' + parseFloat(p.precio).toFixed(2);
        document.getElementById('detalle-price-bs').textContent = window.Currency ? window.Currency.formatBS(window.Currency.usdToBs(p.precio)) : 'Bs ' + parseFloat(p.precio).toFixed(2);

        var stock = p.cantidad || 0;
        var stockEl = document.getElementById('detalle-stock');
        if (stock <= 0) {
            stockEl.innerHTML = '<span class="stock-badge out">❌ Sin stock</span>';
        } else if (stock <= 5) {
            stockEl.innerHTML = '<span class="stock-badge low">⚠️ Quedan ' + stock + ' uds.</span>';
        } else {
            stockEl.innerHTML = '<span class="stock-badge ok">✅ ' + stock + ' disponibles</span>';
        }

        document.getElementById('detalle-description').textContent = 'Producto de alta calidad' + (p.marca ? ' de la marca ' + p.marca : '') + ', ideal para tus proyectos de lettering y arte.';

        document.getElementById('detalle-qty-input').value = 1;

        renderRelated();

        document.title = p.nombre + ' — lettering venezuela';
    }

    function qtyInc() {
        var input = document.getElementById('detalle-qty-input');
        input.value = parseInt(input.value || 1, 10) + 1;
    }

    function qtyDec() {
        var input = document.getElementById('detalle-qty-input');
        var v = parseInt(input.value || 1, 10);
        if (v > 1) input.value = v - 1;
    }

    function addToCart() {
        if (!currentProduct) return;
        var qty = parseInt(document.getElementById('detalle-qty-input').value, 10) || 1;
        window.Cart.add(currentProduct, qty);
        var btn = document.querySelector('.detalle-add-cart');
        if (btn) {
            var original = btn.innerHTML;
            btn.innerHTML = '✓ Añadido al carrito';
            btn.style.background = '#10b981';
            setTimeout(function () {
                btn.innerHTML = original;
                btn.style.background = '';
            }, 1500);
        }
        window.Cart.open();
    }

    window.ProductoDetalle = {
        loadProduct: loadProduct,
        selectImage: selectImage,
        qtyInc: qtyInc,
        qtyDec: qtyDec,
        addToCart: addToCart
    };

    document.addEventListener('DOMContentLoaded', loadProduct);
    document.addEventListener('tasaCambiada', function () {
        if (currentProduct) {
            document.getElementById('detalle-price-usd').textContent = window.Currency ? window.Currency.formatUSD(currentProduct.precio) : '$' + parseFloat(currentProduct.precio).toFixed(2);
            document.getElementById('detalle-price-bs').textContent = window.Currency ? window.Currency.formatBS(window.Currency.usdToBs(currentProduct.precio)) : 'Bs ' + parseFloat(currentProduct.precio).toFixed(2);
        }
    });
})();
