/**
 * gallery.js
 * Galeria de productos con:
 *   - Sidebar de filtros (categoria + marca)
 *   - Integracion con busqueda (?q=)
 *   - Redireccion a pagina de detalle del producto
 *   - Anadir al carrito
 */
(function () {
    'use strict';

    var state = {
        categoria: null,
        marca: null,
        query: ''
    };

    async function getInventario() {
        if (window.DB && typeof window.DB.getProducts === 'function') {
            try {
                var data = await window.DB.getProducts();
                if (data && data.length > 0) return data;
            } catch (e) { /* fallback */ }
        }
        try { return JSON.parse(localStorage.getItem('inventario')) || []; } catch (e) { return []; }
    }

    async function getCategorias() {
        if (window.DB && typeof window.DB.getCategories === 'function') {
            try {
                var data = await window.DB.getCategories();
                if (data && data.length > 0) return data;
            } catch (e) { /* fallback */ }
        }
        try { return JSON.parse(localStorage.getItem('categoriasObj')) || []; } catch (e) { return []; }
    }

    async function getMarcas() {
        if (window.DB && typeof window.DB.getBrands === 'function') {
            try {
                var data = await window.DB.getBrands();
                if (data && data.length > 0) return data;
            } catch (e) { /* fallback */ }
        }
        try { return JSON.parse(localStorage.getItem('marcasObj')) || []; } catch (e) { return []; }
    }

    function safeFormatUSD(amount) {
        if (window.Currency && typeof window.Currency.formatUSD === 'function') {
            return window.Currency.formatUSD(amount);
        }
        var n = parseFloat(amount || 0);
        return '$' + n.toFixed(2);
    }

    function safeFormatBS(amount) {
        if (window.Currency && typeof window.Currency.formatBS === 'function') {
            return window.Currency.formatBS(amount);
        }
        var n = parseFloat(amount || 0);
        return 'Bs. ' + n.toFixed(2);
    }

    function safeUsdToBs(usd) {
        if (window.Currency && typeof window.Currency.usdToBs === 'function') {
            return window.Currency.usdToBs(usd);
        }
        return parseFloat(usd || 0) * 36.5;
    }

    function escapeHtml(s) {
        return String(s || '').replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function escapeAttr(s) { return String(s || '').replace(/'/g, "\\'"); }

    function normalize(s) {
        return String(s || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    function levenshtein(a, b) {
        if (a === b) return 0;
        var al = a.length, bl = b.length;
        if (!al) return bl;
        if (!bl) return al;
        var prev = [];
        for (var j = 0; j <= bl; j++) prev[j] = j;
        var curr = [];
        for (var i = 1; i <= al; i++) {
            curr[0] = i;
            for (var k = 1; k <= bl; k++) {
                var cost = a.charAt(i - 1) === b.charAt(k - 1) ? 0 : 1;
                curr[k] = Math.min(
                    prev[k] + 1,
                    curr[k - 1] + 1,
                    prev[k - 1] + cost
                );
            }
            for (var m = 0; m <= bl; m++) prev[m] = curr[m];
        }
        return prev[bl];
    }

    function fuzzyMatch(query, haystack) {
        query = normalize(query).trim();
        haystack = normalize(haystack);
        if (!query) return true;
        if (haystack.indexOf(query) !== -1) return true;
        var qWords = query.split(/\s+/).filter(Boolean);
        var hWords = haystack.split(/\s+/).filter(Boolean);
        return qWords.every(function (qw) {
            return hWords.some(function (hw) {
                if (hw.indexOf(qw) !== -1 || qw.indexOf(hw) !== -1) return true;
                var maxDist = qw.length <= 4 ? 1 : 2;
                return levenshtein(qw, hw) <= maxDist;
            });
        });
    }

    async function applyFilters() {
        var inventario = await getInventario();

        return inventario.filter(function (p) {
            if (state.categoria && p.categoria !== state.categoria) return false;
            if (state.marca && p.marca !== state.marca) return false;
            if (state.query) {
                var haystack = (p.nombre || '') + ' ' + (p.marca || '') + ' ' + (p.categoria || '');
                if (!fuzzyMatch(state.query, haystack)) return false;
            }
            return true;
        });
    }

    async function renderProductos() {
        var grid = document.getElementById('productos-grid');
        var empty = document.getElementById('productos-empty');
        var count = document.getElementById('productos-count');
        if (!grid || !empty || !count) return;

        var inventario = await getInventario();
        var productos = await applyFilters();

        if (inventario.length === 0) {
            grid.innerHTML = '';
            empty.style.display = 'block';
            count.textContent = '0 productos';
            return;
        }

        empty.style.display = 'none';

        if (productos.length === 0) {
            grid.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;"><div class="empty-state-icon">🔍</div><h3>Sin resultados</h3><p>No encontramos productos con esos filtros. Intenta con otros terminos o limpia los filtros.</p></div>';
            count.textContent = '0 productos encontrados';
            return;
        }

        grid.innerHTML = groupProductosByCategoriaYMarca(productos);
        count.textContent = productos.length + ' producto' + (productos.length !== 1 ? 's' : '') + ' encontrado' + (productos.length !== 1 ? 's' : '');
    }

    function groupProductosByCategoriaYMarca(productos) {
        var sorted = productos.slice().sort(function (a, b) {
            var ma = (a.marca || 'Sin marca').toLowerCase();
            var mb = (b.marca || 'Sin marca').toLowerCase();
            if (ma !== mb) return ma < mb ? -1 : 1;
            return (a.nombre || '').localeCompare(b.nombre || '');
        });

        var marcas = {};
        var marcaOrder = [];
        for (var i = 0; i < sorted.length; i++) {
            var p = sorted[i];
            var mar = p.marca || 'Sin marca';
            if (!marcas[mar]) {
                marcas[mar] = [];
                marcaOrder.push(mar);
            }
            marcas[mar].push(p);
        }

        var html = '';
        for (var m = 0; m < marcaOrder.length; m++) {
            var marca = marcaOrder[m];
            var items = marcas[marca];
            html += '<div class="grupo-marca">';
            html += '<h2 class="grupo-marca-titulo">' + escapeHtml(marca) + '</h2>';
            html += '<div class="grupo-marca-grid">';
            for (var k = 0; k < items.length; k++) {
                html += renderCardProducto(items[k]);
            }
            html += '</div></div>';
        }
        return html;
    }

    function renderCardProducto(p) {
        var foto = (p.fotos && p.fotos[0]) || null;
        var noPhoto = !foto;
        var imgStyle = foto ? "background-image:url('" + foto + "')" : '';
        var imgClass = 'producto-card-image' + (noPhoto ? ' no-photo' : '');
        var tag = p.marca || p.categoria || '';
        return ''
            + '<div class="producto-card" onclick="Gallery.goToProduct(\'' + escapeAttr(p.nombre) + '\')">'
            +     '<div class="' + imgClass + '" style="' + imgStyle + '" role="img" aria-label="' + escapeHtml(p.nombre) + '"></div>'
            +     '<div class="producto-card-body">'
            +         (tag ? '<span class="producto-card-tag">' + escapeHtml(tag) + '</span>' : '')
            +         '<h3 class="producto-card-name">' + escapeHtml(p.nombre) + '</h3>'
            +         '<p class="producto-card-brand">' + escapeHtml(p.categoria || 'General') + '</p>'
            +         '<div class="producto-card-prices">'
            +             '<span class="price-usd">' + safeFormatUSD(p.precio) + '</span>'
            +             '<span class="price-bs">' + safeFormatBS(safeUsdToBs(p.precio)) + '</span>'
            +         '</div>'
            +         '<div class="producto-card-actions">'
            +             '<button class="btn-add-cart" onclick="event.stopPropagation(); Gallery.quickAdd(\'' + escapeAttr(p.nombre) + '\', event)">🛒 Anadir</button>'
            +         '</div>'
            +     '</div>'
            + '</div>';
    }

    async function renderFilters() {
        var inventario = await getInventario();
        var categorias = await getCategorias();
        var marcas = await getMarcas();

        var marList = document.getElementById('filter-marcas');
        if (marList) {
            marList.innerHTML = marcas.map(function (m) {
                var count = inventario.filter(function (p) { return p.marca === m.nombre; }).length;
                var active = state.marca === m.nombre ? ' active' : '';
                return '<li class="' + active.trim() + '" onclick="Gallery.setMarca(\'' + escapeAttr(m.nombre) + '\')">'
                    + escapeHtml(m.nombre)
                    + '<span class="count">' + count + '</span>'
                    + '</li>';
            }).join('');
        }

        var catList = document.getElementById('filter-categorias');
        if (catList) {
            var filteredCategorias = categorias;
            if (state.marca) {
                var productosDeMarca = inventario.filter(function (p) { return p.marca === state.marca; });
                var catsDeMarca = {};
                productosDeMarca.forEach(function (p) { if (p.categoria) catsDeMarca[p.categoria] = true; });
                filteredCategorias = categorias.filter(function (c) { return catsDeMarca[c.nombre]; });
            }
            catList.innerHTML = filteredCategorias.map(function (c) {
                var count = inventario.filter(function (p) { return p.categoria === c.nombre; }).length;
                var active = state.categoria === c.nombre ? ' active' : '';
                return '<li class="' + active.trim() + '" onclick="Gallery.setCategoria(\'' + escapeAttr(c.nombre) + '\')">'
                    + escapeHtml(c.nombre)
                    + '<span class="count">' + count + '</span>'
                    + '</li>';
            }).join('');
        }
    }

    async function setCategoria(nombre) {
        state.categoria = state.categoria === nombre ? null : nombre;
        await renderFilters();
        await renderProductos();
    }

    async function setMarca(nombre) {
        state.marca = state.marca === nombre ? null : nombre;
        await renderFilters();
        await renderProductos();
    }

    async function clearFilters() {
        state.categoria = null;
        state.marca = null;
        state.query = '';
        await renderFilters();
        await renderProductos();
    }

    async function quickAdd(nombre, ev) {
        var inventario = await getInventario();
        var p = inventario.find(function (i) { return i.nombre === nombre; });
        if (!p) return;
        window.Cart.add(p, 1);
        if (ev && ev.target) {
            var btn = ev.target;
            var original = btn.textContent;
            btn.textContent = '✓ Anadido';
            btn.style.background = 'var(--color-success)';
            setTimeout(function () {
                btn.textContent = original;
                btn.style.background = '';
            }, 1200);
        }
    }

    function goToProduct(nombre) {
        window.location.href = 'detalle.html?producto=' + encodeURIComponent(nombre);
    }

    document.addEventListener('tasaCambiada', function () {
        renderProductos();
    });

    window.Gallery = {
        setCategoria: setCategoria,
        setMarca: setMarca,
        clearFilters: clearFilters,
        quickAdd: quickAdd,
        goToProduct: goToProduct
    };

    document.addEventListener('DOMContentLoaded', async function () {
        var params = new URLSearchParams(window.location.search);
        state.query = params.get('q') || '';
        state.categoria = params.get('categoria') || null;
        state.marca = params.get('marca') || null;

        await renderFilters();
        await renderProductos();
    });

})();
