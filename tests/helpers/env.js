// بيحمّل ملفات المنطق (اللي مالهاش دعوة بالـ DOM) جوه vm context بـ localStorage وهمي،
// بنفس ترتيب index.html. كل استدعاء لـ createApp بيبدأ نسخة نضيفة.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const JS_DIR = path.join(__dirname, '..', '..', 'js');
const LOGIC_FILES = ['storage.js', 'format.js', 'expenses.js', 'categories.js', 'budget.js'];
const KEY = 'masareef.v1';

function createApp(initialStorage = {}) {
  const mem = Object.assign({}, initialStorage);
  const localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
    removeItem: (k) => { delete mem[k]; },
  };
  const ctx = vm.createContext({ crypto: globalThis.crypto, Intl, console, localStorage });
  for (const f of LOGIC_FILES) {
    vm.runInContext(fs.readFileSync(path.join(JS_DIR, f), 'utf8'), ctx, { filename: f });
  }
  const api = vm.runInContext('({ Store, Fmt, Expenses, Categories, Budget })', ctx);
  api.Store.load();

  return Object.assign(api, {
    mem,
    // أي كتابة بعد كده هتفشل كأن التخزين اتملى
    failWrites() {
      localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
    },
    // يمنع الوصول للتخزين خالص (زي بعض النوافذ الخاصة)
    blockStorage() {
      localStorage.getItem = () => { throw new Error('SecurityError'); };
      localStorage.setItem = localStorage.getItem;
    },
    saved() {
      return JSON.parse(mem[KEY]);
    },
  });
}

// القيم اللي جاية من الـ vm ليها prototypes تانية، فبنحولها لـ JSON عادي قبل المقارنة
const plain = (v) => JSON.parse(JSON.stringify(v));

module.exports = { createApp, plain, KEY };
