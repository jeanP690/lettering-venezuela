// dashboard-supabase-loader.js
// Cargado antes de script.js - conecta el Dashboard con Supabase
// localStorage sigue siendo el origen principal, pero cada cambio
// se refleja automaticamente en Supabase.

(function () {
    'use strict';

    var _syncInProgress = false;

    // ========== LOGIN GATE ==========
    // Defer to script.js multi-user auth. Only migrate legacy sessions here.
    function checkLoginGate() {
        if (localStorage.getItem('dash_authenticated') === 'true') return;
        // Legacy session migration (if coming from old single-password system)
        try {
            var session = JSON.parse(localStorage.getItem('dash_session') || 'null');
            if (session && session.expira > Date.now()) {
                localStorage.setItem('dash_authenticated', 'true');
                localStorage.setItem('dash_user', 'admin');
                localStorage.setItem('dash_user_rol', 'admin');
                localStorage.removeItem('dash_session');
            }
        } catch (e) {}
    }

    function getClient() {
        return window.Supabase && typeof window.Supabase.getClient === 'function'
            ? window.Supabase.getClient() : null;
    }

    // ========== SYNC COMPLETO A SUPABASE ==========
    function hookActualizarSistema() {
        var originalActualizar = window.actualizarSistema;
        if (typeof originalActualizar !== 'function') {
            var check = setInterval(function () {
                if (typeof window.actualizarSistema === 'function') {
                    clearInterval(check);
                    hookActualizarSistema();
                }
            }, 100);
            return;
        }

        window.actualizarSistema = async function () {
            originalActualizar();
            if (_syncInProgress) return;
            _syncInProgress = true;

            try {
                console.log('[Supabase] Iniciando sync...');
                await syncCategories();
                await syncBrands();
                await syncProducts();
                await syncOrders();
                await syncClients();
                await syncSalesHistory();
                console.log('[Supabase] Sync completado');
            } catch (e) {
                console.warn('[Supabase] Sync error:', e);
            }

            _syncInProgress = false;
        };
    }

    // ========== CATEGORIAS ==========
    async function syncCategories() {
        var client = getClient();
        if (!client) return;
        var cats;
        try { cats = JSON.parse(localStorage.getItem('categoriasObj')) || []; } catch (e) { return; }

        console.log('[Supabase] Sincronizando ' + cats.length + ' categorias...');
        for (var i = 0; i < cats.length; i++) {
            try {
                var c = cats[i];
                var { data: existing } = await client.from('categories').select('id').eq('name', c.nombre).maybeSingle();
                if (existing) {
                    if (c.foto && c.foto.indexOf('supabase') === -1) {
                        var newUrl = await migrateImage(c.foto, 'categories');
                        if (newUrl) c.foto = newUrl;
                    }
                    await client.from('categories').update({ name: c.nombre, foto_url: c.foto || '' }).eq('id', existing.id);
                } else {
                    var fotoUrl = c.foto && c.foto.indexOf('data:') === 0
                        ? await migrateImage(c.foto, 'categories') || ''
                        : (c.foto || '');
                    await client.from('categories').insert({ name: c.nombre, foto_url: fotoUrl });
                }
            } catch (e) { console.warn('[Supabase] Error syncCategories item "' + (c ? c.nombre : '?') + '":', e); }
        }
        localStorage.setItem('categoriasObj', JSON.stringify(cats));
        console.log('[Supabase] Categorias sincronizadas: ' + cats.length);
    }

    // ========== MARCAS ==========
    async function syncBrands() {
        var client = getClient();
        if (!client) return;
        var brs;
        try { brs = JSON.parse(localStorage.getItem('marcasObj')) || []; } catch (e) { return; }

        console.log('[Supabase] Sincronizando ' + brs.length + ' marcas...');
        for (var i = 0; i < brs.length; i++) {
            try {
                var b = brs[i];
                var { data: existing } = await client.from('brands').select('id').eq('name', b.nombre).maybeSingle();
                if (existing) {
                    if (b.foto && b.foto.indexOf('supabase') === -1) {
                        var newUrl = await migrateImage(b.foto, 'brands');
                        if (newUrl) b.foto = newUrl;
                    }
                    await client.from('brands').update({ name: b.nombre, foto_url: b.foto || '' }).eq('id', existing.id);
                } else {
                    var fotoUrl = b.foto && b.foto.indexOf('data:') === 0
                        ? await migrateImage(b.foto, 'brands') || ''
                        : (b.foto || '');
                    await client.from('brands').insert({ name: b.nombre, foto_url: fotoUrl });
                }
            } catch (e) { console.warn('[Supabase] Error syncBrands item "' + (b ? b.nombre : '?') + '":', e); }
        }
        localStorage.setItem('marcasObj', JSON.stringify(brs));
        console.log('[Supabase] Marcas sincronizadas: ' + brs.length);
    }

    // ========== PRODUCTOS ==========
    function generarCodigoSync(p, todos) {
        if (p.codigo && p.codigo.trim()) return p.codigo.trim();
        var cat = (p.categoria || '').slice(0, 3).toUpperCase();
        var mar = (p.marca || '').slice(0, 2).toUpperCase();
        var prefijo = (cat + mar) || 'PROD';
        if (prefijo.length < 2) prefijo = 'PROD';
        var maxNum = 0;
        (todos || []).forEach(function(pr) {
            if (pr.codigo && pr.codigo.startsWith(prefijo)) {
                var n = parseInt(pr.codigo.replace(prefijo + '-', ''), 10) || 0;
                if (n > maxNum) maxNum = n;
            }
        });
        return prefijo + '-' + String(maxNum + 1).padStart(3, '0');
    }

    async function syncProducts() {
        var client = getClient();
        if (!client) return;
        var inv;
        try { inv = JSON.parse(localStorage.getItem('inventario')) || []; } catch (e) { return; }
        if (inv.length === 0) { console.log('[Supabase] No hay productos para sincronizar'); return; }
        console.log('[Supabase] Sincronizando ' + inv.length + ' productos...');

        // Cache de category/brand ids
        var catMap = {};
        var brMap = {};

        for (var i = 0; i < inv.length; i++) {
            try {
                var p = inv[i];

                // Category ID
                var catId = null;
                if (p.categoria) {
                    if (!catMap[p.categoria]) {
                        var { data: cat } = await client.from('categories').select('id').eq('name', p.categoria).maybeSingle();
                        catMap[p.categoria] = cat ? cat.id : null;
                    }
                    catId = catMap[p.categoria];
                }

                // Brand ID
                var brandId = null;
                if (p.marca) {
                    if (!brMap[p.marca]) {
                        var { data: br } = await client.from('brands').select('id').eq('name', p.marca).maybeSingle();
                        brMap[p.marca] = br ? br.id : null;
                    }
                    brandId = brMap[p.marca];
                }

                // Auto-generate codigo if missing
                p.codigo = generarCodigoSync(p, inv);

                // Upsert product
                var { data: existing } = await client.from('products').select('id').eq('name', p.nombre).maybeSingle();
                var prodId = null;

                if (existing) {
                    await client.from('products').update({
                        category_id: catId,
                        brand_id: brandId,
                        quantity: parseInt(p.cantidad) || 0,
                        price: parseFloat(p.precio) || 0,
                        descripcion: p.descripcion || '',
                        codigo: p.codigo || '',
                        activo: p.activo !== false,
                        variantes: JSON.stringify(p.variantes || [])
                    }).eq('id', existing.id);
                    prodId = existing.id;
                } else {
                    var { data: inserted } = await client.from('products').insert({
                        name: p.nombre,
                        category_id: catId,
                        brand_id: brandId,
                        quantity: parseInt(p.cantidad) || 0,
                        price: parseFloat(p.precio) || 0,
                        descripcion: p.descripcion || '',
                        codigo: p.codigo || '',
                        activo: p.activo !== false,
                        variantes: JSON.stringify(p.variantes || [])
                    }).select('id').single();
                    if (inserted) prodId = inserted.id;
                }

                // Sync photos
                if (prodId && p.fotos && p.fotos.length > 0) {
                    var needPhotoSync = false;
                    for (var fi = 0; fi < p.fotos.length; fi++) {
                        if (p.fotos[fi] && p.fotos[fi].indexOf('http') !== 0) {
                            needPhotoSync = true;
                            break;
                        }
                    }
                    if (needPhotoSync) {
                        var newPhotos = [];
                        for (var pj = 0; pj < p.fotos.length; pj++) {
                            if (p.fotos[pj] && p.fotos[pj].indexOf('http') === 0) {
                                newPhotos.push(p.fotos[pj]);
                            } else if (p.fotos[pj]) {
                                var uploaded = await migrateImage(p.fotos[pj], 'products');
                                newPhotos.push(uploaded || p.fotos[pj]);
                            }
                        }
                        if (newPhotos.length > 0) {
                            await client.from('product_photos').delete().eq('product_id', prodId);
                            var photoRows = newPhotos.map(function (url, idx) {
                                return { product_id: prodId, url: url, sort_order: idx };
                            });
                            await client.from('product_photos').insert(photoRows);
                            p.fotos = newPhotos;
                        }
                    }
                }
            } catch (e) { console.warn('[Supabase] Error syncProducts item "' + (p ? p.nombre : '?') + '":', e); }
        }
        localStorage.setItem('inventario', JSON.stringify(inv));
        console.log('[Supabase] Productos sincronizados: ' + inv.length);
    }

    // ========== PEDIDOS ==========
    async function syncOrders() {
        var client = getClient();
        if (!client) return;
        var pedidos;
        try { pedidos = JSON.parse(localStorage.getItem('pedidosPendientes')) || []; } catch (e) { return; }
        if (pedidos.length === 0) { console.log('[Supabase] No hay pedidos'); return; }
        console.log('[Supabase] Sincronizando ' + pedidos.length + ' pedidos...');

        for (var i = 0; i < pedidos.length; i++) {
            try {
                var p = pedidos[i];
                var { data: existing } = await client.from('orders').select('id').eq('order_id', p.id).maybeSingle();
                if (!existing) {
                    await client.from('orders').insert({
                        order_id: p.id,
                        user_id: p.userId || null,
                        user_email: p.userEmail || '',
                        user_name: p.userNombre || '',
                        user_phone: p.userTel || '',
                        items_json: JSON.stringify(p.items || []),
                        total_usd: p.totalUSD || 0,
                        total_bs: p.totalBS || 0,
                        status: p.estado || 'pendiente'
                    });
                } else if (p.estado) {
                    await client.from('orders').update({ status: p.estado }).eq('id', existing.id);
                }
            } catch (e) { console.warn('[Supabase] Error syncOrders item "' + (p ? p.id : '?') + '":', e); }
        }
        console.log('[Supabase] Pedidos sincronizados: ' + pedidos.length);
    }

    // ========== CLIENTES Y VENTAS ==========
    async function syncClients() {
        var client = getClient();
        if (!client) return;
        var clientes;
        try { clientes = JSON.parse(localStorage.getItem('clientes')) || []; } catch (e) { return; }
        if (clientes.length === 0) { console.log('[Supabase] No hay clientes/ventas'); return; }
        console.log('[Supabase] Sincronizando ' + clientes.length + ' clientes/ventas...');

        for (var i = 0; i < clientes.length; i++) {
            try {
                var c = clientes[i];

                var clientId = await getOrCreateClientRecord(client, c.nombre, c.tel);
                if (!clientId) continue;

                // Buscar si ya existe una venta igual (por fecha + cliente + total)
                var { data: existingSale } = await client.from('sales')
                    .select('id, paid_usd, paid_bs')
                    .eq('client_id', clientId)
                    .eq('sale_date', c.fechaRegistro || '')
                    .eq('total_usd', parseFloat(c.total || 0))
                    .maybeSingle();

                var saleId = null;
                if (existingSale) {
                    saleId = existingSale.id;
                    await client.from('sales').update({
                        paid_usd: parseFloat(c.pagado || 0),
                        paid_bs: parseFloat(c.pagadoBs || 0)
                    }).eq('id', saleId);
                } else {
                    var { data: newSale } = await client.from('sales').insert({
                        client_id: clientId,
                        sale_date: c.fechaRegistro || new Date().toISOString().split('T')[0],
                        total_usd: parseFloat(c.total || 0),
                        total_bs: parseFloat(c.totalBs || 0),
                        paid_usd: parseFloat(c.pagado || 0),
                        paid_bs: parseFloat(c.pagadoBs || 0)
                    }).select('id').single();
                    if (newSale) saleId = newSale.id;
                }

                if (!saleId) continue;

                // Sync sale items
                var prods = Array.isArray(c.productos) ? c.productos : (c.productoVendido ? [c.productoVendido] : []);
                var cantidades = c.cantidades || [];
                if (prods.length > 0) {
                    var { data: existingItems } = await client.from('sale_items').select('id').eq('sale_id', saleId);
                    if (!existingItems || existingItems.length === 0) {
                        var itemRows = prods.map(function (pn, idx) {
                            var prodInv = null;
                            try {
                                var inv = JSON.parse(localStorage.getItem('inventario')) || [];
                                prodInv = inv.find(function (ip) { return ip.nombre === pn; });
                            } catch (e) {}
                            return {
                                sale_id: saleId,
                                product_name: pn,
                                quantity: cantidades[idx] || 1,
                                price_usd: prodInv ? parseFloat(prodInv.precio) || 0 : 0
                            };
                        });
                        await client.from('sale_items').insert(itemRows);
                    }
                }

                // Sync product photos
                var fotosProd = c.fotoProducto ? (Array.isArray(c.fotoProducto) ? c.fotoProducto : [c.fotoProducto]) : [];
                if (fotosProd.length > 0) {
                    var newFotos = [];
                    for (var fp = 0; fp < fotosProd.length; fp++) {
                        if (fotosProd[fp]) {
                            if (fotosProd[fp].indexOf('http') === 0) newFotos.push(fotosProd[fp]);
                            else {
                                var uploaded = await migrateImage(fotosProd[fp], 'sales');
                                newFotos.push(uploaded || fotosProd[fp]);
                            }
                        }
                    }
                    if (newFotos.length > 0) {
                        await client.from('sale_photos').delete().eq('sale_id', saleId).eq('photo_type', 'product');
                        var photoRows = newFotos.map(function (url, idx) {
                            return { sale_id: saleId, url: url, photo_type: 'product', sort_order: idx };
                        });
                        await client.from('sale_photos').insert(photoRows);
                        c.fotoProducto = newFotos;
                    }
                }

                // Sync receipt photos
                var recibos = c.recibo ? (Array.isArray(c.recibo) ? c.recibo : [c.recibo]) : [];
                if (recibos.length > 0) {
                    var newRecibos = [];
                    for (var rr = 0; rr < recibos.length; rr++) {
                        if (recibos[rr]) {
                            if (recibos[rr].indexOf('http') === 0) newRecibos.push(recibos[rr]);
                            else {
                                var uploaded = await migrateImage(recibos[rr], 'receipts');
                                newRecibos.push(uploaded || recibos[rr]);
                            }
                        }
                    }
                    if (newRecibos.length > 0) {
                        await client.from('sale_photos').delete().eq('sale_id', saleId).eq('photo_type', 'receipt');
                        var recRows = newRecibos.map(function (url, idx) {
                            return { sale_id: saleId, url: url, photo_type: 'receipt', sort_order: idx };
                        });
                        await client.from('sale_photos').insert(recRows);
                        c.recibo = newRecibos;
                    }
                }

                // Sync payment records (abonos)
                if (c.abonos && c.abonos.length > 0) {
                    for (var ai = 0; ai < c.abonos.length; ai++) {
                        var ab = c.abonos[ai];
                        var { data: existingAbono } = await client.from('payment_records')
                            .select('id')
                            .eq('sale_id', saleId)
                            .eq('payment_date', ab.fecha || '')
                            .eq('usd_amount', parseFloat(ab.usd || 0))
                            .maybeSingle();
                        if (!existingAbono) {
                            await client.from('payment_records').insert({
                                sale_id: saleId,
                                payment_date: ab.fecha || new Date().toISOString().split('T')[0],
                                usd_amount: parseFloat(ab.usd || 0),
                                bs_amount: parseFloat(ab.bs || 0),
                                tasa: parseFloat(ab.tasa || 0)
                            });
                        }
                    }
                }
            } catch (e) { console.warn('[Supabase] Error syncClients item "' + (c ? c.nombre : '?') + '":', e); }
        }
        localStorage.setItem('clientes', JSON.stringify(clientes));
        console.log('[Supabase] Clientes/ventas sincronizados: ' + clientes.length);
    }

    async function getOrCreateClientRecord(client, name, phone) {
        if (!name) return null;
        var { data: existing } = await client.from('clients').select('id')
            .eq('name', name).eq('phone', phone || '').maybeSingle();
        if (existing) return existing.id;
        var { data: newClient } = await client.from('clients').insert({
            name: name, phone: phone || ''
        }).select('id').single();
        return newClient ? newClient.id : null;
    }

    // ========== HISTORIAL DE VENTAS ==========
    async function syncSalesHistory() {
        var client = getClient();
        if (!client) return;
        var hist;
        try { hist = JSON.parse(localStorage.getItem('historialVentas')) || []; } catch (e) { return; }
        if (hist.length === 0) { console.log('[Supabase] No hay historial de ventas'); return; }
        console.log('[Supabase] Sincronizando ' + hist.length + ' registros de historial...');

        for (var i = 0; i < hist.length; i++) {
            try {
                var h = hist[i];
                var { data: existing } = await client.from('sales_history')
                    .select('id')
                    .eq('date', h.fecha || '')
                    .eq('total_usd', parseFloat(h.total || 0))
                    .maybeSingle();
                if (!existing) {
                    await client.from('sales_history').insert({
                        date: h.fecha || new Date().toISOString().split('T')[0],
                        items_json: JSON.stringify(h.items || []),
                        total_usd: parseFloat(h.total || 0)
                    });
                }
            } catch (e) { console.warn('[Supabase] Error syncSalesHistory item:', e); }
        }
        console.log('[Supabase] Historial de ventas sincronizado: ' + hist.length);
    }

    // ========== MIGRAR IMAGEN BASE64 A STORAGE ==========
    async function migrateImage(dataUrl, folder) {
        if (!dataUrl || dataUrl.indexOf('data:') !== 0) return null;
        if (window.Upload && typeof window.Upload.migrateBase64ToStorage === 'function') {
            try {
                return await window.Upload.migrateBase64ToStorage(dataUrl, folder);
            } catch (e) {
                return null;
            }
        }
        // Fallback manual
        try {
            var res = await fetch(dataUrl);
            var blob = await res.blob();
            var client = getClient();
            if (!client) return null;
            var mimeMap = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/bmp': 'bmp', 'image/svg+xml': 'svg' };
            var ext = mimeMap[blob.type] || 'jpg';
            var fileName = folder + '/' + Date.now() + '_' + Math.random().toString(36).substring(2, 8) + '.' + ext;
            var { error } = await client.storage.from('lettering').upload(fileName, blob, { cacheControl: '3600', upsert: false, contentType: blob.type });
            if (error) throw error;
            var { data: { publicUrl } } = client.storage.from('lettering').getPublicUrl(fileName);
            return publicUrl;
        } catch (e) {
            return null;
        }
    }

    // ========== CARGA INICIAL ==========
    async function cargarDatosIniciales() {
        var client = getClient();
        if (!client) return;
        try {
            // Intentar cargar productos desde Supabase si localStorage esta vacio
            var inv;
            try { inv = JSON.parse(localStorage.getItem('inventario')) || []; } catch (e) { inv = []; }
            if (inv.length === 0) {
                var prods = await window.DB.getProducts();
                if (prods && prods.length > 0) {
                    localStorage.setItem('inventario', JSON.stringify(prods));
                }
            }
        } catch (e) {}
    }

    // ========== EXN ==========
    window.DashboardSupabase = {
        syncCategories: syncCategories,
        syncBrands: syncBrands,
        syncProducts: syncProducts,
        syncOrders: syncOrders,
        syncClients: syncClients,
        syncSalesHistory: syncSalesHistory,
        migrateImage: migrateImage
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            checkLoginGate();
            cargarDatosIniciales();
            hookActualizarSistema();
        });
    } else {
        checkLoginGate();
        cargarDatosIniciales();
        hookActualizarSistema();
    }
})();
