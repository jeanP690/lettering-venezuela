// GRÁFICOS DEL DASHBOARD
(function () {
    'use strict';

    window.renderizarGraficos = function renderizarGraficos() {
        renderizarGraficoVentasMensuales();
        renderizarGraficoTopProductos();
    };

    function renderizarGraficoVentasMensuales() {
        var canvas = document.getElementById('chart-ventas-mensuales');
        if (!canvas || canvas.style.display === 'none') return;
        var dpr = window.devicePixelRatio || 1;
        var ctx = canvas.getContext('2d');
        var rect = canvas.parentElement.getBoundingClientRect();
        var w = rect.width || 400;
        canvas.width = w * dpr;
        canvas.height = 280 * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = '280px';
        ctx.scale(dpr, dpr);
        var h = 280;

        var ventas = clientes || [];
        var meses = {};
        ventas.forEach(function (v) {
            var f = v.fechaRegistro || v.fecha;
            if (!f) return;
            var parts = f.split('-');
            if (parts.length < 2) return;
            var key = parts[0] + '-' + parts[1];
            meses[key] = (meses[key] || 0) + parseFloat(v.total || 0);
        });
        var labels = Object.keys(meses).sort();
        var valores = labels.map(function (k) { return meses[k]; });
        if (!labels.length) { ctx.fillStyle = '#94a3b8'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Sin datos de ventas', w / 2, h / 2); return; }
        if (labels.length > 12) { labels = labels.slice(-12); valores = valores.slice(-12); }

        var pad = { top: 28, bottom: 36, left: 55, right: 20 };
        var gw = w - pad.left - pad.right;
        var gh = h - pad.top - pad.bottom;
        var maxVal = Math.max.apply(null, valores) || 1;

        ctx.clearRect(0, 0, w, h);

        ctx.fillStyle = '#1e293b'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left';
        ctx.fillText('📈 Ventas por Mes', pad.left, 20);

        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1;
        for (var i = 0; i <= 4; i++) {
            var y = pad.top + gh - (gh * i / 4);
            ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
            ctx.fillStyle = '#94a3b8'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
            ctx.fillText('$' + (maxVal * i / 4).toFixed(0), pad.left - 8, y + 3);
        }

        var barW = Math.min(36, gw / labels.length * 0.6);
        var gap = (gw - labels.length * barW) / (labels.length + 1);
        var monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        labels.forEach(function (l, i) {
            var x = pad.left + gap + i * (barW + gap);
            var barH = (valores[i] / maxVal) * gh;

            var grad = ctx.createLinearGradient(x, pad.top + gh - barH, x, pad.top + gh);
            grad.addColorStop(0, '#6366f1');
            grad.addColorStop(0.5, '#8b5cf6');
            grad.addColorStop(1, '#a78bfa');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(x, pad.top + gh - barH, barW, barH, [6, 6, 0, 0]) : ctx.rect(x, pad.top + gh - barH, barW, barH);
            ctx.fill();

            ctx.fillStyle = '#1e293b'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('$' + valores[i].toFixed(0), x + barW / 2, pad.top + gh - barH - 6);

            ctx.fillStyle = '#64748b'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
            var parts2 = l.split('-');
            var label = monthNames[parseInt(parts2[1]) - 1] + ' ' + parts2[0].slice(2);
            ctx.fillText(label, x + barW / 2, h - pad.bottom + 16);
        });

        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pad.left, h - pad.bottom + 6); ctx.lineTo(w - pad.right, h - pad.bottom + 6); ctx.stroke();
    }

    function renderizarGraficoTopProductos() {
        var canvas = document.getElementById('chart-top-productos');
        if (!canvas || canvas.style.display === 'none') return;
        var dpr = window.devicePixelRatio || 1;
        var ctx = canvas.getContext('2d');
        var rect = canvas.parentElement.getBoundingClientRect();
        var w = rect.width || 400;
        canvas.width = w * dpr;
        canvas.height = 280 * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = '280px';
        ctx.scale(dpr, dpr);
        var h = 280;

        var ventas = clientes || [];
        var prodCount = {};
        ventas.forEach(function (v) {
            if (parseFloat(v.total || 0) - parseFloat(v.pagado || 0) > 0) return;
            var prods = v.productos || (v.productoVendido ? [v.productoVendido] : []);
            var cants = v.cantidades || [];
            prods.forEach(function (p, i) {
                if (!p) return;
                var n = typeof p === 'string' ? p : (p.nombre || p);
                prodCount[n] = (prodCount[n] || 0) + parseInt(cants[i] || 1);
            });
        });
        var sorted = Object.keys(prodCount).sort(function (a, b) { return prodCount[b] - prodCount[a]; });
        var top = sorted.slice(0, 5);
        var valores = top.map(function (k) { return prodCount[k]; });
        if (!top.length) { ctx.fillStyle = '#94a3b8'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Sin datos de ventas', w / 2, h / 2); return; }

        ctx.clearRect(0, 0, w, h);

        ctx.fillStyle = '#1e293b'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left';
        ctx.fillText('🏆 Top 5 Productos Más Vendidos', 20, 20);

        var pad2 = { top: 36, bottom: 20, left: 20, right: 130 };
        var gw2 = w - pad2.left - pad2.right;
        var gh2 = h - pad2.top - pad2.bottom;
        var maxVal = Math.max.apply(null, valores) || 1;
        var barH = Math.min(32, (gh2 - 8 * (top.length - 1)) / top.length);
        var maxBarW = gw2 * 0.65;

        var colors = ['#6366f1', '#3b82f6', '#f59e0b', '#10b981', '#ef4444'];
        var totalUnids = valores.reduce(function (a, b) { return a + b; }, 0);

        top.forEach(function (p, i) {
            var y = pad2.top + i * (barH + 8);
            var barW = Math.min((valores[i] / maxVal) * gw2, maxBarW);
            if (barW < 20 && valores[i] > 0) barW = 20;

            ctx.fillStyle = 'rgba(0,0,0,0.04)';
            ctx.beginPath(); ctx.roundRect ? ctx.roundRect(pad2.left + 2, y + 2, barW, barH, [0, 6, 6, 0]) : ctx.rect(pad2.left + 2, y + 2, barW, barH); ctx.fill();

            ctx.fillStyle = colors[i % colors.length];
            ctx.beginPath(); ctx.roundRect ? ctx.roundRect(pad2.left, y, barW, barH, [0, 6, 6, 0]) : ctx.rect(pad2.left, y, barW, barH); ctx.fill();

            ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
            if (barW > 40) ctx.fillText(valores[i] + ' uds', pad2.left + 8, y + barH / 2 + 4);

            ctx.fillStyle = '#1e293b'; ctx.font = '11px sans-serif'; ctx.textAlign = 'right';
            var label2 = top[i].length > 20 ? top[i].slice(0, 18) + '…' : top[i];
            ctx.fillText(label2, w - pad2.right + 8, y + barH / 2 + 4);

            if (barW <= 40) {
                ctx.fillStyle = '#64748b'; ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
                ctx.fillText(valores[i] + ' uds', pad2.left + barW + 6, y + barH / 2 + 3);
            }
        });

        ctx.fillStyle = '#f1f5f9';
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(pad2.left, h - pad2.bottom - 22, 120, 22, [11, 11, 11, 11]) : ctx.rect(pad2.left, h - pad2.bottom - 22, 120, 22); ctx.fill();
        ctx.fillStyle = '#475569'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('Total: ' + totalUnids + ' uds vendidas', pad2.left + 60, h - pad2.bottom - 6);
    }
})();
