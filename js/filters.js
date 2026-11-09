/* البحث والفلتر: { q, month, cat }، وبيتحفظوا في الـ URL hash (مثلاً #month=2026-11&cat=food&q=فطار) */
const Filters = (function () {
  'use strict';

  const EMPTY = { q: '', month: '', cat: '' };

  // عشان "اكل" تلاقي "أكل" و "قهوه" تلاقي "قهوة": بنشيل التشكيل والتطويل ونوحّد الحروف
  function normalize(text) {
    return Fmt.normalizeDigits(String(text == null ? '' : text))
      .toLocaleLowerCase()
      .replace(/[ً-ٰٟـ]/g, '') // تشكيل + تطويل
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function clean(f) {
    const out = Object.assign({}, EMPTY);
    if (!f) return out;
    if (typeof f.q === 'string') out.q = f.q.slice(0, 100);
    if (typeof f.month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(f.month)) out.month = f.month;
    if (typeof f.cat === 'string') out.cat = f.cat;
    return out;
  }

  function isActive(f) {
    return Boolean(f.q.trim() || f.month || f.cat);
  }

  // البحث بيدوّر في الملاحظة واسم الفئة؛ كل كلمة لازم تكون موجودة
  function matches(e, f) {
    if (f.month && !e.date.startsWith(f.month)) return false;
    if (f.cat && Store.category(e.categoryId).id !== f.cat) return false;
    const words = normalize(f.q).split(' ').filter(Boolean);
    if (!words.length) return true;
    const haystack = normalize(e.note + ' ' + Store.category(e.categoryId).name);
    return words.every((w) => haystack.includes(w));
  }

  function apply(list, f) {
    return list.filter((e) => matches(e, f));
  }

  function parse(hash) {
    const out = {};
    String(hash || '').replace(/^#/, '').split('&').forEach((pair) => {
      const i = pair.indexOf('=');
      if (i < 1) return;
      const key = pair.slice(0, i);
      if (!(key in EMPTY)) return;
      try {
        out[key] = decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' '));
      } catch (_) {
        // hash فيه % مكسورة: نتجاهل المفتاح ده بس
      }
    });
    return clean(out);
  }

  function serialize(f) {
    return ['month', 'cat', 'q']
      .filter((k) => (k === 'q' ? f.q.trim() : f[k]))
      .map((k) => k + '=' + encodeURIComponent(k === 'q' ? f.q.trim() : f[k]))
      .join('&');
  }

  // الشهور اللي في قايمة الفلتر، من الأحدث للأقدم، ومعاها الشهر المختار لو برا المدى
  function monthOptions(range, selected) {
    const months = [];
    for (let ym = range.max; ym >= range.min; ym = Stats.shiftMonth(ym, -1)) months.push(ym);
    if (selected && !months.includes(selected)) {
      months.push(selected);
      months.sort().reverse();
    }
    return months;
  }

  return { EMPTY, normalize, clean, isActive, matches, apply, parse, serialize, monthOptions };
})();
