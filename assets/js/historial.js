(function () {
    'use strict';

    async function getPedidos() {
        try {
            if (window.DB && typeof window.DB.getOrders === 'function') {
                var orders = await window.DB.getOrders();
                if (orders && orders.length > 0) {
                    return orders.map(function (o) {
                        var items = [];
                        try { items = JSON.parse(o.items_json || '[]'); } catch (e) {}
                        return {
                            id: o.order_id || o.id,
                            userEmail: o.user_email,
                            userPhone: o.user_phone,
                            userName: o.user_name,
                            items: items,
                            totalUSD: parseFloat(o.total_usd) || 0,
                            totalBS: parseFloat(o.total_bs) || 0,
                            estado: o.status || 'pendiente',
                            fechaCompleta: o.created_at || o.fecha || null
                        };
                    });
                }
            }
        } catch (e) { /* fall through */ }

        try { return JSON.parse(localStorage.getItem('pedidosPendientes')) || []; }
        catch (e) { return []; }
    }

    function getCurrentUser() {
        try {
            if (window.Users && typeof window.Users.isLoggedIn === 'function' && window.Users.isLoggedIn()) {
                return window.Users.getCurrent();
            }
        } catch (e) { return null; }
        return null;
    }

    function formatDate(iso) {
        if (!iso) return '\u2014';
        try {
            return new Date(iso).toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch (e) { return iso; }
    }

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function renderLoggedOut(container) {
        container.innerHTML = ''
            + '<div class="historial-empty">'
            +     '<div class="empty-state-icon">\uD83D\uDD12</div>'
            +     '<h3>Inicia sesi\u00F3n para ver tu historial</h3>'
            +     '<p>Necesitas tener una cuenta para revisar el estado de tus pedidos.</p>'
            +     '<button class="historial-cta" onclick="Users.openModal(\'login\')">Iniciar sesi\u00F3n</button>'
            +     '<a href="../productos/" class="historial-cta secondary">Ver productos</a>'
            + '</div>';
    }

    function renderEmpty(container) {
        container.innerHTML = ''
            + '<div class="historial-empty">'
            +     '<div class="empty-state-icon">\uD83D\uDECD\uFE0F</div>'
            +     '<h3>A\u00FAn no tienes compras</h3>'
            +     '<p>\u00A1Explora nuestro cat\u00E1logo y realiza tu primer pedido!</p>'
            +     '<a href="../productos/" class="historial-cta">Ver productos</a>'
            + '</div>';
    }

    function renderPedidos(container, pedidos) {
        var STATUS = {
            pendiente: { label: '\u23F3 Pendiente', cls: 'status-pending' },
            aprobado: { label: '\u2705 Aprobado', cls: 'status-approved' },
            rechazado: { label: '\u2715 Rechazado', cls: 'status-rejected' }
        };

        container.innerHTML = pedidos.map(function (p) {
            var s = STATUS[p.estado || 'pendiente'] || STATUS.pendiente;
            var fechaStr = p.fechaCompleta ? formatDate(p.fechaCompleta) : (p.fecha || '\u2014');

            var itemsHtml = (p.items || []).map(function (it) {
                var sub = (it.precio || 0) * (it.cantidad || 1);
                var imgHtml = it.foto
                    ? '<img class="historial-item-img" src="' + escapeHtml(it.foto) + '" alt="' + escapeHtml(it.nombre) + '">'
                    : '<div class="historial-item-img placeholder">\uD83D\uDCE6</div>';
                return ''
                    + '<div class="historial-item">'
                    +     imgHtml
                    +     '<div>'
                    +         '<p class="historial-item-name">' + escapeHtml(it.nombre) + '</p>'
                    +         '<p class="historial-item-qty">Cantidad: ' + (it.cantidad || 1) + '</p>'
                    +     '</div>'
                    +     '<span class="historial-item-price">' + window.Currency.formatUSD(sub) + '</span>'
                    + '</div>';
            }).join('');

            return ''
                + '<div class="historial-card">'
                +     '<div class="historial-card-head">'
                +         '<div>'
                +             '<span class="historial-card-id">#' + escapeHtml(p.id || '\u2014') + '</span>'
                +             ' '
                +             '<span class="historial-card-date">' + fechaStr + '</span>'
                +         '</div>'
                +         '<span class="historial-card-status ' + s.cls + '">' + s.label + '</span>'
                +     '</div>'
                +     '<div class="historial-items">' + itemsHtml + '</div>'
                +     '<div class="historial-card-foot">'
                +         '<span>Total</span>'
                +         '<span class="historial-card-total">$'
                +             (p.totalUSD || 0).toFixed(2)
                +             ' / Bs. ' + (p.totalBS || 0).toFixed(2)
                +         '</span>'
                +     '</div>'
                + '</div>';
        }).join('');
    }

    async function render() {
        var container = document.getElementById('historial-content');
        if (!container) return;

        var user = getCurrentUser();
        if (!user) {
            renderLoggedOut(container);
            return;
        }

        var pedidos = (await getPedidos()).filter(function (p) {
            return p.userEmail && p.userEmail === user.email;
        });

        if (pedidos.length === 0) {
            renderEmpty(container);
            return;
        }

        pedidos.sort(function (a, b) {
            return (b.fechaCompleta || b.fecha || '').localeCompare(a.fechaCompleta || a.fecha || '');
        });

        renderPedidos(container, pedidos);
    }

    document.addEventListener('DOMContentLoaded', render);
    document.addEventListener('carritoCambiado', render);
})();
