/* الواجهة: رسم اللستة، فورم الإضافة والتعديل، المسح مع التراجع */
(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const els = {
    banner: $('#storage-banner'),
    monthLabel: $('#month-label'),
    monthTotal: $('#month-total'),
    monthCount: $('#month-count'),
    list: $('#expense-list'),
    empty: $('#empty-state'),
    addBtn: $('#add-btn'),
    dialog: $('#expense-dialog'),
    form: $('#expense-form'),
    title: $('#dialog-title'),
    amount: $('#f-amount'),
    cats: $('#f-categories'),
    date: $('#f-date'),
    note: $('#f-note'),
    error: $('#form-error'),
    del: $('#delete-btn'),
    toast: $('#toast'),
    toastMsg: $('#toast-msg'),
    toastAction: $('#toast-action'),
  };

  const BANNERS = {
    unavailable: 'المتصفح مانع التخزين (ممكن تكون نافذة خاصة)، فالمصاريف هتضيع لما الصفحة تتقفل.',
    corrupt: 'لقينا بيانات قديمة مش سليمة، فاحتفظنا بنسخة منها على جنب وبدأنا من جديد.',
    'corrupt-nobackup': 'البيانات المتخزنة مش سليمة ومقدرناش ناخد منها نسخة، فالتعديلات مش هتتحفظ عشان منكتبش فوقها.',
  };

  let editingId = null;
  let deleteArmed = false;
  let toastTimer = null;

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

  /* ---------- الرسم ---------- */

  function render() {
    const ym = Fmt.currentMonth();
    const monthItems = Expenses.forMonth(ym);
    els.monthLabel.textContent = 'إجمالي ' + Fmt.monthLabel(ym);
    els.monthTotal.replaceChildren(moneyEl(Expenses.total(monthItems)));
    els.monthCount.textContent = Fmt.countLabel(monthItems.length);

    const groups = Expenses.groupByDay(Expenses.all());
    els.empty.hidden = groups.length > 0;
    els.list.replaceChildren(...groups.map(dayEl));
  }

  function dayEl(group) {
    const li = el('li', 'day');
    const head = el('div', 'day-head');
    head.append(el('h3', 'day-label', Fmt.dayLabel(group.date)), moneyEl(group.total, 'day-total'));
    const ul = el('ul', 'day-items');
    ul.append(...group.items.map(itemEl));
    li.append(head, ul);
    return li;
  }

  function itemEl(e) {
    const cat = Store.category(e.categoryId);
    const li = el('li');
    const btn = el('button', 'expense');
    btn.type = 'button';
    btn.dataset.id = e.id;
    btn.setAttribute('aria-label',
      'تعديل: ' + cat.name + '، ' + Fmt.moneyNumber(e.amount) + ' جنيه' + (e.note ? '، ' + e.note : ''));

    const icon = el('span', 'cat-icon', cat.icon);
    icon.style.setProperty('--cat', cat.color);
    icon.setAttribute('aria-hidden', 'true');

    const main = el('span', 'expense-main');
    main.append(el('span', 'expense-cat', cat.name));
    if (e.note) main.append(el('span', 'expense-note', e.note));

    btn.append(icon, main, moneyEl(e.amount, 'expense-amount'));
    li.append(btn);
    return li;
  }

  function renderBanner() {
    const msg = BANNERS[Store.error()];
    els.banner.hidden = !msg;
    els.banner.textContent = msg || '';
  }

  /* ---------- الفورم ---------- */

  function renderCategoryChips(selectedId) {
    const cats = Store.categories();
    if (!cats.some((c) => c.id === selectedId)) selectedId = 'other';
    els.cats.replaceChildren(...cats.map((c) => {
      const label = el('label', 'chip');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'category';
      input.value = c.id;
      input.checked = c.id === selectedId;
      const face = el('span', 'chip-face');
      face.style.setProperty('--cat', c.color);
      const icon = el('span', 'chip-icon', c.icon);
      icon.setAttribute('aria-hidden', 'true');
      face.append(icon, document.createTextNode(c.name));
      label.append(input, face);
      return label;
    }));
  }

  function openForm(expense) {
    editingId = expense ? expense.id : null;
    els.title.textContent = expense ? 'تعديل مصروف' : 'مصروف جديد';
    els.amount.value = expense ? Fmt.amountForInput(expense.amount) : '';
    renderCategoryChips(expense ? expense.categoryId : Expenses.lastUsedCategory());
    els.date.value = expense ? expense.date : Fmt.todayISO();
    els.note.value = expense ? expense.note : '';
    els.del.hidden = !expense;
    disarmDelete();
    setError('');
    els.dialog.showModal();
    if (!expense) els.amount.focus();
  }

  function setError(msg, field) {
    els.error.textContent = msg;
    [els.amount, els.date].forEach((f) => f.removeAttribute('aria-invalid'));
    if (field) {
      field.setAttribute('aria-invalid', 'true');
      field.focus();
    }
  }

  function disarmDelete() {
    deleteArmed = false;
    els.del.textContent = 'مسح';
    els.del.classList.remove('armed');
  }

  function onSubmit(ev) {
    ev.preventDefault();
    const amount = Fmt.parseAmount(els.amount.value);
    if (amount === null) {
      return setError('المبلغ لازم يكون رقم أكبر من صفر (مثلاً 150 أو 75.50).', els.amount);
    }
    const date = els.date.value;
    if (!Fmt.isISODate(date)) return setError('التاريخ مطلوب.', els.date);

    const checked = els.form.querySelector('input[name="category"]:checked');
    const input = {
      amount,
      categoryId: checked ? checked.value : 'other',
      date,
      note: els.note.value.trim().slice(0, 140),
    };
    const wasEdit = editingId !== null;
    const saved = wasEdit ? Expenses.update(editingId, input) : Expenses.add(input);
    if (!saved) return setError('مقدرناش نحفظ. ممكن تكون مساحة التخزين في المتصفح مليانة.');

    els.dialog.close();
    render();
    toast(wasEdit ? 'اتعدّل المصروف' : 'اتضاف المصروف');
  }

  function onDelete() {
    if (!deleteArmed) {
      deleteArmed = true;
      els.del.textContent = 'تأكيد المسح';
      els.del.classList.add('armed');
      return;
    }
    const removed = Expenses.remove(editingId);
    if (!removed) return setError('حصلت مشكلة في المسح، ومقدرناش نحفظ التغيير.');
    els.dialog.close();
    render();
    toast('اتمسح المصروف', {
      action: 'تراجع',
      duration: 5000,
      onAction: () => {
        if (Expenses.restore(removed)) {
          render();
          toast('رجع المصروف');
        } else {
          toast('مقدرناش نرجّع المصروف');
        }
      },
    });
  }

  /* ---------- التوست ---------- */

  function toast(msg, opts) {
    opts = opts || {};
    clearTimeout(toastTimer);
    els.toastMsg.textContent = msg;
    els.toastAction.hidden = !opts.action;
    els.toastAction.textContent = opts.action || '';
    els.toastAction.onclick = opts.action ? () => { hideToast(); opts.onAction(); } : null;
    els.toast.classList.add('show');
    toastTimer = setTimeout(hideToast, opts.duration || 2500);
  }

  function hideToast() {
    clearTimeout(toastTimer);
    els.toast.classList.remove('show');
    els.toastAction.onclick = null;
  }

  /* ---------- الأحداث ---------- */

  els.addBtn.addEventListener('click', () => openForm(null));

  els.list.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button.expense');
    if (!btn) return;
    const e = Expenses.find(btn.dataset.id);
    if (e) openForm(e);
  });

  els.form.addEventListener('submit', onSubmit);
  els.del.addEventListener('click', onDelete);
  els.form.querySelector('[data-close]').addEventListener('click', () => els.dialog.close());

  // الضغط على الخلفية بيقفل الفورم
  els.dialog.addEventListener('click', (ev) => {
    if (ev.target === els.dialog) els.dialog.close();
  });

  els.dialog.addEventListener('close', () => {
    editingId = null;
    disarmDelete();
  });

  // لو التطبيق مفتوح في تابين، التاني يتحدث لوحده
  window.addEventListener('storage', (ev) => {
    if (ev.key !== Store.KEY) return;
    Store.load();
    render();
  });

  Store.load();
  renderBanner();
  render();
})();
