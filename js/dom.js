/* أدوات بناء العناصر المشتركة بين app.js و charts.js. أي نص بيدخل بـ textContent بس */
const Dom = (function () {
  'use strict';

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function moneyEl(piasters, className) {
    const wrap = el('span', 'money' + (className ? ' ' + className : ''));
    const num = el('span', 'num', Fmt.moneyNumber(piasters));
    num.dir = 'ltr';
    wrap.append(num, ' ', el('span', 'cur', 'ج.م'));
    return wrap;
  }

  function badgeEl(cat, className) {
    const b = el('span', className, Categories.badge(cat));
    b.style.setProperty('--cat', cat.color);
    b.setAttribute('aria-hidden', 'true');
    return b;
  }

  return { el, moneyEl, badgeEl };
})();
