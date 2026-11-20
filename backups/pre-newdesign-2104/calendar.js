/* Calendario de rango para el buscador. Los inputs date siguen siendo la fuente de verdad. */
(() => {
  const form = document.querySelector('.search');
  if (!form) return;
  const arrival = form.elements.arrival;
  const departure = form.elements.departure;
  const fields = [arrival, departure].map(input => input.closest('.search-field'));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DAY = 86400000;
  const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const monthFmt = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' });
  const shortFmt = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
  const today = iso(new Date());

  // Los inputs nativos pasan a ser solo almacenamiento; el campo completo abre el calendario.
  form.classList.add('has-range');
  fields.forEach((field, i) => {
    field.tabIndex = 0;
    field.setAttribute('role', 'button');
    field.setAttribute('aria-haspopup', 'dialog');
    field.setAttribute('aria-expanded', 'false');
    [arrival, departure][i].tabIndex = -1;
  });

  const pop = document.createElement('div');
  pop.className = 'range-pop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Elegir fechas');
  pop.hidden = true;
  pop.innerHTML = `
    <div class="range-head">
      <button type="button" class="range-nav" data-nav="-1" aria-label="Mes anterior">‹</button>
      <div class="range-months"></div>
      <button type="button" class="range-nav" data-nav="1" aria-label="Mes siguiente">›</button>
    </div>
    <div class="range-foot"><span class="range-summary" aria-live="polite"></span><button type="button" class="range-done">Listo</button></div>`;
  form.append(pop);

  let view = parse(arrival.value || today); view.setDate(1);
  let start = arrival.value || null, end = departure.value || null, hover = null, open = false, picking = 'start';

  const monthsEl = pop.querySelector('.range-months');
  const summary = pop.querySelector('.range-summary');
  const two = () => matchMedia('(min-width: 860px)').matches;

  function monthHTML(base) {
    const first = new Date(base.getFullYear(), base.getMonth(), 1);
    const lead = (first.getDay() + 6) % 7;
    const days = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    let cells = '';
    for (let i = 0; i < lead; i++) cells += '<span></span>';
    for (let d = 1; d <= days; d++) {
      const value = iso(new Date(base.getFullYear(), base.getMonth(), d));
      const past = value < today;
      const range = end || hover;
      const inRange = start && range && value > start && value < range && range > start;
      const cls = ['range-day', value === start && 'is-start', value === end && 'is-end', inRange && 'in-range', value === today && 'is-today'].filter(Boolean).join(' ');
      cells += `<button type="button" class="${cls}" data-day="${value}" ${past ? 'disabled' : ''} aria-label="${shortFmt.format(parse(value))}" aria-pressed="${value === start || value === end}">${d}</button>`;
    }
    const title = monthFmt.format(first);
    return `<div class="range-month"><h3>${title.charAt(0).toUpperCase() + title.slice(1)}</h3><div class="range-grid">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(x => `<small>${x}</small>`).join('')}${cells}</div></div>`;
  }

  function render(direction = 0) {
    const next = new Date(view.getFullYear(), view.getMonth() + 1, 1);
    monthsEl.innerHTML = monthHTML(view) + (two() ? monthHTML(next) : '');
    const prev = pop.querySelector('[data-nav="-1"]');
    prev.disabled = iso(view) <= iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const nights = start && end ? Math.round((parse(end) - parse(start)) / DAY) : 0;
    summary.textContent = start && end
      ? `${shortFmt.format(parse(start))} → ${shortFmt.format(parse(end))} · ${nights} ${nights === 1 ? 'noche' : 'noches'}`
      : start ? 'Elegí la fecha de salida' : 'Elegí la fecha de entrada';
    if (direction && window.gsap && !reduced) {
      gsap.fromTo(monthsEl, { x: 18 * direction, opacity: 0 }, { x: 0, opacity: 1, duration: .32, ease: 'power3.out', clearProps: 'transform,opacity' });
    }
  }

  function commit() {
    if (start) { arrival.value = start; arrival.dispatchEvent(new Event('input', { bubbles: true })); }
    if (end) { departure.value = end; departure.dispatchEvent(new Event('input', { bubbles: true })); }
    departure.setCustomValidity('');
  }

  function openPop(which) {
    picking = which;
    if (open) return;
    open = true;
    start = arrival.value || null; end = departure.value || null;
    view = parse(start || today); view.setDate(1);
    render();
    pop.hidden = false;
    fields.forEach(f => f.setAttribute('aria-expanded', 'true'));
    if (window.gsap && !reduced) gsap.fromTo(pop, { y: 10, opacity: 0, scale: .985 }, { y: 0, opacity: 1, scale: 1, duration: .32, ease: 'power3.out', clearProps: 'transform,opacity' });
  }

  function closePop(restore = true) {
    if (!open) return;
    const finish = () => { pop.hidden = true; };
    open = false; hover = null;
    fields.forEach(f => f.setAttribute('aria-expanded', 'false'));
    if (window.gsap && !reduced) gsap.to(pop, { y: 8, opacity: 0, duration: .2, ease: 'power2.in', onComplete: () => { finish(); gsap.set(pop, { clearProps: 'transform,opacity' }); } });
    else finish();
    if (restore) fields[0].focus({ preventScroll: true });
  }

  fields.forEach((field, i) => {
    field.addEventListener('click', event => { event.preventDefault(); openPop(i ? 'end' : 'start'); });
    field.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openPop(i ? 'end' : 'start'); }
    });
  });

  pop.addEventListener('click', event => {
    const nav = event.target.closest('[data-nav]');
    if (nav && !nav.disabled) { view = new Date(view.getFullYear(), view.getMonth() + Number(nav.dataset.nav), 1); render(Number(nav.dataset.nav)); return; }
    if (event.target.closest('.range-done')) { if (start && !end) end = iso(new Date(parse(start).getTime() + DAY)); commit(); closePop(); return; }
    const day = event.target.closest('[data-day]');
    if (!day || day.disabled) return;
    const value = day.dataset.day;
    if (!start || (start && end) || value <= start) { start = value; end = null; picking = 'end'; }
    else { end = value; commit(); }
    hover = null;
    render();
    const chosen = pop.querySelector(`[data-day="${value}"]`);
    if (chosen && window.gsap && !reduced) gsap.fromTo(chosen, { scale: .8 }, { scale: 1, duration: .32, ease: 'back.out(2.4)', clearProps: 'transform' });
    chosen?.focus({ preventScroll: true });
    if (start && end) setTimeout(() => closePop(false), reduced ? 0 : 380);
  });

  pop.addEventListener('mouseover', event => {
    const day = event.target.closest('[data-day]');
    if (!day || !start || end || day.disabled) return;
    hover = day.dataset.day;
    pop.querySelectorAll('.range-day').forEach(b => {
      const v = b.dataset.day;
      b.classList.toggle('in-range', v > start && v < hover);
    });
  });

  pop.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.stopPropagation(); closePop(); }
  });
  document.addEventListener('pointerdown', event => {
    if (open && !pop.contains(event.target) && !fields.some(f => f.contains(event.target))) closePop(false);
  });
  matchMedia('(min-width: 860px)').addEventListener('change', () => open && render());

})();
