(function () {
    'use strict';

    window.sha256 = async function sha256(str) {
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            var enc = new TextEncoder().encode(str);
            var hash = await crypto.subtle.digest('SHA-256', enc);
            return Array.from(new Uint8Array(hash)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
        }
        var hash = 0, i, chr;
        if (str.length === 0) return '0';
        for (i = 0; i < str.length; i++) {
            chr = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0;
        }
        return Math.abs(hash).toString(16);
    };

    window.isSha256Hash = function isSha256Hash(s) { return /^[0-9a-f]{64}$/i.test(s || ''); };

    window.escapeHtml = function escapeHtml(str) {
        return String(str == null ? '' : str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    };

    window.escapeJsString = function escapeJsString(str) {
        return String(str == null ? '' : str).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };

    window.mostrarToastNotificacion = function mostrarToastNotificacion(mensaje, tipo) {
        tipo = tipo || 'success';
        var container = document.getElementById('toast-container-global');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container-global';
            container.style.cssText = 'position:fixed;top:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:12px;';
            document.body.appendChild(container);
        }
        var toast = document.createElement('div');
        toast.style.cssText = 'background:' + (tipo === 'success' ? '#22c55e' : '#ef4444') + ';color:white;padding:16px 24px;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.15);font-family:\'Plus Jakarta Sans\',sans-serif;font-weight:600;font-size:0.95rem;display:flex;align-items:center;gap:10px;opacity:0;transform:translateY(-20px);transition:all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);';
        toast.innerHTML = '<span>' + (tipo === 'success' ? '✔️' : '❌') + '</span> <span>' + mensaje + '</span>';
        container.appendChild(toast);
        setTimeout(function () { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; }, 50);
        setTimeout(function () {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(function () { toast.remove(); }, 400);
        }, 3500);
    };

    window.mostrarConfirmacion = function mostrarConfirmacion(mensaje) {
        return new Promise(function (resolve) {
            var overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.5);backdrop-filter:blur(4px);z-index:200000;display:flex;align-items:center;justify-content:center;';
            var card = document.createElement('div');
            card.style.cssText = 'background:white;border-radius:20px;padding:32px;max-width:420px;width:90%;box-shadow:0 25px 60px rgba(0,0,0,0.2);text-align:center;';
            card.innerHTML = '<div style="font-size:2.5rem;margin-bottom:12px;">⚠️</div>'
                + '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:1rem;font-weight:600;color:#1e293b;margin-bottom:24px;line-height:1.5;">' + mensaje + '</div>'
                + '<div style="display:flex;gap:12px;justify-content:center;">'
                + '<button id="btn-confirm-si" style="padding:12px 28px;border:none;border-radius:12px;background:#ef4444;color:white;font-weight:700;font-size:0.9rem;cursor:pointer;font-family:\'Plus Jakarta Sans\',sans-serif;">Sí, continuar</button>'
                + '<button id="btn-confirm-no" style="padding:12px 28px;border:2px solid #e2e8f0;border-radius:12px;background:white;color:#64748b;font-weight:600;font-size:0.9rem;cursor:pointer;font-family:\'Plus Jakarta Sans\',sans-serif;">Cancelar</button>'
                + '</div>';
            overlay.appendChild(card);
            document.body.appendChild(overlay);
            document.getElementById('btn-confirm-si').onclick = function () { overlay.remove(); resolve(true); };
            document.getElementById('btn-confirm-no').onclick = function () { overlay.remove(); resolve(false); };
            overlay.onclick = function (e) { if (e.target === overlay) { overlay.remove(); resolve(false); } };
        });
    };
})();
