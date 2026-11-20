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
            <a href="app.html#explorar">Explorar</a>
            <a href="index.html#nosotros">Nosotros</a>
          </div>
          <div class="site-actions">
            <a href="app.html#acceso">Soy agente</a>
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
    this.updateActive = () => {
      this.querySelectorAll('.site-brand, .site-links a, .site-actions a:first-child').forEach(link => {
        const target = new URL(link.href);
        if (target.pathname === location.pathname && target.hash === location.hash) {
          link.setAttribute('aria-current', 'page');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    };
    this.updateActive();
    window.addEventListener('hashchange', this.updateActive);
    this.syncScroll = () => this.classList.toggle('is-floating', window.scrollY > 48);
    this.syncScroll();
    window.addEventListener('scroll', this.syncScroll, { passive: true });
  }

  disconnectedCallback() {
    window.removeEventListener('hashchange', this.updateActive);
    window.removeEventListener('scroll', this.syncScroll);
  }
}
customElements.define('rentapart-navbar', RentApartNavbar);
