(function () {
    'use strict';

    var KEY_USERS = 'usuariosRegistrados';
    var KEY_SESSION = 'usuarioActual';
    var _supabaseReady = false;
    var _sessionUser = null;

    async function sha256(str) {
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
    }

    function isSha256Hash(s) { return /^[0-9a-f]{64}$/i.test(s || ''); }

    async function initSupabase() {
        if (window.Supabase && typeof window.Supabase.getClient === 'function') {
            try {
                var session = await window.Supabase.ensureSession();
                if (session) {
                    var client = window.Supabase.getClient();
                    var { data: profile } = await client.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
                    if (profile) {
                        _sessionUser = { id: profile.id, nombre: profile.name, email: session.user.email, tel: profile.phone };
                    }
                }
                _supabaseReady = true;
            } catch (e) { _supabaseReady = false; }
        }
    }

    function loadUsers() {
        try { return JSON.parse(localStorage.getItem(KEY_USERS)) || []; } catch (e) { return []; }
    }

    function saveUsers(arr) {
        localStorage.setItem(KEY_USERS, JSON.stringify(arr));
    }

    function genId() {
        return 'u_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function setSession(user) {
        if (user) {
            localStorage.setItem(KEY_SESSION, JSON.stringify({ id: user.id, nombre: user.nombre, email: user.email }));
        } else {
            localStorage.removeItem(KEY_SESSION);
        }
        renderHeaderButton();
    }

    function getSession() {
        try { return JSON.parse(localStorage.getItem(KEY_SESSION)) || null; } catch (e) { return null; }
    }

    function getCurrentLocal() {
        var s = getSession();
        if (!s) return null;
        var users = loadUsers();
        return users.filter(function (u) { return u.id === s.id; })[0] || null;
    }

    function getCurrent() {
        if (_supabaseReady && _sessionUser) return _sessionUser;
        return getCurrentLocal();
    }

    function isLoggedIn() {
        if (_supabaseReady && _sessionUser) return true;
        return !!getSession();
    }

    async function register(data) {
        var nombre = (data.nombre || '').trim();
        var email = (data.email || '').trim().toLowerCase();
        var tel = (data.tel || '').trim();
        var password = data.password || '';
        var confirm = data.confirm || '';

        if (!nombre) return { ok: false, error: 'El nombre es obligatorio.' };
        if (!email || !isValidEmail(email)) return { ok: false, error: 'Email invalido.' };
        if (!tel) return { ok: false, error: 'El telefono es obligatorio.' };
        if (password.length < 6) return { ok: false, error: 'La contrasena debe tener al menos 6 caracteres.' };
        if (password !== confirm) return { ok: false, error: 'Las contrasenas no coinciden.' };

        if (window.Supabase && typeof window.Supabase.getClient === 'function') {
            var client = window.Supabase.getClient();
            if (client) {
                var signUpRes = await client.auth.signUp({ email: email, password: password, options: { data: { name: nombre, phone: tel } } });
                if (signUpRes.error) {
                    if (signUpRes.error.message.includes('already')) return { ok: false, error: 'Ya existe una cuenta con ese email.' };
                    return { ok: false, error: signUpRes.error.message };
                }
                if (signUpRes.data && signUpRes.data.user) {
                    await client.from('profiles').insert({ id: signUpRes.data.user.id, name: nombre, phone: tel });
                    _sessionUser = { id: signUpRes.data.user.id, nombre: nombre, email: email, tel: tel };
                    setSession({ id: signUpRes.data.user.id, nombre: nombre, email: email });
                    _supabaseReady = true;
                    return { ok: true, user: _sessionUser };
                }
            }
        }

        var users = loadUsers();
        if (users.some(function (u) { return u.email === email; })) return { ok: false, error: 'Ya existe una cuenta con ese email.' };
        var user = { id: genId(), nombre: nombre, email: email, tel: tel, password: await sha256(password), fechaRegistro: new Date().toISOString() };
        users.push(user);
        saveUsers(users);
        setSession(user);
        return { ok: true, user: user };
    }

    async function login(email, password) {
        email = (email || '').trim().toLowerCase();
        password = password || '';

        if (window.Supabase && typeof window.Supabase.getClient === 'function') {
            var client = window.Supabase.getClient();
            if (client) {
                var signInRes = await client.auth.signInWithPassword({ email: email, password: password });
                if (!signInRes.error && signInRes.data && signInRes.data.user) {
                    var { data: profile } = await client.from('profiles').select('*').eq('id', signInRes.data.user.id).maybeSingle();
                    var name = profile ? profile.name : (signInRes.data.user.user_metadata ? signInRes.data.user.user_metadata.name || email.split('@')[0] : email.split('@')[0]);
                    var phone = profile ? profile.phone : (signInRes.data.user.user_metadata ? signInRes.data.user.user_metadata.phone || '' : '');
                    _sessionUser = { id: signInRes.data.user.id, nombre: name, email: email, tel: phone };
                    setSession({ id: signInRes.data.user.id, nombre: name, email: email });
                    _supabaseReady = true;
                    return { ok: true, user: _sessionUser };
                }
            }
        }

        var users = loadUsers();
        var match = null;
        var inputHash = await sha256(password);
        for (var i = 0; i < users.length; i++) {
            var u = users[i];
            if (u.email !== email) continue;
            var stored = u.password || '';
            if (isSha256Hash(stored)) {
                if (stored === inputHash) { match = u; break; }
            } else {
                try { if (atob(stored) === password) { match = u; u.password = inputHash; break; } } catch (e) { }
            }
        }
        if (!match) return { ok: false, error: 'Email o contrasena incorrectos.' };
        saveUsers(users);
        setSession(match);
        return { ok: true, user: match };
    }

    async function logout() {
        if (window.Supabase && typeof window.Supabase.getClient === 'function') {
            var client = window.Supabase.getClient();
            if (client) await client.auth.signOut();
        }
        _sessionUser = null;
        _supabaseReady = false;
        setSession(null);
        return { ok: true };
    }

    function deleteUser(id) {
        var users = loadUsers().filter(function (u) { return u.id !== id; });
        saveUsers(users);
        var s = getSession();
        if (s && s.id === id) setSession(null);
        return { ok: true };
    }

    function getOrdersForUser() {
        try { return JSON.parse(localStorage.getItem('pedidosPendientes')) || []; } catch (e) { return []; }
    }

    var modalHTML = ''
        + '<div class="user-overlay" id="user-overlay" onclick="Users.closeModal()"></div>'
        + '<aside class="user-modal" id="user-modal" role="dialog" aria-modal="true" aria-label="Cuenta">'
        +     '<div class="user-modal-header">'
        +         '<h3 id="user-modal-title"> Crear cuenta</h3>'
        +         '<button class="user-modal-close" onclick="Users.closeModal()" aria-label="Cerrar">x</button>'
        +     '</div>'
        +     '<div class="user-success-banner" id="user-success-banner">'
        +         '<div class="user-success-icon" id="user-success-icon">V</div>'
        +         '<div class="user-success-text">'
        +             '<h4 id="user-success-title">Bienvenido!</h4>'
        +             '<p id="user-success-msg">Tu cuenta fue creada con exito.</p>'
        +         '</div>'
        +     '</div>'
        +     '<form class="user-form" id="user-form-register" onsubmit="return Users.handleRegister(event)">'
        +         '<p class="user-form-intro">Registrate para una experiencia mas rapida y personalizada.</p>'
        +         '<div class="user-field"><label for="reg-nombre">Nombre completo</label><input type="text" id="reg-nombre" name="nombre" required minlength="2" autocomplete="name" placeholder="Tu nombre"></div>'
        +         '<div class="user-field"><label for="reg-email">Email</label><input type="email" id="reg-email" name="email" required autocomplete="email" placeholder="tu@correo.com"></div>'
        +         '<div class="user-field"><label for="reg-tel">Telefono</label><input type="tel" id="reg-tel" name="tel" required autocomplete="tel" placeholder="+58 412 1234567"></div>'
        +         '<div class="user-field-row">'
        +             '<div class="user-field"><label for="reg-password">Contrasena</label><input type="password" id="reg-password" name="password" required minlength="6" autocomplete="new-password" placeholder="Minimo 6 caracteres"></div>'
        +             '<div class="user-field"><label for="reg-confirm">Confirmar</label><input type="password" id="reg-confirm" name="confirm" required minlength="6" autocomplete="new-password" placeholder="Repite la contrasena"></div>'
        +         '</div>'
        +         '<div class="user-form-error" id="reg-error"></div>'
        +         '<button type="submit" class="user-btn-primary">Crear cuenta</button>'
        +         '<p class="user-switch">Ya tienes cuenta? <a href="#" onclick="Users.switchTo(\'login\'); return false;">Inicia sesion</a></p>'
        +     '</form>'
        +     '<form class="user-form" id="user-form-login" style="display:none;" onsubmit="return Users.handleLogin(event)">'
        +         '<p class="user-form-intro">Ingresa con tu email y contrasena.</p>'
        +         '<div class="user-field"><label for="login-email">Email</label><input type="email" id="login-email" name="email" required autocomplete="email" placeholder="tu@correo.com"></div>'
        +         '<div class="user-field"><label for="login-password">Contrasena</label><input type="password" id="login-password" name="password" required autocomplete="current-password" placeholder="Tu contrasena"></div>'
        +         '<div class="user-form-error" id="login-error"></div>'
        +         '<button type="submit" class="user-btn-primary">Iniciar sesion</button>'
        +         '<p class="user-switch">No tienes cuenta? <a href="#" onclick="Users.switchTo(\'register\'); return false;">Registrate</a></p>'
        +     '</form>'
        +     '<div class="user-loggedin" id="user-loggedin" style="display:none;">'
        +         '<div class="user-avatar" id="user-avatar-letter">L</div><h4 id="user-loggedin-name">Hola!</h4>'
        +         '<p class="user-loggedin-email" id="user-loggedin-email"></p>'
        +         '<div class="user-loggedin-info" id="user-loggedin-info"></div>'
        +         '<div class="user-history"><a href="" class="user-history-title-link" id="user-history-title-link"><h5 class="user-history-title"> Mis Compras</h5></a><div class="user-history-list" id="user-history-list"></div></div>'
        +         '<button class="user-btn-primary user-btn-danger" onclick="Users.logoutAndClose()"><span></span> Cerrar sesion</button>'
        +     '</div>'
        + '</aside>'
        + '<div class="user-toast-container" id="user-toast-container"></div>';

    function injectModal() {
        if (document.getElementById('user-modal')) return;
        var c = document.createElement('div');
        c.innerHTML = modalHTML;
        document.body.appendChild(c);
        var link = document.getElementById('user-history-title-link');
        if (link) link.href = (window.LETTERING_BASE || '') + '/historial/';
    }

    function openModal(mode) {
        injectModal();
        var session = getSession();
        if (session) showLoggedIn();
        else { mode = mode || 'register'; switchTo(mode); }
        document.getElementById('user-overlay').classList.add('open');
        document.getElementById('user-modal').classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        var overlay = document.getElementById('user-overlay');
        var modal = document.getElementById('user-modal');
        if (overlay) overlay.classList.remove('open');
        if (modal) modal.classList.remove('open');
        document.body.style.overflow = '';
        clearErrors();
    }

    function switchTo(mode) {
        var reg = document.getElementById('user-form-register');
        var log = document.getElementById('user-form-login');
        var logged = document.getElementById('user-loggedin');
        var title = document.getElementById('user-modal-title');
        if (!reg || !log) return;
        clearErrors();
        if (mode === 'login') {
            reg.style.display = 'none'; log.style.display = '';
            if (logged) logged.style.display = 'none';
            if (title) title.innerHTML = ' Iniciar sesion';
        } else {
            reg.style.display = ''; log.style.display = 'none';
            if (logged) logged.style.display = 'none';
            if (title) title.innerHTML = ' Crear cuenta';
        }
    }

    function showLoggedIn() {
        var session = getSession();
        if (!session) return;
        var reg = document.getElementById('user-form-register');
        var log = document.getElementById('user-form-login');
        var logged = document.getElementById('user-loggedin');
        var title = document.getElementById('user-modal-title');
        var nameEl = document.getElementById('user-loggedin-name');
        var emailEl = document.getElementById('user-loggedin-email');
        var avatarEl = document.getElementById('user-avatar-letter');
        var infoEl = document.getElementById('user-loggedin-info');
        if (reg) reg.style.display = 'none';
        if (log) log.style.display = 'none';
        if (logged) logged.style.display = '';
        if (title) title.innerHTML = ' Sesion activa';
        if (nameEl) nameEl.textContent = 'Hola, ' + session.nombre + '!';
        if (emailEl) emailEl.textContent = session.email;
        if (avatarEl) avatarEl.textContent = (session.nombre || 'L').charAt(0).toUpperCase();
        if (infoEl) {
            var user = getCurrent();
            if (user && user.tel) infoEl.innerHTML = '<div class="user-loggedin-row"><span></span><span>' + escapeHtml(user.tel) + '</span></div>';
        }
        renderHistory();
    }

    function renderHistory() {
        var list = document.getElementById('user-history-list');
        if (!list) return;
        var session = getSession();
        if (!session) { list.innerHTML = '<p class="user-history-empty">Inicia sesion para ver tu historial.</p>'; return; }
        var pedidos = getOrdersForUser().filter(function (p) { return p.userEmail && p.userEmail === session.email; });
        if (pedidos.length === 0) {
            list.innerHTML = '<p class="user-history-empty"> Aun no tienes compras.<br>Explora nuestros productos y realiza tu primer pedido!</p>';
            return;
        }
        pedidos.sort(function (a, b) { return (b.fechaCompleta || '').localeCompare(a.fechaCompleta || ''); });
        var STATUS = { pendiente: { label: ' Pendiente', cls: 'status-pending' }, aprobado: { label: ' Aprobado', cls: 'status-approved' }, rechazado: { label: ' Rechazado', cls: 'status-rejected' } };
        var recientes = pedidos.slice(0, 3);
        list.innerHTML = recientes.map(function (p) {
            var s = STATUS[p.estado || 'pendiente'] || STATUS.pendiente;
            var fechaStr = p.fechaCompleta ? new Date(p.fechaCompleta).toLocaleDateString('es-VE', { year: 'numeric', month: 'short', day: 'numeric' }) : (p.fecha || '---');
            var itemsCount = (p.items || []).reduce(function (acc, it) { return acc + (it.cantidad || 0); }, 0);
            var itemsResumen = (p.items || []).slice(0, 2).map(function (it) { return escapeHtml(it.nombre); }).join(', ');
            if ((p.items || []).length > 2) itemsResumen += String.fromCharCode(8230);
            return '<div class="user-history-item"><div class="user-history-item-header"><span class="user-history-date">' + fechaStr + '</span><span class="user-history-status ' + s.cls + '">' + s.label + '</span></div><div class="user-history-items">' + itemsResumen + '</div><div class="user-history-meta"><span class="user-history-count">' + itemsCount + ' producto' + (itemsCount !== 1 ? 's' : '') + '</span><span class="user-history-total">$' + (p.totalUSD || 0).toFixed(2) + ' / Bs. ' + (p.totalBS || 0).toFixed(2) + '</span></div></div>';
        }).join('');
        if (pedidos.length > 3) list.innerHTML += '<a href="' + (window.LETTERING_BASE || '') + '/historial/" class="user-history-ver-todo">Ver historial completo </a>';
    }

    function showSuccessBanner(title, msg) {
        var banner = document.getElementById('user-success-banner');
        var titleEl = document.getElementById('user-success-title');
        var msgEl = document.getElementById('user-success-msg');
        if (!banner) return;
        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = msg;
        banner.classList.add('visible');
        setTimeout(function () { banner.classList.remove('visible'); }, 4000);
    }

    async function handleRegister(e) {
        e.preventDefault();
        var fd = new FormData(e.target);
        var result = await register({ nombre: fd.get('nombre'), email: fd.get('email'), tel: fd.get('tel'), password: fd.get('password'), confirm: fd.get('confirm') });
        if (!result.ok) { showError('reg-error', result.error); return false; }
        showToast('Bienvenido ' + result.user.nombre + '! Tu cuenta fue creada.', 'success');
        closeModal();
        return false;
    }

    async function handleLogin(e) {
        e.preventDefault();
        var fd = new FormData(e.target);
        var result = await login(fd.get('email'), fd.get('password'));
        if (!result.ok) { showError('login-error', result.error); return false; }
        showToast('Hola de nuevo, ' + result.user.nombre + '!', 'success');
        closeModal();
        return false;
    }

    async function logoutAndClose() {
        var session = getSession();
        var nombre = session ? session.nombre : '';
        if (!window.confirm('Estas seguro de que quieres cerrar la sesion' + (nombre ? ' de ' + nombre : '') + '?')) return;
        await logout();
        showToast('Sesion cerrada correctamente. Vuelve pronto!', 'info');
        closeModal();
    }

    function showError(id, msg) {
        var el = document.getElementById(id);
        if (el) { el.textContent = msg; el.classList.add('visible'); }
    }

    function clearErrors() {
        ['reg-error', 'login-error'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) { el.textContent = ''; el.classList.remove('visible'); }
        });
    }

    function showToast(msg, type) {
        type = type || 'info';
        var container = document.getElementById('user-toast-container');
        if (!container) return;
        var toast = document.createElement('div');
        toast.className = 'user-toast user-toast-' + type;
        var icon = type === 'success' ? 'V' : type === 'error' ? 'X' : 'i';
        toast.innerHTML = '<span class="user-toast-icon">' + icon + '</span><span>' + escapeHtml(msg) + '</span>';
        container.appendChild(toast);
        setTimeout(function () { toast.classList.add('show'); }, 10);
        setTimeout(function () { toast.classList.remove('show'); setTimeout(function () { toast.remove(); }, 300); }, 3500);
    }

    var escapeHtml = window.escapeHtml || function (s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    };

    function renderHeaderButton() {
        var session = getSession();
        var btn = document.getElementById('user-toggle');
        if (!btn) return;
        if (session) {
            var initial = (session.nombre || 'U').charAt(0).toUpperCase();
            btn.innerHTML = '<span class="user-avatar-mini">' + initial + '</span><span class="user-toggle-name">' + escapeHtml(session.nombre.split(' ')[0]) + '</span>';
            btn.classList.add('logged-in');
            btn.title = 'Sesion activa: ' + session.nombre;
        } else {
            btn.innerHTML = '<span class="user-toggle-icon"></span><span class="user-toggle-name">Ingresar</span>';
            btn.classList.remove('logged-in');
            btn.title = 'Iniciar sesion o registrarse';
        }
    }

    function initHeaderButton() {
        var btn = document.getElementById('user-toggle');
        if (btn) { btn.addEventListener('click', function (e) { e.preventDefault(); openModal(); }); renderHeaderButton(); }
    }

    // Init supabase on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { initSupabase(); initHeaderButton(); });
    } else {
        initSupabase(); initHeaderButton();
    }

    window.Users = {
        openModal: openModal, closeModal: closeModal, switchTo: switchTo,
        register: register, login: login, logout: logout, logoutAndClose: logoutAndClose,
        getCurrent: getCurrent, getAll: loadUsers, delete: deleteUser,
        isLoggedIn: isLoggedIn, renderHeaderButton: renderHeaderButton, initHeaderButton: initHeaderButton,
        showToast: showToast, showSuccessBanner: showSuccessBanner, renderHistory: renderHistory,
        handleRegister: handleRegister, handleLogin: handleLogin, escapeHtml: escapeHtml
    };
})();
