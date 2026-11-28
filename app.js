/* Si-Gestión – Pantallas (etapas 1, 2 y 3).
   Sin credenciales en el código: la dirección del servidor y la clave se ingresan
   en el primer uso y quedan guardadas solo en este dispositivo. */
'use strict';

// ------------------------------------------------------------ Estado y utilidades

const LS_URL = 'sg_api_url', LS_CLAVE = 'sg_clave', LS_PERFILES = 'sg_perfiles';

// Versiones conectadas en este dispositivo (la tuya, la demo…): [{ nombre, url, clave, activo }]
function leerPerfiles() {
  let l = [];
  try { l = JSON.parse(leerLS(LS_PERFILES) || '[]'); } catch (e) { l = []; }
  if (!l.length && leerLS(LS_URL)) l = [{ nombre: 'Mi versión', url: leerLS(LS_URL), clave: leerLS(LS_CLAVE), activo: true }];   // dispositivos de antes
  // Ya no se guardan claves: la clave vieja queda solo hasta crear el usuario principal de esa versión.
  if (l.length && !l.some(p => p.activo)) l[0].activo = true;
  return l;
}
function guardarPerfiles(l) {
  guardarLS(LS_PERFILES, JSON.stringify(l));
  const a = l.find(p => p.activo);
  guardarLS(LS_URL, a ? a.url : ''); guardarLS(LS_CLAVE, '');
}
const PERFILES = leerPerfiles();
const ACTIVO = PERFILES.find(p => p.activo) || {};

const S = {
  url: ACTIVO.url || '', token: ACTIVO.token || '', usuario: ACTIVO.usuario || null, cierre: ACTIVO.cierre || { activo: false, minutos: 60 },
  vista: 'inicio', param: null, modo: 'COMPLETO',
  clientes: [], proveedores: [], conceptos: [], cuentas: [], config: {}, numeradores: [],
  fComp: { VENTA: { mes: mesActual(), entidad_id: '', anulados: false }, COMPRA: { mes: mesActual(), entidad_id: '', anulados: false } },
  fTes: { mes: mesActual(), cuenta_id: '', anulados: false },
  fCli: { q: '', inactivos: false }, fPro: { q: '', inactivos: false },
  comprasTab: 'comprobantes',
  inf: { tipo: 'rentabilidad', desde: mesRel(-11), hasta: mesActual(), fecha: hoy(), todo: false }
};

// Menú: [vista, ícono, texto largo, texto corto]
const NAV = [
  ['inicio', 'home', 'Inicio', 'Inicio'], ['clientes', 'groups', 'Clientes', 'Clientes'], ['ventas', 'receipt_long', 'Ventas', 'Ventas'],
  ['cobrar', 'request_quote', 'Cuentas a cobrar', 'A cobrar'], ['compras', 'shopping_cart', 'Compras', 'Compras'],
  ['pagar', 'outbox', 'Cuentas a pagar', 'A pagar'], ['tesoreria', 'account_balance', 'Tesorería', 'Tesorería'],
  ['informes', 'bar_chart', 'Informes', 'Informes'], ['config', 'settings', 'Configuración', 'Config.']
];
const NAV_CEL = ['inicio', 'ventas', 'compras', 'tesoreria'];   // el resto va en "Más"

// Lo que cambia entre ventas y compras. Las pantallas de cuenta corriente son las mismas.
const CIR = {
  VENTA: {
    ent: 'cliente', Ent: 'Cliente', ents: () => S.clientes, pre: 'cobrar', comp: 'ventas', vSaldos: 'cobrar', vCuenta: 'cuenta', vFicha: 'cliente',
    tipos: { FAC: 'Factura interna', ND: 'Nota de débito', NC: 'Nota de crédito' }, credito: 'NC', conceptoTipo: 'INGRESO',
    Canc: 'Recibo', cancs: 'Recibos', Verbo: 'Registrar cobro', iconoCanc: 'payments',
    nuevaCanc: 'cobrar.recibo', listaCanc: 'cobrar.recibos', anularCanc: 'cobrar.anularRecibo', nroCorto: 'Fact. real', nroLargo: 'N° de factura real (opcional)',
    accionNro: 'ventas.facturaReal', cuentaTxt: 'Ingresa en', aCuenta: 'Créditos sin aplicar'
  },
  COMPRA: {
    ent: 'proveedor', Ent: 'Proveedor', ents: () => S.proveedores, pre: 'pagar', comp: 'compras', vSaldos: 'pagar', vCuenta: 'pcuenta', vFicha: 'proveedor',
    tipos: { FC: 'Factura o comprobante de compra', NDC: 'Nota de débito del proveedor', NCC: 'Nota de crédito del proveedor' }, credito: 'NCC', conceptoTipo: 'GASTO',
    Canc: 'Orden de pago', cancs: 'Pagos', Verbo: 'Registrar pago', iconoCanc: 'outbox',
    nuevaCanc: 'pagar.pago', listaCanc: 'pagar.pagos', anularCanc: 'pagar.anularPago', nroCorto: 'N° proveedor', nroLargo: 'N° del comprobante del proveedor (opcional)',
    accionNro: 'compras.nroProveedor', cuentaTxt: 'Sale de', aCuenta: 'Pagos a cuenta y créditos'
  }
};

function leerLS(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
function guardarLS(k, v) { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) { /* sin almacenamiento */ } }
function $(s) { return document.querySelector(s); }
function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function hoy() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function mesActual() { return hoy().slice(0, 7); }
function mesRel(n) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
function fecha(f) { return f ? f.slice(8, 10) + '/' + f.slice(5, 7) + '/' + f.slice(0, 4) : ''; }
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function nomMes(m) { return MESES[Number(m.slice(5, 7)) - 1] + '-' + m.slice(2, 4); }
const fmt = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function plata(n) { n = Number(n) || 0; return (n < 0 ? '-' : '') + '$ ' + fmt.format(Math.abs(n)); }
function pct(v) { return v === null || v === undefined ? '—' : String(v).replace('.', ',') + ' %'; }
function r2(n) { return Math.round(((Number(n) || 0) + Number.EPSILON) * 100) / 100; }
function ico(n) { return '<span class="material-symbols-rounded">' + n + '</span>'; }
function entidad(circ, id) { return CIR[circ].ents().find(c => c.id === id) || { id: id, nombre: '(sin nombre)' }; }
function activos(l) { return l.filter(x => x.activo !== 'NO'); }
function optEnt(circ) { return activos(CIR[circ].ents()).sort((a, b) => a.nombre.localeCompare(b.nombre)).map(c => [c.id, c.nombre]); }
function optConceptos(tipo) { return activos(S.conceptos).filter(c => (c.tipo || 'INGRESO') === tipo).map(c => [c.id, c.nombre]); }
function optCuentas() { return activos(S.cuentas).map(c => [c.id, c.nombre]); }
function rango(mes) { return mes ? { desde: mes + '-01', hasta: mes + '-31' } : {}; }
function circDe(d) { return d.c === 'COMPRA' ? 'COMPRA' : 'VENTA'; }

let nCarga = 0;
function cargando(on) { nCarga = Math.max(0, nCarga + (on ? 1 : -1)); $('#cargando').classList.toggle('hidden', nCarga === 0); }

let tToast = null;
function toast(msg, tipo) {
  if (msg === 'Se cambió de versión.') return;
  const t = $('#toast');
  t.textContent = msg; t.className = 'toast ' + (tipo || '');
  clearTimeout(tToast); tToast = setTimeout(() => t.classList.add('hidden'), tipo === 'error' ? 5500 : 3000);
}

// ------------------------------------------------------------ Velocidad: lo ya visto se muestra al instante
// Cada consulta se guarda en este dispositivo. Al volver a una pantalla se muestra lo guardado sin esperar al
// servidor y, por detrás, se pide la versión nueva: si cambió algo, la pantalla se actualiza sola.
// Al registrar o anular algo, la pantalla siguiente espera los datos frescos, y el resto se actualiza en un solo
// pedido en segundo plano. "Desconectar este dispositivo" borra todo lo guardado.

const LECTURAS = new Set(['inicio', 'clientes.listar', 'abonos.listar', 'ventas.listar', 'cobrar.saldos', 'cobrar.pendientes', 'cobrar.recibos',
  'cobrar.estadoCuenta', 'proveedores.listar', 'compras.listar', 'pagar.saldos', 'pagar.pendientes', 'pagar.pagos', 'pagar.estadoCuenta',
  'tesoreria.saldos', 'tesoreria.movimientos', 'tesoreria.paraRetirar', 'informes.rentabilidad', 'informes.conceptos', 'informes.saldos',
  'informes.retiros', 'informes.iva', 'config.leer', 'gastos.estado', 'respaldo.estado', 'maestra.estado', 'maestra.apps']);
const SIN_CAMBIOS = new Set(['clave.estado', 'usuarios.yo', 'acceso.salir', 'acceso.estado', 'acceso.entrar', 'acceso.recuperar', 'acceso.restablecer', 'acceso.crearPrincipal', 'cobrar.estadoCuentaPdf', 'pagar.estadoCuentaPdf', 'informes.pdf', 'lote']);   // consultas que no se guardan
const NO_PRECARGAR = new Set(['gastos.estado']);   // consulta la app de gastos: solo cuando se abre Configuración
const LS_CACHE = 'sg_cache2', FRESCO_MS = 20000, MAX_GUARDADOS = 80;   // "2": descarta lo guardado por versiones anteriores de la app
const CACHE = {}, EN_CURSO = {};
let cacheUrl = '', tCache = null;   // a qué versión pertenece lo que hay en CACHE
cambiarCache(ACTIVO.url);

/** Cada versión guarda lo suyo aparte: al cambiar de versión nunca se mezclan los datos. */
function claveCache(url) { let h = 0; for (const ch of String(url || '')) h = (h * 31 + ch.charCodeAt(0)) | 0; return LS_CACHE + '_' + (h >>> 0).toString(36); }
function cambiarCache(url) {
  if (tCache) { clearTimeout(tCache); tCache = null; escribirCache(); }   // termina de guardar lo de la versión anterior, en su lugar
  Object.keys(CACHE).forEach(k => delete CACHE[k]);
  cacheUrl = url || '';
  try {
    Object.keys(localStorage).filter(k => k === 'sg_cache' || k.indexOf('sg_cache_') === 0).forEach(k => localStorage.removeItem(k));   // formatos anteriores
    const o = JSON.parse(localStorage.getItem(claveCache(url)) || '{}');
    if (o.u === url && o.e) Object.assign(CACHE, o.e);
  } catch (e) { /* sin almacenamiento */ }
}
function escribirCache() {
  if (!cacheUrl) return;
  const ks = Object.keys(CACHE).sort((a, b) => CACHE[b].t - CACHE[a].t);
  ks.slice(MAX_GUARDADOS).forEach(k => delete CACHE[k]);
  try { localStorage.setItem(claveCache(cacheUrl), JSON.stringify({ u: cacheUrl, e: CACHE })); } catch (e) { try { localStorage.removeItem(claveCache(cacheUrl)); } catch (x) { /* sin almacenamiento */ } }
}
function guardarCache() {
  clearTimeout(tCache);
  tCache = setTimeout(() => { tCache = null; escribirCache(); }, 400);
}
function vaciarCache() { clearTimeout(tCache); tCache = null; Object.keys(CACHE).forEach(k => delete CACHE[k]); try { localStorage.removeItem(claveCache(cacheUrl)); } catch (e) { /* sin almacenamiento */ } }

/** Una respuesta que llega después de cambiar de versión se descarta: nunca se mezcla con la versión nueva. */
function cancelada() { const e = new Error('Se cambió de versión.'); e.cancelado = true; return e; }
function copia(d) { return d === undefined ? d : JSON.parse(JSON.stringify(d)); }
function clave(accion, datos) { return accion + '|' + JSON.stringify(datos || {}); }

/** Pide al servidor una consulta (si ya está en camino, espera esa misma) y la guarda. Devuelve si cambió. */
function pedir(k, accion, datos, opt) {
  const url = S.url, ke = url + '|' + k;   // lo que está en camino también se separa por versión
  if (EN_CURSO[ke]) return EN_CURSO[ke];
  return (EN_CURSO[ke] = apiRed(accion, datos, opt).then(d => {
    if (S.url !== url || cacheUrl !== url) throw cancelada();
    const antes = CACHE[k] ? JSON.stringify(CACHE[k].d) : null;
    CACHE[k] = { t: Date.now(), d: d, a: accion, x: datos || {} };
    guardarCache();
    return { d: d, cambio: antes !== JSON.stringify(d) };
  }).finally(() => { delete EN_CURSO[ke]; }));
}

/** Repinta la pantalla actual con lo guardado (sin volver al principio), si el usuario no está escribiendo. */
let tRepintar = null;
function repintar() {
  clearTimeout(tRepintar);
  tRepintar = setTimeout(() => {
    const a = document.activeElement;
    if (!$('#modal').classList.contains('hidden') || (a && a.closest && a.closest('#main') && /INPUT|SELECT|TEXTAREA/.test(a.tagName))) return;
    ir(S.vista, S.param, true);
  }, 150);
}

const SESION_CAIDA = /Sesión vencida|Actualizá la app|no se creó el usuario principal/;
async function api(accion, datos, opt) {
  opt = opt || {};
  try { return await api2(accion, datos, opt); } catch (e) {
    if (!opt.publico && SESION_CAIDA.test(e.message)) sesionCerrada(e.message);
    throw e;
  }
}
async function api2(accion, datos, opt) {
  const url = S.url;
  if (!LECTURAS.has(accion) || opt.url || opt.publico) {
    const escribe = !LECTURAS.has(accion) && !SIN_CAMBIOS.has(accion);
    try {
      const r = await apiRed(accion, datos, opt);
      if (escribe) despuesDeCambiar();
      if (!escribe && !opt.url && !opt.publico && S.url !== url) throw cancelada();
      return r;
    } catch (e) {
      if (escribe) despuesDeCambiar();   // aunque no llegue la respuesta, el servidor pudo haberlo hecho: no mostrar datos viejos
      throw e;
    }
  }
  const k = clave(accion, datos), c = CACHE[k];
  if (c && !opt.red && !S.forzar) {
    if (c.sucio || Date.now() - c.t > FRESCO_MS) {
      const vista = S.vista, param = S.param;
      pedir(k, accion, datos, { silencioso: true }).then(r => { if (r.cambio && S.url === url && S.vista === vista && S.param === param) repintar(); }).catch(() => { /* se ve lo guardado */ });
    }
    return copia(c.d);
  }
  const r = await pedir(k, accion, datos, opt);
  if (S.url !== url) throw cancelada();
  return copia(r.d);
}

/** Después de registrar o anular algo: todo lo guardado queda viejo y la pantalla siguiente espera datos frescos. */
function despuesDeCambiar() {
  Object.keys(CACHE).forEach(k => { CACHE[k].sucio = true; });
  S.forzar = true; S.precargar = true;
}

/** Actualiza en un solo pedido todas las consultas guardadas que estén viejas. */
let precargando = false;
async function precargar() {
  if (precargando) return;
  const ks = Object.keys(CACHE).filter(k => !EN_CURSO[k] && !NO_PRECARGAR.has(CACHE[k].a) && (CACHE[k].sucio || Date.now() - CACHE[k].t > FRESCO_MS))
    .sort((a, b) => CACHE[b].t - CACHE[a].t).slice(0, 40);
  if (!ks.length) return;
  precargando = true;
  const url = S.url, pedidos = ks.map(k => ({ accion: CACHE[k].a, datos: CACHE[k].x }));
  try {
    const r = await apiRed('lote', { pedidos: pedidos }, { silencioso: true });
    if (S.url !== url || cacheUrl !== url) return;   // se cambió de versión mientras tanto: se descarta
    let cambio = false;
    ks.forEach((k, i) => {
      if (!r[i] || !r[i].ok) return;
      if (!CACHE[k] || JSON.stringify(CACHE[k].d) !== JSON.stringify(r[i].datos)) cambio = true;
      CACHE[k] = { t: Date.now(), d: r[i].datos, a: pedidos[i].accion, x: pedidos[i].datos };
    });
    guardarCache();
    if (cambio) repintar();
  } catch (e) { /* sin conexión: se usa lo guardado */ } finally { precargando = false; }
}

async function apiRed(accion, datos, opt) {
  opt = opt || {};
  if (!opt.silencioso) cargando(true);
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), opt.espera || 45000);
  try {
    const r = await fetch(opt.url || S.url, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },   // text/plain evita el preflight con Apps Script
      body: JSON.stringify(Object.assign({ accion: accion, datos: datos || {} }, opt.publico ? {} : { token: S.token })),
      signal: ctl.signal
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || 'Error del servidor.');
    return j.datos;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('El servidor tardó demasiado en responder.');
    if (e instanceof TypeError || e instanceof SyntaxError) throw new Error('No se pudo conectar con el servidor. Revisá la dirección y la conexión.');
    throw e;
  } finally {
    clearTimeout(t);
    if (!opt.silencioso) cargando(false);
  }
}

function descargar(blob, nombre) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

async function descargarPdf(accion, datos) {
  const p = await api(accion, datos);
  const bin = atob(p.base64), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  descargar(new Blob([bytes], { type: p.mime }), p.nombre);
}

// ------------------------------------------------------------ Componentes

function tabla(cols, filas, pie) {
  if (!filas.length) return '<p class="vacio">Sin datos para mostrar.</p>';
  const cl = c => (c.c ? ' class="' + c.c + '"' : '');
  return '<div class="tabla-wrap"><table><thead><tr>' + cols.map(c => '<th' + cl(c) + '>' + c.t + '</th>').join('') + '</tr></thead><tbody>' +
    filas.map(f => '<tr' + (f.attr ? ' ' + f.attr : '') + '>' + f.c.map((v, i) => '<td' + cl(cols[i]) + '>' + v + '</td>').join('') + '</tr>').join('') +
    '</tbody>' + (pie ? '<tfoot><tr>' + pie.map((v, i) => '<td' + cl(cols[i]) + '>' + v + '</td>').join('') + '</tr></tfoot>' : '') + '</table></div>';
}

function kpi(icono, titulo, valor, clase) {
  return '<div class="kpi ' + (clase || '') + '"><div class="kpi-icon">' + ico(icono) + '</div><div><small>' + titulo + '</small><b>' + valor + '</b></div></div>';
}

function campoHtml(c) {
  const id = 'f-' + c.n, v = c.valor === undefined || c.valor === null ? '' : c.valor;
  const req = c.req ? ' required' : '';
  let ctl;
  if (c.tipo === 'check') {
    return '<div class="campo" id="c-' + c.n + '"' + (c.oculto ? ' style="display:none"' : '') + '><label class="check-linea"><input type="checkbox" id="' + id + '"' + (c.valor ? ' checked' : '') + '> ' + c.label + '</label>' + (c.ayuda ? '<small>' + c.ayuda + '</small>' : '') + '</div>';
  }
  if (c.tipo === 'select') {
    ctl = '<select id="' + id + '"' + req + '>' + (c.opciones || []).map(o => '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(v) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
  } else if (c.tipo === 'textarea') {
    ctl = '<textarea id="' + id + '"' + req + '>' + esc(v) + '</textarea>';
  } else {
    ctl = '<input id="' + id + '" type="' + (c.tipo || 'text') + '" value="' + esc(v) + '"' + req +
      (c.tipo === 'number' ? ' step="' + (c.step || '0.01') + '" min="' + (c.min === undefined ? '0' : c.min) + '" inputmode="decimal"' : '') +
      (c.max !== undefined ? ' max="' + c.max + '"' : '') + (c.ph ? ' placeholder="' + esc(c.ph) + '"' : '') + ' autocomplete="off">';
  }
  return '<div class="campo" id="c-' + c.n + '"><label for="' + id + '">' + c.label + '</label>' + ctl + (c.ayuda ? '<small>' + c.ayuda + '</small>' : '') + '</div>';
}

function valores(campos) {
  const v = {};
  campos.forEach(c => {
    const el = $('#f-' + c.n);
    v[c.n] = c.tipo === 'check' ? el.checked : c.tipo === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value.trim();
  });
  return v;
}

function abrirModal(html, ancho) {
  $('#modal-box').className = 'modal-box' + (ancho ? ' ancho' : '');
  $('#modal-box').innerHTML = html;
  $('#modal').classList.remove('hidden');
}
function cerrarModal() { $('#modal').classList.add('hidden'); $('#modal-box').innerHTML = ''; }

/** Formulario genérico en modal. ok(valores) hace la llamada; si falla, el modal queda abierto. */
function abrirForm(o) {
  abrirModal('<h2>' + esc(o.titulo) + '</h2>' + (o.nota ? '<p class="muted small" style="margin-bottom:12px">' + o.nota + '</p>' : '') +
    '<form id="form" class="form">' + o.campos.map(campoHtml).join('') + '<div id="f-extra"></div>' +
    '<div class="modal-pie"><button type="button" class="btn" data-act="cerrar">Cancelar</button>' +
    '<button type="submit" class="btn ' + (o.peligro ? 'btn-danger' : 'btn-primary') + '">' + esc(o.textoOk || 'Guardar') + '</button></div></form>');
  $('#form').addEventListener('submit', async e => {
    e.preventDefault();
    try { await o.ok(valores(o.campos)); } catch (err) { toast(err.message, 'error'); return; }
    cerrarModal();
    if (o.despues !== false) recargar();
  });
  const primero = $('#form input, #form select');
  if (primero && window.innerWidth > 860) primero.focus();
}

function boton(act, texto, icono, extra, clase) {
  return '<button class="btn ' + (clase || '') + '" data-act="' + act + '"' + (extra || '') + '>' + (icono ? ico(icono) : '') + esc(texto) + '</button>';
}
function icoBtn(act, icono, titulo, extra, clase) {
  return '<button class="ico ' + (clase || '') + '" title="' + esc(titulo) + '" aria-label="' + esc(titulo) + '" data-act="' + act + '"' + (extra || '') + '>' + ico(icono) + '</button>';
}
function selectHtml(id, opciones, valor, chg, vacio, extra) {
  return '<select id="' + id + '"' + (chg ? ' data-chg="' + chg + '"' : '') + (extra || '') + '>' + (vacio ? '<option value="">' + vacio + '</option>' : '') +
    opciones.map(o => '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(valor) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
}

// ------------------------------------------------------------ Navegación

const TITULOS = {
  inicio: 'Inicio', clientes: 'Clientes', cliente: 'Ficha del cliente', ventas: 'Ventas', cobrar: 'Cuentas a cobrar', cuenta: 'Cuenta corriente',
  compras: 'Compras', proveedor: 'Ficha del proveedor', pagar: 'Cuentas a pagar', pcuenta: 'Cuenta corriente', tesoreria: 'Tesorería',
  informes: 'Informes', config: 'Configuración'
};
const PADRE = { cliente: 'clientes', cuenta: 'cobrar', proveedor: 'compras', pcuenta: 'pagar' };

// ------------------------------------------------------------ Usuarios y permisos
function puede(p) { return !S.usuario || S.usuario.rol === 'PRINCIPAL' || (S.usuario.permisos || []).indexOf(p) >= 0; }
function esPrincipal() { return !S.usuario || S.usuario.rol === 'PRINCIPAL'; }
const NAV_PERMISO = { cobrar: ['ventas', 'informes'], pagar: ['compras', 'informes'], tesoreria: ['tesoreria', 'informes'], informes: ['informes'] };
function navVisible(v) { return !NAV_PERMISO[v] || NAV_PERMISO[v].some(puede); }

/** Saca de la pantalla los botones que este usuario no puede usar (el servidor igual los rechaza). */
function permisoBoton(act, c) {
  const porCirc = c === 'COMPRA' ? 'compras' : 'ventas';
  if (/Anular$/.test(act)) return ['anular'];
  if (['compNuevo', 'cancNueva', 'entNuevo', 'entEditar', 'credAplicar', 'compNro'].indexOf(act) >= 0) return [porCirc];
  if (['aboNuevo', 'venAbonos'].indexOf(act) >= 0) return ['ventas'];
  if (['movNuevo', 'trfNueva', 'retNuevo'].indexOf(act) >= 0) return ['tesoreria'];
  if (['infExcel', 'infPdf'].indexOf(act) >= 0) return ['informes'];
  if (['cuenta', 'pdf', 'estado'].indexOf(act) >= 0) return [porCirc, 'informes'];
  if (['maestraSync', 'respaldoHacer', 'gastosReintentar'].indexOf(act) >= 0) return ['config'];
  return null;
}
function filtrarPermisos(raiz) {
  if (esPrincipal() || !raiz) return;
  raiz.querySelectorAll('[data-act]').forEach(el => {
    const need = permisoBoton(el.dataset.act, el.dataset.c);
    if (!need || need.some(puede)) return;
    if (el.classList.contains('link')) el.replaceWith(document.createTextNode(el.textContent)); else el.remove();
  });
}

function pintarNav() {
  const btn = (n, corto) => '<button class="nav-btn" data-act="nav" data-v="' + n[0] + '">' + ico(n[1]) + '<span class="t">' + (corto ? n[3] : n[2]) + '</span></button>';
  $('#nav-side').innerHTML = NAV.filter(n => navVisible(n[0])).map(n => btn(n)).join('');
  $('#nav-bottom').innerHTML = NAV.filter(n => NAV_CEL.indexOf(n[0]) >= 0 && navVisible(n[0])).map(n => btn(n, true)).join('') +
    '<button class="nav-btn" data-act="mas" data-v="mas">' + ico('menu') + '<span class="t">Más</span></button>';
}

async function ir(vista, param, suave) {
  S.vista = vista; S.param = param === undefined ? null : param;
  const marca = PADRE[vista] || vista;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.v === marca || (b.dataset.v === 'mas' && NAV_CEL.indexOf(marca) < 0)));
  $('#titulo').textContent = TITULOS[vista];
  if (!suave) $('#acciones').innerHTML = '';
  const y = window.scrollY;
  try {
    await cargarMaestros();   // clientes, proveedores y configuración: al instante desde lo guardado
    if (!navVisible(PADRE[vista] || vista)) { vista = S.vista = 'inicio'; $('#titulo').textContent = TITULOS.inicio; }
    await VISTAS[vista](S.param);
    filtrarPermisos($('#main')); filtrarPermisos($('#acciones'));
    S.forzar = false;
  } catch (e) {
    if (e.cancelado) return;   // se cambió de versión mientras cargaba: la pantalla nueva ya se está dibujando
    if (/Clave incorrecta|no se definió la clave/.test(e.message)) { toast(e.message, 'error'); return mostrarSetup(); }
    $('#main').innerHTML = '<div class="card"><p class="vacio">' + esc(e.message) + '</p><p style="text-align:center">' + boton('recargar', 'Reintentar', 'refresh') + '</p></div>';
  }
  window.scrollTo(0, suave ? y : 0);
  if (S.precargar) { S.precargar = false; setTimeout(precargar, 300); }
}
function recargar() { return ir(S.vista, S.param); }

async function cargarMaestros() {
  const r = await Promise.all([api('config.leer'), api('clientes.listar'), api('proveedores.listar')]);
  S.config = r[0].config; S.conceptos = r[0].conceptos; S.cuentas = r[0].cuentas; S.numeradores = r[0].numeradores;
  S.clientes = r[1]; S.proveedores = r[2];
  S.modo = r[0].modo || 'COMPLETO'; S.version = r[0].version || '';
  $('#empresa').textContent = (S.config.empresa || 'Si-Gestión') + (PERFILES.length > 1 ? ' ▾' : '');
  document.body.classList.toggle('modo-demo', S.modo === 'DEMO');
  const tc = document.querySelector('meta[name=theme-color]');
  if (tc) tc.setAttribute('content', S.modo === 'DEMO' ? '#F3F2FA' : '#FAF7F0');
  const b = $('#banda-demo');
  if (b) b.classList.toggle('hidden', S.modo !== 'DEMO');
  const a = PERFILES.find(p => p.activo);
  if (a && a.url === S.url && S.config.empresa && a.nombre !== S.config.empresa) { a.nombre = S.config.empresa; guardarPerfiles(PERFILES); }
}

/** Cambiar a otra versión conectada en este dispositivo. */
async function usarPerfil(i) {
  PERFILES.forEach((p, j) => { p.activo = j === i; });
  guardarPerfiles(PERFILES);
  const p = PERFILES[i];
  S.url = p.url; S.token = p.token || ''; S.usuario = p.usuario || null; S.cierre = p.cierre || { activo: false, minutos: 60 };
  cambiarCache(S.url);
  cerrarModal();
  if (!S.token || vencidaPorInactividad()) return mostrarAcceso(S.token ? 'Se cerró la sesión por inactividad.' : '');
  try { await cargarMaestros(); } catch (e) { toast(e.message, 'error'); if (SESION_CAIDA.test(e.message)) return; }
  pintarNav();
  await ir('inicio');
  refrescarUsuario();
  setTimeout(precargar, 500);
}

function elegirPerfil() {
  if (PERFILES.length < 2) return;
  abrirModal('<h2>¿Qué versión querés usar?</h2><div class="eleccion">' +
    PERFILES.map((p, i) => '<button type="button" class="opcion" data-act="perfilUsar" data-i="' + i + '">' + ico(p.activo ? 'radio_button_checked' : 'radio_button_unchecked') +
      '<b>' + esc(p.nombre || 'Versión ' + (i + 1)) + '</b><span>' + (p.activo ? 'En uso' : 'Tocá para cambiar') + '</span></button>').join('') +
    '</div><div class="modal-pie"><button type="button" class="btn" data-act="cerrar">Cerrar</button></div>');
}

// ------------------------------------------------------------ Vistas

const VISTAS = {};

VISTAS.inicio = async function () {
  const d = await api('inicio');
  const h = hoy();
  $('#main').innerHTML = (d.sin_saldos ? '' :
    '<div class="kpi-grid">' +
    kpi('account_balance_wallet', 'Tesorería', plata(d.total_tesoreria)) +
    kpi('request_quote', 'A cobrar', plata(d.a_cobrar), d.avisos.length ? 'warn' : '') +
    kpi('outbox', 'A pagar', plata(d.a_pagar), d.pagos.some(p => p.vencimiento < h) ? 'warn' : '') +
    kpi(d.resultado_mes < 0 ? 'trending_down' : 'trending_up', 'Resultado del mes', plata(d.resultado_mes), d.resultado_mes < 0 ? 'bad' : 'ok') +
    kpi('receipt_long', 'Ventas del mes', plata(d.ventas_mes)) +
    kpi('shopping_cart', 'Gastos del mes', plata(d.gastos_mes)) +
    kpi('payments', 'Cobrado en el mes', plata(d.cobrado_mes)) +
    kpi('outbox', 'Pagado en el mes', plata(d.pagado_mes)) +
    (d.sin_retirar === undefined || (d.modo && d.modo !== 'COMPLETO') ? '' : kpi('savings', 'Sin retirar (acumulado)', plata(d.sin_retirar))) +
    '</div>') + '<div class="dos">' +
    '<section class="card"><h2>Clientes sin cobro pasada la fecha límite <span class="chip ' + (d.avisos.length ? 'rojo' : 'verde') + '">' + d.avisos.length + '</span></h2>' +
    (d.avisos.length ? tabla([{ t: 'Cliente' }, { t: 'Venció', c: 'hm' }, { t: 'Días', c: 'num' }, { t: 'Pendiente', c: 'num' }, { t: '' }],
      d.avisos.map(a => ({ c: ['<button class="link" data-act="cuenta" data-c="VENTA" data-id="' + a.entidad_id + '">' + esc(a.entidad) + '</button><br><span class="muted small">' + esc(a.id) + '</span>',
        fecha(a.vencimiento), a.dias, plata(a.pendiente), boton('cancNueva', 'Cobrar', '', ' data-c="VENTA" data-id="' + a.entidad_id + '"', 'btn-sm')] })))
      : '<p class="vacio">Todo al día.</p>') + '</section>' +
    '<section class="card"><h2>Pagos a proveedores: vencidos y próximos 7 días <span class="chip ' + (d.pagos.length ? 'ambar' : 'verde') + '">' + d.pagos.length + '</span></h2>' +
    (d.pagos.length ? tabla([{ t: 'Proveedor' }, { t: 'Vence' }, { t: 'Pendiente', c: 'num' }, { t: '' }],
      d.pagos.map(p => ({ c: ['<button class="link" data-act="cuenta" data-c="COMPRA" data-id="' + p.entidad_id + '">' + esc(p.entidad) + '</button><br><span class="muted small">' + esc(p.id) + (p.nro_factura_real ? ' · ' + esc(p.nro_factura_real) : '') + '</span>',
        fecha(p.vencimiento) + (p.vencimiento < h ? ' <span class="chip rojo">Vencido</span>' : p.vencimiento === h ? ' <span class="chip ambar">Hoy</span>' : ''),
        plata(p.pendiente), boton('cancNueva', 'Pagar', '', ' data-c="COMPRA" data-id="' + p.entidad_id + '"', 'btn-sm')] })))
      : '<p class="vacio">Nada por pagar en los próximos días.</p>') + '</section></div>' +
    (d.maestra_error ? '<section class="card aviso"><h2>No se pudo actualizar la planilla MAESTRA ' + boton('maestraSync', 'Reintentar', 'sync', '', 'btn-sm') + '</h2>' +
      '<p class="small">' + esc(d.maestra_error) + '</p></section>' : '') +
    (d.respaldo && d.respaldo.error ? '<section class="card aviso"><h2>La copia de seguridad semanal no se pudo hacer ' + boton('respaldoHacer', 'Reintentar', 'sync', '', 'btn-sm') + '</h2>' +
      '<p class="small">' + esc(d.respaldo.error) + '</p><p class="muted small">Si dice que falta permiso, ejecutá una vez <b>respaldarAhora</b> desde el editor de Apps Script.</p></section>' : '') +
    (d.gastos_pendientes && d.gastos_pendientes.length ? '<section class="card aviso"><h2>Retiros sin resolver con tu app de gastos <span class="chip ambar">' + d.gastos_pendientes.length + '</span> ' +
      boton('gastosReintentar', 'Reintentar', 'sync', '', 'btn-sm') + '</h2>' +
      tabla([{ t: 'Fecha' }, { t: 'Retiro' }, { t: 'Importe', c: 'num' }, { t: 'Qué pasa', c: 'hm' }],
        d.gastos_pendientes.map(g => ({ c: [fecha(g.fecha), esc(g.detalle) + (g.accion === 'borrar' ? ' <span class="chip rojo">Anulado</span>' : ''), plata(g.importe),
          '<span class="muted small">' + esc(g.error || (g.accion === 'borrar' ? 'Falta borrarlo en tu app de gastos' : 'Falta enviarlo')) + '</span>'] }))) +
      '<p class="muted small" style="margin-top:8px">Se reintenta solo todos los días a las 7.</p></section>' : '') +
    '<section class="card"><h2>Saldos de tesorería</h2>' +
    (d.cuentas.length ? d.cuentas.map(c => '<div class="fila"><span>' + esc(c.nombre) + ' <span class="chip">' + esc(c.tipo) + '</span></span><b class="num ' + (c.saldo < 0 ? 'neg' : '') + '">' + plata(c.saldo) + '</b></div>').join('')
      : '<p class="vacio">Todavía no hay cuentas. Crealas en Configuración.</p>') + '</section>';
};

// ---------- Clientes y proveedores

function listaEntidades(circ, f, lista) {
  const q = f.q.toLowerCase();
  return lista.filter(c => (f.inactivos || c.activo !== 'NO') && (!q || (c.nombre + ' ' + c.cuit).toLowerCase().includes(q))).sort((a, b) => a.nombre.localeCompare(b.nombre));
}
function tablaEntidades(circ, lista) {
  const venta = circ === 'VENTA';
  return tabla([{ t: CIR[circ].Ent }, { t: 'CUIT', c: 'hm' }, { t: 'Email', c: 'hm' }].concat(venta ? [{ t: 'Día límite', c: 'num' }] : [{ t: 'Contacto', c: 'hm' }]).concat([{ t: '' }]),
    lista.map(c => ({ attr: 'class="click" data-act="entVer" data-c="' + circ + '" data-id="' + c.id + '"', c: [
      '<b>' + esc(c.nombre) + '</b>' + (c.activo === 'NO' ? ' <span class="chip">Inactivo</span>' : ''), esc(c.cuit), esc(c.email),
      venta ? (c.dia_limite || '<span class="muted">' + esc(S.config.dia_limite_default || 10) + '</span>') : esc(c.contacto), ico('chevron_right')] })));
}
function buscadorEntidades(circ, f) {
  return '<div class="filtros" style="margin-bottom:12px"><div class="campo"><label for="q">Buscar</label><input id="q" type="search" value="' + esc(f.q) +
    '" placeholder="Nombre o CUIT" data-inp="entBuscar" data-c="' + circ + '"></div>' +
    '<label class="check"><input type="checkbox" data-chg="entInactivos" data-c="' + circ + '"' + (f.inactivos ? ' checked' : '') + '> Ver inactivos</label></div>';
}

VISTAS.clientes = async function () {
  $('#acciones').innerHTML = boton('entNuevo', 'Nuevo cliente', 'person_add', ' data-c="VENTA"', 'btn-primary');
  $('#main').innerHTML = '<section class="card">' + buscadorEntidades('VENTA', S.fCli) + '<div id="ent-lista">' + tablaEntidades('VENTA', listaEntidades('VENTA', S.fCli, S.clientes)) + '</div></section>';
};

function datosEntidad(circ, c) {
  const l = [['Código', c.id], ['CUIT', c.cuit], ['Condición IVA', c.cond_iva], ['Contacto', c.contacto], ['Email', c.email], ['Teléfono', c.telefono]];
  if (circ === 'VENTA') l.push(['Día límite de cobro', c.dia_limite || (S.config.dia_limite_default || 10) + ' (general)']);
  l.push(['Estado', c.activo === 'NO' ? 'Inactivo' : 'Activo'], ['Notas', c.notas]);
  return '<section class="card"><h2>Datos ' + boton('entEditar', 'Editar', 'edit', ' data-c="' + circ + '" data-id="' + c.id + '"', 'btn-sm') + '</h2><div class="datos">' +
    l.map(x => '<div><small>' + x[0] + '</small>' + (esc(x[1]) || '—') + '</div>').join('') + '</div></section>';
}

VISTAS.cliente = async function (id) {
  const c = entidad('VENTA', id);
  const abonos = await api('abonos.listar', { cliente_id: id });
  $('#titulo').textContent = c.nombre;
  $('#acciones').innerHTML = boton('nav', 'Volver', 'arrow_back', ' data-v="clientes"') + boton('cuenta', 'Cuenta corriente', 'request_quote', ' data-c="VENTA" data-id="' + id + '"') +
    boton('compNuevo', 'Comprobante', 'add', ' data-c="VENTA" data-id="' + id + '"', 'btn-primary');
  const h = hoy(), vigente = {};
  abonos.filter(a => a.estado !== 'ANULADO' && a.vigencia_desde <= h).forEach(a => {
    const v = vigente[a.concepto_id];
    if (!v || a.vigencia_desde > v.vigencia_desde || (a.vigencia_desde === v.vigencia_desde && a.id > v.id)) vigente[a.concepto_id] = a;
  });
  function estado(a) {
    if (a.estado === 'ANULADO') return '<span class="chip">Anulado</span>';
    if (a.vigencia_desde > h) return '<span class="chip ambar">Programado</span>';
    if (vigente[a.concepto_id] === a) return Number(a.importe) > 0 ? '<span class="chip verde">Vigente</span>' : '<span class="chip rojo">Baja</span>';
    return '<span class="chip">Histórico</span>';
  }
  abonos.sort((a, b) => (a.vigencia_desde < b.vigencia_desde ? 1 : -1));
  $('#main').innerHTML = datosEntidad('VENTA', c) +
    '<section class="card"><h2>Abono mensual ' + boton('aboNuevo', 'Nuevo abono o aumento', 'add', ' data-id="' + id + '"', 'btn-sm') + '</h2>' +
    tabla([{ t: 'Vigente desde' }, { t: 'Concepto', c: 'hm' }, { t: 'Importe', c: 'num' }, { t: 'Estado' }, { t: '' }],
      abonos.map(a => ({ attr: a.estado === 'ANULADO' ? 'class="anulado"' : '', c: [fecha(a.vigencia_desde), esc(a.concepto) + (a.detalle ? '<br><span class="muted small">' + esc(a.detalle) + '</span>' : ''),
        plata(a.importe), estado(a), a.estado === 'ANULADO' ? '' : icoBtn('aboAnular', 'block', 'Anular abono', ' data-id="' + a.id + '"', 'rojo')] }))) +
    '<p class="muted small" style="margin-top:10px">Un aumento se carga como abono nuevo con su fecha de vigencia. Para dar de baja el abono, cargá uno con importe 0.</p></section>';
};

VISTAS.proveedor = async function (id) {
  const c = entidad('COMPRA', id);
  $('#titulo').textContent = c.nombre;
  $('#acciones').innerHTML = boton('nav', 'Volver', 'arrow_back', ' data-v="compras"') + boton('cuenta', 'Cuenta corriente', 'outbox', ' data-c="COMPRA" data-id="' + id + '"') +
    boton('compNuevo', 'Comprobante', 'add', ' data-c="COMPRA" data-id="' + id + '"', 'btn-primary');
  const ult = await api('compras.listar', { proveedor_id: id });
  $('#main').innerHTML = datosEntidad('COMPRA', c) + '<section class="card"><h2>Últimos comprobantes</h2>' + tablaComprobantes('COMPRA', ult.slice(0, 10), false) + '</section>';
};

// ---------- Comprobantes (ventas y compras)

function tablaComprobantes(circ, lista, conPie) {
  const C = CIR[circ];
  let total = 0, pend = 0;
  lista.forEach(c => { if (c.estado !== 'ANULADO') { total += (c.tipo === C.credito ? -1 : 1) * Number(c.importe); if (c.tipo !== C.credito) pend += c.pendiente; } });
  return tabla([{ t: 'Fecha' }, { t: 'Comprobante' }, { t: C.Ent }, { t: 'Detalle', c: 'hm' }, { t: 'Importe', c: 'num' }, { t: 'Pendiente', c: 'num hm' }, { t: C.nroCorto, c: 'hm' }, { t: '' }],
    lista.map(c => ({ attr: c.estado === 'ANULADO' ? 'class="anulado"' : '', c: [
      fecha(c.fecha), '<span class="chip ' + (c.tipo === C.credito ? 'ambar' : 'azul') + '">' + esc(c.id) + '</span>', esc(c.entidad),
      esc(c.detalle || c.concepto), (c.tipo === C.credito ? '-' : '') + plata(c.importe),
      c.estado === 'ANULADO' ? '<span class="chip">Anulado</span>' : (c.pendiente > 0 ? plata(c.pendiente) : '<span class="chip verde">' + (c.tipo === C.credito ? 'Aplicada' : circ === 'VENTA' ? 'Cobrado' : 'Pagado') + '</span>'),
      esc(c.nro_factura_real),
      c.estado === 'ANULADO' ? '' : icoBtn('compNro', 'edit_note', 'Anotar ' + C.nroCorto, ' data-c="' + circ + '" data-id="' + c.id + '" data-v="' + esc(c.nro_factura_real) + '"') +
        icoBtn('compAnular', 'block', 'Anular', ' data-c="' + circ + '" data-id="' + c.id + '"', 'rojo')] })),
    conPie ? ['', '', 'Total', '', plata(total), plata(pend), '', ''] : null);
}

async function vistaComprobantes(circ) {
  const C = CIR[circ], f = S.fComp[circ], dc = ' data-c="' + circ + '"';
  const lista = await api(C.comp + '.listar', Object.assign({ entidad_id: f.entidad_id, con_anulados: f.anulados }, rango(f.mes)));
  return '<section class="card"><div class="filtros" style="margin-bottom:12px">' +
    '<div class="campo"><label for="fc-mes">Mes</label><input id="fc-mes" type="month" value="' + f.mes + '" data-chg="compFiltro"' + dc + '></div>' +
    '<div class="campo"><label for="fc-ent">' + C.Ent + '</label>' + selectHtml('fc-ent', optEnt(circ), f.entidad_id, 'compFiltro', 'Todos', dc) + '</div>' +
    '<label class="check"><input id="fc-anu" type="checkbox" data-chg="compFiltro"' + dc + (f.anulados ? ' checked' : '') + '> Ver anulados</label></div>' +
    tablaComprobantes(circ, lista, true) + '</section>';
}

VISTAS.ventas = async function () {
  $('#acciones').innerHTML = boton('venAbonos', 'Generar abonos', 'event_repeat') + boton('compNuevo', 'Nuevo comprobante', 'add', ' data-c="VENTA"', 'btn-primary');
  $('#main').innerHTML = await vistaComprobantes('VENTA');
};

VISTAS.compras = async function () {
  const tab = S.comprasTab;
  const seg = '<div class="seg">' + [['comprobantes', 'Comprobantes'], ['proveedores', 'Proveedores']].map(t =>
    '<button class="' + (t[0] === tab ? 'on' : '') + '" data-act="comprasTab" data-v="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>';
  if (tab === 'proveedores') {
    $('#acciones').innerHTML = boton('entNuevo', 'Nuevo proveedor', 'add_business', ' data-c="COMPRA"', 'btn-primary');
    $('#main').innerHTML = seg + '<section class="card">' + buscadorEntidades('COMPRA', S.fPro) + '<div id="ent-lista">' + tablaEntidades('COMPRA', listaEntidades('COMPRA', S.fPro, S.proveedores)) + '</div></section>';
  } else {
    $('#acciones').innerHTML = boton('compNuevo', 'Nuevo comprobante', 'add', ' data-c="COMPRA"', 'btn-primary');
    $('#main').innerHTML = seg + await vistaComprobantes('COMPRA');
  }
};

// ---------- Cuentas a cobrar y a pagar

async function vistaSaldos(circ) {
  const C = CIR[circ];
  const saldos = (await api(C.pre + '.saldos')).filter(s => s.saldo !== 0 || s.a_cuenta !== 0 || s.activo !== 'NO').sort((a, b) => b.saldo - a.saldo);
  const t = saldos.reduce((a, s) => ({ saldo: a.saldo + s.saldo, vencido: a.vencido + s.vencido, a_cuenta: a.a_cuenta + s.a_cuenta }), { saldo: 0, vencido: 0, a_cuenta: 0 });
  $('#acciones').innerHTML = boton('cancNueva', C.Verbo, C.iconoCanc, ' data-c="' + circ + '"', 'btn-primary');
  $('#main').innerHTML = '<section class="card">' +
    tabla([{ t: C.Ent }, { t: 'Saldo', c: 'num' }, { t: 'Vencido', c: 'num' }, { t: 'A cuenta', c: 'num hm' }, { t: '' }],
      saldos.map(s => ({ attr: 'class="click" data-act="cuenta" data-c="' + circ + '" data-id="' + s.id + '"', c: ['<b>' + esc(s.nombre) + '</b>', '<span class="' + (s.saldo < 0 ? 'pos' : '') + '">' + plata(s.saldo) + '</span>',
        s.vencido > 0 ? '<span class="neg">' + plata(s.vencido) + '</span>' : '—', s.a_cuenta > 0 ? plata(s.a_cuenta) : '—', ico('chevron_right')] })),
      ['Total', plata(t.saldo), plata(t.vencido), plata(t.a_cuenta), '']) + '</section>';
}
VISTAS.cobrar = () => vistaSaldos('VENTA');
VISTAS.pagar = () => vistaSaldos('COMPRA');

async function vistaCuenta(circ, id) {
  const C = CIR[circ], c = entidad(circ, id), dc = ' data-c="' + circ + '"';
  const r = await Promise.all([api(C.pre + '.pendientes', { entidad_id: id }), api(C.listaCanc, { entidad_id: id, con_anulados: true })]);
  const p = r[0], cancs = r[1].slice(0, 30), h = hoy();
  S.pend = p;
  const deuda = p.comprobantes.reduce((a, x) => a + x.pendiente, 0), cred = p.creditos.reduce((a, x) => a + x.pendiente, 0);
  $('#titulo').textContent = c.nombre;
  $('#acciones').innerHTML = boton('nav', 'Volver', 'arrow_back', ' data-v="' + C.vSaldos + '"') + boton('entVer', 'Ficha', 'badge', dc + ' data-id="' + id + '"') +
    boton('estado', 'Estado de cuenta', 'description', dc + ' data-id="' + id + '"') + boton('cancNueva', C.Verbo, C.iconoCanc, dc + ' data-id="' + id + '"', 'btn-primary');
  $('#main').innerHTML = '<div class="kpi-grid">' + kpi('request_quote', 'Pendiente', plata(deuda), deuda > 0 ? 'warn' : 'ok') + kpi('savings', C.aCuenta, plata(cred)) +
    kpi('balance', 'Saldo', plata(r2(deuda - cred)), deuda - cred > 0 ? '' : 'ok') + '</div>' +
    '<section class="card"><h2>Comprobantes pendientes</h2>' +
    tabla([{ t: 'Comprobante' }, { t: 'Fecha', c: 'hm' }, { t: 'Vence' }, { t: 'Detalle', c: 'hm' }, { t: 'Importe', c: 'num hm' }, { t: 'Pendiente', c: 'num' }],
      p.comprobantes.map(x => ({ c: ['<span class="chip azul">' + esc(x.id) + '</span>', fecha(x.fecha),
        fecha(x.vencimiento) + (x.vencimiento && x.vencimiento < h ? ' <span class="chip rojo">Vencido</span>' : ''), esc(x.detalle), plata(x.importe), '<b>' + plata(x.pendiente) + '</b>'] }))) + '</section>' +
    (p.creditos.length ? '<section class="card"><h2>' + C.aCuenta + '</h2>' +
      tabla([{ t: 'Origen' }, { t: 'Fecha' }, { t: 'Disponible', c: 'num' }, { t: '' }],
        p.creditos.map(x => ({ c: ['<span class="chip ambar">' + esc(x.id) + '</span>', fecha(x.fecha), plata(x.pendiente),
          p.comprobantes.length ? boton('credAplicar', 'Aplicar', '', dc + ' data-id="' + x.id + '" data-max="' + x.pendiente + '"', 'btn-sm') : ''] }))) + '</section>' : '') +
    '<section class="card"><h2>' + C.cancs + '</h2>' +
    tabla([{ t: 'Fecha' }, { t: C.Canc }, { t: 'Cuenta', c: 'hm' }, { t: 'Importe', c: 'num' }, { t: 'A cuenta', c: 'num hm' }, { t: '' }],
      cancs.map(x => ({ attr: x.estado === 'ANULADO' ? 'class="anulado"' : '', c: [fecha(x.fecha), '<span class="chip verde">' + esc(x.id) + '</span>', esc(x.cuenta), plata(x.importe),
        x.a_cuenta > 0 ? plata(x.a_cuenta) : '—', x.estado === 'ANULADO' ? '<span class="chip">Anulado</span>' : icoBtn('cancAnular', 'block', 'Anular', dc + ' data-id="' + x.id + '"', 'rojo')] }))) + '</section>';
}
VISTAS.cuenta = id => vistaCuenta('VENTA', id);
VISTAS.pcuenta = id => vistaCuenta('COMPRA', id);

// ---------- Tesorería

VISTAS.tesoreria = async function () {
  const f = S.fTes;
  const r = await Promise.all([api('tesoreria.saldos'), api('tesoreria.movimientos', Object.assign({ cuenta_id: f.cuenta_id, con_anulados: f.anulados }, rango(f.mes)))]);
  const saldos = r[0].filter(c => c.activo !== 'NO' || c.saldo !== 0), movs = r[1];
  $('#acciones').innerHTML = boton('retNuevo', 'Retiro', 'savings') + boton('trfNueva', 'Transferencia', 'swap_horiz') + boton('movNuevo', 'Movimiento', 'add', '', 'btn-primary');
  $('#main').innerHTML = (saldos.length ? '<div class="kpi-grid">' + saldos.map(c => kpi(c.tipo === 'CAJA' ? 'point_of_sale' : c.tipo === 'BANCO' ? 'account_balance' : 'account_balance_wallet', esc(c.nombre), plata(c.saldo), c.saldo < 0 ? 'bad' : '')).join('') +
    kpi('functions', 'Total', plata(saldos.reduce((a, c) => a + c.saldo, 0)), 'ok') + '</div>' : '<div class="card"><p class="vacio">Todavía no hay cuentas de tesorería. Crealas en Configuración.</p></div>') +
    '<section class="card"><h2>Movimientos</h2><div class="filtros" style="margin-bottom:12px">' +
    '<div class="campo"><label for="ft-mes">Mes</label><input id="ft-mes" type="month" value="' + f.mes + '" data-chg="tesFiltro"></div>' +
    '<div class="campo"><label for="ft-cta">Cuenta</label>' + selectHtml('ft-cta', S.cuentas.map(c => [c.id, c.nombre]), f.cuenta_id, 'tesFiltro', 'Todas') + '</div>' +
    '<label class="check"><input id="ft-anu" type="checkbox" data-chg="tesFiltro"' + (f.anulados ? ' checked' : '') + '> Ver anulados</label></div>' +
    tabla([{ t: 'Fecha' }, { t: 'N°', c: 'hm' }, { t: 'Cuenta' }, { t: 'Detalle', c: 'hm' }, { t: 'Ingreso', c: 'num' }, { t: 'Egreso', c: 'num' }, { t: '' }],
      movs.map(m => ({ attr: m.estado === 'ANULADO' ? 'class="anulado"' : '', c: [fecha(m.fecha), esc(m.id), esc(m.cuenta), esc(m.detalle) + (m.origen === 'RETIRO' ? chipGastos(m) : ''),
        m.tipo === 'INGRESO' ? '<span class="pos">' + plata(m.importe) + '</span>' : '', m.tipo === 'EGRESO' ? '<span class="neg">' + plata(m.importe) + '</span>' : '',
        m.estado === 'ANULADO' ? '<span class="chip">Anulado</span>' : (m.origen === 'RECIBO' || m.origen === 'PAGO' ? '<span class="chip" title="Se anula desde el ' + (m.origen === 'RECIBO' ? 'recibo' : 'pago') + '">' + esc(m.origen_id) + '</span>' : icoBtn('movAnular', 'block', 'Anular', ' data-id="' + m.id + '"', 'rojo'))] }))) + '</section>';
};

// ---------- Informes

const INFORMES = [['rentabilidad', 'Rentabilidad por mes'], ['ventas', 'Ventas por concepto'], ['gastos', 'Gastos por concepto'], ['saldos', 'Saldos'], ['retiros', 'Cobrado vs. retirado'], ['iva', 'Posición de IVA']];
const COLOR_ING = '#14737C', COLOR_GAS = '#FF914D';   // colores Sipymes; validados para daltonismo (ΔE 20,9). El naranja tiene poco contraste: por eso hay tabla y detalle al pasar el mouse

VISTAS.informes = async function () {
  const I = S.inf;
  S.infDatos = null;
  $('#acciones').innerHTML = boton('infExcel', 'Excel', 'table_view') + boton('infPdf', 'PDF', 'picture_as_pdf', '', 'btn-primary');
  if (I.tipo === 'iva' && !esRI()) I.tipo = 'rentabilidad';
  const seg = '<div class="seg">' + INFORMES.filter(t => t[0] !== 'iva' || esRI()).map(t => '<button class="' + (t[0] === I.tipo ? 'on' : '') + '" data-act="infTipo" data-v="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>';
  const todo = I.tipo === 'retiros' && I.todo;
  const filtros = I.tipo === 'saldos'
    ? '<div class="campo"><label for="fi-fecha">Saldos al</label><input id="fi-fecha" type="date" value="' + I.fecha + '" data-chg="infFiltro"></div>'
    : I.tipo === 'iva' ? '<div class="campo"><label for="fi-mes">Mes</label><input id="fi-mes" type="month" value="' + (I.mes || mesActual()) + '" data-chg="infFiltro"></div>'
    : '<div class="campo"><label for="fi-desde">Desde</label><input id="fi-desde" type="month" value="' + I.desde + '" data-chg="infFiltro"' + (todo ? ' disabled' : '') + '></div>' +
      '<div class="campo"><label for="fi-hasta">Hasta</label><input id="fi-hasta" type="month" value="' + I.hasta + '" data-chg="infFiltro"' + (todo ? ' disabled' : '') + '></div>' +
      (I.tipo === 'retiros' ? '<div class="seg rango">' + [['mes', 'Este mes'], ['anio', 'Este año'], ['todo', 'Desde el inicio']].map(x =>
        '<button class="' + (x[0] === rangoActual() ? 'on' : '') + '" data-act="infRango" data-v="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' : '');
  let cuerpo;
  if (I.tipo === 'rentabilidad') {
    const r = await api('informes.rentabilidad', { desde: I.desde, hasta: I.hasta });
    S.infDatos = r;
    cuerpo = '<div class="kpi-grid">' + kpi('trending_up', 'Ingresos', plata(r.total.ingresos)) + kpi('shopping_cart', 'Gastos', plata(r.total.gastos)) +
      kpi(r.total.resultado < 0 ? 'trending_down' : 'functions', 'Resultado', plata(r.total.resultado), r.total.resultado < 0 ? 'bad' : 'ok') + kpi('percent', 'Margen', pct(r.total.margen)) + '</div>' +
      '<section class="card"><h2>Ingresos y gastos por mes</h2><div id="grafico" class="grafico"></div></section>' +
      '<section class="card"><h2>Detalle</h2>' + tabla([{ t: 'Mes' }, { t: 'Ingresos', c: 'num' }, { t: 'Gastos', c: 'num' }, { t: 'Resultado', c: 'num' }, { t: 'Margen', c: 'num hm' }],
        r.filas.map(f => ({ c: ['<span class="nw">' + nomMes(f.mes) + '</span>', plata(f.ingresos), plata(f.gastos), '<span class="' + (f.resultado < 0 ? 'neg' : '') + '">' + plata(f.resultado) + '</span>', pct(f.margen)] })),
        ['Total', plata(r.total.ingresos), plata(r.total.gastos), plata(r.total.resultado), pct(r.total.margen)]) +
      '<p class="muted small" style="margin-top:10px">Ingresos = ventas; gastos = compras. Por fecha del comprobante, sin amortizaciones.</p></section>';
  } else if (I.tipo === 'ventas' || I.tipo === 'gastos') {
    const r = await api('informes.conceptos', { circuito: I.tipo === 'gastos' ? 'COMPRA' : 'VENTA', desde: I.desde, hasta: I.hasta });
    S.infDatos = r;
    cuerpo = '<section class="card"><h2>' + (I.tipo === 'gastos' ? 'Gastos' : 'Ventas') + ' por concepto <span class="chip azul">' + plata(r.total) + '</span></h2>' +
      tabla([{ t: 'Concepto' }, { t: 'Rubro', c: 'hm' }].concat(r.meses.map(m => ({ t: nomMes(m), c: 'num' }))).concat([{ t: 'Total', c: 'num' }]),
        r.filas.map(f => ({ c: ['<b>' + esc(f.concepto) + '</b>', esc(f.rubro)].concat(f.valores.map(v => v ? plata(v) : '<span class="muted">—</span>')).concat(['<b>' + plata(f.total) + '</b>']) })),
        ['Total', ''].concat(r.totales.map(plata)).concat([plata(r.total)])) + '</section>';
  } else if (I.tipo === 'iva') {
    const r = await api('informes.iva', { mes: I.mes || mesActual() });
    S.infDatos = r;
    const lado = (titulo, l) => '<section class="card"><h2>' + titulo + '</h2>' + (l.por.length
      ? tabla([{ t: 'Alícuota' }, { t: 'Neto gravado', c: 'num' }, { t: 'IVA', c: 'num' }], l.por.map(a => ({ c: [String(a.tasa).replace('.', ',') + ' %', plata(a.neto), plata(a.iva)] })),
        ['Total', plata(l.neto), plata(l.iva)])
      : '<p class="vacio">Sin comprobantes con IVA discriminado.</p>') +
      '<p class="muted small" style="margin-top:8px">' + l.cantidad + ' comprobantes con IVA' + (l.sin_desglose ? ' · ' + l.sin_desglose + ' sin discriminar (no suman)' : '') + '.</p></section>';
    cuerpo = '<div class="kpi-grid">' + kpi('north_east', 'Débito fiscal (ventas)', plata(r.debito)) + kpi('south_west', 'Crédito fiscal (compras)', plata(r.credito)) +
      kpi('account_balance', r.saldo >= 0 ? 'Saldo a pagar' : 'Saldo a favor', plata(Math.abs(r.saldo)), r.saldo > 0 ? 'warn' : 'ok') +
      kpi('receipt', 'Percepciones y retenciones', plata(r.otros_tributos)) + '</div>' +
      '<div class="dos">' + lado('Ventas: débito fiscal', r.ventas) + lado('Compras: crédito fiscal', r.compras) + '</div>' +
      '<p class="muted small">Informativo, armado con lo cargado en el sistema. No reemplaza la declaración jurada ni incluye saldos de meses anteriores.</p>';
  } else if (I.tipo === 'retiros') {
    const r = await api('informes.retiros', I.todo ? { todo: true } : { desde: I.desde, hasta: I.hasta });
    S.infDatos = r;
    const filas = r.filas.map(f => ({ c: ['<button class="link" data-act="cuenta" data-c="VENTA" data-id="' + f.cliente_id + '">' + esc(f.cliente) + '</button>',
      plata(f.cobrado), f.retirado ? plata(f.retirado) : '<span class="muted">—</span>', '<b>' + plata(f.quedo) + '</b>'] }));
    if (r.sin_cliente) filas.push({ c: ['<span class="muted">Retiros sin cliente</span>', '<span class="muted">—</span>', plata(r.sin_cliente), '<span class="neg">' + plata(-r.sin_cliente) + '</span>'] });
    cuerpo = '<div class="kpi-grid">' + kpi('payments', 'Cobrado', plata(r.total.cobrado)) + kpi('savings', 'Retirado', plata(r.total.retirado)) +
      kpi('account_balance', 'Quedó en la empresa', plata(r.total.quedo), r.total.quedo < 0 ? 'bad' : 'ok') + '</div>' +
      '<section class="card"><h2>Por cliente</h2>' + (filas.length ? tabla([{ t: 'Cliente' }, { t: 'Cobrado', c: 'num' }, { t: 'Retirado', c: 'num' }, { t: 'Quedó en la empresa', c: 'num' }], filas,
        ['Total', plata(r.total.cobrado), plata(r.total.retirado), plata(r.total.quedo)]) : '<p class="vacio">No hay cobros en el período.</p>') +
      '<p class="muted small" style="margin-top:10px">Cada retiro hecho con un cobro cuenta en el mes de ese cobro. "Retiros sin cliente" son los que hiciste desde Tesorería sin elegir un cobro.</p></section>';
  } else {
    const r = await api('informes.saldos', { fecha: I.fecha });
    S.infDatos = r;
    const t = (l, conVenc) => tabla([{ t: 'Nombre' }, { t: 'Saldo', c: 'num' }].concat(conVenc ? [{ t: 'Vencido', c: 'num' }, { t: 'A cuenta', c: 'num hm' }] : []),
      l.map(s => ({ c: [esc(s.nombre), plata(s.saldo)].concat(conVenc ? [s.vencido ? plata(s.vencido) : '—', s.a_cuenta ? plata(s.a_cuenta) : '—'] : []) })),
      ['Total', plata(l.reduce((a, s) => a + s.saldo, 0))].concat(conVenc ? ['', ''] : []));
    cuerpo = '<div class="kpi-grid">' + kpi('request_quote', 'A cobrar', plata(r.total_clientes)) + kpi('outbox', 'A pagar', plata(r.total_proveedores)) +
      kpi('account_balance_wallet', 'Tesorería', plata(r.total_cuentas)) + '</div>' +
      '<div class="dos"><section class="card"><h2>Clientes (a cobrar)</h2>' + t(r.clientes, true) + '</section>' +
      '<section class="card"><h2>Proveedores (a pagar)</h2>' + t(r.proveedores, true) + '</section></div>' +
      '<section class="card"><h2>Tesorería</h2>' + t(r.cuentas, false) + '</section>';
  }
  $('#main').innerHTML = seg + '<section class="card"><div class="filtros">' + filtros + '</div></section>' + cuerpo;
  if (I.tipo === 'rentabilidad') dibujarGrafico();
};

function rangoActual() {
  const I = S.inf, m = mesActual();
  if (I.todo) return 'todo';
  if (I.desde === m && I.hasta === m) return 'mes';
  if (I.desde === m.slice(0, 4) + '-01' && I.hasta === m) return 'anio';
  return '';
}

/** Columnas agrupadas ingresos/gastos por mes, un solo eje, con leyenda y detalle al pasar el mouse. */
function dibujarGrafico() {
  const el = $('#grafico'), r = S.infDatos;
  if (!el || !r || !r.filas) return;
  const W = Math.max(300, el.clientWidth), H = 260, m = { t: 12, r: 8, b: 28, l: 64 };
  const pw = W - m.l - m.r, ph = H - m.t - m.b, n = r.filas.length;
  const vals = r.filas.flatMap(f => [f.ingresos, f.gastos]);
  let max = Math.max(0, ...vals), min = Math.min(0, ...vals);
  if (max === min) max = 1;
  const paso = pasoLindo((max - min) / 4);
  max = Math.ceil(max / paso) * paso; min = Math.floor(min / paso) * paso;
  const y = v => m.t + ph * (max - v) / (max - min);
  const banda = pw / n, bw = Math.max(3, Math.min(24, (banda * 0.72 - 2) / 2));
  const comp = new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 });
  let svg = '<svg width="' + W + '" height="' + H + '" role="img" aria-label="Ingresos y gastos por mes">';
  for (let v = min; v <= max + paso / 2; v += paso) {
    svg += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="' + (Math.abs(v) < paso / 1e6 ? '#C9C2B4' : '#EEE9E0') + '" stroke-width="1"/>' +
      '<text x="' + (m.l - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end" class="eje">$ ' + comp.format(v) + '</text>';
  }
  const salto = n > 18 ? 3 : n > 12 ? 2 : 1;
  r.filas.forEach((f, i) => {
    const cx = m.l + banda * i + banda / 2;
    [[f.ingresos, COLOR_ING, -1], [f.gastos, COLOR_GAS, 1]].forEach(s => {
      const x = s[2] < 0 ? cx - 1 - bw : cx + 1;
      if (s[0]) svg += '<path d="' + barra(x, y(0), y(s[0]), bw, 4) + '" fill="' + s[1] + '"/>';
    });
    if (i % salto === 0) svg += '<text x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle" class="eje">' + nomMes(f.mes) + '</text>';
    svg += '<rect class="hit" x="' + (m.l + banda * i) + '" y="' + m.t + '" width="' + banda + '" height="' + ph + '" fill="transparent" data-tip="' + i + '"/>';
  });
  svg += '</svg>';
  el.innerHTML = '<div class="leyenda"><span><i style="background:' + COLOR_ING + '"></i>Ingresos</span><span><i style="background:' + COLOR_GAS + '"></i>Gastos</span></div>' +
    '<div class="plot">' + svg + '<div class="tip hidden" id="tip"></div></div>';
}
function pasoLindo(x) {
  const e = Math.pow(10, Math.floor(Math.log10(Math.max(x, 1)))), f = x / e;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e;
}
/** Barra con punta redondeada (4px) del lado del dato y recta en la base. Sirve para valores negativos. */
function barra(x, y0, y1, w, rad) {
  const arriba = y1 < y0, h = Math.abs(y0 - y1), rr = Math.min(rad, h, w / 2);
  if (arriba) return 'M' + x + ',' + y0 + 'V' + (y1 + rr) + 'Q' + x + ',' + y1 + ' ' + (x + rr) + ',' + y1 + 'H' + (x + w - rr) + 'Q' + (x + w) + ',' + y1 + ' ' + (x + w) + ',' + (y1 + rr) + 'V' + y0 + 'Z';
  return 'M' + x + ',' + y0 + 'V' + (y1 - rr) + 'Q' + x + ',' + y1 + ' ' + (x + rr) + ',' + y1 + 'H' + (x + w - rr) + 'Q' + (x + w) + ',' + y1 + ' ' + (x + w) + ',' + (y1 - rr) + 'V' + y0 + 'Z';
}
function mostrarTip(rect) {
  const f = S.infDatos && S.infDatos.filas && S.infDatos.filas[Number(rect.dataset.tip)], tip = $('#tip'), plot = rect.closest('.plot');
  if (!f || !tip) return;
  tip.innerHTML = '<b>' + nomMes(f.mes) + '</b><div><i style="background:' + COLOR_ING + '"></i>Ingresos <span>' + plata(f.ingresos) + '</span></div>' +
    '<div><i style="background:' + COLOR_GAS + '"></i>Gastos <span>' + plata(f.gastos) + '</span></div><div class="res">Resultado <span>' + plata(f.resultado) + '</span></div>';
  tip.classList.remove('hidden');
  document.querySelectorAll('.plot .hit.on').forEach(x => x.classList.remove('on'));
  rect.classList.add('on');
  const bx = rect.getBBox(), pr = plot.getBoundingClientRect();
  let left = bx.x + bx.width / 2 + 12;
  if (left + tip.offsetWidth > pr.width) left = bx.x + bx.width / 2 - tip.offsetWidth - 12;
  tip.style.left = Math.max(0, left) + 'px'; tip.style.top = '8px';
}

/** Arma las hojas del Excel del informe que está en pantalla. */
function hojasInforme() {
  const I = S.inf, r = S.infDatos, num = v => ({ v: Number(v) || 0 });
  const enc = l => ({ negrita: true, celdas: l });
  const margen = v => (v === null ? '' : { v: v / 100, pct: 1 });
  if (I.tipo === 'rentabilidad') {
    return [{ nombre: 'Rentabilidad', anchos: [12, 18, 18, 18, 10], filas: [
      { negrita: true, celdas: ['Rentabilidad por mes – ' + nomMes(r.desde) + ' a ' + nomMes(r.hasta)] }, { celdas: [] },
      enc(['Mes', 'Ingresos', 'Gastos', 'Resultado', 'Margen'])].concat(r.filas.map(f => ({ celdas: [nomMes(f.mes), num(f.ingresos), num(f.gastos), num(f.resultado), margen(f.margen)] })))
      .concat([{ negrita: true, celdas: ['Total', num(r.total.ingresos), num(r.total.gastos), num(r.total.resultado), margen(r.total.margen)] }]) }];
  }
  if (I.tipo === 'ventas' || I.tipo === 'gastos') {
    const tit = I.tipo === 'gastos' ? 'Gastos por concepto' : 'Ventas por concepto';
    return [{ nombre: tit, anchos: [28, 16].concat(r.meses.map(() => 15)).concat([17]), filas: [
      { negrita: true, celdas: [tit + ' – ' + nomMes(r.desde) + ' a ' + nomMes(r.hasta)] }, { celdas: [] },
      enc(['Concepto', 'Rubro'].concat(r.meses.map(nomMes)).concat(['Total']))].concat(r.filas.map(f => ({ celdas: [f.concepto, f.rubro].concat(f.valores.map(num)).concat([num(f.total)]) })))
      .concat([{ negrita: true, celdas: ['Total', ''].concat(r.totales.map(num)).concat([num(r.total)]) }]) }];
  }
  if (I.tipo === 'iva') {
    const lado = (t, l) => [{ negrita: true, celdas: [t] }, enc(['Alícuota', 'Neto gravado', 'IVA'])]
      .concat(l.por.map(a => ({ celdas: [a.tasa + ' %', num(a.neto), num(a.iva)] }))).concat([{ negrita: true, celdas: ['Total', num(l.neto), num(l.iva)] }, { celdas: [] }]);
    return [{ nombre: 'Posicion IVA', anchos: [34, 18, 18], filas: [{ negrita: true, celdas: ['Posición de IVA – ' + nomMes(r.mes) + ' (informativo)'] }, { celdas: [] }]
      .concat(lado('Ventas (débito fiscal)', r.ventas)).concat(lado('Compras (crédito fiscal)', r.compras))
      .concat([{ celdas: ['Débito − crédito', '', num(r.saldo)] }, { celdas: ['Percepciones y retenciones de compras', '', num(r.otros_tributos)] }]) }];
  }
  if (I.tipo === 'retiros') {
    const per = r.todo ? 'desde el inicio' : nomMes(r.desde) + ' a ' + nomMes(r.hasta);
    const filas = r.filas.map(f => ({ celdas: [f.cliente, num(f.cobrado), num(f.retirado), num(f.quedo)] }));
    if (r.sin_cliente) filas.push({ celdas: ['Retiros sin cliente', '', num(r.sin_cliente), num(-r.sin_cliente)] });
    return [{ nombre: 'Cobrado vs retirado', anchos: [32, 18, 18, 22], filas: [
      { negrita: true, celdas: ['Cobrado vs. retirado – ' + per] }, { celdas: [] }, enc(['Cliente', 'Cobrado', 'Retirado', 'Quedó en la empresa'])]
      .concat(filas).concat([{ negrita: true, celdas: ['Total', num(r.total.cobrado), num(r.total.retirado), num(r.total.quedo)] }]) }];
  }
  const hoja = (nombre, l, conVenc) => ({ nombre: nombre, anchos: [32, 18, 18, 18], filas: [
    { negrita: true, celdas: [nombre + ' – saldos al ' + fecha(r.fecha)] }, { celdas: [] },
    enc(['Nombre', 'Saldo'].concat(conVenc ? ['Vencido', 'A cuenta'] : []))].concat(l.map(s => ({ celdas: [s.nombre, num(s.saldo)].concat(conVenc ? [num(s.vencido), num(s.a_cuenta)] : []) })))
    .concat([{ negrita: true, celdas: ['Total', num(l.reduce((a, s) => a + s.saldo, 0))] }]) });
  return [hoja('Clientes', r.clientes, true), hoja('Proveedores', r.proveedores, true), hoja('Tesorería', r.cuentas, false)];
}

// ---------- Excel (.xlsx) armado en el navegador, sin librerías externas

const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC_T[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

function zipSinComprimir(archivos, tipo) {
  const enc = new TextEncoder(), partes = [], central = [];
  let off = 0;
  archivos.forEach(f => {
    const nm = enc.encode(f.nombre), d = enc.encode(f.texto), crc = crc32(d);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(12, 0x21, true);
    h.setUint32(14, crc, true); h.setUint32(18, d.length, true); h.setUint32(22, d.length, true); h.setUint16(26, nm.length, true);
    partes.push(new Uint8Array(h.buffer), nm, d);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(14, 0x21, true);
    c.setUint32(16, crc, true); c.setUint32(20, d.length, true); c.setUint32(24, d.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
    central.push(new Uint8Array(c.buffer), nm);
    off += 30 + nm.length + d.length;
  });
  const tam = central.reduce((a, x) => a + x.length, 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, archivos.length, true); e.setUint16(10, archivos.length, true); e.setUint32(12, tam, true); e.setUint32(16, off, true);
  return new Blob(partes.concat(central).concat([new Uint8Array(e.buffer)]), { type: tipo });
}

function xlsx(hojas) {
  const x = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const col = i => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"', RNS = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const cab = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const usados = {};
  const nombres = hojas.map(h => {
    let n = String(h.nombre).replace(/[\[\]:*?\/\\]/g, ' ').slice(0, 31) || 'Hoja';
    while (usados[n]) n = n.slice(0, 28) + ' ' + (Object.keys(usados).length + 1);
    usados[n] = 1; return n;
  });
  const archivos = [
    { nombre: '[Content_Types].xml', texto: cab + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      hojas.map((h, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('') + '</Types>' },
    { nombre: '_rels/.rels', texto: cab + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { nombre: 'xl/workbook.xml', texto: cab + '<workbook ' + NS + ' ' + RNS + '><sheets>' +
      nombres.map((n, i) => '<sheet name="' + x(n) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('') + '</sheets></workbook>' },
    { nombre: 'xl/_rels/workbook.xml.rels', texto: cab + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      hojas.map((h, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('') +
      '<Relationship Id="rId' + (hojas.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
    { nombre: 'xl/styles.xml', texto: cab + '<styleSheet ' + NS + '><numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;$&quot; #,##0.00"/></numFmts>' +
      '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
      '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
      '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6">' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
      '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
      '<xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>' +
      '<xf numFmtId="10" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
      '<xf numFmtId="10" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>' +
      '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>' }
  ];
  hojas.forEach((h, i) => {
    const filas = h.filas.map((f, ri) => '<row r="' + (ri + 1) + '">' + f.celdas.map((v, ci) => {
      const ref = col(ci) + (ri + 1), b = f.negrita ? 1 : 0;
      if (v && typeof v === 'object') return '<c r="' + ref + '" s="' + (v.pct ? 4 + b : 2 + b) + '"><v>' + v.v + '</v></c>';
      if (v === '' || v === null || v === undefined) return '';
      return '<c r="' + ref + '" t="inlineStr" s="' + b + '"><is><t xml:space="preserve">' + x(v) + '</t></is></c>';
    }).join('') + '</row>').join('');
    const anchos = h.anchos ? '<cols>' + h.anchos.map((w, k) => '<col min="' + (k + 1) + '" max="' + (k + 1) + '" width="' + w + '" customWidth="1"/>').join('') + '</cols>' : '';
    archivos.push({ nombre: 'xl/worksheets/sheet' + (i + 1) + '.xml', texto: cab + '<worksheet ' + NS + '>' + anchos + '<sheetData>' + filas + '</sheetData></worksheet>' });
  });
  return zipSinComprimir(archivos, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

// ---------- Configuración

VISTAS.config = async function () {
  await cargarMaestros();
  const g = S.config;
  const tipoChip = c => '<span class="chip ' + (c.tipo === 'GASTO' ? 'naranja' : 'azul') + '">' + (c.tipo === 'GASTO' ? 'Gasto' : 'Ingreso') + '</span>';
  $('#main').innerHTML = cardsCuenta() + (puede('config') ? '<div class="dos">' +
    '<section class="card"><h2>General</h2><form id="cfg" class="form">' +
    campoHtml({ n: 'empresa', label: 'Nombre de la empresa', valor: g.empresa }) +
    campoHtml({ n: 'dia_limite_default', label: 'Día límite de cobro general', tipo: 'number', step: 1, min: 1, max: 31, valor: g.dia_limite_default, ayuda: 'Se usa para los clientes que no tienen un día propio.' }) +
    campoHtml({ n: 'email_avisos', label: 'Mail para avisos', tipo: 'email', valor: g.email_avisos, ayuda: 'Vacío: se usa el mail de la cuenta dueña del servidor.' }) +
    campoHtml({ n: 'responsable_inscripto', label: 'Responsable inscripto en IVA (discrimina IVA en los comprobantes)', tipo: 'check', valor: g.responsable_inscripto === 'SI' }) +
    '<div id="c-ri" class="' + (g.responsable_inscripto === 'SI' ? '' : 'hidden') + '">' + campoHtml({ n: 'ri_desde', label: 'Desde', tipo: 'date', valor: g.ri_desde || hoy().slice(0, 8) + '01',
      ayuda: 'Los comprobantes anteriores quedan como estaban. La rentabilidad se calcula sobre el neto (sin IVA ni percepciones).' }) + '</div>' +
    (S.modo === 'COMPLETO' ? campoHtml({ n: 'maestra_id', label: 'Planilla MAESTRA (ID)', valor: g.maestra_id, ayuda: 'El código largo que aparece en la dirección de la planilla, entre /d/ y /edit.' }) : '') +
    '<div class="modal-pie">' + boton('cfgGuardar', 'Guardar', 'save', '', 'btn-primary') + '</div></form></section>' +
    '<section class="card"><h2>Numeración</h2>' + tabla([{ t: 'Tipo' }, { t: 'Último número', c: 'num' }], S.numeradores.map(n => ({ c: [esc(n.tipo), n.ultimo] }))) +
    '<p class="muted small" style="margin-top:10px">La asigna el sistema: correlativa, sin repetir ni saltear.</p></section></div>' +
    '<div class="dos"><section class="card"><h2>Conceptos ' + boton('conNuevo', 'Nuevo', 'add', '', 'btn-sm') + '</h2>' +
    tabla([{ t: 'Concepto' }, { t: 'Tipo' }, { t: 'Rubro', c: 'hm' }, { t: '' }], S.conceptos.map(c => ({ c: [esc(c.nombre) + (c.activo === 'NO' ? ' <span class="chip">Inactivo</span>' : ''),
      tipoChip(c) + (c.app ? ' <span class="chip">' + esc(c.app) + '</span>' : ''), esc(c.rubro), icoBtn('conEditar', 'edit', 'Editar', ' data-id="' + c.id + '"')] }))) +
    '<p class="muted small" style="margin-top:10px">Los de ingreso se usan en ventas; los de gasto, en compras. El rubro agrupa en los informes.</p></section>' +
    '<section class="card"><h2>Cuentas de tesorería ' + boton('ctaNueva', 'Nueva', 'add', '', 'btn-sm') + '</h2>' +
    tabla([{ t: 'Cuenta' }, { t: 'Tipo' }, { t: '' }], S.cuentas.map(c => ({ c: [esc(c.nombre) + (c.activo === 'NO' ? ' <span class="chip">Inactiva</span>' : ''), '<span class="chip">' + esc(c.tipo) + '</span>',
      icoBtn('ctaEditar', 'edit', 'Editar', ' data-id="' + c.id + '"')] }))) + '</section></div>' +
    (S.modo === 'DEMO' ? '<section class="card"><h2>Datos de demostración ' + boton('demoReiniciar', 'Reiniciar datos de demo', 'restart_alt', '', 'btn-sm') + '</h2>' +
      '<p class="small">Esta es la versión de demostración: los datos son inventados y no tienen nada que ver con tu versión. Antes de mostrarla, reiniciala para que las fechas queden al día.</p></section>' : '') +
    (S.modo === 'COMPLETO' ? '<section class="card"><h2>Copia para un cliente ' + boton('plantillaPreparar', 'Preparar copia para un cliente', 'content_copy', '', 'btn-sm') + '</h2><div id="plantilla-cfg"><p class="muted small">Consultando…</p></div></section>' +
      '<section class="card"><h2>Planilla MAESTRA ' + boton('maestraSync', 'Actualizar ahora', 'sync', '', 'btn-sm') + '</h2><div id="maestra-cfg"><p class="muted small">Consultando…</p></div></section>' : '') +
    (S.modo !== 'DEMO' ? '<section class="card"><h2>Copia de seguridad ' + boton('respaldoHacer', 'Hacer una copia ahora', 'backup', '', 'btn-sm') + '</h2><div id="respaldo-cfg"><p class="muted small">Consultando…</p></div></section>' : '') +
    (S.modo === 'COMPLETO' ? '<section class="card"><h2>App de gastos</h2><div id="gastos-cfg"><p class="muted small">Consultando tu app de gastos…</p></div></section>' : '') +
'' : '') +
    '<section class="card"><h2>Versiones en este dispositivo ' + boton('perfilAgregar', 'Conectar otra versión', 'add', '', 'btn-sm') + '</h2>' +
    tabla([{ t: 'Versión' }, { t: '' }], PERFILES.map((p, i) => ({ c: [esc(p.nombre || 'Versión ' + (i + 1)) + (p.activo ? ' <span class="chip verde">En uso</span>' : ''),
      p.activo ? '' : boton('perfilUsar', 'Usar', 'swap_horiz', ' data-i="' + i + '"', 'btn-sm')] }))) +
    '<p class="muted small" style="margin-top:10px">Por ejemplo, tu versión y la demo. Cada una tiene su propia dirección y sus propios usuarios, y sus datos no se mezclan. También podés cambiar tocando el nombre arriba a la izquierda.' +
    (S.version ? ' Versión del sistema: ' + esc(S.version) + '.' : '') + '</p></section>' +
    '<section class="card"><h2>Mantenimiento</h2><div class="acciones">' + (puede('config') ? boton('reinstalar', 'Revisar instalación', 'build') : '') +
    boton('desconectar', 'Desconectar este dispositivo', 'phonelink_erase') + '</div>' +
    (puede('config') ? '<p class="muted small" style="margin-top:10px">"Revisar instalación" vuelve a crear las hojas que falten y reprograma la tarea diaria (abonos del día 1 y avisos). No borra datos.</p>' : '') + '</section>';
  const ri = $('#f-responsable_inscripto');
  if (ri) ri.addEventListener('change', () => $('#c-ri').classList.toggle('hidden', !ri.checked));
  if (esPrincipal()) api('usuarios.listar', {}, { silencioso: true }).then(pintarUsuarios).catch(() => {});
  if (!puede('config')) return;
  if (S.modo === 'COMPLETO') {
    api('maestra.apps', {}, { silencioso: true }).then(a => { S.apps = a; }).catch(() => {});
    api('maestra.estado', {}, { silencioso: true }).then(pintarMaestra).catch(() => {});
    api('plantilla.estado', {}, { silencioso: true }).then(pintarPlantilla).catch(() => {});
  }
  if (S.modo !== 'DEMO') api('respaldo.estado', {}, { silencioso: true }).then(r => {
    const el = $('#respaldo-cfg'); if (!el) return;
    el.innerHTML = '<p class="small">' + (r.ultimo ? 'Última copia: <b>' + esc(fecha(r.ultimo.slice(0, 10)) + ' ' + r.ultimo.slice(11)) + '</b>' + (r.carpeta_url ? ' · <a href="' + esc(r.carpeta_url) + '" target="_blank" rel="noopener">Ver carpeta</a>' : '') : 'Todavía no se hizo ninguna copia.') + '</p>' +
      (r.error ? '<p class="neg small">' + esc(r.error) + '</p>' : '') +
      '<p class="muted small" style="margin-top:8px">Una vez por semana se copia la planilla de datos a la carpeta "Si-Gestión - Respaldos" de tu Drive. Se guardan las ' + r.guardar + ' copias más nuevas; las anteriores van a la papelera de Drive.</p>';
  }).catch(() => {});
  if (S.modo === 'COMPLETO') api('gastos.estado', {}, { silencioso: true }).then(pintarGastos).catch(e => { const el = $('#gastos-cfg'); if (el) el.innerHTML = '<p class="neg small">' + esc(e.message) + '</p>'; });
};

/** Tarjeta "Copia para un cliente" de Configuración. */
function pintarPlantilla(p) {
  const el = $('#plantilla-cfg'); if (!el) return;
  el.innerHTML = (p.id
    ? '<p class="small">Planilla modelo vacía, versión <b>' + esc(p.version) + '</b>' + (p.version !== p.version_actual ? ' <span class="chip ambar">Hay una versión más nueva: preparala de nuevo</span>' : '') +
      ' · <a href="' + esc(p.url) + '" target="_blank" rel="noopener">Abrirla</a></p>' +
      '<div class="campo" style="margin-top:10px"><label for="pl-link">Link para el cliente</label><input id="pl-link" type="text" readonly value="' + esc(p.copia_url) + '"></div>' +
      '<div class="acciones">' + boton('plantillaCopiar', 'Copiar link', 'link', '', 'btn-sm') + '</div>'
    : '<p class="small">Todavía no preparaste la planilla modelo.</p>') +
    '<p class="muted small" style="margin-top:8px">Arma en tu Drive una planilla vacía con la estructura de la última versión. No lleva ningún dato tuyo ni de la demo. ' +
    'El cliente abre el link con su cuenta de Google y le queda una copia propia. El servidor dentro de la copia se suma en el bloque 5.</p>';
}

/** Tarjeta "Planilla MAESTRA" de Configuración. */
function pintarMaestra(m) {
  const el = $('#maestra-cfg'); if (!el) return;
  const r = m.resumen || {};
  el.innerHTML = '<p class="small">' + (m.ultimo ? 'Última actualización: <b>' + esc(fecha(m.ultimo.slice(0, 10)) + ' ' + m.ultimo.slice(11)) + '</b> · ' +
      (r.clientes || 0) + ' clientes, ' + (r.cuotas || 0) + ' cuotas, ' + (r.ventas || 0) + ' ventas' : 'Todavía no se actualizó.') +
    ' · <a href="' + esc(m.url) + '" target="_blank" rel="noopener">Abrir la MAESTRA</a></p>' +
    (m.error ? '<p class="neg small">' + esc(m.error) + '</p>' : '') +
    '<p class="muted small" style="margin-top:8px">Todos los días a las 7, Si-Gestión reescribe en la MAESTRA las hojas CLIENTES, CUOTAS y VENTAS (no las cargues a mano: se pisan). LICENCIAS y DESARROLLOS no se tocan. Para que una venta pase, su concepto tiene que tener una app asignada.</p>';
}

/** Tarjeta "App de gastos" de Configuración, según el estado del vínculo. */
function pintarGastos(e) {
  const el = $('#gastos-cfg');
  if (!el) return;
  const url = '<div class="campo"><label for="g-url">Dirección de tu app de gastos</label><input id="g-url" type="url" value="' + esc(e.url) +
    '" placeholder="https://script.google.com/macros/s/.../exec"><small>La misma URL que termina en /exec que usa tu app de gastos.</small></div>';
  const pend = e.pendientes ? '<p class="small" style="margin-top:10px"><span class="chip ambar">' + e.pendientes + '</span> retiro(s) sin resolver. ' + boton('gastosReintentar', 'Reintentar', 'sync', '', 'btn-sm') + '</p>' : '';
  if (e.estado === 'sin_vincular') {
    el.innerHTML = '<p class="small" style="margin-bottom:12px">Los retiros que hagas pasan solos a tu app de gastos como ingreso. Si-Gestión se conecta como un dispositivo más, que vos aprobás desde tu app de gastos.</p>' +
      '<div class="form">' + url + '<div class="modal-pie">' + boton('gastosVincular', 'Vincular', 'link', '', 'btn-primary') + '</div></div>' + pend;
  } else if (e.estado === 'pendiente') {
    el.innerHTML = '<p class="small"><span class="chip ambar">Esperando aprobación</span></p><ol class="pasos">' +
      '<li>Abrí tu app de gastos y andá a la administración de dispositivos.</li>' +
      '<li>Aprobá el dispositivo <b>Si-Gestión (Sipymes)</b>, código <b>' + esc(e.dispositivo) + '</b>.</li>' +
      '<li>Volvé acá y tocá "Ya lo aprobé".</li></ol>' +
      '<div class="acciones">' + boton('gastosActualizar', 'Ya lo aprobé', 'check', '', 'btn-primary') + boton('gastosDesvincular', 'Desvincular', 'link_off') + '</div>' + pend;
  } else if (e.estado === 'error') {
    el.innerHTML = '<p class="neg small" style="margin-bottom:12px">' + esc(e.mensaje) + '</p><div class="form">' + url +
      '<div class="modal-pie">' + boton('gastosDesvincular', 'Desvincular', 'link_off') + boton('gastosActualizar', 'Reintentar', 'sync') + boton('gastosVincular', 'Vincular de nuevo', 'link', '', 'btn-primary') + '</div></div>' + pend;
  } else {
    const cats = e.catalogos.categorias, subs = e.catalogos.subcategorias;
    const catSel = cats.find(c => c.nombre === e.categoria) || cats[0] || {};
    el.innerHTML = '<p class="small" style="margin-bottom:12px"><span class="chip verde">Vinculada</span> Dispositivo ' + esc(e.dispositivo) + '. Elegí con qué entran los retiros en tu app de gastos:</p>' +
      '<div class="form"><div class="campo"><label for="g-cat">Categoría (de ingreso)</label>' + selectHtml('g-cat', cats.map(c => [c.nombre, c.nombre]), catSel.nombre) + '</div>' +
      '<div class="campo"><label for="g-sub">Subcategoría</label><select id="g-sub"></select></div>' +
      '<div class="campo"><label for="g-medio">Medio de pago</label>' + selectHtml('g-medio', e.catalogos.medios.map(m => [m, m]), e.medio) + '</div>' +
      '<div class="modal-pie">' + boton('gastosDesvincular', 'Desvincular', 'link_off') + boton('gastosGuardar', 'Guardar', 'save', '', 'btn-primary') + '</div></div>' + pend;
    const subsDe = nom => { const c = cats.find(x => x.nombre === nom); return c ? subs.filter(x => x.categoria === c.id) : []; };
    const llenarSub = () => {
      const l = subsDe($('#g-cat').value);
      $('#g-sub').innerHTML = '<option value="">—</option>' + l.map(x => '<option' + (x.nombre === e.subcategoria ? ' selected' : '') + '>' + esc(x.nombre) + '</option>').join('');
    };
    $('#g-cat').addEventListener('change', llenarSub); llenarSub();
    if (!cats.length) el.querySelector('.form').insertAdjacentHTML('afterbegin', '<p class="neg small">Tu app de gastos no tiene categorías de ingreso activas. Creá una allá (por ejemplo "Sipymes") y tocá Reintentar.</p>');
  }
}

// ------------------------------------------------------------ Formularios

function formEntidad(circ, c) {
  c = c || {};
  const venta = circ === 'VENTA';
  const campos = [
    { n: 'nombre', label: 'Nombre o razón social', req: true, valor: c.nombre }, { n: 'cuit', label: 'CUIT', valor: c.cuit },
    { n: 'cond_iva', label: 'Condición frente al IVA', tipo: 'select', valor: c.cond_iva, opciones: [['', '—'], ['Monotributo', 'Monotributo'], ['Responsable Inscripto', 'Responsable Inscripto'], ['Exento', 'Exento'], ['Consumidor Final', 'Consumidor Final']] },
    { n: 'contacto', label: 'Persona de contacto', valor: c.contacto },
    { n: 'email', label: 'Email', tipo: 'email', valor: c.email }, { n: 'telefono', label: 'Teléfono', valor: c.telefono }];
  if (venta) campos.push({ n: 'dia_limite', label: 'Día límite de cobro', tipo: 'number', step: 1, min: 1, max: 31, valor: c.dia_limite, ayuda: 'Vacío: se usa el día general (' + (S.config.dia_limite_default || 10) + ').' });
  campos.push({ n: 'notas', label: 'Notas', tipo: 'textarea', valor: c.notas });
  if (c.id) campos.push({ n: 'activo', label: 'Estado', tipo: 'select', valor: c.activo === 'NO' ? 'NO' : 'SI', opciones: [['SI', 'Activo'], ['NO', 'Inactivo']] });
  abrirForm({ titulo: (c.id ? 'Editar ' : 'Nuevo ') + CIR[circ].ent, campos: campos, despues: false, ok: async v => {
    if (c.id) v.id = c.id;
    const g = await api(venta ? 'clientes.guardar' : 'proveedores.guardar', v);
    const lista = CIR[circ].ents(), i = lista.findIndex(x => x.id === g.id);
    if (i >= 0) lista[i] = g; else lista.push(g);
    toast((venta ? 'Cliente' : 'Proveedor') + ' guardado.', 'ok');
    ir(CIR[circ].vFicha, g.id);
  } });
}

/**
 * Nuevo comprobante. En compras (salvo notas de crédito), al registrarlo se pregunta si ya fue pagado:
 * si lo fue, se carga el pago en el mismo paso; si no, queda pendiente en Cuentas a pagar.
 */
// ------------------------------------------------------------ IVA y moneda (bloque 2)
function esRI() { return !!(S.config && S.config.responsable_inscripto === 'SI'); }
const TASAS = [['21', '21 %'], ['10.5', '10,5 %'], ['27', '27 %'], ['5', '5 %'], ['2.5', '2,5 %'], ['0', '0 %']];
const NETOS = [[21, 'neto_21', 'Neto gravado 21 %'], [10.5, 'neto_105', 'Neto gravado 10,5 %'], [27, 'neto_27', 'Neto gravado 27 %']];

/** Mismo cálculo que el servidor: líneas en la moneda original, pasadas a pesos una por una. */
function calcularComp(v) {
  const tc = v.moneda === 'USD' ? Number(v.tipo_cambio) || 0 : 1, ps = x => r2(x * tc);
  let neto = 0, iva = 0, otros = 0, orig;
  if (esRI() && v.modo === 'neto') {
    NETOS.forEach(([t, k]) => { const n = r2(v[k]); neto += ps(n); iva += ps(r2(n * t / 100)); });
    otros = ps(r2(v.no_gravado_exento)) + ps(r2(v.otros_tributos));
    orig = NETOS.reduce((a, [t, k]) => a + r2(v[k]) + r2(r2(v[k]) * t / 100), 0) + r2(v.no_gravado_exento) + r2(v.otros_tributos);
  } else if (esRI() && v.modo === 'total') {
    const tot = r2(v.importe), n = r2(tot / (1 + Number(v.tasa) / 100));
    neto = ps(n); iva = ps(r2(tot - n)); orig = tot;
  } else { orig = r2(v.importe); return { total: ps(orig), iva: 0, orig: orig }; }
  return { total: r2(neto + iva + otros), iva: r2(iva), orig: r2(orig) };
}

/** Lo que viaja al servidor según el modo elegido. */
function payloadComp(v) {
  const d = Object.assign({}, v);
  if (esRI() && d.modo === 'neto') {
    d.alicuotas = NETOS.map(([t, k]) => ({ tasa: t, neto: Number(d[k]) || 0 })).filter(a => a.neto);
    delete d.importe; delete d.tasa;
  } else if (esRI() && d.modo === 'total') { /* importe + tasa */ }
  else { delete d.modo; delete d.tasa; delete d.no_gravado_exento; delete d.otros_tributos; }
  NETOS.forEach(([, k]) => delete d[k]);
  if (d.moneda !== 'USD') { delete d.tipo_cambio; d.moneda = 'ARS'; }
  return d;
}

function formComprobante(circ, entidadId) {
  const C = CIR[circ];
  if (!optEnt(circ).length) return toast('Primero cargá un ' + C.ent + '.', 'error');
  if (!optConceptos(C.conceptoTipo).length) return toast('Primero creá un concepto de ' + (circ === 'VENTA' ? 'ingreso' : 'gasto') + ' en Configuración.', 'error');
  const compra = circ === 'COMPRA';
  const campos = [
    { n: 'tipo', label: 'Tipo', tipo: 'select', opciones: Object.keys(C.tipos).map(k => [k, C.tipos[k]]) },
    { n: 'entidad_id', label: C.Ent, tipo: 'select', opciones: optEnt(circ), valor: entidadId, req: true },
    { n: 'concepto_id', label: 'Concepto', tipo: 'select', opciones: optConceptos(C.conceptoTipo), req: true },
    { n: 'fecha', label: 'Fecha', tipo: 'date', valor: hoy(), req: true },
    { n: 'moneda', label: 'Moneda', tipo: 'select', opciones: [['ARS', 'Pesos'], ['USD', 'Dólares']], valor: 'ARS' },
    { n: 'tipo_cambio', label: 'Tipo de cambio', tipo: 'number', step: 'any', min: 0.0001, ayuda: 'El del comprobante. Todo se registra en pesos y queda anotado el importe en dólares.' }]
    .concat(esRI() ? [
      { n: 'modo', label: 'Cómo lo cargás', tipo: 'select', valor: 'neto', opciones: [['neto', 'Por neto (discrimina IVA)'], ['total', 'Total con IVA incluido'], ['sin', compra ? 'Sin IVA (factura C, monotributista, recibo)' : 'Sin discriminar IVA']] }]
      .concat(NETOS.map(([, k, l]) => ({ n: k, label: l, tipo: 'number', step: 0.01, min: 0 })))
      .concat([{ n: 'no_gravado_exento', label: 'No gravado o exento', tipo: 'number', step: 0.01, min: 0 },
        { n: 'otros_tributos', label: compra ? 'Percepciones y retenciones' : 'Otros tributos', tipo: 'number', step: 0.01, min: 0, ayuda: 'Todo junto, en un solo importe.' },
        { n: 'tasa', label: 'Alícuota de IVA', tipo: 'select', opciones: TASAS, valor: '21' }]) : [])
    .concat([
    { n: 'importe', label: 'Importe total', tipo: 'number', min: 0.01, req: true },
    { n: 'detalle', label: 'Detalle' },
    { n: 'vencimiento', label: compra ? 'Vence el' : 'Fecha límite de cobro', tipo: 'date', valor: compra ? hoy() : '',
      ayuda: compra ? 'Fecha en que hay que pagarlo. Se usa para los avisos en Inicio.' : 'Vacío: se calcula con el día límite del cliente.' },
    { n: 'aplica_a', label: 'Aplicar a', tipo: 'select', opciones: [['', 'No aplicar (queda a cuenta)']] },
    { n: 'nro_factura_real', label: C.nroLargo }]);
  let datos = null;

  function paso1() {
    abrirModal('<h2>Nuevo comprobante de ' + (compra ? 'compra' : 'venta') + '</h2><p class="muted small" style="margin-bottom:12px">' +
      (compra ? 'Solo gastos de Sipymes. El número interno lo asigna el sistema.' : 'Comprobante interno, sin efecto fiscal. El número lo asigna el sistema.') + '</p>' +
      '<form id="form" class="form">' + campos.map(campoHtml).join('') +
      '<div class="modal-pie"><button type="button" class="btn" data-act="cerrar">Cancelar</button><button type="submit" class="btn btn-primary">' + (compra ? 'Continuar' : 'Emitir') + '</button></div></form>');
    if (datos) campos.forEach(c => { if (datos[c.n] !== undefined && c.n !== 'aplica_a') $('#f-' + c.n).value = datos[c.n]; });
    const tipo = $('#f-tipo'), ent = $('#f-entidad_id'), fec = $('#f-fecha'), ven = $('#f-vencimiento');
    $('#c-importe').insertAdjacentHTML('afterend', '<div class="campo" id="c-calc"><div class="resumen"><div><b>Total en pesos</b><span id="calc-det"></span></div><b class="num" id="calc-tot"></b></div></div>');
    function montos() {
      const v = valores(campos), ri = esRI(), modo = ri ? v.modo : '';
      const usd = v.moneda === 'USD', porNeto = modo === 'neto';
      $('#c-tipo_cambio').classList.toggle('hidden', !usd); $('#f-tipo_cambio').required = usd;
      NETOS.forEach(([, k]) => $('#c-' + k) && $('#c-' + k).classList.toggle('hidden', !porNeto));
      ['no_gravado_exento', 'otros_tributos'].forEach(k => $('#c-' + k) && $('#c-' + k).classList.toggle('hidden', !porNeto));
      if ($('#c-tasa')) $('#c-tasa').classList.toggle('hidden', modo !== 'total');
      $('#c-importe').classList.toggle('hidden', porNeto); $('#f-importe').required = !porNeto;
      $('#c-importe label').textContent = modo === 'total' ? 'Total con IVA incluido' : 'Importe total';
      const c = calcularComp(v);
      $('#c-calc').classList.toggle('hidden', !(usd || (ri && modo !== 'sin')));
      $('#calc-tot').textContent = plata(c.total);
      $('#calc-det').textContent = (ri && modo !== 'sin' ? 'IVA ' + plata(c.iva) : '') + (usd ? (ri && modo !== 'sin' ? ' · ' : '') + 'US$ ' + c.orig.toLocaleString('es-AR', { minimumFractionDigits: 2 }) : '');
    }
    $('#form').addEventListener('input', montos); $('#form').addEventListener('change', montos);
    const conTasa = () => { const c = S.conceptos.find(x => x.id === $('#f-concepto_id').value); if (c && c.alicuota !== '' && c.alicuota !== undefined && $('#f-tasa')) $('#f-tasa').value = String(c.alicuota); };
    if (!datos) conTasa();
    $('#f-concepto_id').addEventListener('change', conTasa);
    montos();
    async function ajustar() {
      const nc = tipo.value === C.credito;
      $('#c-aplica_a').classList.toggle('hidden', !nc);
      $('#c-vencimiento').classList.toggle('hidden', nc);
      $('#form button[type=submit]').textContent = compra && !nc ? 'Continuar' : 'Emitir';
      if (!nc || !ent.value) return;
      try {
        const p = await api(C.pre + '.pendientes', { entidad_id: ent.value }, { silencioso: true, red: true });
        $('#f-aplica_a').innerHTML = '<option value="">No aplicar (queda a cuenta)</option>' +
          p.comprobantes.map(x => '<option value="' + x.id + '">' + esc(x.id) + ' – pendiente ' + plata(x.pendiente) + '</option>').join('');
        if (datos && datos.aplica_a) $('#f-aplica_a').value = datos.aplica_a;
      } catch (e) { toast(e.message, 'error'); }
    }
    let venTocado = !!(datos && datos.vencimiento !== datos.fecha);
    ven.addEventListener('input', () => { venTocado = true; });
    fec.addEventListener('change', () => { if (compra && !venTocado) ven.value = fec.value; });
    tipo.addEventListener('change', ajustar); ent.addEventListener('change', ajustar);
    ajustar();
    $('#form').addEventListener('submit', e => {
      e.preventDefault();
      datos = valores(campos);
      if (esRI() && datos.modo === 'neto' && !(calcularComp(datos).total > 0)) return toast('Cargá algún importe.', 'error');
      datos.importe_calc = calcularComp(datos).total;
      if (compra && datos.tipo !== C.credito) paso2(); else emitir(null);
    });
  }

  function resumen() {
    return '<div class="resumen"><div><b>' + esc(entidad(circ, datos.entidad_id).nombre) + '</b><span>' + esc(C.tipos[datos.tipo]) + ' del ' + fecha(datos.fecha) +
      (datos.nro_factura_real ? ' · ' + esc(datos.nro_factura_real) : '') + '</span></div><b class="num">' + plata(datos.importe_calc) + '</b></div>';
  }

  // El cartel: ¿ya fue pagado?
  function paso2() {
    abrirModal('<h2>¿Este comprobante ya fue pagado?</h2>' + resumen() +
      '<div class="eleccion">' +
      '<button type="button" class="opcion" id="op-si">' + ico('task_alt') + '<b>Sí, ya está pagado</b><span>Registro el pago ahora y queda cancelado.</span></button>' +
      '<button type="button" class="opcion" id="op-no">' + ico('schedule') + '<b>No, lo pago después</b><span>Queda pendiente en Cuentas a pagar.</span></button></div>' +
      '<div class="modal-pie"><button type="button" class="btn" id="op-volver">' + ico('arrow_back') + 'Volver</button></div>');
    $('#op-volver').onclick = paso1;
    $('#op-no').onclick = () => emitir(null);
    $('#op-si').onclick = paso3;
    if (!optCuentas().length) { $('#op-si').disabled = true; $('#op-si').querySelector('span').textContent = 'Primero creá una cuenta de tesorería en Configuración.'; }
  }

  function paso3() {
    const cp = [
      { n: 'cuenta_id', label: 'Pagado desde', tipo: 'select', opciones: optCuentas(), req: true },
      { n: 'fecha', label: 'Fecha de pago', tipo: 'date', valor: datos.fecha, req: true },
      { n: 'importe', label: 'Importe pagado (en pesos)', tipo: 'number', min: 0.01, max: datos.importe_calc, valor: datos.importe_calc, req: true, ayuda: 'Si pagaste una parte, el resto queda pendiente.' },
      { n: 'detalle', label: 'Detalle del pago (opcional)' }];
    abrirModal('<h2>Registrar el pago</h2>' + resumen() +
      '<form id="form" class="form">' + cp.map(campoHtml).join('') +
      '<div class="modal-pie"><button type="button" class="btn" id="op-volver">' + ico('arrow_back') + 'Volver</button><button type="submit" class="btn btn-primary">Registrar compra y pago</button></div></form>');
    $('#op-volver').onclick = paso2;
    $('#form').addEventListener('submit', e => { e.preventDefault(); emitir(valores(cp)); });
  }

  async function emitir(pago) {
    const d = payloadComp(datos);
    delete d.importe_calc;
    if (d.tipo === C.credito) delete d.vencimiento; else delete d.aplica_a;
    if (pago) d.pago = pago;
    try {
      const c = await api(C.comp + '.emitir', d);
      cerrarModal();
      toast('Registrado ' + c.id + (c.pago ? ' y pagado con ' + c.pago.id + (c.pago.imputado < c.importe ? ' (queda pendiente ' + plata(c.importe - c.pago.imputado) + ')' : '') : '') + '.', 'ok');
      recargar();
    } catch (e) { toast(e.message, 'error'); }
  }
  paso1();
}

/** Recibo de cobro u orden de pago, con imputación a los comprobantes pendientes. */
function formCancelacion(circ, entidadId) {
  const C = CIR[circ];
  if (!optEnt(circ).length) return toast('Primero cargá un ' + C.ent + '.', 'error');
  if (!optCuentas().length) return toast('Primero creá una cuenta de tesorería en Configuración.', 'error');
  const campos = [
    { n: 'entidad_id', label: C.Ent, tipo: 'select', opciones: optEnt(circ), valor: entidadId, req: true },
    { n: 'fecha', label: 'Fecha', tipo: 'date', valor: hoy(), req: true },
    { n: 'cuenta_id', label: C.cuentaTxt, tipo: 'select', opciones: optCuentas(), req: true },
    { n: 'importe', label: circ === 'VENTA' ? 'Importe cobrado' : 'Importe pagado', tipo: 'number', min: 0.01, req: true },
    { n: 'detalle', label: 'Detalle' }];
  let pend = [];
  abrirForm({ titulo: C.Verbo, campos: campos, textoOk: circ === 'VENTA' ? 'Continuar' : 'Emitir orden de pago', ok: async v => {
    v.imputaciones = pend.map(p => ({ comprobante_id: p.id, importe: Number($('#imp-' + p.id).value) || 0 })).filter(i => i.importe > 0);
    if (circ === 'VENTA' && puede('tesoreria')) return cartelRetiro(v);
    const r = await api(C.nuevaCanc, v);
    toast(C.Canc + ' ' + r.id + ' emitido' + (r.a_cuenta > 0 ? '. Quedan ' + plata(r.a_cuenta) + ' a cuenta.' : '.'), 'ok');
  } });
  const sel = $('#f-entidad_id'), imp = $('#f-importe'), extra = $('#f-extra');
  function resto() {
    const usado = pend.reduce((a, p) => a + (Number($('#imp-' + p.id).value) || 0), 0), r = r2((Number(imp.value) || 0) - usado);
    $('#imp-resto').innerHTML = r < 0 ? '<span class="neg">Las imputaciones superan el importe en ' + plata(-r) + '</span>' : 'Queda a cuenta: <b>' + plata(r) + '</b>';
  }
  function distribuir() {
    let r = Number(imp.value) || 0;
    pend.forEach(p => { const m = Math.min(r, p.pendiente); $('#imp-' + p.id).value = m > 0 ? r2(m) : ''; r = r2(r - m); });
    resto();
  }
  async function cargar() {
    extra.innerHTML = '<p class="muted small">Buscando comprobantes pendientes…</p>';
    try { pend = (await api(C.pre + '.pendientes', { entidad_id: sel.value }, { silencioso: true, red: true })).comprobantes; } catch (e) { pend = []; toast(e.message, 'error'); }
    if (!imp.value || imp.dataset.auto) { imp.value = r2(pend.reduce((a, p) => a + p.pendiente, 0)) || ''; imp.dataset.auto = '1'; }
    extra.innerHTML = '<div class="campo"><label>Se aplica a</label>' + (pend.length ? '<div class="imputa">' + pend.map(p =>
      '<span>' + esc(p.id) + ' <span class="muted small">vence ' + fecha(p.vencimiento) + '</span></span><span class="pend num muted">' + plata(p.pendiente) + '</span>' +
      '<input type="number" step="0.01" min="0" max="' + p.pendiente + '" id="imp-' + p.id + '" inputmode="decimal" aria-label="Importe a aplicar a ' + esc(p.id) + '">').join('') + '</div>'
      : '<p class="muted small">No hay comprobantes pendientes: el importe queda a cuenta.</p>') + '<small id="imp-resto"></small></div>';
    pend.forEach(p => $('#imp-' + p.id).addEventListener('input', resto));
    distribuir();
  }
  sel.addEventListener('change', cargar);
  imp.addEventListener('input', () => { delete imp.dataset.auto; distribuir(); });
  cargar();
}

/**
 * Después de cargar un cobro: "¿Te llevás esta plata a tus finanzas?".
 * Sí → se registran el cobro y el retiro juntos (el retiro va a la app de gastos). No → queda en Sipymes.
 * Devuelve una promesa que se resuelve cuando el cobro quedó registrado o se canceló.
 */
function cartelRetiro(v) {
  return new Promise(resolve => {
    const cli = entidad('VENTA', v.entidad_id).nombre;
    const resumen = '<div class="resumen"><div><b>' + esc(cli) + '</b><span>Cobro del ' + fecha(v.fecha) + '</span></div><b class="num">' + plata(v.importe) + '</b></div>';
    async function emitir(retiro) {
      try {
        const r = await api('cobrar.recibo', Object.assign({}, v, retiro ? { retiro: retiro } : {}));
        let t = 'Recibo ' + r.id + ' emitido' + (r.a_cuenta > 0 ? '. Quedan ' + plata(r.a_cuenta) + ' a cuenta' : '');
        if (r.retiro) t += '. Retiro de ' + plata(r.retiro.importe) + (S.modo !== 'COMPLETO' ? ' registrado.' : r.retiro.gastos_estado === 'ENVIADO' ? ' enviado a tu app de gastos.' : ' registrado; queda pendiente de pasar a tu app de gastos.');
        else t += '.';
        toast(t, 'ok');
        resolve();
      } catch (e) { toast(e.message, 'error'); }
    }
    function preguntar() {
      abrirModal('<h2>¿Te llevás esta plata a tus finanzas?</h2>' + resumen +
        '<div class="eleccion">' +
        '<button type="button" class="opcion" id="rt-si">' + ico('savings') + '<b>Sí, me la llevo</b><span>Toda o una parte. Se registra el retiro' + (S.modo === 'COMPLETO' ? ' y pasa a tu app de gastos como "' + esc(cli) + ' - Honorarios ' + v.fecha.slice(5, 7) + '/' + v.fecha.slice(0, 4) + '"' : '') + '.</span></button>' +
        '<button type="button" class="opcion" id="rt-no">' + ico('account_balance') + '<b>No, queda en ' + esc(S.config.empresa || 'la empresa') + '</b><span>Solo se registra el cobro.</span></button></div>' +
        '<div class="modal-pie"><button type="button" class="btn" id="rt-cancelar">Cancelar</button></div>');
      $('#rt-si').onclick = monto;
      $('#rt-no').onclick = () => emitir(null);
      $('#rt-cancelar').onclick = () => { cerrarModal(); resolve(); };
    }
    function monto() {
      abrirModal('<h2>Retiro a tus finanzas</h2>' + resumen + '<form id="form-rt" class="form">' +
        '<div class="campo"><label for="rt-total">Total cobrado</label><input id="rt-total" type="text" value="' + plata(v.importe) + '" disabled></div>' +
        '<label class="check-linea"><input type="checkbox" id="rt-todo"> Retirar todo</label>' +
        '<div class="campo"><label for="rt-importe">Importe que te llevás</label><input id="rt-importe" type="number" step="0.01" min="0.01" max="' + v.importe + '" inputmode="decimal" required autocomplete="off">' +
        '<small>' + (S.modo === 'COMPLETO' ? 'Es lo que pasa a tu app de gastos. ' : '') + 'Lo que no retirás queda en la cuenta de ' + esc(S.config.empresa || 'la empresa') + '.</small></div>' +
        campoHtml({ n: 'fecha', label: 'Fecha del retiro', tipo: 'date', valor: v.fecha, req: true }) +
        '<div class="modal-pie"><button type="button" class="btn" id="rt-volver">' + ico('arrow_back') + 'Volver</button><button type="submit" class="btn btn-primary">Registrar cobro y retiro</button></div></form>');
      const todo = $('#rt-todo'), imp = $('#rt-importe');
      todo.addEventListener('change', () => {
        imp.disabled = todo.checked;
        imp.value = todo.checked ? v.importe : '';
        if (!todo.checked) imp.focus();
      });
      $('#rt-volver').onclick = preguntar;
      $('#form-rt').addEventListener('submit', e => {
        e.preventDefault();
        const importe = todo.checked ? Number(v.importe) : Number(imp.value);
        if (!(importe > 0)) return toast('Completá el importe que te llevás, o tildá "Retirar todo".', 'error');
        if (importe > Number(v.importe)) return toast('No podés retirar más de lo cobrado (' + plata(v.importe) + ').', 'error');
        emitir({ importe: importe, fecha: $('#f-fecha').value });
      });
      if (window.innerWidth > 860) imp.focus();
    }
    preguntar();
  });
}

const ESTADO_GASTOS = {
  ENVIADO: ['verde', 'En app de gastos'], PENDIENTE: ['ambar', 'Sin enviar'], ERROR: ['ambar', 'Sin enviar'],
  BORRADO: ['', 'Borrado de app de gastos'], NO_ENVIADO: ['', 'No enviado'], NO_ENVIAR: ['', 'No se envía'], BORRAR_ERROR: ['rojo', 'Falta borrar en app de gastos']
};
function chipGastos(m) {
  if (S.modo !== 'COMPLETO') return '';
  const e = ESTADO_GASTOS[m.gastos_estado];
  return e ? ' <span class="chip ' + e[0] + '"' + (m.gastos_error ? ' title="' + esc(m.gastos_error) + '"' : '') + '>' + e[1] + '</span>' : '';
}

function formAnular(titulo, accion, id) {
  abrirForm({ titulo: titulo + ' ' + id, peligro: true, textoOk: 'Anular', nota: 'No se borra: queda anulado y conserva su número.',
    campos: [{ n: 'motivo', label: 'Motivo', req: true }], ok: async v => { await api(accion, { id: id, motivo: v.motivo }); toast(id + ' anulado.', 'ok'); } });
}

function formMaestro(titulo, accion, o, tipos) {
  o = o || {};
  const campos = [{ n: 'nombre', label: 'Nombre', req: true, valor: o.nombre }, { n: 'tipo', label: 'Tipo', tipo: 'select', opciones: tipos, valor: o.tipo }];
  if (accion === 'conceptos.guardar') {
    campos.push({ n: 'rubro', label: 'Rubro', valor: o.rubro });
    const apps = (S.apps || []).map(a => [a.id, a.id + ' – ' + a.nombre]);
    if (o.app && !apps.some(a => a[0] === o.app)) apps.push([o.app, o.app]);
    campos.push({ n: 'app', label: 'App de la MAESTRA', tipo: 'select', valor: o.app || '', opciones: [['', 'Ninguna']].concat(apps),
      ayuda: 'Solo para ingresos. Las ventas de este concepto pasan a la MAESTRA (abonos a CUOTAS, el resto a VENTAS).' });
    if (esRI()) campos.push({ n: 'alicuota', label: 'Alícuota de IVA habitual', tipo: 'select', valor: o.alicuota === undefined ? '' : String(o.alicuota), opciones: [['', 'Sin IVA / no definida']].concat(TASAS),
      ayuda: 'Se propone al cargar comprobantes. En los abonos, el importe se toma con IVA incluido y se desglosa con esta alícuota.' });
  }
  if (o.id) campos.push({ n: 'activo', label: 'Estado', tipo: 'select', valor: o.activo === 'NO' ? 'NO' : 'SI', opciones: [['SI', 'Activo'], ['NO', 'Inactivo']] });
  abrirForm({ titulo: titulo, campos: campos, ok: async v => { if (o.id) v.id = o.id; await api(accion, v); toast('Guardado.', 'ok'); await cargarMaestros(); } });
}

async function verEstado(circ, id, v) {
  const C = CIR[circ];
  const e = await api(C.pre + '.estadoCuenta', { entidad_id: id, desde: v.desde, hasta: v.hasta });
  S.ec = { circ: circ, datos: { entidad_id: id, desde: v.desde, hasta: v.hasta } };
  abrirModal('<h2>' + (circ === 'VENTA' ? 'Estado de cuenta' : 'Cuenta corriente') + ' – ' + esc(e.entidad.nombre) + '</h2>' +
    '<p class="muted small" style="margin-bottom:10px">' + (v.desde || v.hasta ? 'Del ' + (fecha(v.desde) || 'inicio') + ' al ' + (fecha(v.hasta) || fecha(hoy())) : 'Completo al ' + fecha(hoy())) + '</p>' +
    tabla([{ t: 'Fecha' }, { t: 'Comprobante' }, { t: 'Detalle', c: 'hm' }, { t: e.cols[0], c: 'num' }, { t: e.cols[1], c: 'num' }, { t: 'Saldo', c: 'num' }],
      [{ c: ['', '', 'Saldo anterior', '', '', plata(e.saldo_anterior)] }].concat(e.lineas.map(l => ({ c: [fecha(l.fecha), esc(l.comprobante), esc(l.detalle), l.debe ? plata(l.debe) : '', l.haber ? plata(l.haber) : '', plata(l.saldo)] }))),
      ['', '', 'Saldo', '', '', plata(e.saldo)]) +
    '<div class="modal-pie" style="margin-top:14px">' + boton('cerrar', 'Cerrar') + boton('pdf', 'Descargar PDF', 'picture_as_pdf', '', 'btn-primary') + '</div>', true);
}

// ------------------------------------------------------------ Acciones (clics)

const ACT = {
  nav: d => ir(d.v),
  mas: () => abrirModal('<h2>Menú</h2><div class="menu-mas">' + NAV.filter(n => navVisible(n[0])).map(n => '<button class="nav-btn' + ((PADRE[S.vista] || S.vista) === n[0] ? ' active' : '') +
    '" data-act="navMas" data-v="' + n[0] + '">' + ico(n[1]) + '<span>' + n[2] + '</span></button>').join('') + '</div>'),
  navMas: d => { cerrarModal(); ir(d.v); },
  recargar: () => recargar(),
  cerrar: () => cerrarModal(),
  entNuevo: d => formEntidad(circDe(d)),
  entVer: d => ir(CIR[circDe(d)].vFicha, d.id),
  entEditar: d => formEntidad(circDe(d), entidad(circDe(d), d.id)),
  cuenta: d => ir(CIR[circDe(d)].vCuenta, d.id),
  comprasTab: d => { S.comprasTab = d.v; recargar(); },
  aboNuevo: d => {
    if (!optConceptos('INGRESO').length) return toast('Primero creá un concepto de ingreso en Configuración.', 'error');
    abrirForm({ titulo: 'Nuevo abono o aumento', nota: 'Rige para las facturas que se generen desde la fecha de vigencia. Importe 0 = baja del abono.', campos: [
      { n: 'concepto_id', label: 'Concepto', tipo: 'select', opciones: optConceptos('INGRESO'), req: true },
      { n: 'importe', label: 'Importe mensual', tipo: 'number', req: true },
      { n: 'vigencia_desde', label: 'Vigente desde', tipo: 'date', valor: mesRel(1) + '-01', req: true },
      { n: 'detalle', label: 'Detalle para la factura (opcional)' }],
    ok: async v => { v.cliente_id = d.id; await api('abonos.guardar', v); toast('Abono guardado.', 'ok'); } });
  },
  aboAnular: d => abrirForm({ titulo: 'Anular abono ' + d.id, peligro: true, textoOk: 'Anular', nota: 'Usalo solo si se cargó por error. Para una baja, cargá un abono con importe 0.', campos: [],
    ok: async () => { await api('abonos.anular', { id: d.id }); toast('Abono anulado.', 'ok'); } }),
  compNuevo: d => formComprobante(circDe(d), d.id),
  compAnular: d => formAnular('Anular', CIR[circDe(d)].comp + '.anular', d.id),
  compNro: d => {
    const C = CIR[circDe(d)];
    abrirForm({ titulo: C.nroCorto + ' de ' + d.id, campos: [{ n: 'nro_factura_real', label: C.nroLargo.replace(' (opcional)', ''), valor: d.v }],
      ok: async v => { await api(C.accionNro, { id: d.id, nro_factura_real: v.nro_factura_real }); toast('Guardado.', 'ok'); } });
  },
  venAbonos: () => abrirForm({ titulo: 'Generar abonos del mes', textoOk: 'Generar', nota: 'Crea la factura interna de cada cliente con abono vigente. No duplica las que ya existen.',
    campos: [{ n: 'periodo', label: 'Período', tipo: 'month', valor: mesActual(), req: true }],
    ok: async v => { const r = await api('ventas.generarAbonos', v); S.fComp.VENTA.mes = r.periodo; toast(r.creados.length ? r.creados.length + ' factura(s) generada(s).' : 'No había abonos pendientes de generar.', 'ok'); } }),
  cancNueva: d => formCancelacion(circDe(d), d.id),
  cancAnular: d => formAnular('Anular', CIR[circDe(d)].anularCanc, d.id),
  credAplicar: d => {
    const comps = S.pend.comprobantes, max = Number(d.max), C = CIR[circDe(d)];
    abrirForm({ titulo: 'Aplicar crédito ' + d.id, textoOk: 'Aplicar', campos: [
      { n: 'comprobante_id', label: 'Comprobante', tipo: 'select', opciones: comps.map(x => [x.id, x.id + ' – pendiente ' + plata(x.pendiente)]), req: true },
      { n: 'importe', label: 'Importe', tipo: 'number', min: 0.01, valor: Math.min(max, comps[0].pendiente), req: true, ayuda: 'Disponible: ' + plata(max) }],
    ok: async v => { v.origen_id = d.id; await api(C.pre + '.imputar', v); toast('Crédito aplicado.', 'ok'); } });
  },
  estado: d => abrirForm({ titulo: circDe(d) === 'VENTA' ? 'Estado de cuenta' : 'Cuenta corriente', textoOk: 'Ver', despues: false, nota: 'Dejá las fechas vacías para ver la cuenta completa.',
    campos: [{ n: 'desde', label: 'Desde', tipo: 'date' }, { n: 'hasta', label: 'Hasta', tipo: 'date' }],
    ok: async v => { setTimeout(() => verEstado(circDe(d), d.id, v).catch(e => toast(e.message, 'error')), 0); } }),
  pdf: () => descargarPdf(CIR[S.ec.circ].pre + '.estadoCuentaPdf', S.ec.datos),
  movNuevo: () => {
    if (!optCuentas().length) return toast('Primero creá una cuenta de tesorería en Configuración.', 'error');
    abrirForm({ titulo: 'Movimiento de tesorería', nota: 'Para saldos iniciales y ajustes. Los cobros y pagos entran solos con cada recibo u orden de pago.', campos: [
      { n: 'cuenta_id', label: 'Cuenta', tipo: 'select', opciones: optCuentas(), req: true },
      { n: 'origen', label: 'Motivo', tipo: 'select', opciones: [['SALDO_INICIAL', 'Saldo inicial'], ['AJUSTE', 'Ajuste']] },
      { n: 'tipo', label: 'Tipo', tipo: 'select', opciones: [['INGRESO', 'Ingreso'], ['EGRESO', 'Egreso']] },
      { n: 'fecha', label: 'Fecha', tipo: 'date', valor: hoy(), req: true },
      { n: 'importe', label: 'Importe', tipo: 'number', min: 0.01, req: true },
      { n: 'detalle', label: 'Detalle' }],
    ok: async v => { const m = await api('tesoreria.movimiento', v); toast('Movimiento ' + m.id + ' registrado.', 'ok'); } });
  },
  trfNueva: () => {
    if (optCuentas().length < 2) return toast('Hacen falta al menos dos cuentas de tesorería.', 'error');
    abrirForm({ titulo: 'Transferencia entre cuentas', textoOk: 'Transferir', campos: [
      { n: 'cuenta_origen_id', label: 'Sale de', tipo: 'select', opciones: optCuentas(), req: true },
      { n: 'cuenta_destino_id', label: 'Entra en', tipo: 'select', opciones: optCuentas(), valor: optCuentas()[1][0], req: true },
      { n: 'fecha', label: 'Fecha', tipo: 'date', valor: hoy(), req: true },
      { n: 'importe', label: 'Importe', tipo: 'number', min: 0.01, req: true },
      { n: 'detalle', label: 'Detalle' }],
    ok: async v => { const t = await api('tesoreria.transferencia', v); toast('Transferencia ' + t.id + ' registrada.', 'ok'); } });
  },
  movAnular: d => formAnular('Anular movimiento', 'tesoreria.anular', d.id),
  retNuevo: async () => {
    if (!optCuentas().length) return toast('Primero creá una cuenta de tesorería en Configuración.', 'error');
    const cobros = await api('tesoreria.paraRetirar', {}, { red: true });
    abrirForm({ titulo: 'Retiro a tus finanzas', nota: 'Plata que te llevás de la empresa. Si viene de un cobro que ya registraste, elegilo: así figura con ese cliente en "Cobrado vs. retirado".', campos: [
      { n: 'recibo_id', label: '¿De qué cobro?', tipo: 'select', opciones: [['', 'Ninguno: retiro general']].concat(cobros.map(c => [c.id, fecha(c.fecha) + ' – ' + c.cliente + ' – quedan ' + plata(c.disponible)])) },
      { n: 'cuenta_id', label: 'Sale de', tipo: 'select', opciones: optCuentas(), req: true },
      { n: 'fecha', label: 'Fecha', tipo: 'date', valor: hoy(), req: true },
      { n: 'importe', label: 'Importe', tipo: 'number', min: 0.01, req: true },
      { n: 'detalle', label: 'Detalle', valor: 'Retiro personal', req: true },
      { n: 'no_enviar', label: 'Ya lo cargué en mi app de gastos (no enviarlo)', tipo: 'check', oculto: S.modo !== 'COMPLETO' }],
    textoOk: 'Registrar retiro',
    ok: async v => {
      const m = await api('tesoreria.retiro', v);
      toast('Retiro ' + m.id + (m.gastos_estado === 'ENVIADO' ? ' registrado y enviado a tu app de gastos.' : m.gastos_estado === 'NO_ENVIAR' ? ' registrado (no se manda a tu app de gastos).' : ' registrado; queda pendiente de pasar a tu app de gastos.'), 'ok');
    } });
    $('#f-recibo_id').addEventListener('change', () => {
      const c = cobros.find(x => x.id === $('#f-recibo_id').value), imp = $('#f-importe');
      $('#c-detalle').style.display = c ? 'none' : '';
      $('#f-detalle').required = !c;
      if (c) { imp.value = c.disponible; imp.max = c.disponible; if (c.cuenta_id) $('#f-cuenta_id').value = c.cuenta_id; }
      else imp.removeAttribute('max');
    });
  },
  gastosReintentar: async () => {
    const r = await api('gastos.reintentar');
    toast(r.pendientes.length ? 'Quedan ' + r.pendientes.length + ' sin resolver: ' + (r.pendientes[0].error || '') : 'Listo: todo al día con tu app de gastos.', r.pendientes.length ? 'error' : 'ok');
    recargar();
  },
  gastosVincular: async () => {
    const url = $('#g-url').value.trim();
    if (!url) return toast('Pegá la dirección de tu app de gastos.', 'error');
    const e = await api('gastos.vincular', { url: url });
    toast(e.estado === 'aprobado' ? 'Vinculada.' : 'Listo. Ahora aprobá el dispositivo en tu app de gastos.', 'ok');
    pintarGastos(e);
  },
  gastosActualizar: async () => pintarGastos(await api('gastos.estado')),
  gastosGuardar: async () => {
    const r = await api('gastos.configurar', { categoria: $('#g-cat').value, subcategoria: $('#g-sub').value, medio: $('#g-medio').value });
    toast('Guardado.' + (r.enviados ? ' Se enviaron ' + r.enviados + ' retiro(s) pendientes.' : ''), 'ok');
    pintarGastos(await api('gastos.estado'));
  },
  gastosDesvincular: () => abrirForm({ titulo: 'Desvincular la app de gastos', peligro: true, textoOk: 'Desvincular', despues: false, campos: [],
    nota: 'Los retiros nuevos dejan de pasar a tu app de gastos hasta que la vincules de nuevo. Lo que ya se mandó queda allá. Si querés, después quitá el dispositivo "Si-Gestión (Sipymes)" en tu app de gastos.',
    ok: async () => { await api('gastos.desvincular'); toast('Desvinculada.', 'ok'); pintarGastos(await api('gastos.estado')); } }),
  infTipo: d => { S.inf.tipo = d.v; recargar(); },
  infExcel: () => {
    if (!S.infDatos) return toast('Esperá a que cargue el informe.', 'error');
    const t = INFORMES.find(x => x[0] === S.inf.tipo)[1];
    descargar(xlsx(hojasInforme()), t + ' - ' + hoy() + '.xlsx');
  },
  infPdf: () => descargarPdf('informes.pdf', { informe: S.inf.tipo, params: S.inf.tipo === 'saldos' ? { fecha: S.inf.fecha } : S.inf.tipo === 'iva' ? { mes: S.inf.mes || mesActual() } : S.inf.tipo === 'retiros' && S.inf.todo ? { todo: true } : { desde: S.inf.desde, hasta: S.inf.hasta } }),
  infRango: d => {
    const m = mesActual();
    S.inf.todo = d.v === 'todo';
    if (d.v === 'mes') { S.inf.desde = m; S.inf.hasta = m; }
    if (d.v === 'anio') { S.inf.desde = m.slice(0, 4) + '-01'; S.inf.hasta = m; }
    recargar();
  },
  maestraSync: async () => {
    const m = await api('maestra.sincronizar');
    toast('MAESTRA actualizada: ' + m.resumen.clientes + ' clientes, ' + m.resumen.cuotas + ' cuotas, ' + m.resumen.ventas + ' ventas.', 'ok');
    pintarMaestra(m);
    if (S.vista === 'inicio') recargar();
  },
  respaldoHacer: async () => {
    const r = await api('respaldo.hacer');
    toast('Copia de seguridad hecha (' + r.ultimo + ').', 'ok');
    recargar();
  },
  cfgGuardar: async () => {
    const v = { empresa: $('#f-empresa').value.trim(), dia_limite_default: $('#f-dia_limite_default').value.trim(), email_avisos: $('#f-email_avisos').value.trim() };
    if ($('#f-maestra_id')) v.maestra_id = $('#f-maestra_id').value.trim();
    v.responsable_inscripto = $('#f-responsable_inscripto').checked ? 'SI' : 'NO';
    if (v.responsable_inscripto === 'SI') v.ri_desde = $('#f-ri_desde').value;
    if (!$('#cfg').reportValidity()) return;
    await api('config.guardar', v); toast('Configuración guardada.', 'ok'); recargar();
  },
  conNuevo: () => formMaestro('Nuevo concepto', 'conceptos.guardar', null, [['INGRESO', 'Ingreso (ventas)'], ['GASTO', 'Gasto (compras)']]),
  conEditar: d => formMaestro('Editar concepto', 'conceptos.guardar', S.conceptos.find(c => c.id === d.id), [['INGRESO', 'Ingreso (ventas)'], ['GASTO', 'Gasto (compras)']]),
  ctaNueva: () => formMaestro('Nueva cuenta', 'cuentas.guardar', null, [['CAJA', 'Caja'], ['BANCO', 'Banco'], ['BILLETERA', 'Billetera']]),
  ctaEditar: d => formMaestro('Editar cuenta', 'cuentas.guardar', S.cuentas.find(c => c.id === d.id), [['CAJA', 'Caja'], ['BANCO', 'Banco'], ['BILLETERA', 'Billetera']]),
  miClave: () => abrirForm({ titulo: 'Cambiar mi contraseña', despues: false, campos: [
    { n: 'actual', label: 'Contraseña actual', tipo: 'password', req: true },
    { n: 'nueva', label: 'Contraseña nueva', tipo: 'password', req: true, ayuda: 'Mínimo 6 caracteres.' }, { n: 'repetir', label: 'Repetir contraseña nueva', tipo: 'password', req: true }],
  ok: async v => {
    if (v.nueva !== v.repetir) throw new Error('Las contraseñas no coinciden.');
    await api('usuarios.miClave', { actual: v.actual, nueva: v.nueva });
    toast('Contraseña cambiada. En tus otros dispositivos vas a tener que entrar de nuevo.', 'ok');
  } }),
  salir: async () => {
    try { await api('acceso.salir', {}, { silencioso: true }); } catch (e) { /* igual se cierra en este dispositivo */ }
    sesionCerrada('Cerraste la sesión.');
  },
  usrNuevo: () => formUsuario(null),
  usrEditar: d => formUsuario((S.usuarios || []).find(u => u.id === d.id)),
  usrBaja: d => {
    const u = (S.usuarios || []).find(x => x.id === d.id);
    abrirForm({ titulo: 'Dar de baja a ' + u.nombre, peligro: true, textoOk: 'Dar de baja', despues: false,
      nota: 'No va a poder entrar más. Lo que registró queda como está, con su mail. Después podés crear otro usuario.',
      ok: async () => { await api('usuarios.baja', { id: u.id }); toast('Usuario dado de baja.', 'ok'); recargar(); } });
  },
  cierreGuardar: async () => {
    const v = { activo: $('#ci-activo').checked, minutos: Number($('#ci-minutos').value) };
    S.cierre = await api('sesion.configurar', v);
    guardarSesionPerfil();
    marcarActividad(true);
    toast(S.cierre.activo ? 'Listo: la sesión se cierra sola tras ' + textoMinutos(S.cierre.minutos) + ' sin uso.' : 'Cierre automático desactivado.', 'ok');
  },
  reinstalar: async () => { await api('config.instalar'); toast('Instalación revisada.', 'ok'); recargar(); },
  perfilUsar: d => usarPerfil(Number(d.i)),
  perfilAgregar: () => { cerrarModal(); $('#app').classList.add('hidden'); $('#setup').classList.remove('hidden'); S.url = ''; S.token = ''; S.usuario = null; pasoUrl(); },
  elegirPerfil: () => elegirPerfil(),
  demoReiniciar: () => abrirForm({ titulo: 'Reiniciar los datos de demostración', peligro: true, textoOk: 'Reiniciar',
    nota: 'Se borran todos los datos de esta versión de demostración y se carga de nuevo el negocio inventado, con fechas de los últimos meses. Tarda unos segundos. Solo funciona en la demo.',
    campos: [{ n: 'confirmar', label: 'Escribí BORRAR para confirmar', req: true }],
    ok: async v => { const r = await api('demo.reiniciar', v, { espera: 300000 }); toast('Demo lista: ' + r.clientes + ' clientes, ' + r.comprobantes + ' comprobantes.', 'ok'); } }),
  plantillaPreparar: async () => { await api('plantilla.preparar'); toast('Planilla modelo lista.', 'ok'); pintarPlantilla(await api('plantilla.estado', {}, { red: true })); },
  plantillaCopiar: async () => {
    const t = $('#pl-link').value;
    try { await navigator.clipboard.writeText(t); toast('Link copiado.', 'ok'); } catch (e) { $('#pl-link').select(); toast('Seleccioná el link y copialo.', 'info'); }
  },
  desconectar: () => abrirForm({ titulo: 'Desconectar esta versión de este dispositivo', peligro: true, textoOk: 'Desconectar', despues: false,
    nota: 'Se borran de este dispositivo la dirección del servidor, tu sesión y los datos guardados de esta versión. Las otras versiones conectadas siguen. Los datos de la planilla no se tocan.', campos: [],
    ok: async () => {
      try { await api('acceso.salir', {}, { silencioso: true }); } catch (e) { /* igual se desconecta */ }
      vaciarCache();
      const i = PERFILES.findIndex(p => p.activo);
      if (i >= 0) PERFILES.splice(i, 1);
      if (PERFILES.length) { PERFILES[0].activo = true; guardarPerfiles(PERFILES); return usarPerfil(0); }
      guardarPerfiles(PERFILES); S.url = S.token = ''; S.usuario = null; mostrarSetup();
    } })
};

const CHG = {
  cierreCambio: () => { $('#ci-minutos').disabled = !$('#ci-activo').checked; },
  compFiltro: el => { const c = circDe(el.dataset); S.fComp[c] = { mes: $('#fc-mes').value, entidad_id: $('#fc-ent').value, anulados: $('#fc-anu').checked }; recargar(); },
  tesFiltro: () => { S.fTes = { mes: $('#ft-mes').value, cuenta_id: $('#ft-cta').value, anulados: $('#ft-anu').checked }; recargar(); },
  entInactivos: el => { (circDe(el.dataset) === 'VENTA' ? S.fCli : S.fPro).inactivos = el.checked; recargar(); },
  infFiltro: () => {
    if ($('#fi-mes')) S.inf.mes = $('#fi-mes').value || mesActual();
    else if ($('#fi-fecha')) S.inf.fecha = $('#fi-fecha').value || hoy();
    else { S.inf.desde = $('#fi-desde').value || S.inf.desde; S.inf.hasta = $('#fi-hasta').value || S.inf.hasta; }
    recargar();
  }
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) { if (e.target.id === 'modal') cerrarModal(); return; }
  const f = ACT[el.dataset.act];
  if (!f) return;
  e.preventDefault(); e.stopPropagation();
  Promise.resolve().then(() => f(el.dataset, el)).catch(err => toast(err.message, 'error'));
});
document.addEventListener('change', e => { const f = e.target.dataset && CHG[e.target.dataset.chg]; if (f) f(e.target); });
document.addEventListener('input', e => {
  if (e.target.dataset && e.target.dataset.inp === 'entBuscar') {
    const circ = circDe(e.target.dataset), f = circ === 'VENTA' ? S.fCli : S.fPro;
    f.q = e.target.value;
    $('#ent-lista').innerHTML = tablaEntidades(circ, listaEntidades(circ, f, CIR[circ].ents()));
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').classList.contains('hidden')) cerrarModal(); });
// Detalle del gráfico: al pasar el mouse o tocar un mes
document.addEventListener('mouseover', e => { if (e.target.classList && e.target.classList.contains('hit')) mostrarTip(e.target); });
document.addEventListener('mouseout', e => {
  if (e.target.classList && e.target.classList.contains('hit') && !(e.relatedTarget && e.relatedTarget.classList && e.relatedTarget.classList.contains('hit'))) {
    const t = $('#tip'); if (t) t.classList.add('hidden');
    document.querySelectorAll('.plot .hit.on').forEach(x => x.classList.remove('on'));
  }
});
document.addEventListener('touchstart', e => { if (e.target.classList && e.target.classList.contains('hit')) mostrarTip(e.target); }, { passive: true });
let tRes = null;
window.addEventListener('resize', () => { clearTimeout(tRes); tRes = setTimeout(() => { if (S.vista === 'informes' && S.inf.tipo === 'rentabilidad') dibujarGrafico(); }, 150); });

// ------------------------------------------------------------ Mi cuenta, usuarios y cierre automático

const PERMISOS_TXT = [['ventas', 'Registrar ventas y cobros'], ['compras', 'Registrar compras y pagos'], ['tesoreria', 'Movimientos de tesorería y retiros'],
  ['informes', 'Ver informes y saldos'], ['anular', 'Anular comprobantes'], ['config', 'Entrar a Configuración']];
const MINUTOS = [[15, '15 minutos'], [30, '30 minutos'], [60, '1 hora'], [120, '2 horas'], [240, '4 horas'], [480, '8 horas'], [720, '12 horas'], [1440, '24 horas']];
function textoMinutos(m) { const x = MINUTOS.find(o => o[0] === m); return x ? x[1] : m + ' minutos'; }

function cardsCuenta() {
  const u = S.usuario || {};
  return '<div class="dos"><section class="card"><h2>Mi cuenta</h2>' +
    '<p class="small"><b>' + esc(u.nombre || '') + '</b> · ' + esc(u.email || '') + ' <span class="chip ' + (u.rol === 'PRINCIPAL' ? 'verde' : 'azul') + '">' +
    (u.rol === 'PRINCIPAL' ? 'Usuario principal' : 'Usuario') + '</span></p>' +
    (u.rol && u.rol !== 'PRINCIPAL' ? '<p class="muted small" style="margin-top:6px">Puede: ' + PERMISOS_TXT.filter(p => puede(p[0])).map(p => p[1].toLowerCase()).join(', ') + '.</p>' : '') +
    '<div class="acciones" style="margin-top:12px">' + boton('miClave', 'Cambiar mi contraseña', 'key') + boton('salir', 'Cerrar sesión', 'logout') + '</div></section>' +
    (esPrincipal() ? '<section class="card"><h2>Cierre automático de sesión</h2>' +
      '<label class="check-linea"><input type="checkbox" id="ci-activo" data-chg="cierreCambio"' + (S.cierre.activo ? ' checked' : '') + '> Cerrar la sesión sola si no se usa la app</label>' +
      '<div class="campo" style="margin-top:10px"><label for="ci-minutos">Después de</label><select id="ci-minutos"' + (S.cierre.activo ? '' : ' disabled') + '>' +
      MINUTOS.map(o => '<option value="' + o[0] + '"' + (o[0] === S.cierre.minutos ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></div>' +
      '<div class="acciones">' + boton('cierreGuardar', 'Guardar', 'save', '', 'btn-primary btn-sm') + '</div>' +
      '<p class="muted small" style="margin-top:8px">Vale para todos los usuarios y dispositivos. Conviene activarlo si la computadora la usa más de una persona.</p></section>' : '') +
    '</div>' +
    (esPrincipal() ? '<section class="card"><h2>Usuarios <span id="usr-btn"></span></h2><div id="usuarios-cfg"><p class="muted small">Consultando…</p></div></section>' : '');
}

function pintarUsuarios(r) {
  S.usuarios = r.usuarios;
  const el = $('#usuarios-cfg'); if (!el) return;
  $('#usr-btn').innerHTML = r.usuarios.length < r.max ? boton('usrNuevo', 'Agregar usuario', 'person_add', '', 'btn-sm') : '';
  el.innerHTML = tabla([{ t: 'Usuario' }, { t: 'Puede', c: 'hm' }, { t: '' }], r.usuarios.map(u => ({ c: [
    '<b>' + esc(u.nombre) + '</b><br><span class="muted small">' + esc(u.email) + '</span>',
    u.rol === 'PRINCIPAL' ? '<span class="chip verde">Todo (principal)</span>' : (u.permisos.length ? PERMISOS_TXT.filter(p => u.permisos.indexOf(p[0]) >= 0).map(p => '<span class="chip">' + p[1] + '</span>').join(' ') : '<span class="muted small">Solo ver</span>'),
    icoBtn('usrEditar', 'edit', 'Editar', ' data-id="' + u.id + '"') + (u.rol === 'PRINCIPAL' ? '' : icoBtn('usrBaja', 'person_remove', 'Dar de baja', ' data-id="' + u.id + '"', 'rojo'))] }))) +
    '<p class="muted small" style="margin-top:10px">Hasta ' + r.max + ' usuarios: vos (principal) y uno más con los permisos que le marques. Si alguien se olvida la contraseña, se la cambiás desde Editar.</p>';
}

function formUsuario(u) {
  const segundo = !u || u.rol !== 'PRINCIPAL';
  const campos = [
    { n: 'nombre', label: 'Nombre', valor: u ? u.nombre : '', req: true },
    { n: 'email', label: 'Mail (es su usuario para entrar)', tipo: 'email', valor: u ? u.email : '', req: true },
    { n: 'nueva', label: u ? 'Contraseña nueva' : 'Contraseña', tipo: 'password', req: !u, ayuda: u ? 'Dejala vacía para no cambiarla. Si la cambiás, se cierran sus sesiones abiertas.' : 'Mínimo 6 caracteres. Después la puede cambiar desde Mi cuenta.' }
  ].concat(segundo ? PERMISOS_TXT.map(p => ({ n: 'p_' + p[0], label: p[1], tipo: 'check', valor: u ? u.permisos.indexOf(p[0]) >= 0 : false })) : []);
  abrirForm({ titulo: u ? 'Editar usuario' : 'Agregar usuario', despues: false, campos: campos,
    nota: segundo ? 'Marcá lo que puede hacer. Sin ninguna marca, solo puede ver clientes, proveedores y comprobantes.' : '',
    ok: async v => {
      const d = { id: u ? u.id : '', nombre: v.nombre, email: v.email, nueva: v.nueva, permisos: PERMISOS_TXT.map(p => p[0]).filter(k => v['p_' + k]) };
      const r = await api('usuarios.guardar', d);
      if (S.usuario && r.id === S.usuario.id) { S.usuario = r; guardarSesionPerfil(); }
      toast('Usuario guardado.', 'ok'); recargar();
    } });
}

// --- Sesión: se guarda la llave (nunca la contraseña) y se cierra sola por inactividad si el principal lo activó.
function perfilActivo() { return PERFILES.find(p => p.activo); }
function guardarSesionPerfil() {
  const p = perfilActivo(); if (!p) return;
  p.token = S.token; p.usuario = S.usuario; p.cierre = S.cierre; if (S.usuario) p.email = S.usuario.email;
  delete p.clave;
  guardarPerfiles(PERFILES);
}
function claveActividad() { return claveCache(S.url).replace(LS_CACHE, 'sg_act'); }
let ultActividad = 0;
function marcarActividad(forzar) {
  const a = Date.now();
  if (!forzar && a - ultActividad < 15000) return;
  ultActividad = a;
  try { localStorage.setItem(claveActividad(), String(a)); } catch (e) { /* sin almacenamiento */ }
}
function vencidaPorInactividad() {
  if (!S.cierre || !S.cierre.activo) return false;
  let u = 0; try { u = Number(localStorage.getItem(claveActividad()) || 0); } catch (e) { u = 0; }
  return u > 0 && Date.now() - u > S.cierre.minutos * 60000;
}
['click', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, () => { if (S.token) marcarActividad(); }, { passive: true }));
setInterval(() => {
  if (S.token && !$('#app').classList.contains('hidden') && vencidaPorInactividad()) {
    api('acceso.salir', {}, { silencioso: true }).catch(() => {});
    sesionCerrada('Se cerró la sesión por inactividad.');
  }
}, 30000);

/** Trae del servidor el usuario y el cierre automático vigentes (por si el principal cambió permisos). */
async function refrescarUsuario() {
  try {
    const r = await api('usuarios.yo', {}, { silencioso: true });
    const cambio = JSON.stringify(r.usuario) !== JSON.stringify(S.usuario);
    S.usuario = r.usuario; S.cierre = r.cierre; guardarSesionPerfil();
    if (cambio) { pintarNav(); ir(S.vista, S.param, true); }
  } catch (e) { /* sin conexión o sesión caída: ya se manejó */ }
}

let cerrando = false;
function sesionCerrada(msg) {
  if (cerrando) return;
  cerrando = true; setTimeout(() => { cerrando = false; }, 1500);
  S.token = ''; S.usuario = null;
  const p = perfilActivo(); if (p) { delete p.token; delete p.usuario; guardarPerfiles(PERFILES); }
  vaciarCache();
  mostrarAcceso(msg);
}

// ------------------------------------------------------------ Conexión inicial

function mostrarSetup() {
  $('#app').classList.add('hidden'); $('#setup').classList.remove('hidden'); cerrarModal();
  pasoUrl();
}

function pintarSetup(sub, campos, textoOk, ok, volver, extras) {
  $('#setup-sub').textContent = sub;
  const f = $('#setup-form');
  f.innerHTML = campos.map(campoHtml).join('') + '<button type="submit" class="btn btn-primary btn-block">' + textoOk + '</button>' +
    (extras || []).map((x, k) => '<button type="button" class="btn btn-block" id="setup-x' + k + '">' + x[0] + '</button>').join('') +
    (volver ? '<button type="button" class="btn btn-block" id="setup-volver">Cambiar dirección del servidor</button>' : '');
  f.onsubmit = async e => { e.preventDefault(); try { await ok(valores(campos)); } catch (err) { toast(err.message, 'error'); } };
  (extras || []).forEach((x, k) => { $('#setup-x' + k).onclick = x[1]; });
  if (volver) $('#setup-volver').onclick = pasoUrl;
}

function pasoUrl() {
  pintarSetup('Conectá este dispositivo con tu servidor.', [{ n: 'url', label: 'Dirección del servidor (Apps Script)', tipo: 'url', req: true, valor: S.url,
    ph: 'https://script.google.com/macros/s/.../exec', ayuda: 'Es la URL que termina en /exec, la que copiaste al implementar la aplicación web.' }], 'Continuar', async v => {
    const e = await api('acceso.estado', {}, { url: v.url, publico: true });
    S.url = v.url;
    cambiarCache(S.url);
    pasoAcceso(e);
  });
}

/** Según el servidor: crear el primer usuario (instalación nueva o paso desde la clave única) o entrar. */
async function mostrarAcceso(msg) {
  $('#app').classList.add('hidden'); $('#setup').classList.remove('hidden'); cerrarModal();
  if (msg) toast(msg, 'info');
  try { pasoAcceso(await api('acceso.estado', {}, { publico: true })); } catch (e) { toast(e.message, 'error'); pasoUrl(); }
}
function pasoAcceso(e) {
  if (e.usuarios) return pasoEntrar();
  pasoCrearPrincipal(e.clave_vieja);
}

function pasoCrearPrincipal(migrar) {
  const p = PERFILES.find(x => x.url === S.url);
  pintarSetup(migrar ? 'Ahora se entra con usuario y contraseña. Creá tu usuario principal: tus datos no se tocan.' : 'Primer ingreso: creá el usuario principal.', [
    { n: 'nombre', label: 'Tu nombre', req: true },
    { n: 'email', label: 'Tu mail (va a ser tu usuario)', tipo: 'email', req: true, ayuda: 'A este mail te llega el código si algún día te olvidás la contraseña.' },
    { n: 'nueva', label: 'Contraseña', tipo: 'password', req: true, ayuda: 'Mínimo 6 caracteres.' },
    { n: 'repetir', label: 'Repetir contraseña', tipo: 'password', req: true }
  ].concat(migrar ? [{ n: 'clave_actual', label: 'Clave actual (la de siempre)', tipo: 'password', req: true, valor: p && p.clave ? p.clave : '',
    ayuda: 'Para confirmar que sos vos. Después deja de usarse.' }] : []), 'Crear usuario y entrar', async v => {
    if (v.nueva !== v.repetir) throw new Error('Las contraseñas no coinciden.');
    conectado(await api('acceso.crearPrincipal', v, { publico: true }));
  }, true);
}

function pasoEntrar() {
  const p = PERFILES.find(x => x.url === S.url);
  pintarSetup('Ingresá con tu usuario.', [
    { n: 'email', label: 'Mail', tipo: 'email', req: true, valor: p && p.email ? p.email : '' },
    { n: 'clave', label: 'Contraseña', tipo: 'password', req: true }], 'Entrar', async v => {
    conectado(await api('acceso.entrar', v, { publico: true }));
  }, true, [['Me olvidé la contraseña', () => pasoRecuperar($('#f-email').value)]]);
}

function pasoRecuperar(email) {
  pintarSetup('Si sos el usuario principal, te mandamos un código por mail. Si sos el segundo usuario, pedile al principal que te la cambie.', [
    { n: 'email', label: 'Mail del usuario principal', tipo: 'email', req: true, valor: email || '' }], 'Mandarme el código', async v => {
    const r = await api('acceso.recuperar', v, { publico: true });
    toast(r.mensaje, 'info');
    pasoCodigo(v.email);
  }, false, [['Volver', pasoEntrar]]);
}

function pasoCodigo(email) {
  pintarSetup('Ingresá el código que te llegó a ' + email + ' y elegí una contraseña nueva.', [
    { n: 'codigo', label: 'Código de 6 números', req: true },
    { n: 'nueva', label: 'Contraseña nueva', tipo: 'password', req: true, ayuda: 'Mínimo 6 caracteres.' },
    { n: 'repetir', label: 'Repetir contraseña nueva', tipo: 'password', req: true }], 'Cambiar y entrar', async v => {
    if (v.nueva !== v.repetir) throw new Error('Las contraseñas no coinciden.');
    conectado(await api('acceso.restablecer', { email: email, codigo: v.codigo, nueva: v.nueva }, { publico: true }));
  }, false, [['Pedir otro código', () => pasoRecuperar(email)], ['Volver', pasoEntrar]]);
}

async function conectado(r) {
  S.token = r.token; S.usuario = r.usuario; S.cierre = r.cierre;
  vaciarCache();
  S.forzar = true;
  await cargarMaestros();
  S.forzar = false;
  let p = PERFILES.find(x => x.url === S.url);
  if (!p) { p = { nombre: S.config.empresa || 'Versión ' + (PERFILES.length + 1), url: S.url }; PERFILES.push(p); }
  p.nombre = S.config.empresa || p.nombre;
  PERFILES.forEach(x => { x.activo = x === p; });
  guardarSesionPerfil();
  marcarActividad(true);
  iniciarApp(true);
}

async function iniciarApp(yaCargado) {
  if (vencidaPorInactividad()) return sesionCerrada('Se cerró la sesión por inactividad.');
  marcarActividad(true);
  $('#setup').classList.add('hidden'); $('#setup-form').innerHTML = ''; $('#app').classList.remove('hidden');
  pintarNav();
  try {
    if (!yaCargado) await cargarMaestros();
  } catch (e) {
    toast(e.message, 'error');
    if (SESION_CAIDA.test(e.message)) return;
  }
  await ir('inicio');
  if (!yaCargado) refrescarUsuario();
  setTimeout(precargar, 500);        // actualiza en segundo plano todo lo guardado
}

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { /* sin modo instalable */ });
if (S.url && S.token) iniciarApp(false); else if (S.url) mostrarAcceso(); else mostrarSetup();
