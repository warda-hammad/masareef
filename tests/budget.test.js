const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./helpers/env');

const { Budget } = createApp();
const JEN = 100; // جنيه = 100 قرش

test('set و get و clear بيتحفظوا', () => {
  const app = createApp();
  assert.equal(app.Budget.get(), null);
  assert.ok(app.Budget.set(5000 * JEN));
  assert.equal(app.Budget.get(), 5000 * JEN);
  assert.equal(app.saved().settings.budget, 5000 * JEN);
  assert.equal(createApp(app.mem).Budget.get(), 5000 * JEN, 'بعد إعادة التحميل');
  assert.ok(app.Budget.clear());
  assert.equal(app.Budget.get(), null);
  assert.equal('budget' in app.saved().settings, false);
});

test('set بيرفض أي مبلغ مش صحيح', () => {
  const app = createApp();
  for (const bad of [0, -100, 12.5, NaN, '5000', null]) {
    assert.equal(app.Budget.set(bad), false, String(bad));
  }
  assert.equal(app.Budget.get(), null);
});

test('get بيتجاهل قيمة بايظة في التخزين', () => {
  const app = createApp();
  app.Store.state().settings.budget = 'كتير';
  assert.equal(app.Budget.get(), null);
});

test('لو الحفظ فشل، الميزانية بترجع زي ما كانت', () => {
  const app = createApp();
  app.Budget.set(1000 * JEN);
  app.failWrites();
  assert.equal(app.Budget.set(2000 * JEN), false);
  assert.equal(app.Budget.get(), 1000 * JEN);
  assert.equal(app.Budget.clear(), false);
  assert.equal(app.Budget.get(), 1000 * JEN);
});

test('daysInMonth بيحسب فبراير الكبيسة', () => {
  assert.equal(Budget.daysInMonth('2026-11'), 30);
  assert.equal(Budget.daysInMonth('2026-02'), 28);
  assert.equal(Budget.daysInMonth('2028-02'), 29);
  assert.equal(Budget.daysInMonth('2026-12'), 31);
});

test('daysLeft: النهارده محسوب، وشهر فات = 0، وشهر جاي = كل أيامه', () => {
  assert.equal(Budget.daysLeft('2026-11', '2026-11-09'), 22);
  assert.equal(Budget.daysLeft('2026-11', '2026-11-30'), 1);
  assert.equal(Budget.daysLeft('2026-10', '2026-11-09'), 0);
  assert.equal(Budget.daysLeft('2026-12', '2026-11-09'), 31);
});

test('compute: من غير ميزانية المستوى none', () => {
  assert.equal(Budget.compute(5000, null, '2026-11', '2026-11-09').level, 'none');
});

test('compute: أقل من 80% يبقى ok، والمتاح في اليوم محسوب', () => {
  const s = Budget.compute(1000 * JEN, 5000 * JEN, '2026-11', '2026-11-11'); // فاضل 20 يوم
  assert.equal(s.level, 'ok');
  assert.equal(s.percent, 20);
  assert.equal(s.remaining, 4000 * JEN);
  assert.equal(s.daysLeft, 20);
  assert.equal(s.perDay, 200 * JEN);
  assert.equal(s.over, 0);
});

test('compute: حدود التحذير عند 80% و 100%', () => {
  const b = 1000 * JEN;
  assert.equal(Budget.compute(799 * JEN + 99, b, '2026-11', '2026-11-09').level, 'ok');
  assert.equal(Budget.compute(800 * JEN, b, '2026-11', '2026-11-09').level, 'warn');
  assert.equal(Budget.compute(999 * JEN, b, '2026-11', '2026-11-09').level, 'warn');
  const exact = Budget.compute(1000 * JEN, b, '2026-11', '2026-11-09');
  assert.equal(exact.level, 'over');
  assert.equal(exact.over, 0);
  assert.equal(exact.remaining, 0);
});

test('compute: لو الصرف عدّى الميزانية بيرجع المبلغ الزيادة', () => {
  const s = Budget.compute(1250 * JEN, 1000 * JEN, '2026-11', '2026-11-09');
  assert.equal(s.level, 'over');
  assert.equal(s.percent, 125);
  assert.equal(s.over, 250 * JEN);
  assert.equal(s.remaining, 0);
  assert.equal(s.perDay, 0);
});

test('compute: المتاح في اليوم بيتقرّب لتحت عشان ميطلعش أكتر من الباقي', () => {
  const s = Budget.compute(0, 100 * JEN, '2026-11', '2026-11-28'); // 3 أيام
  assert.equal(s.perDay, 3333);
  assert.ok(s.perDay * s.daysLeft <= s.remaining);
});

test('status بيجمع مصاريف الشهر المطلوب بس', () => {
  const app = createApp();
  app.Budget.set(1000 * JEN);
  app.Expenses.add({ amount: 300 * JEN, categoryId: 'food', date: '2026-11-02' });
  app.Expenses.add({ amount: 600 * JEN, categoryId: 'rent', date: '2026-11-05' });
  app.Expenses.add({ amount: 999 * JEN, categoryId: 'rent', date: '2026-10-30' });
  const s = app.Budget.status('2026-11', '2026-11-09');
  assert.equal(s.spent, 900 * JEN);
  assert.equal(s.level, 'warn');
});

test('crossed: بيرجع المستوى بس لما الصرف يطلع لمستوى تحذير جديد', () => {
  const lv = (level) => ({ level });
  assert.equal(Budget.crossed(lv('ok'), lv('warn')), 'warn');
  assert.equal(Budget.crossed(lv('ok'), lv('over')), 'over');
  assert.equal(Budget.crossed(lv('warn'), lv('over')), 'over');
  assert.equal(Budget.crossed(lv('warn'), lv('warn')), null, 'نفس المستوى: مفيش تحذير تاني');
  assert.equal(Budget.crossed(lv('over'), lv('over')), null);
  assert.equal(Budget.crossed(lv('over'), lv('ok')), null, 'نزل: مفيش تحذير');
  assert.equal(Budget.crossed(lv('none'), lv('none')), null);
  assert.equal(Budget.crossed(lv('none'), lv('ok')), null);
});
