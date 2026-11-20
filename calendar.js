/* Calendario de rango del buscador. Los inputs ocultos arrival/departure guardan las fechas. */
(() => {
  const form = document.querySelector('.search');
  if (!form) return;
  const trigger = form.querySelector('.s-dates');
  const arrival = form.elements.arrival;
  const departure = form.elements.departure;
  const label = form.querySelector('.dates-text');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DAY = 86400000;
  const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const monthFmt = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' });
  const shortFmt = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
  const tinyFmt = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' });
  const today = iso(new Date());

  label.classList.add('is-empty');

  const pop = document.createElement('div');
  pop.className = 'range-pop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Elegir fechas');
  pop.hidden = true;

  const head = document.createElement('div'); head.className = 'range-head';
  const prevBtn = document.createElement('button'); prevBtn.type = 'button'; prevBtn.className = 'range-nav'; prevBtn.dataset.nav = '-1'; prevBtn.setAttribute('aria-label', 'Mes anterior'); prevBtn.textContent = '‹';
  const nextBtn = document.createElement('button'); nextBtn.type = 'button'; nextBtn.className = 'range-nav'; nextBtn.dataset.nav = '1'; nextBtn.setAttribute('aria-label', 'Mes siguiente'); nextBtn.textContent = '›';
  const monthsEl = document.createElement('div'); monthsEl.className = 'range-months';
  head.append(prevBtn, monthsEl, nextBtn);
  const foot = document.createElement('div'); foot.className = 'range-foot';
  const summary = document.createElement('span'); summary.className = 'range-summary'; summary.setAttribute('aria-live', 'polite');
  const done = document.createElement('button'); done.type = 'button'; done.className = 'range-done'; done.textContent = 'Listo';
  foot.append(summary, done);
  pop.append(head, foot);
  form.append(pop);

  let start = null, end = null, hover = null, open = false;
  let view = parse(today); view.setDate(1);
  const two = () => matchMedia('(min-width: 860px)').matches;

  function monthEl(base) {
    const wrap = document.createElement('div'); wrap.className = 'range-month';
    const title = monthFmt.format(base);
    const h = document.createElement('h3'); h.textContent = title.charAt(0).toUpperCase() + title.slice(1);
    const grid = document.createElement('div'); grid.className = 'range-grid';
    ['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach(x => { const s = document.createElement('small'); s.textContent = x; grid.append(s); });
    const lead = (new Date(base.getFullYear(), base.getMonth(), 1).getDay() + 6) % 7;
    for (let i = 0; i < lead; i++) grid.append(document.createElement('span'));
    const days = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= days; d++) {
      const value = iso(new Date(base.getFullYear(), base.getMonth(), d));
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.day = value; b.textContent = d;
      b.setAttribute('aria-label', shortFmt.format(parse(value)));
      b.className = 'range-day';
      const range = end || hover;
      if (value === start) b.classList.add('is-start');
      if (value === end) b.classList.add('is-end');
      if (start && range && range > start && value > start && value < range) b.classList.add('in-range');
      if (value === today) b.classList.add('is-today');
      if (value < today) b.disabled = true;
      b.setAttribute('aria-pressed', String(value === start || value === end));
      grid.append(b);
    }
    wrap.append(h, grid);
    return wrap;
  }

  function render(direction = 0) {
    monthsEl.replaceChildren(monthEl(view), ...(two() ? [monthEl(new Date(view.getFullYear(), view.getMonth() + 1, 1))] : []));
    const first = new Date(); first.setDate(1);
    prevBtn.disabled = iso(view) <= iso(first);
    const nights = start && end ? Math.round((parse(end) - parse(start)) / DAY) : 0;
    summary.textContent = start && end
      ? shortFmt.format(parse(start)) + ' a ' + shortFmt.format(parse(end)) + ' (' + nights + (nights === 1 ? ' noche)' : ' noches)')
      : start ? 'Elegí la fecha de salida' : 'Elegí la fecha de entrada';
    if (direction && window.gsap && !reduced) {
      gsap.fromTo(monthsEl, { x: 18 * direction, opacity: 0 }, { x: 0, opacity: 1, duration: .32, ease: 'power3.out', clearProps: 'transform,opacity' });
    }
  }

  function commit() {
    arrival.value = start || '';
    departure.value = end || '';
    if (start && end) {
      label.textContent = tinyFmt.format(parse(start)) + ' – ' + tinyFmt.format(parse(end));
      label.classList.remove('is-empty');
    }
  }

  function openPop() {
    if (open) return;
    open = true;
    start = arrival.value || null; end = departure.value || null;
    view = parse(start || today); view.setDate(1);
    render();
    pop.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    if (window.gsap && !reduced) gsap.fromTo(pop, { y: 10, opacity: 0, scale: .985 }, { y: 0, opacity: 1, scale: 1, duration: .32, ease: 'power3.out', clearProps: 'transform,opacity' });
  }

  function closePop(restoreFocus = true) {
    if (!open) return;
    open = false; hover = null;
    trigger.setAttribute('aria-expanded', 'false');
    const finish = () => { pop.hidden = true; };
    if (window.gsap && !reduced) gsap.to(pop, { y: 8, opacity: 0, duration: .2, ease: 'power2.in', onComplete: () => { finish(); gsap.set(pop, { clearProps: 'transform,opacity' }); } });
    else finish();
    if (restoreFocus) trigger.focus({ preventScroll: true });
  }

  trigger.addEventListener('click', event => { event.preventDefault(); open ? closePop(false) : openPop(); });
  trigger.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openPop(); }
  });

  pop.addEventListener('click', event => {
    const nav = event.target.closest('[data-nav]');
    if (nav && !nav.disabled) { view = new Date(view.getFullYear(), view.getMonth() + Number(nav.dataset.nav), 1); render(Number(nav.dataset.nav)); return; }
    if (event.target.closest('.range-done')) {
      if (start && !end) end = iso(new Date(parse(start).getTime() + DAY));
      commit(); closePop(); return;
    }
    const day = event.target.closest('[data-day]');
    if (!day || day.disabled) return;
    const value = day.dataset.day;
    if (!start || (start && end) || value <= start) { start = value; end = null; }
    else { end = value; commit(); }
    hover = null;
    render();
    const chosen = pop.querySelector('[data-day="' + value + '"]');
    if (chosen && window.gsap && !reduced) gsap.fromTo(chosen, { scale: .8 }, { scale: 1, duration: .32, ease: 'back.out(2.4)', clearProps: 'transform' });
    chosen?.focus({ preventScroll: true });
    if (start && end) setTimeout(() => closePop(false), reduced ? 0 : 380);
  });

  pop.addEventListener('mouseover', event => {
    const day = event.target.closest('[data-day]');
    if (!day || !start || end || day.disabled) return;
    hover = day.dataset.day;
    pop.querySelectorAll('.range-day').forEach(b => b.classList.toggle('in-range', b.dataset.day > start && b.dataset.day < hover));
  });

  pop.addEventListener('keydown', event => { if (event.key === 'Escape') { event.stopPropagation(); closePop(); } });
  document.addEventListener('pointerdown', event => {
    if (open && !pop.contains(event.target) && !trigger.contains(event.target)) closePop(false);
  });
  matchMedia('(min-width: 860px)').addEventListener('change', () => open && render());
})();
