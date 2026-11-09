const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ROOT } = require('../scripts/sw-version');
const { siteFiles, resolveOutDir, checkVersion, copyTo } = require('../scripts/build-site');

const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const HTML_PAGES = ['index.html', 'privacy.html'];
const cspOf = (html) => (html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1];

test('ملفات الموقع: من غير اختبارات ولا ملفات داخلية، ومعاها تراخيص الخطوط', () => {
  const files = siteFiles();
  assert.ok(files.includes('index.html') && files.includes('privacy.html') && files.includes('sw.js'));
  assert.ok(files.includes('fonts/OFL-Alexandria.txt') && files.includes('fonts/OFL-JetBrainsMono.txt'));
  for (const f of files) {
    assert.ok(!/^(tests|scripts|\.github|log|shots)\//.test(f) && f !== 'CLAUDE.md', f);
    assert.ok(fs.existsSync(path.join(ROOT, f)), f);
  }
});

test('resolveOutDir: فولدر بسيط جوه المشروع بس (عشان build بيمسحه قبل النسخ)', () => {
  assert.equal(resolveOutDir(), path.join(ROOT, '_site'));
  assert.equal(resolveOutDir('_site'), path.join(ROOT, '_site'));
  assert.equal(resolveOutDir('public'), path.join(ROOT, 'public'));
  for (const bad of ['.', '..', '...', '../x', 'a/b', 'a\\b', '.hidden', '-x', path.join(os.tmpdir(), 'x'), 'C:\\x', '/tmp']) {
    assert.throws(() => resolveOutDir(bad), undefined, bad);
  }
});

test('checkVersion: الـ VERSION متحدّث قبل النشر', () => {
  assert.doesNotThrow(checkVersion);
});

test('copyTo بينسخ الملفات زي ما هي بالظبط', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'masareef-site-'));
  try {
    const files = copyTo(out);
    files.forEach((f) => assert.ok(fs.readFileSync(path.join(out, f)).equals(fs.readFileSync(path.join(ROOT, f))), f));
    assert.ok(fs.existsSync(path.join(out, '.nojekyll')));
    assert.ok(!fs.existsSync(path.join(out, 'tests')));
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('كل صفحة HTML عليها نفس CSP، ومن غير سكريبت أو ستايل inline', () => {
  const csp = cspOf(read('index.html'));
  assert.ok(csp && csp.includes("default-src 'self'") && csp.includes("script-src 'self'"));
  assert.ok(!/unsafe-inline|unsafe-eval|https?:/.test(csp), 'مفيش استثناءات ولا مواقع تانية');
  for (const page of HTML_PAGES) {
    const html = read(page);
    assert.equal(cspOf(html), csp, page);
    assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/.test(html), page + ': فيه <script> inline');
    assert.ok(!/\sstyle="/.test(html) && !/<style/.test(html), page + ': فيه style inline');
    assert.ok(!/\son[a-z]+="/.test(html), page + ': فيه onclick وأخواتها');
    assert.ok(!/(src|href)="https?:/.test(html), page + ': بيحمّل حاجة من موقع تاني');
  }
});

test('netlify.toml: بيشغّل الاختبارات وينشر _site بنفس الـ CSP ومعاها frame-ancestors', () => {
  const toml = read('netlify.toml');
  assert.match(toml, /command = "node --test && node scripts\/build-site\.js _site"/);
  assert.match(toml, /publish = "_site"/);
  const header = (toml.match(/Content-Security-Policy = "([^"]+)"/) || [])[1];
  assert.equal(header, cspOf(read('index.html')) + "; frame-ancestors 'none'");
  assert.match(toml, /for = "\/sw\.js"[\s\S]*?Cache-Control = "no-cache"/);
});

test('GitHub Pages workflow: اختبارات ثم build ثم نشر الـ artifact', () => {
  const yml = read('.github/workflows/pages.yml');
  const steps = ['node --test', 'node scripts/build-site.js _site', 'actions/upload-pages-artifact', 'actions/deploy-pages'];
  let at = -1;
  for (const s of steps) {
    const i = yml.indexOf(s, at + 1);
    assert.ok(i > at, s + ' مش موجودة أو مش بالترتيب');
    at = i;
  }
  assert.match(yml, /pages: write/);
  assert.match(yml, /id-token: write/);
  assert.match(yml, /path: _site/);
});

test('_site متجاهل في git', () => {
  assert.match(read('.gitignore'), /^_site\/$/m);
});

test('الصفحتين بيربطوا ببعض', () => {
  assert.match(read('index.html'), /href="privacy\.html"/);
  assert.match(read('privacy.html'), /href="index\.html"/);
});
