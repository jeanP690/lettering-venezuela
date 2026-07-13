(function () {
    'use strict';

    var _inactivityTimer;

    window.initAdminUsers = function initAdminUsers() {
        var users = JSON.parse(localStorage.getItem('adminUsers') || '[]');
        if (!users.length) {
            users = [{ usuario: 'admin', pass: '__PLAINTEXT__admin123', rol: 'admin', creado: new Date().toISOString() }];
            localStorage.setItem('adminUsers', JSON.stringify(users));
        }
        return users;
    };

    window.checkLoginRateLimit = function checkLoginRateLimit() {
        var attempts = JSON.parse(sessionStorage.getItem('dashLoginAttempts') || '[]');
        var now = Date.now();
        attempts = attempts.filter(function (t) { return now - t < 60000; });
        if (attempts.length >= 5) {
            var wait = Math.ceil((attempts[0] + 60000 - now) / 1000);
            return { blocked: true, wait: wait };
        }
        return { blocked: false, attempts: attempts };
    };

    window.recordLoginAttempt = function recordLoginAttempt() {
        var attempts = JSON.parse(sessionStorage.getItem('dashLoginAttempts') || '[]');
        attempts.push(Date.now());
        if (attempts.length > 50) attempts = attempts.slice(-50);
        sessionStorage.setItem('dashLoginAttempts', JSON.stringify(attempts));
    };

    window.resetInactivityTimer = function resetInactivityTimer() {
        clearTimeout(_inactivityTimer);
        _inactivityTimer = setTimeout(function () {
            if (localStorage.getItem('dash_authenticated') === 'true') {
                logoutDashboard();
            }
        }, 30 * 60 * 1000);
    };

    window.logoutDashboard = function logoutDashboard() {
        clearTimeout(_inactivityTimer);
        var user = localStorage.getItem('dash_user') || 'admin';
        if (window.registrarActividad) registrarActividad('Cierre de sesión', 'Usuario: ' + user);
        localStorage.removeItem('dash_authenticated');
        localStorage.removeItem('dash_user');
        localStorage.removeItem('dash_user_rol');
        location.reload();
    };

    // Auth gate
    (function () {
        if (localStorage.getItem('dash_authenticated') === 'true') { resetInactivityTimer(); return; }
        initAdminUsers();
        var overlay = document.createElement('div');
        overlay.id = 'dash-auth-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:#0f172a;z-index:999999;display:flex;align-items:center;justify-content:center;';
        var card = document.createElement('div');
        card.style.cssText = 'background:white;border-radius:24px;padding:40px;max-width:400px;width:90%;box-shadow:0 25px 60px rgba(0,0,0,0.3);text-align:center;font-family:\'Plus Jakarta Sans\',sans-serif;';
        card.innerHTML = '<div style="font-size:3rem;margin-bottom:8px;">🔒</div><h2 style="margin:0 0 12px;">Dashboard Protegido</h2><p style="color:#64748b;margin:0 0 24px;font-size:0.9rem;">Ingresa tus credenciales.</p><input type="text" id="dash-login-user" placeholder="Usuario" style="width:100%;padding:14px;border:2px solid #e2e8f0;border-radius:12px;font-size:1rem;margin-bottom:12px;box-sizing:border-box;font-family:inherit;"><input type="password" id="dash-login-pass" placeholder="Contraseña" style="width:100%;padding:14px;border:2px solid #e2e8f0;border-radius:12px;font-size:1rem;margin-bottom:12px;box-sizing:border-box;font-family:inherit;"><p id="dash-auth-error" style="color:#ef4444;font-size:0.85rem;margin:0 0 12px;display:none;"></p><button id="dash-auth-login-btn" style="width:100%;padding:14px;border:none;border-radius:12px;background:#6366f1;color:white;font-weight:700;font-size:1rem;cursor:pointer;font-family:inherit;">🔓 Ingresar</button>';
        overlay.appendChild(card);
        document.body.appendChild(overlay);
        document.getElementById('dash-login-user').addEventListener('keydown', function (e) { if (e.key === 'Enter') document.getElementById('dash-login-pass').focus(); });
        document.getElementById('dash-login-pass').addEventListener('keydown', function (e) { if (e.key === 'Enter') document.getElementById('dash-auth-login-btn').click(); });
        document.getElementById('dash-auth-login-btn').onclick = async function () {
            var u = document.getElementById('dash-login-user').value.trim();
            var p = document.getElementById('dash-login-pass').value;
            var err = document.getElementById('dash-auth-error');
            var rateLimit = checkLoginRateLimit();
            if (rateLimit.blocked) {
                err.textContent = '⚠️ Demasiados intentos. Espera ' + rateLimit.wait + ' segundos.';
                err.style.display = 'block';
                return;
            }
            var users = JSON.parse(localStorage.getItem('adminUsers') || '[]');
            var found = null;
            var inputHash = await sha256(p);
            for (var _i = 0; _i < users.length; _i++) {
                var x = users[_i];
                if (x.usuario !== u) continue;
                var sp = x.pass || '';
                var match = false;
                if (isSha256Hash(sp)) {
                    match = (sp === inputHash);
                } else if (sp.indexOf('__PLAINTEXT__') === 0) {
                    match = (sp.replace('__PLAINTEXT__', '') === p);
                } else {
                    try { match = (atob(sp) === p); } catch (e) { }
                }
                if (match) {
                    found = x;
                    if (!isSha256Hash(sp)) {
                        x.pass = inputHash;
                        localStorage.setItem('adminUsers', JSON.stringify(users));
                    }
                    break;
                }
            }
            if (found) {
                err.style.display = 'none';
                localStorage.setItem('dash_authenticated', 'true');
                localStorage.setItem('dash_user', found.usuario);
                localStorage.setItem('dash_user_rol', found.rol);
                overlay.remove();
                if (window.registrarActividad) registrarActividad('Inicio de sesión', 'Usuario: ' + found.usuario);
                resetInactivityTimer();
            } else {
                recordLoginAttempt();
                err.textContent = 'Usuario o contraseña incorrectos';
                err.style.display = 'block';
            }
        };
    })();

    document.addEventListener('click', resetInactivityTimer);
    document.addEventListener('keydown', resetInactivityTimer);
    document.addEventListener('mousemove', resetInactivityTimer);
})();
