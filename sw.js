/* Service worker: بيخزّن كل ملفات التطبيق عشان يشتغل من غير نت (cache-first).
   VERSION = hash لمحتوى الملفات. بعد أي تعديل في ملف من ASSETS:
   node scripts/sw-version.js --write */
const VERSION = 'v-c512759e18';
const CACHE = 'masareef-' + VERSION;

const ASSETS = [
  './',
  'index.html',
  'privacy.html',
  'manifest.webmanifest',
  'css/styles.css',
  'js/storage.js',
  'js/format.js',
  'js/expenses.js',
  'js/categories.js',
  'js/budget.js',
  'js/stats.js',
  'js/filters.js',
  'js/csv.js',
  'js/dom.js',
  'js/charts.js',
  'js/app.js',
  'fonts/Alexandria-Variable.ttf',
  'fonts/JetBrainsMono-Variable.ttf',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
];

// ملف ورا التاني مش addAll: السيرفرات الصغيرة (زي python -m http.server) بترفض
// الاتصالات لو اتفتح منها كتير في نفس الوقت، وساعتها التثبيت كله بيفشل
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) =>
    ASSETS.reduce((done, asset) => done.then(() => cache.add(asset)), Promise.resolve())));
});

// بيمسح الكاش القديم بتاع النسخ اللي فاتت بس (اللي اسمها بيبدأ بـ masareef-)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((k) => k.startsWith('masareef-') && k !== CACHE)
        .map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// الصفحة بتبعت 'skip-waiting' لما اليوزر يدوس "تحديث"
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  // فتح صفحة: الصفحة نفسها من الكاش (index.html أو privacy.html، حتى لو فيها ?x)،
  // ولو مش متخزنة نرجع index.html عشان التطبيق يفتح من غير نت
  if (req.mode === 'navigate') {
    event.respondWith(caches.match(req, { ignoreSearch: true })
      .then((hit) => hit || caches.match('index.html'))
      .then((hit) => hit || fetch(req)));
    return;
  }
  event.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
});
