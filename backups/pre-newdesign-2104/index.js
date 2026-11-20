(() => {
  const form=document.querySelector('.search');
  const today = new Date();
  const earliest = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const nextDay = value => new Date(Date.parse(value) + 86400000).toISOString().slice(0, 10);
  const arrivalInput = form.elements.arrival;
  const departureInput = form.elements.departure;
  arrivalInput.min = earliest;
  if (arrivalInput.value < earliest) arrivalInput.value = earliest;
  if (departureInput.value <= arrivalInput.value) departureInput.value = nextDay(arrivalInput.value);
  departureInput.min = nextDay(arrivalInput.value);
  form.addEventListener('submit',event=>{
    const arrival=form.elements.arrival,departure=form.elements.departure;
    departure.setCustomValidity(departure.value<=arrival.value?'La salida debe ser posterior a la entrada.':'');
    if(!form.reportValidity()){event.preventDefault();return;}
    form.querySelector('button[type="submit"]').setAttribute('aria-busy', 'true');
    try{sessionStorage.setItem('rentapartSearch',JSON.stringify(Object.fromEntries(new FormData(form))));}catch{}
  });
  form.addEventListener('input', () => {
    departureInput.setCustomValidity('');
    if (arrivalInput.value) departureInput.min = nextDay(arrivalInput.value);
  });
  window.addEventListener('pageshow', () => form.querySelector('button[type="submit"]').removeAttribute('aria-busy'));

  if (typeof rentapartBrand !== 'undefined') {
    const { title, description, hero, email, phone } = rentapartBrand;
    if (title) {
      const line = document.createElement('span');
      const text = document.createElement('span');
      text.textContent = title;
      line.append(text);
      document.querySelector('.hero-copy h1').replaceChildren(line);
    }
    if (description) document.querySelector('.hero-copy p').textContent = description;
    if (/^data:image\/(jpeg|png|webp);base64,/i.test(hero)) {
      document.querySelector('.hero-photo').style.setProperty('--hero-image', 'url("' + hero + '")');
    }
    if (email) {
      document.querySelector('footer span:nth-child(2)').textContent = email;
      document.querySelector('.guest-link').href = 'mailto:' + encodeURIComponent(email) + '?subject=Mi%20experiencia%20en%20rentapart';
    }
    if (/^\d{8,15}$/.test(phone)) document.querySelector('footer a').href = 'https://wa.me/' + phone;
  }
  const track = document.querySelector('.stay-track');
  const slides = [...track.querySelectorAll('.stay-slide')];
  const directionButtons = [...document.querySelectorAll('[data-slide-step]')];
  const slideOffset = slide => Math.min(slide.offsetLeft - slides[0].offsetLeft, track.scrollWidth - track.clientWidth);
  const progressLabel = document.querySelector('.slider-progress');
  let targetSlide = 0;

  function updateSlider() {
    const maxScroll = track.scrollWidth - track.clientWidth;
    directionButtons[0].disabled = track.scrollLeft <= 2;
    directionButtons[1].disabled = track.scrollLeft >= maxScroll - 2;
  }

  directionButtons.forEach(button => {
    button.addEventListener('click', () => {
      targetSlide = Math.max(0, Math.min(slides.length - 1, targetSlide + Number(button.dataset.slideStep)));
      track.scrollTo({
        left: slideOffset(slides[targetSlide]),
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
      });
    });
  });
  track.addEventListener('scroll', updateSlider, { passive: true });
  track.addEventListener('scrollend', () => {
    targetSlide = slides.reduce((closest, slide, index) =>
      Math.abs(slideOffset(slide) - track.scrollLeft) < Math.abs(slideOffset(slides[closest]) - track.scrollLeft)
        ? index : closest, 0);
    progressLabel.textContent = (targetSlide + 1) + ' de ' + slides.length;
  });
  new ResizeObserver(updateSlider).observe(track);
  updateSlider();

  document.querySelectorAll('[data-property]').forEach(slide => {
    slide.addEventListener('click', () => {
      try { sessionStorage.property = slide.dataset.property; } catch {}
    });
  });

  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const paragraph = document.querySelector('.about > p');
  const media = gsap.matchMedia();

  media.add('(prefers-reduced-motion: no-preference)', () => {
    const textNodes = [];
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    const words = [];

    for (const node of textNodes) {
      const fragment = document.createDocumentFragment();
      for (const part of node.textContent.split(/(\s+)/).filter(Boolean)) {
        if (/^\s+$/.test(part)) {
          fragment.append(part);
          continue;
        }
        const word = document.createElement('span');
        word.className = 'scroll-word';
        word.textContent = part;
        words.push(word);
        fragment.append(word);
      }
      node.replaceWith(fragment);
    }

    const entrance = { ease: 'power3.out', clearProps: 'transform,opacity' };
    const opening = document.querySelector('.opening-screen');
    const brand = document.querySelector('.site-brand');
    const skip = opening.querySelector('.opening-skip');
    let playOpening = false;
    try {
      playOpening = !location.hash && window.scrollY < 10 && brand && !sessionStorage.getItem('rentapartIntro');
    } catch {}

    const heroEntrance = gsap.timeline({ paused: true, defaults: entrance })
      .from('.hero-photo', { clipPath: 'inset(8% 6% 8% 6% round 24px)', '--hero-zoom': 1.055, clearProps: 'clipPath,--hero-zoom', duration: 1.10 }, 0)
      .from('.hero-copy h1 > span > span', { yPercent: 104, duration: .68, stagger: .07 }, .10)
      .from('.hero-copy p, .featured', { y: 14, opacity: 0, duration: .84, stagger: .10 }, .27)
      .from('.search', { opacity: 0, duration: .74 }, .40);

    let intro;
    function closeOpening() {
      if (opening.hidden) return;
      const restoreFocus = document.activeElement === skip;
      opening.hidden = true;
      document.querySelector('main').inert = false;
      document.documentElement.classList.remove('is-opening');
      if (restoreFocus) brand.focus({ preventScroll: true });
      ScrollTrigger.refresh();
    }

    function skipOpening() {
      intro?.kill();
      closeOpening();
      heroEntrance.progress(1);
    }

    if (playOpening) {
      try { sessionStorage.setItem('rentapartIntro', 'seen'); } catch {}
      opening.hidden = false;
      document.querySelector('main').inert = true;
      document.documentElement.classList.add('is-opening');
      skip.addEventListener('click', skipOpening);
      opening.addEventListener('keydown', event => {
        if (event.key === 'Escape') skipOpening();
      });
      skip.focus({ preventScroll: true });
      const word = opening.querySelector('.opening-word');
      if (brand.firstElementChild) word.replaceChildren(brand.firstElementChild.cloneNode());
      const handoff = matchMedia('(max-width: 600px)').matches ? 1.05 : 1.45;
      const delta = axis => brand.getBoundingClientRect()[axis] - word.getBoundingClientRect()[axis];

      intro = gsap.timeline({ onComplete: closeOpening })
        .from(word, { clipPath: 'inset(100% 0 0)', opacity: 0, duration: .62, ease: 'power3.out' }, .22)
        .to(skip, { opacity: 0, duration: .26 }, handoff)
        .to(opening, { backgroundColor: 'transparent', duration: .7 }, handoff + .12)
        .to(word, {
          x: () => delta('left'),
          y: () => delta('top'),
          scale: () => brand.getBoundingClientRect().width / word.getBoundingClientRect().width,
          duration: 1.05, ease: 'power3.inOut'
        }, handoff)
        .call(() => heroEntrance.play(), [], handoff + .36);
    } else {
      heroEntrance.play();
    }

    gsap.to('.hero-photo', {
      '--hero-parallax': '36px',
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .45 }
    });

    gsap.from('.editorial-intro, .stay-slider', {
      y: 18, opacity: 0, duration: .85, stagger: .08, ...entrance,
      scrollTrigger: { trigger: '.editorial', start: 'top 88%', once: true }
    });

    gsap.from('.guest-experiences > *', { opacity: 0, y: 14, duration: .7, stagger: .1, ...entrance, scrollTrigger: { trigger: '.guest-experiences', start: 'top 88%', once: true } });

    gsap.timeline({ scrollTrigger: { trigger: paragraph, start: 'top 90%', once: true } })
      .from('.about > small', { opacity: 0, y: 8, duration: .46, ...entrance })
      .from(words, {
        opacity: .1, filter: 'blur(2.5px)', y: 8, duration: .55, stagger: .048,
        ease: 'power3.out', clearProps: 'transform,opacity,filter'
      }, .10);

    return () => {
      skip.removeEventListener('click', skipOpening);
      intro?.kill();
      closeOpening();
      for (const word of words) word.replaceWith(word.textContent);
      paragraph.normalize();
    };
  });

  window.addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();



