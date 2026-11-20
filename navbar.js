const rentapartBrand = (() => {
  try { return JSON.parse(sessionStorage.getItem('rentapartBrand')) || {}; }
  catch { return {}; }
})();

for (const [key, token] of [['ink', '--rentapart-ink'], ['paper', '--rentapart-paper']]) {
  if (/^#[0-9a-f]{6}$/i.test(rentapartBrand[key])) {
    document.documentElement.style.setProperty(token, rentapartBrand[key]);
  }
}

class RentApartNavbar extends HTMLElement {
  connectedCallback() {
    if (!this.querySelector('nav')) {
      this.innerHTML = `
        <nav class="site-nav" aria-label="Navegación principal">
          <a class="site-brand" href="index.html" aria-label="rentapart, inicio">rentapart</a>
          <div class="site-links">
            <a href="index.html">Inicio</a>
            <a href="app.html#explorar">Explorar</a>
            <a href="index.html#nosotros">Nosotros</a>
          </div>
          <div class="site-actions">
            <a class="site-book" href="app.html#explorar">Reservar ahora</a>
          </div>
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

    this.syncScroll = () => this.classList.toggle('is-floating', !onHero || window.scrollY > 60);
    this.syncScroll();
    window.addEventListener('scroll', this.syncScroll, { passive: true });
  }

  disconnectedCallback() {
    window.removeEventListener('hashchange', this.updateState);
    window.removeEventListener('scroll', this.syncScroll);
  }
}
customElements.define('rentapart-navbar', RentApartNavbar);
