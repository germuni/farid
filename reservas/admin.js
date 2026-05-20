/* ═══════════════════════════════════════
   FARID — Admin Panel
   admin.js
   ═══════════════════════════════════════ */

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

const DIAS_KEY   = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
const DIAS_LABEL = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MESES_F    = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

const ALL_SLOTS = ['12:00','12:30','13:00','13:30','14:00','14:30','15:00',
                   '19:00','19:30','20:00','20:30','21:00','21:30','22:00','22:30','23:00','23:30'];

let CFG = null;

// ── Auth ──────────────────────────────────
async function login() {
  const pw  = document.getElementById('pwInput').value;
  const err = document.getElementById('loginErr');
  err.innerHTML = '';
  try {
    const snap = await db.collection('config').doc('general').get();
    const cfg  = snap.data() || {};
    const correctPw = cfg.adminPassword || 'Farid2026';
    if (pw === correctPw) {
      sessionStorage.setItem('farid_admin', '1');
      CFG = cfg;
      initApp();
    } else {
      err.innerHTML = '<div class="res-error">Contraseña incorrecta.</div>';
    }
  } catch (e) {
    err.innerHTML = '<div class="res-error">Error de conexión. Intentá de nuevo.</div>';
    console.error(e);
  }
}

function logout() {
  sessionStorage.removeItem('farid_admin');
  location.reload();
}

async function checkSession() {
  if (!sessionStorage.getItem('farid_admin')) return;
  try {
    const snap = await db.collection('config').doc('general').get();
    CFG = snap.data() || {};
    initApp();
  } catch (e) { console.error(e); }
}

function initApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminApp').style.display    = 'block';
  setToday();
  loadReservas();
}

// ── Tabs ──────────────────────────────────
function showTab(name) {
  ['reservas','bloqueos','config'].forEach(t => {
    document.getElementById(`panel-${t}`).style.display = t === name ? 'block' : 'none';
    document.getElementById(`tab-${t}`).classList.toggle('active', t === name);
  });
  if (name === 'bloqueos') loadBloqueos();
  if (name === 'config')   renderConfig();
}

// ── Reservas ──────────────────────────────
function setToday() {
  const d = new Date();
  document.getElementById('adminDate').value = fmtDate(d);
  loadReservas();
}

function changeDay(delta) {
  const inp = document.getElementById('adminDate');
  const d   = parseDate(inp.value);
  d.setDate(d.getDate() + delta);
  inp.value = fmtDate(d);
  loadReservas();
}

async function loadReservas() {
  const fecha  = document.getElementById('adminDate').value;
  const stats  = document.getElementById('statsBar');
  const list   = document.getElementById('reservasList');
  list.innerHTML = `<div class="res-loading"><div class="res-spinner"></div></div>`;
  stats.innerHTML = '';

  try {
    const snap = await db.collection('reservas')
      .where('fecha', '==', fecha)
      .orderBy('horario')
      .get();

    const reservas = [];
    snap.forEach(doc => reservas.push({ id: doc.id, ...doc.data() }));

    const confirmadas = reservas.filter(r => r.estado === 'confirmada');
    const totalCub    = confirmadas.reduce((s, r) => s + (r.personas || 0), 0);

    const d   = parseDate(fecha);
    const lbl = `${DIAS_LABEL[d.getDay()]} ${d.getDate()} de ${MESES_F[d.getMonth()]}`;

    stats.innerHTML = `
      <div class="admin-stat-card">
        <span class="admin-stat-num">${confirmadas.length}</span>
        <span class="admin-stat-label">Reservas · ${lbl}</span>
      </div>
      <div class="admin-stat-card">
        <span class="admin-stat-num">${totalCub}</span>
        <span class="admin-stat-label">Cubiertos confirmados</span>
      </div>`;

    if (!reservas.length) {
      list.innerHTML = `<div class="admin-empty">Sin reservas para este día</div>`;
      return;
    }

    list.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Horario</th>
            <th>Nombre</th>
            <th>Personas</th>
            <th>Teléfono</th>
            <th>Notas</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${reservas.map(r => `
            <tr id="row-${r.id}" ${r.estado==='cancelada'?'style="opacity:.4;"':''}>
              <td><strong>${r.horario}</strong></td>
              <td>${escHtml(r.nombre)}</td>
              <td style="text-align:center;">${r.personas}</td>
              <td><a href="tel:${r.telefono}" style="color:var(--gold);text-decoration:none;">${escHtml(r.telefono)}</a></td>
              <td style="color:var(--muted);font-size:.82rem;">${escHtml(r.notas||'—')}</td>
              <td><span class="admin-badge ${r.estado}">${r.estado}</span></td>
              <td>
                ${r.estado==='confirmada'
                  ? `<button class="admin-btn-cancel" onclick="cancelarReserva('${r.id}')">Cancelar</button>`
                  : '—'}
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    list.innerHTML = `<div class="res-error">Error cargando reservas: ${e.message}</div>`;
    console.error(e);
  }
}

async function cancelarReserva(id) {
  if (!confirm('¿Cancelar esta reserva?')) return;
  try {
    await db.collection('reservas').doc(id).update({ estado: 'cancelada' });
    loadReservas();
  } catch (e) {
    alert('Error al cancelar: ' + e.message);
  }
}

// ── Bloqueos ──────────────────────────────
async function loadBloqueos() {
  const el = document.getElementById('bloqueosList');
  el.innerHTML = `<div class="res-loading"><div class="res-spinner"></div></div>`;
  try {
    const snap = await db.collection('bloqueos').orderBy('fecha').get();
    if (snap.empty) {
      el.innerHTML = `<div class="admin-empty">No hay fechas bloqueadas</div>`;
      return;
    }
    el.innerHTML = `
      <table class="admin-table">
        <thead><tr><th>Fecha</th><th>Motivo</th><th></th></tr></thead>
        <tbody>
          ${snap.docs.map(doc => {
            const b = doc.data();
            const d = parseDate(b.fecha);
            const lbl = `${DIAS_LABEL[d.getDay()]} ${d.getDate()} de ${MESES_F[d.getMonth()]}`;
            return `<tr>
              <td><strong>${lbl}</strong></td>
              <td style="color:var(--muted);">${escHtml(b.motivo||'—')}</td>
              <td><button class="admin-btn-cancel" onclick="removeBloqueo('${doc.id}')">Quitar</button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    el.innerHTML = `<div class="res-error">${e.message}</div>`;
  }
}

async function addBloqueo() {
  const fecha  = document.getElementById('blqFecha').value;
  const motivo = document.getElementById('blqMotivo').value.trim();
  if (!fecha) { alert('Seleccioná una fecha.'); return; }
  try {
    await db.collection('bloqueos').doc(fecha).set({ fecha, motivo, creadoEn: firebase.firestore.FieldValue.serverTimestamp() });
    document.getElementById('blqFecha').value  = '';
    document.getElementById('blqMotivo').value = '';
    loadBloqueos();
  } catch (e) { alert('Error: ' + e.message); }
}

async function removeBloqueo(id) {
  if (!confirm('¿Quitar este bloqueo?')) return;
  try {
    await db.collection('bloqueos').doc(id).delete();
    loadBloqueos();
  } catch (e) { alert('Error: ' + e.message); }
}

// ── Config ────────────────────────────────
function renderConfig() {
  if (!CFG) return;

  const diasTodos   = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
  const diasLabels  = { lunes:'Lunes', martes:'Martes', miercoles:'Miércoles',
                        jueves:'Jueves', viernes:'Viernes', sabado:'Sábado', domingo:'Domingo' };

  const slotsByDay = diasTodos.map(dia => {
    const activos  = (CFG.slots && CFG.slots[dia]) || [];
    const tags     = ALL_SLOTS.map(s =>
      `<span class="slot-tag ${activos.includes(s)?'active':''}"
             data-day="${dia}" data-slot="${s}"
             onclick="toggleSlot(this)">${s}</span>`
    ).join('');
    return `
      <div style="margin-bottom:1.25rem;">
        <div style="font-size:.8rem;color:var(--muted);margin-bottom:.4rem;letter-spacing:.05em;">${diasLabels[dia]}</div>
        <div class="slots-grid">${tags}</div>
      </div>`;
  }).join('');

  const serviciosList = (CFG.servicios||['Cena']).join(', ');
  const sectoresList  = (CFG.sectores||['Salón']).join(', ');

  document.getElementById('configPanel').innerHTML = `
    <div class="config-section">
      <p class="config-section-title">General</p>

      <div class="config-row">
        <div class="config-label">
          Capacidad por horario
          <div class="config-sub">Cubiertos máximos por franja</div>
        </div>
        <input class="config-input" type="number" id="cfgCap" min="1" max="200" value="${CFG.capacidadPorSlot||20}">
      </div>

      <div class="config-row">
        <div class="config-label">
          Máximo por reserva
          <div class="config-sub">Más → redirige a WhatsApp</div>
        </div>
        <input class="config-input" type="number" id="cfgMax" min="1" max="20" value="${CFG.maxPersonas||4}">
      </div>

      <div class="config-row">
        <div class="config-label">
          Servicios disponibles
          <div class="config-sub">Separados por coma. Ej: Almuerzo, Cena</div>
        </div>
        <input class="config-input config-input-wide" type="text" id="cfgSvc" value="${serviciosList}">
      </div>

      <div class="config-row">
        <div class="config-label">
          Sectores disponibles
          <div class="config-sub">Ej: Salón, Vereda</div>
        </div>
        <input class="config-input config-input-wide" type="text" id="cfgSec" value="${sectoresList}">
      </div>
    </div>

    <div class="config-section">
      <p class="config-section-title">Días activos</p>
      <div style="display:flex;flex-wrap:wrap;gap:.5rem;">
        ${diasTodos.map(dia => {
          const checked = (CFG.diasActivos||[]).includes(dia);
          return `<label style="display:flex;align-items:center;gap:.4rem;cursor:pointer;font-size:.88rem;color:var(--cream);">
            <input type="checkbox" id="dia-${dia}" ${checked?'checked':''}>
            ${diasLabels[dia]}
          </label>`;
        }).join('')}
      </div>
    </div>

    <div class="config-section">
      <p class="config-section-title">Horarios por día</p>
      ${slotsByDay}
    </div>

    <div class="config-section">
      <p class="config-section-title">Notificaciones</p>

      <div class="config-row">
        <div class="config-label">
          Número WhatsApp (notificaciones)
          <div class="config-sub">Formato: +54911...</div>
        </div>
        <input class="config-input config-input-wide" type="text" id="cfgWaNum" value="${CFG.whatsappNotif||''}">
      </div>

      <div class="config-row">
        <div class="config-label">
          CallMeBot API Key
          <div class="config-sub">Clave para enviar WhatsApp automáticos</div>
        </div>
        <input class="config-input config-input-wide" type="text" id="cfgCMB" value="${CFG.callmebotApiKey||''}">
      </div>
    </div>

    <div class="config-section">
      <p class="config-section-title">Seguridad</p>
      <div class="config-row">
        <div class="config-label">
          Contraseña del admin
          <div class="config-sub">Dejá en blanco para no cambiar</div>
        </div>
        <input class="config-input" type="password" id="cfgPw" placeholder="Nueva contraseña">
      </div>
    </div>`;
}

function toggleSlot(el) {
  el.classList.toggle('active');
}

async function saveConfig() {
  const msg = document.getElementById('configMsg');
  msg.textContent = 'Guardando…';

  // Collect slots
  const slots = {};
  document.querySelectorAll('.slot-tag').forEach(el => {
    const day  = el.dataset.day;
    const slot = el.dataset.slot;
    if (el.classList.contains('active')) {
      if (!slots[day]) slots[day] = [];
      slots[day].push(slot);
    }
  });

  // Sort slots
  Object.keys(slots).forEach(d => slots[d].sort());

  // Dias activos
  const diasTodos  = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
  const diasActivos = diasTodos.filter(d => document.getElementById(`dia-${d}`)?.checked);

  const servicios = document.getElementById('cfgSvc').value
    .split(',').map(s => s.trim()).filter(Boolean);
  const sectores = document.getElementById('cfgSec').value
    .split(',').map(s => s.trim()).filter(Boolean);

  const updates = {
    capacidadPorSlot: parseInt(document.getElementById('cfgCap').value) || 20,
    maxPersonas:      parseInt(document.getElementById('cfgMax').value) || 4,
    servicios:        servicios.length ? servicios : ['Cena'],
    sectores:         sectores.length  ? sectores  : ['Salón'],
    diasActivos,
    slots,
    whatsappNotif:    document.getElementById('cfgWaNum').value.trim(),
    callmebotApiKey:  document.getElementById('cfgCMB').value.trim(),
  };

  const newPw = document.getElementById('cfgPw').value;
  if (newPw) updates.adminPassword = newPw;

  try {
    await db.collection('config').doc('general').update(updates);
    CFG = { ...CFG, ...updates };
    msg.textContent = '✓ Guardado correctamente';
    msg.style.color = '#25d366';
    setTimeout(() => { msg.textContent = ''; msg.style.color = ''; }, 3000);
  } catch (e) {
    msg.textContent = 'Error: ' + e.message;
    msg.style.color = 'var(--error)';
    console.error(e);
  }
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
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Init ──────────────────────────────────
checkSession();
