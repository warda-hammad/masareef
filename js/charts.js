/* رسم الـ charts من غير مكتبة: أعمدة أفقية للفئات (HTML) وأعمدة للأيام (SVG)، وتولتيب مشترك.
   الأعمدة بلون واحد لأن اسم الفئة مكتوب جنب كل عمود؛ لون الفئة في البادج بس */
const Charts = (function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const { el, moneyEl, badgeEl } = Dom;

  // ‎ (LRM) قبل الرقم عشان "68%" متتقلبش لـ "%68" لما تيجي بعد كلام عربي
  function percent(share) {
    if (share > 0 && share < 0.01) return 'أقل من ‎1%';
    return '‎' + Math.round(share * 100) + '%';
  }

  /* ---------- التولتيب ---------- */

  const tip = document.getElementById('chart-tip');

  function showTip(target, lines) {
    tip.replaceChildren(...lines.map((line, i) => el('span', i ? 'tip-sub' : 'tip-main', line)));
    tip.hidden = false;
    const r = target.getBoundingClientRect();
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    const left = Math.min(Math.max(r.left + r.width / 2 - w / 2, 8), window.innerWidth - w - 8);
    let top = r.top - h - 8;
    if (top < 8) top = r.bottom + 8;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }

  function hideTip() {
    tip.hidden = true;
  }

  // الماوس: يظهر مع الـ hover. اللمس: يظهر مع الضغط ويختفي لما نضغط في حتة تانية
  function bindTip(node, getLines) {
    node.dataset.tip = '';
    node.addEventListener('pointerenter', (ev) => {
      if (ev.pointerType === 'mouse') showTip(node, getLines());
    });
    node.addEventListener('pointerleave', (ev) => {
      if (ev.pointerType === 'mouse') hideTip();
    });
    node.addEventListener('click', () => showTip(node, getLines()));
  }

  document.addEventListener('pointerdown', (ev) => {
    if (!ev.target.closest('[data-tip]')) hideTip();
  });
  window.addEventListener('scroll', hideTip, { passive: true });

  /* ---------- الفئات ---------- */

  function categoryBars(list, rows) {
    const max = rows.length ? rows[0].total : 0;
    list.replaceChildren(...rows.map((r) => {
      const cat = Store.category(r.categoryId);
      const li = el('li', 'hbar');

      const label = el('span', 'hbar-label');
      label.append(badgeEl(cat, 'hbar-badge'), el('span', 'hbar-name', cat.name));

      const track = el('span', 'hbar-track');
      const fill = el('span', 'hbar-fill');
      // حد أدنى صغير عشان أصغر فئة تفضل باينة
      fill.style.width = (max ? Math.max((r.total / max) * 100, 1.5) : 0) + '%';
      track.append(fill);

      li.append(label, track, moneyEl(r.total, 'hbar-value'));
      bindTip(li, () => [
        cat.name,
        Fmt.moneyNumber(r.total) + ' ج.م · ' + percent(r.share) + ' من الشهر',
        Fmt.countLabel(r.count),
      ]);
      return li;
    }));
  }

  function categoryTable(tbody, rows) {
    tbody.replaceChildren(...rows.map((r) => {
      const tr = el('tr');
      tr.append(el('td', '', Store.category(r.categoryId).name));
      const amount = el('td');
      amount.append(moneyEl(r.total));
      tr.append(amount, el('td', 'num', percent(r.share)), el('td', 'num', String(r.count)));
      return tr;
    }));
  }

  /* ---------- الأيام ---------- */

  function svg(tag, attrs) {
    const node = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach((k) => node.setAttribute(k, attrs[k]));
    return node;
  }

  // عمود مدوّر من فوق (4px) ومربع عند خط الصفر
  function barPath(x, y, w, h, r) {
    r = Math.min(r, h, w / 2);
    return 'M' + x + ',' + (y + h) + ' V' + (y + r) + ' Q' + x + ',' + y + ' ' + (x + r) + ',' + y
      + ' H' + (x + w - r) + ' Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r)
      + ' V' + (y + h) + ' Z';
  }

  // الأيام بتمشي من اليمين للشمال (يوم 1 على اليمين) زي اتجاه الصفحة
  function dayColumns(box, days, opts) {
    const W = Math.max(box.clientWidth, 260);
    const H = 180;
    const pad = { top: 10, bottom: 22, start: 36, end: 4 }; // start = اليمين (أرقام المحور)
    const plotL = pad.end;
    const plotR = W - pad.start;
    const plotB = H - pad.bottom;
    const plotH = plotB - pad.top;
    const slot = (plotR - plotL) / days.length;
    const bw = Math.max(2, Math.min(16, slot - 2)); // 2px فراغ بين العمدان

    const maxP = Math.max(opts.avg || 0, ...days.map((d) => d.total));
    const scale = Stats.niceScale(maxP / 100, 3);
    const yOf = (pounds) => plotB - (pounds / scale.max) * plotH;

    const best = days.reduce((a, d) => (d.total > a.total ? d : a), days[0]);
    const root = svg('svg', {
      width: W,
      height: H,
      viewBox: '0 0 ' + W + ' ' + H,
      role: 'img',
      direction: 'ltr',
      'aria-label': best.total
        ? 'عمدان الصرف اليومي. أعلى يوم ' + Fmt.dayLabel(best.date) + ' بـ ' + Fmt.moneyNumber(best.total)
          + ' جنيه. الجدول اللي تحت فيه كل الأيام.'
        : 'مفيش صرف في الشهر ده.',
    });

    scale.ticks.forEach((t) => {
      const y = yOf(t);
      root.append(svg('line', { x1: plotL, x2: plotR, y1: y, y2: y, class: 'grid' }));
      const label = svg('text', { x: W - 2, y: y + 4, 'text-anchor': 'end', class: 'tick' });
      label.textContent = Fmt.compact(t);
      root.append(label);
    });

    const centerOf = (day) => plotR - (day - 0.5) * slot;

    days.forEach((d) => {
      if (!d.total) return;
      const top = yOf(d.total / 100);
      const h = Math.max(plotB - top, 2);
      root.append(svg('path', {
        d: barPath(centerOf(d.day) - bw / 2, plotB - h, bw, h, 4),
        class: d.day === opts.today ? 'col col-today' : 'col',
      }));
    });

    if (opts.avg > 0) {
      const y = yOf(opts.avg / 100);
      root.append(svg('line', { x1: plotL, x2: plotR, y1: y, y2: y, class: 'avg' }));
    }

    const n = days.length;
    [1, 5, 10, 15, 20, 25, n].filter((d, i, all) => d <= n && all.indexOf(d) === i && !(d === 25 && n - 25 < 3))
      .forEach((d) => {
        const label = svg('text', { x: centerOf(d), y: H - 6, 'text-anchor': 'middle', class: 'tick' });
        label.textContent = String(d);
        root.append(label);
      });

    // مساحة الضغط أكبر من العمود نفسه: العرض كله والطول كله
    days.forEach((d) => {
      const hit = svg('rect', {
        x: centerOf(d.day) - slot / 2, y: pad.top, width: slot, height: plotH, class: 'hit',
      });
      bindTip(hit, () => [
        Fmt.dayLabel(d.date),
        d.total ? Fmt.moneyNumber(d.total) + ' ج.م' : 'مفيش صرف',
        ...(d.count ? [Fmt.countLabel(d.count)] : []),
      ]);
      root.append(hit);
    });

    box.replaceChildren(root);
  }

  function dayTable(tbody, days) {
    tbody.replaceChildren(...days.filter((d) => d.total).map((d) => {
      const tr = el('tr');
      const amount = el('td');
      amount.append(moneyEl(d.total));
      tr.append(el('td', '', Fmt.dayLabel(d.date)), amount, el('td', 'num', String(d.count)));
      return tr;
    }));
  }

  return { categoryBars, categoryTable, dayColumns, dayTable, hideTip, percent };
})();
