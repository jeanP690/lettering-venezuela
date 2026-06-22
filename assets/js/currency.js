(function () {
    'use strict';

    var DEFAULT_TASA = 36.5;
    var API_URL = 'https://ve.dolarapi.com/v1/dolares';

    var _mode = 'manual';
    var _rate = DEFAULT_TASA;
    var _source = 'oficial';
    var _lastUpdate = '';

    var _initialized = false;
    var _initCallbacks = [];

    function onInit(cb) {
        if (_initialized) { cb(); return; }
        _initCallbacks.push(cb);
    }

    async function loadFromDB() {
        if (window.DB && typeof window.DB.getExchangeRate === 'function') {
            try {
                var cfg = await window.DB.getExchangeRate();
                _mode = cfg.mode;
                _rate = cfg.rate;
                _source = cfg.source;
                return true;
            } catch (e) { /* fallback */ }
        }
        return false;
    }

    function loadFromLocal() {
        _mode = localStorage.getItem('modoTasa') === 'auto' ? 'auto' : 'manual';
        _source = localStorage.getItem('fuenteTasa') === 'paralelo' ? 'paralelo' : 'oficial';
        _lastUpdate = localStorage.getItem('ultimaActualizacionTasa') || '';
        if (_mode === 'auto') {
            var v = parseFloat(localStorage.getItem('tasaAuto'));
            _rate = isNaN(v) || v <= 0 ? DEFAULT_TASA : v;
        } else {
            var v = parseFloat(localStorage.getItem('tasaCambio'));
            _rate = isNaN(v) || v <= 0 ? DEFAULT_TASA : v;
        }
    }

    async function init() {
        var loaded = await loadFromDB();
        if (!loaded) loadFromLocal();
        _initialized = true;
        _initCallbacks.forEach(function (cb) { cb(); });
        _initCallbacks = [];
    }

    function dispatchTasaCambiada() {
        document.dispatchEvent(new CustomEvent('tasaCambiada', { detail: { tasa: _rate } }));
    }

    function getModo() { return _mode; }
    function setModo(modo) {
        _mode = modo;
        localStorage.setItem('modoTasa', modo);
        saveToDB();
        dispatchTasaCambiada();
    }

    function getFuente() { return _source; }
    function setFuente(fuente) {
        _source = fuente;
        localStorage.setItem('fuenteTasa', fuente);
        if (_mode === 'auto') {
            saveToDB();
            dispatchTasaCambiada();
        }
    }

    function getTasa() { return _rate; }

    function setTasa(tasa) {
        if (isNaN(tasa) || tasa <= 0) return false;
        _rate = tasa;
        localStorage.setItem('tasaCambio', String(tasa));
        saveToDB();
        dispatchTasaCambiada();
        return true;
    }

    function setTasaAuto(tasa) {
        _rate = tasa;
        localStorage.setItem('tasaAuto', String(tasa));
    }

    function getUltimaActualizacion() { return _lastUpdate; }

    async function saveToDB() {
        if (window.DB && typeof window.DB.saveExchangeRate === 'function') {
            try {
                await window.DB.saveExchangeRate({ mode: _mode, rate: _rate, source: _source });
            } catch (e) { /* ignore */ }
        }
    }

    function fetchTasaAPI() {
        return fetch(API_URL)
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var entry = data.find(function (d) { return d.fuente === _source; });
                if (!entry || !entry.promedio || entry.promedio <= 0) {
                    entry = data.find(function (d) { return d.fuente === 'oficial'; });
                }
                if (entry && entry.promedio && entry.promedio > 0) {
                    setTasaAuto(entry.promedio);
                    _lastUpdate = entry.fechaActualizacion || new Date().toISOString();
                    localStorage.setItem('ultimaActualizacionTasa', _lastUpdate);
                    saveToDB();
                    dispatchTasaCambiada();
                    return { tasa: entry.promedio, fecha: entry.fechaActualizacion, fuente: entry.fuente };
                }
                throw new Error('No se pudo obtener la tasa de cambio');
            });
    }

    function usdToBs(usd) {
        return parseFloat(usd || 0) * _rate;
    }

    function formatUSD(amount) {
        var n = parseFloat(amount || 0);
        return '$' + n.toFixed(2);
    }

    function formatBS(amount) {
        var n = parseFloat(amount || 0);
        return 'Bs. ' + n.toFixed(2);
    }

    function formatDual(usd) {
        return formatUSD(usd) + ' / ' + formatBS(usdToBs(usd));
    }

    window.Currency = {
        init: init,
        onInit: onInit,
        getTasa: getTasa,
        setTasa: setTasa,
        getModo: getModo,
        setModo: setModo,
        getFuente: getFuente,
        setFuente: setFuente,
        fetchTasaAPI: fetchTasaAPI,
        getUltimaActualizacion: getUltimaActualizacion,
        usdToBs: usdToBs,
        formatUSD: formatUSD,
        formatBS: formatBS,
        formatDual: formatDual
    };

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
