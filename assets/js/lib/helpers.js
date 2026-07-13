(function () {
    'use strict';
    if (!window.escapeHtml) {
        window.escapeHtml = function escapeHtml(s) {
            return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
        };
    }
    if (!window.escapeAttr) {
        window.escapeAttr = function escapeAttr(s) {
            return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, "\\'").replace(/</g, '&lt;').replace(/>/g, '&gt;');
        };
    }
})();
