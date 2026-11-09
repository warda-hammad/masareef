/* الواجهة: رسم اللستة، فورم المصروف، شاشة الفئات، المسح مع التراجع */
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

    openCats: $('#open-categories'),
    catsDialog: $('#categories-dialog'),
    catList: $('#category-list'),
    newCatBtn: $('#new-category-btn'),
    catDialog: $('#category-dialog'),
    catForm: $('#category-form'),
    catTitle: $('#category-title'),
    catName: $('#c-name'),
    catColors: $('#c-colors'),
    catBuiltinNote: $('#c-builtin-note'),
    catMove: $('#c-move'),
    catMoveLabel: $('#c-move-label'),
    catMoveTo: $('#c-move-to'),
    catError: $('#c-error'),
    catDel: $('#c-delete'),
  };

  const BANNERS = {
    unavailable: 'المتصفح مانع التخزين (ممكن تكون نافذة خاصة)، فالمصاريف هتضيع لما الصفحة تتقفل.',
    corrupt: 'لقينا بيانات قديمة مش سليمة، فاحتفظنا بنسخة منها على جنب وبدأنا من جديد.',
    'corrupt-nobackup': 'البيانات المتخزنة مش سليمة ومقدرناش ناخد منها نسخة، فالتعديلات مش هتتحفظ عشان منكتبش فوقها.',
  };

  const SAVE_FAILED = 'مقدرناش نحفظ. ممكن تكون مساحة التخزين في المتصفح مليانة.';

  const NAME_ERRORS = {
    empty: 'الاسم مطلوب.',
    long: 'الاسم طويل، الحد الأقصى ' + Categories.MAX_NAME + ' حرف.',
    duplicate: 'فيه فئة بنفس الاسم ده.',
  };

  let editingId = null;
  let deleteArmed = false;
  let editingCatId = null;
  let catDeleteArmed = false;
  let catFromExpenseForm = false; // الفئة اتفتحت من زرار "+ فئة" جوه فورم المصروف
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

  function badgeEl(cat, className) {
    const b = el('span', className, Categories.badge(cat));
    b.style.setProperty('--cat', cat.color);
    b.setAttribute('aria-hidden', 'true');
    return b;
  }

  function usageLabel(n) {
    return n ? Fmt.countLabel(n) : 'مفيش مصاريف';
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

    if (els.catsDialog.open) renderCategoryList();
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

    const main = el('span', 'expense-main');
    main.append(el('span', 'expense-cat', cat.name));
    if (e.note) main.append(el('span', 'expense-note', e.note));

    btn.append(badgeEl(cat, 'cat-icon'), main, moneyEl(e.amount, 'expense-amount'));
    li.append(btn);
    return li;
  }

  function renderBanner() {
    const msg = BANNERS[Store.error()];
    els.banner.hidden = !msg;
    els.banner.textContent = msg || '';
  }

  /* ---------- فورم المصروف ---------- */

  function renderCategoryChips(selectedId) {
    const cats = Categories.all();
    if (!cats.some((c) => c.id === selectedId)) selectedId = 'other';
    const chips = cats.map((c) => {
      const label = el('label', 'chip');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'category';
      input.value = c.id;
      input.checked = c.id === selectedId;
      const face = el('span', 'chip-face');
      face.style.setProperty('--cat', c.color);
      face.append(badgeEl(c, 'chip-icon'), document.createTextNode(c.name));
      label.append(input, face);
      return label;
    });
    const addChip = el('button', 'chip-add', '+ فئة');
    addChip.type = 'button';
    addChip.addEventListener('click', () => openCategoryForm(null, true));
    els.cats.replaceChildren(...chips, addChip);
  }

  function selectedCategory() {
    const checked = els.form.querySelector('input[name="category"]:checked');
    return checked ? checked.value : 'other';
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
    setError(els.error, '');
    els.dialog.showModal();
    if (!expense) els.amount.focus();
  }

  function setError(target, msg, field) {
    target.textContent = msg;
    target.closest('form').querySelectorAll('[aria-invalid]').forEach((f) => f.removeAttribute('aria-invalid'));
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
      return setError(els.error, 'المبلغ لازم يكون رقم أكبر من صفر (مثلاً 150 أو 75.50).', els.amount);
    }
    const date = els.date.value;
    if (!Fmt.isISODate(date)) return setError(els.error, 'التاريخ مطلوب.', els.date);

    const input = {
      amount,
      categoryId: selectedCategory(),
      date,
      note: els.note.value.trim().slice(0, 140),
    };
    const wasEdit = editingId !== null;
    const saved = wasEdit ? Expenses.update(editingId, input) : Expenses.add(input);
    if (!saved) return setError(els.error, SAVE_FAILED);

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
    if (!removed) return setError(els.error, 'حصلت مشكلة في المسح، ومقدرناش نحفظ التغيير.');
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

  /* ---------- شاشة الفئات ---------- */

  function renderCategoryList() {
    els.catList.replaceChildren(...Categories.all().map((c) => {
      const li = el('li');
      const btn = el('button', 'category-row');
      btn.type = 'button';
      btn.dataset.id = c.id;
      btn.setAttribute('aria-label', 'تعديل فئة ' + c.name);
      const main = el('span', 'category-main');
      main.append(el('span', 'category-name', c.name),
        el('span', 'category-usage', usageLabel(Categories.usageCount(c.id))));
      btn.append(badgeEl(c, 'cat-icon'), main);
      if (c.builtIn) btn.append(el('span', 'tag', 'أساسية'));
      li.append(btn);
      return li;
    }));
  }

  function openCategories() {
    renderCategoryList();
    els.catsDialog.showModal();
  }

  function renderSwatches(selected) {
    els.catColors.replaceChildren(...Categories.PALETTE.map((p) => {
      const label = el('label', 'swatch');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'color';
      input.value = p.color;
      input.checked = p.color === selected.toUpperCase();
      input.setAttribute('aria-label', p.name);
      const face = el('span', 'swatch-face');
      face.style.setProperty('--c', p.color);
      label.append(input, face);
      return label;
    }));
  }

  function openCategoryForm(cat, fromExpenseForm) {
    editingCatId = cat ? cat.id : null;
    catFromExpenseForm = !!fromExpenseForm;
    els.catTitle.textContent = cat ? 'تعديل فئة' : 'فئة جديدة';
    els.catName.value = cat ? cat.name : '';
    renderSwatches(cat ? cat.color : Categories.suggestColor());
    els.catBuiltinNote.hidden = !(cat && cat.builtIn);
    els.catDel.hidden = !cat || cat.builtIn;
    disarmCatDelete();
    setError(els.catError, '');
    els.catDialog.showModal();
    if (!cat) els.catName.focus();
  }

  function disarmCatDelete() {
    catDeleteArmed = false;
    els.catDel.textContent = 'مسح';
    els.catDel.classList.remove('armed');
    els.catMove.hidden = true;
  }

  function onCategorySubmit(ev) {
    ev.preventDefault();
    const nameError = Categories.validateName(els.catName.value, editingCatId);
    if (nameError) return setError(els.catError, NAME_ERRORS[nameError], els.catName);
    const checked = els.catForm.querySelector('input[name="color"]:checked');
    const input = { name: els.catName.value, color: checked ? checked.value : Categories.suggestColor() };

    const wasEdit = editingCatId !== null;
    const saved = wasEdit ? Categories.update(editingCatId, input) : Categories.add(input);
    if (!saved) return setError(els.catError, SAVE_FAILED);

    els.catDialog.close();
    if (catFromExpenseForm && els.dialog.open) {
      // نرجع لفورم المصروف والفئة الجديدة متختارة
      renderCategoryChips(saved.id);
    } else if (els.dialog.open) {
      renderCategoryChips(selectedCategory());
    }
    render();
    toast(wasEdit ? 'اتعدّلت الفئة' : 'اتضافت الفئة');
  }

  function onCategoryDelete() {
    const id = editingCatId;
    if (!catDeleteArmed) {
      catDeleteArmed = true;
      els.catDel.textContent = 'تأكيد المسح';
      els.catDel.classList.add('armed');
      const n = Categories.usageCount(id);
      if (n) {
        els.catMoveLabel.textContent = 'فيه ' + Fmt.countLabel(n) + ' على الفئة دي. هتتنقل لـ:';
        els.catMoveTo.replaceChildren(...Categories.all().filter((c) => c.id !== id).map((c) => {
          const o = el('option', '', c.name);
          o.value = c.id;
          o.selected = c.id === 'other';
          return o;
        }));
        els.catMove.hidden = false;
      }
      return;
    }

    const moveTo = els.catMove.hidden ? 'other' : els.catMoveTo.value;
    const snap = Categories.remove(id, moveTo);
    if (!snap) return setError(els.catError, 'حصلت مشكلة في المسح، ومقدرناش نحفظ التغيير.');
    els.catDialog.close();
    render();

    const target = Store.category(snap.movedTo);
    const msg = snap.movedIds.length
      ? 'اتمسحت الفئة، ومصاريفها اتنقلت لـ«' + target.name + '»'
      : 'اتمسحت الفئة';
    toast(msg, {
      action: 'تراجع',
      duration: 5000,
      onAction: () => {
        if (Categories.restore(snap)) {
          render();
          toast('رجعت الفئة');
        } else {
          toast('مقدرناش نرجّع الفئة');
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
  els.openCats.addEventListener('click', openCategories);
  els.newCatBtn.addEventListener('click', () => openCategoryForm(null, false));

  els.list.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button.expense');
    if (!btn) return;
    const e = Expenses.find(btn.dataset.id);
    if (e) openForm(e);
  });

  els.catList.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button.category-row');
    if (!btn) return;
    const c = Categories.find(btn.dataset.id);
    if (c) openCategoryForm(c, false);
  });

  els.form.addEventListener('submit', onSubmit);
  els.del.addEventListener('click', onDelete);
  els.catForm.addEventListener('submit', onCategorySubmit);
  els.catDel.addEventListener('click', onCategoryDelete);

  // زرار ✕ والضغط على الخلفية بيقفلوا أي dialog
  document.querySelectorAll('.sheet-dialog').forEach((d) => {
    d.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => d.close()));
    d.addEventListener('click', (ev) => {
      if (ev.target === d) d.close();
    });
  });

  els.dialog.addEventListener('close', () => {
    editingId = null;
    disarmDelete();
  });

  els.catDialog.addEventListener('close', () => {
    editingCatId = null;
    catFromExpenseForm = false;
    disarmCatDelete();
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
