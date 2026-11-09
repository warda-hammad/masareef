const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp, plain } = require('./helpers/env');

const GYM = { name: 'جيم', color: '#60A5FA' };

test('validateName', () => {
  const { Categories } = createApp();
  assert.equal(Categories.validateName(''), 'empty');
  assert.equal(Categories.validateName('   '), 'empty');
  assert.equal(Categories.validateName('ا'.repeat(25)), 'long');
  assert.equal(Categories.validateName('ا'.repeat(24)), null);
  assert.equal(Categories.validateName('أكل'), 'duplicate');
  assert.equal(Categories.validateName('  أكل  '), 'duplicate');
  assert.equal(Categories.validateName('أكل', 'food'), null, 'الفئة نفسها مش بتعتبر تكرار');
  assert.equal(Categories.validateName('جيم'), null);
});

test('validateName: التكرار مش حساس لحالة الحروف', () => {
  const { Categories } = createApp();
  Categories.add({ name: 'Gym', color: '#60A5FA' });
  assert.equal(Categories.validateName('gym'), 'duplicate');
});

test('add بيضيف فئة مخصصة ويحفظها', () => {
  const app = createApp();
  const c = app.Categories.add({ name: '  جيم   والنادي ', color: '#60a5fa' });
  assert.ok(c.id.startsWith('c-'));
  assert.equal(c.name, 'جيم والنادي');
  assert.equal(c.color, '#60A5FA');
  assert.equal(c.builtIn, false);
  assert.equal(app.saved().categories.length, 8);
});

test('add بيرفض الاسم الغلط واللون اللي برا الـ palette', () => {
  const { Categories } = createApp();
  assert.equal(Categories.add({ name: '', color: '#60A5FA' }), null);
  assert.equal(Categories.add({ name: 'أكل', color: '#60A5FA' }), null);
  assert.equal(Categories.add({ name: 'جيم', color: '#123456' }), null);
  assert.equal(Categories.add({ name: 'جيم', color: 'red' }), null);
  assert.equal(Categories.all().length, 7);
});

test('suggestColor بيختار لون مش مستخدم', () => {
  const { Categories } = createApp();
  const used = Categories.all().map((c) => c.color);
  assert.ok(!used.includes(Categories.suggestColor()));
  assert.ok(Categories.isPaletteColor(Categories.suggestColor()));
});

test('update: الفئة الجاهزة يتغير اسمها ولونها', () => {
  const app = createApp();
  const c = app.Categories.update('food', { name: 'أكل وشرب', color: '#A3E635' });
  assert.equal(c.name, 'أكل وشرب');
  assert.equal(c.builtIn, true);
  assert.equal(app.saved().categories.find((x) => x.id === 'food').color, '#A3E635');
  assert.equal(app.Categories.update('food', { name: 'مواصلات', color: '#A3E635' }), null, 'تكرار');
  assert.equal(app.Categories.update('nope', GYM), null);
});

test('remove: الفئة الجاهزة مينفعش تتمسح', () => {
  const { Categories } = createApp();
  assert.equal(Categories.remove('food'), null);
  assert.equal(Categories.remove('other'), null);
  assert.equal(Categories.all().length, 7);
});

test('remove: مصاريف الفئة بتتنقل لـ "تانيين" افتراضياً', () => {
  const app = createApp();
  const gym = app.Categories.add(GYM);
  const e1 = app.Expenses.add({ amount: 300, categoryId: gym.id, date: '2026-11-01' });
  const e2 = app.Expenses.add({ amount: 100, categoryId: 'food', date: '2026-11-01' });
  assert.equal(app.Categories.usageCount(gym.id), 1);

  const snap = app.Categories.remove(gym.id);
  assert.deepEqual(plain(snap.movedIds), [e1.id]);
  assert.equal(snap.movedTo, 'other');
  assert.equal(app.Categories.find(gym.id), null);
  const saved = app.saved();
  assert.equal(saved.expenses.find((e) => e.id === e1.id).categoryId, 'other');
  assert.equal(saved.expenses.find((e) => e.id === e2.id).categoryId, 'food');
});

test('remove: ينفع نختار الفئة اللي المصاريف تتنقل لها', () => {
  const app = createApp();
  const gym = app.Categories.add(GYM);
  const e = app.Expenses.add({ amount: 300, categoryId: gym.id, date: '2026-11-01' });
  app.Categories.remove(gym.id, 'health');
  assert.equal(app.Expenses.find(e.id).categoryId, 'health');
});

test('remove: بيرفض النقل لنفس الفئة أو لفئة مش موجودة', () => {
  const app = createApp();
  const gym = app.Categories.add(GYM);
  assert.equal(app.Categories.remove(gym.id, gym.id), null);
  assert.equal(app.Categories.remove(gym.id, 'nope'), null);
  assert.ok(app.Categories.find(gym.id));
});

test('restore: الفئة بترجع مكانها ومصاريفها بترجع لها', () => {
  const app = createApp();
  const gym = app.Categories.add(GYM);
  const club = app.Categories.add({ name: 'نادي', color: '#F472B6' });
  const e1 = app.Expenses.add({ amount: 300, categoryId: gym.id, date: '2026-11-01' });
  const e2 = app.Expenses.add({ amount: 200, categoryId: gym.id, date: '2026-11-02' });

  const snap = app.Categories.remove(gym.id);
  // اليوزر غيّر فئة مصروف من اللي اتنقلوا قبل ما يدوس تراجع: يفضل زي ما هو
  app.Expenses.update(e2.id, { amount: 200, categoryId: 'rent', date: '2026-11-02' });

  assert.ok(app.Categories.restore(snap));
  const ids = plain(app.Categories.all().map((c) => c.id));
  assert.equal(ids.indexOf(gym.id), ids.indexOf(club.id) - 1);
  assert.equal(app.Expenses.find(e1.id).categoryId, gym.id);
  assert.equal(app.Expenses.find(e2.id).categoryId, 'rent');
  assert.ok(app.saved().categories.some((c) => c.id === gym.id));
});

test('لو الحفظ فشل، الفئات والمصاريف بترجع زي ما كانت', () => {
  const app = createApp();
  const gym = app.Categories.add(GYM);
  const e = app.Expenses.add({ amount: 300, categoryId: gym.id, date: '2026-11-01' });
  app.failWrites();

  assert.equal(app.Categories.add({ name: 'نادي', color: '#F472B6' }), null);
  assert.equal(app.Categories.all().length, 8);

  assert.equal(app.Categories.update(gym.id, { name: 'رياضة', color: '#F472B6' }), null);
  assert.equal(app.Categories.find(gym.id).name, 'جيم');

  assert.equal(app.Categories.remove(gym.id), null);
  assert.ok(app.Categories.find(gym.id));
  assert.equal(app.Expenses.find(e.id).categoryId, gym.id);
});

test('badge: إيموجي للجاهزة وأول حرف للمخصصة', () => {
  const { Categories } = createApp();
  assert.equal(Categories.badge(Categories.find('food')), '🍽️');
  assert.equal(Categories.badge(Categories.add(GYM)), 'ج');
});

test('المصروف بتاع فئة اتمسحت بيتعرض كـ "تانيين"', () => {
  const app = createApp();
  const gym = app.Categories.add(GYM);
  app.Categories.remove(gym.id);
  assert.equal(app.Store.category(gym.id).id, 'other');
});
