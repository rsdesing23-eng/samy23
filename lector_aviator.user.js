// ==UserScript==
// @name         Lector Aviator → Contador de velas
// @namespace    contador-velas
// @version      2.4
// @description  Lee la franja de valores (multiplicadores) del Aviator (astrobet, ecuabet) y los envía a tu app
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        GM_openInTab
// @grant        unsafeWindow
// @run-at       document-idle
// ==/UserScript==
/*
  CÓMO FUNCIONA
  • En la página/iframe del juego: encuentra la franja de valores ("2.35x"), y cada vez que cambia
    guarda la lista completa (más reciente primero) con GM_setValue.
  • En tu app (graficador_rs23.html, abierta como archivo o en localhost): recibe esa lista y
    llama a sincronizarHistorial(), que solo agrega los valores nuevos.
  • Solo actúa en: tu app, astrobet.ec, *.spribegaming.com y en cualquier iframe cuyo "padre" sea astrobet.
    En el resto de webs sale al instante sin hacer nada.
*/
(function () {
  'use strict';

  const LOG = (...a) => console.log('%c[Lector Aviator]', 'color:#0bd', ...a);
  const esTop = window === window.top;
  const host = location.hostname;
  const ancestros = (() => { try { return [...(location.ancestorOrigins || [])].join(' '); } catch (e) { return ''; } })() + ' ' + (document.referrer || '');

  // ═══════════ LADO APP ═══════════
  const esLocal = location.protocol === 'file:' || host === 'localhost' || host === '127.0.0.1';
  if (esLocal) {
    if (typeof unsafeWindow.sincronizarHistorial !== 'function') return;     // otro archivo local cualquiera

    const clonar = v => { try { return typeof cloneInto === 'function' ? cloneInto(v, unsafeWindow) : v; } catch (e) { return v; } };
    let ultT = 0;
    const aplicar = (d, inicial) => {
      if (!d || !Array.isArray(d.valores)) return;
      if (inicial && Date.now() - d.t > 20000) return;   // al abrir la app, una lectura guardada vieja se ignora (las de en vivo siempre se aplican)
      try { unsafeWindow.sincronizarHistorial(clonar(d.valores)); ultT = d.t; } catch (e) { console.warn('[Lector]', e); }
    };
    GM_addValueChangeListener('aviator_historial', (n, ant, nuevo) => aplicar(nuevo));
    // Respaldo: si por algún motivo el listener no dispara, se consulta cada 2 s
    setInterval(() => { const d = GM_getValue('aviator_historial'); if (d && d.t !== ultT) aplicar(d); }, 2000);
    const ini = GM_getValue('aviator_historial');
    if (ini) aplicar(ini, true);

    // Para que el panel de la app pueda diagnosticar qué está pasando
    unsafeWindow.__lectorEstado = function () {
      return JSON.stringify({ top: GM_getValue('est_top') || null, frame: GM_getValue('est_frame') || null, hist: GM_getValue('aviator_historial') || null });
    };
    LOG('App lista: recibiendo valores del juego.');

    // Si el juego no está enviando datos, lo abre en una pestaña en segundo plano
    setTimeout(() => {
      let c = { url: 'https://astrobet.ec/casino/aviator/3144', autoAbrir: true };
      try { c = unsafeWindow.aviatorConfig(); } catch (e) {}
      if (!c.autoAbrir) return;
      const ult = GM_getValue('aviator_historial');
      const vivo = ult && Date.now() - ult.t < 30000;
      const abierto = GM_getValue('aviator_abierto_t', 0);
      if (vivo || Date.now() - abierto < 60000) return;
      GM_setValue('aviator_abierto_t', Date.now());
      GM_openInTab(c.url, { active: false, insert: true });
      LOG('Abriendo Aviator en segundo plano:', c.url);
    }, 5000);
    return;
  }

  // ═══════════ LADO JUEGO ═══════════
  // Solo en astrobet / ecuabet, en Spribe, o en iframes cuyo padre es astrobet
  const relevante = /astrobet|ecuabet|spribe/i.test(host) || (!esTop && /astrobet|ecuabet/i.test(ancestros));
  if (!relevante) return;

  const RE = /^\s*(\d{1,6}(?:[.,]\d{1,2})?)\s*x\s*$/i;
  const KEY_ESTADO = esTop ? 'est_top' : 'est_frame';
  const estado = (txt, n) => { try { GM_setValue(KEY_ESTADO, { t: Date.now(), host, txt, n: n || 0 }); } catch (e) {} };

  // Recorre el DOM incluyendo shadow roots abiertos
  function* hojas(root) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let el = w.currentNode;
    while (el) {
      if (el.shadowRoot) yield* hojas(el.shadowRoot);
      if (el.nodeType === 1 && !el.children.length && RE.test(el.textContent)) yield el;
      el = w.nextNode();
    }
  }

  function visible(el) {
    const r = el.getBoundingClientRect();
    return r.width >= 4 && r.height >= 4 ? r : null;
  }

  function leerFranja() {
    // 1) Selectores propios del Aviator de Spribe (.payouts-block > .payout > .bubble-multiplier)
    let items = [];
    const sel = document.querySelectorAll('.payouts-block .bubble-multiplier, .payouts-block .payout, app-bubble-multiplier .bubble-multiplier');
    const vistos = new Set();
    sel.forEach(el => {
      const hoja = el.children.length ? (el.querySelector('.bubble-multiplier') || el) : el;
      if (vistos.has(hoja)) return;
      vistos.add(hoja);
      const t = hoja.textContent.trim();
      if (!RE.test(t)) return;
      const r = hoja.getBoundingClientRect();
      items.push({ x: r.left, top: r.top, w: r.width, h: r.height, v: t.replace(',', '.').replace(/x/i, 'x') });
    });
    if (items.length >= 3) {
      // Solo elementos visibles y UNA sola fila (la que tiene más valores): evita leer dos veces el mismo valor
      // si la página tiene también una lista oculta o repetida.
      const vis = items.filter(i => i.w >= 4 && i.h >= 4);
      const grupos = [];
      (vis.length >= 3 ? vis : items).forEach(c => {
        const g = grupos.find(g => Math.abs(g.top - c.top) <= 6);
        if (g) g.items.push(c); else grupos.push({ top: c.top, items: [c] });
      });
      grupos.sort((a, b) => b.items.length - a.items.length);
      const fila = grupos[0].items;
      // quita duplicados exactos de posición (mismo x y mismo valor)
      const unicos = fila.filter((c, i) => fila.findIndex(d => Math.abs(d.x - c.x) < 2 && d.v === c.v) === i);
      return unicos.sort((a, b) => a.x - b.x).map(i => i.v);
    }

    // 2) Genérico: la fila horizontal con más textos "N.NNx" (agrupando por altura con tolerancia)
    const cand = [];
    for (const el of hojas(document.body)) {
      const r = visible(el); if (!r) continue;
      cand.push({ x: r.left, top: r.top, v: el.textContent.trim().replace(',', '.') });
    }
    if (cand.length < 3) return null;
    cand.sort((a, b) => a.top - b.top);
    const grupos = [];
    cand.forEach(c => {
      const g = grupos.find(g => Math.abs(g.top - c.top) <= 6);
      if (g) g.items.push(c); else grupos.push({ top: c.top, items: [c] });
    });
    let mejor = null;
    grupos.forEach(g => { if (g.items.length >= 4 && (!mejor || g.items.length > mejor.items.length)) mejor = g; });
    if (!mejor) return null;
    return mejor.items.sort((a, b) => a.x - b.x).map(i => i.v);
  }

  let ultima = '', ultimoEnvio = 0, detectada = false, badge = null;

  function mostrarBadge(txt, ok) {
    if (!document.body) return;
    if (!badge) {
      badge = document.createElement('div');
      badge.style.cssText = 'position:fixed;left:6px;bottom:6px;z-index:2147483647;font:11px sans-serif;background:rgba(0,0,0,.7);padding:2px 7px;border-radius:8px;pointer-events:none';
      document.body.appendChild(badge);
    }
    badge.style.color = ok ? '#0f0' : '#fb3';
    badge.textContent = txt;
  }

  function revisar() {
    let franja = null;
    try { franja = leerFranja(); } catch (e) { LOG('error leyendo', e); }
    if (!franja) {
      estado('buscando la franja de valores…');
      if (!esTop || /astrobet|ecuabet/i.test(host)) mostrarBadge(esTop ? '🔌 Lector: página principal (el juego va en un iframe)' : '🔌 Lector: buscando valores…', false);
      return;
    }
    const firma = franja.join('|'), ahora = Date.now();
    if (!detectada) { detectada = true; LOG('Franja detectada en', host, ':', franja.join(' ')); }
    mostrarBadge(`🔌 Lector activo · ${franja.length} valores`, true);
    estado('leyendo valores', franja.length);
    if (firma !== ultima || ahora - ultimoEnvio > 8000) {
      if (firma !== ultima) LOG('Nuevo:', franja[0]);
      ultima = firma; ultimoEnvio = ahora;
      GM_setValue('aviator_historial', { t: ahora, valores: franja });
    }
  }

  let pendiente = null;
  new MutationObserver(() => {
    if (pendiente) return;
    pendiente = setTimeout(() => { pendiente = null; revisar(); }, 300);
  }).observe(document.documentElement, { subtree: true, childList: true, characterData: true });
  setInterval(revisar, 1500);
  revisar();
  LOG('Cargado en', esTop ? 'página principal' : 'iframe', host);
})();
