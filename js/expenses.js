/* منطق المصاريف. أي تغيير بيتحفظ على طول، ولو الحفظ فشل بيرجع زي ما كان */
const Expenses = (function () {
  'use strict';

  function newId() {
    if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function all() {
    return Store.state().expenses;
  }

  function find(id) {
    return all().find((e) => e.id === id) || null;
  }

  function commit(apply, revert) {
    apply();
    if (Store.save()) return true;
    revert();
    return false;
  }

  function fields(input) {
    return {
      amount: input.amount,
      categoryId: input.categoryId,
      date: input.date,
      note: input.note || '',
    };
  }

  function add(input) {
    const now = Date.now();
    const e = Object.assign({ id: newId() }, fields(input), { createdAt: now, updatedAt: now });
    const list = all();
    return commit(() => list.push(e), () => list.splice(list.indexOf(e), 1)) ? e : null;
  }

  function update(id, input) {
    const e = find(id);
    if (!e) return null;
    const before = Object.assign({}, e);
    const ok = commit(
      () => Object.assign(e, fields(input), { updatedAt: Date.now() }),
      () => Object.assign(e, before)
    );
    return ok ? e : null;
  }

  function remove(id) {
    const list = all();
    const i = list.findIndex((e) => e.id === id);
    if (i < 0) return null;
    const [e] = list.splice(i, 1);
    if (Store.save()) return e;
    list.splice(i, 0, e);
    return null;
  }

  // للتراجع بعد المسح
  function restore(e) {
    if (find(e.id)) return true;
    const list = all();
    return commit(() => list.push(e), () => list.splice(list.indexOf(e), 1));
  }

  function forMonth(ym) {
    return all().filter((e) => e.date.startsWith(ym));
  }

  function total(list) {
    return list.reduce((sum, e) => sum + e.amount, 0);
  }

  function lastUsedCategory() {
    let last = null;
    all().forEach((e) => { if (!last || e.createdAt > last.createdAt) last = e; });
    return last ? last.categoryId : 'food';
  }

  // [{ date, total, items }] من الأحدث للأقدم
  function groupByDay(list) {
    const sorted = list.slice().sort((a, b) =>
      a.date === b.date ? b.createdAt - a.createdAt : (a.date < b.date ? 1 : -1));
    const groups = [];
    sorted.forEach((e) => {
      let g = groups[groups.length - 1];
      if (!g || g.date !== e.date) {
        g = { date: e.date, total: 0, items: [] };
        groups.push(g);
      }
      g.items.push(e);
      g.total += e.amount;
    });
    return groups;
  }

  return { all, find, add, update, remove, restore, forMonth, total, lastUsedCategory, groupByDay };
})();
