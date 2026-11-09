const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp, plain } = require('./helpers/env');

const { Csv } = createApp();
const cells = (text) => plain(Csv.parse(text).map((r) => r.cells));

/* ---------- كتابة ---------- */

test('cell: بيحط quotes بس لما يكون لازم', () => {
  assert.equal(Csv.cell('فطار'), 'فطار');
  assert.equal(Csv.cell('فول, وطعمية'), '"فول, وطعمية"');
  assert.equal(Csv.cell('قال "حلو"'), '"قال ""حلو"""');
  assert.equal(Csv.cell('سطر\nتاني'), '"سطر\nتاني"');
  assert.equal(Csv.cell(' مسافة'), '" مسافة"');
  assert.equal(Csv.cell(''), '');
  assert.equal(Csv.cell(null), '');
});

test('cell: الخانات اللي شكلها معادلة بتتحمى من Excel', () => {
  assert.equal(Csv.cell('=SUM(A1)'), "'=SUM(A1)");
  assert.equal(Csv.cell('+20'), "'+20");
  assert.equal(Csv.cell('-فطار'), "'-فطار");
  assert.equal(Csv.cell('@x'), "'@x");
});

test('exportText: BOM وهيدر وترتيب بالتاريخ واسم الفئة', () => {
  const app = createApp();
  app.Expenses.add({ amount: 7550, categoryId: 'food', date: '2026-11-09', note: 'فطار, فول' });
  app.Expenses.add({ amount: 450000, categoryId: 'rent', date: '2026-11-01', note: '' });
  const text = app.Csv.exportText(app.Expenses.all());
  assert.equal(text.charCodeAt(0), 0xFEFF);
  assert.equal(text, '﻿date,amount,category,note\r\n2026-11-01,4500,إيجار,\r\n2026-11-09,75.50,أكل,"فطار, فول"\r\n');
});

/* ---------- قراءة ---------- */

test('parse: quotes وفواصل وسطور جوه الخانة', () => {
  assert.deepEqual(cells('a,"b, c","d ""e"""\n1,2,3'), [['a', 'b, c', 'd "e"'], ['1', '2', '3']]);
  assert.deepEqual(cells('a,"سطر\nتاني",c'), [['a', 'سطر\nتاني', 'c']]);
  assert.deepEqual(cells('a,,c\n'), [['a', '', 'c']]);
});

test('parse: BOM و CRLF والسطور الفاضية', () => {
  assert.deepEqual(cells('﻿a,b\r\n1,2\r\n\r\n,\r\n3,4'), [['a', 'b'], ['1', '2'], ['3', '4']]);
});

test('parse: رقم السطر بيتحسب صح بعد خانة فيها سطرين', () => {
  const rows = plain(Csv.parse('h\n"x\ny"\nz'));
  assert.deepEqual(rows.map((r) => r.line), [1, 2, 4]);
});

test('detectDelimiter: , أو ; أو tab', () => {
  assert.equal(Csv.detectDelimiter('date,amount,category'), ',');
  assert.equal(Csv.detectDelimiter('date;amount;category'), ';');
  assert.equal(Csv.detectDelimiter('date\tamount'), '\t');
  assert.equal(Csv.detectDelimiter('date'), ',');
  assert.deepEqual(cells('date;amount\n2026-11-01;1,5'), [['date', 'amount'], ['2026-11-01', '1,5']]);
});

test('parseDate: الأشكال المقبولة', () => {
  assert.equal(Csv.parseDate('2026-11-09'), '2026-11-09');
  assert.equal(Csv.parseDate('2026/11/9'), '2026-11-09');
  assert.equal(Csv.parseDate('9/11/2026'), '2026-11-09', 'اليوم الأول');
  assert.equal(Csv.parseDate('09-11-2026'), '2026-11-09');
  assert.equal(Csv.parseDate('٩/١١/٢٠٢٦'), '2026-11-09');
  assert.equal(Csv.parseDate('9/11/2026 00:00'), '2026-11-09');
  assert.equal(Csv.parseDate('2026-11-09T10:00:00'), '2026-11-09');
  for (const bad of ['', '31/2/2026', '2026-13-01', 'امبارح', '11/2026']) {
    assert.equal(Csv.parseDate(bad), null, bad);
  }
});

test('parseAmount: بيشيل العملة ويقبل الأرقام العربية', () => {
  assert.equal(Csv.parseAmount('150'), 15000);
  assert.equal(Csv.parseAmount('1,250.50'), 125050);
  assert.equal(Csv.parseAmount('150 ج.م'), 15000);
  assert.equal(Csv.parseAmount('EGP 99.9'), 9990);
  assert.equal(Csv.parseAmount('١٥٠'), 15000);
  for (const bad of ['', '0', '-50', 'كتير', '1.234']) assert.equal(Csv.parseAmount(bad), null, bad);
});

/* ---------- analyze ---------- */

test('analyze: الهيدر بالعربي وبأي ترتيب', () => {
  const app = createApp();
  const a = app.Csv.analyze('الملاحظة,المبلغ,التاريخ,الفئة\nفطار,85.5,2026-11-09,أكل');
  assert.equal(a.error, undefined);
  assert.deepEqual(plain(a.rows[0]), {
    line: 2, date: '2026-11-09', amount: 8550, categoryName: 'أكل', categoryId: 'food', note: 'فطار',
  });
});

test('analyze: من غير عمود فئة وملاحظة بتتحط "تانيين"', () => {
  const a = createApp().Csv.analyze('date,amount\n2026-11-09,10');
  assert.equal(a.rows[0].categoryId, 'other');
  assert.equal(a.rows[0].note, '');
});

test('analyze: أخطاء الملف كله', () => {
  const { Csv: C } = createApp();
  assert.equal(C.analyze('').error, 'empty');
  assert.equal(C.analyze('\n\n').error, 'empty');
  assert.equal(C.analyze('foo,bar\n1,2').error, 'header');
  assert.equal(C.analyze('date,category\n2026-11-01,أكل').error, 'header', 'من غير مبلغ');
  const many = 'date,amount\n' + '2026-11-01,1\n'.repeat(C.MAX_ROWS + 1);
  assert.equal(C.analyze(many).error, 'too-many');
});

test('analyze: الصفوف الغلط بتتعد برقم السطر والباقي بيكمل', () => {
  const a = createApp().Csv.analyze([
    'date,amount,category,note',
    '2026-11-09,85.5,أكل,"فول,\nوطعمية"',
    'امبارح,20,أكل,',
    '2026-11-08,ببلاش,أكل,',
    '2026-11-07,30,مواصلات,',
  ].join('\n'));
  assert.equal(a.total, 4);
  assert.equal(a.rows.length, 2);
  assert.deepEqual(plain(a.errors), [
    { line: 4, code: 'date', value: 'امبارح' },
    { line: 5, code: 'amount', reason: 'invalid', value: 'ببلاش' },
  ]);
});

test('analyze: سبب غلط المبلغ بيتحدد (فاضي، صفر، كبير قوي، قروش كتير)', () => {
  const a = createApp().Csv.analyze([
    'date,amount',
    '2026-11-01,',
    '2026-11-02,0',
    '2026-11-03,99999999999',
    '2026-11-04,1.555',
    '2026-11-05,-50',
    '2026-11-06,100000000 ج.م',
  ].join('\n'));
  assert.deepEqual(plain(a.errors.map((e) => [e.line, e.reason])), [
    [2, 'empty'], [3, 'zero'], [4, 'too-big'], [5, 'decimals'], [6, 'invalid'],
  ]);
  assert.equal(a.rows.length, 1, 'الحد الأقصى نفسه مقبول');
});

test('analyze: بيعد الصفوف اللي تاريخها في المستقبل من غير ما يرفضها', () => {
  const a = createApp().Csv.analyze('date,amount\n2026-11-09,1\n2026-11-10,1\n2027-01-15,1', '2026-11-09');
  assert.equal(a.rows.length, 3);
  assert.equal(a.errors.length, 0);
  assert.equal(a.future, 2);
});

test('analyze: الفئات بتتطابق من غير ما تفرق في الهمزة، والجديدة بتتعد مرة واحدة', () => {
  const a = createApp().Csv.analyze('date,amount,category\n2026-11-01,1,اكل\n2026-11-01,1,جيم\n2026-11-02,1,جيم \n2026-11-02,1,');
  assert.equal(a.rows[0].categoryId, 'food');
  assert.equal(a.rows[1].categoryId, null);
  assert.deepEqual(plain(a.newCategories), ['جيم']);
  assert.equal(a.rows[3].categoryId, 'other');
});

test('analyze: بيشيل حماية المعادلات وبيقص الملاحظة الطويلة', () => {
  const long = 'ا'.repeat(200);
  const a = createApp().Csv.analyze("date,amount,note\n2026-11-01,1,'=SUM(A1)\n2026-11-01,1," + long);
  assert.equal(a.rows[0].note, '=SUM(A1)');
  assert.equal(a.rows[1].note.length, 140);
});

test('تصدير ثم استيراد بيرجع نفس الداتا', () => {
  const app = createApp();
  const gym = app.Categories.add({ name: 'جيم', color: '#60A5FA' });
  const notes = ['فطار, فول', 'قال "حلو"', 'سطر\nتاني', '=خطر', '', '-خصم'];
  notes.forEach((note, i) =>
    app.Expenses.add({ amount: 100 + i, categoryId: i % 2 ? gym.id : 'food', date: '2026-11-0' + (i + 1), note }));
  const text = app.Csv.exportText(app.Expenses.all());

  const fresh = createApp();
  fresh.Categories.add({ name: 'جيم', color: '#60A5FA' });
  const a = fresh.Csv.analyze(text);
  assert.equal(a.errors.length, 0);
  const pick = (e, cats) => [e.date, e.amount, cats.find((c) => c.id === e.categoryId).name, e.note];
  assert.deepEqual(
    plain(a.rows.map((r) => [r.date, r.amount, r.categoryName, r.note])),
    plain(app.Expenses.all().map((e) => pick(e, app.Categories.all())))
  );
});

test('decode: UTF-8 و Windows-1256', () => {
  assert.equal(Csv.decode(new TextEncoder().encode('أكل,150')), 'أكل,150');
  // "أكل" بـ Windows-1256: أ=C3 ك=DF ل=E1
  assert.equal(Csv.decode(new Uint8Array([0xC3, 0xDF, 0xE1, 0x2C, 0x31])), 'أكل,1');
});

/* ---------- apply ---------- */

const FILE = 'date,amount,category,note\n2026-11-01,100,أكل,فطار\n2026-11-02,50,جيم,\n2026-11-03,20,مواصلات,';

test('apply merge: بيضيف ويعمل الفئات الجديدة ويحفظ', () => {
  const app = createApp();
  app.Expenses.add({ amount: 999, categoryId: 'rent', date: '2026-10-01' });
  const r = app.Csv.apply(app.Csv.analyze(FILE), 'merge');
  assert.equal(r.added, 3);
  assert.equal(r.categoriesAdded, 1);
  const saved = app.saved();
  assert.equal(saved.expenses.length, 4);
  const gym = saved.categories.find((c) => c.name === 'جيم');
  assert.ok(gym && gym.id.startsWith('c-') && gym.builtIn === false);
  assert.ok(app.Categories.isPaletteColor(gym.color));
  assert.equal(saved.expenses.filter((e) => e.categoryId === gym.id).length, 1);
});

test('apply merge: الصفوف المكررة بتتساب، بس كل نسخة موجودة بتلغي صف واحد', () => {
  const app = createApp();
  app.Expenses.add({ amount: 10000, categoryId: 'food', date: '2026-11-01', note: 'فطار' });
  const text = 'date,amount,category,note\n2026-11-01,100,أكل,فطار\n2026-11-01,100,أكل,فطار\n2026-11-05,1,أكل,';
  const a = app.Csv.analyze(text);
  assert.equal(app.Csv.countDuplicates(a.rows), 1);
  const r = app.Csv.apply(a, 'merge');
  assert.equal(r.duplicates, 1);
  assert.equal(r.added, 2);
  assert.equal(app.Expenses.all().length, 3);
});

test('استيراد نفس الملف مرتين في الدمج مبيضيفش حاجة', () => {
  const app = createApp();
  app.Csv.apply(app.Csv.analyze(FILE), 'merge');
  const r = app.Csv.apply(app.Csv.analyze(FILE), 'merge');
  assert.equal(r.added, 0);
  assert.equal(r.duplicates, 3);
  assert.equal(r.categoriesAdded, 0, 'جيم اتعملت المرة الأولى');
});

test('apply replace: بيمسح المصاريف القديمة ويسيب الفئات', () => {
  const app = createApp();
  const club = app.Categories.add({ name: 'نادي', color: '#F472B6' });
  app.Expenses.add({ amount: 999, categoryId: club.id, date: '2026-10-01' });
  const r = app.Csv.apply(app.Csv.analyze(FILE), 'replace');
  assert.equal(r.added, 3);
  assert.equal(r.duplicates, 0);
  assert.equal(app.Expenses.all().length, 3);
  assert.ok(app.Categories.find(club.id));
});

test('undo بيرجّع المصاريف والفئات زي ما كانت قبل الاستيراد', () => {
  const app = createApp();
  app.Expenses.add({ amount: 999, categoryId: 'rent', date: '2026-10-01' });
  const before = plain(app.Store.state());
  const r = app.Csv.apply(app.Csv.analyze(FILE), 'replace');
  assert.ok(app.Csv.undo(r.snapshot));
  assert.deepEqual(plain(app.Store.state()), before);
  assert.deepEqual(app.saved(), before);
});

test('لو الحفظ فشل، الاستيراد مبيغيرش أي حاجة', () => {
  const app = createApp();
  app.Expenses.add({ amount: 999, categoryId: 'rent', date: '2026-10-01' });
  const before = plain(app.Store.state());
  app.failWrites();
  assert.equal(app.Csv.apply(app.Csv.analyze(FILE), 'replace'), null);
  assert.deepEqual(plain(app.Store.state()), before);
});
