(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ───────── Propiedad elegida (la usa app.html) ───────── */
  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-property]');
    if (link) { try { sessionStorage.property = link.dataset.property; } catch {} }
  });

  /* ───────── Personalización guardada desde el panel de administración (demo) ───────── */
  if (typeof rentapartBrand !== 'undefined') {
    const { title, hero, email, phone } = rentapartBrand;
    if (title) $('.hero h1').textContent = title;
    if (/^data:image\/(jpeg|png|webp);base64,/i.test(hero)) {
      const first = $('.hero-bg .slide i');
      if (first) first.style.backgroundImage = 'url("' + hero + '")';
    }
    if (email) {
      const mail = $('.foot-mail');
      mail.textContent = email;
      mail.href = 'mailto:' + encodeURIComponent(email);
    }
    if (/^\d{8,15}$/.test(phone)) $('.foot-wa').href = 'https://wa.me/' + phone;
  }

  /* ───────── Buscador ───────── */
  const form = $('.search');
  const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const addDays = (value, n) => { const d = new Date(value + 'T00:00:00'); d.setDate(d.getDate() + n); return iso(d); };
  form.addEventListener('submit', () => {
    const arrival = form.elements.arrival, departure = form.elements.departure;
    const today = iso(new Date());
    if (!arrival.value || arrival.value < today) arrival.value = addDays(today, 7);
    if (!departure.value || departure.value <= arrival.value) departure.value = addDays(arrival.value, 4);
    form.querySelector('.search-cta').setAttribute('aria-busy', 'true');
    try { sessionStorage.setItem('rentapartSearch', JSON.stringify(Object.fromEntries(new FormData(form)))); } catch {}
  });
  window.addEventListener('pageshow', () => form.querySelector('.search-cta').removeAttribute('aria-busy'));

  /* ───────── "Encontrá tu lugar": tarjeta activa ───────── */
  const cards = $$('.lcard');
  const activate = card => {
    cards.forEach(c => c.classList.toggle('is-active', c === card));
  };
  cards.forEach(card => {
    card.addEventListener('click', event => { if (!event.target.closest('.open')) activate(card); });
    card.addEventListener('keydown', event => {
      if ((event.key === 'Enter' || event.key === ' ') && event.target === card) { event.preventDefault(); activate(card); }
    });
  });

  // Rotate the featured stay only while the section is visible and idle.
  const lugar = $('.lugar');
  let lugarVisible = false;
  let lugarPaused = false;
  if (!reduced && cards.length > 1) {
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => { lugarVisible = entries[0].isIntersecting; }, { threshold: .25 }).observe(lugar);
    } else lugarVisible = true;
    lugar.addEventListener('pointerenter', () => { lugarPaused = true; });
    lugar.addEventListener('pointerleave', () => { lugarPaused = false; });
    lugar.addEventListener('focusin', () => { lugarPaused = true; });
    lugar.addEventListener('focusout', event => { if (!lugar.contains(event.relatedTarget)) lugarPaused = false; });
    setInterval(() => {
      if (!lugarVisible || lugarPaused || document.hidden) return;
      const current = cards.findIndex(card => card.classList.contains('is-active'));
      activate(cards[(current + 1) % cards.length]);
    }, 5000);
  }
  /* ───────── Reseñas ───────── */
  // Reseñas de ejemplo: reemplazar por las reales del huésped.
  const REVIEWS = [
    { name: 'Nombre del huésped', time: 'Hace una semana', text: 'Texto de ejemplo: reemplazá por la reseña real del huésped, dos o tres líneas sobre su estadía.' },
    { name: 'Nombre del huésped', time: 'Hace 10 días', text: 'Texto de ejemplo: reemplazá por la reseña real del huésped, dos o tres líneas sobre su estadía.' },
    { name: 'Nombre del huésped', time: 'Hace 2 semanas', text: 'Texto de ejemplo: reemplazá por la reseña real del huésped, dos o tres líneas sobre su estadía.' },
    { name: 'Nombre del huésped', time: 'Hace 3 semanas', text: 'Texto de ejemplo: reemplazá por la reseña real del huésped, dos o tres líneas sobre su estadía.' },
    { name: 'Nombre del huésped', time: 'Hace un mes', text: 'Texto de ejemplo: reemplazá por la reseña real del huésped, dos o tres líneas sobre su estadía.' }
  ];
  const list = $('#reviews-list');
  const reviewsSection = $('#resenas');
  if (!REVIEWS.length) {
    reviewsSection.hidden = true;
  } else {
    list.replaceChildren(...REVIEWS.map(r => {
      const li = document.createElement('li');
      li.className = 'review';
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      const p = document.createElement('p'); p.textContent = r.text;
      const stars = document.createElement('div'); stars.className = 'stars'; stars.setAttribute('aria-label', '5 estrellas'); stars.textContent = '★★★★★';
      bubble.append(p, stars);
      const tail = document.createElement('span'); tail.className = 'tail'; tail.setAttribute('aria-hidden', 'true');
      const who = document.createElement('div'); who.className = 'who';
      const av = document.createElement('span'); av.className = 'av'; av.textContent = r.name.charAt(0).toUpperCase();
      const meta = document.createElement('span');
      const name = document.createElement('strong'); name.textContent = r.name;
      const time = document.createElement('small'); time.textContent = r.time;
      meta.append(name, time);
      who.append(av, meta);
      li.append(bubble, tail, who);
      return li;
    }));
    let index = 0;
    const last = REVIEWS.length - 1;
    const prev = $('[data-r="-1"]'), next = $('[data-r="1"]'), thumb = $('.rtrack i');
    const step = () => {
      const first = list.children[0];
      return first ? first.getBoundingClientRect().width + 24 : 364;
    };
    const paint = () => {
      list.style.transform = 'translateX(' + (-index * step()) + 'px)';
      thumb.style.transform = 'translateX(' + (last ? index * (72 / last) : 0) + 'px)';
      prev.disabled = index === 0;
      next.disabled = index === last;
    };
    prev.addEventListener('click', () => { index = Math.max(0, index - 1); paint(); });
    next.addEventListener('click', () => { index = Math.min(last, index + 1); paint(); });
    window.addEventListener('resize', paint);
    paint();
  }

  /* ───────── Animaciones (GSAP) ───────── */
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();

  media.add('(prefers-reduced-motion: no-preference)', () => {
    const entrance = { ease: 'power3.out', clearProps: 'transform,opacity' };
    const brand = $('.site-brand');
    const opening = $('.opening-screen');
    const skip = $('.opening-skip', opening);
    const word = $('.opening-word', opening);

    // Entrada del hero
    const heroEntrance = gsap.timeline({ paused: true, defaults: entrance })
      .from('.hero h1 .line > span', { yPercent: 108, duration: .9, stagger: .12 }, 0)
      .from('.hero-place, .search', { y: 24, opacity: 0, duration: .9, stagger: .12 }, .25)
      .from('.site-links a, .site-book', { y: -10, opacity: 0, duration: .6, stagger: .06 }, .1);

    // Intro: solo la primera vez de la sesión
    let playOpening = false;
    try { playOpening = !location.hash && window.scrollY < 10 && !!brand && !sessionStorage.getItem('rentapartIntro'); } catch {}
    let intro;
    function closeOpening() {
      if (opening.hidden) return;
      opening.hidden = true;
      document.documentElement.classList.remove('is-opening');
      document.body.classList.remove('is-opening');
      ScrollTrigger.refresh();
    }
    function skipOpening() { intro?.kill(); closeOpening(); heroEntrance.progress(1); }

    if (playOpening) {
      try { sessionStorage.setItem('rentapartIntro', 'seen'); } catch {}
      opening.hidden = false;
      document.documentElement.classList.add('is-opening');
      document.body.classList.add('is-opening');
      skip.addEventListener('click', skipOpening);
      opening.addEventListener('keydown', e => { if (e.key === 'Escape') skipOpening(); });
      skip.focus({ preventScroll: true });
      const handoff = matchMedia('(max-width: 600px)').matches ? 1.0 : 1.35;
      const delta = axis => brand.getBoundingClientRect()[axis] - word.getBoundingClientRect()[axis];
      intro = gsap.timeline({ onComplete: closeOpening })
        .from(word, { clipPath: 'inset(100% 0 0)', opacity: 0, y: 14, duration: .75, ease: 'power3.out' }, .1)
        .to(skip, { opacity: 0, duration: .25 }, handoff)
        .to(opening, { backgroundColor: 'rgba(0,0,0,0)', duration: .7 }, handoff + .1)
        .to(word, {
          x: () => delta('left'), y: () => delta('top'),
          scale: () => brand.getBoundingClientRect().width / word.getBoundingClientRect().width,
          duration: 1.05, ease: 'power3.inOut'
        }, handoff)
        .call(() => heroEntrance.play(), [], handoff + .4);
    } else {
      heroEntrance.play();
    }

    // Parallax de la foto y del titular
    gsap.to('.hero-bg', { yPercent: 3.5, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero-copy', { y: -60, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    // Títulos y bloques que suben al entrar
    $$('.reveal').forEach(el => {
      gsap.from(el, { y: 44, opacity: 0, duration: .9, ...entrance, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
    gsap.from('.reviews-side, .review', { y: 36, opacity: 0, duration: .8, stagger: .12, ...entrance, scrollTrigger: { trigger: '.reviews-body', start: 'top 85%', once: true } });
    gsap.from('.foot-top > *', { y: 30, opacity: 0, duration: .8, stagger: .12, ...entrance, scrollTrigger: { trigger: '.site-footer', start: 'top 85%', once: true } });

    // Frase que se va revelando con el scroll
    const para = $('.words');
    const original = para.textContent;
    para.textContent = '';
    const words = original.split(' ').map((text, i, all) => {
      const span = document.createElement('span');
      span.className = 'w';
      span.textContent = text + (i < all.length - 1 ? ' ' : '');
      para.append(span);
      return span;
    });
    document.documentElement.classList.add('js-words');
    gsap.to(words, {
      color: '#f5f5f4',
      ease: 'none', stagger: .12,
      scrollTrigger: { trigger: '.statement', start: 'top 72%', end: 'bottom 55%', scrub: .5 }
    });

    return () => {
      skip.removeEventListener('click', skipOpening);
      intro?.kill();
      closeOpening();
      document.documentElement.classList.remove('js-words');
      para.textContent = original;
    };
  });

  window.addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
