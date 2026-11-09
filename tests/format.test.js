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

test('checkAmount: كل غلط ليه كود مختلف', () => {
  const err = (s) => Fmt.checkAmount(s).error;
  assert.equal(err(''), 'empty');
  assert.equal(err('   '), 'empty');
  assert.equal(err(null), 'empty');
  assert.equal(err('abc'), 'invalid');
  assert.equal(err('-5'), 'invalid');
  assert.equal(err('1e3'), 'invalid');
  assert.equal(err('1.234'), 'decimals');
  assert.equal(err('١٫٥٥٥'), 'decimals');
  assert.equal(err('0'), 'zero');
  assert.equal(err('0.00'), 'zero');
  assert.equal(err('.0'), 'zero');
});

test('checkAmount: المبلغ الكبير قوي بيقول too-big مش "لازم يكون أكبر من صفر"', () => {
  assert.equal(Fmt.checkAmount('99999999999').error, 'too-big');
  assert.equal(Fmt.checkAmount('١٠٠٠٠٠٠٠٠٠٠').error, 'too-big');
  assert.equal(Fmt.checkAmount('9'.repeat(40)).error, 'too-big', 'أكبر من أي رقم آمن في JS');
  assert.equal(Fmt.checkAmount('100000000.01').error, 'too-big');
  assert.deepEqual({ ...Fmt.checkAmount('100,000,000') }, { piasters: Fmt.MAX_PIASTERS }, 'الحد الأقصى نفسه مقبول');
  assert.deepEqual({ ...Fmt.checkAmount('75.5') }, { piasters: 7550 });
});

test('isFutureDate', () => {
  assert.equal(Fmt.isFutureDate('2026-11-10', '2026-11-09'), true);
  assert.equal(Fmt.isFutureDate('2027-01-15', '2026-11-09'), true);
  assert.equal(Fmt.isFutureDate('2026-11-09', '2026-11-09'), false, 'النهارده مش مستقبل');
  assert.equal(Fmt.isFutureDate('2026-10-31', '2026-11-09'), false);
});

test('futureNote: تنبيه بس للتاريخ اللي لسه مجاش، وبيقول هيظهر في أنهي شهر', () => {
  assert.equal(Fmt.futureNote('2026-11-09', '2026-11-09'), '');
  assert.equal(Fmt.futureNote('2026-11-01', '2026-11-09'), '');
  assert.equal(Fmt.futureNote('', '2026-11-09'), '');
  assert.equal(Fmt.futureNote('2026-02-30', '2026-11-09'), '', 'تاريخ مش موجود');
  const sameMonth = Fmt.futureNote('2026-11-20', '2026-11-09');
  assert.match(sameMonth, /لسه مجاش/);
  assert.match(sameMonth, /هيتحسب في إجمالي الشهر ده/);
  const later = Fmt.futureNote('2027-01-15', '2026-11-09');
  assert.match(later, /15 يناير 2027/);
  assert.match(later, /هيظهر في يناير 2027 مش في إجمالي نوفمبر 2026/);
});

test('dayLabel: بكره', () => {
  const t = new Date();
  const tomorrow = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1);
  const iso = tomorrow.getFullYear() + '-' + String(tomorrow.getMonth() + 1).padStart(2, '0') + '-' + String(tomorrow.getDate()).padStart(2, '0');
  assert.equal(Fmt.dayLabel(iso), 'بكره');
});

test('moneyNumber و amountForInput', () => {
  assert.equal(Fmt.moneyNumber(125075), '1,250.75');
  assert.equal(Fmt.moneyNumber(15000), '150');
  assert.equal(Fmt.amountForInput(7550), '75.50');
  assert.equal(Fmt.amountForInput(15000), '150');
});

test('compact للمحاور', () => {
  assert.equal(Fmt.compact(0), '0');
  assert.equal(Fmt.compact(950), '950');
  assert.equal(Fmt.compact(0.25), '0.25');
  assert.equal(Fmt.compact(1000), '1K');
  assert.equal(Fmt.compact(1500), '1.5K');
  assert.equal(Fmt.compact(12345), '12.3K');
  assert.equal(Fmt.compact(2000000), '2M');
});

test('daysLabel بصيغ الجمع الصح', () => {
  assert.equal(Fmt.daysLabel(1), 'يوم واحد');
  assert.equal(Fmt.daysLabel(2), 'يومين');
  assert.equal(Fmt.daysLabel(9), '9 أيام');
  assert.equal(Fmt.daysLabel(31), '31 يوم');
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
