/* =====================================================================
   🔌 MÓDULO AUTOMÁTICO — recibe los VALORES (multiplicadores) del juego
   - Muestra la franja de valores igual que el sitio (azul <2x, morado 2–10x, rosa ≥10x)
   - window.recibirVela(valor)              → un valor nuevo
   - window.sincronizarHistorial(lista)     → franja completa (más reciente primero);
                                              solo agrega los valores NUEVOS, sin duplicar
   - Cada valor nuevo pulsa el botón equivalente (−2 / +2 V / +10 Rosa / +4 Dorado),
     así rastreador, memoria, soportes y avisos funcionan igual que a mano.
   ===================================================================== */
(function () {
  'use strict';

  // ── Reglas valor → botón (ajustables en el panel) ─────────────────────
  const CFG_KEY = 'auto_velas_cfg_v2';
  const cfg = Object.assign(
    { rojaMax: 2, rosaMin: 10, doradaMin: 4 },   // dorada: de 4x hasta antes de la rosa (doradaMin 0 = desactivada)
    (() => { try { return JSON.parse(localStorage.getItem(CFG_KEY)) || {}; } catch (e) { return {}; } })()
  );
  const guardarCfg = () => { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {} };

  function clasificar(m) {
    if (m < 1.01) return { btn: 'btn13', nombre: 'Vino' };     // 1.00x = la más baja: vela vino grande
    if (m >= cfg.rosaMin) return { btn: 'btn9', nombre: 'Rosa' };
    if (cfg.doradaMin > 0 && m >= cfg.doradaMin) return { btn: 'btn10', nombre: 'Dorada' };
    if (m >= cfg.rojaMax) return { btn: 'btn2', nombre: 'Verde' };
    return { btn: 'btn1', nombre: 'Roja' };
  }
  // Colores como en el sitio (Aviator): azul < 2x · morado 2–10x · rosa ≥ 10x
  const colSitio = m => m >= 10 ? '#d21cc0' : m >= 2 ? '#a259ff' : '#34b4ff';

  function leerValor(x) {
    const m = parseFloat(String(x).replace(/[^0-9.,]/g, '').replace(',', '.'));
    return (isFinite(m) && m >= 1) ? m : null;
  }

  // ── Conexión con el juego (URL y apertura automática) ─────────────────
  const CONN_KEY = 'auto_velas_conn_v1';
  const conn = Object.assign(
    { url: 'https://astrobet.ec/casino/aviator/3144', autoAbrir: true, sitios: [] },
    (() => { try { return JSON.parse(localStorage.getItem(CONN_KEY)) || {}; } catch (e) { return {}; } })()
  );
  // Enlaces del juego: los 2 de fábrica + los que añadas
  const SITIOS_BASE = [
    { n: 'Astrobet', u: 'https://astrobet.ec/casino/aviator/3144' },
    { n: 'Ecuabet', u: 'https://ecuabet.com/new-casino/203831' }
  ];
  if (!Array.isArray(conn.sitios)) conn.sitios = [];
  const todosSitios = () => SITIOS_BASE.concat(conn.sitios);
  const guardarConn = () => { try { localStorage.setItem(CONN_KEY, JSON.stringify(conn)); } catch (e) {} };
  window.aviatorConfig = () => ({ url: conn.url, autoAbrir: conn.autoAbrir });   // lo lee el lector (userscript)

  // ── Estado ────────────────────────────────────────────────────────────
  // El historial se guarda entre recargas: así, al volver a leer la franja del sitio,
  // no se re-agregan valores que ya estaban (evitaría duplicar la Memoria IA).
  const HIST_KEY = 'auto_velas_hist_v1';
  const historial = [];            // { m } del más antiguo al más reciente
  const guardarHist = () => { try { localStorage.setItem(HIST_KEY, JSON.stringify(historial.slice(-300).map(d => d.m))); } catch (e) {} };
  let _ult = { m: null, t: 0 };
  let modoAuto = true;
  let ultimaLectura = 0;           // cualquier señal de vida (valor o lectura sin cambios)
  let ultimoId = null;

  // ── Panel ─────────────────────────────────────────────────────────────
  const panel = document.createElement('div');
  panel.id = 'panel-auto';
  panel.innerHTML = `
    <div class="pa-head">
      <h3>🔌 Valores del juego</h3>
      <span id="pa-estado" class="pa-estado off">🔴 Sin señal</span>
      <label class="pa-sw"><input type="checkbox" id="pa-auto" checked> Automático</label>
    </div>
    <div class="pa-conn">
      <select id="pa-sitio" title="Página del juego"></select>
      <input id="pa-url" type="text" value="${conn.url}" placeholder="Enlace del juego (Aviator)" spellcheck="false">
      <button id="pa-abrir">🔗 Abrir juego</button>
      <button id="pa-guardar" title="Guarda este enlace en la lista">➕ Guardar enlace</button>
      <button id="pa-quitar" title="Quita de la lista el enlace seleccionado (solo los que añadiste)">🗑 Quitar</button>
      <label><input type="checkbox" id="pa-autoabrir" ${conn.autoAbrir ? 'checked' : ''}> Abrirlo solo al iniciar la app</label>
    </div>
    <div class="pa-nota">Usa tu sesión ya iniciada en Chrome: la app no pide ni guarda tu contraseña.</div>
    <div class="pa-cfg">
      <span class="pa-ultima">Último: <b id="pa-ult">—</b></span>
    </div>
    <div id="pa-diag" class="pa-diag"></div>
    `;
  const anclaCharts = document.getElementById('charts-section');
  (anclaCharts?.parentNode || document.body).insertBefore(panel, anclaCharts);

  const $ = id => document.getElementById(id);

  function refrescar() {}

  // ── Entrada de un valor ───────────────────────────────────────────────
  function recibirVela(mult, id, masivo) {
    const m = leerValor(mult);
    if (m === null) return false;
    if (id != null && id === ultimoId) return false;           // evita duplicados con id
    if (id != null) ultimoId = id;
    ultimaLectura = Date.now();

    // Anti-doble: el mismo valor dos veces en menos de 4 s es una lectura repetida (una ronda dura más)
    const ahoraT = Date.now();
    if (!masivo && (id == null || !String(id).startsWith('manual'))) {
      if (_ult.m === m && ahoraT - _ult.t < 4000) return false;
    }
    _ult = { m, t: ahoraT };
    const k = clasificar(m);
    historial.push({ m });
    if (historial.length > 300) historial.shift();
    guardarHist();
    $('pa-ult').textContent = `${m.toFixed(2)}x (${k.nombre})`;
    $('pa-ult').style.color = colSitio(m);
    refrescar();
    try { window.dispatchEvent(new CustomEvent('valor-juego', { detail: { m, nombre: k.nombre, masivo: !!masivo, manual: String(id || '').startsWith('manual'), t: Date.now(), sitio: (() => { try { return new URL(conn.url).hostname.replace(/^www\./, ''); } catch (e) { return ''; } })() } })); } catch (e) {}
    if (modoAuto) { window.__valorReal = m; document.getElementById(k.btn)?.click(); window.__valorReal = null; }     // alimenta todo el sistema
    return true;
  }
  window.recibirVela = recibirVela;

  // Ejecuta fn sin que la app hable (para cargas de varios valores a la vez)
  function sinVoz(fn) {
    const ss = window.speechSynthesis;
    const propia = ss && Object.prototype.hasOwnProperty.call(ss, 'speak');
    const orig = ss && ss.speak;
    try { if (ss) ss.speak = function () {}; fn(); }
    finally { if (ss) { if (propia) ss.speak = orig; else delete ss.speak; } }
  }

  // ── Sincronizar la franja completa sin duplicar ───────────────────────
  // lista: valores con el MÁS RECIENTE PRIMERO (como se ve en el sitio).
  // Solo se agregan los que aún no están: se busca el mayor solape entre el final
  // del historial y el comienzo de la lista en orden cronológico.
  let lineaBase = false;           // la primera lectura del juego solo marca "desde aquí": no se grafica
  function rebase(crono) { historial.length = 0; crono.forEach(m => historial.push({ m })); guardarHist(); }
  function sincronizarHistorial(lista, opciones) {
    const o = Object.assign({ recientePrimero: true, manual: false }, opciones || {});
    let crono = (lista || []).map(leerValor).filter(v => v !== null);
    if (!crono.length) return 0;
    if (o.recientePrimero) crono = crono.reverse();
    ultimaLectura = Date.now();

    // Primera lectura al abrir la app: se grafican las velas ya dadas (en silencio) y desde ahí solo los nuevos.
    if (!lineaBase && !o.manual) {
      lineaBase = true; historial.length = 0;
      sinVoz(() => crono.forEach(v => recibirVela(v, null, true)));    // grafica las velas ya dadas, sin hablar
      return crono.length;
    }
    lineaBase = true;

    const h = historial.map(d => d.m);
    let solape = 0;
    for (let j = Math.min(h.length, crono.length); j >= 1; j--) {
      let igual = true;
      for (let i = 0; i < j; i++) if (h[h.length - j + i] !== crono[i]) { igual = false; break; }
      if (igual) { solape = j; break; }
    }
    const nuevos = crono.slice(solape);
    // Sin coincidencia o salto enorme = la franja cambió de golpe (recarga del juego): no se grafica, se reubica.
    if (!o.manual && h.length && (!solape || nuevos.length > 15)) { rebase(crono); return 0; }
    if (nuevos.length > 1) sinVoz(() => nuevos.forEach(v => recibirVela(v, null, true)));
    else nuevos.forEach(v => recibirVela(v));
    return nuevos.length;
  }
  window.sincronizarHistorial = sincronizarHistorial;
  // Al pulsar Reset: la franja actual pasa a ser la nueva referencia (no se vuelve a graficar lo anterior)
  window.__autoVelasReiniciar = () => { ultimoId = null; };

  // ── Indicador de conexión (+ aviso de voz al perderla / recuperarla) ──
  const LIMITE_PERDIDA = 60;       // s sin ninguna lectura = conexión perdida
  let perdida = false;
  function hablarConexion(texto) {
    const btn = document.getElementById('btn-voz');
    if (btn && /OFF/i.test(btn.textContent)) return;           // respeta el botón de voz de la app
    try {
      const ss = window.speechSynthesis; if (!ss) return;
      const u = new SpeechSynthesisUtterance(texto); u.lang = 'es-ES'; ss.speak(u);
    } catch (e) {}
  }
  function revisarConexion() {
    const el = $('pa-estado'), seg = (Date.now() - ultimaLectura) / 1000;
    if (!ultimaLectura) { el.textContent = '🔴 Sin señal'; el.className = 'pa-estado off'; return; }
    if (seg < 20) {
      el.textContent = '🟢 Conectado'; el.className = 'pa-estado on';
      if (perdida) { perdida = false; hablarConexion('Conexión con el juego recuperada.'); }
    } else {
      el.textContent = `🟠 Sin lecturas hace ${seg < 90 ? Math.floor(seg) + ' s' : Math.floor(seg / 60) + ' min'}`; el.className = 'pa-estado warn';
      if (seg >= LIMITE_PERDIDA && !perdida) { perdida = true; hablarConexion('Se perdió la conexión con el juego.'); }
    }
  }
  setInterval(revisarConexion, 1000);

  // ── Voz: Chrome bloquea la voz hasta que haces un clic real en la página ──
  const avisoVoz = document.createElement('div');
  avisoVoz.className = 'pa-diag'; avisoVoz.style.display = 'block';
  avisoVoz.innerHTML = '🔇 <b>Voz en espera:</b> haz clic una vez en cualquier parte de esta página para activar los mensajes de voz (Chrome lo exige).';
  $('pa-diag').before(avisoVoz);
  let vozLista = false;
  function desbloquearVoz(e) {
    if (vozLista || !e.isTrusted) return;
    try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; window.speechSynthesis.speak(u); } catch (x) {}
    vozLista = true; avisoVoz.style.display = 'none';
    ['pointerdown', 'keydown', 'click'].forEach(ev => document.removeEventListener(ev, desbloquearVoz, true));
  }
  ['pointerdown', 'keydown', 'click'].forEach(ev => document.addEventListener(ev, desbloquearVoz, true));

  // ── Controles ─────────────────────────────────────────────────────────
  $('pa-auto').addEventListener('change', e => { modoAuto = e.target.checked; });
  function pintarSitios() {
    const sel = $('pa-sitio'), lista = todosSitios();
    const idx = lista.findIndex(s => s.u === conn.url);
    sel.innerHTML = lista.map((s, i) => `<option value="${i}">${s.n}</option>`).join('') + (idx < 0 ? '<option value="-1">Otro enlace</option>' : '');
    sel.value = idx < 0 ? '-1' : String(idx);
    $('pa-url').value = conn.url;
  }
  $('pa-sitio').addEventListener('change', e => {
    const s = todosSitios()[parseInt(e.target.value, 10)];
    if (s) { conn.url = s.u; guardarConn(); pintarSitios(); }
  });
  $('pa-url').addEventListener('change', e => { conn.url = e.target.value.trim() || conn.url; guardarConn(); pintarSitios(); });
  $('pa-guardar').addEventListener('click', () => {
    const u = $('pa-url').value.trim();
    if (!/^https?:\/\//i.test(u)) { alert('Escribe un enlace completo que empiece con https://'); return; }
    if (!todosSitios().some(s => s.u === u)) {
      let host = u; try { host = new URL(u).hostname.replace(/^www\./, ''); } catch (x) {}
      const n = (prompt('Nombre para este enlace:', host) || '').trim();
      if (!n) return;
      conn.sitios.push({ n, u });
    }
    conn.url = u; guardarConn(); pintarSitios();
  });
  $('pa-quitar').addEventListener('click', () => {
    const i = parseInt($('pa-sitio').value, 10) - SITIOS_BASE.length;
    if (i >= 0 && conn.sitios[i]) { conn.sitios.splice(i, 1); conn.url = SITIOS_BASE[0].u; guardarConn(); pintarSitios(); }
    else alert('Solo se pueden quitar los enlaces que tú añadiste.');
  });
  pintarSitios();
  $('pa-autoabrir').addEventListener('change', e => { conn.autoAbrir = e.target.checked; guardarConn(); });
  $('pa-abrir').addEventListener('click', () => { window.open(conn.url, 'aviator_juego'); });

  // ── Diagnóstico: dice qué falta cuando no llegan valores ──────────────
  function diagnostico() {
    const el = $('pa-diag'), seg = ultimaLectura ? (Date.now() - ultimaLectura) / 1000 : Infinity;
    if (seg < 20) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    if (typeof window.__lectorEstado !== 'function') {
      el.innerHTML = '⚠️ <b>El lector no está activo en esta página.</b> Revisa: ' +
        '① que la extensión “Lector Aviator — Graficador RS23” esté instalada y activada en chrome://extensions · ' +
        '② que esta página esté en una de las direcciones que la extensión reconoce (la de GitHub Pages, o localhost) · ' +
        '③ recarga esta página (F5). (Si en cambio usas el script de Tampermonkey, revisa que esté instalado y activado igual que antes.)';
      return;
    }
    let e = {}; try { e = JSON.parse(window.__lectorEstado()); } catch (x) {}
    const reciente = o => o && Date.now() - o.t < 15000;
    if (reciente(e.frame) && e.frame.txt === 'leyendo valores') {
      el.textContent = '⏳ El lector ve ' + e.frame.n + ' valores en el juego; esperando sincronizar…';
    } else if (reciente(e.frame)) {
      el.textContent = '🔎 El juego está abierto (' + e.frame.host + ') pero el lector aún no encuentra la franja de valores. Espera a que cargue el juego o ábrelo en su pestaña.';
    } else if (reciente(e.top)) {
      el.textContent = '🔎 La página del casino está abierta pero el juego (iframe) no responde: inicia sesión, abre el Aviator y deja esa pestaña visible. Si el juego usa otro dominio, el lector igual lo detecta mientras esté dentro del casino.';
    } else {
      el.textContent = '🔌 El lector está activo en la app. Falta abrir el juego (pulsa “Abrir juego”), iniciar sesión y dejar la pestaña abierta.';
    }
  }
  setInterval(diagnostico, 2000); setTimeout(diagnostico, 500);

  // ── Entradas desde otras páginas ──────────────────────────────────────
  // postMessage  { tipo:'vela', mult, id }  |  { tipo:'historial', valores:[…más reciente primero] }
  const manejar = d => {
    if (!d) return;
    if (d.tipo === 'vela') recibirVela(d.mult, d.id);
    else if (d.tipo === 'historial') sincronizarHistorial(d.valores);
  };
  window.addEventListener('message', e => manejar(e.data));
  try { new BroadcastChannel('aviator-velas').onmessage = e => manejar(e.data); } catch (e) {}

  refrescar();
})();
