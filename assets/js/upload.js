(function () {
    'use strict';

    var BUCKET_NAME = 'lettering';

    function getClient() {
        if (window.Supabase && typeof window.Supabase.getClient === 'function') {
            return window.Supabase.getClient();
        }
        return null;
    }

    function ensureBucket() {
        var client = getClient();
        if (!client) return Promise.resolve(false);
        return client.storage.getBucket(BUCKET_NAME)
            .then(function () { return true; })
            .catch(function () {
                return client.storage.createBucket(BUCKET_NAME, { public: true })
                    .then(function () { return true; })
                    .catch(function () { return false; });
            });
    }

    async function uploadFile(file, folder) {
        var client = getClient();
        if (!client) throw new Error('Supabase no configurado');

        folder = folder || 'general';
        var ext = (file.name || 'file').split('.').pop();
        var fileName = folder + '/' + Date.now() + '_' + Math.random().toString(36).substring(2, 8) + '.' + ext;

        var { data, error } = await client.storage
            .from(BUCKET_NAME)
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        var { data: { publicUrl } } = client.storage
            .from(BUCKET_NAME)
            .getPublicUrl(fileName);

        return publicUrl;
    }

    async function uploadMultipleFiles(files, folder) {
        var urls = [];
        for (var i = 0; i < files.length; i++) {
            var url = await uploadFile(files[i], folder);
            urls.push(url);
        }
        return urls;
    }

    async function deleteFile(url) {
        var client = getClient();
        if (!client) return;
        try {
            var path = url.split('/' + BUCKET_NAME + '/')[1];
            if (path) {
                await client.storage.from(BUCKET_NAME).remove([path]);
            }
        } catch (e) {
            console.warn('upload.deleteFile:', e);
        }
    }

    function compressImage(file, maxDim, quality) {
        return new Promise(function (resolve, reject) {
            var img = new Image();
            var url = URL.createObjectURL(file);
            img.onload = function () {
                URL.revokeObjectURL(url);
                var w = img.width, h = img.height;
                if (w > maxDim || h > maxDim) {
                    var ratio = Math.min(maxDim / w, maxDim / h);
                    w = Math.round(w * ratio);
                    h = Math.round(h * ratio);
                }
                var canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                var ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, w, h);
                canvas.toBlob(function (blob) {
                    if (blob) resolve(blob);
                    else reject(new Error('Compresión fallida'));
                }, 'image/jpeg', quality || 0.85);
            };
            img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Error al cargar imagen')); };
            img.src = url;
        });
    }

    async function uploadImage(file, folder, maxDim, quality) {
        var compressed = await compressImage(file, maxDim || 1200, quality || 0.85);
        var ext = 'jpg';
        var fileName = folder + '/' + Date.now() + '_' + Math.random().toString(36).substring(2, 8) + '.' + ext;
        var client = getClient();
        if (!client) throw new Error('Supabase no configurado');
        var { data, error } = await client.storage
            .from(BUCKET_NAME)
            .upload(fileName, compressed, { cacheControl: '3600', upsert: false, contentType: 'image/jpeg' });
        if (error) throw error;
        var { data: { publicUrl } } = client.storage.from(BUCKET_NAME).getPublicUrl(fileName);
        return publicUrl;
    }

    async function dataUrlToFile(dataUrl, filename) {
        var res = await fetch(dataUrl);
        var blob = await res.blob();
        return new File([blob], filename, { type: blob.type });
    }

    async function migrateBase64ToStorage(dataUrl, folder) {
        var filename = 'migrated_' + Date.now() + '.jpg';
        var file = await dataUrlToFile(dataUrl, filename);
        var compressed = await compressImage(file, 1200, 0.85);
        var ext = 'jpg';
        var fileName = folder + '/' + Date.now() + '_' + Math.random().toString(36).substring(2, 8) + '.' + ext;
        var client = getClient();
        if (!client) throw new Error('Supabase no configurado');
        var { data, error } = await client.storage
            .from(BUCKET_NAME)
            .upload(fileName, compressed, { cacheControl: '3600', upsert: false, contentType: 'image/jpeg' });
        if (error) throw error;
        var { data: { publicUrl } } = client.storage.from(BUCKET_NAME).getPublicUrl(fileName);
        return publicUrl;
    }

    window.Upload = {
        uploadFile: uploadFile,
        uploadMultipleFiles: uploadMultipleFiles,
        deleteFile: deleteFile,
        compressImage: compressImage,
        uploadImage: uploadImage,
        migrateBase64ToStorage: migrateBase64ToStorage,
        ensureBucket: ensureBucket,
        BUCKET_NAME: BUCKET_NAME
    };
})();
