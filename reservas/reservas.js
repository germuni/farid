/* ═══════════════════════════════════════
   FARID — Sistema de Reservas
   reservas.js
   ═══════════════════════════════════════ */

// ── Firebase ─────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyCVBlzW5sArj9VaBsd_rfscRKU6xEie6N8",
  authDomain:        "farid-reservas.firebaseapp.com",
  projectId:         "farid-reservas",
  storageBucket:     "farid-reservas.firebasestorage.app",
  messagingSenderId: "811133664324",
  appId:             "1:811133664324:web:1a719b7b4d5d96ec27d011"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ── Locales ───────────────────────────────
const DIAS_KEY   = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
const DIAS_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MESES_S    = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const MESES_F    = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const WA_MAS4    = 'https://api.whatsapp.com/send/?phone=%2B19894613643&text=Hola%2C+quisiera+reservar+para+m%C3%A1s+de+4+personas.';
const WA_CANCEL  = 'https://api.whatsapp.com/send/?phone=%2B19894613643&text=Hola%2C+quisiera+cancelar+una+reserva.';

// ── State ─────────────────────────────────
const S = {
  step:     0,
  personas: null,
  fecha:    null,   // "YYYY-MM-DD"
  horario:  null,
  servicio: null,
  sector:   null,
  nombre:   '',
  telefono: '',
  notas:    ''
};

let CFG = null;

// ── Bootstrap ─────────────────────────────
async function init() {
  try {
    const snap = await db.collection('config').doc('general').get();
    if (!snap.exists) {
      await db.collection('config').doc('general').set(defaultConfig());
      const s2 = await db.collection('config').doc('general').get();
      CFG = s2.data();
    } else {
      CFG = snap.data();
    }
    render();
  } catch (e) {
    card().innerHTML = `<div class="res-error" style="text-align:center;">
      No se pudo conectar con el servidor.<br>Revisá tu conexión e intentá de nuevo.
    </div>`;
    console.error(e);
  }
}

function defaultConfig() {
  return {
    capacidadPorSlot: 20,
    maxPersonas: 4,
    whatsappNotif: '+541136860407',
    callmebotApiKey: 'PENDIENTE',
    slots: {
      lunes:     ['19:30','20:00','20:30','21:00','21:30','22:00','22:30'],
      martes:    ['19:30','20:00','20:30','21:00','21:30','22:00','22:30'],
      miercoles: ['19:30','20:00','20:30','21:00','21:30','22:00','22:30','23:00'],
      jueves:    ['19:30','20:00','20:30','21:00','21:30','22:00','22:30','23:00'],
      viernes:   ['19:30','20:00','20:30','21:00','21:30','22:00','22:30','23:00'],
      sabado:    ['19:30','20:00','20:30','21:00','21:30','22:00','22:30','23:00'],
    },
    servicios:    ['Cena'],
    sectores:     ['Salón'],
    diasActivos:  ['lunes','martes','miercoles','jueves','viernes','sabado'],
    adminPassword: 'Farid2026'
  };
}

// ── Render router ─────────────────────────
function render() {
  const multiSvc = CFG.servicios.length > 1;
  const multiSec = CFG.sectores.length  > 1;
  const needStep4 = multiSvc || multiSec;

  switch (S.step) {
    case 0: card().innerHTML = stepWelcome();        break;
    case 1: card().innerHTML = stepPersonas();       break;
    case 2: card().innerHTML = stepFecha();          break;
    case 3: stepHorario();                           break;  // async
    case 4:
      if (needStep4) { card().innerHTML = stepServicioSector(); }
      else { autoFillStep4(); }
      break;
    case 5: card().innerHTML = stepDatos();          break;
    case 6: card().innerHTML = stepConfirm();        break;
    case 7: card().innerHTML = stepSuccess();        break;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function autoFillStep4() {
  S.servicio = CFG.servicios[0];
  S.sector   = CFG.sectores[0];
  S.step = 5;
  render();
}

// ── Steps ─────────────────────────────────

function stepWelcome() {
  return `
    <div style="text-align:center;padding:.5rem 0 1rem;">
      <p class="res-step-subtitle" style="margin-bottom:2rem;">Reservá tu mesa</p>
      <h2 class="res-step-title" style="font-size:1.8rem;margin-bottom:.5rem;">Bienvenido</h2>
      <p style="color:var(--muted);font-size:.9rem;line-height:1.7;margin-bottom:2.5rem;">
        Fernández de Enciso 3791, Villa Devoto<br>
        Lunes a Sábado · desde las 19:30
      </p>
      <button class="res-btn-primary" onclick="go(1)">Hacer una reserva</button>
      <div class="res-divider"></div>
      <a href="${WA_MAS4}" target="_blank" rel="noopener" class="res-wa-link" style="justify-content:center;">
        ${svgWa()} Reservas de más de ${CFG.maxPersonas} personas → WhatsApp
      </a>
    </div>`;
}

function stepPersonas() {
  const max  = CFG.maxPersonas || 4;
  const btns = range(1, max).map(n => `
    <button class="res-option ${S.personas===n?'selected':''}" onclick="selPersonas(${n})">${n}</button>
  `).join('');

  return `
    ${progress(1)}
    <p class="res-step-subtitle">Paso 1 de ${totalSteps()}</p>
    <h2 class="res-step-title">¿Cuántos son?</h2>
    <div class="res-options">${btns}</div>
    <p style="font-size:.8rem;color:var(--muted);margin-bottom:.5rem;">
      Para grupos de más de ${max} personas o eventos privados,
      <a href="${WA_MAS4}" target="_blank" rel="noopener" style="color:var(--green);">contactanos por WhatsApp</a>.
    </p>
    <p style="font-size:.8rem;color:var(--muted);">También asignamos mesas por orden de llegada.</p>
    ${back(0)}`;
}

function stepFecha() {
  const bloqueos = []; // loaded below via async
  const today = new Date(); today.setHours(0,0,0,0);
  const dateBtns = [];

  for (let i = 0; i < 60 && dateBtns.length < 35; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (!CFG.diasActivos.includes(DIAS_KEY[d.getDay()])) continue;
    const key = fmtDate(d);
    const sel = S.fecha === key ? 'selected' : '';
    dateBtns.push(`
      <button class="res-date-btn ${sel}" onclick="selFecha('${key}')">
        <span class="res-date-day">${DIAS_SHORT[d.getDay()]}</span>
        <span class="res-date-num">${d.getDate()}</span>
        <span class="res-date-month">${MESES_S[d.getMonth()]}</span>
      </button>`);
  }

  return `
    ${progress(2)}
    ${chips()}
    <p class="res-step-subtitle">Paso 2 de ${totalSteps()}</p>
    <h2 class="res-step-title">¿Qué día?</h2>
    <div class="res-dates" id="datesRow">${dateBtns.join('')}</div>
    ${back(1)}`;
}

async function stepHorario() {
  // Show loading immediately
  card().innerHTML = `
    ${progress(3)}
    ${chips()}
    <p class="res-step-subtitle">Paso 3 de ${totalSteps()}</p>
    <h2 class="res-step-title">¿A qué hora?</h2>
    <div class="res-loading"><div class="res-spinner"></div></div>
    ${back(2)}`;

  const d        = parseDate(S.fecha);
  const dayName  = DIAS_KEY[d.getDay()];
  const allSlots = (CFG.slots && CFG.slots[dayName]) || [];

  // Fetch reservations for this date to compute used capacity
  let usedPerSlot = {};
  try {
    const snap = await db.collection('reservas')
      .where('fecha',  '==', S.fecha)
      .where('estado', '==', 'confirmada')
      .get();
    snap.forEach(doc => {
      const r = doc.data();
      usedPerSlot[r.horario] = (usedPerSlot[r.horario] || 0) + r.personas;
    });
  } catch (e) { console.error(e); }

  const cap = CFG.capacidadPorSlot || 20;
  const slotsHtml = allSlots.length
    ? allSlots.map(slot => {
        const used   = usedPerSlot[slot] || 0;
        const avail  = cap - used >= S.personas;
        const cls    = !avail ? 'full' : (S.horario === slot ? 'selected' : '');
        const dis    = !avail ? 'disabled' : '';
        return `<button class="res-slot-btn ${cls}" ${dis} onclick="selHorario('${slot}')">${slot}</button>`;
      }).join('')
    : '<p style="color:var(--muted);font-size:.9rem;">No hay horarios disponibles para este día.</p>';

  card().innerHTML = `
    ${progress(3)}
    ${chips()}
    <p class="res-step-subtitle">Paso 3 de ${totalSteps()}</p>
    <h2 class="res-step-title">¿A qué hora?</h2>
    <div class="res-slots">${slotsHtml}</div>
    ${back(2)}`;
}

function stepServicioSector() {
  const multiSvc = CFG.servicios.length > 1;
  const multiSec = CFG.sectores.length  > 1;
  let html = `${progress(4)}${chips()}
    <p class="res-step-subtitle">Paso 4 de ${totalSteps()}</p>`;

  if (multiSvc) {
    const btns = CFG.servicios.map(s =>
      `<button class="res-option ${S.servicio===s?'selected':''}" onclick="selServicio('${s}')">${s}</button>`
    ).join('');
    html += `<h2 class="res-step-title" style="margin-bottom:.5rem;">Servicio</h2>
             <div class="res-options">${btns}</div>`;
  }
  if (multiSec) {
    const btns = CFG.sectores.map(s =>
      `<button class="res-option ${S.sector===s?'selected':''}" onclick="selSector('${s}')">${s}</button>`
    ).join('');
    html += `<h2 class="res-step-title" style="margin-top:1.5rem;margin-bottom:.5rem;">Ubicación</h2>
             <div class="res-options">${btns}</div>`;
  }
  return html + back(3);
}

function stepDatos() {
  const n = datosStepNum();
  return `
    ${progress(n)}
    ${chips()}
    <p class="res-step-subtitle">Paso ${n} de ${totalSteps()}</p>
    <h2 class="res-step-title">Tus datos</h2>
    <div class="res-field">
      <label class="res-label">Nombre y apellido *</label>
      <input class="res-input" id="iNombre" type="text" placeholder="María García"
             value="${escHtml(S.nombre)}" autocomplete="name">
    </div>
    <div class="res-field">
      <label class="res-label">Teléfono *</label>
      <input class="res-input" id="iTelefono" type="tel" placeholder="+54 9 11 1234 5678"
             value="${escHtml(S.telefono)}" autocomplete="tel">
    </div>
    <div class="res-field">
      <label class="res-label">Notas (opcional)</label>
      <input class="res-input" id="iNotas" type="text" placeholder="Celíacos, cumpleaños…"
             value="${escHtml(S.notas)}">
    </div>
    <button class="res-btn-primary" onclick="submitDatos()">Revisar reserva</button>
    ${back(datosStepNum() - 1)}`;
}

function stepConfirm() {
  const d   = parseDate(S.fecha);
  const lbl = `${DIAS_SHORT[d.getDay()]} ${d.getDate()} de ${MESES_F[d.getMonth()]}`;
  const multiSvc = CFG.servicios.length > 1;
  const multiSec = CFG.sectores.length  > 1;

  const rows = [
    ['Fecha',    lbl],
    ['Horario',  S.horario],
    ['Personas', S.personas],
    ...(multiSvc ? [['Servicio', S.servicio]] : []),
    ...(multiSec ? [['Ubicación', S.sector]]  : []),
    ['Nombre',   S.nombre],
    ['Teléfono', S.telefono],
    ...(S.notas ? [['Notas', S.notas]] : []),
  ].map(([l, v]) => `
    <div class="res-summary-row">
      <span class="res-summary-label">${l}</span>
      <span class="res-summary-value">${escHtml(String(v))}</span>
    </div>`).join('');

  return `
    ${progress(totalSteps())}
    ${chips()}
    <p class="res-step-subtitle">Confirmá tu reserva</p>
    <h2 class="res-step-title">Todo listo</h2>
    <div class="res-summary">${rows}</div>
    <button class="res-btn-primary" id="btnConfirm" onclick="confirmar()">Confirmar reserva</button>
    <div id="confirmErr"></div>
    ${back(datosStepNum())}`;
}

function stepSuccess() {
  const d   = parseDate(S.fecha);
  const lbl = `${DIAS_SHORT[d.getDay()]} ${d.getDate()} de ${MESES_F[d.getMonth()]}`;
  return `
    <div class="res-success">
      <div class="res-success-icon">✦</div>
      <h2 class="res-success-title">¡Reserva confirmada!</h2>
      <p class="res-success-text" style="margin-bottom:1.5rem;">
        Te esperamos el <strong>${lbl}</strong> a las <strong>${S.horario}</strong><br>
        para ${S.personas} ${S.personas===1?'persona':'personas'}.
      </p>
      <div class="res-divider"></div>
      <p class="res-success-text" style="margin-bottom:1.5rem;">
        Fernández de Enciso 3791, Villa Devoto.<br>
        Si necesitás cancelar, escribinos.
      </p>
      <a href="${WA_CANCEL}" target="_blank" rel="noopener" class="res-wa-link" style="justify-content:center;margin-bottom:1.5rem;">
        ${svgWa()} Cancelar por WhatsApp
      </a>
      <button class="res-btn-primary"
        style="background:transparent;border:1px solid var(--border);color:var(--cream);"
        onclick="go(0)">
        Hacer otra reserva
      </button>
    </div>`;
}

// ── Actions ───────────────────────────────

function go(n) {
  S.step = n;
  render();
}

function selPersonas(n) { S.personas = n; go(2); }

function selFecha(key) {
  S.fecha   = key;
  S.horario = null;
  go(3);
}

function selHorario(h) { S.horario = h; go(4); }

function selServicio(s) {
  S.servicio = s;
  if (CFG.sectores.length === 1) { S.sector = CFG.sectores[0]; go(5); }
}

function selSector(s) {
  S.sector = s;
  if (CFG.servicios.length === 1) { S.servicio = CFG.servicios[0]; go(5); }
}

function submitDatos() {
  const nombre   = document.getElementById('iNombre')?.value?.trim();
  const telefono = document.getElementById('iTelefono')?.value?.trim();
  const notas    = document.getElementById('iNotas')?.value?.trim();

  if (!nombre || !telefono) {
    alert('Por favor completá nombre y teléfono para continuar.');
    return;
  }
  S.nombre   = nombre;
  S.telefono = telefono;
  S.notas    = notas || '';
  go(6);
}

async function confirmar() {
  const btn    = document.getElementById('btnConfirm');
  const errDiv = document.getElementById('confirmErr');
  btn.disabled    = true;
  btn.textContent = 'Confirmando…';
  errDiv.innerHTML = '';

  try {
    // Re-check availability
    const snap = await db.collection('reservas')
      .where('fecha',   '==', S.fecha)
      .where('horario', '==', S.horario)
      .where('estado',  '==', 'confirmada')
      .get();

    let used = 0;
    snap.forEach(doc => { used += doc.data().personas; });

    if (used + S.personas > CFG.capacidadPorSlot) {
      errDiv.innerHTML = `<div class="res-error">
        Este horario se acaba de completar. Por favor volvé y elegí otro.
      </div>`;
      btn.disabled    = false;
      btn.textContent = 'Confirmar reserva';
      return;
    }

    await db.collection('reservas').add({
      fecha:    S.fecha,
      horario:  S.horario,
      personas: S.personas,
      servicio: S.servicio || 'Cena',
      sector:   S.sector   || 'Salón',
      nombre:   S.nombre,
      telefono: S.telefono,
      notas:    S.notas,
      estado:   'confirmada',
      creadoEn: firebase.firestore.FieldValue.serverTimestamp()
    });

    sendWANotif();
    go(7);

  } catch (e) {
    console.error(e);
    errDiv.innerHTML = `<div class="res-error">Ocurrió un error inesperado. Intentá de nuevo.</div>`;
    btn.disabled    = false;
    btn.textContent = 'Confirmar reserva';
  }
}

function sendWANotif() {
  const key = CFG.callmebotApiKey;
  if (!key || key === 'PENDIENTE') return;
  const d   = parseDate(S.fecha);
  const lbl = `${DIAS_SHORT[d.getDay()]} ${d.getDate()}/${d.getMonth()+1}`;
  const msg = [
    '🍽️ Nueva reserva FARID',
    `👤 ${S.nombre}`,
    `📅 ${lbl} · ${S.horario}`,
    `👥 ${S.personas} persona${S.personas>1?'s':''}`,
    `📞 ${S.telefono}`,
    ...(S.notas ? [`📝 ${S.notas}`] : [])
  ].join('\n');
  const url = `https://api.callmebot.com/whatsapp.php?phone=${CFG.whatsappNotif}&text=${encodeURIComponent(msg)}&apikey=${key}`;
  fetch(url).catch(() => {});
}

// ── UI helpers ────────────────────────────

function card()  { return document.getElementById('resCard'); }

function totalSteps() {
  const needStep4 = CFG.servicios.length > 1 || CFG.sectores.length > 1;
  return needStep4 ? 5 : 4;
}

function datosStepNum() {
  return CFG.servicios.length > 1 || CFG.sectores.length > 1 ? 5 : 4;
}

function progress(current) {
  const total = totalSteps();
  return `<div class="res-progress">${
    Array.from({length: total}, (_, i) =>
      `<div class="res-progress-dot ${i < current ? 'active' : ''}"></div>`
    ).join('')
  }</div>`;
}

function chips() {
  const list = [];
  if (S.personas) list.push(`${S.personas} persona${S.personas>1?'s':''}`);
  if (S.fecha) {
    const d = parseDate(S.fecha);
    list.push(`${DIAS_SHORT[d.getDay()]} ${d.getDate()} ${MESES_S[d.getMonth()]}`);
  }
  if (S.horario)                             list.push(S.horario);
  if (S.servicio && CFG.servicios.length>1)  list.push(S.servicio);
  if (S.sector   && CFG.sectores.length>1)   list.push(S.sector);
  if (!list.length) return '';
  return `<div class="res-chips">${list.map(c=>`<span class="res-chip">${c}</span>`).join('')}</div>`;
}

function back(toStep) {
  return `<button class="res-btn-back" onclick="go(${toStep})">← Volver</button>`;
}

function svgWa() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>`;
}

// ── Utils ─────────────────────────────────

function fmtDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function parseDate(s) {
  const [y,m,d] = s.split('-').map(Number);
  return new Date(y, m-1, d);
}
function pad(n) { return String(n).padStart(2,'0'); }
function range(a, b) { return Array.from({length: b-a+1}, (_, i) => a+i); }
function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ── Start ─────────────────────────────────
init();
