'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const netlifyToml = fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8');

function sliceFn(src, name, nextName) {
  const start = src.indexOf(`function ${name}`);
  assert.ok(start >= 0, `missing ${name}`);
  const end = nextName ? src.indexOf(`function ${nextName}`, start + 1) : src.length;
  assert.ok(end > start, `could not bound ${name}`);
  return src.slice(start, end);
}

describe('stored-XSS sinks in log tables', () => {
  it('escapes fuel type, station, notes, and currency before innerHTML', () => {
    const fn = sliceFn(appJs, 'renderFuelLogsTable', 'renderMaintLogsTable');
    assert.match(fn, /escapeHtml\(log\.type\)/);
    assert.match(fn, /escapeHtml\(log\.station\)/);
    assert.match(fn, /escapeHtml\(log\.notes\)/);
    assert.match(fn, /escapeHtml\(state\.settings\.currency\)/);
    assert.equal(fn.includes('${log.type}'), false);
    assert.equal(fn.includes('${log.station}'), false);
    assert.equal(fn.includes('${log.notes}'), false);
    assert.match(fn, /cssToken\(log\.type\)/);
  });

  it('escapes maintenance type and notes before innerHTML', () => {
    const fn = sliceFn(appJs, 'renderMaintLogsTable', 'renderFuelChart');
    assert.match(fn, /escapeHtml\(log\.type\)/);
    assert.match(fn, /escapeHtml\(log\.notes/);
    assert.equal(fn.includes('${log.type}'), false);
    assert.equal(/\$\{log\.notes \|/.test(fn), false);
  });

  it('escapes custom schedule type names and batch filenames', () => {
    const sched = sliceFn(appJs, 'updateMaintenanceStatus', 'getLampId');
    assert.match(sched, /escapeHtml\(type\)/);
    const batch = sliceFn(appJs, 'processBatchFiles', 'readFileAsText');
    assert.match(batch, /escapeHtml\(file\.name\)/);
    assert.match(batch, /escapeHtml\(err\.message\)/);
  });

  it('escapes ride ids used in option values and delete handlers', () => {
    const selectFn = sliceFn(appJs, 'populateFuelRideSelect', 'renderRidesList');
    assert.match(selectFn, /escapeHtml\(ride\.id\)/);
    const listFn = sliceFn(appJs, 'renderRidesList', 'fileLooksLikeGpx');
    assert.match(listFn, /jsStringAttr\(ride\.id\)/);
    assert.equal(listFn.includes("deleteRide('${ride.id}')"), false);
  });
});

describe('CDN pin + CSP', () => {
  it('pins Tesseract worker/core/lang to 5.1.1 in app.js', () => {
    assert.match(appJs, /tesseract\.js@5\.1\.1\/dist\/worker\.min\.js/);
    assert.match(appJs, /tesseract\.js-core@5\.1\.1/);
    assert.match(appJs, /tessdata\.projectnaptha\.com\/4\.0\.0/);
  });

  it('pins Chart.js 4.6.1 and Tesseract.js 5.1.1 with SRI', () => {
    assert.match(indexHtml, /chart\.js@4\.6\.1\/dist\/chart\.umd\.min\.js/);
    assert.match(indexHtml, /tesseract\.js@5\.1\.1\/dist\/tesseract\.min\.js/);
    assert.match(indexHtml, /integrity="sha384-Emf5ZVIUiarAdhkgtqK\+5\/Z5qIvM6QoVrS\+qAVtfyZVuD5lIHrac0me485\+Antp0"/);
    assert.match(indexHtml, /integrity="sha384-GJqSu7vueQ9qN0E9yLPb3Wtpd7OrgK8KmYzC8T1IysG1bcvxvIO4qtYR\/D3A991F"/);
    assert.match(indexHtml, /crossorigin="anonymous"/);
    assert.equal(indexHtml.includes('https://cdn.jsdelivr.net/npm/chart.js"'), false);
    assert.equal(indexHtml.includes('tesseract.js@5/dist/tesseract.min.js'), false);
  });

  it('declares a CSP in the document and Netlify headers', () => {
    assert.match(indexHtml, /http-equiv="Content-Security-Policy"/);
    assert.match(indexHtml, /wasm-unsafe-eval/);
    assert.match(netlifyToml, /Content-Security-Policy/);
    assert.match(netlifyToml, /cdn\.jsdelivr\.net/);
    assert.match(netlifyToml, /tessdata\.projectnaptha\.com/);
  });

  it('loads sanitize.js before app.js', () => {
    const sanitizeAt = indexHtml.indexOf('js/sanitize.js');
    const appAt = indexHtml.indexOf('app.js');
    assert.ok(sanitizeAt >= 0 && appAt > sanitizeAt);
  });
});
