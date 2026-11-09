const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp, plain, KEY } = require('./helpers/env');

test('أول مرة: 7 فئات جاهزة ومفيش مصاريف', () => {
  const app = createApp();
  assert.equal(app.Store.categories().length, 7);
  assert.ok(app.Store.categories().every((c) => c.builtIn));
  assert.equal(app.Store.state().expenses.length, 0);
  assert.equal(app.Store.error(), null);
});

test('الداتا بتفضل بعد إعادة التحميل', () => {
  const app = createApp();
  app.Expenses.add({ amount: 1000, categoryId: 'food', date: '2026-11-09' });
  const again = createApp(app.mem);
  assert.equal(again.Expenses.all().length, 1);
});

test('داتا بايظة: بتتاخد منها نسخة وما بيتكتبش فوقها', () => {
  const app = createApp({ [KEY]: '{broken' });
  assert.equal(app.Store.error(), 'corrupt');
  const backups = Object.keys(app.mem).filter((k) => k.startsWith(KEY + '.corrupt.'));
  assert.equal(backups.length, 1);
  assert.equal(app.mem[backups[0]], '{broken');
});

test('التخزين مقفول: التطبيق بيشتغل في الذاكرة بس', () => {
  const app = createApp();
  app.blockStorage();
  app.Store.load();
  assert.equal(app.Store.error(), 'unavailable');
  assert.ok(app.Expenses.add({ amount: 500, categoryId: 'food', date: '2026-11-09' }));
});

test('migrate: بيشيل المصاريف والفئات البايظة ويرجّع الفئات الجاهزة الناقصة', () => {
  const data = {
    version: 1,
    settings: {},
    expenses: [
      { id: 'ok', amount: 100, categoryId: 'food', date: '2026-11-09', createdAt: 1 },
      { id: 'bad-amount', amount: -5, categoryId: 'food', date: '2026-11-09' },
      { id: 'bad-date', amount: 100, categoryId: 'food', date: '9/11/2026' },
    ],
    categories: [
      { id: 'c-gym', name: 'جيم', color: '#60A5FA', builtIn: false },
      { id: 'c-bad', name: 'لون غلط', color: 'red;background:url(x)' },
      { id: '', name: 'من غير id', color: '#60A5FA' },
    ],
  };
  const app = createApp({ [KEY]: JSON.stringify(data) });
  assert.deepEqual(plain(app.Expenses.all().map((e) => e.id)), ['ok']);
  const ids = plain(app.Store.categories().map((c) => c.id));
  assert.ok(ids.includes('c-gym'));
  assert.ok(!ids.includes('c-bad'));
  assert.equal(ids.length, 8, 'جيم + 7 جاهزين');
});

test('Store.category بيرجع "تانيين" لو الفئة مش موجودة', () => {
  const app = createApp();
  assert.equal(app.Store.category('مش موجودة').id, 'other');
});

test('clearAll: بيمسح بيانات التطبيق ونسخها الاحتياطية بس', () => {
  const app = createApp({ 'other-app': 'x', [KEY + '.corrupt.1']: '{bad' });
  app.Expenses.add({ amount: 1000, categoryId: 'food', date: '2026-11-09' });
  app.Categories.add({ name: 'جيم', color: '#60A5FA' });
  app.Budget.set(500000);
  assert.ok(app.Store.clearAll());
  assert.deepEqual(Object.keys(app.mem), ['other-app']);
  assert.equal(app.Expenses.all().length, 0);
  assert.equal(app.Store.categories().length, 7);
  assert.equal(app.Budget.get(), null);
  assert.equal(app.Store.error(), null);
  assert.equal(createApp(app.mem).Expenses.all().length, 0, 'بعد إعادة التحميل');
});

test('clearAll: بعد مسح داتا بايظة التطبيق بيحفظ عادي تاني', () => {
  const app = createApp({ [KEY]: '{broken' });
  assert.equal(app.Store.error(), 'corrupt');
  assert.ok(app.Store.clearAll());
  app.Expenses.add({ amount: 100, categoryId: 'food', date: '2026-11-09' });
  assert.equal(app.saved().expenses.length, 1);
});

test('clearAll: لو المتصفح رفض المسح بيرجع false ومبيلمسش الداتا', () => {
  const app = createApp();
  app.Expenses.add({ amount: 1000, categoryId: 'food', date: '2026-11-09' });
  app.failRemoves();
  assert.equal(app.Store.clearAll(), false);
  assert.equal(app.Expenses.all().length, 1);
  assert.ok(app.mem[KEY]);
});

test('clearAll: التخزين مقفول من الأول، فبيصفّر الذاكرة بس', () => {
  const app = createApp();
  app.blockStorage();
  app.Store.load();
  app.Expenses.add({ amount: 1000, categoryId: 'food', date: '2026-11-09' });
  assert.ok(app.Store.clearAll());
  assert.equal(app.Expenses.all().length, 0);
});
