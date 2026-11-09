/* تصدير واستيراد CSV. كله بيحصل على الجهاز: مفيش أي حاجة بتترفع */
const Csv = (function () {
  'use strict';

  const HEADER = ['date', 'amount', 'category', 'note'];
  const MAX_ROWS = 20000;
  const MAX_NOTE = 140;

  // أسامي الأعمدة اللي بنفهمها (بعد Filters.normalize)
  const ALIASES = {
    date: ['date', 'التاريخ', 'تاريخ'],
    amount: ['amount', 'المبلغ', 'مبلغ'],
    category: ['category', 'الفئه', 'فئه'],
    note: ['note', 'notes', 'الملاحظه', 'ملاحظه', 'الملاحظات', 'ملاحظات'],
  };

  /* ---------- كتابة ---------- */

  // الخانات اللي بتبدأ بـ = + - @ بنحط قبلها ' عشان Excel ميشغلهاش كمعادلة
  function cell(value) {
    let s = String(value == null ? '' : value);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\n\r]|^\s|\s$/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function stringify(rows) {
    return rows.map((r) => r.map(cell).join(',')).join('\r\n');
  }

  // BOM في الأول عشان Excel يقرا العربي صح
  function exportText(expenses) {
    const sorted = expenses.slice().sort((a, b) =>
      a.date === b.date ? a.createdAt - b.createdAt : (a.date < b.date ? -1 : 1));
    const rows = [HEADER].concat(sorted.map((e) =>
      [e.date, Fmt.amountForInput(e.amount), Store.category(e.categoryId).name, e.note || '']));
    return '﻿' + stringify(rows) + '\r\n';
  }

  /* ---------- قراءة ---------- */

  // الملف ممكن يكون UTF-8، أو Windows-1256 لو Excel حفظه CSV عادي بالعربي
  function decode(bytes) {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch (_) {
      return new TextDecoder('windows-1256').decode(bytes);
    }
  }

  // Excel العربي ساعات بيفصل بـ ; بدل ,
  function detectDelimiter(text) {
    const first = text.split('\n', 1)[0];
    const count = (ch) => first.split(ch).length - 1;
    const best = [',', ';', '\t'].reduce((a, ch) => (count(ch) > count(a) ? ch : a), ',');
    return count(best) ? best : ',';
  }

  // بيرجع [{ line, cells }]؛ line = رقم السطر اللي الصف بيبدأ منه في الملف
  function parse(text, delimiter) {
    text = String(text).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
    const d = delimiter || detectDelimiter(text);
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    let line = 1;
    let rowLine = 1;

    const endRow = () => {
      row.push(field);
      if (row.some((c) => c.trim() !== '')) rows.push({ line: rowLine, cells: row });
      row = [];
      field = '';
    };

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          if (c === '\n') line++;
          field += c;
        }
      } else if (c === '"' && field === '') {
        inQuotes = true;
      } else if (c === d) {
        row.push(field);
        field = '';
      } else if (c === '\n') {
        endRow();
        line++;
        rowLine = line;
      } else {
        field += c;
      }
    }
    if (field !== '' || row.length) endRow();
    return rows;
  }

  // بيشيل الـ ' اللي حطيناها وقت التصدير قبل = + - @
  function unescapeText(s) {
    return /^'[=+\-@\t\r]/.test(s) ? s.slice(1) : s;
  }

  // 2026-11-09 أو 2026/11/09 أو 9/11/2026 (اليوم الأول زي مصر). الوقت لو موجود بيتشال
  function parseDate(raw) {
    const s = Fmt.normalizeDigits(raw).trim().split(/[ T]/)[0];
    let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s);
    let y, mo, d;
    if (m) {
      [, y, mo, d] = m;
    } else {
      m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(s);
      if (!m) return null;
      [, d, mo, y] = m;
    }
    const iso = y + '-' + mo.padStart(2, '0') + '-' + d.padStart(2, '0');
    return Fmt.isISODate(iso) ? iso : null;
  }

  // بيقبل "150"، "1,250.50"، "١٥٠"، "150 ج.م"
  function parseAmount(raw) {
    const s = String(raw).replace(/[^\d٠-٩۰-۹.,٫٬-]/g, '');
    return s ? Fmt.parseAmount(s) : null;
  }

  function findCategoryId(name) {
    if (!name) return 'other';
    const key = Filters.normalize(name);
    const c = Categories.all().find((x) => Filters.normalize(x.name) === key);
    return c ? c.id : null;
  }

  // بيقرا النص ويرجع الصفوف السليمة والأخطاء (برقم السطر) والفئات الجديدة.
  // مبيغيرش أي حاجة في الداتا؛ التطبيق بيحصل في apply()
  function analyze(text) {
    const parsed = parse(text);
    if (!parsed.length) return { error: 'empty' };

    const header = parsed[0].cells.map((h) => Filters.normalize(h));
    const idx = {};
    Object.keys(ALIASES).forEach((k) => { idx[k] = header.findIndex((h) => ALIASES[k].includes(h)); });
    if (idx.date < 0 || idx.amount < 0) return { error: 'header' };

    const body = parsed.slice(1);
    if (body.length > MAX_ROWS) return { error: 'too-many' };

    const rows = [];
    const errors = [];
    const newCategories = new Map();
    body.forEach((r) => {
      const get = (k) => (idx[k] >= 0 && r.cells[idx[k]] != null ? r.cells[idx[k]] : '');
      const date = parseDate(get('date'));
      if (!date) return errors.push({ line: r.line, code: 'date', value: get('date').trim() });
      const amount = parseAmount(get('amount'));
      if (amount === null) return errors.push({ line: r.line, code: 'amount', value: get('amount').trim() });

      const categoryName = unescapeText(get('category').trim()).replace(/\s+/g, ' ')
        .slice(0, Categories.MAX_NAME).trim();
      const categoryId = findCategoryId(categoryName);
      if (!categoryId) {
        const key = Filters.normalize(categoryName);
        if (!newCategories.has(key)) newCategories.set(key, categoryName);
      }
      rows.push({
        line: r.line,
        date,
        amount,
        categoryName,
        categoryId,
        note: unescapeText(get('note').trim()).slice(0, MAX_NOTE),
      });
    });

    return { rows, errors, newCategories: Array.from(newCategories.values()), total: body.length };
  }

  /* ---------- تطبيق الاستيراد ---------- */

  const keyOf = (e) => [e.date, e.amount, e.categoryId, e.note].join('\u0001');

  function existingKeys() {
    const counts = new Map();
    Store.state().expenses.forEach((e) => {
      const k = keyOf(e);
      counts.set(k, (counts.get(k) || 0) + 1);
    });
    return counts;
  }

  // في الدمج: الصف اللي ليه نسخة مطابقة موجودة (تاريخ ومبلغ وفئة وملاحظة) بيتساب.
  // كل نسخة موجودة بتلغي صف واحد بس، عشان مصروفين حقيقيين متطابقين ميضيعوش
  function markDuplicates(rows, counts) {
    return rows.map((r) => {
      if (!r.categoryId) return false; // فئة جديدة: مستحيل يكون موجود
      const k = keyOf(r);
      const n = counts.get(k) || 0;
      if (!n) return false;
      counts.set(k, n - 1);
      return true;
    });
  }

  function countDuplicates(rows) {
    return markDuplicates(rows, existingKeys()).filter(Boolean).length;
  }

  function nextColor(used) {
    const free = Categories.PALETTE.find((p) => !used.has(p.color));
    const color = (free || Categories.PALETTE[used.size % Categories.PALETTE.length]).color;
    used.add(color);
    return color;
  }

  // mode: 'merge' (يضيف) أو 'replace' (يمسح المصاريف الموجودة؛ الفئات بتفضل).
  // كله في commit واحد: يا يتحفظ كله يا مفيش حاجة تتغير. بيرجع snapshot للتراجع
  function apply(analysis, mode) {
    const state = Store.state();
    const prev = { expenses: state.expenses, categories: state.categories };
    const categories = state.categories.slice();
    const used = new Set(categories.map((c) => c.color.toUpperCase()));

    const created = new Map();
    analysis.newCategories.forEach((name) => {
      const c = { id: 'c-' + Store.newId(), name, icon: null, color: nextColor(used), builtIn: false };
      categories.push(c);
      created.set(Filters.normalize(name), c.id);
    });

    const dup = mode === 'merge' ? markDuplicates(analysis.rows, existingKeys()) : [];
    const expenses = mode === 'merge' ? state.expenses.slice() : [];
    const now = Date.now();
    let added = 0;
    analysis.rows.forEach((r, i) => {
      if (dup[i]) return;
      expenses.push({
        id: Store.newId(),
        amount: r.amount,
        categoryId: r.categoryId || created.get(Filters.normalize(r.categoryName)) || 'other',
        date: r.date,
        note: r.note,
        createdAt: now,
        updatedAt: now,
      });
      added++;
    });

    const ok = Store.commit(
      () => { state.expenses = expenses; state.categories = categories; },
      () => { state.expenses = prev.expenses; state.categories = prev.categories; }
    );
    if (!ok) return null;
    return { added, duplicates: dup.filter(Boolean).length, categoriesAdded: created.size, snapshot: prev };
  }

  function undo(snapshot) {
    const state = Store.state();
    const current = { expenses: state.expenses, categories: state.categories };
    return Store.commit(
      () => { state.expenses = snapshot.expenses; state.categories = snapshot.categories; },
      () => { state.expenses = current.expenses; state.categories = current.categories; }
    );
  }

  return {
    HEADER,
    MAX_ROWS,
    cell,
    stringify,
    exportText,
    decode,
    detectDelimiter,
    parse,
    parseDate,
    parseAmount,
    analyze,
    countDuplicates,
    apply,
    undo,
  };
})();
