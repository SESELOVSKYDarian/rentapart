const rentapartBrand = (() => {
  try { return JSON.parse(sessionStorage.getItem('rentapartBrand')) || {}; }
  catch { return {}; }
})();

for (const [key, token] of [['ink', '--rentapart-ink'], ['paper', '--rentapart-paper']]) {
  if (/^#[0-9a-f]{6}$/i.test(rentapartBrand[key])) {
    document.documentElement.style.setProperty(token, rentapartBrand[key]);
  }
}

// Personalización guardada en el backend PHP (logo y colores). Si no hay backend, simplemente se ignora.
window.rentapartSite = window.rentapartSite || fetch('api/site.php', { headers: { Accept: 'application/json' }, cache: 'no-store' })
  .then(r => (r.ok && (r.headers.get('content-type') || '').includes('json')) ? r.json() : null)
  .catch(() => null);

window.rentapartApplyBrand = site => {
  if (!site) return;
  const root = document.documentElement;
  if (/^#[0-9a-f]{6}$/i.test(site.ink)) root.style.setProperty('--rentapart-ink', site.ink);
  if (/^#[0-9a-f]{6}$/i.test(site.paper)) root.style.setProperty('--rentapart-paper', site.paper);
  if (typeof site.logo === 'string' && /^uploads\/site\/[a-z0-9._-]+$/i.test(site.logo)) {
    document.querySelectorAll('.site-brand').forEach(brand => {
      const image = document.createElement('img');
      image.src = site.logo;
      image.alt = 'rentapart';
      brand.replaceChildren(image);
    });
  }
};

class RentApartNavbar extends HTMLElement {
  connectedCallback() {
    if (!this.querySelector('nav')) {
      this.innerHTML = `
        <nav class="site-nav" aria-label="Navegación principal">
          <a class="site-brand" href="index.html" aria-label="rentapart, inicio">rentapart</a>
          <div class="site-links" id="site-links">
            <a href="index.html">Inicio</a>
            <a href="app.html#explorar">Explorar</a>
            <a href="index.html#nosotros">Nosotros</a>
            <a class="menu-book" href="app.html#explorar">Reservar ahora</a>
          </div>
          <div class="site-actions">
            <a class="site-book" href="app.html#explorar">Reservar<span class="long"> ahora</span></a>
          </div>
          <button type="button" class="site-menu" aria-expanded="false" aria-controls="site-links" aria-label="Abrir menú"><span></span><span></span><span></span></button>
        </nav>`;
      if (/^data:image\/(jpeg|png|webp);base64,/i.test(rentapartBrand.logo)) {
        const image = document.createElement('img');
        image.src = rentapartBrand.logo;
        image.alt = 'rentapart';
        this.querySelector('.site-brand').replaceChildren(image);
      }
    }

    // En el home (hay un .hero) el navbar flota sobre la foto; en el resto de las páginas va en el flujo.
    const onHero = !!document.querySelector('.hero');
    this.classList.toggle('on-hero', onHero);

    this.updateState = () => {
      this.querySelectorAll('.site-brand, .site-links a').forEach(link => {
        const target = new URL(link.href);
        const sameHash = (target.hash || '') === (location.hash || '');
        const samePage = target.pathname === location.pathname || (target.pathname.endsWith('/index.html') && location.pathname.endsWith('/'));
        if (samePage && sameHash) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
      // La ficha de la propiedad tiene su propia cabecera: no se muestra el navbar ahí.
      this.hidden = location.pathname.endsWith('app.html') && location.hash === '#departamento';
    };
    this.updateState();
    window.addEventListener('hashchange', this.updateState);

    const nav = this.querySelector('.site-nav');
    const menu = this.querySelector('.site-menu');
    this.setMenu = open => {
      nav.classList.toggle('is-open', open);
      menu.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    };
    menu.addEventListener('click', () => this.setMenu(!nav.classList.contains('is-open')));
    nav.querySelectorAll('.site-links a, .site-book').forEach(a => a.addEventListener('click', () => this.setMenu(false)));
    this.onKey = event => { if (event.key === 'Escape') this.setMenu(false); };
    this.onOutside = event => { if (!this.contains(event.target)) this.setMenu(false); };
    document.addEventListener('keydown', this.onKey);
    document.addEventListener('pointerdown', this.onOutside);

    window.rentapartSite.then(site => window.rentapartApplyBrand(site));

    this.syncScroll = () => this.classList.toggle('is-floating', !onHero || window.scrollY > 60);
    this.syncScroll();
    window.addEventListener('scroll', this.syncScroll, { passive: true });
  }

  disconnectedCallback() {
    window.removeEventListener('hashchange', this.updateState);
    window.removeEventListener('scroll', this.syncScroll);
    document.removeEventListener('keydown', this.onKey);
    document.removeEventListener('pointerdown', this.onOutside);
  }
}
customElements.define('rentapart-navbar', RentApartNavbar);
