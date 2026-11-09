const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp, plain } = require('./helpers/env');

const { Filters } = createApp();

function seeded() {
  const app = createApp();
  const add = (amount, categoryId, date, note) => app.Expenses.add({ amount, categoryId, date, note });
  add(8550, 'food', '2026-11-09', 'فطار فول وطعمية');
  add(2500, 'transport', '2026-11-09', 'أوبر للشغل');
  add(450000, 'rent', '2026-11-01', 'إيجار الشقة');
  add(4000, 'food', '2026-10-20', 'قهوة مع صحابي');
  add(32075, 'bills', '2026-10-05', '');
  const ids = (f) => plain(app.Filters.apply(app.Expenses.all(), app.Filters.clean(f)).map((e) => e.note || e.categoryId));
  return { app, ids };
}

test('normalize بيوحّد الحروف العربية ويشيل التشكيل', () => {
  assert.equal(Filters.normalize('  أكْــل  '), 'اكل');
  assert.equal(Filters.normalize('إيجار'), 'ايجار');
  assert.equal(Filters.normalize('آخر'), 'اخر');
  assert.equal(Filters.normalize('قهوة'), 'قهوه');
  assert.equal(Filters.normalize('مستشفى'), 'مستشفي');
  assert.equal(Filters.normalize('Uber  ١٢'), 'uber 12');
});

test('من غير فلتر كل المصاريف بتظهر', () => {
  const { ids } = seeded();
  assert.equal(ids({}).length, 5);
  assert.equal(Filters.isActive(Filters.clean({})), false);
  assert.equal(Filters.isActive(Filters.clean({ q: '   ' })), false, 'مسافات بس مش فلتر');
});

test('البحث في الملاحظات من غير ما يفرق في الهمزة والتاء المربوطة', () => {
  const { ids } = seeded();
  assert.deepEqual(ids({ q: 'فطار' }), ['فطار فول وطعمية']);
  assert.deepEqual(ids({ q: 'اوبر' }), ['أوبر للشغل']);
  assert.deepEqual(ids({ q: 'قهوه' }), ['قهوة مع صحابي']);
  assert.deepEqual(ids({ q: 'xyz' }), []);
});

test('البحث بيدوّر في اسم الفئة كمان', () => {
  const { ids } = seeded();
  assert.deepEqual(ids({ q: 'فواتير' }), ['bills']);
  assert.equal(ids({ q: 'اكل' }).length, 2);
});

test('كل كلمة في البحث لازم تكون موجودة', () => {
  const { ids } = seeded();
  assert.deepEqual(ids({ q: 'فول طعمية' }), ['فطار فول وطعمية']);
  assert.deepEqual(ids({ q: 'فول قهوة' }), []);
});

test('فلتر الشهر والفئة ومعاهم البحث', () => {
  const { ids } = seeded();
  assert.equal(ids({ month: '2026-11' }).length, 3);
  assert.deepEqual(ids({ cat: 'food' }).sort(), ['فطار فول وطعمية', 'قهوة مع صحابي'].sort());
  assert.deepEqual(ids({ month: '2026-10', cat: 'food' }), ['قهوة مع صحابي']);
  assert.deepEqual(ids({ month: '2026-11', cat: 'food', q: 'قهوة' }), []);
});

test('فلتر "تانيين" بيلم مصاريف الفئات اللي اتمسحت', () => {
  const app = createApp();
  const gym = app.Categories.add({ name: 'جيم', color: '#60A5FA' });
  const e = app.Expenses.add({ amount: 100, categoryId: gym.id, date: '2026-11-01' });
  app.Store.state().categories.splice(app.Store.state().categories.indexOf(gym), 1); // كأنها اتشالت من غير نقل
  const shown = app.Filters.apply(app.Expenses.all(), app.Filters.clean({ cat: 'other' }));
  assert.equal(shown.length, 1);
  assert.equal(shown[0].id, e.id);
});

test('serialize و parse بيرجعوا نفس الفلتر', () => {
  const f = Filters.clean({ q: 'فطار & عشا', month: '2026-11', cat: 'food' });
  const hash = Filters.serialize(f);
  assert.equal(hash.startsWith('month=2026-11&cat=food&q='), true);
  assert.deepEqual(plain(Filters.parse('#' + hash)), plain(f));
  assert.equal(Filters.serialize(Filters.clean({})), '');
  assert.equal(Filters.serialize(Filters.clean({ q: '  ' })), '');
});

test('parse بيتجاهل أي حاجة غلط في الرابط', () => {
  assert.deepEqual(plain(Filters.parse('')), { q: '', month: '', cat: '' });
  assert.deepEqual(plain(Filters.parse('#dashboard')), { q: '', month: '', cat: '' });
  assert.equal(Filters.parse('#month=2026-13').month, '');
  assert.equal(Filters.parse('#month=نوفمبر').month, '');
  assert.equal(Filters.parse('#q=%E0%A4%A').q, '', '% مكسورة');
  assert.equal(Filters.parse('#q=100%25&x=1').q, '100%');
  assert.equal(Filters.parse('#q=a+b').q, 'a b');
  assert.equal(Filters.parse('#q=' + 'ا'.repeat(300)).q.length, 100);
});

test('monthOptions من الأحدث للأقدم ومعاها الشهر المختار لو برا المدى', () => {
  const range = { min: '2026-09', max: '2026-11' };
  assert.deepEqual(plain(Filters.monthOptions(range)), ['2026-11', '2026-10', '2026-09']);
  assert.deepEqual(plain(Filters.monthOptions(range, '2025-12')), ['2026-11', '2026-10', '2026-09', '2025-12']);
  assert.deepEqual(plain(Filters.monthOptions(range, '2026-10')), ['2026-11', '2026-10', '2026-09']);
  assert.deepEqual(plain(Filters.monthOptions({ min: '2025-12', max: '2026-01' })), ['2026-01', '2025-12']);
});
