const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp, plain } = require('./helpers/env');

const { Stats } = createApp();
const JEN = 100;

function seeded() {
  const app = createApp();
  const add = (amount, categoryId, date) => app.Expenses.add({ amount: amount * JEN, categoryId, date });
  add(300, 'food', '2026-11-01');
  add(200, 'food', '2026-11-01');
  add(1000, 'rent', '2026-11-05');
  add(100, 'transport', '2026-11-09');
  add(800, 'food', '2026-10-15');
  return app;
}

test('shiftMonth بيعدّي السنة صح', () => {
  assert.equal(Stats.shiftMonth('2026-11', -1), '2026-10');
  assert.equal(Stats.shiftMonth('2026-01', -1), '2025-12');
  assert.equal(Stats.shiftMonth('2026-12', 1), '2027-01');
  assert.equal(Stats.shiftMonth('2026-11', 0), '2026-11');
});

test('elapsedDays: النهارده محسوب، وشهر فات = كل أيامه، وشهر جاي = 0', () => {
  assert.equal(Stats.elapsedDays('2026-11', '2026-11-09'), 9);
  assert.equal(Stats.elapsedDays('2026-10', '2026-11-09'), 31);
  assert.equal(Stats.elapsedDays('2026-12', '2026-11-09'), 0);
});

test('byCategory: مترتبة من الأكبر ومعاها النسبة والعدد', () => {
  const app = seeded();
  const rows = plain(app.Stats.byCategory(app.Expenses.forMonth('2026-11')));
  assert.deepEqual(rows.map((r) => r.categoryId), ['rent', 'food', 'transport']);
  assert.equal(rows[1].total, 500 * JEN);
  assert.equal(rows[1].count, 2);
  assert.equal(rows[0].share, 1000 / 1600);
  assert.equal(rows.reduce((s, r) => s + r.share, 0), 1);
});

test('byCategory: لو اتساووا بيمشوا بترتيب الفئات', () => {
  const app = createApp();
  app.Expenses.add({ amount: 100, categoryId: 'health', date: '2026-11-01' });
  app.Expenses.add({ amount: 100, categoryId: 'food', date: '2026-11-01' });
  const ids = plain(app.Stats.byCategory(app.Expenses.all()).map((r) => r.categoryId));
  assert.deepEqual(ids, ['food', 'health']);
});

test('byCategory: مصاريف فئة اتمسحت بتتجمع تحت "تانيين"', () => {
  const app = createApp();
  app.Store.state().expenses.push({ id: 'x', amount: 500, categoryId: 'deleted', date: '2026-11-01', createdAt: 0 });
  app.Expenses.add({ amount: 200, categoryId: 'other', date: '2026-11-01' });
  const rows = plain(app.Stats.byCategory(app.Expenses.all()));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].categoryId, 'other');
  assert.equal(rows[0].total, 700);
});

test('byDay: يوم لكل يوم في الشهر', () => {
  const app = seeded();
  const days = plain(app.Stats.byDay(app.Expenses.forMonth('2026-11'), '2026-11'));
  assert.equal(days.length, 30);
  assert.deepEqual(days[0], { day: 1, date: '2026-11-01', total: 500 * JEN, count: 2 });
  assert.equal(days[1].total, 0);
  assert.equal(days[8].total, 100 * JEN);
  assert.equal(app.Stats.byDay([], '2028-02').length, 29);
});

test('summary: الإجمالي والمقارنة وأكبر فئة والمتوسط اليومي', () => {
  const app = seeded();
  const s = plain(app.Stats.summary('2026-11', '2026-11-09'));
  assert.equal(s.total, 1600 * JEN);
  assert.equal(s.count, 4);
  assert.equal(s.prevYm, '2026-10');
  assert.equal(s.prevTotal, 800 * JEN);
  assert.equal(s.deltaPct, 100);
  assert.equal(s.top.categoryId, 'rent');
  assert.equal(s.elapsedDays, 9);
  assert.equal(s.dailyAvg, Math.round((1600 * JEN) / 9));
});

test('summary: من غير شهر فات للمقارنة deltaPct = null', () => {
  const app = seeded();
  const s = app.Stats.summary('2026-10', '2026-11-09');
  assert.equal(s.deltaPct, null);
  assert.equal(s.dailyAvg, Math.round((800 * JEN) / 31));
});

test('summary: الصرف قل عن الشهر اللي فات', () => {
  const app = createApp();
  app.Expenses.add({ amount: 1000, categoryId: 'food', date: '2026-10-01' });
  app.Expenses.add({ amount: 750, categoryId: 'food', date: '2026-11-01' });
  assert.equal(app.Stats.summary('2026-11', '2026-11-09').deltaPct, -25);
});

test('summary: شهر فاضي', () => {
  const app = createApp();
  const s = app.Stats.summary('2026-12', '2026-11-09');
  assert.equal(s.total, 0);
  assert.equal(s.top, null);
  assert.equal(s.dailyAvg, 0);
});

test('monthRange: من أقدم مصروف لحد الشهر الحالي أو آخر مصروف', () => {
  const app = seeded();
  assert.deepEqual(plain(app.Stats.monthRange('2026-11-09')), { min: '2026-10', max: '2026-11' });
  app.Expenses.add({ amount: 100, categoryId: 'rent', date: '2027-01-01' });
  assert.equal(app.Stats.monthRange('2026-11-09').max, '2027-01');
  assert.deepEqual(plain(createApp().Stats.monthRange('2026-11-09')), { min: '2026-11', max: '2026-11' });
});

test('niceScale: تقسيمات نضيفة بتغطي أكبر قيمة', () => {
  assert.deepEqual(plain(Stats.niceScale(1600, 3)), { max: 2000, step: 1000, ticks: [0, 1000, 2000] });
  assert.deepEqual(plain(Stats.niceScale(750, 3)).ticks, [0, 250, 500, 750]);
  assert.deepEqual(plain(Stats.niceScale(85.5, 3)).ticks, [0, 50, 100]);
  assert.deepEqual(plain(Stats.niceScale(3, 3)).ticks, [0, 1, 2, 3]);
  assert.deepEqual(plain(Stats.niceScale(0.45, 3)).ticks, [0, 0.2, 0.4, 0.6]);
  assert.deepEqual(plain(Stats.niceScale(0)).ticks, [0, 1]);
});

test('niceScale: الحد الأعلى دايماً >= أكبر قيمة وعدد التقسيمات معقول', () => {
  for (const max of [1, 7, 33, 99, 101, 999, 1234, 4335.5, 98765, 1e6 + 1]) {
    const s = Stats.niceScale(max, 3);
    assert.ok(s.max >= max, String(max));
    assert.ok(s.ticks.length >= 2 && s.ticks.length <= 6, max + ' → ' + s.ticks.length);
    assert.equal(s.ticks[s.ticks.length - 1], s.max);
  }
});
