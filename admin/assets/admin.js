/* Paneles rentapart: menú móvil, confirmaciones y vista previa de fotos. Sin dependencias. */
(() => {
  const burger = document.getElementById('burger');
  const side = document.getElementById('side');
  const scrim = document.getElementById('scrim');
  const setMenu = open => {
    if (!burger || !side) return;
    side.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    if (scrim) scrim.hidden = !open;
  };
  burger?.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  scrim?.addEventListener('click', () => setMenu(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  side?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));

  // Confirmación antes de acciones destructivas: <form data-confirm="Mensaje">
  document.addEventListener('submit', e => {
    const message = e.target.closest('[data-confirm]')?.getAttribute('data-confirm');
    if (message && !window.confirm(message)) e.preventDefault();
  });

  // Vista previa de imágenes elegidas: <input type="file" data-preview="#id">
  document.querySelectorAll('input[type="file"][data-preview]').forEach(input => {
    const box = document.querySelector(input.getAttribute('data-preview'));
    if (!box) return;
    input.addEventListener('change', () => {
      box.replaceChildren();
      [...input.files].slice(0, 12).forEach(file => {
        if (!/^image\//.test(file.type)) return;
        const img = document.createElement('img');
        img.alt = '';
        img.style.cssText = 'width:84px;height:84px;object-fit:cover;border-radius:10px';
        img.src = URL.createObjectURL(file);
        img.onload = () => URL.revokeObjectURL(img.src);
        box.append(img);
      });
    });
  });
})();
