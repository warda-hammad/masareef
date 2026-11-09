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

  // بترجع المبلغ بالقرش، أو null لو مش رقم صحيح أكبر من صفر
  function parseAmount(input) {
    let t = normalizeDigits(input).trim()
      .replace(/٫/g, '.')          // الفاصلة العشرية العربية ٫
      .replace(/[,٬\s]/g, '');     // فواصل الآلاف
    if (t.startsWith('.')) t = '0' + t;
    const m = /^(\d+)(?:\.(\d{0,2}))?$/.exec(t);
    if (!m) return null;
    const piasters = Number(m[1]) * 100 + Number(((m[2] || '') + '00').slice(0, 2));
    if (!Number.isSafeInteger(piasters) || piasters <= 0 || piasters > MAX_PIASTERS) return null;
    return piasters;
  }

  function moneyNumber(piasters) {
    return piasters % 100 === 0 ? nf0.format(piasters / 100) : nf2.format(piasters / 100);
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

  function currentMonth() {
    return todayISO().slice(0, 7);
  }

  function dayLabel(iso) {
    const today = new Date();
    if (iso === toISO(today)) return 'النهارده';
    const y = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    if (iso === toISO(y)) return 'امبارح';
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

  return {
    normalizeDigits,
    parseAmount,
    moneyNumber,
    amountForInput,
    isISODate,
    todayISO,
    currentMonth,
    dayLabel,
    monthLabel,
    countLabel,
  };
})();
