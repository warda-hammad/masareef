const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ROOT, readSw, computeVersion } = require('./helpers/sw-version');

const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const exists = (f) => fs.existsSync(path.join(ROOT, f));
const manifest = JSON.parse(read('manifest.webmanifest'));
const html = read('index.html');
const { VERSION, ASSETS } = readSw();

function pngSize(file) {
  const b = fs.readFileSync(path.join(ROOT, file));
  assert.equal(b.toString('hex', 0, 8), '89504e470d0a1a0a', file + ' مش PNG');
  return b.readUInt32BE(16) + 'x' + b.readUInt32BE(20);
}

/* ---------- manifest والأيقونات ---------- */

test('manifest: البيانات الأساسية للتثبيت', () => {
  assert.equal(manifest.name, 'مصاريفي');
  assert.ok(manifest.short_name && manifest.short_name.length <= 12);
  assert.equal(manifest.lang, 'ar');
  assert.equal(manifest.dir, 'rtl');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './', 'نسبي عشان يشتغل لو الموقع في فولدر فرعي');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.theme_color, '#14121C');
  assert.equal(manifest.background_color, '#14121C');
});

test('manifest: أيقونات 192 و 512 و maskable موجودة بالمقاس الصح', () => {
  const pngs = manifest.icons.filter((i) => i.type === 'image/png');
  for (const icon of pngs) {
    assert.ok(exists(icon.src), icon.src);
    assert.equal(pngSize(icon.src), icon.sizes, icon.src);
  }
  const has = (size, purpose) => pngs.some((i) => i.sizes === size && i.purpose.split(' ').includes(purpose));
  assert.ok(has('192x192', 'any'));
  assert.ok(has('512x512', 'any'));
  assert.ok(has('512x512', 'maskable'));
  manifest.icons.forEach((i) => assert.ok(exists(i.src), i.src));
});

test('apple-touch-icon مقاسه 180', () => {
  assert.equal(pngSize('icons/apple-touch-icon.png'), '180x180');
});

test('index.html فيه رابط الـ manifest والأيقونات وكلهم موجودين', () => {
  assert.match(html, /<link rel="manifest" href="manifest\.webmanifest">/);
  assert.match(html, /<link rel="apple-touch-icon" href="icons\/apple-touch-icon\.png">/);
  assert.match(html, /<meta name="theme-color" content="#14121C">/);
});

test('اختصار "مصروف جديد" بيفتح ./#add', () => {
  assert.ok(manifest.shortcuts.some((s) => s.url === './#add'));
  assert.match(read('js/app.js'), /location\.hash === '#add'/);
});

/* ---------- قايمة الكاش ---------- */

test('ASSETS: كل الملفات موجودة ومفيش تكرار', () => {
  assert.equal(new Set(ASSETS).size, ASSETS.length);
  ASSETS.filter((a) => a !== './').forEach((a) => assert.ok(exists(a), a + ' مش موجود'));
  assert.ok(ASSETS.includes('./') && ASSETS.includes('index.html'));
});

test('ASSETS: فيها كل سكريبت وستايل ولينك في index.html', () => {
  const refs = [...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map((m) => m[1]);
  assert.ok(refs.length > 10);
  refs.forEach((r) => assert.ok(ASSETS.includes(r), r + ' ناقص من ASSETS في sw.js'));
});

test('ASSETS: فيها كل ملفات js والخطوط وأيقونات الـ manifest', () => {
  fs.readdirSync(path.join(ROOT, 'js')).filter((f) => f.endsWith('.js'))
    .forEach((f) => assert.ok(ASSETS.includes('js/' + f), 'js/' + f + ' ناقص من ASSETS'));
  [...read('css/styles.css').matchAll(/url\('\.\.\/([^']+)'\)/g)]
    .forEach((m) => assert.ok(ASSETS.includes(m[1]), m[1] + ' ناقص من ASSETS'));
  manifest.icons.forEach((i) => assert.ok(ASSETS.includes(i.src), i.src));
});

test('VERSION في sw.js متحدّث مع محتوى الملفات', () => {
  const expected = computeVersion(ASSETS);
  assert.equal(VERSION, expected,
    'ملفات اتغيرت والـ VERSION زي ما هو. شغّلي: node tests/helpers/sw-version.js --write');
});

/* ---------- سلوك الـ service worker ---------- */

const BASE = 'https://example.test/app/';

function loadSw() {
  const listeners = {};
  const store = new Map();
  const calls = { fetch: [], claimed: false, skipped: false, inFlight: 0, maxInFlight: 0 };
  const abs = (r) => new URL(typeof r === 'string' ? r : r.url, BASE).href;

  const caches = {
    async open(name) {
      if (!store.has(name)) store.set(name, new Map());
      const m = store.get(name);
      return {
        async add(u) {
          calls.inFlight++;
          calls.maxInFlight = Math.max(calls.maxInFlight, calls.inFlight);
          await null;
          m.set(abs(u), 'cached:' + abs(u));
          calls.inFlight--;
        },
      };
    },
    async keys() { return [...store.keys()]; },
    async delete(name) { return store.delete(name); },
    async match(req, opts) {
      let u = abs(req);
      if (opts && opts.ignoreSearch) u = u.split('?')[0];
      for (const m of store.values()) if (m.has(u)) return m.get(u);
      return undefined;
    },
  };
  const self = {
    addEventListener: (type, fn) => { listeners[type] = fn; },
    location: new URL(BASE + 'sw.js'),
    clients: { claim: async () => { calls.claimed = true; } },
    skipWaiting: () => { calls.skipped = true; },
  };
  const fetch = async (req) => {
    calls.fetch.push(abs(req));
    return 'network:' + abs(req);
  };
  vm.runInContext(read('sw.js'), vm.createContext({ self, caches, fetch, URL }));

  const waitFor = async (type, extra) => {
    let p;
    listeners[type](Object.assign({ waitUntil: (x) => { p = x; } }, extra));
    await p;
  };
  const request = async (url, { method = 'GET', mode = 'no-cors' } = {}) => {
    let p = null;
    listeners.fetch({ request: { url, method, mode }, respondWith: (x) => { p = x; } });
    return p ? await p : 'not-handled';
  };
  return { listeners, store, calls, waitFor, request };
}

test('install بيخزّن كل ASSETS في كاش النسخة دي', async () => {
  const sw = loadSw();
  await sw.waitFor('install');
  const cache = sw.store.get('masareef-' + VERSION);
  assert.ok(cache);
  ASSETS.forEach((a) => assert.ok(cache.has(new URL(a, BASE).href), a));
  assert.equal(sw.calls.maxInFlight, 1, 'الملفات بتتحمّل واحد ورا التاني');
});

test('activate بيمسح كاش النسخ القديمة بس وبيمسك الصفحات', async () => {
  const sw = loadSw();
  await sw.waitFor('install');
  sw.store.set('masareef-v-old', new Map());
  sw.store.set('other-app', new Map());
  await sw.waitFor('activate');
  assert.deepEqual([...sw.store.keys()].sort(), ['masareef-' + VERSION, 'other-app'].sort());
  assert.equal(sw.calls.claimed, true);
});

test('fetch: الملف المتخزن بيرجع من الكاش من غير نت، حتى لو فيه ?query', async () => {
  const sw = loadSw();
  await sw.waitFor('install');
  assert.equal(await sw.request(BASE + 'js/app.js'), 'cached:' + BASE + 'js/app.js');
  assert.equal(await sw.request(BASE + 'css/styles.css?v=2'), 'cached:' + BASE + 'css/styles.css');
  assert.equal(sw.calls.fetch.length, 0);
});

test('fetch: فتح الصفحة بأي رابط بيرجع index.html من الكاش', async () => {
  const sw = loadSw();
  await sw.waitFor('install');
  for (const url of [BASE, BASE + 'index.html', BASE + '?utm=x']) {
    assert.equal(await sw.request(url, { mode: 'navigate' }), 'cached:' + BASE + 'index.html', url);
  }
  assert.equal(sw.calls.fetch.length, 0);
});

test('fetch: الملف اللي مش متخزن بيتجاب من النت', async () => {
  const sw = loadSw();
  await sw.waitFor('install');
  assert.equal(await sw.request(BASE + 'new-file.txt'), 'network:' + BASE + 'new-file.txt');
});

test('fetch: مبيتدخلش في طلبات POST أو مواقع تانية', async () => {
  const sw = loadSw();
  await sw.waitFor('install');
  assert.equal(await sw.request(BASE + 'index.html', { method: 'POST' }), 'not-handled');
  assert.equal(await sw.request('https://cdn.other.test/x.js'), 'not-handled');
});

test('رسالة skip-waiting بس هي اللي بتفعّل النسخة الجديدة', () => {
  const sw = loadSw();
  sw.listeners.message({ data: 'hello' });
  assert.equal(sw.calls.skipped, false);
  sw.listeners.message({ data: 'skip-waiting' });
  assert.equal(sw.calls.skipped, true);
});
