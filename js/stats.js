/* حسابات الداشبورد: ملخص الشهر، التوزيع على الفئات والأيام، ومقياس المحاور */
const Stats = (function () {
  'use strict';

  const pad = (n) => String(n).padStart(2, '0');

  function shiftMonth(ym, n) {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(y, m - 1 + n, 1);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1);
  }

  // الأيام اللي عدّت من الشهر والنهارده منهم. شهر فات = كل أيامه، شهر جاي = 0
  function elapsedDays(ym, today) {
    const thisMonth = today.slice(0, 7);
    if (ym > thisMonth) return 0;
    if (ym < thisMonth) return Budget.daysInMonth(ym);
    return Number(today.slice(8, 10));
  }

  // من الأكبر للأصغر؛ لو اتساووا بترتيب الفئات في الإعدادات
  function byCategory(list) {
    const totals = new Map();
    list.forEach((e) => {
      const id = Store.category(e.categoryId).id;
      const t = totals.get(id) || { categoryId: id, total: 0, count: 0 };
      t.total += e.amount;
      t.count += 1;
      totals.set(id, t);
    });
    const sum = Expenses.total(list);
    const order = Store.categories().map((c) => c.id);
    return Array.from(totals.values())
      .map((t) => Object.assign(t, { share: sum ? t.total / sum : 0 }))
      .sort((a, b) => b.total - a.total || order.indexOf(a.categoryId) - order.indexOf(b.categoryId));
  }

  // يوم لكل يوم في الشهر، حتى الأيام اللي مفيهاش صرف
  function byDay(list, ym) {
    const days = [];
    for (let d = 1; d <= Budget.daysInMonth(ym); d++) {
      days.push({ day: d, date: ym + '-' + pad(d), total: 0, count: 0 });
    }
    list.forEach((e) => {
      const slot = days[Number(e.date.slice(8, 10)) - 1];
      if (!slot) return;
      slot.total += e.amount;
      slot.count += 1;
    });
    return days;
  }

  function summary(ym, today) {
    const list = Expenses.forMonth(ym);
    const total = Expenses.total(list);
    const prevYm = shiftMonth(ym, -1);
    const prevTotal = Expenses.total(Expenses.forMonth(prevYm));
    const cats = byCategory(list);
    const elapsed = elapsedDays(ym, today);
    return {
      ym,
      total,
      count: list.length,
      prevYm,
      prevTotal,
      // null لما الشهر اللي فات مفيهوش صرف (مفيش أساس للمقارنة)
      deltaPct: prevTotal ? Math.round(((total - prevTotal) / prevTotal) * 100) : null,
      byCategory: cats,
      byDay: byDay(list, ym),
      elapsedDays: elapsed,
      dailyAvg: elapsed ? Math.round(total / elapsed) : 0,
      top: cats[0] || null,
    };
  }

  // الشهور اللي ينفع نتنقل بينها: من أقدم مصروف لحد الشهر الحالي (أو آخر مصروف لو بعده)
  function monthRange(today) {
    const current = today.slice(0, 7);
    let min = current;
    let max = current;
    Expenses.all().forEach((e) => {
      const ym = e.date.slice(0, 7);
      if (ym < min) min = ym;
      if (ym > max) max = ym;
    });
    return { min, max };
  }

  // تقسيمات محور نضيفة (1، 2، 2.5، 5 × 10^n) تغطي أكبر قيمة
  function niceScale(max, count) {
    count = count || 3;
    if (!(max > 0)) return { max: 1, step: 1, ticks: [0, 1] };
    const raw = max / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
    const step = nice * mag;
    const top = Math.ceil(max / step - 1e-9) * step;
    const ticks = [];
    for (let i = 0; i * step <= top + step / 1e6; i++) ticks.push(Number((i * step).toFixed(10)));
    return { max: Number(top.toFixed(10)), step, ticks };
  }

  return { shiftMonth, elapsedDays, byCategory, byDay, summary, monthRange, niceScale };
})();
