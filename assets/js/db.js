(function () {
    'use strict';

    // ================================================================
    // db.js — Capa de datos que reemplaza localStorage con Supabase
    // Expone una API similar a la actual para migración gradual
    // ================================================================

    // ---- Utilidad ----
    function getClient() {
        if (window.Supabase && typeof window.Supabase.getClient === 'function') {
            return window.Supabase.getClient();
        }
        return null;
    }

    function mapProduct(row) {
        return {
            id: row.id,
            nombre: row.name,
            categoria: row.category_name || '',
            marca: row.brand_name || '',
            cantidad: row.quantity,
            precio: parseFloat(row.price),
            fotos: row.photos || []
        };
    }

    function mapCategory(row) {
        return { id: row.id, nombre: row.name, foto: row.foto_url || '' };
    }

    function mapBrand(row) {
        return { id: row.id, nombre: row.name, foto: row.foto_url || '' };
    }

    // ================================================================
    // PRODUCTOS (inventario)
    // ================================================================
    async function getProducts() {
        var client = getClient();
        if (!client) return [];
        var { data, error } = await client
            .from('products')
            .select('id, name, quantity, price, created_at, categories:category_id(name), brands:brand_id(name)')
            .order('name');
        if (error) { console.error('db.getProducts:', error); return []; }
        if (!data || data.length === 0) { console.log('db.getProducts: sin datos en Supabase'); return []; }

        var result = [];
        for (var i = 0; i < data.length; i++) {
            var row = data[i];
            var { data: photos } = await client
                .from('product_photos')
                .select('url')
                .eq('product_id', row.id)
                .order('sort_order');
            result.push({
                id: row.id,
                nombre: row.name,
                categoria: row.categories ? row.categories.name : '',
                marca: row.brands ? row.brands.name : '',
                cantidad: row.quantity,
                precio: parseFloat(row.price),
                fotos: (photos || []).map(function (p) { return p.url; })
            });
        }
        return result;
    }

    async function getProductByName(name) {
        var client = getClient();
        if (!client) return null;
        var { data, error } = await client
            .from('products')
            .select(`
                id, name, quantity, price,
                categories(name), brands(name)
            `)
            .eq('name', name)
            .maybeSingle();
        if (error || !data) return null;
        var { data: photos } = await client
            .from('product_photos')
            .select('url')
            .eq('product_id', data.id)
            .order('sort_order');
        return {
            id: data.id,
            nombre: data.name,
            categoria: data.categories ? data.categories.name : '',
            marca: data.brands ? data.brands.name : '',
            cantidad: data.quantity,
            precio: parseFloat(data.price),
            fotos: (photos || []).map(function (p) { return p.url; })
        };
    }

    async function saveProduct(product) {
        var client = getClient();
        if (!client) return null;

        var catId = null;
        if (product.categoria) {
            var { data: cat } = await client.from('categories').select('id').eq('name', product.categoria).maybeSingle();
            if (cat) catId = cat.id;
        }
        var brandId = null;
        if (product.marca) {
            var { data: br } = await client.from('brands').select('id').eq('name', product.marca).maybeSingle();
            if (br) brandId = br.id;
        }

        if (product.id) {
            var { error } = await client.from('products').update({
                name: product.nombre,
                category_id: catId,
                brand_id: brandId,
                quantity: parseInt(product.cantidad) || 0,
                price: parseFloat(product.precio) || 0
            }).eq('id', product.id);
            if (error) { console.error('db.saveProduct update:', error); return null; }
            return product.id;
        } else {
            var { data, error } = await client.from('products').insert({
                name: product.nombre,
                category_id: catId,
                brand_id: brandId,
                quantity: parseInt(product.cantidad) || 0,
                price: parseFloat(product.precio) || 0
            }).select('id').single();
            if (error) { console.error('db.saveProduct insert:', error); return null; }
            return data.id;
        }
    }

    async function deleteProduct(id) {
        var client = getClient();
        if (!client) return;
        await client.from('product_photos').delete().eq('product_id', id);
        await client.from('products').delete().eq('id', id);
    }

    async function saveProductPhotos(productId, urls) {
        var client = getClient();
        if (!client) return;
        await client.from('product_photos').delete().eq('product_id', productId);
        if (urls.length > 0) {
            var rows = urls.map(function (url, i) {
                return { product_id: productId, url: url, sort_order: i };
            });
            await client.from('product_photos').insert(rows);
        }
    }

    // ================================================================
    // CATEGORÍAS
    // ================================================================
    async function getCategories() {
        var client = getClient();
        if (!client) return [];
        var { data, error } = await client.from('categories').select('*').order('name');
        if (error) return [];
        return (data || []).map(mapCategory);
    }

    async function saveCategory(cat) {
        var client = getClient();
        if (!client) return null;
        if (cat.id) {
            await client.from('categories').update({ name: cat.nombre, foto_url: cat.foto || '' }).eq('id', cat.id);
            return cat.id;
        } else {
            var { data } = await client.from('categories').insert({ name: cat.nombre, foto_url: cat.foto || '' }).select('id').single();
            return data ? data.id : null;
        }
    }

    async function deleteCategory(id) {
        var client = getClient();
        if (!client) return;
        await client.from('categories').delete().eq('id', id);
    }

    // ================================================================
    // MARCAS
    // ================================================================
    async function getBrands() {
        var client = getClient();
        if (!client) return [];
        var { data, error } = await client.from('brands').select('*').order('name');
        if (error) return [];
        return (data || []).map(mapBrand);
    }

    async function saveBrand(br) {
        var client = getClient();
        if (!client) return null;
        if (br.id) {
            await client.from('brands').update({ name: br.nombre, foto_url: br.foto || '' }).eq('id', br.id);
            return br.id;
        } else {
            var { data } = await client.from('brands').insert({ name: br.nombre, foto_url: br.foto || '' }).select('id').single();
            return data ? data.id : null;
        }
    }

    async function deleteBrand(id) {
        var client = getClient();
        if (!client) return;
        await client.from('brands').delete().eq('id', id);
    }

    // ================================================================
    // CLIENTES Y VENTAS
    // ================================================================
    async function getClients() {
        var client = getClient();
        if (!client) return [];
        var { data, error } = await client.from('clients').select('*').order('name');
        if (error) return [];
        return data || [];
    }

    async function saveClient(cl) {
        var client = getClient();
        if (!client) return null;
        if (cl.id) {
            await client.from('clients').update({ name: cl.name, phone: cl.phone }).eq('id', cl.id);
            return cl.id;
        } else {
            var { data } = await client.from('clients').insert({ name: cl.name, phone: cl.phone }).select('id').single();
            return data ? data.id : null;
        }
    }

    async function getOrCreateClient(name, phone) {
        var client = getClient();
        if (!client) return null;
        var { data } = await client.from('clients').select('id').eq('name', name).eq('phone', phone).maybeSingle();
        if (data) return data.id;
        var { data: inserted } = await client.from('clients').insert({ name: name, phone: phone }).select('id').single();
        return inserted ? inserted.id : null;
    }

    async function getSales() {
        var client = getClient();
        if (!client) return [];
        var { data, error } = await client.from('sales').select(`
            *,
            clients (name, phone),
            sale_items (*),
            sale_photos (*),
            payment_records (*)
        `).order('created_at', { ascending: false });
        if (error) return [];
        return data || [];
    }

    async function saveSale(saleData) {
        var client = getClient();
        if (!client) return null;
        var { data, error } = await client.from('sales').insert({
            client_id: saleData.client_id,
            sale_date: saleData.sale_date,
            total_usd: saleData.total_usd,
            total_bs: saleData.total_bs,
            paid_usd: saleData.paid_usd,
            paid_bs: saleData.paid_bs
        }).select('id').single();
        if (error || !data) { console.error('db.saveSale:', error); return null; }
        return data.id;
    }

    async function saveSaleItems(saleId, items) {
        var client = getClient();
        if (!client) return;
        if (items.length === 0) return;
        var rows = items.map(function (it) {
            return { sale_id: saleId, product_name: it.product_name, quantity: it.quantity, price_usd: it.price_usd };
        });
        await client.from('sale_items').insert(rows);
    }

    // ================================================================
    // PEDIDOS (tienda online)
    // ================================================================
    async function getOrders() {
        var client = getClient();
        if (!client) return [];
        var { data, error } = await client.from('orders').select('*').order('created_at', { ascending: false });
        if (error) return [];
        return data || [];
    }

    async function saveOrder(order) {
        var client = getClient();
        if (!client) return null;
        var { data, error } = await client.from('orders').insert({
            order_id: order.order_id,
            user_id: order.user_id,
            user_email: order.user_email,
            user_name: order.user_name,
            user_phone: order.user_phone,
            items_json: order.items_json,
            total_usd: order.total_usd,
            total_bs: order.total_bs,
            status: order.status || 'pendiente'
        }).select('id').single();
        if (error) { console.error('db.saveOrder:', error); return null; }
        return data.id;
    }

    async function updateOrderStatus(id, status) {
        var client = getClient();
        if (!client) return;
        await client.from('orders').update({ status: status }).eq('id', id);
    }

    async function deleteOrder(id) {
        var client = getClient();
        if (!client) return;
        await client.from('orders').delete().eq('id', id);
    }

    // ================================================================
    // TASA DE CAMBIO
    // ================================================================
    async function getExchangeRate() {
        var client = getClient();
        if (!client) return { mode: 'manual', rate: 36.5, source: 'oficial' };
        var { data, error } = await client.from('exchange_rates').select('*').limit(1).maybeSingle();
        if (error || !data) return { mode: 'manual', rate: 36.5, source: 'oficial' };
        return { mode: data.mode, rate: parseFloat(data.rate), source: data.source };
    }

    async function saveExchangeRate(cfg) {
        var client = getClient();
        if (!client) return;
        var { data } = await client.from('exchange_rates').select('id').limit(1).maybeSingle();
        if (data) {
            await client.from('exchange_rates').update({ mode: cfg.mode, rate: cfg.rate, source: cfg.source }).eq('id', data.id);
        } else {
            await client.from('exchange_rates').insert({ mode: cfg.mode, rate: cfg.rate, source: cfg.source });
        }
    }

    // ================================================================
    // CONTACTO INFO
    // ================================================================
    async function getContactInfo() {
        var client = getClient();
        if (!client) return { whatsapp: '584121234567', instagram: '', facebook: '' };
        var { data, error } = await client.from('contact_info').select('*').limit(1).maybeSingle();
        if (error || !data) return { whatsapp: '584121234567', instagram: '', facebook: '' };
        return { whatsapp: data.whatsapp, instagram: data.instagram, facebook: data.facebook };
    }

    async function saveContactInfo(info) {
        var client = getClient();
        if (!client) return;
        var { data } = await client.from('contact_info').select('id').limit(1).maybeSingle();
        if (data) {
            await client.from('contact_info').update({ whatsapp: info.whatsapp, instagram: info.instagram, facebook: info.facebook }).eq('id', data.id);
        } else {
            await client.from('contact_info').insert({ whatsapp: info.whatsapp, instagram: info.instagram, facebook: info.facebook });
        }
    }

    // ================================================================
    // MIGRAR DATOS DESDE LOCALSTORAGE A SUPABASE
    // ================================================================
    async function migrateFromLocalStorage() {
        var client = getClient();
        if (!client) return { ok: false, error: 'Supabase no configurado' };

        var results = { categories: 0, brands: 0, products: 0, errors: [] };

        try {
            var cats = JSON.parse(localStorage.getItem('categoriasObj') || '[]');
            for (var i = 0; i < cats.length; i++) {
                var c = cats[i];
                var { data: existing } = await client.from('categories').select('id').eq('name', c.nombre).maybeSingle();
                if (!existing) {
                    await client.from('categories').insert({ name: c.nombre, foto_url: c.foto || '' });
                    results.categories++;
                }
            }
        } catch (e) { results.errors.push('categories: ' + e.message); }

        try {
            var brs = JSON.parse(localStorage.getItem('marcasObj') || '[]');
            for (var j = 0; j < brs.length; j++) {
                var b = brs[j];
                var { data: existing } = await client.from('brands').select('id').eq('name', b.nombre).maybeSingle();
                if (!existing) {
                    await client.from('brands').insert({ name: b.nombre, foto_url: b.foto || '' });
                    results.brands++;
                }
            }
        } catch (e) { results.errors.push('brands: ' + e.message); }

        try {
            var prods = JSON.parse(localStorage.getItem('inventario') || '[]');
            for (var k = 0; k < prods.length; k++) {
                var p = prods[k];
                var catRow = null;
                if (p.categoria) {
                    var { data: cr } = await client.from('categories').select('id').eq('name', p.categoria).maybeSingle();
                    catRow = cr;
                }
                var brRow = null;
                if (p.marca) {
                    var { data: br } = await client.from('brands').select('id').eq('name', p.marca).maybeSingle();
                    brRow = br;
                }
                var { data: existing } = await client.from('products').select('id').eq('name', p.nombre).maybeSingle();
                var prodId = null;
                if (!existing) {
                    var { data: inserted } = await client.from('products').insert({
                        name: p.nombre,
                        category_id: catRow ? catRow.id : null,
                        brand_id: brRow ? brRow.id : null,
                        quantity: parseInt(p.cantidad) || 0,
                        price: parseFloat(p.precio) || 0
                    }).select('id').single();
                    if (inserted) prodId = inserted.id;
                    results.products++;
                } else {
                    prodId = existing.id;
                }
                if (prodId && p.fotos && p.fotos.length > 0) {
                    var photoRows = p.fotos.map(function (url, idx) {
                        return { product_id: prodId, url: url, sort_order: idx };
                    });
                    await client.from('product_photos').insert(photoRows);
                }
            }
        } catch (e) { results.errors.push('products: ' + e.message); }

        return results;
    }

    window.DB = {
        // Products
        getProducts: getProducts,
        getProductByName: getProductByName,
        saveProduct: saveProduct,
        deleteProduct: deleteProduct,
        saveProductPhotos: saveProductPhotos,
        // Categories
        getCategories: getCategories,
        saveCategory: saveCategory,
        deleteCategory: deleteCategory,
        // Brands
        getBrands: getBrands,
        saveBrand: saveBrand,
        deleteBrand: deleteBrand,
        // Clients & Sales
        getClients: getClients,
        saveClient: saveClient,
        getOrCreateClient: getOrCreateClient,
        getSales: getSales,
        saveSale: saveSale,
        saveSaleItems: saveSaleItems,
        // Orders
        getOrders: getOrders,
        saveOrder: saveOrder,
        updateOrderStatus: updateOrderStatus,
        deleteOrder: deleteOrder,
        // Exchange rate
        getExchangeRate: getExchangeRate,
        saveExchangeRate: saveExchangeRate,
        // Contact
        getContactInfo: getContactInfo,
        saveContactInfo: saveContactInfo,
        // Migration
        migrateFromLocalStorage: migrateFromLocalStorage,
        // Helpers
        mapProduct: mapProduct,
        mapCategory: mapCategory,
        mapBrand: mapBrand
    };
})();
