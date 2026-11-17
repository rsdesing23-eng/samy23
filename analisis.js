/* =====================================================================
   🛡️ LÍMITE DE SESIÓN + 📁 EXPORTAR VALORES (CSV)
   Usa la banca del Masaniello de arriba (capital → Generar Apuesta → Win / Lose).
   Agrega botones Win / Lose abajo, en Controles, que hacen lo mismo y además:
   - muestran la banca en VERDE si va ganando y ROJO si va perdiendo,
   - avisan por voz "Ganada / Perdida",
   - vigilan pérdida máxima, meta de ganancia y tiempo máximo (bloquean las apuestas).
   ===================================================================== */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const cargar = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const K_LIM = 'analisis_limites_v1', K_REG = 'analisis_registro_v1';
  let registro = cargar(K_REG, []);
  const SESION = (() => { const d = new Date(), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; })();
  const lim = Object.assign({ stop: 20, meta: 20, minutos: 60 }, cargar(K_LIM, {}));

  // ───────────── Registro de los valores que van saliendo + CSV ─────────────
  window.addEventListener('valor-juego', e => {
    const d = e.detail; sumarContador(d.m);
    registro.push({ ts: d.t, sesion: SESION, sitio: d.sitio, valor: d.m, color: d.nombre, origen: d.masivo ? 'carga_inicial' : d.manual ? 'manual' : 'en_vivo' });
    if (registro.length > 5000) registro = registro.slice(-5000);
    guardar(K_REG, registro); pintarRegistro();
  });
  const csvEsc = v => { v = String(v ?? ''); return /[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  function exportar(soloSesion) {
    const filas = registro.filter(r => !soloSesion || r.sesion === SESION);
    if (!filas.length) { alert('Aún no hay valores para exportar.'); return; }
    const lineas = filas.map(r => { const d = new Date(r.ts), p = n => String(n).padStart(2, '0');
      return [`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, d.toLocaleTimeString('es-EC', { hour12: false }), r.sesion, r.sitio, String(r.valor).replace('.', ','), r.color, r.origen].map(csvEsc).join(';'); });
    const blob = new Blob(['\ufeff' + ['fecha', 'hora', 'sesion', 'sitio', 'valor', 'color', 'origen'].join(';') + '\n' + lineas.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `aviator_${soloSesion ? 'sesion' : 'valores'}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function pintarRegistro() {
    const el = $('an-reg-info'); if (el) el.textContent = `${registro.length} registros guardados (${registro.filter(r => r.sesion === SESION).length} de esta sesión). Se guardan en este navegador, hasta 5000.`;
  }

  // ───────────── 📊 Contadores por rango (acumulan cada vez que sale un valor) ─────────────
  const RANGOS = [
    { col: '#ff4d5a', et: 'Menos de 1.01', lo: 0,    hi: 1.01 },
    { col: '#34b4ff', et: '1.01 a 2',      lo: 1.01, hi: 2 },
    { col: '#a259ff', et: '2 a 4',         lo: 2,    hi: 4 },
    { col: '#a259ff', et: '4 a 9',         lo: 4,    hi: 9 },
    { col: '#a259ff', et: '9 a 10',        lo: 9,    hi: 10 },
    { col: '#d21cc0', et: '10 o más',      lo: 10,   hi: Infinity }
  ];
  const rangoDe = v => RANGOS.findIndex(g => v >= g.lo && v < g.hi);
  const K_CONT = 'analisis_contadores_v1';
  let cont = cargar(K_CONT, null);
  if (!cont || !Array.isArray(cont.c) || cont.c.length !== RANGOS.length) {   // primera vez: parte de lo ya registrado
    cont = { c: RANGOS.map(() => 0), desde: Date.now() };
    registro.forEach(r => { const i = rangoDe(Number(r.valor)); if (i >= 0) cont.c[i]++; });
    guardar(K_CONT, cont);
  }
  function sumarContador(v) {
    const i = rangoDe(Number(v)); if (i < 0) return;
    cont.c[i]++; guardar(K_CONT, cont); pintarContadores(i);
  }
  function pintarContadores(flash) {
    const box = $('an-cont'); if (!box) return;
    const tot = cont.c.reduce((a, b) => a + b, 0);
    box.innerHTML = RANGOS.map((g, i) =>
      `<div class="an-chip${i === flash ? ' an-flash' : ''}" title="${g.et}" style="--c:${g.col}"><small>${g.et}</small><b>${cont.c[i]}</b><span>${tot ? (cont.c[i] / tot * 100).toFixed(1) + '%' : '–'}</span></div>`).join('') +
      `<div class="an-chip an-tot"><small>Total</small><b>${tot}</b><span>desde ${new Date(cont.desde).toLocaleDateString('es-EC')}</span></div>`;
  }

  const banca = () => (typeof window.__banca === 'function') ? window.__banca() : { capital: 0, currentBank: 0, betAmount: 0 };
  const hablar = t => { try { if (window.__hablar) window.__hablar(t, true); } catch (e) {} };
  const fmt = n => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(2);
  const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const BTNS = ['generate-bet', 'win-bet', 'lose-bet', 'btn-win-ab', 'btn-lose-ab'];

  const nueva = () => ({ activa: false, inicio: 0, capital: 0, g: 0, p: 0, racha: 0, rachaMax: 0, ultimo: '', bloqueo: null, extension: false, avisoStop: false, avisoTiempo: false });
  let ses = nueva();

  // ───────────── Bloqueo por límite ─────────────
  function bloquear(motivo, texto) {
    if (ses.bloqueo) return;
    ses.bloqueo = motivo;
    BTNS.forEach(id => { const b = $(id); if (b) b.disabled = true; });
    const av = $('an-aviso'); av.className = 'an-aviso ' + motivo; av.style.display = 'block';
    av.innerHTML = `<b>${texto}</b><br><span>Las apuestas quedaron bloqueadas. Si decides continuar bajo tu responsabilidad, pulsa el botón.</span> <button id="an-desbloquear">🔓 Desbloquear y continuar</button>`;
    $('an-desbloquear').onclick = () => { if (confirm('¿Seguro? Pasaste el límite que tú mismo definiste.')) desbloquear(true); };
    hablar(texto);
  }
  function desbloquear(seguir) {
    BTNS.forEach(id => { const b = $(id); if (b) b.disabled = false; });
    $('an-aviso').style.display = 'none';
    ses.bloqueo = null;
    if (seguir) ses.extension = true;
  }
  function reiniciar() { desbloquear(false); ses = nueva(); pintar(); }

  function revisarLimites() {
    const b = banca();
    if (!ses.activa || !b.capital) return;
    const res = b.currentBank - ses.capital;
    const perdMax = ses.capital * lim.stop / 100, metaMax = ses.capital * lim.meta / 100;
    if (!ses.bloqueo && !ses.extension) {
      if (lim.stop > 0 && res <= -perdMax) bloquear('stop', `Límite de pérdida alcanzado: ${fmt(res)}. Detente por hoy.`);
      else if (lim.meta > 0 && res >= metaMax) bloquear('meta', `Meta de ganancia alcanzada: ${fmt(res)}. Retírate con tu ganancia.`);
      else if (lim.stop > 0 && !ses.avisoStop && res <= -perdMax * 0.8) { ses.avisoStop = true; hablar('Atención: estás al ochenta por ciento de tu límite de pérdida.'); }
    }
    const seg = (Date.now() - ses.inicio) / 1000;
    if (lim.minutos > 0 && !ses.bloqueo && !ses.extension) {
      if (seg >= lim.minutos * 60) bloquear('tiempo', `Se cumplió tu tiempo máximo de ${lim.minutos} minutos. Descansa.`);
      else if (!ses.avisoTiempo && seg >= lim.minutos * 60 * 0.9) { ses.avisoTiempo = true; hablar('Quedan pocos minutos de tu tiempo de sesión.'); }
    }
  }

  // ───────────── Pantalla ─────────────
  function pintar() {
    const el = $('an-estado-sesion'); if (!el) return;
    const b = banca();
    const eti = $('an-apuesta-ab'); if (eti) eti.textContent = b.capital ? `Apuesta: ${$('bet-amount')?.textContent || '-'}` : '';
    if (!ses.activa) { el.innerHTML = '<div class="an-nota">Sin sesión activa. Escribe tu capital arriba y pulsa <b>Generar Apuesta</b> para iniciar el control.</div>'; return; }
    const res = b.currentBank - ses.capital, seg = (Date.now() - ses.inicio) / 1000;
    el.innerHTML =
      `<div class="an-banca ${res >= 0 ? 'ok' : 'mal'}"><small>Banca</small> <b>${b.currentBank.toFixed(2)}</b> <span>${fmt(res)} (${(res / ses.capital * 100).toFixed(1)}%)</span>` +
      (ses.ultimo ? `<span class="an-ult">${ses.ultimo}</span>` : '') + `</div>` +
      `<div class="an-nota">Capital inicial <b>${ses.capital.toFixed(2)}</b> · límites: −${(ses.capital * lim.stop / 100).toFixed(2)} / +${(ses.capital * lim.meta / 100).toFixed(2)} · Tiempo <b>${mmss(seg)}</b>${lim.minutos ? ' / ' + lim.minutos + ' min' : ''}<br>` +
      `Ganadas <b class="v-bien">${ses.g}</b> · Perdidas <b class="v-mal">${ses.p}</b> · Peor racha de pérdidas <b>${ses.rachaMax}</b></div>`;
  }

  function iniciar() {
    const b = banca(); if (!b.capital) return;
    reiniciar();
    ses = nueva(); ses.activa = true; ses.inicio = Date.now(); ses.capital = b.capital;
    pintar();
  }

  // Resultado de una apuesta (desde los botones de arriba o de abajo)
  function registrar(antes) {
    const b = banca(), d = b.currentBank - antes;
    if (!ses.activa || !d) { pintar(); return; }
    if (d > 0) { ses.g++; ses.racha = 0; ses.ultimo = `✅ GANADA ${fmt(d)}`; hablar(`Ganada, más ${d.toFixed(2)}`); }
    else { ses.p++; ses.racha++; ses.rachaMax = Math.max(ses.rachaMax, ses.racha); ses.ultimo = `❌ PERDIDA ${fmt(d)}`; hablar(`Perdida, menos ${Math.abs(d).toFixed(2)}`); }
    revisarLimites(); pintar();
  }
  // Los botones de arriba (Masaniello) también cuentan: se mide el cambio de banca tras su propio clic
  let antesArriba = 0;
  ['win-bet', 'lose-bet'].forEach(id => {
    const b = $(id); if (!b) return;
    b.addEventListener('click', () => { /* se ejecuta después del manejador original (registrado antes) */
      const actual = banca().currentBank;
      if (Math.abs(actual - antesArriba) > 1e-9 && antesArriba) registrar(antesArriba);
      antesArriba = actual;
    });
  });
  $('generate-bet')?.addEventListener('click', () => setTimeout(() => { iniciar(); antesArriba = banca().currentBank; }, 0));
  $('reset')?.addEventListener('click', () => { reiniciar(); antesArriba = 0; });

  // ───────────── Botones Win / Lose abajo, en Controles ─────────────
  const fila = document.querySelector('.fila-botones');
  const mk = (id, txt, cls, orig) => {
    const b = document.createElement('button'); b.id = id; b.className = cls; b.textContent = txt;
    b.addEventListener('click', () => {
      if (!banca().capital) { alert('Primero escribe el capital arriba y pulsa "Generar Apuesta".'); return; }
      $(orig)?.click();                 // aplica el Masaniello (banca y siguiente apuesta)
    });
    return b;
  };
  if (fila) {
    fila.appendChild(mk('btn-win-ab', '✅ Win', 'verde1', 'win-bet'));
    fila.appendChild(mk('btn-lose-ab', '❌ Lose', 'rojo1', 'lose-bet'));
    const et = document.createElement('span'); et.id = 'an-apuesta-ab'; et.className = 'an-apuesta-ab'; fila.appendChild(et);
  }

  // ───────────── Panel de límites ─────────────
  const panel = document.createElement('div');
  panel.id = 'panel-analisis';
  panel.innerHTML = `
    <h3>📁 Registro y límites de sesión</h3>
    <div id="an-aviso" class="an-aviso" style="display:none"></div>
    <details open>
      <summary>Registro de valores y exportación</summary>
      <div class="an-reg-grid">
        <div class="an-reg-izq">
          <div class="an-fila">
            <button id="an-exp-todo">⬇️ Exportar todo (CSV)</button>
            <button id="an-exp-ses" class="an-sec">⬇️ Solo esta sesión</button>
            <button id="an-borrar-reg" class="an-sec">🗑 Borrar registro</button>
          </div>
          <div id="an-reg-info" class="an-nota"></div>
        </div>
        <div class="an-frec">
          <div class="an-frec-t">📊 Frecuencia real de tus datos <button id="an-c-reset" class="an-sec">↺ Reiniciar</button></div>
          <div id="an-cont" class="an-cont"></div>
        </div>
      </div>
    </details>
    <details open>
      <summary>Límites de sesión (protección)</summary>
      <div class="an-fila an-lims">
        <label>Pérdida máx. <input id="an-l-stop" type="number" min="0" step="1" value="${lim.stop}">% del capital</label>
        <label>Meta de ganancia <input id="an-l-meta" type="number" min="0" step="1" value="${lim.meta}">%</label>
        <label>Tiempo máx. <input id="an-l-min" type="number" min="0" step="5" value="${lim.minutos}"> min <small>(0 = sin límite)</small></label>
      </div>
      <div id="an-estado-sesion"></div>
    </details>`;
  const ancla = $('panel-memoria-ia');
  (ancla?.parentNode || document.body).insertBefore(panel, ancla);
  [['an-l-stop', 'stop'], ['an-l-meta', 'meta'], ['an-l-min', 'minutos']].forEach(([id, k]) =>
    $(id).addEventListener('change', e => { lim[k] = Math.max(0, parseFloat(e.target.value) || 0); guardar(K_LIM, lim); revisarLimites(); pintar(); }));
  $('an-exp-todo').onclick = () => exportar(false);
  $('an-exp-ses').onclick = () => exportar(true);
  $('an-borrar-reg').onclick = () => { if (confirm('¿Borrar todo el registro guardado?')) { registro = []; guardar(K_REG, registro); pintarRegistro(); } };
  $('an-c-reset').onclick = () => { if (confirm('¿Poner los contadores en cero?')) { cont = { c: RANGOS.map(() => 0), desde: Date.now() }; guardar(K_CONT, cont); pintarContadores(); } };
  setInterval(() => { revisarLimites(); pintar(); }, 1000);
  pintar(); pintarRegistro(); pintarContadores();
})();
