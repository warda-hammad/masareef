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
    dateHint: $('#f-date-hint'),
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

    budgetBox: $('#budget-box'),
    setBudget: $('#set-budget'),
    budgetActive: $('#budget-active'),
    budgetUsed: $('#budget-used'),
    editBudget: $('#edit-budget'),
    budgetBar: $('#budget-bar'),
    budgetFill: $('#budget-fill'),
    budgetStatus: $('#budget-status'),
    budgetDialog: $('#budget-dialog'),
    budgetForm: $('#budget-form'),
    budgetAmount: $('#b-amount'),
    budgetError: $('#b-error'),
    budgetClear: $('#b-clear'),

    tabList: $('#tab-list'),
    tabDash: $('#tab-dash'),
    viewList: $('#view-list'),
    viewDash: $('#view-dash'),
    dashPrev: $('#dash-prev'),
    dashNext: $('#dash-next'),
    dashMonth: $('#dash-month'),
    dashTotal: $('#dash-total'),
    dashDelta: $('#dash-delta'),
    dashTop: $('#dash-top'),
    dashTopSub: $('#dash-top-sub'),
    dashAvg: $('#dash-avg'),
    dashAvgSub: $('#dash-avg-sub'),
    dashEmpty: $('#dash-empty'),
    dashCharts: $('#dash-charts'),
    catChart: $('#cat-chart'),
    catTable: $('#cat-table'),
    dayChart: $('#day-chart'),
    dayKey: $('#day-key'),
    dayTable: $('#day-table'),

    filtersBox: $('#filters'),
    fltQ: $('#flt-q'),
    fltMonth: $('#flt-month'),
    fltCat: $('#flt-cat'),
    filterSummary: $('#filter-summary'),
    filterResult: $('#filter-result'),
    filterClear: $('#filter-clear'),
    noResults: $('#no-results'),

    openData: $('#open-data'),
    dataDialog: $('#data-dialog'),
    exportBtn: $('#export-btn'),
    exportHint: $('#export-hint'),
    importBtn: $('#import-btn'),
    importFile: $('#import-file'),
    dataError: $('#data-error'),
    importDialog: $('#import-dialog'),
    importForm: $('#import-form'),
    impSummary: $('#imp-summary'),
    impNotes: $('#imp-notes'),
    impErrorsBox: $('#imp-errors-box'),
    impErrorsTitle: $('#imp-errors-title'),
    impErrors: $('#imp-errors'),
    impCaption: $('#imp-caption'),
    impPreview: $('#imp-preview'),
    impWarning: $('#imp-warning'),
    impError: $('#imp-error'),
    impConfirm: $('#imp-confirm'),

    wipeOpen: $('#wipe-open'),
    wipeDialog: $('#wipe-dialog'),
    wipeForm: $('#wipe-form'),
    wipeSummary: $('#wipe-summary'),
    wipeExport: $('#wipe-export'),
    wipeConfirm: $('#wipe-confirm'),
    wipeError: $('#wipe-error'),
    wipeSubmit: $('#wipe-submit'),

    installBtn: $('#install-btn'),
    iosHint: $('#ios-hint'),
    offlineNote: $('#offline-note'),
  };

  const BANNERS = {
    unavailable: 'المتصفح مانع التخزين (ممكن تكون نافذة خاصة)، فالمصاريف هتضيع لما الصفحة تتقفل.',
    corrupt: 'لقينا بيانات قديمة مش سليمة، فاحتفظنا بنسخة منها على جنب وبدأنا من جديد.',
    'corrupt-nobackup': 'البيانات المتخزنة مش سليمة ومقدرناش ناخد منها نسخة، فالتعديلات مش هتتحفظ عشان منكتبش فوقها.',
  };

  const SAVE_FAILED = 'مقدرناش نحفظ. ممكن تكون مساحة التخزين في المتصفح مليانة.';

  const MAX_AMOUNT_TEXT = Fmt.moneyNumber(Fmt.MAX_PIASTERS) + ' ج.م';

  // مفاتيحها هي أكواد Fmt.checkAmount
  const AMOUNT_ERRORS = {
    empty: 'المبلغ مطلوب.',
    invalid: 'المبلغ لازم يكون رقم، مثلاً 150 أو 75.50.',
    decimals: 'المبلغ ممكن يكون فيه رقمين بس بعد العلامة (القروش)، مثلاً 75.50.',
    zero: 'المبلغ لازم يكون أكبر من صفر.',
    'too-big': 'المبلغ كبير قوي. الحد الأقصى ' + MAX_AMOUNT_TEXT + '.',
  };

  const BUDGET_ERRORS = {
    empty: 'الميزانية مطلوبة.',
    invalid: 'الميزانية لازم تكون رقم، مثلاً 5000.',
    decimals: 'الميزانية ممكن يكون فيها رقمين بس بعد العلامة (القروش).',
    zero: 'الميزانية لازم تكون أكبر من صفر.',
    'too-big': 'الميزانية كبيرة قوي. الحد الأقصى ' + MAX_AMOUNT_TEXT + '.',
  };

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
  // اختصار "مصروف جديد" من أيقونة التطبيق (manifest shortcuts → ./#add). بنقراه قبل ما syncHash يغير الرابط
  const openAddOnLoad = location.hash === '#add';
  let view = location.hash === '#dashboard' ? 'dash' : 'list';
  let filter = view === 'list' ? Filters.parse(location.hash) : Filters.clean();
  let dashMonth = Fmt.currentMonth();
  let dayChartWidth = 0;

  const { el, moneyEl, badgeEl } = Dom;

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
    renderBudget(Budget.status(ym));

    renderList();

    if (els.catsDialog.open) renderCategoryList();
    if (view === 'dash') renderDashboard();
  }

  /* ---------- الداشبورد ---------- */

  function setView(next, focus) {
    view = next;
    const dash = view === 'dash';
    els.viewDash.hidden = !dash;
    els.viewList.hidden = dash;
    [[els.tabList, !dash], [els.tabDash, dash]].forEach(([tab, on]) => {
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
    });
    if (focus) (dash ? els.tabDash : els.tabList).focus();
    syncHash();
    Charts.hideTip();
    if (dash) renderDashboard();
  }

  function renderDelta(s) {
    const prev = Fmt.monthLabel(s.prevYm);
    let text = '';
    let trend = '';
    if (s.deltaPct === null) {
      text = s.total ? 'مفيش مصاريف في ' + prev + ' للمقارنة' : '';
    } else if (s.total === s.prevTotal) {
      text = 'زي ' + prev + ' بالظبط';
    } else if (s.deltaPct === 0) {
      text = 'تقريباً زي ' + prev;
    } else {
      trend = s.deltaPct > 0 ? 'up' : 'down';
      text = (s.deltaPct > 0 ? '↑ ' : '↓ ') + '‎' + Math.abs(s.deltaPct) + '% عن ' + prev;
    }
    els.dashDelta.textContent = text;
    els.dashDelta.dataset.trend = trend;
  }

  function renderDashboard() {
    const today = Fmt.todayISO();
    const range = Stats.monthRange(today);
    if (dashMonth < range.min) dashMonth = range.min;
    if (dashMonth > range.max) dashMonth = range.max;
    els.dashPrev.disabled = dashMonth <= range.min;
    els.dashNext.disabled = dashMonth >= range.max;

    const s = Stats.summary(dashMonth, today);
    const isCurrent = dashMonth === today.slice(0, 7);
    els.dashMonth.textContent = Fmt.monthLabel(dashMonth);
    els.dashTotal.replaceChildren(moneyEl(s.total));
    renderDelta(s);

    if (s.top) {
      const cat = Store.category(s.top.categoryId);
      els.dashTop.replaceChildren(badgeEl(cat, 'tile-badge'), document.createTextNode(cat.name));
      els.dashTopSub.replaceChildren(moneyEl(s.top.total), ' · ' + Charts.percent(s.top.share));
    } else {
      els.dashTop.textContent = '—';
      els.dashTopSub.textContent = '';
    }

    if (s.elapsedDays) {
      els.dashAvg.replaceChildren(moneyEl(s.dailyAvg));
      els.dashAvgSub.textContent = 'على ' + Fmt.daysLabel(s.elapsedDays) + (isCurrent ? ' لحد النهارده' : '');
    } else {
      els.dashAvg.textContent = '—';
      els.dashAvgSub.textContent = 'الشهر لسه مبدأش';
    }

    els.dashEmpty.hidden = s.count > 0;
    els.dashCharts.hidden = s.count === 0;
    if (!s.count) return;

    Charts.categoryBars(els.catChart, s.byCategory);
    Charts.categoryTable(els.catTable, s.byCategory);
    Charts.dayColumns(els.dayChart, s.byDay, {
      today: isCurrent ? Number(today.slice(8, 10)) : null,
      avg: s.dailyAvg,
    });
    dayChartWidth = els.dayChart.clientWidth;
    Charts.dayTable(els.dayTable, s.byDay);

    const avgKey = el('span', 'key key-avg');
    avgKey.append('المتوسط اليومي ', moneyEl(s.dailyAvg));
    const keys = [avgKey];
    if (isCurrent) keys.push(el('span', 'key key-today', 'النهارده'));
    els.dayKey.replaceChildren(...keys);
  }

  function moveMonth(n) {
    dashMonth = Stats.shiftMonth(dashMonth, n);
    Charts.hideTip();
    renderDashboard();
  }

  /* ---------- اللستة والفلتر ---------- */

  function renderList() {
    const all = Expenses.all();
    // لو الفئة المختارة في الفلتر اتمسحت، نرجع لكل الفئات
    if (filter.cat && !Categories.find(filter.cat)) {
      filter.cat = '';
      syncHash();
    }
    renderFilterControls();

    const shown = Filters.apply(all, filter);
    const active = Filters.isActive(filter);
    els.filtersBox.hidden = all.length === 0;
    els.empty.hidden = all.length > 0;
    els.noResults.hidden = !(all.length && active && !shown.length);
    els.filterSummary.hidden = !active;
    if (active) {
      els.filterResult.replaceChildren(shown.length
        ? Fmt.countLabel(shown.length) + ' · '
        : 'مفيش نتايج', ...(shown.length ? [moneyEl(Expenses.total(shown))] : []));
    }
    els.list.replaceChildren(...Expenses.groupByDay(shown).map(dayEl));
  }

  function option(value, text, selected) {
    const o = el('option', '', text);
    o.value = value;
    o.selected = value === selected;
    return o;
  }

  function renderFilterControls() {
    const months = Filters.monthOptions(Stats.monthRange(Fmt.todayISO()), filter.month);
    els.fltMonth.replaceChildren(option('', 'كل الشهور', filter.month),
      ...months.map((ym) => option(ym, Fmt.monthLabel(ym), filter.month)));
    els.fltCat.replaceChildren(option('', 'كل الفئات', filter.cat),
      ...Categories.all().map((c) => option(c.id, c.name, filter.cat)));
    // منلمسش خانة البحث وهي بتتكتب فيها، عشان مكان المؤشر ميتغيرش
    if (els.fltQ.value !== filter.q) els.fltQ.value = filter.q;
  }

  function syncHash() {
    let hash = '';
    if (view === 'dash') hash = 'dashboard';
    else hash = Filters.serialize(filter);
    history.replaceState(null, '', hash ? '#' + hash : location.pathname + location.search);
  }

  function updateFilter(patch) {
    filter = Filters.clean(Object.assign({}, filter, patch));
    syncHash();
    renderList();
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

  function renderBudget(s) {
    const has = s.level !== 'none';
    els.setBudget.hidden = has;
    els.budgetActive.hidden = !has;
    els.budgetBox.dataset.level = s.level;
    if (!has) return;

    const pct = el('span', 'num', s.percent + '%');
    pct.dir = 'ltr';
    els.budgetUsed.replaceChildren('اتصرف ', pct, ' من ', moneyEl(s.budget));

    const shown = Math.min(s.percent, 100);
    els.budgetFill.style.width = shown + '%';
    els.budgetBar.setAttribute('aria-valuenow', String(shown));
    els.budgetBar.setAttribute('aria-valuetext', s.percent + '%');

    if (s.level === 'over') {
      els.budgetStatus.replaceChildren(...(s.over
        ? ['⛔ الصرف عدّى الميزانية بـ ', moneyEl(s.over)]
        : ['⛔ الميزانية خلصت بالظبط.']));
    } else {
      els.budgetStatus.replaceChildren(
        s.level === 'warn' ? '⚠️ الصرف قرّب من الميزانية: فاضل ' : 'فاضل ',
        moneyEl(s.remaining), '، يعني ', moneyEl(s.perDay), ' في اليوم لحد آخر الشهر.');
    }
  }

  // رسالة التوست لما مصروف يطلّع صرف الشهر لمستوى تحذير جديد
  function budgetWarning(level, s, ym) {
    const month = ym === Fmt.currentMonth() ? 'الشهر ده' : Fmt.monthLabel(ym);
    if (level === 'warn') return 'تحذير: صرف ' + month + ' وصل ' + s.percent + '% من الميزانية';
    return s.over
      ? 'تحذير: صرف ' + month + ' عدّى الميزانية بـ ' + Fmt.moneyNumber(s.over) + ' ج.م'
      : 'تحذير: ميزانية ' + month + ' خلصت بالظبط';
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
    updateDateHint();
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
      // قارئ الشاشة يقرا رسالة الغلط مع الخانة
      field.setAttribute('aria-describedby', target.id);
      field.focus();
    }
  }

  function disarmDelete() {
    deleteArmed = false;
    els.del.textContent = 'مسح';
    els.del.classList.remove('armed');
  }

  // تنبيه تحت خانة التاريخ لو التاريخ في المستقبل (مبيمنعش الحفظ)
  function updateDateHint() {
    const note = Fmt.futureNote(els.date.value);
    els.dateHint.textContent = note;
    els.dateHint.hidden = !note;
  }

  function onSubmit(ev) {
    ev.preventDefault();
    const checked = Fmt.checkAmount(els.amount.value);
    if (checked.error) return setError(els.error, AMOUNT_ERRORS[checked.error], els.amount);
    const amount = checked.piasters;
    const date = els.date.value;
    if (!Fmt.isISODate(date)) return setError(els.error, 'التاريخ مطلوب.', els.date);

    const input = {
      amount,
      categoryId: selectedCategory(),
      date,
      note: els.note.value.trim().slice(0, 140),
    };
    const wasEdit = editingId !== null;
    const ym = date.slice(0, 7);
    const before = Budget.status(ym);
    const saved = wasEdit ? Expenses.update(editingId, input) : Expenses.add(input);
    if (!saved) return setError(els.error, SAVE_FAILED);

    els.dialog.close();
    render();
    const after = Budget.status(ym);
    const level = Budget.crossed(before, after);
    if (Fmt.isFutureDate(date)) {
      // تنبيه بس، مش منع: ممكن يكون مصروف متخطط له
      toast((wasEdit ? 'اتعدّل المصروف' : 'اتضاف المصروف') + ' بتاريخ لسه مجاش: ' + Fmt.dayLabel(date),
        { tone: 'warn', duration: 5000 });
    } else if (level) {
      toast(budgetWarning(level, after, ym), { tone: level, duration: 5000 });
    } else if (Filters.isActive(filter) && !Filters.matches(saved, filter)) {
      toast((wasEdit ? 'اتعدّل المصروف' : 'اتضاف المصروف') + '، بس مش باين بسبب الفلتر', {
        action: 'مسح الفلتر',
        duration: 5000,
        onAction: clearFilter,
      });
    } else {
      toast(wasEdit ? 'اتعدّل المصروف' : 'اتضاف المصروف');
    }
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

  /* ---------- الميزانية ---------- */

  function openBudgetForm() {
    const b = Budget.get();
    els.budgetAmount.value = b ? Fmt.amountForInput(b) : '';
    els.budgetClear.hidden = !b;
    setError(els.budgetError, '');
    els.budgetDialog.showModal();
    els.budgetAmount.focus();
  }

  function onBudgetSubmit(ev) {
    ev.preventDefault();
    const checked = Fmt.checkAmount(els.budgetAmount.value);
    if (checked.error) return setError(els.budgetError, BUDGET_ERRORS[checked.error], els.budgetAmount);
    const amount = checked.piasters;
    if (!Budget.set(amount)) return setError(els.budgetError, SAVE_FAILED);
    els.budgetDialog.close();
    render();
    toast('اتحفظت الميزانية');
  }

  function onBudgetClear() {
    const previous = Budget.get();
    if (!Budget.clear()) return setError(els.budgetError, SAVE_FAILED);
    els.budgetDialog.close();
    render();
    toast('اتشالت الميزانية', {
      action: 'تراجع',
      duration: 5000,
      onAction: () => {
        if (Budget.set(previous)) {
          render();
          toast('رجعت الميزانية');
        } else {
          toast('مقدرناش نرجّع الميزانية');
        }
      },
    });
  }

  /* ---------- تصدير واستيراد CSV ---------- */

  const MAX_FILE_BYTES = 5 * 1024 * 1024;
  const PREVIEW_ROWS = 5;
  const MAX_LISTED_ERRORS = 50;

  const FILE_ERRORS = {
    empty: 'الملف فاضي.',
    header: 'مش لاقيين عمود التاريخ أو المبلغ في أول سطر. أول سطر لازم يكون زي: date,amount,category,note',
    'too-many': 'الملف فيه أكتر من ' + Fmt.moneyNumber(Csv.MAX_ROWS * 100) + ' صف.',
    big: 'الملف كبير قوي (الحد الأقصى 5 ميجا).',
    read: 'مقدرناش نقرا الملف.',
  };

  // أخطاء صفوف الـ CSV: التاريخ، أو المبلغ بنفس أكواد Fmt.checkAmount
  const ROW_ERRORS = {
    date: 'التاريخ مش مفهوم',
    'amount:empty': 'المبلغ فاضي',
    'amount:invalid': 'المبلغ مش رقم',
    'amount:decimals': 'المبلغ فيه أكتر من رقمين بعد العلامة',
    'amount:zero': 'المبلغ لازم يكون أكبر من صفر',
    'amount:too-big': 'المبلغ كبير قوي (الحد الأقصى ' + MAX_AMOUNT_TEXT + ')',
  };
  const rowError = (e) => ROW_ERRORS[e.reason ? e.code + ':' + e.reason : e.code] || ROW_ERRORS.date;

  let pendingImport = null;

  function openData() {
    const has = Expenses.all().length > 0;
    els.exportBtn.disabled = !has;
    els.exportHint.hidden = has;
    els.dataError.textContent = '';
    els.dataDialog.showModal();
  }

  function onExport() {
    const all = Expenses.all();
    if (!all.length) return;
    const blob = new Blob([Csv.exportText(all)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = el('a');
    a.href = url;
    a.download = 'masareef-' + Fmt.todayISO() + '.csv';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('اتصدّر ملف فيه ' + Fmt.countLabel(all.length));
  }

  function onImportFile() {
    const file = els.importFile.files[0];
    els.importFile.value = ''; // عشان نفس الملف يتختار تاني لو اتعدل
    if (!file) return;
    els.dataError.textContent = '';
    if (file.size > MAX_FILE_BYTES) {
      els.dataError.textContent = FILE_ERRORS.big;
      return;
    }
    file.arrayBuffer().then((buf) => {
      const analysis = Csv.analyze(Csv.decode(new Uint8Array(buf)));
      if (analysis.error) {
        els.dataError.textContent = FILE_ERRORS[analysis.error];
        return;
      }
      pendingImport = analysis;
      els.dataDialog.close();
      showImportPreview(analysis);
    }, () => {
      els.dataError.textContent = FILE_ERRORS.read;
    });
  }

  function showImportPreview(a) {
    els.impSummary.replaceChildren(
      'الصفوف في الملف: ', el('strong', 'num', String(a.total)),
      ' · سليمة: ', el('strong', 'num', String(a.rows.length)),
      ...(a.errors.length ? [' · فيها مشاكل: ', el('strong', 'num', String(a.errors.length))] : []));

    els.impErrorsBox.hidden = !a.errors.length;
    els.impErrorsBox.open = a.rows.length === 0;
    els.impErrorsTitle.textContent = 'الصفوف اللي فيها مشاكل وهتتساب (' + a.errors.length + ')';
    const listed = a.errors.slice(0, MAX_LISTED_ERRORS).map((e) =>
      el('li', '', 'سطر ' + e.line + ': ' + rowError(e) + (e.value ? ' («' + e.value + '»)' : '')));
    if (a.errors.length > MAX_LISTED_ERRORS) {
      listed.push(el('li', 'hint', 'و' + (a.errors.length - MAX_LISTED_ERRORS) + ' غيرهم.'));
    }
    els.impErrors.replaceChildren(...listed);

    const preview = a.rows.slice(0, PREVIEW_ROWS);
    els.impCaption.textContent = preview.length
      ? (a.rows.length > PREVIEW_ROWS ? 'أول ' + PREVIEW_ROWS + ' صفوف من ' + a.rows.length : 'كل الصفوف')
      : 'مفيش صفوف سليمة في الملف.';
    els.impPreview.replaceChildren(...preview.map((r) => {
      const tr = el('tr');
      const amount = el('td');
      amount.append(moneyEl(r.amount));
      const cat = el('td', '', r.categoryId ? Store.category(r.categoryId).name : r.categoryName);
      if (!r.categoryId) cat.append(' ', el('span', 'tag', 'جديدة'));
      tr.append(el('td', 'num', r.date), amount, cat, el('td', 'imp-note', r.note));
      return tr;
    }));

    els.importForm.querySelector('input[value="merge"]').checked = true;
    els.impError.textContent = '';
    updateImportMode();
    els.importDialog.showModal();
  }

  function importMode() {
    return els.importForm.querySelector('input[name="mode"]:checked').value;
  }

  function updateImportMode() {
    const a = pendingImport;
    if (!a) return;
    const mode = importMode();
    const dups = mode === 'merge' ? Csv.countDuplicates(a.rows) : 0;
    const count = a.rows.length - dups;

    const notes = [];
    if (a.newCategories.length) notes.push('هيتعمل فئات جديدة: ' + a.newCategories.join('، '));
    if (a.future === 1) {
      notes.push('⚠️ فيه صف واحد تاريخه لسه مجاش، وهيتسجل عادي.');
    } else if (a.future) {
      const rows = a.future === 2 ? 'صفين' : a.future + (a.future <= 10 ? ' صفوف' : ' صف');
      notes.push('⚠️ فيه ' + rows + ' تاريخهم لسه مجاش، وهيتسجلوا عادي.');
    }
    if (dups === 1) notes.push('فيه مصروف واحد في الملف موجود قبل كده، فهيتساب.');
    else if (dups) notes.push(Fmt.countLabel(dups) + ' في الملف موجودين قبل كده، فهيتسابوا.');
    els.impNotes.replaceChildren(...notes.map((t) => el('li', '', t)));

    const existing = Expenses.all().length;
    els.impWarning.hidden = !(mode === 'replace' && existing);
    els.impWarning.textContent = '⚠️ كل المصاريف الموجودة دلوقتي هتتمسح (' + Fmt.countLabel(existing)
      + '). بعد الاستيراد «تراجع» بيفضل 5 ثواني بس، فالأحسن تصدير نسخة احتياطية الأول.';

    els.impConfirm.disabled = count === 0;
    els.impConfirm.textContent = count === 0
      ? 'مفيش جديد للاستيراد'
      : (mode === 'replace' ? 'استبدال بـ ' : 'استيراد ') + Fmt.countLabel(count);  }

  function onImportConfirm(ev) {
    ev.preventDefault();
    const mode = importMode();
    const result = Csv.apply(pendingImport, mode);
    if (!result) {
      els.impError.textContent = SAVE_FAILED;
      return;
    }
    pendingImport = null;
    els.importDialog.close();
    render();

    const parts = [(mode === 'replace' ? 'اتستبدلت المصاريف بـ ' : 'اتضاف ') + Fmt.countLabel(result.added)];
    const n = result.categoriesAdded;
    if (n) parts.push(n === 1 ? 'وفئة جديدة' : n === 2 ? 'وفئتين جداد' : 'و' + n + (n <= 10 ? ' فئات جديدة' : ' فئة جديدة'));
    toast(parts.join(' '), {
      action: 'تراجع',
      duration: 5000,
      onAction: () => {
        if (Csv.undo(result.snapshot)) {
          render();
          toast('رجعت البيانات زي ما كانت');
        } else {
          toast('مقدرناش نرجّع البيانات');
        }
      },
    });
  }

  /* ---------- مسح كل البيانات ---------- */

  const WIPE_WORD = 'امسح';

  function openWipe() {
    const state = Store.state();
    const custom = state.categories.filter((c) => !c.builtIn).length;
    const parts = [state.expenses.length ? Fmt.countLabel(state.expenses.length) : 'مفيش مصاريف'];
    if (custom) parts.push(custom === 1 ? 'فئة مخصصة' : custom === 2 ? 'فئتين مخصصين' : custom + ' فئات مخصصة');
    if (Budget.get()) parts.push('الميزانية الشهرية');
    els.wipeSummary.textContent = '⚠️ هيتمسح من الجهاز ده: ' + parts.join('، ')
      + '، وأي تعديل على الفئات الأساسية. مفيش رجوع بعد كده.';
    els.wipeExport.hidden = state.expenses.length === 0;
    els.wipeConfirm.value = '';
    els.wipeSubmit.disabled = true;
    els.wipeError.textContent = '';
    els.dataDialog.close();
    els.wipeDialog.showModal();
    els.wipeConfirm.focus();
  }

  function onWipe(ev) {
    ev.preventDefault();
    if (Filters.normalize(els.wipeConfirm.value) !== Filters.normalize(WIPE_WORD)) return;
    if (!Store.clearAll()) {
      els.wipeError.textContent = 'المتصفح رفض المسح. المسح ممكن كمان من إعدادات المتصفح: «مسح بيانات الموقع».';
      return;
    }
    filter = Filters.clean();
    dashMonth = Fmt.currentMonth();
    els.fltQ.value = '';
    els.wipeDialog.close();
    syncHash();
    renderBanner();
    render();
    toast('اتمسحت كل البيانات من الجهاز ده');
  }

  /* ---------- PWA: التثبيت والعمل من غير نت والتحديث ---------- */

  let installPrompt = null;
  let updateRequested = false;

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  }

  // الآيفون مفيهوش زرار تثبيت، فبنشرح الطريقة بالإيد
  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function setupInstall() {
    els.iosHint.hidden = !(isIOS() && !isStandalone());

    window.addEventListener('beforeinstallprompt', (ev) => {
      ev.preventDefault();
      installPrompt = ev;
      els.installBtn.hidden = false;
    });
    els.installBtn.addEventListener('click', () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      installPrompt.userChoice.finally(() => {
        installPrompt = null;
        els.installBtn.hidden = true;
      });
    });
    window.addEventListener('appinstalled', () => {
      els.installBtn.hidden = true;
      toast('اتثبت التطبيق على الجهاز');
    });
  }

  // service worker بيشتغل على https أو localhost بس، مش من file://
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;

    // بنعمل reload بس لو اليوزر دوس "تحديث"، مش أول مرة الـ SW يمسك الصفحة
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (updateRequested) location.reload();
    });

    navigator.serviceWorker.register('sw.js').then((reg) => {
      const offer = (worker) => toast('فيه نسخة جديدة من التطبيق', {
        action: 'تحديث',
        duration: 15000,
        onAction: () => {
          updateRequested = true;
          worker.postMessage('skip-waiting');
        },
      });
      if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) offer(worker);
          if (worker.state === 'activated') els.offlineNote.hidden = false;
        });
      });
      if (reg.active) els.offlineNote.hidden = false;
    }).catch(() => {
      // من غير SW التطبيق بيشتغل عادي، بس محتاج نت أول ما يتفتح
    });
  }

  /* ---------- التوست ---------- */

  // tone: 'warn' أو 'over' لتوست التحذير
  function toast(msg, opts) {
    opts = opts || {};
    clearTimeout(toastTimer);
    els.toast.dataset.tone = opts.tone || '';
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
  els.date.addEventListener('input', updateDateHint);
  els.date.addEventListener('change', updateDateHint);
  els.del.addEventListener('click', onDelete);
  els.catForm.addEventListener('submit', onCategorySubmit);
  els.catDel.addEventListener('click', onCategoryDelete);
  els.setBudget.addEventListener('click', openBudgetForm);
  els.editBudget.addEventListener('click', openBudgetForm);
  els.budgetForm.addEventListener('submit', onBudgetSubmit);
  els.budgetClear.addEventListener('click', onBudgetClear);
  els.openData.addEventListener('click', openData);
  els.exportBtn.addEventListener('click', onExport);
  els.importBtn.addEventListener('click', () => els.importFile.click());
  els.importFile.addEventListener('change', onImportFile);
  els.importForm.addEventListener('change', (ev) => {
    if (ev.target.name === 'mode') updateImportMode();
  });
  els.importForm.addEventListener('submit', onImportConfirm);
  els.importDialog.addEventListener('close', () => { pendingImport = null; });
  els.wipeOpen.addEventListener('click', openWipe);
  els.wipeExport.addEventListener('click', onExport);
  els.wipeConfirm.addEventListener('input', () => {
    els.wipeSubmit.disabled = Filters.normalize(els.wipeConfirm.value) !== Filters.normalize(WIPE_WORD);
  });
  els.wipeForm.addEventListener('submit', onWipe);

  els.tabList.addEventListener('click', () => setView('list'));
  els.tabDash.addEventListener('click', () => setView('dash'));
  // نمط الـ tabs: الأسهم بتنقل بين التابين
  [els.tabList, els.tabDash].forEach((tab) => tab.addEventListener('keydown', (ev) => {
    if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
    ev.preventDefault();
    setView(view === 'dash' ? 'list' : 'dash', true);
  }));
  function clearFilter() {
    updateFilter(Filters.EMPTY);
    els.fltQ.focus();
  }

  els.fltQ.addEventListener('input', () => updateFilter({ q: els.fltQ.value }));
  els.fltMonth.addEventListener('change', () => updateFilter({ month: els.fltMonth.value }));
  els.fltCat.addEventListener('change', () => updateFilter({ cat: els.fltCat.value }));
  els.filterClear.addEventListener('click', clearFilter);

  // لو الرابط اتغير بإيد اليوزر أو بزرار الرجوع
  window.addEventListener('hashchange', () => {
    if (location.hash === '#dashboard') return setView('dash');
    if (location.hash === '#add') {
      syncHash();
      return openForm(null);
    }
    filter = Filters.parse(location.hash);
    if (view !== 'list') setView('list');
    else renderList();
  });

  els.dashPrev.addEventListener('click', () => moveMonth(-1));
  els.dashNext.addEventListener('click', () => moveMonth(1));

  // عرض chart الأيام بيتحسب بالبكسل، فنعيد رسمه لو العرض اتغير
  if (window.ResizeObserver) {
    new ResizeObserver(() => {
      if (view === 'dash' && !els.dashCharts.hidden && els.dayChart.clientWidth !== dayChartWidth) {
        renderDashboard();
      }
    }).observe(els.dayChart);
  }

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
  setView(view);
  render();
  setupInstall();
  registerServiceWorker();
  if (openAddOnLoad) openForm(null);
})();
