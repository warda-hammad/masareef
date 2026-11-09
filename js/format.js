/* تنسيق الفلوس والتواريخ. المبالغ بتتخزن بالقرش (integer) عشان نتفادى مشاكل الكسور */
const Fmt = (function () {
  'use strict';

  const MAX_PIASTERS = 100000000 * 100; // 100 مليون جنيه

  const nf0 = new Intl.NumberFormat('en-US');
  const nf2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // أرقام لاتيني عشان JetBrains Mono مالوش أرقام عربية-هندية
  const dayFmt = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' });
  const dayYearFmt = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const monthFmt = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { month: 'long', year: 'numeric' });

  // ٠-٩ (عربي) و ۰-۹ (فارسي) → 0-9
  function normalizeDigits(s) {
    return String(s)
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0));
  }

  // بترجع { piasters } أو { error } عشان الفورم يقول الغلط بالظبط:
  // 'empty' | 'invalid' (مش رقم) | 'decimals' (أكتر من قرشين) | 'zero' | 'too-big'
  function checkAmount(input) {
    let t = normalizeDigits(input == null ? '' : input).trim()
      .replace(/٫/g, '.')          // الفاصلة العشرية العربية ٫
      .replace(/[,٬\s]/g, '');     // فواصل الآلاف
    if (!t) return { error: 'empty' };
    if (t.startsWith('.')) t = '0' + t;
    if (/^\d+\.\d{3,}$/.test(t)) return { error: 'decimals' };
    const m = /^(\d+)(?:\.(\d{0,2}))?$/.exec(t);
    if (!m) return { error: 'invalid' };
    const piasters = Number(m[1]) * 100 + Number(((m[2] || '') + '00').slice(0, 2));
    if (!Number.isSafeInteger(piasters) || piasters > MAX_PIASTERS) return { error: 'too-big' };
    if (piasters <= 0) return { error: 'zero' };
    return { piasters };
  }

  // بترجع المبلغ بالقرش، أو null لو فيه أي غلط
  function parseAmount(input) {
    const r = checkAmount(input);
    return r.error ? null : r.piasters;
  }

  function moneyNumber(piasters) {
    return piasters % 100 === 0 ? nf0.format(piasters / 100) : nf2.format(piasters / 100);
  }

  // للمحاور: 950 و 1.5K و 2M (القيمة بالجنيه)
  function compact(pounds) {
    const trim = (n) => String(Number(n.toFixed(1)));
    if (pounds >= 1e6) return trim(pounds / 1e6) + 'M';
    if (pounds >= 1e3) return trim(pounds / 1e3) + 'K';
    return String(Number(pounds.toFixed(2)));
  }

  function amountForInput(piasters) {
    return piasters % 100 === 0 ? String(piasters / 100) : (piasters / 100).toFixed(2);
  }

  const pad = (n) => String(n).padStart(2, '0');

  function toISO(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function parseISO(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function isISODate(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    return toISO(parseISO(s)) === s;
  }

  function todayISO() {
    return toISO(new Date());
  }

  // التواريخ YYYY-MM-DD بتتقارن كنص صح
  function isFutureDate(iso, today) {
    return iso > (today || todayISO());
  }

  // الجملة اللي تحت خانة التاريخ لو التاريخ لسه مجاش، أو '' لو مفيش تنبيه
  function futureNote(iso, today) {
    today = today || todayISO();
    if (!isISODate(iso) || !isFutureDate(iso, today)) return '';
    const ym = iso.slice(0, 7);
    const current = today.slice(0, 7);
    const day = dayLabel(iso);
    return ym === current
      ? '⚠️ التاريخ ده لسه مجاش (' + day + '). المصروف هيتحسب في إجمالي الشهر ده.'
      : '⚠️ التاريخ ده لسه مجاش (' + day + '). المصروف هيتسجل عادي، بس هيظهر في '
        + monthLabel(ym) + ' مش في إجمالي ' + monthLabel(current) + '.';
  }

  function currentMonth() {
    return todayISO().slice(0, 7);
  }

  function dayLabel(iso) {
    const today = new Date();
    if (iso === toISO(today)) return 'النهارده';
    const y = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    if (iso === toISO(y)) return 'امبارح';
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    if (iso === toISO(t)) return 'بكره';
    const d = parseISO(iso);
    return (d.getFullYear() === today.getFullYear() ? dayFmt : dayYearFmt).format(d);
  }

  function monthLabel(ym) {
    return monthFmt.format(parseISO(ym + '-01'));
  }

  // صيغ الجمع في العربي: مصروف واحد، مصروفين، 3 مصروفات، 11 مصروف
  function countLabel(n) {
    if (n === 0) return 'مفيش مصاريف لسه';
    if (n === 1) return 'مصروف واحد';
    if (n === 2) return 'مصروفين';
    if (n <= 10) return n + ' مصروفات';
    return n + ' مصروف';
  }

  function daysLabel(n) {
    if (n === 1) return 'يوم واحد';
    if (n === 2) return 'يومين';
    if (n <= 10) return n + ' أيام';
    return n + ' يوم';
  }

  return {
    normalizeDigits,
    MAX_PIASTERS,
    checkAmount,
    parseAmount,
    moneyNumber,
    compact,
    amountForInput,
    isISODate,
    todayISO,
    isFutureDate,
    futureNote,
    currentMonth,
    dayLabel,
    monthLabel,
    countLabel,
    daysLabel,
  };
})();
