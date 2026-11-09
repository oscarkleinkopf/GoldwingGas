'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { escapeHtml, jsStringAttr, cssToken } = require('../js/sanitize.js');

describe('escapeHtml', () => {
  it('neutralizes a stored-XSS payload used as log notes/station/type', () => {
    const payload = '<img src=x onerror=alert(1)>';
    assert.equal(escapeHtml(payload), '&lt;img src=x onerror=alert(1)&gt;');
    const html = `<td><span class="tag-badge">${escapeHtml(payload)}</span><p>${escapeHtml(payload)}</p></td>`;
    assert.doesNotMatch(html, /<img\b/i);
    assert.equal(html.includes('&lt;img src=x onerror=alert(1)&gt;'), true);
  });

  it('escapes quotes so attribute breakout fails', () => {
    const payload = '" onclick="alert(1)';
    assert.equal(escapeHtml(payload), '&quot; onclick=&quot;alert(1)');
    const html = `<option value="${escapeHtml(payload)}">x</option>`;
    assert.doesNotMatch(html, /value="[^"]*"\s+onclick=/);
  });

  it('treats nullish values as empty string', () => {
    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(undefined), '');
  });

  it('does not alter ordinary Spanish log text', () => {
    assert.equal(escapeHtml('Copec 95 / Turismo'), 'Copec 95 / Turismo');
  });
});

describe('jsStringAttr', () => {
  it('keeps a crafted ride id from breaking an onclick handler', () => {
    const id = '\');alert(1);//';
    const raw = `deleteRide(${jsStringAttr(id)})`;
    const decoded = raw
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
    assert.equal(decoded, `deleteRide(${JSON.stringify(id)})`);
    assert.equal(decoded.includes("deleteRide('');alert(1)"), false);
  });
});

describe('cssToken', () => {
  it('strips characters that could break out of a class attribute', () => {
    assert.equal(cssToken('"><img src=x onerror=alert(1)>'), 'imgsrcxonerroralert1');
    assert.equal(cssToken('Turismo'), 'turismo');
  });
});
