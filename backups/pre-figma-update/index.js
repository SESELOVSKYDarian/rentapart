(() => {
  const panels = [...document.querySelectorAll('.accordion-panel')];
  function activate(panel) {
    panels.forEach(item => {
      const active = item === panel;
      item.classList.toggle('is-active', active);
      item.querySelector('button').setAttribute('aria-expanded', String(active));
      item.querySelector('a').tabIndex = active ? 0 : -1;
    });
  }
  panels.forEach((panel,index) => {
    panel.addEventListener('pointerenter',event => { if(event.pointerType==='mouse' && matchMedia('(hover:hover)').matches) activate(panel); });
    panel.querySelector('button').addEventListener('click',()=>activate(panel));
    panel.addEventListener('focusin',()=>activate(panel));
    panel.querySelector('button').addEventListener('keydown',event=>{
      const delta = ['ArrowRight','ArrowDown'].includes(event.key) ? 1 : ['ArrowLeft','ArrowUp'].includes(event.key) ? -1 : 0;
      if(delta){event.preventDefault();panels[(index+delta+panels.length)%panels.length].querySelector('button').focus();}
    });
    panel.querySelector('a').addEventListener('click',event=>{try{sessionStorage.property=event.currentTarget.dataset.property;}catch{}});
  });
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const paragraph=document.querySelector('.about>p');
  const text=paragraph.innerText.replace(/\s+/g,' ').trim();
  paragraph.setAttribute('aria-label',text);
  paragraph.replaceChildren(...text.split(' ').flatMap((word,index)=>{
    const span=document.createElement('span');span.className='scroll-word';span.textContent=word;span.setAttribute('aria-hidden','true');
    return index ? [document.createTextNode(' '),span] : [span];
  }));
  const media = gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.timeline({ defaults: { ease: 'power3.out', clearProps: 'transform,opacity' } })
      .from('.hero rentapart-navbar', { y: -10, opacity: 0, duration: .65 })
      .from('.hero-copy h1', { y: 24, opacity: 0, duration: .95 }, .12)
      .from('.hero-copy p', { y: 16, opacity: 0, duration: .8 }, .32)
      .from('.featured', { y: 14, opacity: 0, duration: .8 }, .45);
    gsap.utils.toArray('.search, .editorial-intro, .tile, .recommend-heading, .accordion-gallery, .trust-copy, .trust-details>div').forEach(element => {
      gsap.from(element, {y:24,opacity:0,duration:.85,ease:'power3.out',clearProps:'transform,opacity',scrollTrigger:{trigger:element,start:'top 94%',once:true}});
    });
    gsap.fromTo('.scroll-word',{opacity:.16,filter:'blur(3px)',y:7},{opacity:1,filter:'blur(0px)',y:0,stagger:.065,ease:'none',scrollTrigger:{trigger:paragraph,start:'top 88%',end:'bottom 55%',scrub:1}});
  });
  window.addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
