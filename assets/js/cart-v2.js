(function () {
    'use strict';
    var KEY = 'carrito';

    function safeFormatUSD(val) {
        if (window.Currency && typeof window.Currency.formatUSD === 'function') return window.Currency.formatUSD(val);
        return '$' + (val || 0).toFixed(2);
    }
    function safeFormatBS(val) {
        if (window.Currency && typeof window.Currency.formatBS === 'function') return window.Currency.formatBS(val);
        return 'Bs. ' + (val || 0).toFixed(2);
    }

    function getCart() {
        try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
    }

    function saveCart(cart) {
        try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) {
            if (e.name === 'QuotaExceededError') {
                if (window.Users && typeof window.Users.showToast === 'function') {
                    window.Users.showToast('⚠️ Espacio insuficiente en el almacenamiento.', 'error');
                } else { alert('⚠️ Espacio insuficiente en el almacenamiento.'); }
            }
        }
        document.dispatchEvent(new CustomEvent('carritoCambiado'));
    }

    function getInventario() {
        try { var arr = JSON.parse(localStorage.getItem('inventario')) || []; return arr.filter(function (p) { return p.activo !== false; }); } catch (e) { return []; }
    }

    function addToCart(product, qty) {
        qty = qty || 1;
        var inv = getInventario();
        var prod = inv.find(function (i) { return i.nombre === product.nombre; });
        if (prod) {
            var stockActual = parseInt(prod.cantidad) || 0;
            if (stockActual <= 0) {
                if (window.Users && typeof window.Users.showToast === 'function') {
                    window.Users.showToast('❌ "' + product.nombre + '" no tiene stock disponible.', 'error');
                } else {
                    alert('"' + product.nombre + '" no tiene stock disponible.');
                }
                return;
            }
            var cart = getCart();
            var existing = cart.find(function (i) { return i.nombre === product.nombre; });
            var enCarrito = existing ? existing.cantidad : 0;
            if (enCarrito + qty > stockActual) {
                var maxAgregar = stockActual - enCarrito;
                if (maxAgregar <= 0) {
                    if (window.Users && typeof window.Users.showToast === 'function') {
                        window.Users.showToast('⚠️ Ya tienes las ' + stockActual + ' unidades disponibles de "' + product.nombre + '" en tu carrito.', 'error');
                    } else {
                        alert('Ya tienes todas las unidades disponibles en tu carrito.');
                    }
                    return;
                }
                qty = maxAgregar;
            }
        }
        var cart = getCart();
        var existing = cart.find(function (i) { return i.nombre === product.nombre; });
        if (existing) {
            existing.cantidad += qty;
        } else {
            cart.push({
                nombre: product.nombre,
                precio: parseFloat(product.precio) || 0,
                cantidad: qty,
                codigo: product.codigo || '',
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

    function clearCart(silent) {
        if (!silent) {
            if (!confirm('¿Vaciar carrito? Todos los productos serán eliminados.')) return;
        }
        saveCart([]);
    }
    function getCount() { return getCart().reduce(function (acc, i) { return acc + i.cantidad; }, 0); }
    function getTotalUSD() { return getCart().reduce(function (acc, i) { return acc + (i.precio * i.cantidad); }, 0); }
    function getTotalBS() { return window.Currency && typeof window.Currency.usdToBs === 'function' ? window.Currency.usdToBs(getTotalUSD()) : 0; }

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
                return '<div class=\"cart-item\">' + imgHtml + '<div class=\"cart-item-info\"><p class=\"cart-item-name\">' + escapeHtml(i.nombre) + '</p><p class=\"cart-item-price\">' + safeFormatUSD(i.precio) + '</p></div><div class=\"cart-item-qty\"><button onclick=\"Cart.update(\'' + escapeAttr(i.nombre) + "', " + (i.cantidad - 1) + ')\" aria-label=\"Restar\">-</button><span>' + i.cantidad + '</span><button onclick=\"Cart.update(\'' + escapeAttr(i.nombre) + "', " + (i.cantidad + 1) + ')\" aria-label=\"Sumar\">+</button></div></div>';
            }).join('');
        }
        var usdEl = document.getElementById('cart-total-usd');
        var bsEl = document.getElementById('cart-total-bs');
        if (usdEl) usdEl.textContent = safeFormatUSD(getTotalUSD());
        if (bsEl) bsEl.textContent = safeFormatBS(getTotalBS());
    }

    var escapeHtml = window.escapeHtml || function (s) { return String(s || '').replace(/[&<>\"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    var escapeAttr = window.escapeAttr || function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, "\\'").replace(/</g, '&lt;').replace(/>/g, '&gt;'); };

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

        // Validar stock antes de continuar
        var inv = getInventario();
        var itemsSinStock = [];
        var ajustes = [];
        for (var ci = 0; ci < cart.length; ci++) {
            var item = cart[ci];
            var prod = inv.find(function (i) { return i.nombre === item.nombre; });
            var stock = prod ? parseInt(prod.cantidad) || 0 : 0;
            if (stock <= 0) {
                itemsSinStock.push(item.nombre);
            } else if (item.cantidad > stock) {
                ajustes.push(item.nombre + ' (pedido: ' + item.cantidad + ', disponible: ' + stock + ')');
            }
        }
        if (itemsSinStock.length > 0) {
            if (window.Users && typeof window.Users.showToast === 'function') {
                window.Users.showToast('❌ Sin stock: ' + itemsSinStock.join(', '), 'error');
            } else {
                alert('Los siguientes productos no tienen stock:\n- ' + itemsSinStock.join('\n- '));
            }
            return;
        }
        if (ajustes.length > 0) {
            if (window.Users && typeof window.Users.showToast === 'function') {
                window.Users.showToast('⚠️ Stock insuficiente: ' + ajustes.join('; '), 'error');
            } else {
                alert('Stock insuficiente:\n- ' + ajustes.join('\n- '));
            }
            return;
        }

        var user = null;
        try { if (window.Users && typeof window.Users.isLoggedIn === 'function' && window.Users.isLoggedIn()) user = window.Users.getCurrent(); } catch (e) { user = null; }

        var telNormalizado = '';
        if (user && user.tel) {
            telNormalizado = user.tel.replace(/[^0-9]/g, '');
            if (telNormalizado.indexOf('0') === 0) telNormalizado = '58' + telNormalizado.substring(1);
            else if (telNormalizado.indexOf('58') !== 0) telNormalizado = '58' + telNormalizado;
        }

        var pedido = {
            id: 'PED-' + Date.now(),
            fecha: new Date().toISOString().slice(0, 10),
            fechaCompleta: new Date().toISOString(),
            items: cart,
            totalUSD: getTotalUSD(),
            totalBS: getTotalBS(),
            estado: 'pendiente',
            userNombre: user ? user.nombre || '' : '',
            userTel: telNormalizado
        };
        if (user && user.id) {
            pedido.userId = user.id;
            pedido.userEmail = user.email || '';
        }

        // Try Supabase
        if (window.DB && typeof window.DB.saveOrder === 'function') {
            try {
                await window.DB.saveOrder({
                    order_id: pedido.id,
                    user_id: pedido.userId || null,
                    user_email: pedido.userEmail || '',
                    user_name: pedido.userNombre,
                    user_phone: pedido.userTel,
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

        // Build short link to order summary page
        var baseUrl = window.LETTERING_BASE || '';
        var orderLink = (window.location.origin + baseUrl) + '/ver-pedido.html?id=' + encodeURIComponent(pedido.id);
        var msg = '🛍️ *¡Hola! Quiero hacer un pedido*\n\n';
        msg += '📋 *Resumen:*\n';
        msg += '• ' + cart.length + ' producto' + (cart.length !== 1 ? 's' : '') + '\n';
        msg += '• Total: $' + pedido.totalUSD.toFixed(2) + '\n';
        if (pedido.totalBS > 0) msg += '• Bs: Bs. ' + pedido.totalBS.toFixed(2) + '\n';
        msg += '\n🔗 *Ver pedido completo:*\n' + orderLink + '\n\n';
        msg += '_Quedo atento a tu respuesta. Gracias!_ 🙌';

        // Confirm before sending
        var confirmar = await new Promise(function (resolve) {
            var overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.5);backdrop-filter:blur(4px);z-index:200000;display:flex;align-items:center;justify-content:center;';
            var card = document.createElement('div');
            card.style.cssText = 'background:white;border-radius:20px;padding:28px;max-width:440px;width:90%;box-shadow:0 25px 60px rgba(0,0,0,0.2);text-align:center;font-family:sans-serif;';
            var itemsHtml = cart.map(function (it) {
                var n = it.nombre || 'Producto';
                var q = it.cantidad || 1;
                return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:0.85rem;"><span>' + escapeHtml(n) + ' x' + q + '</span><span>$' + ((it.precio || 0) * q).toFixed(2) + '</span></div>';
            }).join('');
            card.innerHTML = '<div style="font-size:2rem;margin-bottom:12px;">🛍️</div>'
                + '<h3 style="margin:0 0 4px;font-size:1.1rem;">Confirmar Pedido</h3>'
                + '<p style="color:#64748b;font-size:0.85rem;margin:0 0 16px;">Se abrirá WhatsApp para enviar el pedido.</p>'
                + '<div style="text-align:left;margin-bottom:12px;">' + itemsHtml + '</div>'
                + '<div style="display:flex;justify-content:space-between;font-weight:700;padding:8px 0;font-size:0.95rem;border-top:2px solid #e2e8f0;">'
                + '<span>Total</span><span>$' + pedido.totalUSD.toFixed(2) + '</span></div>'
                + '<div style="display:flex;gap:10px;margin-top:20px;">'
                + '<button id="checkout-confirm-yes" style="flex:1;padding:12px;border:none;border-radius:12px;background:#22c55e;color:white;font-weight:700;font-size:0.9rem;cursor:pointer;">✅ Enviar</button>'
                + '<button id="checkout-confirm-no" style="flex:1;padding:12px;border:2px solid #e2e8f0;border-radius:12px;background:white;color:#64748b;font-weight:600;font-size:0.9rem;cursor:pointer;">Cancelar</button>'
                + '</div>';
            overlay.appendChild(card);
            document.body.appendChild(overlay);
            document.getElementById('checkout-confirm-yes').onclick = function () { overlay.remove(); resolve(true); };
            document.getElementById('checkout-confirm-no').onclick = function () { overlay.remove(); resolve(false); };
            overlay.onclick = function (e) { if (e.target === overlay) { overlay.remove(); resolve(false); } };
        });
        if (!confirmar) {
            if (window.Users && typeof window.Users.showToast === 'function') {
                window.Users.showToast('Pedido cancelado.', 'info');
            }
            return;
        }

        closeCart();

        // Get WhatsApp number from contact info
        var waNum = '';
        try {
            var ci = JSON.parse(localStorage.getItem('contactoInfo') || '{}');
            if (ci.whatsapp) waNum = ci.whatsapp;
        } catch (e) {}

        if (!waNum) {
            // No WhatsApp configured - order is saved but can't message
            if (window.Users && typeof window.Users.showToast === 'function') {
                window.Users.showToast('✅ Pedido guardado. El administrador te contactará pronto.', 'success');
            } else {
                alert('✅ Pedido guardado. El administrador te contactará pronto.');
            }
            return;
        }

        // Open WhatsApp BEFORE clearing cart
        var waWindow = window.open('https://wa.me/' + encodeURIComponent(waNum.replace(/[^0-9]/g, '')) + '?text=' + encodeURIComponent(msg), '_blank');

        // Only clear cart if WhatsApp actually opened (not blocked)
        if (waWindow && !waWindow.closed) {
            clearCart(true);
        } else {
            // If popup blocked, keep cart but alert user
            if (window.Users && typeof window.Users.showToast === 'function') {
                window.Users.showToast('⚠️ Permití ventanas emergentes para que WhatsApp se abra. Tu pedido ya está guardado.', 'warning');
            } else {
                alert('⚠️ Permití ventanas emergentes (popups) para abrir WhatsApp. Tu pedido ya está guardado en el sistema.');
            }
        }

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
