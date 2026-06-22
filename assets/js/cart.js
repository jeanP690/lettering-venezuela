(function () {
    'use strict';
    var KEY = 'carrito';

    function getCart() {
        try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
    }

    function saveCart(cart) {
        localStorage.setItem(KEY, JSON.stringify(cart));
        document.dispatchEvent(new CustomEvent('carritoCambiado'));
    }

    function addToCart(product, qty) {
        qty = qty || 1;
        var cart = getCart();
        var existing = cart.find(function (i) { return i.nombre === product.nombre; });
        if (existing) {
            existing.cantidad += qty;
        } else {
            cart.push({
                nombre: product.nombre,
                precio: parseFloat(product.precio) || 0,
                cantidad: qty,
                foto: (product.fotos && product.fotos[0]) || '',
                categoria: product.categoria || '',
                marca: product.marca || ''
            });
        }
        saveCart(cart);
    }

    function removeFromCart(nombre) {
        saveCart(getCart().filter(function (i) { return i.nombre !== nombre; }));
    }

    function updateQuantity(nombre, cantidad) {
        cantidad = parseInt(cantidad, 10);
        if (isNaN(cantidad) || cantidad < 1) { removeFromCart(nombre); return; }
        var cart = getCart();
        var item = cart.find(function (i) { return i.nombre === nombre; });
        if (item) { item.cantidad = cantidad; saveCart(cart); }
    }

    function clearCart() { saveCart([]); }
    function getCount() { return getCart().reduce(function (acc, i) { return acc + i.cantidad; }, 0); }
    function getTotalUSD() { return getCart().reduce(function (acc, i) { return acc + (i.precio * i.cantidad); }, 0); }
    function getTotalBS() { return window.Currency ? window.Currency.usdToBs(getTotalUSD()) : 0; }

    function updateCartBadge() {
        var badge = document.getElementById('cart-count');
        if (!badge) return;
        badge.textContent = getCount();
        badge.classList.toggle('empty', getCount() === 0);
    }

    function renderCartPanel() {
        var container = document.getElementById('cart-items');
        if (!container) return;
        var cart = getCart();
        if (cart.length === 0) {
            container.innerHTML = '<div class=\"cart-empty\"><div class=\"cart-empty-icon\"></div><p>Tu carrito esta vacio</p></div>';
        } else {
            container.innerHTML = cart.map(function (i) {
                var foto = i.foto || '';
                var imgHtml = foto ? '<img src=\"' + escapeAttr(foto) + '\" alt=\"' + escapeHtml(i.nombre) + '\">' : '<div class=\"cart-item-img-placeholder\" aria-label=\"' + escapeHtml(i.nombre) + '\"></div>';
                return '<div class=\"cart-item\">' + imgHtml + '<div class=\"cart-item-info\"><p class=\"cart-item-name\">' + escapeHtml(i.nombre) + '</p><p class=\"cart-item-price\">' + window.Currency.formatUSD(i.precio) + '</p></div><div class=\"cart-item-qty\"><button onclick=\"Cart.update(\\'' + escapeAttr(i.nombre) + '\\', ' + (i.cantidad - 1) + ')\" aria-label=\"Restar\">-</button><span>' + i.cantidad + '</span><button onclick=\"Cart.update(\\'' + escapeAttr(i.nombre) + '\\', ' + (i.cantidad + 1) + ')\" aria-label=\"Sumar\">+</button></div></div>';
            }).join('');
        }
        var usdEl = document.getElementById('cart-total-usd');
        var bsEl = document.getElementById('cart-total-bs');
        if (usdEl) usdEl.textContent = window.Currency.formatUSD(getTotalUSD());
        if (bsEl) bsEl.textContent = window.Currency.formatBS(getTotalBS());
    }

    function escapeHtml(s) { return String(s || '').replace(/[&<>\"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function escapeAttr(s) { return String(s || '').replace(/'/g, "\\'"); }

    function openCart() {
        renderCartPanel();
        var panel = document.getElementById('cart-panel');
        var overlay = document.getElementById('cart-overlay');
        if (panel) panel.classList.add('open');
        if (overlay) overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeCart() {
        var panel = document.getElementById('cart-panel');
        var overlay = document.getElementById('cart-overlay');
        if (panel) panel.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    function toggleCart() {
        var panel = document.getElementById('cart-panel');
        if (panel && panel.classList.contains('open')) closeCart(); else openCart();
    }

    async function checkout() {
        var cart = getCart();
        if (cart.length === 0) return;

        var user = null;
        try { if (window.Users && typeof window.Users.isLoggedIn === 'function' && window.Users.isLoggedIn()) user = window.Users.getCurrent(); } catch (e) { user = null; }

        var pedido = {
            id: 'PED-' + Date.now(),
            fecha: new Date().toISOString().slice(0, 10),
            fechaCompleta: new Date().toISOString(),
            items: cart,
            totalUSD: getTotalUSD(),
            totalBS: getTotalBS(),
            estado: 'pendiente'
        };
        if (user) {
            pedido.userId = user.id;
            pedido.userEmail = user.email;
            pedido.userNombre = user.nombre;
            pedido.userTel = user.tel;
        }

        // Try Supabase
        if (window.DB && typeof window.DB.saveOrder === 'function') {
            try {
                await window.DB.saveOrder({
                    order_id: pedido.id,
                    user_id: user ? user.id : null,
                    user_email: user ? user.email : '',
                    user_name: user ? user.nombre : '',
                    user_phone: user ? user.tel : '',
                    items_json: JSON.stringify(cart),
                    total_usd: pedido.totalUSD,
                    total_bs: pedido.totalBS,
                    status: 'pendiente'
                });
            } catch (e) { console.warn('checkout: Supabase save failed, falling back'); }
        }

        // Always save to localStorage too for redundancy
        var pedidos = JSON.parse(localStorage.getItem('pedidosPendientes') || '[]');
        pedidos.push(pedido);
        localStorage.setItem('pedidosPendientes', JSON.stringify(pedidos));

        // Build WhatsApp message
        var waNum = '584121234567';
        try {
            var ci = JSON.parse(localStorage.getItem('contactoInfo') || '{}');
            if (ci.whatsapp) waNum = ci.whatsapp;
        } catch (e) {}
        var msg = '🛍️ *Nuevo Pedido* (' + pedido.id + ')%0A%0A';
        msg += '*Productos:*%0A';
        cart.forEach(function (item, i) {
            var q = item.cantidad || item.quantity || 1;
            var p = item.precio || item.price || 0;
            var n = item.nombre || item.name || 'Producto';
            msg += (i + 1) + '. ' + n + ' x' + q + ' = $' + (p * q).toFixed(2) + '%0A';
        });
        msg += '%0A*Total: $' + pedido.totalUSD.toFixed(2) + '*';
        if (pedido.totalBS > 0) msg += ' (%0ABs. ' + pedido.totalBS.toFixed(2) + ')';
        msg += '%0A%0A*Cliente:* ' + (user ? user.nombre || 'Sin registrar' : 'Sin registrar');
        if (user && user.tel) msg += '%0A*Tel:* ' + user.tel;
        if (user && user.email) msg += '%0A*Email:* ' + user.email;
        msg += '%0A%0A¡Gracias por tu pedido! 🎉';

        clearCart();
        closeCart();

        // Open WhatsApp
        window.open('https://wa.me/' + waNum + '?text=' + msg, '_blank');

        if (user && window.Users && typeof window.Users.showToast === 'function') {
            window.Users.showToast('Pedido enviado ' + user.nombre.split(' ')[0] + '! Lo veras en tu historial.', 'success');
        } else {
            alert('Pedido enviado! Te redirigimos a WhatsApp para confirmar.');
        }
    }

    document.addEventListener('carritoCambiado', function () {
        updateCartBadge();
        var panel = document.getElementById('cart-panel');
        if (panel && panel.classList.contains('open')) renderCartPanel();
    });

    window.Cart = {
        get: getCart, add: addToCart, remove: removeFromCart, update: updateQuantity,
        clear: clearCart, count: getCount, totalUSD: getTotalUSD, totalBS: getTotalBS,
        open: openCart, close: closeCart, toggle: toggleCart, checkout: checkout, updateBadge: updateCartBadge
    };
})();
