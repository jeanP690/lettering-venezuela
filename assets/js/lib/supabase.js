(function () {
    'use strict';

    var SUPABASE_URL = 'https://zufcrtwiifbguryjjirv.supabase.co';
    var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1ZmNydHdpaWZiZ3VyeWpqaXJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNjA3NTEsImV4cCI6MjA5NDYzNjc1MX0.Bc-UtF7lbdyMymFFyMSecagEVTWEtuAYs82RzTqor44';

    var SUPABASE_ANON_KEY_STORAGE_KEY = 'sb_anon_key';

    function getAnonKey() {
        var stored = localStorage.getItem(SUPABASE_ANON_KEY_STORAGE_KEY);
        if (stored) return stored;
        return SUPABASE_ANON_KEY;
    }

    function setAnonKey(key) {
        SUPABASE_ANON_KEY = key;
        localStorage.setItem(SUPABASE_ANON_KEY_STORAGE_KEY, key);
        initClient();
    }

    var supabaseClient = null;

    function initClient() {
        var key = getAnonKey();
        if (!key) {
            console.warn('Supabase: No hay anon key configurada. Usa Supabase.setAnonKey(key)');
            supabaseClient = null;
            return;
        }
        if (typeof supabase === 'undefined') {
            console.error('Supabase: La librería @supabase/supabase-js no está cargada.');
            return;
        }
        supabaseClient = supabase.createClient(SUPABASE_URL, key, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true
            }
        });
    }

    function getClient() {
        if (!supabaseClient) initClient();
        return supabaseClient;
    }

    async function ensureSession() {
        var client = getClient();
        if (!client) return null;
        var { data: { session }, error } = await client.auth.getSession();
        if (error || !session) return null;
        return session;
    }

    window.Supabase = {
        getClient: getClient,
        getAnonKey: getAnonKey,
        setAnonKey: setAnonKey,
        ensureSession: ensureSession,
        initClient: initClient
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initClient);
    } else {
        initClient();
    }
})();
