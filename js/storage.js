/* التخزين: كل الداتا في مفتاح واحد في localStorage، ومفيش أي حاجة بتطلع من الجهاز */
const Store = (function () {
  'use strict';

  const KEY = 'masareef.v1';
  const VERSION = 1;

  // الـ id ثابت لكل فئة جاهزة عشان المصاريف تفضل مربوطة بيها حتى لو الاسم اتغير
  const DEFAULT_CATEGORIES = [
    { id: 'food', name: 'أكل', icon: '🍽️', color: '#FF5C7A', builtIn: true },
    { id: 'transport', name: 'مواصلات', icon: '🚌', color: '#FFC857', builtIn: true },
    { id: 'bills', name: 'فواتير', icon: '💡', color: '#7BD3EA', builtIn: true },
    { id: 'rent', name: 'إيجار', icon: '🏠', color: '#A78BFA', builtIn: true },
    { id: 'health', name: 'صحة', icon: '💊', color: '#6EE7B7', builtIn: true },
    { id: 'outings', name: 'خروجات', icon: '🎉', color: '#FF9F68', builtIn: true },
    { id: 'other', name: 'تانيين', icon: '📦', color: '#B9B1C9', builtIn: true },
  ];

  let state = null;
  let persist = true; // false = الداتا في الذاكرة بس (التخزين مقفول أو مش آمن نكتب عليه)
  let error = null;

  function freshState() {
    return {
      version: VERSION,
      expenses: [],
      categories: DEFAULT_CATEGORIES.map((c) => Object.assign({}, c)),
      settings: {},
    };
  }

  function isValidExpense(e) {
    return e && typeof e.id === 'string'
      && Number.isSafeInteger(e.amount) && e.amount > 0
      && typeof e.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.date);
  }

  // v1 هي أول نسخة؛ أي تغيير في شكل الداتا بعد كده هيتحول هنا
  function migrate(data) {
    const s = freshState();
    if (!data || typeof data !== 'object') return s;
    if (Array.isArray(data.expenses)) s.expenses = data.expenses.filter(isValidExpense);
    if (Array.isArray(data.categories) && data.categories.length) s.categories = data.categories;
    DEFAULT_CATEGORIES.forEach((d) => {
      if (!s.categories.some((c) => c.id === d.id)) s.categories.push(Object.assign({}, d));
    });
    if (data.settings && typeof data.settings === 'object') s.settings = data.settings;
    return s;
  }

  function load() {
    error = null;
    let raw;
    try {
      raw = localStorage.getItem(KEY);
    } catch (e) {
      persist = false;
      error = 'unavailable';
      state = freshState();
      return state;
    }
    if (raw === null) {
      state = freshState();
      return state;
    }
    try {
      state = migrate(JSON.parse(raw));
    } catch (e) {
      // الداتا بايظة: ناخد منها نسخة على جنب بدل ما نكتب فوقها
      state = freshState();
      try {
        localStorage.setItem(KEY + '.corrupt.' + Date.now(), raw);
        error = 'corrupt';
      } catch (_) {
        persist = false;
        error = 'corrupt-nobackup';
      }
    }
    return state;
  }

  function save() {
    if (!persist) return true;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  function categories() {
    return state.categories;
  }

  function category(id) {
    return state.categories.find((c) => c.id === id)
      || state.categories.find((c) => c.id === 'other');
  }

  return {
    KEY,
    load,
    save,
    state: () => state,
    categories,
    category,
    error: () => error,
  };
})();
