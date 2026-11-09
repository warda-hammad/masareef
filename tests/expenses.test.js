const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp, plain } = require('./helpers/env');

function seeded() {
  const app = createApp();
  const a = app.Expenses.add({ amount: 15000, categoryId: 'food', date: '2026-11-09', note: 'فطار' });
  const b = app.Expenses.add({ amount: 5000, categoryId: 'transport', date: '2026-11-08' });
  return { app, a, b };
}

test('add بيحفظ المصروف', () => {
  const { app, a } = seeded();
  assert.ok(a.id);
  assert.equal(app.saved().expenses.length, 2);
  assert.equal(app.Expenses.find(a.id).note, 'فطار');
});

test('update بيعدّل ويحفظ', () => {
  const { app, a } = seeded();
  app.Expenses.update(a.id, { amount: 20000, categoryId: 'food', date: '2026-11-09', note: 'غدا' });
  const saved = app.saved().expenses.find((e) => e.id === a.id);
  assert.equal(saved.amount, 20000);
  assert.equal(saved.note, 'غدا');
});

test('remove ثم restore بيرجّع المصروف', () => {
  const { app, a } = seeded();
  const removed = app.Expenses.remove(a.id);
  assert.equal(app.Expenses.all().length, 1);
  assert.ok(app.Expenses.restore(removed));
  assert.equal(app.saved().expenses.length, 2);
});

test('total و forMonth و groupByDay', () => {
  const { app } = seeded();
  app.Expenses.add({ amount: 999, categoryId: 'food', date: '2026-10-31' });
  assert.equal(app.Expenses.total(app.Expenses.forMonth('2026-11')), 20000);
  assert.deepEqual(plain(app.Expenses.groupByDay(app.Expenses.all()).map((g) => g.date)),
    ['2026-11-09', '2026-11-08', '2026-10-31']);
});

test('lastUsedCategory بترجع فئة آخر مصروف اتضاف', () => {
  const { app } = seeded();
  assert.equal(app.Expenses.lastUsedCategory(), 'transport');
  assert.equal(createApp().Expenses.lastUsedCategory(), 'food');
});

test('لو الحفظ فشل، التغيير بيرجع', () => {
  const { app, a } = seeded();
  app.failWrites();
  assert.equal(app.Expenses.add({ amount: 100, categoryId: 'food', date: '2026-11-09' }), null);
  assert.equal(app.Expenses.all().length, 2);

  assert.equal(app.Expenses.update(a.id, { amount: 1, categoryId: 'rent', date: '2026-01-01' }), null);
  assert.equal(app.Expenses.find(a.id).amount, 15000);

  assert.equal(app.Expenses.remove(a.id), null);
  assert.ok(app.Expenses.find(a.id));
});
