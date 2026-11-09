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
