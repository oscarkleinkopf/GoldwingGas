/* GoldwingGas — HTML/JS escaping for user-controlled strings (browser + Node). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.escapeHtml = api.escapeHtml;
    root.jsStringAttr = api.jsStringAttr;
    root.cssToken = api.cssToken;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const HTML_CHARS = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (ch) => HTML_CHARS[ch]);
  }

  /** Safe JS string literal for a double-quoted HTML event-handler attribute. */
  function jsStringAttr(value) {
    return escapeHtml(JSON.stringify(String(value == null ? '' : value)));
  }

  /** Restrict a string to a single CSS class token. */
  function cssToken(str) {
    return String(str == null ? '' : str).toLowerCase().replace(/[^a-z0-9_-]+/g, '');
  }

  return { escapeHtml, jsStringAttr, cssToken };
});
