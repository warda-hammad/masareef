const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./helpers/env');

const { Fmt } = createApp();

test('parseAmount: أرقام عادية وكسور بتتحول لقروش', () => {
  assert.equal(Fmt.parseAmount('150'), 15000);
  assert.equal(Fmt.parseAmount('75.5'), 7550);
  assert.equal(Fmt.parseAmount('75.50'), 7550);
  assert.equal(Fmt.parseAmount('.5'), 50);
  assert.equal(Fmt.parseAmount('  20 '), 2000);
});

test('parseAmount: بيقبل الأرقام العربية والفواصل', () => {
  assert.equal(Fmt.parseAmount('١٢٥٠٫٧٥'), 125075);
  assert.equal(Fmt.parseAmount('۱۲'), 1200);
  assert.equal(Fmt.parseAmount('1,250'), 125000);
  assert.equal(Fmt.parseAmount('١٬٢٥٠'), 125000);
});

test('parseAmount: بيرفض أي حاجة مش مبلغ صحيح أكبر من صفر', () => {
  for (const bad of ['', '0', '0.00', 'abc', '1.234', '-5', '1e3', '12ج']) {
    assert.equal(Fmt.parseAmount(bad), null, bad);
  }
  assert.equal(Fmt.parseAmount('100000001'), null, 'أكبر من الحد الأقصى');
});

test('moneyNumber و amountForInput', () => {
  assert.equal(Fmt.moneyNumber(125075), '1,250.75');
  assert.equal(Fmt.moneyNumber(15000), '150');
  assert.equal(Fmt.amountForInput(7550), '75.50');
  assert.equal(Fmt.amountForInput(15000), '150');
});

test('isISODate بيرفض التواريخ اللي مش موجودة', () => {
  assert.equal(Fmt.isISODate('2026-11-09'), true);
  assert.equal(Fmt.isISODate('2026-02-30'), false);
  assert.equal(Fmt.isISODate('2026-1-9'), false);
  assert.equal(Fmt.isISODate(''), false);
});

test('countLabel بصيغ الجمع الصح', () => {
  assert.equal(Fmt.countLabel(1), 'مصروف واحد');
  assert.equal(Fmt.countLabel(2), 'مصروفين');
  assert.equal(Fmt.countLabel(3), '3 مصروفات');
  assert.equal(Fmt.countLabel(11), '11 مصروف');
});

test('monthLabel و dayLabel بأرقام لاتيني', () => {
  assert.equal(Fmt.monthLabel('2026-11'), 'نوفمبر 2026');
  assert.equal(Fmt.dayLabel(Fmt.todayISO()), 'النهارده');
  assert.match(Fmt.dayLabel('2020-01-15'), /15/);
});
