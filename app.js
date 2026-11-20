const properties=readDemo('rentapartProperties', [{name:'Palermo botánico',district:'PALERMO',city:'Buenos Aires',type:'Departamento',tag:'Favorito',price:85,img:'fdfa7.webp'},{name:'Recoleta luz',district:'RECOLETA',city:'Buenos Aires',type:'Departamento',tag:'Nuevo',price:110,img:'29605.webp'},{name:'Núñez calma',district:'NÚÑEZ',city:'Buenos Aires',type:'Departamento',tag:'Disponible',price:72,img:'12205.webp'}]);
const app=document.querySelector('#app'),modal=document.querySelector('#modal'); let chosen=Number(sessionStorage.property||0), admin=false; if (!properties[chosen]) chosen = 0;
const link=(label,path,cls='')=>`<a class="${cls}" href="#${path}">${label}</a>`;
const button=(label,action,cls='')=>`<button class="btn ${cls}" data-action="${action}">${label}</button>`;
const field=(label,value='',type='text')=>`<label class="field">${label}<input type="${type}" value="${value}"></label>`;
const header=()=>`<rentapart-navbar></rentapart-navbar>`;
const footer=()=>`<footer class="container row"><small>© 2026 rentapart</small><small>hola@rentapart.com</small><small>WhatsApp ↗</small></footer>`;
const propertyCard=(p,i)=>`<article class="card property"><a href="#departamento" data-property="${i}"><img src="${escapeDemo(demoPropertyImage(p))}" alt="${escapeDemo(p.name)}"><div class="content"><small>${p.district} · BUENOS AIRES</small><h3>${escapeDemo(p.name)}</h3><div class="price"><span>USD ${p.price} / noche</span></div></div></a></article>`;
function calendar(){return `<div class="panel calendar"><div class="row"><h3>Diciembre 2026</h3><span>‹　　　　　　　　　›</span></div><div class="calendar-grid">${['L','M','M','J','V','S','D'].map(d=>`<small>${d}</small>`).join('')}<span></span>${Array.from({length:31},(_,i)=>`<button class="${i+1>=18&&i+1<=22?'selected':''}" data-action="dia">${i+1}</button>`).join('')}</div></div>`}
function escapeDemo(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

const dateFormat = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeZone: 'UTC' });
const stayDay = 86400000;
const sampleAvailability = { 0: [{ arrival: '2026-12-26', departure: '2026-12-29' }] };

function readDemo(key, fallback) {
  try { return JSON.parse(sessionStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function earliestArrival() {
  const today = new Date();
  return new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function datePlus(date, days) {
  return new Date(Date.parse(date) + days * stayDay).toISOString().slice(0, 10);
}

function validDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && datePlus(date, 0) === date;
}

function getTrip() {
  const query = new URLSearchParams(location.search);
  const input = query.has('arrival') ? Object.fromEntries(query) : readDemo('rentapartSearch', {});
  const first = earliestArrival();
  const arrival = validDate(input.arrival) && input.arrival >= first ? input.arrival : first;
  const departure = validDate(input.departure) && input.departure > arrival ? input.departure : datePlus(arrival, 4);
  const district = properties.some(property => property.district === input.district?.toUpperCase()) ? input.district.toUpperCase() : '';
  const type = ['Monoambiente', 'Departamento', 'Dúplex', 'Casa'].includes(input.type) ? input.type : '';
  const destination = String(input.destination || '').slice(0, 60);
  return { arrival, departure, guests: Number(input.guests) === 1 ? 1 : 2, district, type, destination };
}

function tripNights(trip) { return (Date.parse(trip.departure) - Date.parse(trip.arrival)) / stayDay; }
function nightsLabel(nights) { return nights === 1 ? '1 noche' : nights + ' noches'; }
function dateLabel(date) { return dateFormat.format(new Date(date)); }

function available(property, trip) {
  const reservations = readDemo('rentapartReservations', [])
    .filter(item => item.property === property && item.status !== 'cancelada');
  const blocked = readDemo('rentapartBlocks', []).filter(item => item.property === property);
  return [...(sampleAvailability[property] || []), ...reservations, ...blocked].every(item =>
    trip.departure <= item.arrival || trip.arrival >= item.departure);
}

function tripFields(trip, includeDistrict = false) {
  return `<label class="trip-field">Entrada<input type="date" name="arrival" value="${trip.arrival}" min="${earliestArrival()}" required></label>
  <label class="trip-field">Salida<input type="date" name="departure" value="${trip.departure}" min="${datePlus(trip.arrival, 1)}" required></label>
  <label class="trip-field">Huéspedes<select name="guests"><option value="1" ${trip.guests === 1 ? 'selected' : ''}>1 adulto</option><option value="2" ${trip.guests === 2 ? 'selected' : ''}>2 adultos</option></select></label>
  ${includeDistrict ? `<label class="trip-field">Barrio<select name="district"><option value="">Todos los barrios</option>${['Palermo', 'Recoleta', 'Núñez'].map(name => `<option value="${name.toUpperCase()}" ${trip.district === name.toUpperCase() ? 'selected' : ''}>${name}</option>`).join('')}</select></label>` : ''}`;
}

function estimate(property, trip) {
  const nights = tripNights(trip);
  return `<div class="row"><span>${nightsLabel(nights)} × USD ${property.price}</span><span>USD ${nights * property.price}</span></div>
  <div class="row"><span>Limpieza</span><span>USD 20</span></div>
  <div class="row trip-total"><strong>Total</strong><strong>USD ${nights * property.price + 20}</strong></div>`;
}

const rxState = { cheap: false, sort: false };
const rxNorm = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const rxTypes = ['Monoambiente', 'Departamento', 'Dúplex', 'Casa'];
const rxDistrictLabel = property => property.district[0] + property.district.slice(1).toLowerCase();

function rxMatches(trip) {
  const dest = rxNorm(trip.destination);
  let list = properties.map((property, index) => ({ property, index })).filter(({ property, index }) => {
    if (property.published === false) return false;
    if (trip.district && property.district !== trip.district) return false;
    if (trip.type && (property.type || 'Departamento') !== trip.type) return false;
    if (dest && !(rxNorm(property.city || 'Buenos Aires').includes(dest) || rxNorm(property.district).includes(dest) || rxNorm(property.name).includes(dest))) return false;
    if (rxState.cheap && property.price > 100) return false;
    return available(index, trip);
  });
  if (rxState.sort) list = [...list].sort((a, b) => a.property.price - b.property.price);
  return list;
}

function rxCard({ property, index }) {
  const tag = property.tag ? `<span class="rx-tag">${escapeDemo(property.tag)}</span>` : '';
  return `<a class="rx-card" href="#departamento" data-property="${index}">
    <div class="rx-photo"><img src="${escapeDemo(demoPropertyImage(property))}" alt="${escapeDemo(property.name)}" loading="lazy">${tag}</div>
    <div class="rx-row"><span class="rx-name">${escapeDemo(property.name)}</span><span class="rx-price">USD ${property.price}</span></div>
    <div class="rx-sub"><span>${escapeDemo(rxDistrictLabel(property))}, ${escapeDemo(property.city || 'Buenos Aires')}</span><span>por noche</span></div>
  </a>`;
}

function rxCountLabel(count) { return count === 1 ? '1 estadía con precio final' : count + ' estadías con precio final'; }

function explorar() {
  const trip = getTrip();
  const matches = rxMatches(trip);
  const summary = [trip.destination || 'Todos los destinos', trip.type || 'Cualquier tipo', dateLabel(trip.arrival) + ' a ' + dateLabel(trip.departure), trip.guests === 1 ? '1 huésped' : trip.guests + ' huéspedes'].join(', ');
  return `${header()}<main class="rx">
    <div class="rx-top">
      <h1>Estadías disponibles</h1>
      <div class="rx-tools">
        <button type="button" class="rx-chip" data-rx="cheap" aria-pressed="${rxState.cheap}">Hasta USD 100</button>
        <button type="button" class="rx-chip" data-rx="sort" aria-pressed="${rxState.sort}">Menor precio</button>
        <button type="button" class="rx-edit" data-rx="edit" aria-expanded="false" aria-controls="rx-search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>Editar búsqueda</button>
      </div>
    </div>
    <form class="rx-search" id="rx-search" data-trip-form="search" hidden>
      <label>Destino<input name="destination" type="text" value="${escapeDemo(trip.destination)}" placeholder="Buscá un destino" autocomplete="off"></label>
      <label>Tipo<select name="type"><option value="">Cualquier tipo</option>${rxTypes.map(t => `<option ${trip.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label>Entrada<input type="date" name="arrival" value="${trip.arrival}" min="${earliestArrival()}" required></label>
      <label>Salida<input type="date" name="departure" value="${trip.departure}" min="${datePlus(trip.arrival, 1)}" required></label>
      <label>Huéspedes<select name="guests"><option value="1" ${trip.guests === 1 ? 'selected' : ''}>1 huésped</option><option value="2" ${trip.guests === 2 ? 'selected' : ''}>2 huéspedes</option></select></label>
      <button class="rx-go" type="submit">Buscar</button>
    </form>
    <div class="rx-meta"><span class="rx-count">${rxCountLabel(matches.length)}</span><span>${escapeDemo(summary)}</span></div>
    <div class="rx-grid">${matches.map(rxCard).join('')}${matches.length ? '' : '<p class="rx-empty">No encontramos estadías para esta búsqueda. Probá otras fechas o quitá algún filtro.</p>'}</div>
  </main>${footer()}`;
}

app.addEventListener('click', event => {
  const control = event.target.closest('[data-rx]');
  if (!control || !control.closest('.rx')) return;
  const kind = control.dataset.rx;
  if (kind === 'edit') {
    const panel = app.querySelector('#rx-search');
    const opening = panel.hidden;
    panel.hidden = !opening;
    control.setAttribute('aria-expanded', String(opening));
    if (opening) panel.querySelector('input')?.focus({ preventScroll: true });
    return;
  }
  rxState[kind] = !rxState[kind];
  control.setAttribute('aria-pressed', String(rxState[kind]));
  const matches = rxMatches(getTrip());
  app.querySelector('.rx-grid').innerHTML = matches.map(rxCard).join('') || '<p class="rx-empty">No encontramos estadías para esta búsqueda. Probá otras fechas o quitá algún filtro.</p>';
  app.querySelector('.rx-count').textContent = rxCountLabel(matches.length);
});

function departamento() {
  const property = properties[chosen] || properties[0];
  const trip = getTrip();
  const district = rxDistrictLabel(property);
  const cover = escapeDemo(demoPropertyImage(property));
  return `${header()}<main class="fx">
    <section class="fx-hero">
      <div class="fx-bg" style="--img:url('${cover}')"></div>
      <div class="fx-shade"></div>
      <div class="fx-bar"><a class="fx-back" href="#explorar">← Volver</a><a class="fx-logo" href="index.html">rentapart</a><span class="fx-where">${escapeDemo(district)}, ${escapeDemo(property.city || 'Buenos Aires')}</span></div>
      <h1>${escapeDemo(property.name)}</h1>
    </section>
    <div class="fx-body">
      <div class="fx-main">
        <div class="fx-facts"><span>${escapeDemo(property.type || 'Departamento')}</span><span>Hasta 2 huéspedes</span><span>1 dormitorio</span><span>1 baño</span></div>
        <p class="fx-lead">${escapeDemo(property.description || 'Un departamento equipado para estancias cortas, cerca de cafés, comercios y transporte.')}</p>
        <div class="fx-gallery">
          <img src="${cover}" alt="Sala principal">
          <img src="assets/f9321.webp" alt="Dormitorio">
        </div>
        <div class="fx-list">
          <div><span>Wi-Fi</span><b>Incluido</b></div>
          <div><span>Cocina equipada</span><b>Incluido</b></div>
          <div><span>Aire acondicionado</span><b>Incluido</b></div>
          <div><span>Ropa de cama</span><b>Incluida</b></div>
        </div>
        <a class="fx-map" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(district + ', ' + (property.city || 'Buenos Aires'))}" target="_blank" rel="noopener">Ver ${escapeDemo(district)} en el mapa ↗</a>
      </div>
      <form class="fx-book trip-booking" data-trip-form="details">
        <div class="fx-price">USD ${property.price} <small>por noche</small></div>
        <div class="trip-fields">${tripFields(trip)}</div>
        <div class="trip-cost" aria-live="polite">${estimate(property, trip)}</div>
        <p class="trip-status" role="status">${available(chosen, trip) ? 'Fechas disponibles en la demo.' : 'Estas fechas no están disponibles.'}</p>
        <button class="btn full" type="submit">Continuar a la reserva</button>
      </form>
    </div>
  </main>${footer()}`;
}

function reservar() {
  const property = properties[chosen] || properties[0];
  const trip = getTrip();
  return `${header()}<main class="container narrow">
    ${link('← Volver al departamento', 'departamento', 'back')}<h1>Tu próxima estadía</h1>
    <div class="form-layout"><form class="form-fields" data-trip-form="request">
      <h2>Detalles del viaje</h2><div class="trip-fields">${tripFields(trip)}</div>
      <h2>Tus datos</h2>
      <label class="trip-field">Nombre y apellido<input name="name" autocomplete="name" required maxlength="100"></label>
      <label class="trip-field">Correo electrónico<input name="email" type="email" autocomplete="email" required></label>
      <label class="trip-field">Teléfono<input name="phone" type="tel" autocomplete="tel" required></label>
      <p class="trip-status" role="status">Solicitud de demostración. No se envía un correo ni se realiza un cobro.</p>
      <button class="btn full" type="submit">Enviar solicitud de demo</button>
    </form>
    <aside class="panel summary"><h2>${escapeDemo(property.name)}</h2><div class="trip-cost" aria-live="polite">${estimate(property, trip)}</div></aside></div>
  </main>${footer()}`;
}

function confirmacion() {
  const receipts = readDemo('rentapartReservations', []);
  const receiptId = sessionStorage.getItem('rentapartReceipt');
  const receipt = receipts.find(item => item.id === receiptId);
  const property = receipt && properties[receipt.property];
  const labels = { pendiente: 'Solicitud pendiente', confirmada: 'Reserva confirmada', cancelada: 'Reserva cancelada' };
  return `${header()}<main class="container narrow demo-receipt"><h1>${receipt ? labels[receipt.status] : 'Todavía no hay una solicitud'}</h1>
  ${receipt && property ? `<p class="lead">${escapeDemo(property.name)} · ${dateLabel(receipt.arrival)} a ${dateLabel(receipt.departure)} · ${receipt.guests} huéspedes</p>
  <div class="panel summary">${estimate({ price: receipt.rate }, receipt)}</div>
  <p>Demostración local. No se generó una reserva real.</p>
  ${receipt.status === 'pendiente' ? '<button type="button" class="btn outline" data-demo-cancel>Cancelar solicitud</button>' : ''}` : ''}
  ${link('Volver a explorar', 'explorar', 'btn')}`
  + `</main>${footer()}`;
}

app.addEventListener('change', event => {
  const form = event.target.closest('[data-trip-form]');
  if (!form) return;
  const { arrival, departure, guests } = form.elements;
  if (validDate(arrival.value)) departure.min = datePlus(arrival.value, 1);
  departure.setCustomValidity('');
  if (form.dataset.tripForm === 'search' || !form.checkValidity()) return;
  const trip = { arrival: arrival.value, departure: departure.value, guests: Number(guests.value) };
  const cost = form.closest('main').querySelector('.trip-cost');
  const previous = cost.querySelector('.trip-total strong:last-child');
  const fromTotal = previous ? Number(previous.textContent.replace(/\D/g, '')) : null;
  cost.innerHTML = estimate(properties[chosen] || properties[0], trip);
  const totalEl = cost.querySelector('.trip-total strong:last-child');
  const toTotal = totalEl ? Number(totalEl.textContent.replace(/\D/g, '')) : null;
  if (totalEl && fromTotal !== null && fromTotal !== toTotal && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const t0 = performance.now();
    const tick = now => {
      const p = Math.min(1, (now - t0) / 520);
      totalEl.textContent = 'USD ' + Math.round(fromTotal + (toTotal - fromTotal) * (1 - Math.pow(1 - p, 3)));
      if (p < 1 && totalEl.isConnected) requestAnimationFrame(tick);
      else if (totalEl.isConnected) totalEl.textContent = 'USD ' + toTotal;
    };
    requestAnimationFrame(tick);
  }
  cost.animate?.([{ opacity: .55 }, { opacity: 1 }], {
    duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220
  });
  if (form.dataset.tripForm === 'details') {
    form.querySelector('.trip-status').textContent = available(chosen, trip) ?
      'Fechas disponibles en la demo.' : 'Estas fechas no están disponibles.';
  }
});

app.addEventListener('submit', event => {
  const form = event.target.closest('[data-trip-form]');
  if (!form) return;
  event.preventDefault();
  const values = new FormData(form);
  const trip = {
    arrival: values.get('arrival'),
    departure: values.get('departure'),
    guests: Number(values.get('guests')),
    district: values.get('district') ?? getTrip().district,
    type: values.get('type') ?? getTrip().type,
    destination: values.get('destination') ?? getTrip().destination
  };
  if (!validDate(trip.arrival) || !validDate(trip.departure) || trip.departure <= trip.arrival) {
    form.elements.departure.setCustomValidity('Elegí una salida posterior a la entrada.');
    form.reportValidity();
    return;
  }

  // Only keep the selected trip. Contact information is not retained in the demo.
  sessionStorage.setItem('rentapartSearch', JSON.stringify(trip));
  const query = location.search ? '?' + new URLSearchParams(trip) : '';
  if (location.search) history.replaceState(null, '', location.pathname + query + location.hash);

  if (form.dataset.tripForm === 'search') {
    render();
    return;
  }
  if (!available(chosen, trip)) {
    form.querySelector('.trip-status').textContent = 'Estas fechas no están disponibles. Elegí otro rango.';
    return;
  }
  if (form.dataset.tripForm === 'details') {
    location.hash = 'reservar';
    return;
  }

  const reservations = readDemo('rentapartReservations', []);
  const receipt = { ...trip, id: String(Date.now()), property: chosen, status: 'pendiente', rate: properties[chosen].price };
  sessionStorage.setItem('rentapartReservations', JSON.stringify([...reservations, receipt]));
  sessionStorage.setItem('rentapartReceipt', receipt.id);
  location.hash = 'confirmacion';
});

app.addEventListener('click', event => {
  if (!event.target.closest('[data-demo-cancel]')) return;
  const id = sessionStorage.getItem('rentapartReceipt');
  const records = readDemo('rentapartReservations', []);
  sessionStorage.setItem('rentapartReservations', JSON.stringify(records.map(item =>
    item.id === id && item.status === 'pendiente' ? { ...item, status: 'cancelada' } : item)));
  render();
});

function acceso(){return `${header()}<main class="login"><div class="login-photo"><div><h1>Buenos espacios.<br>Mejores experiencias.</h1><p>Tu gestión empieza acá.</p></div></div><div class="login-form"><h1>Bienvenido a tu espacio.</h1><p class="lead">Elegí un panel de demostración.</p>${link('Probar panel de agente　↗','agente/resumen','btn full')}<p style="margin-top:30px">${link('Probar administración','admin/resumen')}</p><p class="lead">La demo no inicia sesión en un servidor.</p></div></main>`}
const agentNav=[['Resumen','resumen'],['Propiedades','propiedades'],['Calendario','calendario'],['Reservas','reservas'],['Historial','historial']];const adminNav=[['Vista general','resumen'],['Agentes','agentes'],['Propiedades','propiedades'],['Reservas','reservas'],['Personalización','personalizacion']];
function shell(section,content){let nav=admin?adminNav:agentNav, base=admin?'admin':'agente';return `${header()}<div class="dashboard"><aside class="sidebar"><p class="eyebrow">${admin?'ADMINISTRACIÓN':'ESPACIO DE AGENTES'}</p>${nav.map(([l,p])=>link(l,`${base}/${p}`,p===section?'active':'')).join('')}<div class="account"><strong>${admin?'Administración':'Marina Costa'}</strong><br><small>${admin?'Control de plataforma':'Agente · Cuenta privada'}</small><br>${link('Cerrar sesión','acceso')}</div></aside><main class="dashbody"><p class="demo-mode">Demo · Datos de esta sesión</p><div class="row"><p class="eyebrow">${admin?'ADMINISTRACIÓN':'ESPACIO DE AGENTES'}　/　${section.toUpperCase()}</p><small>Noviembre 2026　·　AR / USD</small></div>${content}</main></div>`}
const dashHead=(title,desc,action='')=>`<div class="dash-head"><div><h1>${title}</h1><p class="muted">${desc}</p></div>${action}</div>`;
const stats=(items)=>`<div class="stats">${items.map(x=>`<div class="panel stat"><small>${x[0]}</small><strong>${x[1]}</strong><small>${x[2]||''}</small></div>`).join('')}</div>`;
function agent(section){if(section==='resumen')return shell(section,`${dashHead('Hola, Marina.','Todo lo importante de tus propiedades, en un solo lugar.')}${stats([['Propiedades publicadas','03','Todas listas para recibir huéspedes'],['Reservas próximas','12','2 solicitudes por revisar'],['Ingresos de noviembre','USD 1.960','Importes de reservas confirmadas']])}<div class="dash-grid"><div class="panel"><h2>Próximas llegadas</h2>${reservasTable()}</div><div class="panel"><h2>Dos solicitudes esperan tu respuesta.</h2><p class="lead">Revisá las fechas y ayudá a tus próximos huéspedes a planificar.</p><br>${link('Ver solicitudes','agente/reservas','btn')}</div></div>`);
if(section==='propiedades')return shell(section,`${dashHead('Mis propiedades','Solo vos podés administrar estos departamentos.',link('＋ Nueva propiedad','agente/editor/nueva','btn'))}<div class="toolbar"><span>Publicadas · ${properties.filter(property => property.published !== false).length}</span>${field('','Buscar propiedad…')}</div><div class="dash-cards">${properties.map((p,i)=>`<div class="card property"><img src="${escapeDemo(demoPropertyImage(p))}" alt=""><div class="content"><small>${p.published !== false ? 'PUBLICADA' : 'BORRADOR'}</small><h3>${escapeDemo(p.name)}</h3><p class="lead">USD ${p.price} por noche</p><br><a href="#agente/editor" data-property="${i}">Editar　↗</a></div></div>`).join('')}</div><p class="lead">Los cambios de disponibilidad se reflejan en tu calendario.</p>`);
if(section==='editor')return demoPropertyEditor()
if(section==='calendario')return demoBlocksPanel()
if(readDemo('rentapartReservations', []).length)return shell(section, dashHead('Reservas','Gestioná las solicitudes de esta demo.') + demoBookingTable())
return shell(section,`${dashHead('Calendario','Reservas, fechas bloqueadas y noches disponibles.') }<div class="dash-grid">${calendar()}<div class="panel"><h2>Seleccioná un rango</h2>${field('Desde','28 dic 2026')}${field('Hasta · inclusive','30 dic 2026')}<p class="lead">3 noches · Sin reservas en este rango.</p><br>${button('Bloquear fechas','bloqueado','full')}<hr class="line"><h3>Cada noche, una reserva.</h3><p class="lead">Las fechas confirmadas quedan fuera de la disponibilidad.</p></div></div>`);
return shell(section,`${dashHead(section==='historial'?'Historial':'Reservas','Gestioná solicitudes y acompañá cada estadía.')}<div class="chips">${button('Próximas','proximas','light')}${button('Solicitudes · 2','solicitudes','light')}${link('Historial','agente/historial','btn light')}</div><div class="panel"><span class="badge pending">Pendiente</span><h2 style="margin-top:18px">Tomás Ríos</h2><p>Palermo botánico · 26–29 dic 2026 · 2 adultos</p><p class="lead">3 noches · Total USD 275 · No se superpone con otras reservas.</p><br>${button('Confirmar solicitud','confirmar')} ${button('Cancelar solicitud','cancelar','outline')}</div><div class="panel table-wrap" style="margin-top:24px"><h2>Próximas estadías</h2>${reservasTable()}</div>`)}
function reservasTable(){return `<table class="table"><thead><tr><th>HUÉSPED / PROPIEDAD</th><th>FECHAS</th><th>TOTAL</th><th>ESTADO</th></tr></thead><tbody><tr><td>Lucía Fernández<small>Palermo botánico</small></td><td>18–22 dic 2026</td><td>USD 360</td><td><span class="badge">Confirmada</span></td></tr><tr><td>Sofía Pérez<small>Recoleta luz</small></td><td>23–27 dic 2026</td><td>USD 460</td><td><span class="badge">Confirmada</span></td></tr></tbody></table>`}
function administration(section){if(section==='resumen')return shell(section,`${dashHead('Vista general','Una mirada clara a toda la plataforma.')}${stats([['Agentes activos','08'],['Propiedades publicadas','24'],['Reservas de noviembre','36']])}<div class="dash-grid"><div class="panel"><h2>Actividad reciente</h2><p>Reserva confirmada <small>　Lucía Fernández · Palermo botánico　 ·　 Hoy, 10:42</small></p><hr class="line"><p>Propiedad actualizada <small>　Marina Costa · Recoleta luz　 ·　 Hoy, 09:18</small></p><hr class="line"><p>Nuevo agente activo <small>　Joaquín Méndez · 4 propiedades　 ·　 Ayer, 16:30</small></p></div><div class="panel"><h2>Una marca que se siente propia.</h2><p class="lead">Actualizá la identidad y los datos de contacto desde un solo lugar.</p><br>${link('Personalizar','admin/personalizacion','btn')}</div></div>`);
if(section==='agentes')return shell(section,`${dashHead('Agentes','Gestioná quién puede publicar y administrar propiedades.',button('＋ Crear agente','agente'))}<div class="toolbar">${field('Buscar por nombre o correo','Buscar agente…')}${button('Filtrar agentes','filtroagentes','outline')}</div><div class="panel table-wrap"><table class="table"><thead><tr><th>AGENTE</th><th>PROPIEDADES</th><th>ESTADO</th><th>ACCIONES</th></tr></thead><tbody>${[['Marina Costa','marina','3',true],['Joaquín Méndez','joaquin','4',true],['Sol Acosta','sol','0',false]].map(([n,e,c,on])=>`<tr><td>${n}<small>${e}@rentapart.com</small></td><td>${c}</td><td><span class="badge ${on?'':'off'}">${on?'Activo':'Inactivo'}</span></td><td><a href="#" data-action="agente">Editar</a><small><a href="#" data-action="desactivar">${on?'Desactivar':'Activar'}</a></small></td></tr>`).join('')}</tbody></table></div><div class="panel" style="margin-top:24px"><h2>Cada agente, solo sus propiedades.</h2><p class="muted">Al desactivar una cuenta se bloquea su acceso. Las reservas existentes no se eliminan.</p></div>`);
if(section==='personalizacion')return demoBrandEditor()
if(section==='propiedades')return shell(section,`${dashHead('Todas las propiedades','Una vista de las propiedades publicadas en la plataforma.') }<div class="dash-cards">${properties.map(propertyCard).join('')}</div>`);
return shell(section,`${dashHead('Todas las reservas','Consultá las reservas de toda la plataforma.')}${readDemo('rentapartReservations', []).length ? demoBookingTable() : '<div class="panel table-wrap">' + reservasTable() + '</div>'}`)}
function demoPropertyImage(property) {
  return property.photo || 'assets/' + property.img;
}

function demoBrandEditor() {
  const brand = readDemo('rentapartBrand', {});
  return shell('personalizacion', `${dashHead('Personalización', 'Ajustá la identidad y la información de la demo.')}
    <form class="panel form-fields" id="demo-brand-editor">
      <label class="trip-field">Logo (JPEG, PNG o WebP)<input name="logo" type="file" accept="image/jpeg,image/png,image/webp"></label>
      <label class="trip-field">Foto del inicio<input name="hero" type="file" accept="image/jpeg,image/png,image/webp"></label>
      <div class="trip-fields">
        <label class="trip-field">Color principal<input name="ink" type="color" value="${escapeDemo(brand.ink || '#111315')}"></label>
        <label class="trip-field">Fondo<input name="paper" type="color" value="${escapeDemo(brand.paper || '#f8f8f6')}"></label>
      </div>
      <label class="trip-field">Título del inicio<input name="title" maxlength="120" value="${escapeDemo(brand.title)}" placeholder="Alquileres temporarios en los mejores destinos."></label>
      <label class="trip-field">Descripción breve<input name="description" maxlength="180" value="${escapeDemo(brand.description)}"></label>
      <label class="trip-field">Correo de contacto<input name="email" type="email" value="${escapeDemo(brand.email || 'hola@rentapart.com')}" required></label>
      <label class="trip-field">WhatsApp (número internacional)<input name="phone" pattern="[0-9]{8,15}" value="${escapeDemo(brand.phone || '5491155550101')}" required></label>
      <p role="status" class="trip-status"></p><button class="btn" type="submit">Guardar personalización</button>
    </form>`);
}

app.addEventListener('submit', async event => {
  const form = event.target;
  if (form.id !== 'demo-brand-editor') return;
  event.preventDefault();
  const fields = new FormData(form);
  const brand = readDemo('rentapartBrand', {});
  const status = form.querySelector('[role="status"]');
  const button = form.querySelector('button');
  button.disabled = true;

  try {
    for (const key of ['logo', 'hero']) {
      const file = fields.get(key);
      if (!file.size) continue;
      if (file.size > 1200000 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        status.textContent = 'Elegí imágenes JPEG, PNG o WebP de hasta 1,2 MB.';
        return;
      }
      brand[key] = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
    if (!form.isConnected) return;
    for (const key of ['ink', 'paper', 'title', 'description', 'email', 'phone']) brand[key] = fields.get(key).trim();
    sessionStorage.setItem('rentapartBrand', JSON.stringify(brand));
    status.textContent = 'Cambios guardados en esta sesión. Podés verlos en el inicio.';
  } catch {
    status.textContent = 'No se pudo guardar. Probá con imágenes más chicas.';
  } finally {
    button.disabled = false;
  }
});

function demoPropertyEditor() {
  const creating = location.hash.endsWith('/nueva');
  const property = creating ? {} : properties[chosen];
  return shell('propiedades', `${dashHead(creating ? 'Nueva propiedad' : 'Editar propiedad', 'Prepará la publicación de tu departamento.')}
    <form class="panel form-fields" id="demo-property-editor" data-create="${creating}">
      <label class="trip-field">Nombre<input name="name" required maxlength="100" value="${escapeDemo(property.name)}"></label>
      <label class="trip-field">Barrio<select name="district">${['PALERMO', 'RECOLETA', 'NÚÑEZ'].map(district =>
        `<option ${property.district === district ? 'selected' : ''}>${district}</option>`).join('')}</select></label>
      <label class="trip-field">Descripción<textarea name="description" required maxlength="1800" rows="4">${escapeDemo(property.description)}</textarea></label>
      <label class="trip-field">Precio por noche (USD)<input name="price" type="number" min="1" max="9999" required value="${property.price ?? ''}"></label>
      <label class="trip-field">Foto principal<input name="photo" type="file" accept="image/jpeg,image/png,image/webp"></label>
      <label><input name="published" type="checkbox" ${!creating && property.published !== false ? 'checked' : ''}> Publicar en la demo</label>
      <p role="status" class="trip-status"></p><button type="submit" class="btn">Guardar propiedad</button>
    </form>`);
}

function demoBookingTable() {
  const records = readDemo('rentapartReservations', []);
  if (!records.length) return '<p class="lead">Las solicitudes de esta sesión van a aparecer acá.</p>';
  return `<div class="panel table-wrap demo-table"><table class="table">
    <thead><tr><th>Propiedad</th><th>Fechas</th><th>Estado</th><th>Acciones</th></tr></thead>
    <tbody>${records.map(item => `<tr><td>${escapeDemo(properties[item.property]?.name)}</td>
      <td>${dateLabel(item.arrival)} a ${dateLabel(item.departure)}</td><td>${item.status}</td>
      <td>${item.status === 'pendiente' ? `<button class="btn" data-demo-reservation="${item.id}" data-status="confirmada">Confirmar</button>` : ''}
        ${item.status !== 'cancelada' ? `<button class="btn outline" data-demo-reservation="${item.id}" data-status="cancelada">Cancelar</button>` : ''}</td></tr>`).join('')}</tbody>
    </table></div>`;
}

function demoBlocksPanel() {
  const existing = readDemo('rentapartBlocks', []);
  return shell('calendario', `${dashHead('Disponibilidad', 'Bloqueá fechas para tus departamentos en la demo.')}
    <form class="panel form-fields" id="demo-block-form">
      <label class="trip-field">Propiedad<select name="property">${properties.map((property, index) =>
        `<option value="${index}">${escapeDemo(property.name)}</option>`).join('')}</select></label>
      <div class="trip-fields">
        <label class="trip-field">Desde<input type="date" name="arrival" required></label>
        <label class="trip-field">Hasta (fecha de salida)<input type="date" name="departure" required></label>
      </div>
      <p class="trip-status" role="status"></p><button class="btn" type="submit">Bloquear fechas</button>
    </form>
    <div class="panel demo-table"><h2>Fechas bloqueadas</h2>${existing.length ? existing.map((item, index) => `<div class="row"><p>${escapeDemo(properties[item.property]?.name)} · ${dateLabel(item.arrival)} a ${dateLabel(item.departure)}</p><button class="btn outline" data-demo-unblock="${index}">Quitar bloqueo</button></div>`).join('') : '<p>Sin bloqueos agregados en esta sesión.</p>'}</div>`);
}

app.addEventListener('submit', async event => {
  const form = event.target;
  if (form.id !== 'demo-property-editor' && form.id !== 'demo-block-form') return;
  event.preventDefault();
  const values = new FormData(form);
  const status = form.querySelector('[role="status"]');

  if (form.id === 'demo-block-form') {
    const block = { property: Number(values.get('property')), arrival: values.get('arrival'), departure: values.get('departure') };
    if (block.departure <= block.arrival || !available(block.property, block)) {
      status.textContent = 'Elegí un rango válido que no coincida con una reserva o un bloqueo.';
      return;
    }
    sessionStorage.setItem('rentapartBlocks', JSON.stringify([...readDemo('rentapartBlocks', []), block]));
    render();
    return;
  }

  const creating = form.dataset.create === 'true';
  const property = creating ? { img: 'fdfa7.webp' } : { ...properties[chosen] };
  const photo = values.get('photo');
  const currentIndex = chosen;
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;

  try {
    if (photo.size) {
      if (photo.size > 1500000 || !['image/jpeg', 'image/png', 'image/webp'].includes(photo.type)) {
        status.textContent = 'Elegí una imagen JPEG, PNG o WebP de hasta 1,5 MB.';
        return;
      }
      property.photo = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(photo);
      });
    }
    if (!form.isConnected) return;
    Object.assign(property, {
      name: values.get('name').trim(), district: values.get('district'),
      description: values.get('description').trim(), price: Number(values.get('price')),
      published: values.has('published')
    });
    if (!property.name || !property.description) {
      status.textContent = 'Ingresá el nombre y una descripción.';
      return;
    }
    const updated = [...properties];
    if (creating) updated.push(property);
    else updated[currentIndex] = property;
    sessionStorage.setItem('rentapartProperties', JSON.stringify(updated));
    properties.splice(0, properties.length, ...updated);
    location.hash = 'agente/propiedades';
  } catch {
    status.textContent = 'No se pudo guardar. Probá con una imagen más chica.';
  } finally {
    submit.disabled = false;
  }
});

app.addEventListener('click', event => {
  const reservation = event.target.closest('[data-demo-reservation]');
  const unblock = event.target.closest('[data-demo-unblock]');
  if (reservation) {
    const { demoReservation, status } = reservation.dataset;
    const records = readDemo('rentapartReservations', []);
    sessionStorage.setItem('rentapartReservations', JSON.stringify(records.map(item =>
      item.id === demoReservation ? { ...item, status } : item)));
    render();
  } else if (unblock) {
    const index = Number(unblock.dataset.demoUnblock);
    sessionStorage.setItem('rentapartBlocks', JSON.stringify(readDemo('rentapartBlocks', []).filter((_, i) => i !== index)));
    render();
  }
});

function show(title,body,actions=''){modal.innerHTML=`<div class="overlay"><div class="dialog"><button class="close" data-action="cerrar" aria-label="Cerrar">×</button><h2>${title}</h2>${body}${actions}</div></div>`}
function render(){const parts=location.hash.slice(1).split('/'), page=parts[0]||'explorar';admin=page==='admin';if(page==='explorar')app.innerHTML=explorar();else if(page==='departamento')app.innerHTML=departamento();else if(page==='reservar')app.innerHTML=reservar();else if(page==='confirmacion')app.innerHTML=confirmacion();else if(page==='acceso')app.innerHTML=acceso();else if(page==='agente')app.innerHTML=agent(parts[1]||'resumen');else if(page==='admin')app.innerHTML=administration(parts[1]||'resumen');else app.innerHTML=explorar();window.scrollTo({top:0, left:0, behavior:"instant"})}
window.addEventListener('hashchange', () => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (document.startViewTransition && !reducedMotion) {
    document.startViewTransition(() => render());
  } else {
    render();
  }
});document.addEventListener('click',e=>{let property=e.target.closest('[data-property]');if(property){chosen=Number(property.dataset.property);sessionStorage.property=chosen}let el=e.target.closest('[data-action]');if(!el)return;e.preventDefault();const a=el.dataset.action;if(a==='cerrar'){modal.innerHTML='';return}if(a==='menu')show('rentapart',`<p>${link('Explorar departamentos','explorar')}</p><p>${link('Soy agente','acceso')}</p><p><a href="index.html#nosotros">Publicar una propiedad</a></p><small>hola@rentapart.com</small>`);else if(a==='filtros')show('Filtros de búsqueda',`${field('Precio máximo por noche','USD 120')}${field('Huéspedes','2 adultos')}<p>Comodidades</p><p>☐ Wi-Fi　☐ Cocina　☐ Aire acondicionado</p>`,button('Aplicar filtros','cerrar','full'));else if(a==='detalle')show('Detalles de mi reserva',`<p>${properties[chosen].name}<br>18–22 dic 2026 · 2 adultos</p>${estimate(properties[chosen],getTrip())}`,button('Cancelar solicitud','cancelar','full outline'));else if(a==='agente')show('Datos del agente',`<p>Acceso privado a sus propias propiedades.</p>${field('Nombre y apellido','Marina Costa')}${field('Correo electrónico','marina@rentapart.com')}${field('Estado de la cuenta','Activo')}<p>Se enviará una invitación por correo para crear su cuenta.</p>`,button('Guardar agente','guardado','full'));else if(a==='desactivar')show('¿Desactivar cuenta?','<p>Ya no podrá acceder a su espacio de gestión.</p>',button('Confirmar desactivación','guardado','full')+button('Cerrar','cerrar','full light'));else if(a==='cancelar')show('¿Cancelar solicitud?','<p>Las fechas volverán a estar disponibles para futuras reservas.</p>',button('Confirmar cancelación','cancelado','full')+button('Volver','cerrar','full light'));else if(a==='guardado'||a==='confirmar'||a==='cancelado'||a==='bloqueado')show(a==='guardado'?'Cambios guardados':a==='confirmar'?'Solicitud confirmada':a==='cancelado'?'Solicitud cancelada':'Fechas bloqueadas','<p>Los cambios se muestran en esta demostración.</p>',button('Continuar','cerrar','full'));else if(a==='archivo')show('Cambiar imagen','<p>Seleccioná una imagen para actualizar la vista previa.</p><input type="file" accept="image/*">',button('Cerrar','cerrar','full'));else if(a==='dia')el.classList.toggle('selected');else if(a==='filtroagentes')show('Filtrar agentes','<p>Elegí el estado de las cuentas.</p><p>☐ Activos　☐ Inactivos</p>',button('Aplicar','cerrar','full'));});render();





