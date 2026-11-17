/* Si-Gestión – Pantallas de la etapa 1.
   Sin credenciales en el código: la dirección del servidor y la clave se ingresan
   en el primer uso y quedan guardadas solo en este dispositivo. */
'use strict';

// ------------------------------------------------------------ Estado y utilidades

const LS_URL = 'sg_api_url', LS_CLAVE = 'sg_clave';
const S = {
  url: leerLS(LS_URL), clave: leerLS(LS_CLAVE), vista: 'inicio', param: null,
  clientes: [], conceptos: [], cuentas: [], config: {}, numeradores: [],
  fVentas: { mes: mesActual(), cliente_id: '', anulados: false },
  fTes: { mes: mesActual(), cuenta_id: '', anulados: false },
  fCli: { q: '', inactivos: false }
};
const NAV = [
  ['inicio', 'home', 'Inicio'], ['clientes', 'groups', 'Clientes'], ['ventas', 'receipt_long', 'Ventas'],
  ['cobrar', 'request_quote', 'A cobrar'], ['tesoreria', 'account_balance', 'Tesorería'], ['config', 'settings', 'Config.']
];
const TIPOS = { FAC: 'Factura interna', ND: 'Nota de débito', NC: 'Nota de crédito' };

function leerLS(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
function guardarLS(k, v) { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) { /* sin almacenamiento */ } }
function $(s) { return document.querySelector(s); }
function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function hoy() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function mesActual() { return hoy().slice(0, 7); }
function fecha(f) { return f ? f.slice(8, 10) + '/' + f.slice(5, 7) + '/' + f.slice(0, 4) : ''; }
const fmt = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function plata(n) { n = Number(n) || 0; return (n < 0 ? '-' : '') + '$ ' + fmt.format(Math.abs(n)); }
function r2(n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; }
function ico(n) { return '<span class="material-symbols-rounded">' + n + '</span>'; }
function cli(id) { return S.clientes.find(c => c.id === id) || { id: id, nombre: '(sin nombre)' }; }
function activos(l) { return l.filter(x => x.activo !== 'NO'); }
function optClientes() { return activos(S.clientes).sort((a, b) => a.nombre.localeCompare(b.nombre)).map(c => [c.id, c.nombre]); }
function optConceptos() { return activos(S.conceptos).filter(c => c.tipo !== 'GASTO').map(c => [c.id, c.nombre]); }
function optCuentas() { return activos(S.cuentas).map(c => [c.id, c.nombre]); }
function rango(mes) { return mes ? { desde: mes + '-01', hasta: mes + '-31' } : {}; }

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

// ------------------------------------------------------------ Navegación

const TITULOS = { inicio: 'Inicio', clientes: 'Clientes', cliente: 'Ficha del cliente', ventas: 'Ventas', cobrar: 'Cuentas a cobrar', cuenta: 'Cuenta corriente', tesoreria: 'Tesorería', config: 'Configuración' };
const PADRE = { cliente: 'clientes', cuenta: 'cobrar' };

function pintarNav() {
  const html = NAV.map(n => '<button class="nav-btn" data-act="nav" data-v="' + n[0] + '">' + ico(n[1]) + '<span class="t">' + n[2] + '</span></button>').join('');
  $('#nav-side').innerHTML = html.replace('Config.', 'Configuración');
  $('#nav-bottom').innerHTML = html;
}

async function ir(vista, param) {
  S.vista = vista; S.param = param === undefined ? null : param;
  const marca = PADRE[vista] || vista;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.v === marca));
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
  const r = await Promise.all([api('config.leer'), api('clientes.listar')]);
  S.config = r[0].config; S.conceptos = r[0].conceptos; S.cuentas = r[0].cuentas; S.numeradores = r[0].numeradores;
  S.clientes = r[1];
  $('#empresa').textContent = S.config.empresa || 'Sipymes';
}

// ------------------------------------------------------------ Vistas

const VISTAS = {};

VISTAS.inicio = async function () {
  const d = await api('inicio');
  $('#main').innerHTML =
    '<div class="kpi-grid">' +
    kpi('account_balance_wallet', 'Tesorería', plata(d.total_tesoreria)) +
    kpi('request_quote', 'A cobrar', plata(d.a_cobrar), d.avisos.length ? 'warn' : '') +
    kpi('receipt_long', 'Ventas del mes', plata(d.ventas_mes)) +
    kpi('payments', 'Cobrado en el mes', plata(d.cobrado_mes), 'ok') +
    kpi('shopping_cart', 'Gastos del mes', plata(d.gastos_mes), 'bad') +
    kpi(d.resultado_mes < 0 ? 'trending_down' : 'trending_up', 'Resultado del mes', plata(d.resultado_mes), d.resultado_mes < 0 ? 'bad' : 'ok') +
    '</div><div class="dos">' +
    '<section class="card"><h2>Saldos de tesorería</h2>' +
    (d.cuentas.length ? d.cuentas.map(c => '<div class="fila"><span>' + esc(c.nombre) + ' <span class="chip">' + esc(c.tipo) + '</span></span><b class="num ' + (c.saldo < 0 ? 'neg' : '') + '">' + plata(c.saldo) + '</b></div>').join('')
      : '<p class="vacio">Todavía no hay cuentas. Crealas en Configuración.</p>') + '</section>' +
    '<section class="card"><h2>Clientes sin cobro pasada la fecha límite <span class="chip ' + (d.avisos.length ? 'rojo' : 'verde') + '">' + d.avisos.length + '</span></h2>' +
    (d.avisos.length ? tabla([{ t: 'Cliente' }, { t: 'Venció', c: 'hm' }, { t: 'Días', c: 'num' }, { t: 'Pendiente', c: 'num' }, { t: '' }],
      d.avisos.map(a => ({ c: ['<button class="link" data-act="cuenta" data-id="' + a.cliente_id + '">' + esc(a.cliente) + '</button><br><span class="muted small">' + esc(a.id) + '</span>',
        fecha(a.vencimiento), a.dias, plata(a.pendiente), boton('recNuevo', 'Cobrar', '', ' data-id="' + a.cliente_id + '"', 'btn-sm')] })))
      : '<p class="vacio">Todo al día.</p>') + '</section></div>';
};

VISTAS.clientes = async function () {
  $('#acciones').innerHTML = boton('cliNuevo', 'Nuevo cliente', 'person_add', '', 'btn-primary');
  const q = S.fCli.q.toLowerCase();
  const lista = S.clientes.filter(c => (S.fCli.inactivos || c.activo !== 'NO') && (!q || (c.nombre + ' ' + c.cuit).toLowerCase().includes(q)))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  $('#main').innerHTML = '<section class="card"><div class="filtros" style="margin-bottom:12px">' +
    '<div class="campo"><label for="q">Buscar</label><input id="q" type="search" value="' + esc(S.fCli.q) + '" placeholder="Nombre o CUIT" data-inp="cliBuscar"></div>' +
    '<label class="check"><input type="checkbox" data-chg="cliInactivos"' + (S.fCli.inactivos ? ' checked' : '') + '> Ver inactivos</label></div>' +
    '<div id="cli-lista">' + tablaClientes(lista) + '</div></section>';
};
function tablaClientes(lista) {
  return tabla([{ t: 'Cliente' }, { t: 'CUIT', c: 'hm' }, { t: 'Email', c: 'hm' }, { t: 'Día límite', c: 'num' }, { t: '' }],
    lista.map(c => ({ attr: 'class="click" data-act="cliVer" data-id="' + c.id + '"', c: [
      '<b>' + esc(c.nombre) + '</b>' + (c.activo === 'NO' ? ' <span class="chip">Inactivo</span>' : ''), esc(c.cuit), esc(c.email),
      c.dia_limite || '<span class="muted">' + esc(S.config.dia_limite_default || 10) + '</span>', ico('chevron_right')] })));
}

VISTAS.cliente = async function (id) {
  const c = cli(id);
  const abonos = await api('abonos.listar', { cliente_id: id });
  $('#titulo').textContent = c.nombre;
  $('#acciones').innerHTML = boton('nav', 'Volver', 'arrow_back', ' data-v="clientes"') + boton('cuenta', 'Cuenta corriente', 'request_quote', ' data-id="' + id + '"') +
    boton('venNueva', 'Comprobante', 'add', ' data-id="' + id + '"', 'btn-primary');
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
  $('#main').innerHTML =
    '<section class="card"><h2>Datos ' + boton('cliEditar', 'Editar', 'edit', ' data-id="' + id + '"', 'btn-sm') + '</h2><div class="datos">' +
    [['Código', c.id], ['CUIT', c.cuit], ['Email', c.email], ['Teléfono', c.telefono], ['Día límite de cobro', c.dia_limite || (S.config.dia_limite_default || 10) + ' (general)'],
      ['Estado', c.activo === 'NO' ? 'Inactivo' : 'Activo'], ['Notas', c.notas]].map(x => '<div><small>' + x[0] + '</small>' + (esc(x[1]) || '—') + '</div>').join('') + '</div></section>' +
    '<section class="card"><h2>Abono mensual ' + boton('aboNuevo', 'Nuevo abono o aumento', 'add', ' data-id="' + id + '"', 'btn-sm') + '</h2>' +
    tabla([{ t: 'Vigente desde' }, { t: 'Concepto', c: 'hm' }, { t: 'Importe', c: 'num' }, { t: 'Estado' }, { t: '' }],
      abonos.map(a => ({ attr: a.estado === 'ANULADO' ? 'class="anulado"' : '', c: [fecha(a.vigencia_desde), esc(a.concepto) + (a.detalle ? '<br><span class="muted small">' + esc(a.detalle) + '</span>' : ''),
        plata(a.importe), estado(a), a.estado === 'ANULADO' ? '' : icoBtn('aboAnular', 'block', 'Anular abono', ' data-id="' + a.id + '"', 'rojo')] }))) +
    '<p class="muted small" style="margin-top:10px">Un aumento se carga como abono nuevo con su fecha de vigencia. Para dar de baja el abono, cargá uno con importe 0.</p></section>';
};

VISTAS.ventas = async function () {
  $('#acciones').innerHTML = boton('venAbonos', 'Generar abonos', 'event_repeat') + boton('venNueva', 'Nuevo comprobante', 'add', '', 'btn-primary');
  const f = S.fVentas;
  const lista = await api('ventas.listar', Object.assign({ cliente_id: f.cliente_id, con_anulados: f.anulados }, rango(f.mes)));
  let total = 0, pend = 0;
  lista.forEach(c => { if (c.estado !== 'ANULADO') { total += (c.tipo === 'NC' ? -1 : 1) * Number(c.importe); if (c.tipo !== 'NC') pend += c.pendiente; } });
  $('#main').innerHTML = '<section class="card"><div class="filtros" style="margin-bottom:12px">' +
    '<div class="campo"><label for="fv-mes">Mes</label><input id="fv-mes" type="month" value="' + f.mes + '" data-chg="venFiltro"></div>' +
    '<div class="campo"><label for="fv-cli">Cliente</label><select id="fv-cli" data-chg="venFiltro"><option value="">Todos</option>' +
    optClientes().map(o => '<option value="' + o[0] + '"' + (o[0] === f.cliente_id ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select></div>' +
    '<label class="check"><input id="fv-anu" type="checkbox" data-chg="venFiltro"' + (f.anulados ? ' checked' : '') + '> Ver anulados</label></div>' +
    tabla([{ t: 'Fecha' }, { t: 'Comprobante' }, { t: 'Cliente' }, { t: 'Detalle', c: 'hm' }, { t: 'Importe', c: 'num' }, { t: 'Pendiente', c: 'num hm' }, { t: 'Fact. real', c: 'hm' }, { t: '' }],
      lista.map(c => ({ attr: c.estado === 'ANULADO' ? 'class="anulado"' : '', c: [
        fecha(c.fecha), '<span class="chip ' + (c.tipo === 'NC' ? 'ambar' : 'azul') + '">' + esc(c.id) + '</span>', esc(c.cliente),
        esc(c.detalle || c.concepto), (c.tipo === 'NC' ? '-' : '') + plata(c.importe),
        c.estado === 'ANULADO' ? '<span class="chip">Anulado</span>' : (c.pendiente > 0 ? plata(c.pendiente) : '<span class="chip verde">' + (c.tipo === 'NC' ? 'Aplicada' : 'Cobrado') + '</span>'),
        esc(c.nro_factura_real),
        c.estado === 'ANULADO' ? '' : icoBtn('venFactura', 'edit_note', 'Anotar número de factura real', ' data-id="' + c.id + '" data-v="' + esc(c.nro_factura_real) + '"') +
          icoBtn('venAnular', 'block', 'Anular', ' data-id="' + c.id + '"', 'rojo')] })),
      ['', '', 'Total', '', plata(total), plata(pend), '', '']) + '</section>';
};

VISTAS.cobrar = async function () {
  const saldos = (await api('cobrar.saldos')).filter(s => s.saldo !== 0 || s.a_cuenta !== 0 || s.activo !== 'NO').sort((a, b) => b.saldo - a.saldo);
  const t = saldos.reduce((a, s) => ({ saldo: a.saldo + s.saldo, vencido: a.vencido + s.vencido, a_cuenta: a.a_cuenta + s.a_cuenta }), { saldo: 0, vencido: 0, a_cuenta: 0 });
  $('#acciones').innerHTML = boton('recNuevo', 'Registrar cobro', 'payments', '', 'btn-primary');
  $('#main').innerHTML = '<section class="card">' +
    tabla([{ t: 'Cliente' }, { t: 'Saldo', c: 'num' }, { t: 'Vencido', c: 'num' }, { t: 'A cuenta', c: 'num hm' }, { t: '' }],
      saldos.map(s => ({ attr: 'class="click" data-act="cuenta" data-id="' + s.id + '"', c: ['<b>' + esc(s.nombre) + '</b>', '<span class="' + (s.saldo < 0 ? 'pos' : '') + '">' + plata(s.saldo) + '</span>',
        s.vencido > 0 ? '<span class="neg">' + plata(s.vencido) + '</span>' : '—', s.a_cuenta > 0 ? plata(s.a_cuenta) : '—', ico('chevron_right')] })),
      ['Total', plata(t.saldo), plata(t.vencido), plata(t.a_cuenta), '']) + '</section>';
};

VISTAS.cuenta = async function (id) {
  const c = cli(id);
  const r = await Promise.all([api('cobrar.pendientes', { cliente_id: id }), api('cobrar.recibos', { cliente_id: id, con_anulados: true })]);
  const p = r[0], recibos = r[1].slice(0, 30), h = hoy();
  S.pend = p;
  const deuda = p.comprobantes.reduce((a, x) => a + x.pendiente, 0), cred = p.creditos.reduce((a, x) => a + x.pendiente, 0);
  $('#titulo').textContent = c.nombre;
  $('#acciones').innerHTML = boton('nav', 'Volver', 'arrow_back', ' data-v="cobrar"') + boton('estado', 'Estado de cuenta', 'description', ' data-id="' + id + '"') +
    boton('recNuevo', 'Registrar cobro', 'payments', ' data-id="' + id + '"', 'btn-primary');
  $('#main').innerHTML = '<div class="kpi-grid">' + kpi('request_quote', 'Pendiente', plata(deuda), deuda > 0 ? 'warn' : 'ok') + kpi('savings', 'Créditos sin aplicar', plata(cred)) +
    kpi('balance', 'Saldo', plata(r2(deuda - cred)), deuda - cred > 0 ? '' : 'ok') + '</div>' +
    '<section class="card"><h2>Comprobantes pendientes</h2>' +
    tabla([{ t: 'Comprobante' }, { t: 'Fecha', c: 'hm' }, { t: 'Vence' }, { t: 'Detalle', c: 'hm' }, { t: 'Importe', c: 'num hm' }, { t: 'Pendiente', c: 'num' }],
      p.comprobantes.map(x => ({ c: ['<span class="chip azul">' + esc(x.id) + '</span>', fecha(x.fecha),
        fecha(x.vencimiento) + (x.vencimiento && x.vencimiento < h ? ' <span class="chip rojo">Vencido</span>' : ''), esc(x.detalle), plata(x.importe), '<b>' + plata(x.pendiente) + '</b>'] }))) + '</section>' +
    (p.creditos.length ? '<section class="card"><h2>Créditos sin aplicar</h2>' +
      tabla([{ t: 'Origen' }, { t: 'Fecha' }, { t: 'Disponible', c: 'num' }, { t: '' }],
        p.creditos.map(x => ({ c: ['<span class="chip ambar">' + esc(x.id) + '</span>', fecha(x.fecha), plata(x.pendiente),
          p.comprobantes.length ? boton('credAplicar', 'Aplicar', '', ' data-id="' + x.id + '" data-max="' + x.pendiente + '"', 'btn-sm') : ''] }))) + '</section>' : '') +
    '<section class="card"><h2>Recibos</h2>' +
    tabla([{ t: 'Fecha' }, { t: 'Recibo' }, { t: 'Cuenta', c: 'hm' }, { t: 'Importe', c: 'num' }, { t: 'A cuenta', c: 'num hm' }, { t: '' }],
      recibos.map(x => ({ attr: x.estado === 'ANULADO' ? 'class="anulado"' : '', c: [fecha(x.fecha), '<span class="chip verde">' + esc(x.id) + '</span>', esc(x.cuenta), plata(x.importe),
        x.a_cuenta > 0 ? plata(x.a_cuenta) : '—', x.estado === 'ANULADO' ? '<span class="chip">Anulado</span>' : icoBtn('recAnular', 'block', 'Anular recibo', ' data-id="' + x.id + '"', 'rojo')] }))) + '</section>';
};

VISTAS.tesoreria = async function () {
  const f = S.fTes;
  const r = await Promise.all([api('tesoreria.saldos'), api('tesoreria.movimientos', Object.assign({ cuenta_id: f.cuenta_id, con_anulados: f.anulados }, rango(f.mes)))]);
  const saldos = r[0].filter(c => c.activo !== 'NO' || c.saldo !== 0), movs = r[1];
  $('#acciones').innerHTML = boton('trfNueva', 'Transferencia', 'swap_horiz') + boton('movNuevo', 'Movimiento', 'add', '', 'btn-primary');
  $('#main').innerHTML = (saldos.length ? '<div class="kpi-grid">' + saldos.map(c => kpi(c.tipo === 'CAJA' ? 'point_of_sale' : c.tipo === 'BANCO' ? 'account_balance' : 'account_balance_wallet', esc(c.nombre), plata(c.saldo), c.saldo < 0 ? 'bad' : '')).join('') +
    kpi('functions', 'Total', plata(saldos.reduce((a, c) => a + c.saldo, 0)), 'ok') + '</div>' : '<div class="card"><p class="vacio">Todavía no hay cuentas de tesorería. Crealas en Configuración.</p></div>') +
    '<section class="card"><h2>Movimientos</h2><div class="filtros" style="margin-bottom:12px">' +
    '<div class="campo"><label for="ft-mes">Mes</label><input id="ft-mes" type="month" value="' + f.mes + '" data-chg="tesFiltro"></div>' +
    '<div class="campo"><label for="ft-cta">Cuenta</label><select id="ft-cta" data-chg="tesFiltro"><option value="">Todas</option>' +
    S.cuentas.map(c => '<option value="' + c.id + '"' + (c.id === f.cuenta_id ? ' selected' : '') + '>' + esc(c.nombre) + '</option>').join('') + '</select></div>' +
    '<label class="check"><input id="ft-anu" type="checkbox" data-chg="tesFiltro"' + (f.anulados ? ' checked' : '') + '> Ver anulados</label></div>' +
    tabla([{ t: 'Fecha' }, { t: 'N°', c: 'hm' }, { t: 'Cuenta' }, { t: 'Detalle', c: 'hm' }, { t: 'Ingreso', c: 'num' }, { t: 'Egreso', c: 'num' }, { t: '' }],
      movs.map(m => ({ attr: m.estado === 'ANULADO' ? 'class="anulado"' : '', c: [fecha(m.fecha), esc(m.id), esc(m.cuenta), esc(m.detalle),
        m.tipo === 'INGRESO' ? '<span class="pos">' + plata(m.importe) + '</span>' : '', m.tipo === 'EGRESO' ? '<span class="neg">' + plata(m.importe) + '</span>' : '',
        m.estado === 'ANULADO' ? '<span class="chip">Anulado</span>' : (m.origen === 'RECIBO' || m.origen === 'PAGO' ? '<span class="chip" title="Se anula desde el recibo">' + esc(m.origen_id) + '</span>' : icoBtn('movAnular', 'block', 'Anular', ' data-id="' + m.id + '"', 'rojo'))] }))) + '</section>';
};

VISTAS.config = async function () {
  await cargarMaestros();
  const g = S.config;
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
      '<span class="chip ' + (c.tipo === 'GASTO' ? 'rojo' : 'verde') + '">' + esc(c.tipo) + '</span>', esc(c.rubro), icoBtn('conEditar', 'edit', 'Editar', ' data-id="' + c.id + '"')] }))) + '</section>' +
    '<section class="card"><h2>Cuentas de tesorería ' + boton('ctaNueva', 'Nueva', 'add', '', 'btn-sm') + '</h2>' +
    tabla([{ t: 'Cuenta' }, { t: 'Tipo' }, { t: '' }], S.cuentas.map(c => ({ c: [esc(c.nombre) + (c.activo === 'NO' ? ' <span class="chip">Inactiva</span>' : ''), '<span class="chip">' + esc(c.tipo) + '</span>',
      icoBtn('ctaEditar', 'edit', 'Editar', ' data-id="' + c.id + '"')] }))) + '</section></div>' +
    '<section class="card"><h2>Acceso y mantenimiento</h2><div class="acciones">' + boton('claveCambiar', 'Cambiar clave', 'key') +
    boton('reinstalar', 'Revisar instalación', 'build') + boton('desconectar', 'Desconectar este dispositivo', 'logout') + '</div>' +
    '<p class="muted small" style="margin-top:10px">"Revisar instalación" vuelve a crear las hojas que falten y reprograma la tarea diaria (abonos del día 1 y avisos). No borra datos.</p></section>';
};

// ------------------------------------------------------------ Formularios

function formCliente(c) {
  c = c || {};
  const campos = [
    { n: 'nombre', label: 'Nombre o razón social', req: true, valor: c.nombre }, { n: 'cuit', label: 'CUIT', valor: c.cuit },
    { n: 'email', label: 'Email', tipo: 'email', valor: c.email }, { n: 'telefono', label: 'Teléfono', valor: c.telefono },
    { n: 'dia_limite', label: 'Día límite de cobro', tipo: 'number', step: 1, min: 1, max: 31, valor: c.dia_limite, ayuda: 'Vacío: se usa el día general (' + (S.config.dia_limite_default || 10) + ').' },
    { n: 'notas', label: 'Notas', tipo: 'textarea', valor: c.notas }];
  if (c.id) campos.push({ n: 'activo', label: 'Estado', tipo: 'select', valor: c.activo === 'NO' ? 'NO' : 'SI', opciones: [['SI', 'Activo'], ['NO', 'Inactivo']] });
  abrirForm({ titulo: c.id ? 'Editar cliente' : 'Nuevo cliente', campos: campos, despues: false, ok: async v => {
    if (c.id) v.id = c.id;
    const g = await api('clientes.guardar', v);
    const i = S.clientes.findIndex(x => x.id === g.id);
    if (i >= 0) S.clientes[i] = g; else S.clientes.push(g);
    toast('Cliente guardado.', 'ok');
    ir('cliente', g.id);
  } });
}

function formVenta(clienteId) {
  if (!optClientes().length) return toast('Primero cargá un cliente.', 'error');
  const campos = [
    { n: 'tipo', label: 'Tipo', tipo: 'select', opciones: Object.keys(TIPOS).map(k => [k, TIPOS[k]]) },
    { n: 'cliente_id', label: 'Cliente', tipo: 'select', opciones: optClientes(), valor: clienteId, req: true },
    { n: 'concepto_id', label: 'Concepto', tipo: 'select', opciones: optConceptos(), req: true },
    { n: 'fecha', label: 'Fecha', tipo: 'date', valor: hoy(), req: true },
    { n: 'importe', label: 'Importe total', tipo: 'number', min: 0.01, req: true },
    { n: 'detalle', label: 'Detalle' },
    { n: 'vencimiento', label: 'Fecha límite de cobro', tipo: 'date', ayuda: 'Vacío: se calcula con el día límite del cliente.' },
    { n: 'aplica_a', label: 'Aplicar a', tipo: 'select', opciones: [['', 'No aplicar (queda a cuenta)']] },
    { n: 'nro_factura_real', label: 'N° de factura real (opcional)' }];
  abrirForm({ titulo: 'Nuevo comprobante', campos: campos, textoOk: 'Emitir', nota: 'Comprobante interno, sin efecto fiscal. El número lo asigna el sistema.', ok: async v => {
    const c = await api('ventas.emitir', v);
    toast('Emitido ' + c.id + '.', 'ok');
  } });
  const tipo = $('#f-tipo'), cl = $('#f-cliente_id');
  async function ajustar() {
    const nc = tipo.value === 'NC';
    $('#c-aplica_a').classList.toggle('hidden', !nc);
    $('#c-vencimiento').classList.toggle('hidden', nc);
    if (!nc || !cl.value) return;
    try {
      const p = await api('cobrar.pendientes', { cliente_id: cl.value }, { silencioso: true });
      $('#f-aplica_a').innerHTML = '<option value="">No aplicar (queda a cuenta)</option>' +
        p.comprobantes.map(x => '<option value="' + x.id + '">' + esc(x.id) + ' – pendiente ' + plata(x.pendiente) + '</option>').join('');
    } catch (e) { toast(e.message, 'error'); }
  }
  tipo.addEventListener('change', ajustar); cl.addEventListener('change', ajustar);
  ajustar();
}

function formRecibo(clienteId) {
  if (!optClientes().length) return toast('Primero cargá un cliente.', 'error');
  if (!optCuentas().length) return toast('Primero creá una cuenta de tesorería en Configuración.', 'error');
  const campos = [
    { n: 'cliente_id', label: 'Cliente', tipo: 'select', opciones: optClientes(), valor: clienteId, req: true },
    { n: 'fecha', label: 'Fecha', tipo: 'date', valor: hoy(), req: true },
    { n: 'cuenta_id', label: 'Ingresa en', tipo: 'select', opciones: optCuentas(), req: true },
    { n: 'importe', label: 'Importe cobrado', tipo: 'number', min: 0.01, req: true },
    { n: 'detalle', label: 'Detalle' }];
  let pend = [];
  abrirForm({ titulo: 'Registrar cobro', campos: campos, textoOk: 'Emitir recibo', ok: async v => {
    v.imputaciones = pend.map(p => ({ comprobante_id: p.id, importe: Number($('#imp-' + p.id).value) || 0 })).filter(i => i.importe > 0);
    const r = await api('cobrar.recibo', v);
    toast('Recibo ' + r.id + ' emitido' + (r.a_cuenta > 0 ? '. Quedan ' + plata(r.a_cuenta) + ' a cuenta.' : '.'), 'ok');
  } });
  const cl = $('#f-cliente_id'), imp = $('#f-importe'), extra = $('#f-extra');
  function resto() {
    const usado = pend.reduce((a, p) => a + (Number($('#imp-' + p.id).value) || 0), 0), r = r2((Number(imp.value) || 0) - usado);
    $('#imp-resto').innerHTML = r < 0 ? '<span class="neg">Las imputaciones superan el cobro en ' + plata(-r) + '</span>' : 'Queda a cuenta: <b>' + plata(r) + '</b>';
  }
  function distribuir() {
    let r = Number(imp.value) || 0;
    pend.forEach(p => { const m = Math.min(r, p.pendiente); $('#imp-' + p.id).value = m > 0 ? r2(m) : ''; r = r2(r - m); });
    resto();
  }
  async function cargar() {
    extra.innerHTML = '<p class="muted small">Buscando comprobantes pendientes…</p>';
    try { pend = (await api('cobrar.pendientes', { cliente_id: cl.value }, { silencioso: true })).comprobantes; } catch (e) { pend = []; toast(e.message, 'error'); }
    if (!imp.value || imp.dataset.auto) { imp.value = r2(pend.reduce((a, p) => a + p.pendiente, 0)) || ''; imp.dataset.auto = '1'; }
    extra.innerHTML = '<div class="campo"><label>Se aplica a</label>' + (pend.length ? '<div class="imputa">' + pend.map(p =>
      '<span>' + esc(p.id) + ' <span class="muted small">vence ' + fecha(p.vencimiento) + '</span></span><span class="pend num muted">' + plata(p.pendiente) + '</span>' +
      '<input type="number" step="0.01" min="0" max="' + p.pendiente + '" id="imp-' + p.id + '" inputmode="decimal" aria-label="Importe a aplicar a ' + esc(p.id) + '">').join('') + '</div>'
      : '<p class="muted small">Este cliente no tiene comprobantes pendientes: el cobro queda a cuenta.</p>') + '<small id="imp-resto"></small></div>';
    pend.forEach(p => $('#imp-' + p.id).addEventListener('input', resto));
    distribuir();
  }
  cl.addEventListener('change', cargar);
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
  abrirForm({ titulo: titulo, campos: campos, ok: async v => { if (o.id) v.id = o.id; await api(accion, v); toast('Guardado.', 'ok'); } });
}

async function verEstado(id, v) {
  const e = await api('cobrar.estadoCuenta', { cliente_id: id, desde: v.desde, hasta: v.hasta });
  S.ec = { cliente_id: id, desde: v.desde, hasta: v.hasta };
  abrirModal('<h2>Estado de cuenta – ' + esc(e.cliente.nombre) + '</h2>' +
    '<p class="muted small" style="margin-bottom:10px">' + (v.desde || v.hasta ? 'Del ' + (fecha(v.desde) || 'inicio') + ' al ' + (fecha(v.hasta) || fecha(hoy())) : 'Completo al ' + fecha(hoy())) + '</p>' +
    tabla([{ t: 'Fecha' }, { t: 'Comprobante' }, { t: 'Detalle', c: 'hm' }, { t: 'Debe', c: 'num' }, { t: 'Haber', c: 'num' }, { t: 'Saldo', c: 'num' }],
      [{ c: ['', '', 'Saldo anterior', '', '', plata(e.saldo_anterior)] }].concat(e.lineas.map(l => ({ c: [fecha(l.fecha), esc(l.comprobante), esc(l.detalle), l.debe ? plata(l.debe) : '', l.haber ? plata(l.haber) : '', plata(l.saldo)] }))),
      ['', '', 'Saldo', '', '', plata(e.saldo)]) +
    '<div class="modal-pie" style="margin-top:14px">' + boton('cerrar', 'Cerrar') + boton('pdf', 'Descargar PDF', 'picture_as_pdf', '', 'btn-primary') + '</div>', true);
}

// ------------------------------------------------------------ Acciones (clics)

const ACT = {
  nav: d => ir(d.v),
  recargar: () => recargar(),
  cerrar: () => cerrarModal(),
  cliNuevo: () => formCliente(),
  cliVer: d => ir('cliente', d.id),
  cliEditar: d => formCliente(cli(d.id)),
  cuenta: d => ir('cuenta', d.id),
  aboNuevo: d => {
    const m = new Date(); m.setDate(1); m.setMonth(m.getMonth() + 1);
    const prox = m.getFullYear() + '-' + String(m.getMonth() + 1).padStart(2, '0') + '-01';
    abrirForm({ titulo: 'Nuevo abono o aumento', nota: 'Rige para las facturas que se generen desde la fecha de vigencia. Importe 0 = baja del abono.', campos: [
      { n: 'concepto_id', label: 'Concepto', tipo: 'select', opciones: optConceptos(), req: true },
      { n: 'importe', label: 'Importe mensual', tipo: 'number', req: true },
      { n: 'vigencia_desde', label: 'Vigente desde', tipo: 'date', valor: prox, req: true },
      { n: 'detalle', label: 'Detalle para la factura (opcional)' }],
    ok: async v => { v.cliente_id = d.id; await api('abonos.guardar', v); toast('Abono guardado.', 'ok'); } });
  },
  aboAnular: d => abrirForm({ titulo: 'Anular abono ' + d.id, peligro: true, textoOk: 'Anular', nota: 'Usalo solo si se cargó por error. Para una baja, cargá un abono con importe 0.', campos: [],
    ok: async () => { await api('abonos.anular', { id: d.id }); toast('Abono anulado.', 'ok'); } }),
  venNueva: d => formVenta(d.id),
  venAnular: d => formAnular('Anular', 'ventas.anular', d.id),
  venFactura: d => abrirForm({ titulo: 'Factura real de ' + d.id, campos: [{ n: 'nro_factura_real', label: 'N° de la factura real', valor: d.v }],
    ok: async v => { await api('ventas.facturaReal', { id: d.id, nro_factura_real: v.nro_factura_real }); toast('Guardado.', 'ok'); } }),
  venAbonos: () => abrirForm({ titulo: 'Generar abonos del mes', textoOk: 'Generar', nota: 'Crea la factura interna de cada cliente con abono vigente. No duplica las que ya existen.',
    campos: [{ n: 'periodo', label: 'Período', tipo: 'month', valor: mesActual(), req: true }],
    ok: async v => { const r = await api('ventas.generarAbonos', v); S.fVentas.mes = r.periodo; toast(r.creados.length ? r.creados.length + ' factura(s) generada(s).' : 'No había abonos pendientes de generar.', 'ok'); } }),
  recNuevo: d => formRecibo(d.id),
  recAnular: d => formAnular('Anular recibo', 'cobrar.anularRecibo', d.id),
  credAplicar: d => {
    const comps = S.pend.comprobantes, max = Number(d.max);
    abrirForm({ titulo: 'Aplicar crédito ' + d.id, textoOk: 'Aplicar', campos: [
      { n: 'comprobante_id', label: 'Comprobante', tipo: 'select', opciones: comps.map(x => [x.id, x.id + ' – pendiente ' + plata(x.pendiente)]), req: true },
      { n: 'importe', label: 'Importe', tipo: 'number', min: 0.01, valor: Math.min(max, comps[0].pendiente), req: true, ayuda: 'Disponible: ' + plata(max) }],
    ok: async v => { v.origen_id = d.id; await api('cobrar.imputar', v); toast('Crédito aplicado.', 'ok'); } });
  },
  estado: d => abrirForm({ titulo: 'Estado de cuenta', textoOk: 'Ver', despues: false, nota: 'Dejá las fechas vacías para ver la cuenta completa.',
    campos: [{ n: 'desde', label: 'Desde', tipo: 'date' }, { n: 'hasta', label: 'Hasta', tipo: 'date' }],
    ok: async v => { setTimeout(() => verEstado(d.id, v).catch(e => toast(e.message, 'error')), 0); } }),
  pdf: async () => {
    const p = await api('cobrar.estadoCuentaPdf', S.ec);
    const bin = atob(p.base64), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([bytes], { type: p.mime })); a.download = p.nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  },
  movNuevo: () => {
    if (!optCuentas().length) return toast('Primero creá una cuenta de tesorería en Configuración.', 'error');
    abrirForm({ titulo: 'Movimiento de tesorería', nota: 'Para saldos iniciales y ajustes. Los cobros entran solos con cada recibo.', campos: [
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
  cfgGuardar: async () => {
    const v = { empresa: $('#f-empresa').value.trim(), dia_limite_default: $('#f-dia_limite_default').value.trim(), email_avisos: $('#f-email_avisos').value.trim() };
    if (!$('#cfg').reportValidity()) return;
    await api('config.guardar', v); toast('Configuración guardada.', 'ok'); recargar();
  },
  conNuevo: () => formMaestro('Nuevo concepto', 'conceptos.guardar', null, [['INGRESO', 'Ingreso'], ['GASTO', 'Gasto']]),
  conEditar: d => formMaestro('Editar concepto', 'conceptos.guardar', S.conceptos.find(c => c.id === d.id), [['INGRESO', 'Ingreso'], ['GASTO', 'Gasto']]),
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
  venFiltro: () => { S.fVentas = { mes: $('#fv-mes').value, cliente_id: $('#fv-cli').value, anulados: $('#fv-anu').checked }; recargar(); },
  tesFiltro: () => { S.fTes = { mes: $('#ft-mes').value, cuenta_id: $('#ft-cta').value, anulados: $('#ft-anu').checked }; recargar(); },
  cliInactivos: el => { S.fCli.inactivos = el.checked; recargar(); }
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
  if (e.target.dataset && e.target.dataset.inp === 'cliBuscar') {
    S.fCli.q = e.target.value;
    const q = S.fCli.q.toLowerCase();
    $('#cli-lista').innerHTML = tablaClientes(S.clientes.filter(c => (S.fCli.inactivos || c.activo !== 'NO') && (!q || (c.nombre + ' ' + c.cuit).toLowerCase().includes(q))).sort((a, b) => a.nombre.localeCompare(b.nombre)));
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').classList.contains('hidden')) cerrarModal(); });

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
