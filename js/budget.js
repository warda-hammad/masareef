/* الميزانية الشهرية: مبلغ واحد (بالقرش) بيتطبق على كل شهر، وحالة الصرف بالنسبة له */
const Budget = (function () {
  'use strict';

  const WARN_RATIO = 0.8;
  const LEVELS = ['none', 'ok', 'warn', 'over'];

  function get() {
    const b = Store.state().settings.budget;
    return Number.isSafeInteger(b) && b > 0 ? b : null;
  }

  function set(piasters) {
    if (!Number.isSafeInteger(piasters) || piasters <= 0) return false;
    const settings = Store.state().settings;
    const before = settings.budget;
    return Store.commit(() => { settings.budget = piasters; }, () => { settings.budget = before; });
  }

  function clear() {
    const settings = Store.state().settings;
    const before = settings.budget;
    return Store.commit(() => { delete settings.budget; }, () => { settings.budget = before; });
  }

  function daysInMonth(ym) {
    const [y, m] = ym.split('-').map(Number);
    return new Date(y, m, 0).getDate();
  }

  // الأيام الباقية في الشهر والنهارده منهم. شهر فات = 0، شهر جاي = كل أيامه
  function daysLeft(ym, today) {
    const thisMonth = today.slice(0, 7);
    if (ym < thisMonth) return 0;
    if (ym > thisMonth) return daysInMonth(ym);
    return daysInMonth(ym) - Number(today.slice(8, 10)) + 1;
  }

  // حسبة نقية (من غير تخزين) عشان تبقى سهلة في الاختبار
  function compute(spent, budget, ym, today) {
    if (!budget) return { level: 'none', spent, budget: null };
    const ratio = spent / budget;
    const remaining = budget - spent;
    const left = daysLeft(ym, today);
    return {
      level: ratio >= 1 ? 'over' : ratio >= WARN_RATIO ? 'warn' : 'ok',
      spent,
      budget,
      ratio,
      percent: Math.floor(ratio * 100),
      remaining: Math.max(remaining, 0),
      over: Math.max(-remaining, 0),
      daysLeft: left,
      perDay: remaining > 0 && left > 0 ? Math.floor(remaining / left) : 0,
    };
  }

  function status(ym, today) {
    return compute(Expenses.total(Expenses.forMonth(ym)), get(), ym, today || Fmt.todayISO());
  }

  // بيرجع المستوى الجديد لو الصرف طلع لمستوى أعلى (warn أو over)، وإلا null
  function crossed(before, after) {
    const up = LEVELS.indexOf(after.level) > LEVELS.indexOf(before.level);
    return up && (after.level === 'warn' || after.level === 'over') ? after.level : null;
  }

  return { WARN_RATIO, get, set, clear, daysInMonth, daysLeft, compute, status, crossed };
})();
