/* الفئات: الجاهزة يتغير اسمها ولونها بس متتمسحش، والمخصصة تتضاف وتتعدل وتتمسح */
const Categories = (function () {
  'use strict';

  const MAX_NAME = 24;

  // الألوان مقفولة على الـ palette دي عشان تفضل مقروءة على الخلفية الغامقة
  const PALETTE = [
    { color: '#FF5C7A', name: 'وردي' },
    { color: '#FFC857', name: 'أصفر' },
    { color: '#7BD3EA', name: 'سماوي' },
    { color: '#A78BFA', name: 'بنفسجي' },
    { color: '#6EE7B7', name: 'أخضر نعناعي' },
    { color: '#FF9F68', name: 'برتقالي' },
    { color: '#B9B1C9', name: 'رمادي' },
    { color: '#F472B6', name: 'فوشيا' },
    { color: '#60A5FA', name: 'أزرق' },
    { color: '#A3E635', name: 'أخضر ليموني' },
  ];

  const all = () => Store.categories();
  const find = (id) => all().find((c) => c.id === id) || null;
  const expenses = () => Store.state().expenses;

  function cleanName(name) {
    return String(name == null ? '' : name).trim().replace(/\s+/g, ' ');
  }

  // بترجع كود الغلط أو null: 'empty' | 'long' | 'duplicate'
  function validateName(name, exceptId) {
    const n = cleanName(name);
    if (!n) return 'empty';
    if (Array.from(n).length > MAX_NAME) return 'long';
    const key = n.toLocaleLowerCase();
    if (all().some((c) => c.id !== exceptId && c.name.toLocaleLowerCase() === key)) return 'duplicate';
    return null;
  }

  function isPaletteColor(color) {
    return typeof color === 'string' && PALETTE.some((p) => p.color === color.toUpperCase());
  }

  // أول لون مش مستخدم، عشان الفئات الجديدة تبان مختلفة
  function suggestColor() {
    const used = new Set(all().map((c) => c.color.toUpperCase()));
    return (PALETTE.find((p) => !used.has(p.color)) || PALETTE[0]).color;
  }

  // الفئات المخصصة ملهاش إيموجي، فبنعرض أول حرف من اسمها
  function badge(c) {
    return c.icon || Array.from(c.name)[0] || '•';
  }

  function usageCount(id) {
    return expenses().filter((e) => e.categoryId === id).length;
  }

  function add(input) {
    if (validateName(input.name) || !isPaletteColor(input.color)) return null;
    const c = {
      id: 'c-' + Store.newId(),
      name: cleanName(input.name),
      icon: null,
      color: input.color.toUpperCase(),
      builtIn: false,
    };
    const list = all();
    return Store.commit(() => list.push(c), () => list.splice(list.indexOf(c), 1)) ? c : null;
  }

  function update(id, input) {
    const c = find(id);
    if (!c || validateName(input.name, id) || !isPaletteColor(input.color)) return null;
    const before = { name: c.name, color: c.color };
    const ok = Store.commit(
      () => Object.assign(c, { name: cleanName(input.name), color: input.color.toUpperCase() }),
      () => Object.assign(c, before)
    );
    return ok ? c : null;
  }

  // بتمسح الفئة وتنقل مصاريفها لفئة تانية (الافتراضي "تانيين").
  // بترجع snapshot يتبعت لـ restore() عشان التراجع
  function remove(id, moveTo) {
    const list = all();
    const i = list.findIndex((c) => c.id === id);
    if (i < 0 || list[i].builtIn) return null;
    const target = moveTo || 'other';
    if (target === id || !find(target)) return null;

    const cat = list[i];
    const moved = expenses().filter((e) => e.categoryId === id);
    const ok = Store.commit(
      () => {
        list.splice(i, 1);
        moved.forEach((e) => { e.categoryId = target; });
      },
      () => {
        list.splice(i, 0, cat);
        moved.forEach((e) => { e.categoryId = id; });
      }
    );
    return ok ? { category: cat, index: i, movedIds: moved.map((e) => e.id), movedTo: target } : null;
  }

  function restore(snap) {
    if (find(snap.category.id)) return true;
    const list = all();
    const ids = new Set(snap.movedIds);
    // المصاريف اللي اتنقلت بس، ولسه في الفئة اللي اتنقلت لها
    const moved = expenses().filter((e) => ids.has(e.id) && e.categoryId === snap.movedTo);
    const at = Math.min(snap.index, list.length);
    return Store.commit(
      () => {
        list.splice(at, 0, snap.category);
        moved.forEach((e) => { e.categoryId = snap.category.id; });
      },
      () => {
        list.splice(list.indexOf(snap.category), 1);
        moved.forEach((e) => { e.categoryId = snap.movedTo; });
      }
    );
  }

  return {
    MAX_NAME,
    PALETTE,
    all,
    find,
    validateName,
    isPaletteColor,
    suggestColor,
    badge,
    usageCount,
    add,
    update,
    remove,
    restore,
  };
})();
