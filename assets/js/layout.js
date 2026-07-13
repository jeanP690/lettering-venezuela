/**
 * layout.js
 * Inyecta el header, footer y panel del carrito en cada página,
 * marca el link activo y actualiza el badge del carrito.
 *
 * Estructura esperada en cada HTML:
 *   <div id="site-header"></div>
 *   <main> ... </main>
 *   <div id="site-footer"></div>
 *   <script src="../assets/js/currency.js"></script>
 *   <script src="../assets/js/cart.js"></script>
 *   <script src="../assets/js/users.js"></script>
 *   <script src="../assets/js/layout.js"></script>
 */
(function () {
    'use strict';

    // Auto-detecta la ruta base del proyecto.
    // Funciona tanto en XAMPP (/lettering/) como en Live Server (/) o cualquier otra ruta.
    function detectBasePath() {
        var path = window.location.pathname;
        var parts = path.split('/').filter(Boolean);
        var SKIP = ['productos', 'contacto', 'dashboard', 'historial', 'assets'];
        var baseParts = [];
        for (var i = 0; i < parts.length; i++) {
            if (SKIP.indexOf(parts[i]) !== -1) break;
            baseParts.push(parts[i]);
        }
        return baseParts.length === 0 ? '' : '/' + baseParts.join('/');
    }

    var basePath = detectBasePath();
    window.LETTERING_BASE = basePath; // Disponible globalmente para otros scripts

    // Detectar página actual (sin/y con trailing slash)
    var path = window.location.pathname;
    var currentPage = 'home';
    if (path.indexOf('/productos') !== -1) currentPage = 'productos';
    else if (path.indexOf('/contacto') !== -1) currentPage = 'contacto';
    else if (path.indexOf('/historial') !== -1) currentPage = 'historial';
    else if (path.indexOf('/dashboard') !== -1) currentPage = 'dashboard';

    // Header con hamburger, logo, búsqueda, user y carrito
    var headerHTML = ''
        + '<header class="site-header">'
        +     '<div class="header-row">'
        +         '<button class="hamburger-toggle" id="hamburger-toggle" type="button" aria-label="Abrir menú">'
        +             '<span></span><span></span><span></span>'
        +         '</button>'
        +         '<a href="' + basePath + '/" class="brand">'
        +             '<span class="brand-mark">LV</span>'
        +             'lettering venezuela'
        +         '</a>'
        +         '<div class="header-search-wrap">'
        +             '<form class="header-search" action="' + basePath + '/productos/" method="get" role="search">'
        +                 '<input type="search" name="q" id="header-search-input" placeholder="Buscar productos, marcas, categorías..." aria-label="Buscar productos" autocomplete="off">'
        +                 '<button type="submit" aria-label="Buscar">🔍</button>'
        +             '</form>'
        +             '<div class="search-suggestions" id="search-suggestions"></div>'
        +         '</div>'
        +         '<div class="header-actions">'
        +             '<button class="user-toggle" id="user-toggle" type="button" aria-label="Mi cuenta">'
        +                 '<span class="user-toggle-icon">👤</span>'
        +                 '<span class="user-toggle-name">Ingresar</span>'
        +             '</button>'
        +             '<button class="cart-toggle" onclick="Cart.toggle()" aria-label="Abrir carrito">'
        +                 '<span class="cart-toggle-text">🛒 <span>Carrito</span></span>'
        +                 '<span class="cart-badge empty" id="cart-count">0</span>'
        +             '</button>'
        +         '</div>'
        +     '</div>'
        + '</header>';

    // Obtener WhatsApp desde contactoInfo para sidebar/footer
    function getWA() {
        try { var ci = JSON.parse(localStorage.getItem('contactoInfo') || '{}'); if (ci.whatsapp) return ci.whatsapp; } catch (e) {}
        return '584121234567';
    }

    // Sidebar de navegación lateral (izquierda)
    var waSidebar = getWA();
    var sidebarHTML = ''
        + '<div class="sidebar-overlay" id="sidebar-overlay" onclick="Layout.closeSidebar()"></div>'
        + '<aside class="sidebar-nav" id="sidebar-nav" role="navigation" aria-label="Menú principal">'
        +     '<div class="sidebar-nav-header">'
        +         '<a href="' + basePath + '/" class="sidebar-brand" onclick="Layout.closeSidebar()">'
        +             '<span class="brand-mark">LV</span>'
        +             'lettering venezuela'
        +         '</a>'
        +         '<button class="sidebar-close" onclick="Layout.closeSidebar()" aria-label="Cerrar menú">×</button>'
        +     '</div>'
        +     '<nav class="sidebar-nav-menu">'
        +         '<ul>'
        +             '<li><a href="' + basePath + '/" data-page="home" onclick="Layout.closeSidebar()">'
        +                 '<span class="sidebar-nav-icon">🏠</span>'
        +                 '<span>Inicio</span>'
        +             '</a></li>'
        +             '<li><a href="' + basePath + '/productos/" data-page="productos" onclick="Layout.closeSidebar()">'
        +                 '<span class="sidebar-nav-icon">📦</span>'
        +                 '<span>Productos</span>'
        +             '</a></li>'
        +             '<li><a href="' + basePath + '/contacto/" data-page="contacto" onclick="Layout.closeSidebar()">'
        +                 '<span class="sidebar-nav-icon">💬</span>'
        +                 '<span>Contactos</span>'
        +             '</a></li>'
        +             '<li><a href="' + basePath + '/historial/" data-page="historial" onclick="Layout.closeSidebar()">'
        +                 '<span class="sidebar-nav-icon">🛍️</span>'
        +                 '<span>Mis Compras</span>'
        +             '</a></li>'
        +         '</ul>'
        +     '</nav>'
        +     '<div class="sidebar-nav-footer">'
        +         '<p class="sidebar-nav-footer-title">Síguenos</p>'
        +         '<div class="sidebar-social">'
        +             '<a href="https://wa.me/' + waSidebar + '" target="_blank" rel="noopener" aria-label="WhatsApp">'
        +                 '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>'
        +             '</a>'
        +             '<a href="https://instagram.com/" target="_blank" rel="noopener" aria-label="Instagram">'
        +                 '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>'
        +             '</a>'
        +             '<a href="https://facebook.com/" target="_blank" rel="noopener" aria-label="Facebook">'
        +                 '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>'
        +             '</a>'
        +         '</div>'
        +     '</div>'
        + '</aside>';

    var waFooter = getWA();
    // Footer con navegación rápida y redes sociales
    var footerHTML = ''
        + '<footer class="site-footer">'
        +     '<div class="footer-grid">'
        +         '<div>'
        +             '<div class="footer-brand">lettering venezuela</div>'
        +             '<p class="footer-tagline">Herramientas de alta calidad para artistas, diseñadores y entusiastas del lettering en Venezuela.</p>'
        +         '</div>'
        +         '<div>'
        +             '<h4>Navegación</h4>'
        +             '<ul>'
        +                 '<li><a href="' + basePath + '/">Inicio</a></li>'
        +                 '<li><a href="' + basePath + '/productos/">Productos</a></li>'
        +                 '<li><a href="' + basePath + '/contacto/">Contactos</a></li>'
        +                 '<li><a href="' + basePath + '/historial/">Mis Compras</a></li>'
        +             '</ul>'
        +         '</div>'
        +         '<div>'
        +             '<h4>Síguenos</h4>'
        +             '<ul class="footer-social">'
        +                 '<li><a href="https://wa.me/' + waFooter + '" target="_blank" rel="noopener"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> WhatsApp</a></li>'
        +                 '<li><a href="https://instagram.com/" target="_blank" rel="noopener"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg> Instagram</a></li>'
        +                 '<li><a href="https://facebook.com/" target="_blank" rel="noopener"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> Facebook</a></li>'
        +             '</ul>'
        +         '</div>'
        +     '</div>'
        +     '<div class="footer-bottom">'
        +         '<p>&copy; 2026 Lettering Venezuela. Todos los derechos reservados.</p>'
        +     '</div>'
        + '</footer>';

    // Panel del carrito (sidebar deslizable)
    var cartHTML = ''
        + '<div class="cart-overlay" id="cart-overlay" onclick="Cart.close()"></div>'
        + '<aside class="cart-panel" id="cart-panel" aria-label="Carrito de compras">'
        +     '<div class="cart-header">'
        +         '<h3>🛒 Tu Carrito</h3>'
        +         '<button class="cart-close" onclick="Cart.close()" aria-label="Cerrar carrito">×</button>'
        +     '</div>'
        +     '<div class="cart-items" id="cart-items"></div>'
        +     '<div class="cart-footer">'
        +         '<div class="cart-totals">'
        +             '<div class="cart-total-row grand"><span>Total USD</span><span id="cart-total-usd">$0.00</span></div>'
        +             '<div class="cart-total-row grand"><span>Total BS</span><span id="cart-total-bs">Bs. 0.00</span></div>'
        +         '</div>'
        +         '<div class="cart-actions">'
        +             '<button class="btn-clear-cart" onclick="Cart.clear()">Vaciar</button>'
        +             '<button class="btn-checkout" onclick="Cart.checkout()">Finalizar Compra</button>'
        +         '</div>'
        +     '</div>'
        + '</aside>';

    // Inyectar en los slots
    var headerSlot = document.getElementById('site-header');
    var footerSlot = document.getElementById('site-footer');
    if (headerSlot) headerSlot.innerHTML = headerHTML;
    if (footerSlot) footerSlot.innerHTML = footerHTML;

    // Panel del carrito va al final del body
    var cartContainer = document.createElement('div');
    cartContainer.innerHTML = cartHTML;
    document.body.appendChild(cartContainer);

    // Sidebar lateral
    var sidebarContainer = document.createElement('div');
    sidebarContainer.innerHTML = sidebarHTML;
    document.body.appendChild(sidebarContainer);

    // Búsqueda con autocomplete
    initSearchSuggestions();

    // Marcar el link activo (también en el sidebar)
    document.querySelectorAll('[data-page="' + currentPage + '"]').forEach(function (el) {
        el.classList.add('active');
    });

    // Inicializar badge del carrito
    if (window.Cart) {
        window.Cart.updateBadge();
        // Sincronizar la query del search si existe
        var params = new URLSearchParams(window.location.search);
        var q = params.get('q');
        var searchInput = document.querySelector('.header-search input');
        if (searchInput && q) searchInput.value = q;
    }

    // Hamburger → abrir/cerrar sidebar
    var hamburger = document.getElementById('hamburger-toggle');
    if (hamburger) {
        hamburger.addEventListener('click', function () {
            var sidebar = document.getElementById('sidebar-nav');
            var overlay = document.getElementById('sidebar-overlay');
            if (sidebar && sidebar.classList.contains('open')) {
                Layout.closeSidebar();
            } else {
                openSidebar();
            }
        });
    }

    function applyContactoInfo() {
        var info = {};
        try { info = JSON.parse(localStorage.getItem('contactoInfo') || '{}'); } catch (e) { return; }
        if (!info.whatsapp && !info.instagram && !info.facebook) return;

        var waNumber = info.whatsapp;
        var igUrl = info.instagram;
        var fbUrl = info.facebook;

        var links = document.querySelectorAll('a[href]');
        for (var i = 0; i < links.length; i++) {
            var a = links[i];
            var href = a.getAttribute('href') || '';

            if (waNumber) {
                var waMatch = href.match(/wa\.me\/(\d+)/);
                if (waMatch) {
                    var query = '';
                    if (href.indexOf('?') !== -1) query = href.substring(href.indexOf('?'));
                    a.setAttribute('href', 'https://wa.me/' + waNumber + query);
                }
            }
            if (igUrl) {
                if (href === 'https://instagram.com/' || href === 'https://instagram.com/letteringvzla') {
                    a.setAttribute('href', igUrl);
                }
            }
            if (fbUrl) {
                if (href === 'https://facebook.com/' || href === 'https://facebook.com/letteringvzla') {
                    a.setAttribute('href', fbUrl);
                }
            }
        }
    }
    applyContactoInfo();

    function initSearchSuggestions() {
        var input = document.getElementById('header-search-input');
        var container = document.getElementById('search-suggestions');
        if (!input || !container) return;

        function getInventario() {
            try { var arr = JSON.parse(localStorage.getItem('inventario')) || []; return arr.filter(function (p) { return p.activo !== false; }); } catch (e) { return []; }
        }
        var _cachedDbProducts = null;
        async function getInventarioFromDB() {
            if (_cachedDbProducts) return _cachedDbProducts;
            if (window.DB && typeof window.DB.getProducts === 'function') {
                try {
                    var data = await window.DB.getProducts();
                    if (data && data.length > 0) { _cachedDbProducts = data; return data; }
                } catch (e) {}
            }
            return getInventario();
        }

        var escapeHtml = window.escapeHtml || function (s) {
            return String(s || '').replace(/[&<>"']/g, function (c) {
                return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
            });
        };

        function normalize(s) {
            return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        }

        input.addEventListener('input', async function () {
            var q = normalize(input.value.trim());
            if (q.length < 1) {
                container.innerHTML = '';
                container.classList.remove('visible');
                return;
            }

            // Await Supabase data first for complete search results
            var inventario = await getInventarioFromDB();
            var productos = inventario.filter(function (p) {
                return p.nombre && normalize(p.nombre).indexOf(q) !== -1;
            }).slice(0, 4);
            var marcas = [];
            var categorias = [];
            inventario.forEach(function (p) {
                if (p.marca && normalize(p.marca).indexOf(q) !== -1 && marcas.indexOf(p.marca) === -1) marcas.push(p.marca);
                if (p.categoria && normalize(p.categoria).indexOf(q) !== -1 && categorias.indexOf(p.categoria) === -1) categorias.push(p.categoria);
            });
            marcas = marcas.slice(0, 3);
            categorias = categorias.slice(0, 3);

            if (productos.length === 0 && marcas.length === 0 && categorias.length === 0) {
                container.innerHTML = '<div class="ss-empty">Sin resultados</div>';
                container.classList.add('visible');
                return;
            }

            var html = '';

            if (productos.length > 0) {
                html += '<div class="ss-group-label">Productos</div>';
                html += productos.map(function (p) {
                    var foto = (p.fotos && p.fotos[0]) || '';
                    var img = foto ? '<img src="' + foto + '" alt="">' : '<span class="ss-icon">📦</span>';
                    return '<a class="ss-item" href="' + basePath + '/productos/?q=' + encodeURIComponent(p.nombre) + '">'
                        + '<span class="ss-img">' + img + '</span>'
                        + '<span class="ss-info">'
                        +     '<span class="ss-name">' + escapeHtml(p.nombre) + '</span>'
                        +     '<span class="ss-marca">' + escapeHtml(p.marca || '') + '</span>'
                        + '</span>'
                        + '<span class="ss-price">' + (window.Currency ? window.Currency.formatUSD(p.precio) : '$' + p.precio) + '</span>'
                        + '</a>';
                }).join('');
            }

            if (marcas.length > 0) {
                html += '<div class="ss-group-label">Marcas</div>';
                html += marcas.map(function (m) {
                    return '<a class="ss-item ss-item-simple" href="' + basePath + '/productos/?marca=' + encodeURIComponent(m) + '">'
                        + '<span class="ss-img">🏷️</span>'
                        + '<span class="ss-info"><span class="ss-name">' + escapeHtml(m) + '</span></span>'
                        + '</a>';
                }).join('');
            }

            if (categorias.length > 0) {
                html += '<div class="ss-group-label">Categorías</div>';
                html += categorias.map(function (c) {
                    return '<a class="ss-item ss-item-simple" href="' + basePath + '/productos/?categoria=' + encodeURIComponent(c) + '">'
                        + '<span class="ss-img">📁</span>'
                        + '<span class="ss-info"><span class="ss-name">' + escapeHtml(c) + '</span></span>'
                        + '</a>';
                }).join('');
            }

            container.innerHTML = html;
            container.classList.add('visible');
        });

        document.addEventListener('click', function (e) {
            if (!input.contains(e.target) && !container.contains(e.target)) {
                container.classList.remove('visible');
            }
        });

        input.addEventListener('blur', function () {
            setTimeout(function () { container.classList.remove('visible'); }, 200);
        });
    }

    function openSidebar() {
        var sidebar = document.getElementById('sidebar-nav');
        var overlay = document.getElementById('sidebar-overlay');
        var hamburger = document.getElementById('hamburger-toggle');
        if (sidebar) sidebar.classList.add('open');
        if (overlay) overlay.classList.add('open');
        if (hamburger) hamburger.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // Exponer API del sidebar
    window.Layout = {
        openSidebar: openSidebar,
        closeSidebar: function () {
            var sidebar = document.getElementById('sidebar-nav');
            var overlay = document.getElementById('sidebar-overlay');
            var hamburger = document.getElementById('hamburger-toggle');
            if (sidebar) sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('open');
            if (hamburger) hamburger.classList.remove('active');
            // Solo restaurar scroll si no hay otro modal abierto
            if (!document.querySelector('.user-modal.open') && !document.querySelector('.cart-panel.open')) {
                document.body.style.overflow = '';
            }
        }
    };

    // Scroll to top button
    var scrollBtn = document.createElement('button');
    scrollBtn.id = 'scroll-to-top';
    scrollBtn.innerHTML = '⬆';
    scrollBtn.setAttribute('aria-label', 'Volver arriba');
    scrollBtn.style.cssText = 'position:fixed;bottom:24px;right:24px;width:44px;height:44px;border-radius:50%;background:#6366f1;color:white;border:none;font-size:1.2rem;cursor:pointer;box-shadow:0 4px 12px rgba(99,102,241,0.3);z-index:9000;display:none;align-items:center;justify-content:center;transition:opacity 0.2s;';
    scrollBtn.onclick = function() { window.scrollTo({ top: 0, behavior: 'smooth' }); };
    document.body.appendChild(scrollBtn);
    window.addEventListener('scroll', function() {
        scrollBtn.style.display = window.scrollY > 400 ? 'flex' : 'none';
    });
})();
