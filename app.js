/* Si-Gestión – Pantallas (etapas 1 y 2).
   Sin credenciales en el código: la dirección del servidor y la clave se ingresan
   en el primer uso y quedan guardadas solo en este dispositivo. */
'use strict';

// ------------------------------------------------------------ Estado y utilidades

const LS_URL = 'sg_api_url', LS_CLAVE = 'sg_clave';
const S = {
  url: leerLS(LS_URL), clave: leerLS(LS_CLAVE), vista: 'inicio', param: null,
  clientes: [], proveedores: [], conceptos: [], cuentas: [], config: {}, numeradores: [],
  fComp: { VENTA: { mes: mesActual(), entidad_id: '', anulados: false }, COMPRA: { mes: mesActual(), entidad_id: '', anulados: false } },
  fTes: { mes: mesActual(), cuenta_id: '', anulados: false },
  fCli: { q: '', inactivos: false }, fPro: { q: '', inactivos: false },
  comprasTab: 'comprobantes',
  inf: { tipo: 'rentabilidad', desde: mesRel(-11), hasta: mesActual(), fecha: hoy() }
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
function r2(n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; }
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
  const t = $('#toast');
  t.textContent = msg; t.className = 'toast ' + (tipo || '');
  clearTimeout(tToast); tToast = setTimeout(() => t.classList.add('hidden'), tipo === 'error' ? 5500 : 3000);
}

async function api(accion, datos, opt) {
  opt = opt || {};
  if (!opt.silencioso) cargando(true);
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 45000);
  try {
    const r = await fetch(opt.url || S.url, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },   // text/plain evita el preflight con Apps Script
      body: JSON.stringify({ clave: opt.clave !== undefined ? opt.clave : S.clave, accion: accion, datos: datos || {} }),
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
    v[c.n] = c.tipo === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value.trim();
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

function pintarNav() {
  const btn = (n, corto) => '<button class="nav-btn" data-act="nav" data-v="' + n[0] + '">' + ico(n[1]) + '<span class="t">' + (corto ? n[3] : n[2]) + '</span></button>';
  $('#nav-side').innerHTML = NAV.map(n => btn(n)).join('');
  $('#nav-bottom').innerHTML = NAV.filter(n => NAV_CEL.indexOf(n[0]) >= 0).map(n => btn(n, true)).join('') +
    '<button class="nav-btn" data-act="mas" data-v="mas">' + ico('menu') + '<span class="t">Más</span></button>';
}

async function ir(vista, param) {
  S.vista = vista; S.param = param === undefined ? null : param;
  const marca = PADRE[vista] || vista;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.v === marca || (b.dataset.v === 'mas' && NAV_CEL.indexOf(marca) < 0)));
  $('#titulo').textContent = TITULOS[vista];
  $('#acciones').innerHTML = '';
  try {
    await VISTAS[vista](S.param);
  } catch (e) {
    if (/Clave incorrecta|no se definió la clave/.test(e.message)) { toast(e.message, 'error'); return mostrarSetup(); }
    $('#main').innerHTML = '<div class="card"><p class="vacio">' + esc(e.message) + '</p><p style="text-align:center">' + boton('recargar', 'Reintentar', 'refresh') + '</p></div>';
  }
  window.scrollTo(0, 0);
}
function recargar() { return ir(S.vista, S.param); }

async function cargarMaestros() {
  const r = await Promise.all([api('config.leer'), api('clientes.listar'), api('proveedores.listar')]);
  S.config = r[0].config; S.conceptos = r[0].conceptos; S.cuentas = r[0].cuentas; S.numeradores = r[0].numeradores;
  S.clientes = r[1]; S.proveedores = r[2];
  $('#empresa').textContent = S.config.empresa || 'Sipymes';
}

// ------------------------------------------------------------ Vistas

const VISTAS = {};

VISTAS.inicio = async function () {
  const d = await api('inicio');
  const h = hoy();
  $('#main').innerHTML =
    '<div class="kpi-grid">' +
    kpi('account_balance_wallet', 'Tesorería', plata(d.total_tesoreria)) +
    kpi('request_quote', 'A cobrar', plata(d.a_cobrar), d.avisos.length ? 'warn' : '') +
    kpi('outbox', 'A pagar', plata(d.a_pagar), d.pagos.some(p => p.vencimiento < h) ? 'warn' : '') +
    kpi(d.resultado_mes < 0 ? 'trending_down' : 'trending_up', 'Resultado del mes', plata(d.resultado_mes), d.resultado_mes < 0 ? 'bad' : 'ok') +
    kpi('receipt_long', 'Ventas del mes', plata(d.ventas_mes)) +
    kpi('shopping_cart', 'Gastos del mes', plata(d.gastos_mes)) +
    kpi('payments', 'Cobrado en el mes', plata(d.cobrado_mes)) +
    kpi('outbox', 'Pagado en el mes', plata(d.pagado_mes)) +
    '</div><div class="dos">' +
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
  $('#acciones').innerHTML = boton('trfNueva', 'Transferencia', 'swap_horiz') + boton('movNuevo', 'Movimiento', 'add', '', 'btn-primary');
  $('#main').innerHTML = (saldos.length ? '<div class="kpi-grid">' + saldos.map(c => kpi(c.tipo === 'CAJA' ? 'point_of_sale' : c.tipo === 'BANCO' ? 'account_balance' : 'account_balance_wallet', esc(c.nombre), plata(c.saldo), c.saldo < 0 ? 'bad' : '')).join('') +
    kpi('functions', 'Total', plata(saldos.reduce((a, c) => a + c.saldo, 0)), 'ok') + '</div>' : '<div class="card"><p class="vacio">Todavía no hay cuentas de tesorería. Crealas en Configuración.</p></div>') +
    '<section class="card"><h2>Movimientos</h2><div class="filtros" style="margin-bottom:12px">' +
    '<div class="campo"><label for="ft-mes">Mes</label><input id="ft-mes" type="month" value="' + f.mes + '" data-chg="tesFiltro"></div>' +
    '<div class="campo"><label for="ft-cta">Cuenta</label>' + selectHtml('ft-cta', S.cuentas.map(c => [c.id, c.nombre]), f.cuenta_id, 'tesFiltro', 'Todas') + '</div>' +
    '<label class="check"><input id="ft-anu" type="checkbox" data-chg="tesFiltro"' + (f.anulados ? ' checked' : '') + '> Ver anulados</label></div>' +
    tabla([{ t: 'Fecha' }, { t: 'N°', c: 'hm' }, { t: 'Cuenta' }, { t: 'Detalle', c: 'hm' }, { t: 'Ingreso', c: 'num' }, { t: 'Egreso', c: 'num' }, { t: '' }],
      movs.map(m => ({ attr: m.estado === 'ANULADO' ? 'class="anulado"' : '', c: [fecha(m.fecha), esc(m.id), esc(m.cuenta), esc(m.detalle),
        m.tipo === 'INGRESO' ? '<span class="pos">' + plata(m.importe) + '</span>' : '', m.tipo === 'EGRESO' ? '<span class="neg">' + plata(m.importe) + '</span>' : '',
        m.estado === 'ANULADO' ? '<span class="chip">Anulado</span>' : (m.origen === 'RECIBO' || m.origen === 'PAGO' ? '<span class="chip" title="Se anula desde el ' + (m.origen === 'RECIBO' ? 'recibo' : 'pago') + '">' + esc(m.origen_id) + '</span>' : icoBtn('movAnular', 'block', 'Anular', ' data-id="' + m.id + '"', 'rojo'))] }))) + '</section>';
};

// ---------- Informes

const INFORMES = [['rentabilidad', 'Rentabilidad por mes'], ['ventas', 'Ventas por concepto'], ['gastos', 'Gastos por concepto'], ['saldos', 'Saldos']];
const COLOR_ING = '#2B6CB0', COLOR_GAS = '#E07A2F';   // validados para daltonismo (ΔE ≥ 23) y contraste ≥ 3:1

VISTAS.informes = async function () {
  const I = S.inf;
  S.infDatos = null;
  $('#acciones').innerHTML = boton('infExcel', 'Excel', 'table_view') + boton('infPdf', 'PDF', 'picture_as_pdf', '', 'btn-primary');
  const seg = '<div class="seg">' + INFORMES.map(t => '<button class="' + (t[0] === I.tipo ? 'on' : '') + '" data-act="infTipo" data-v="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>';
  const filtros = I.tipo === 'saldos'
    ? '<div class="campo"><label for="fi-fecha">Saldos al</label><input id="fi-fecha" type="date" value="' + I.fecha + '" data-chg="infFiltro"></div>'
    : '<div class="campo"><label for="fi-desde">Desde</label><input id="fi-desde" type="month" value="' + I.desde + '" data-chg="infFiltro"></div>' +
      '<div class="campo"><label for="fi-hasta">Hasta</label><input id="fi-hasta" type="month" value="' + I.hasta + '" data-chg="infFiltro"></div>';
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
  $('#main').innerHTML = '<div class="dos">' +
    '<section class="card"><h2>General</h2><form id="cfg" class="form">' +
    campoHtml({ n: 'empresa', label: 'Nombre de la empresa', valor: g.empresa }) +
    campoHtml({ n: 'dia_limite_default', label: 'Día límite de cobro general', tipo: 'number', step: 1, min: 1, max: 31, valor: g.dia_limite_default, ayuda: 'Se usa para los clientes que no tienen un día propio.' }) +
    campoHtml({ n: 'email_avisos', label: 'Mail para avisos', tipo: 'email', valor: g.email_avisos, ayuda: 'Vacío: se usa el mail de la cuenta dueña del servidor.' }) +
    '<div class="modal-pie">' + boton('cfgGuardar', 'Guardar', 'save', '', 'btn-primary') + '</div></form></section>' +
    '<section class="card"><h2>Numeración</h2>' + tabla([{ t: 'Tipo' }, { t: 'Último número', c: 'num' }], S.numeradores.map(n => ({ c: [esc(n.tipo), n.ultimo] }))) +
    '<p class="muted small" style="margin-top:10px">La asigna el sistema: correlativa, sin repetir ni saltear.</p></section></div>' +
    '<div class="dos"><section class="card"><h2>Conceptos ' + boton('conNuevo', 'Nuevo', 'add', '', 'btn-sm') + '</h2>' +
    tabla([{ t: 'Concepto' }, { t: 'Tipo' }, { t: 'Rubro', c: 'hm' }, { t: '' }], S.conceptos.map(c => ({ c: [esc(c.nombre) + (c.activo === 'NO' ? ' <span class="chip">Inactivo</span>' : ''),
      tipoChip(c), esc(c.rubro), icoBtn('conEditar', 'edit', 'Editar', ' data-id="' + c.id + '"')] }))) +
    '<p class="muted small" style="margin-top:10px">Los de ingreso se usan en ventas; los de gasto, en compras. El rubro agrupa en los informes.</p></section>' +
    '<section class="card"><h2>Cuentas de tesorería ' + boton('ctaNueva', 'Nueva', 'add', '', 'btn-sm') + '</h2>' +
    tabla([{ t: 'Cuenta' }, { t: 'Tipo' }, { t: '' }], S.cuentas.map(c => ({ c: [esc(c.nombre) + (c.activo === 'NO' ? ' <span class="chip">Inactiva</span>' : ''), '<span class="chip">' + esc(c.tipo) + '</span>',
      icoBtn('ctaEditar', 'edit', 'Editar', ' data-id="' + c.id + '"')] }))) + '</section></div>' +
    '<section class="card"><h2>Acceso y mantenimiento</h2><div class="acciones">' + boton('claveCambiar', 'Cambiar clave', 'key') +
    boton('reinstalar', 'Revisar instalación', 'build') + boton('desconectar', 'Desconectar este dispositivo', 'logout') + '</div>' +
    '<p class="muted small" style="margin-top:10px">"Revisar instalación" vuelve a crear las hojas que falten y reprograma la tarea diaria (abonos del día 1 y avisos). No borra datos.</p></section>';
};

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
    { n: 'importe', label: 'Importe total', tipo: 'number', min: 0.01, req: true },
    { n: 'detalle', label: 'Detalle' },
    { n: 'vencimiento', label: compra ? 'Vence el' : 'Fecha límite de cobro', tipo: 'date', valor: compra ? hoy() : '',
      ayuda: compra ? 'Fecha en que hay que pagarlo. Se usa para los avisos en Inicio.' : 'Vacío: se calcula con el día límite del cliente.' },
    { n: 'aplica_a', label: 'Aplicar a', tipo: 'select', opciones: [['', 'No aplicar (queda a cuenta)']] },
    { n: 'nro_factura_real', label: C.nroLargo }];
  let datos = null;

  function paso1() {
    abrirModal('<h2>Nuevo comprobante de ' + (compra ? 'compra' : 'venta') + '</h2><p class="muted small" style="margin-bottom:12px">' +
      (compra ? 'Solo gastos de Sipymes. El número interno lo asigna el sistema.' : 'Comprobante interno, sin efecto fiscal. El número lo asigna el sistema.') + '</p>' +
      '<form id="form" class="form">' + campos.map(campoHtml).join('') +
      '<div class="modal-pie"><button type="button" class="btn" data-act="cerrar">Cancelar</button><button type="submit" class="btn btn-primary">' + (compra ? 'Continuar' : 'Emitir') + '</button></div></form>');
    if (datos) campos.forEach(c => { if (datos[c.n] !== undefined && c.n !== 'aplica_a') $('#f-' + c.n).value = datos[c.n]; });
    const tipo = $('#f-tipo'), ent = $('#f-entidad_id'), fec = $('#f-fecha'), ven = $('#f-vencimiento');
    async function ajustar() {
      const nc = tipo.value === C.credito;
      $('#c-aplica_a').classList.toggle('hidden', !nc);
      $('#c-vencimiento').classList.toggle('hidden', nc);
      $('#form button[type=submit]').textContent = compra && !nc ? 'Continuar' : 'Emitir';
      if (!nc || !ent.value) return;
      try {
        const p = await api(C.pre + '.pendientes', { entidad_id: ent.value }, { silencioso: true });
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
      if (compra && datos.tipo !== C.credito) paso2(); else emitir(null);
    });
  }

  function resumen() {
    return '<div class="resumen"><div><b>' + esc(entidad(circ, datos.entidad_id).nombre) + '</b><span>' + esc(C.tipos[datos.tipo]) + ' del ' + fecha(datos.fecha) +
      (datos.nro_factura_real ? ' · ' + esc(datos.nro_factura_real) : '') + '</span></div><b class="num">' + plata(datos.importe) + '</b></div>';
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
      { n: 'importe', label: 'Importe pagado', tipo: 'number', min: 0.01, max: datos.importe, valor: datos.importe, req: true, ayuda: 'Si pagaste una parte, el resto queda pendiente.' },
      { n: 'detalle', label: 'Detalle del pago (opcional)' }];
    abrirModal('<h2>Registrar el pago</h2>' + resumen() +
      '<form id="form" class="form">' + cp.map(campoHtml).join('') +
      '<div class="modal-pie"><button type="button" class="btn" id="op-volver">' + ico('arrow_back') + 'Volver</button><button type="submit" class="btn btn-primary">Registrar compra y pago</button></div></form>');
    $('#op-volver').onclick = paso2;
    $('#form').addEventListener('submit', e => { e.preventDefault(); emitir(valores(cp)); });
  }

  async function emitir(pago) {
    const d = Object.assign({}, datos);
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
  abrirForm({ titulo: C.Verbo, campos: campos, textoOk: circ === 'VENTA' ? 'Emitir recibo' : 'Emitir orden de pago', ok: async v => {
    v.imputaciones = pend.map(p => ({ comprobante_id: p.id, importe: Number($('#imp-' + p.id).value) || 0 })).filter(i => i.importe > 0);
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
    try { pend = (await api(C.pre + '.pendientes', { entidad_id: sel.value }, { silencioso: true })).comprobantes; } catch (e) { pend = []; toast(e.message, 'error'); }
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

function formAnular(titulo, accion, id) {
  abrirForm({ titulo: titulo + ' ' + id, peligro: true, textoOk: 'Anular', nota: 'No se borra: queda anulado y conserva su número.',
    campos: [{ n: 'motivo', label: 'Motivo', req: true }], ok: async v => { await api(accion, { id: id, motivo: v.motivo }); toast(id + ' anulado.', 'ok'); } });
}

function formMaestro(titulo, accion, o, tipos) {
  o = o || {};
  const campos = [{ n: 'nombre', label: 'Nombre', req: true, valor: o.nombre }, { n: 'tipo', label: 'Tipo', tipo: 'select', opciones: tipos, valor: o.tipo }];
  if (accion === 'conceptos.guardar') campos.push({ n: 'rubro', label: 'Rubro', valor: o.rubro });
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
  mas: () => abrirModal('<h2>Menú</h2><div class="menu-mas">' + NAV.map(n => '<button class="nav-btn' + ((PADRE[S.vista] || S.vista) === n[0] ? ' active' : '') +
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
  infTipo: d => { S.inf.tipo = d.v; recargar(); },
  infExcel: () => {
    if (!S.infDatos) return toast('Esperá a que cargue el informe.', 'error');
    const t = INFORMES.find(x => x[0] === S.inf.tipo)[1];
    descargar(xlsx(hojasInforme()), t + ' - ' + hoy() + '.xlsx');
  },
  infPdf: () => descargarPdf('informes.pdf', { informe: S.inf.tipo, params: S.inf.tipo === 'saldos' ? { fecha: S.inf.fecha } : { desde: S.inf.desde, hasta: S.inf.hasta } }),
  cfgGuardar: async () => {
    const v = { empresa: $('#f-empresa').value.trim(), dia_limite_default: $('#f-dia_limite_default').value.trim(), email_avisos: $('#f-email_avisos').value.trim() };
    if (!$('#cfg').reportValidity()) return;
    await api('config.guardar', v); toast('Configuración guardada.', 'ok'); recargar();
  },
  conNuevo: () => formMaestro('Nuevo concepto', 'conceptos.guardar', null, [['INGRESO', 'Ingreso (ventas)'], ['GASTO', 'Gasto (compras)']]),
  conEditar: d => formMaestro('Editar concepto', 'conceptos.guardar', S.conceptos.find(c => c.id === d.id), [['INGRESO', 'Ingreso (ventas)'], ['GASTO', 'Gasto (compras)']]),
  ctaNueva: () => formMaestro('Nueva cuenta', 'cuentas.guardar', null, [['CAJA', 'Caja'], ['BANCO', 'Banco'], ['BILLETERA', 'Billetera']]),
  ctaEditar: d => formMaestro('Editar cuenta', 'cuentas.guardar', S.cuentas.find(c => c.id === d.id), [['CAJA', 'Caja'], ['BANCO', 'Banco'], ['BILLETERA', 'Billetera']]),
  claveCambiar: () => abrirForm({ titulo: 'Cambiar clave', despues: false, campos: [
    { n: 'nueva', label: 'Clave nueva', tipo: 'password', req: true, ayuda: 'Mínimo 4 caracteres.' }, { n: 'repetir', label: 'Repetir clave nueva', tipo: 'password', req: true }],
  ok: async v => {
    if (v.nueva !== v.repetir) throw new Error('Las claves no coinciden.');
    await api('clave.cambiar', { nueva: v.nueva });
    S.clave = v.nueva; guardarLS(LS_CLAVE, v.nueva);
    toast('Clave cambiada. En tus otros dispositivos vas a tener que ingresarla de nuevo.', 'ok');
  } }),
  reinstalar: async () => { await api('config.instalar'); toast('Instalación revisada.', 'ok'); recargar(); },
  desconectar: () => abrirForm({ titulo: 'Desconectar este dispositivo', peligro: true, textoOk: 'Desconectar', despues: false,
    nota: 'Se borran de este dispositivo la dirección del servidor y la clave. Los datos no se tocan.', campos: [],
    ok: async () => { guardarLS(LS_URL, ''); guardarLS(LS_CLAVE, ''); S.url = S.clave = ''; mostrarSetup(); } })
};

const CHG = {
  compFiltro: el => { const c = circDe(el.dataset); S.fComp[c] = { mes: $('#fc-mes').value, entidad_id: $('#fc-ent').value, anulados: $('#fc-anu').checked }; recargar(); },
  tesFiltro: () => { S.fTes = { mes: $('#ft-mes').value, cuenta_id: $('#ft-cta').value, anulados: $('#ft-anu').checked }; recargar(); },
  entInactivos: el => { (circDe(el.dataset) === 'VENTA' ? S.fCli : S.fPro).inactivos = el.checked; recargar(); },
  infFiltro: () => {
    if ($('#fi-fecha')) S.inf.fecha = $('#fi-fecha').value || hoy();
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

// ------------------------------------------------------------ Conexión inicial

function mostrarSetup() {
  $('#app').classList.add('hidden'); $('#setup').classList.remove('hidden'); cerrarModal();
  pasoUrl();
}

function pintarSetup(sub, campos, textoOk, ok, volver) {
  $('#setup-sub').textContent = sub;
  const f = $('#setup-form');
  f.innerHTML = campos.map(campoHtml).join('') + '<button type="submit" class="btn btn-primary btn-block">' + textoOk + '</button>' +
    (volver ? '<button type="button" class="btn btn-block" id="setup-volver">Cambiar dirección del servidor</button>' : '');
  f.onsubmit = async e => { e.preventDefault(); try { await ok(valores(campos)); } catch (err) { toast(err.message, 'error'); } };
  if (volver) $('#setup-volver').onclick = pasoUrl;
}

function pasoUrl() {
  pintarSetup('Conectá este dispositivo con tu servidor.', [{ n: 'url', label: 'Dirección del servidor (Apps Script)', tipo: 'url', req: true, valor: S.url,
    ph: 'https://script.google.com/macros/s/.../exec', ayuda: 'Es la URL que termina en /exec, la que copiaste al implementar la aplicación web.' }], 'Continuar', async v => {
    const e = await api('clave.estado', {}, { url: v.url, clave: '' });
    S.url = v.url;
    if (e.definida) pasoClave(); else pasoDefinir();
  });
}

function pasoDefinir() {
  pintarSetup('Primer ingreso: definí tu clave de acceso.', [
    { n: 'nueva', label: 'Clave', tipo: 'password', req: true, ayuda: 'Mínimo 4 caracteres. Después la podés cambiar en Configuración.' },
    { n: 'repetir', label: 'Repetir clave', tipo: 'password', req: true }], 'Definir clave y entrar', async v => {
    if (v.nueva !== v.repetir) throw new Error('Las claves no coinciden.');
    await api('clave.definir', { nueva: v.nueva }, { clave: '' });
    await entrar(v.nueva);
  }, true);
}

function pasoClave() {
  pintarSetup('Ingresá tu clave de acceso.', [{ n: 'clave', label: 'Clave', tipo: 'password', req: true }], 'Entrar', v => entrar(v.clave), true);
}

async function entrar(clave) {
  S.clave = clave;
  await cargarMaestros();            // valida la clave contra el servidor
  guardarLS(LS_URL, S.url); guardarLS(LS_CLAVE, clave);
  iniciarApp(true);
}

async function iniciarApp(yaCargado) {
  $('#setup').classList.add('hidden'); $('#app').classList.remove('hidden');
  pintarNav();
  try {
    if (!yaCargado) await cargarMaestros();
  } catch (e) {
    toast(e.message, 'error');
    if (/Clave incorrecta|no se definió la clave/.test(e.message)) return mostrarSetup();
  }
  ir('inicio');
}

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { /* sin modo instalable */ });
if (S.url && S.clave) iniciarApp(false); else mostrarSetup();
