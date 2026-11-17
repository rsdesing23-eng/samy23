document.addEventListener('DOMContentLoaded', function() {
    // ===================== LÓGICA DE Operaciones=====================
    const capitalInput = document.getElementById('capital');
    const generateBetBtn = document.getElementById('generate-bet');
    const winBetBtn = document.getElementById('win-bet');
    const loseBetBtn = document.getElementById('lose-bet');
    const resetBtn = document.getElementById('reset');
    const betAmountDisplay = document.getElementById('bet-amount');
    const sessionGoalDisplay = document.getElementById('session-goal');

    let capital = 0, betAmount = 0, currentBank = 0, sessionGoal = 0;

    window.__banca = () => ({ capital, currentBank, betAmount, sessionGoal });
    function updateDisplays() {
        betAmountDisplay.textContent = `${betAmount.toFixed(2)} / ${(betAmount * 2).toFixed(2)}`;
        sessionGoalDisplay.textContent = sessionGoal.toFixed(2);
    }

    generateBetBtn.addEventListener('click', () => {
        capital = parseFloat(capitalInput.value);
        if (isNaN(capital) || capital <= 0) return alert('Por favor, ingresa un monto válido.');
        sessionGoal = capital * 0.2;
        betAmount = capital * 0.02;
        currentBank = capital;
        updateDisplays();
    });

    winBetBtn.addEventListener('click', () => { currentBank += betAmount; betAmount *= 1.2; updateDisplays(); });
    loseBetBtn.addEventListener('click', () => { currentBank -= betAmount; betAmount *= 1.5; updateDisplays(); });
    resetBtn.addEventListener('click', () => { capitalInput.value=''; betAmountDisplay.textContent='-'; sessionGoalDisplay.textContent='-'; });

    // ===================== GRAFICO 1 (PUNTOS Y LÍNEAS) =====================
    const canvas = document.getElementById('chart');
    const ctx = canvas.getContext('2d');
    let data = [], colors = [], labels = [], horizontalLines = [];
    const margin = 20, chartWidth = canvas.width - 2 * margin, chartHeight = canvas.height - 2 * margin;
    const SEQ_MAX = 300;            // puntos que se guardan (se pueden ver desplazando el gráfico)
    let seqView = 50;               // puntos visibles a la vez
    let seqOffset = 0;              // 0 = lo más reciente; >0 = mirando valores anteriores
    const esGrande = c => c === '#ed4ac7' || c === '#8b0000';   // rosa y vino se dibujan más grandes

    function drawChart() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Ejes
        ctx.strokeStyle = "#00ffff";
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(margin, margin);
        ctx.lineTo(margin, canvas.height - margin);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(margin, canvas.height - margin);
        ctx.lineTo(canvas.width - margin, canvas.height - margin);
        ctx.stroke();

        if (data.length === 0) return;

        const minY = Math.min(...data);
        const maxY = Math.max(...data);
        const yRange = maxY - minY || 1;

        seqOffset = Math.max(0, Math.min(seqOffset, Math.max(0, data.length - seqView)));
        const vEnd = data.length - seqOffset, vStart = Math.max(0, vEnd - seqView);
        const vN = vEnd - vStart, vDen = Math.max(vN - 1, 1);
        const xOf = i => margin + ((i - vStart) / vDen) * chartWidth;

        // Líneas de referencia
        ctx.fillStyle = "#00ffff";
        ctx.font = "12px Orbitron";
        ctx.textAlign = "right";

        const step = yRange / 8;
        for (let i = 0; i <= 8; i++) {
            const value = minY + i * step;
            const y = margin + chartHeight - ((value - minY) / yRange) * chartHeight;

            ctx.strokeStyle = Math.abs(value) < step / 2 ? "rgba(255,255,255,0.9)" : "rgba(0,255,255,0.15)";
            ctx.lineWidth = Math.abs(value) < step / 2 ? 2 : 1;

            ctx.beginPath();
            ctx.moveTo(margin, y);
            ctx.lineTo(canvas.width - margin, y);
            ctx.stroke();
            ctx.fillText(value.toFixed(0), margin - 6, y + 3);
        }

        // Línea principal
        ctx.beginPath();
        ctx.strokeStyle = '#fcfcfc';
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 2;
        for (let i = vStart; i < vEnd; i++) {
            const x = xOf(i);
            const y = margin + chartHeight - ((data[i] - minY) / yRange) * chartHeight;
            if (i === vStart) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Puntos
        for (let i = vStart; i < vEnd; i++) {
            const p = data[i];
            const x = xOf(i);
            const y = margin + chartHeight - ((p - minY) / yRange) * chartHeight;
            const color = colors[i] || '#66a3ff';
            ctx.beginPath();
            ctx.arc(x, y, esGrande(color) ? 10 : 6, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Valor real (multiplicador) en cada punto
        const stepX = vN > 1 ? chartWidth / (vN - 1) : chartWidth;
        const vertical = stepX < 42;
        ctx.font = (vertical ? 'bold 10px' : 'bold 12px') + ' sans-serif';
        for (let i = vStart; i < vEnd; i++) {
            const p = data[i];
            if (labels[i] == null) continue;
            const x = xOf(i);
            const y = margin + chartHeight - ((p - minY) / yRange) * chartHeight;
            const dy = esGrande(colors[i]) ? 5 : 0;      // el punto grande necesita la etiqueta más separada
            const txt = Number(labels[i]).toFixed(2) + 'x';
            const col = labels[i] >= 10 ? '#ff6ee0' : labels[i] >= 2 ? '#b98cff' : '#5cc8ff';
            const abajo = y < margin + 46 + dy;           // si no cabe arriba, va debajo del punto
            ctx.save();
            ctx.fillStyle = col;
            ctx.shadowColor = '#000'; ctx.shadowBlur = 3;
            if (vertical) {
                ctx.translate(x + 3, abajo ? y + 10 + dy : y - 10 - dy);
                ctx.rotate(-Math.PI / 2);
                ctx.textAlign = abajo ? 'right' : 'left';
                ctx.fillText(txt, 0, 0);
            } else {
                ctx.textAlign = 'center';
                ctx.fillText(txt, x, abajo ? y + 20 + dy : y - 11 - dy);
            }
            ctx.restore();
        }

        if (seqOffset > 0) {
            ctx.save(); ctx.font = '12px Orbitron, sans-serif'; ctx.fillStyle = '#00ffff'; ctx.textAlign = 'left';
            ctx.fillText(`◀ viendo anteriores (${vStart + 1}–${vEnd} de ${data.length})`, margin + 10, margin + 14);
            ctx.restore();
        }

        // Líneas horizontales
        horizontalLines.forEach(line => {
            ctx.strokeStyle = line.color;
            ctx.setLineDash([5, 5]);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(margin, line.y);
            ctx.lineTo(canvas.width - margin, line.y);
            ctx.stroke();
        });
        ctx.setLineDash([]);
    }

    // ── Desplazamiento del gráfico de secuencia (arrastrar / rueda / táctil), como el de velas ──
    (function seqNavegacion() {
        const wrap = canvas.parentElement;
        if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
        const btn = document.createElement('button');
        btn.textContent = '▶▶ Ir al final';
        btn.style.cssText = 'display:none;position:absolute;top:14px;right:14px;font-family:Orbitron,sans-serif;font-size:11px;padding:4px 10px;background:#111;border:1px solid #0ff5;color:#0ff;border-radius:5px;cursor:pointer;z-index:10;';
        btn.addEventListener('click', () => { seqOffset = 0; refrescarSeq(); });
        wrap.appendChild(btn);
        function refrescarSeq() { drawChart(); btn.style.display = seqOffset > 0 ? 'block' : 'none'; }
        window.__refrescarSeq = refrescarSeq;
        const pxPorPunto = () => (chartWidth / Math.max(seqView - 1, 1)) * (canvas.getBoundingClientRect().width / canvas.width);
        let arrastrando = false, x0 = 0, off0 = 0;
        canvas.style.cursor = 'grab';
        canvas.addEventListener('mousedown', e => { arrastrando = true; x0 = e.clientX; off0 = seqOffset; canvas.style.cursor = 'grabbing'; });
        window.addEventListener('mouseup', () => { arrastrando = false; canvas.style.cursor = 'grab'; });
        window.addEventListener('mousemove', e => {
            if (!arrastrando) return;
            seqOffset = Math.max(0, off0 + Math.round((e.clientX - x0) / pxPorPunto()));
            refrescarSeq();
        });
        let t0 = 0, toff0 = 0;
        canvas.addEventListener('touchstart', e => { t0 = e.touches[0].clientX; toff0 = seqOffset; }, { passive: true });
        canvas.addEventListener('touchmove', e => {
            seqOffset = Math.max(0, toff0 + Math.round((e.touches[0].clientX - t0) / pxPorPunto()));
            refrescarSeq();
        }, { passive: true });
        canvas.addEventListener('wheel', e => {
            e.preventDefault();
            if (e.ctrlKey) seqView = Math.max(15, Math.min(150, seqView + (e.deltaY > 0 ? 5 : -5)));
            else seqOffset = Math.max(0, seqOffset + (e.deltaY > 0 ? -3 : 3));
            refrescarSeq();
        }, { passive: false });
    })();

    function addData(v, color = '#66a3ff') {
        if (data.length >= SEQ_MAX) { data.shift(); colors.shift(); labels.shift(); }
        if (seqOffset > 0) seqOffset++;      // si estás viendo valores anteriores, la vista no salta
        labels.push(window.__valorReal != null ? window.__valorReal : null);   // valor real del juego (si viene del lector)
        window.__valorReal = null;
        let newVal = data.length > 0 ? v + data[data.length - 1] : v;
        data.push(newVal);
        colors.push(color);
        (window.__refrescarSeq || drawChart)();
        addCandleAuto(v, color);
        
    }

    // ===================== DETECCIÓN DE PATRONES Y SEÑALES =====================
    let signalDiv = document.getElementById('signal-message');
    if (!signalDiv) {
        signalDiv = document.createElement('div');
        signalDiv.id = 'signal-message';
        Object.assign(signalDiv.style, {
            position: 'absolute', top: '10px', right: '20px', padding: '10px 15px',
            borderRadius: '8px', fontFamily: 'Orbitron, sans-serif',
            fontSize: '16px', color: '#fff',
            backgroundColor: 'rgba(0,0,0,0.6)',
            boxShadow: '0 0 10px rgba(0,255,255,0.5)'
        });
        signalDiv.textContent = '⚪ Esperando señal...';
        document.body.appendChild(signalDiv);
    }

    // Beep corto
    const audioCtx = (typeof AudioContext !== 'undefined') ? new AudioContext() : null;
    function playBeep(duration = 120, frequency = 1000, volume = 0.12) {
        try {
            if (!audioCtx) return;
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.type = 'sine';
            o.frequency.value = frequency;
            g.gain.value = volume;
            o.connect(g);
            g.connect(audioCtx.destination);
            o.start();
            setTimeout(() => { o.stop(); }, duration);
        } catch (e) { console.warn('beep failed', e); }
    }

    const MIN_CANDLES_FOR_SIGNAL = 4;
    function bodySize(c) { return Math.abs(c.close - c.open); }

    let lastSignalText = '';
    function setSignal(text, bg, box, short='') {
        if (text === lastSignalText) return;
        lastSignalText = text;
        signalDiv.textContent = text;
        if (bg) signalDiv.style.backgroundColor = bg;
        if (box) signalDiv.style.boxShadow = box;
        playBeep(120, 1200, 0.12);
    }

    // ============ Funciones de Patrones ============
    function direction(c){ 
        if(!c)return"";
        return c.close>c.open?"UP":c.close<c.open?"DOWN":"FLAT";}// tamaño del cuerpo

    function pattern_secuencia() {
  if (candles.length < 3) return "";

  const c1 = candles.at(-1); // última vela (más reciente)
  const c2 = candles.at(-2); // anterior
  const c3 = candles.at(-3); // hace tres velas

  // Dirección de cada vela
  const bull1 = c1.close > c1.open;
  const bull2 = c2.close > c2.open;
  const bull3 = c3.close > c3.open;
  const bear1 = c1.close < c1.open;
  const bear2 = c2.close < c2.open;
  const bear3 = c3.close < c3.open;

  // Tamaños de cuerpo (en valor absoluto)
  const b1 = bodySize(c1);
  const b2 = bodySize(c2);
  const b3 = bodySize(c3);

  // ============================================================
  // 🔴 Roja débil:   0.3–0.6
  // 🍷 Roja vino:    1.0–2.6
  // 🟩 Verde:        0.3–0.6
  // 💛 Dorada:       1.0–2.0
  // 🩷 Rosada:       1.8–2.6
  // ============================================================

  // ================== 🔻 PATRONES BAJISTAS ==================

  // 1️⃣ Dos velas rojas débiles + una vino fuerte
  if (bear3 && bear2 && bear1 && b3 < 0.6 && b2 < 0.6 && b1 >= 1.0) {
    return "🔴🔴🍷 Patrón bajista: dos velas rojas débiles seguidas de una vino fuerte → posible continuación bajista.";
  }

  // 2️⃣ Vela rosada fuerte seguida de una vino → corrección bajista
  if (bull2 && bear1 && b2 > 1.8 && b1 > 1.0) {
    return "🩷🍷 Posible corrección: fuerte impulso rosado seguido de una vela vino bajista → atención a retroceso.";
  }

  // 3️⃣ Una dorada + dos rojas → pérdida de fuerza
  if (bull3 && bear2 && bear1 && b3 > 1.0 && b2 < 0.6 && b1 < 0.6) {
    return "💛🔴🔴 Fuerte alcista seguida de dos rojas débiles → agotamiento del impulso.";
  }

  // ================== 🔺 PATRONES ALCISTAS ==================

  // 4️⃣ Dos verdes seguidas de una dorada fuerte
  if (bull3 && bull2 && bull1 && b3 < 0.6 && b2 < 0.6 && b1 >= 1.0) {
    return "🟩🟩💛 Impulso alcista: dos velas verdes seguidas de una dorada → tendencia alcista confirmada.";
  }

  // 5️⃣ Dos rojas débiles seguidas de una rosada grande
  if (bear3 && bear2 && bull1 && b3 < 0.6 && b2 < 0.6 && b1 >= 1.8) {
    return "🔴🔴🩷 Reversión alcista: dos bajistas seguidas de una rosada fuerte → posible cambio de tendencia.";
  }

  // 6️⃣ Una vino + una dorada + una rosada
  if (bear3 && bull2 && bull1 && b3 >= 1.0 && b2 >= 1.0 && b1 > 1.8) {
    return "🍷💛🩷 Secuencia vino-dorada-rosada → inicio de tendencia alcista sostenida.";
  }

  // ================== 🔄 REVERSIÓN / CAMBIO ==================

  // 7️⃣ Verde fuerte + roja vino + verde débil → indecisión
  if (bull3 && bear2 && bull1 && b3 > 1.0 && b2 > 1.0 && b1 < 0.6) {
    return "💛🍷🟩 Secuencia mixta fuerte-débil → posible reversión o pausa de mercado.";
  }

  // 8️⃣ Roja vino + verde + dorada → giro alcista
  if (bear3 && bull2 && bull1 && b3 >= 1.0 && b2 >= 0.3 && b1 >= 1.0) {
    return "🍷🟩💛 Secuencia vino-verde-dorada → posible giro alcista progresivo.";
  }

  // 9️⃣ Verde débil + roja vino + rosada → cambio rápido
  if (bull3 && bear2 && bull1 && b2 > 1.0 && b1 > 1.8) {
    return "🟩🍷🩷 Cambio rápido: vino bajista seguida de rosada fuerte → volatilidad alta, posible giro.";
  }

  // ================== 🧩 PATRONES MIXTOS ==================

  // 🔸 Dos doradas seguidas de una vino → consolidación
  if (bull3 && bull2 && bear1 && b3 > 1 && b2 > 1 && b1 >= 1) {
    return "💛💛🍷 Zona de consolidación: dos doradas seguidas de una vino bajista → posible pausa antes de impulso.";
  }

  // 🔸 Verde, dorada y roja → rango lateral
  if (bull3 && bull2 && bear1 && b3 < 0.6 && b2 >= 1 && b1 < 0.6) {
    return "🟩💛🔴 Mercado lateral: secuencia verde-dorada-roja → sin dirección clara.";
  }

  // 🔸 Rosada, vino y verde → transición
  if (bull3 && bear2 && bull1 && b3 > 1.8 && b2 > 1 && b1 < 1) {
    return "🩷🍷🟩 Transición fuerte: rosada y vino alternadas → fase de indecisión o cambio de ciclo.";
  }

  // 🔸 Dos rojas (una débil + una vino) seguidas de verde fuerte
  if (bear3 && bear2 && bull1 && b3 < 0.6 && b2 > 1 && b1 > 1) {
    return "🔴🍷🟩 Dos bajistas seguidas de una verde fuerte → posible rebote alcista técnico.";
  }

  // 🔸 Dos verdes (una débil + una dorada) seguidas de roja débil
  if (bull3 && bull2 && bear1 && b3 < 0.6 && b2 > 1 && b1 < 0.6) {
    return "🟩💛🔴 Dos alcistas seguidas de una roja débil → agotamiento del impulso alcista.";
  }

  // 🔸 Una rosada seguida de otra rosada → sobreextensión
  if (bull2 && bull1 && b2 > 1.8 && b1 > 1.8) {
    return "🩷🩷 Doble rosada consecutiva → sobreextensión del mercado, cuidado con corrección.";
  }

  // 🔸 Una vino seguida de otra vino → presión bajista extrema
  if (bear2 && bear1 && b2 > 1.0 && b1 > 1.0) {
    return "🍷🍷 Dos velas vino consecutivas → fuerte presión bajista, posible agotamiento cercano.";
  }

  return "";
}
// === Mostrar mensaje del patrón de secuencia en el centro ===
// === Mostrar mensaje del patrón con duración limitada ===
function showPatternCenterMessage() {
  const msgDiv = document.getElementById("pattern-center-message");
  if (!msgDiv) return;

  const msg = pattern_secuencia();
  clearTimeout(msgDiv._timeout);

  if (msg && msg !== "") {
    msgDiv.textContent = msg;
    msgDiv.classList.add("visible");
    msgDiv.style.boxShadow = "0 0 18px rgba(0,255,255,0.8)";
    msgDiv.style.color = "#00ffff";

    // 🔹 Mostrar por 5 segundos
    msgDiv._timeout = setTimeout(() => {
      msgDiv.classList.remove("visible");
    }, 5000);
  } else {
    msgDiv.classList.remove("visible");
  }


}


    function pattern_rebote(){if(candles.length<2||data.length<2)return"";//    zona 0
      const lv=data.at(-1),lc=candles.at(-1),bull=lc.close>lc.open,bear=lc.close<lc.open;// última vela
      if(Math.abs(lv)<=1&&bull&&bodySize(lc)>1.5)// zona 0
        return"🟢 Rebote fuerte en zona 0";
      if(lv<0&&bear&&bodySize(lc)>1.5)
      return"🔴 Ruptura bajista zona 0";return"";}

    function pattern_tripleToque(){if(data.length<6)return"";const v=data,L=v.length,last=v.at(-1),prev=v.at(-2);let t=0,ref=v.at(-1);for(let i=L-1;i>=L-6;i--)if(Math.abs(v[i]-ref)<=0.2)t++;if(t>=3)return last>prev?"🟣 Triple toque en soporte":"🟣 Triple toque en resistencia";return"";}
    function pattern_agotamiento(){if(candles.length<3)return"";const c1=candles.at(-3),c2=candles.at(-2),c3=candles.at(-1),bull=direction(c1)==="UP"&&direction(c2)==="UP"&&direction(c3)==="UP"&&bodySize(c1)<bodySize(c2),bear=direction(c1)==="DOWN"&&direction(c2)==="DOWN"&&direction(c3)==="DOWN"&&bodySize(c1)<bodySize(c2);if(bull)return"💚 Agotamiento alcista";if(bear)return"❤️ Agotamiento bajista";return"";}
    function pattern_divergencia(){if(data.length<4||candles.length<4)return"";const d1=data.at(-1),d2=data.at(-2),c1=candles.at(-1),c2=candles.at(-2),up=d1>d2,down=d1<d2;if(up&&bodySize(c1)<bodySize(c2))return"🔵 Divergencia bajista";if(down&&bodySize(c1)>bodySize(c2))return"🔵 Divergencia alcista";return"";}
    function pattern_espejo(){if(candles.length<2)return"";const c1=candles.at(-1),c2=candles.at(-2);if(Math.abs(bodySize(c1)-bodySize(c2))<=0.5&&direction(c1)!==direction(c2))return"🪞 Velas espejo";return"";}
    function checkPatterns(){let list=[];for(const fn of [pattern_secuencia,pattern_rebote,pattern_tripleToque,pattern_agotamiento,pattern_divergencia,pattern_espejo]){const res=fn();if(res)list.push(res);}return list;}

    // ===================== ACTUALIZAR SEÑAL =====================
    function updateSignalMessage() {
        if (!Array.isArray(candles) || candles.length < MIN_CANDLES_FOR_SIGNAL) {
            setSignal('⚪ Esperando más velas...', 'rgba(0,0,0,0.6)', '0 0 10px rgba(0,255,255,0.4)');
            return;
        }

        // 🔹 Primero chequeamos patrones
        const patterns = checkPatterns();
        if (patterns.length > 0) {
            const text = patterns.join(' | ');
            setSignal(text, 'rgba(0,0,0,0.6)', '0 0 16px rgba(0,255,255,0.6)');
            return;
        }

        // 🔹 Si no hay patrones, continuamos con tus señales originales
        const last = candles[candles.length - 1];
        const prev1 = candles[candles.length - 2];
        const bullish = last.close > last.open;
        const bearish = last.close < last.open;
        const prevBullish = prev1.close > prev1.open;
        const prevBearish = prev1.close < prev1.open;

        if (bullish && prevBullish) {
            setSignal('🟢 Tendencia alcista — Posible entrada', 'rgba(0,200,80,0.9)', '0 0 14px rgba(0,255,100,0.9)');
            return;
        }
        if (bearish && prevBearish) {
            setSignal('🔴 Tendencia bajista — Esperar', 'rgba(200,40,40,0.9)', '0 0 14px rgba(255,100,100,0.9)');
            return;
        }

        setSignal('⚪ Sin señal clara', 'rgba(0,0,0,0.6)', '0 0 10px rgba(0,255,255,0.4)');
    }

    // === Integración con addCandleAuto ===
    const originalAddCandleAuto = addCandleAuto;
   addCandleAuto = function(v, color) {
  originalAddCandleAuto(v, color);
  try { 
    updateSignalMessage(); 
    showPatternCenterMessage(); // 👈 NUEVO
  } catch(err) { 
    console.error('Error actualizando señal:', err); 
  }
};

    // ===================== GRAFICO 2 (VELAS) — PAN / ZOOM / 150 VELAS =====================
    const candleCanvas = document.getElementById('candlestick-chart');
    const candleCtx    = candleCanvas.getContext('2d');
    const candleMargin = 40;
    const CANDLE_MAX   = 150;   // historial máximo
    let   candles      = [];
    let   candleColors = [];    // color de botón de cada vela

    // Vista: cuántas velas mostrar y desde cuál
    let viewCount  = 40;        // velas visibles (zoom)
    let viewOffset = 0;         // desplazamiento desde la derecha (pan)

    // ── Utilidades de escala ──────────────────────────────────────────────
    function getCandleView() {
        const total = candles.length;
        const end   = Math.max(total - viewOffset, 1);
        const start = Math.max(end - viewCount, 0);
        return { start, end, slice: candles.slice(start, end), offset: start };
    }

    function candleScaleY(p, minP, maxP, h) {
        const r = maxP - minP || 1;
        return candleMargin + (maxP - p) / r * (h - 2 * candleMargin);
    }

    // ── Regresión lineal interna ──────────────────────────────────────────
    function regreLineal(velas) {
        const n = velas.length;
        if (n < 3) return null;
        const closes = velas.map(c => c.close);
        const mx = (n - 1) / 2;
        const my = closes.reduce((a, v) => a + v, 0) / n;
        const m  = closes.reduce((a, v, i) => a + (i - mx) * (v - my), 0)
                 / closes.reduce((a, _, i) => a + (i - mx) ** 2, 0.001);
        return { m, b: my - m * mx };
    }

    // ── Dibujado principal ────────────────────────────────────────────────
    function drawCandlestickChart() {
        const W = candleCanvas.width, H = candleCanvas.height;
        candleCtx.clearRect(0, 0, W, H);
        if (candles.length === 0) return;

        const { start, end, slice } = getCandleView();
        if (slice.length === 0) return;

        const allP  = slice.flatMap(c => [c.open, c.close, c.high, c.low]);
        const minP  = Math.min(...allP), maxP = Math.max(...allP);
        const drawW = W - candleMargin * 2;
        const cw    = Math.max(4, Math.floor(drawW / slice.length) - 2); // ancho dinámico

        const sY = p => candleScaleY(p, minP, maxP, H);
        const sX = i => candleMargin + (i + 0.5) * (drawW / slice.length);

        // Grid horizontal
        candleCtx.font = '9px Orbitron, sans-serif';
        candleCtx.fillStyle = '#00ffff88';
        candleCtx.textAlign = 'right';
        for (let i = 0; i <= 4; i++) {
            const val = minP + (maxP - minP) * i / 4;
            const y   = sY(val);
            candleCtx.strokeStyle = 'rgba(0,255,255,0.07)';
            candleCtx.lineWidth = 0.5;
            candleCtx.beginPath();
            candleCtx.moveTo(candleMargin, y);
            candleCtx.lineTo(W - 8, y);
            candleCtx.stroke();
            candleCtx.fillText(val.toFixed(1), candleMargin - 4, y + 3);
        }
        candleCtx.textAlign = 'left';

        // Línea cero si está en rango
        if (minP <= 0 && maxP >= 0) {
            const y0 = sY(0);
            candleCtx.strokeStyle = 'rgba(255,255,255,0.35)';
            candleCtx.lineWidth = 1;
            candleCtx.setLineDash([4, 4]);
            candleCtx.beginPath(); candleCtx.moveTo(candleMargin, y0); candleCtx.lineTo(W - 8, y0); candleCtx.stroke();
            candleCtx.setLineDash([]);
        }

        // ── Tendencia global (vista) ──
        const tG = regreLineal(slice);
        if (tG) {
            const alc = tG.m > 0;
            const x0 = sX(0), y0 = sY(tG.b);
            const x1 = sX(slice.length - 1), y1 = sY(tG.m * (slice.length - 1) + tG.b);
            candleCtx.save();
            candleCtx.setLineDash([7, 4]); candleCtx.lineWidth = 1.8;
            candleCtx.strokeStyle = alc ? 'rgba(0,255,128,0.5)' : 'rgba(255,80,80,0.5)';
            candleCtx.beginPath(); candleCtx.moveTo(x0, y0); candleCtx.lineTo(x1, y1); candleCtx.stroke();
            candleCtx.setLineDash([]); candleCtx.lineWidth = 1;
            candleCtx.fillStyle = alc ? '#00ff80' : '#ff5050';
            candleCtx.font = '10px Orbitron, sans-serif';
            candleCtx.fillText(alc ? '↗ Global' : '↘ Global', x1 - 50, alc ? y1 - 6 : y1 + 14);
            candleCtx.restore();
        }

        // ── Tendencia reciente (últimas 10 en vista) ──
        if (slice.length >= 10) {
            const rec = slice.slice(-10);
            const tR  = regreLineal(rec);
            if (tR) {
                const alc = tR.m > 0;
                const off = slice.length - 10;
                const x0  = sX(off), y0 = sY(tR.b);
                const x1  = sX(slice.length - 1), y1 = sY(tR.m * 9 + tR.b);
                candleCtx.save();
                candleCtx.setLineDash([3, 3]); candleCtx.lineWidth = 2.2;
                candleCtx.strokeStyle = alc ? 'rgba(0,255,190,0.9)' : 'rgba(255,120,120,0.9)';
                candleCtx.shadowColor = alc ? '#00ffaa' : '#ff8080'; candleCtx.shadowBlur = 8;
                candleCtx.beginPath(); candleCtx.moveTo(x0, y0); candleCtx.lineTo(x1, y1); candleCtx.stroke();
                candleCtx.shadowBlur = 0; candleCtx.setLineDash([]);
                candleCtx.fillStyle = alc ? '#00ffaa' : '#ff8080';
                candleCtx.font = '10px Orbitron, sans-serif';
                candleCtx.fillText('(10v)', x1 - 32, alc ? y1 - 8 : y1 + 14);
                candleCtx.restore();
            }
        }

        // ── Soportes y Resistencias: auto-detectados + manuales ──
        const nivelesAuto = (typeof detectarNivelesSRAutomaticos === 'function')
            ? detectarNivelesSRAutomaticos().slice(0, 8)
            : [];
        nivelesAuto.forEach(n => {
            const pct    = (n.nivel - Math.min(...data.slice(-150))) /
                          ((Math.max(...data.slice(-150)) - Math.min(...data.slice(-150))) || 1);
            const precio = minP + pct * (maxP - minP);
            const yL     = sY(precio);
            const esManual = n.manual;
            const colBase  = n.tipo === 'resistencia' ? '#ff5050'
                           : n.tipo === 'soporte'     ? '#00dd80'
                           :                            '#ffff50';
            const alpha  = esManual ? 0.9 : Math.min(0.4 + n.toques * 0.1, 0.85);
            candleCtx.save();
            candleCtx.setLineDash(esManual ? [8, 3] : [4, 5]);
            candleCtx.strokeStyle = colBase + Math.round(alpha * 255).toString(16).padStart(2,'0');
            candleCtx.lineWidth   = esManual ? 1.8 : 1;
            candleCtx.shadowColor = colBase;
            candleCtx.shadowBlur  = esManual ? 8 : 4;
            candleCtx.beginPath(); candleCtx.moveTo(candleMargin, yL); candleCtx.lineTo(W - 10, yL); candleCtx.stroke();
            candleCtx.setLineDash([]); candleCtx.shadowBlur = 0;
            const etiq = n.tipo === 'resistencia' ? 'R' : n.tipo === 'soporte' ? 'S' : '0';
            candleCtx.font = `${esManual ? 'bold ' : ''}9px Orbitron, sans-serif`;
            candleCtx.fillStyle = colBase;
            candleCtx.fillText(`${etiq}${n.toques > 1 ? n.toques : ''} ${n.nivel.toFixed(1)}`, W - 46, yL - 2);
            candleCtx.restore();
        });

        // ── Velas ──
        slice.forEach((c, i) => {
            const x   = sX(i);
            const hw  = Math.max(cw / 2, 3);
            const yH  = sY(c.high), yL = sY(c.low);
            const yO  = sY(c.open),  yC = sY(c.close);
            const alc = c.close >= c.open;
            const col = alc ? '#00cc66' : '#cc3333';
            // Mecha
            candleCtx.strokeStyle = col; candleCtx.lineWidth = 1;
            candleCtx.beginPath(); candleCtx.moveTo(x, yH); candleCtx.lineTo(x, yL); candleCtx.stroke();
            // Cuerpo
            candleCtx.fillStyle = col;
            const bodyTop = Math.min(yO, yC), bodyH = Math.max(Math.abs(yC - yO), 1);
            candleCtx.fillRect(x - hw, bodyTop, hw * 2, bodyH);
        });

        // ── Indicador de posición (scrollbar visual) ──
        if (candles.length > viewCount) {
            const barW  = W - candleMargin * 2;
            const ratio = slice.length / candles.length;
            const pos   = (candles.length - end) / candles.length;
            candleCtx.fillStyle = 'rgba(0,255,255,0.12)';
            candleCtx.fillRect(candleMargin + pos * barW, H - 6, ratio * barW, 4);
            candleCtx.fillStyle = 'rgba(0,255,255,0.35)';
            candleCtx.fillRect(candleMargin + pos * barW, H - 6, ratio * barW, 4);
        }

        // ── Etiqueta de navegación ──
        if (viewOffset > 0) {
            candleCtx.font = '10px Orbitron, sans-serif';
            candleCtx.fillStyle = 'rgba(0,255,255,0.6)';
            candleCtx.textAlign = 'center';
            candleCtx.fillText(`◀ mostrando velas ${start + 1}–${end} de ${candles.length}`, W / 2, 14);
            candleCtx.textAlign = 'left';
        }
    }

    // ── Pan con ratón / touch ─────────────────────────────────────────────
    let isDragging = false, dragStartX = 0, dragStartOffset = 0;

    candleCanvas.addEventListener('mousedown', e => {
        isDragging = true;
        dragStartX = e.clientX;
        dragStartOffset = viewOffset;
        candleCanvas.style.cursor = 'grabbing';
    });
    window.addEventListener('mouseup', () => { isDragging = false; candleCanvas.style.cursor = 'crosshair'; });
    window.addEventListener('mousemove', e => {
        if (!isDragging) return;
        const dx     = e.clientX - dragStartX;
        const pixPerCandle = (candleCanvas.width - candleMargin * 2) / viewCount;
        const delta  = Math.round(-dx / pixPerCandle);
        viewOffset   = Math.max(0, Math.min(candles.length - viewCount, dragStartOffset + delta));
        drawCandlestickChart();
    });

    // Touch
    let touchStartX = 0, touchStartOffset = 0;
    candleCanvas.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; touchStartOffset = viewOffset; }, { passive: true });
    candleCanvas.addEventListener('touchmove', e => {
        const dx = e.touches[0].clientX - touchStartX;
        const pixPerCandle = (candleCanvas.width - candleMargin * 2) / viewCount;
        viewOffset = Math.max(0, Math.min(candles.length - viewCount, touchStartOffset + Math.round(-dx / pixPerCandle)));
        drawCandlestickChart();
    }, { passive: true });

    // ── Zoom con scroll ───────────────────────────────────────────────────
    candleCanvas.addEventListener('wheel', e => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 5 : -5;
        viewCount   = Math.max(10, Math.min(CANDLE_MAX, viewCount + delta));
        // Anclar al extremo derecho si no hay pan activo
        if (viewOffset === 0) drawCandlestickChart();
        else {
            viewOffset = Math.max(0, Math.min(candles.length - viewCount, viewOffset));
            drawCandlestickChart();
        }
    }, { passive: false });

    candleCanvas.style.cursor = 'crosshair';

    // ── Agregar velas ─────────────────────────────────────────────────────
    function addCandle(open, close, high, low, color) {
        candles.push({ open, close, high, low });
        candleColors.push(color || null);
        if (candles.length > CANDLE_MAX) { candles.shift(); candleColors.shift(); }
        // Auto-scroll al final si el usuario no está navegando
        if (viewOffset === 0) drawCandlestickChart();
        analyzeCandleTrend(candles[candles.length - 1]);
    }

    function addCandleAuto(v, color) {
        let base  = candles.length > 0 ? candles[candles.length - 1].close : 1;
        let range = Math.abs(v) || 1;
        if      (color === '#ba1428') addCandle(base, base - range*0.6,  base + range*0.3,  base - range,      color);
        else if (color === '#8b0000') addCandle(base, base - range*1.8,  base + range*1.0,  base - range*2.6,  color);
        else if (color === '#6ceb52') addCandle(base, base + range*0.6,  base + range*0.3,  base - range*0.4,  color);
        else if (color === '#ed4ac7') addCandle(base, base + range*1.8,  base + range*2.6,  base - range*0.8,  color);
        else if (color === '#ffd700') addCandle(base, base + range*1.2,  base + range*2.0,  base - range*1.0,  color);
        else                          addCandle(base, base + range*0.8,  base + range*1.4,  base - range*0.4,  color);
    }

    // ── Botón "ir al final" cuando el usuario está navegando ─────────────
    (function crearBotonIrAlFinal() {
        const btn = document.createElement('button');
        btn.id = 'btn-ir-al-final';
        btn.textContent = '▶▶ Ir al final';
        btn.style.cssText = 'display:none;position:absolute;bottom:14px;right:14px;font-family:Orbitron,sans-serif;font-size:11px;padding:4px 10px;background:#111;border:1px solid #0ff5;color:#0ff;border-radius:5px;cursor:pointer;z-index:10;';
        btn.addEventListener('click', () => { viewOffset = 0; drawCandlestickChart(); });
        const wrapper = candleCanvas.parentElement;
        if (wrapper) { wrapper.style.position = 'relative'; wrapper.appendChild(btn); }

        // Mostrar/ocultar botón según si hay pan activo
        const origDraw = drawCandlestickChart;
        // Monkey-patch para actualizar botón
        const _origDraw = drawCandlestickChart;
        candleCanvas._showEndBtn = () => {
            btn.style.display = viewOffset > 0 ? 'block' : 'none';
        };
    })();

    // Llamar actualización del botón tras cada redibujado
    const _drawOrig = drawCandlestickChart;
    drawCandlestickChart = function() {
        _drawOrig();
        const btn = document.getElementById('btn-ir-al-final');
        if (btn) btn.style.display = viewOffset > 0 ? 'block' : 'none';
    };

    // =====================================================================
    // 🔊 AVISOS DE VOZ INTELIGENTES — solo cuando es necesario
    // =====================================================================
    let vozActiva = true;
    let _vozUltimoTexto = '';
    let _vozUltimaVez   = 0;
    const VOZ_COOLDOWN  = 8000; // mínimo 8s entre mensajes de voz

    function hablar(texto, forzar = false) {
        if (!vozActiva) return;
        if (!window.speechSynthesis) return;
        const ahora = Date.now();
        if (!forzar && (texto === _vozUltimoTexto || ahora - _vozUltimaVez < VOZ_COOLDOWN)) return;
        _vozUltimoTexto = texto;
        _vozUltimaVez   = ahora;
        try {
            window.speechSynthesis.cancel();
            const u   = new SpeechSynthesisUtterance(texto);
            u.lang    = 'es-ES'; u.rate = 1.05; u.pitch = 1.0; u.volume = 0.9;
            const voces = window.speechSynthesis.getVoices();
            const voz   = voces.find(v => v.lang.startsWith('es') && v.name.toLowerCase().includes('fem'))
                       || voces.find(v => v.lang.startsWith('es')) || null;
            if (voz) u.voice = voz;
            window.speechSynthesis.speak(u);
        } catch (e) { console.warn('Voz error:', e); }
    }

    // ── Detector de cambio de tendencia ──────────────────────────────────
    let _tendenciaAnterior = null;

    function evaluarVozTendencia() {
        if (candles.length < 6) return;
        const t = regreLineal(candles.slice(-6));
        if (!t) return;
        const tendActual = t.m > 0.08 ? 'alcista' : t.m < -0.08 ? 'bajista' : 'lateral';
        if (tendActual !== _tendenciaAnterior && _tendenciaAnterior !== null) {
            const msg = tendActual === 'alcista' ? 'Atención. Posible cambio de tendencia a alcista.'
                      : tendActual === 'bajista' ? 'Atención. Posible cambio de tendencia a bajista.'
                      : 'El mercado está entrando en zona lateral.';
            hablar(msg);
        }
        _tendenciaAnterior = tendActual;
    }

    // ── Voz para patrones repetidos de Memoria IA ────────────────────────
    let _ultimaFiguraAnunciada = '';

    function evaluarVozFigurasRepetidas() {
        if (memoriaVelas.length < 6) return;
        const fig5 = detectarFigurasRepetidas(5, 2);
        const fig3 = detectarFigurasRepetidas(3, 3);
        const mejor = fig5[0] || fig3[0];
        if (!mejor) return;
        const [sig, veces] = mejor;
        if (sig === _ultimaFiguraAnunciada) return;
        _ultimaFiguraAnunciada = sig;
        const pred = obtenerColorPredichoParaFigura(fig5[0] ? 5 : 3);
        if (!pred || pred.prob < 60) return;
        const nombre = (NOMBRES_COLOR[pred.color] || '').replace(/[🔴🍷🟩🩷💛]/g, '').trim();
        hablar(`Patrón repetido ${veces} veces. Posible próximo color ${nombre}, confianza ${Math.round(pred.prob)} por ciento.`);
    }

    // Botón para activar/desactivar la voz — se crea en el panel de botones
    (function crearBotonVoz() {
        const btn = document.createElement('button');
        btn.id = 'btn-voz';
        btn.className = 'blue';
        btn.style.cssText = 'font-family:Orbitron,sans-serif;font-size:13px;padding:6px 10px;border-radius:6px;cursor:pointer;border:1px solid #00aaff;background:#0044aa;color:#fff;';
        btn.textContent = '🔊 Voz ON';
        btn.addEventListener('click', () => {
            vozActiva = !vozActiva;
            btn.textContent = vozActiva ? '🔊 Voz ON' : '🔇 Voz OFF';
            btn.style.background = vozActiva ? '#0044aa' : '#333';
            if (vozActiva) hablar('Voz activada');
        });
        const fila = document.querySelector('.fila-botones');
        if (fila) fila.appendChild(btn);
    })();

    // Pre-cargar voces en Safari/iOS (requiere interacción previa)
    if (window.speechSynthesis) {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }

    function addCandle(open, close, high, low) {
        candles.push({open,close,high,low});
        if(candles.length>60) candles.shift();
        drawCandlestickChart();
        analyzeCandleTrend(candles[candles.length - 1]);
    }

    function addCandleAuto(v, color) {
        let base = candles.length > 0 ? candles[candles.length - 1].close : 1;
        let range = Math.abs(v);
        if (color === '#ba1428') addCandle(base, base - range * 0.6, base + range * 0.3, base - range);
        else if (color === '#8b0000') addCandle(base, base - range * 1.8, base + range * 1.0, base - range * 2.6);
        else if (color === '#6ceb52') addCandle(base, base + range * 0.6, base + range * 0.3, base - range * 0.4);
        else if (color === '#ed4ac7') addCandle(base, base + range * 1.8, base + range * 2.6, base - range * 0.8);
        else if (color === '#ffd700') addCandle(base, base + range * 1.2, base + range * 2.0, base - range * 1.0);
        else addCandle(base, base + range * 0.8, base + range * 1.4, base - range * 0.4);
        
    }
// ====== CONTADOR DE TENDENCIA GENERAL ======
let trendData = { bull: 0, bear: 0 };// Contador de velas alcistas y bajistas

function updateTrendCounter() {//| Actualiza el contador visualmente
  const elStatus = document.getElementById("trend-status");
  const elDetails = document.getElementById("trend-details");
  if (!elStatus || !elDetails) return;

  const total = trendData.bull + trendData.bear;
  if (total === 0) {
    elStatus.textContent = "Estable";
    elDetails.textContent = "Altas: 0 | Bajas: 0";
    elStatus.style.color = "#00ffff";
    return;
  }

  const bullRatio = trendData.bull / total;
  const bearRatio = trendData.bear / total;

  if (bullRatio > 0.5) {// Más del 60% alcistas
    elStatus.textContent = "Alcista";
    elStatus.style.color = "#00ff66";
    elStatus.style.textShadow = "0 0 10px #00ff66";
  } else if (bearRatio > 0.5) {
    elStatus.textContent = "Bajista";
    elStatus.style.color = "#ff4444";
    elStatus.style.textShadow = "0 0 10px #ff4444";
  } else {
    elStatus.textContent = "Estable";
    elStatus.style.color = "#ffff00";
    elStatus.style.textShadow = "0 0 8px #ffff66";
  }

  elDetails.textContent = `Altas: ${trendData.bull} | Bajas: ${trendData.bear}`;
}

function analyzeCandleTrend(candle) {
  if (!candle) return;
  if (candle.close > candle.open) trendData.bull++;
  else if (candle.close < candle.open) trendData.bear++;

  // Limitar el historial a las últimas 100 velas
  const total = trendData.bull + trendData.bear;
  if (total > 100) {
    trendData.bull = Math.floor(trendData.bull * 0.9);
    trendData.bear = Math.floor(trendData.bear * 0.9);
  }

  updateTrendCounter();// Actualizar visualmente


}

    // ===================== BOTONES =====================
    document.getElementById('btn1').addEventListener('click', ()=>addData(-1,'#ba1428'));
    document.getElementById('btn13').addEventListener('click', ()=>addData(-1,'#8b0000'));
    document.getElementById('btn2').addEventListener('click', ()=>addData(1,'#6ceb52'));
    document.getElementById('btn9').addEventListener('click', ()=>addData(1,'#ed4ac7'));
    document.getElementById('btn10').addEventListener('click', ()=>addData(1,'#ffd700'));
    document.getElementById('btn3').addEventListener('click', ()=>{data.pop();colors.pop();labels.pop();drawChart();candles.pop();drawCandlestickChart();});
    document.getElementById('btn4').addEventListener('click', ()=>{
        data=[];colors=[];labels=[];candles=[];horizontalLines=[];
        seqOffset = 0;
        window.__valorReal = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawChart();drawCandlestickChart();
        try { trendData = { bull: 0, bear: 0 }; updateTrendCounter(); } catch (e) {}
        if (window.speechSynthesis) try { window.speechSynthesis.cancel(); } catch (e) {}
        if (window.__autoVelasReiniciar) window.__autoVelasReiniciar();
    });
    document.getElementById('btn5').addEventListener('click', ()=>addHorizontalLine('#ff0000'));
    document.getElementById('btn6').addEventListener('click', ()=>addHorizontalLine('#00cc66'));
    document.getElementById('btn7').addEventListener('click', clearLastLine);
    document.getElementById('btn12').addEventListener('click', ()=>addHorizontalLine('#ffff00'));

 // === Gestión de Entradas A y B con alarma ===
// Cada entrada (A y B) tiene su propio temporizador, completamente independiente:
// pulsar una NO afecta a la otra ni a los conteos de Rosa del rastreador.
const ENTRADA_ESPERA_SEG = 110;                       // ⏱ tiempo de espera
const ENTRADA_NOMBRES = { 'proxima-entrada1': 'A', 'proxima-entrada2': 'B' };

function formatearRestante(ms) {
  const t = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

function setEntrada(timerId, labelId) {
  const label = document.getElementById(labelId);
  const container = label.parentElement;
  const nombre = ENTRADA_NOMBRES[labelId] || '';

  // Cancelar SOLO lo que pertenece a esta entrada (conteo y parpadeo anteriores)
  clearInterval(label._interval);
  clearInterval(label._blink);
  container.classList.remove('blink-alert');

  const objetivo = Date.now() + ENTRADA_ESPERA_SEG * 1000;
  const horaObjetivo = new Date(objetivo).toLocaleTimeString();
  label.dataset.targetTime = objetivo;
  label.style.color = '#00ffff';
  label.style.textShadow = '0 0 10px #00ffff';

  const pintar = () => {
    label.textContent = `${horaObjetivo} · ⏳ ${formatearRestante(objetivo - Date.now())}`;
  };
  pintar();

  label._interval = setInterval(() => {
    if (objetivo - Date.now() <= 0) {
      clearInterval(label._interval);
      triggerEntradaAlert(labelId, horaObjetivo, nombre);
    } else {
      pintar();
    }
  }, 500);
}

// === Alerta cuando llega la hora (visual + sonido + mensaje + voz) ===
function triggerEntradaAlert(labelId, horaObjetivo, nombre) {
  const label = document.getElementById(labelId);
  const container = label.parentElement;

  label.textContent = `${horaObjetivo} ⚠️ ¡YA!`;
  label.style.color = '#ff0';

  // 🔔 Sonido corto
  playBeep(200, 900, 0.2);

  // 🗣️ Voz: indica cuál entrada se cumplió
  hablar(`Entrada ${nombre} cumplida. Posible señal alta.`, true);

  // 💬 Mensaje central
  showCentralEntradaAlert(labelId);

  // 💡 Parpadeo visual durante 5s
  let count = 0;
  clearInterval(label._blink);
  label._blink = setInterval(() => {
    container.classList.toggle('blink-alert');
    if (++count >= 10) {
      clearInterval(label._blink);
      container.classList.remove('blink-alert');
    }
  }, 500);
}

// === Mostrar mensaje de alerta central al cumplirse la hora ===
function showCentralEntradaAlert(labelId) {
  const nombre = ENTRADA_NOMBRES[labelId] || '';
  const msgText = `⏰ Entrada ${nombre}: posible señal alta`;

  const msgDiv = document.getElementById("pattern-center-message");
  if (!msgDiv) return;

  msgDiv.textContent = msgText;
  msgDiv.classList.add("visible");
  msgDiv.style.color = "#ffff00";
  msgDiv.style.textShadow = "0 0 15px #ffff66";
  msgDiv.style.boxShadow = "0 0 20px rgba(255,255,0,0.8)";
  msgDiv.style.backgroundColor = "rgba(0, 0, 0, 0.6)";

  // Ocultar mensaje después de 6 segundos
  clearTimeout(msgDiv._alertTimeout);
  msgDiv._alertTimeout = setTimeout(() => {
    msgDiv.classList.remove("visible");
    msgDiv.textContent = "⚪ Sin patrón detectado...";
    msgDiv.style.color = "#00ffff";
    msgDiv.style.textShadow = "0 0 10px #00ffff";
    msgDiv.style.boxShadow = "0 0 10px rgba(0,255,255,0.4)";
  }, 6000);
}


// Asignar botones
document.getElementById("btn8").addEventListener("click", () => setEntrada("btn8", "proxima-entrada1"));
document.getElementById("btn11").addEventListener("click", () => setEntrada("btn11", "proxima-entrada2"));


    // Reloj
    setInterval(()=>{document.getElementById('time').textContent=new Date().toLocaleTimeString();},1000);

    // Líneas horizontales
    function addHorizontalLine(color) {
        if (data.length === 0) return;
        const minY = Math.min(...data), maxY = Math.max(...data);
        const yRange = maxY - minY || 1;
        const value = data[data.length - 1];
        const y = margin + chartHeight - ((value - minY) / yRange) * chartHeight;
        horizontalLines.push({ value, y, color });
        drawChart();

        // Anunciar por voz qué se acaba de marcar
        const tipo = color === '#ff0000' ? 'Resistencia' : color === '#00cc66' ? 'Soporte' : 'Zona cero';
        hablar(`${tipo} marcado en nivel ${value.toFixed(1)}.`, true);
    }

    // ─── Sistema de avisos S/R ─────────────────────────────────────────────
    // Registro de estados anteriores para no repetir el mismo aviso
    const _srEstadoAnterior = {}; // key = line.value → 'encima'|'debajo'|'toca'

    function evaluarVozSoporteResistencia() {
        if (horizontalLines.length === 0 || data.length < 2) return;
        const precioActual  = data.at(-1);
        const precioAnterior = data.at(-2);

        horizontalLines.forEach(line => {
            const nivel     = line.value;
            const tipo      = line.color === '#ff0000' ? 'resistencia'
                            : line.color === '#00cc66' ? 'soporte'
                            : 'zona cero';
            const margen    = Math.abs(nivel) * 0.04 + 0.3; // ±4% o ±0.3 pts
            const clave     = `${nivel}_${tipo}`;
            const estadoPrev = _srEstadoAnterior[clave] || null;

            // ── Ruptura: el precio cruzó la línea ──
            if (precioAnterior < nivel && precioActual >= nivel) {
                // Cruzó hacia arriba
                if (tipo === 'resistencia') {
                    hablar(`¡Atención! Precio rompe resistencia en ${nivel.toFixed(1)}. Posible entrada alcista.`);
                } else if (tipo === 'soporte') {
                    hablar(`El precio toca soporte en ${nivel.toFixed(1)} desde abajo. Zona clave alcista.`);
                } else {
                    hablar(`Precio cruza zona cero al alza. Señal de impulso.`);
                }
                _srEstadoAnterior[clave] = 'ruptura_arriba';
                return;
            }

            if (precioAnterior > nivel && precioActual <= nivel) {
                // Cruzó hacia abajo
                if (tipo === 'soporte') {
                    hablar(`¡Atención! Precio rompe soporte en ${nivel.toFixed(1)}. Señal bajista. No operar al alza.`);
                } else if (tipo === 'resistencia') {
                    hablar(`Precio baja desde resistencia en ${nivel.toFixed(1)}. Posible entrada bajista.`);
                } else {
                    hablar(`Precio cruza zona cero a la baja. Precaución.`);
                }
                _srEstadoAnterior[clave] = 'ruptura_abajo';
                return;
            }

            // ── Proximidad: precio se acerca pero no cruza ──
            const distancia = Math.abs(precioActual - nivel);
            if (distancia <= margen) {
                const estadoActual = 'cerca';
                if (estadoPrev !== 'cerca') {
                    if (tipo === 'resistencia') {
                        hablar(`Precio se acerca a resistencia en ${nivel.toFixed(1)}. Precaución. Posible rebote bajista.`);
                    } else if (tipo === 'soporte') {
                        hablar(`Precio cerca de soporte en ${nivel.toFixed(1)}. Atento a posible rebote alcista.`);
                    } else {
                        hablar(`Precio en zona cero, nivel ${nivel.toFixed(1)}. Zona de decisión.`);
                    }
                }
                _srEstadoAnterior[clave] = 'cerca';
                return;
            }

            // ── Rebote: el precio se alejó tras tocar ──
            if (estadoPrev === 'cerca') {
                if (precioActual > nivel + margen) {
                    if (tipo === 'soporte') hablar(`Rebote confirmado desde soporte. Buen momento alcista.`);
                    else if (tipo === 'resistencia') hablar(`Precio rompe resistencia con fuerza. Opera al alza.`);
                } else if (precioActual < nivel - margen) {
                    if (tipo === 'resistencia') hablar(`Rebote bajista confirmado desde resistencia. No operar al alza.`);
                    else if (tipo === 'soporte') hablar(`Ruptura de soporte confirmada. Señal bajista fuerte.`);
                }
                _srEstadoAnterior[clave] = precioActual > nivel ? 'encima' : 'debajo';
                return;
            }

            // Estado base
            _srEstadoAnterior[clave] = precioActual > nivel ? 'encima' : 'debajo';
        });
    }

    function clearLastLine() {
        if (horizontalLines.length > 0) {
            horizontalLines.pop();
            drawChart();
        }
    }

    // =====================================================================
    // 🧠 AUTO-DETECCIÓN DE SOPORTES Y RESISTENCIAS DESDE MEMORIA DE PATRONES
    // =====================================================================

    // Encuentra niveles donde el precio rebotó varias veces en el historial
    // de datos del gráfico de secuencia. Retorna array de {nivel, tipo, toques}
    function detectarNivelesSRAutomaticos() {
        if (data.length < 8) return [];
        const niveles = [];
        const tolerance = (Math.max(...data) - Math.min(...data)) * 0.03 + 0.2;

        // ── 1. Rebotes en gráfico de secuencia (data[]) ──
        for (let i = 2; i < data.length - 2; i++) {
            const v = data[i];
            // Máximo local (resistencia)
            if (v > data[i-1] && v > data[i-2] && v > data[i+1] && v > data[i+2]) {
                const existe = niveles.find(n => Math.abs(n.nivel - v) < tolerance && n.tipo === 'resistencia');
                if (existe) { existe.toques++; existe.ultimoIdx = i; }
                else niveles.push({ nivel: v, tipo: 'resistencia', toques: 1, ultimoIdx: i, fuente: 'secuencia' });
            }
            // Mínimo local (soporte)
            if (v < data[i-1] && v < data[i-2] && v < data[i+1] && v < data[i+2]) {
                const existe = niveles.find(n => Math.abs(n.nivel - v) < tolerance && n.tipo === 'soporte');
                if (existe) { existe.toques++; existe.ultimoIdx = i; }
                else niveles.push({ nivel: v, tipo: 'soporte', toques: 1, ultimoIdx: i, fuente: 'secuencia' });
            }
        }

        // ── 2. Rebotes en Memoria IA de velas (candles) ──
        for (let i = 2; i < memoriaVelas.length - 2; i++) {
            const c = memoriaVelas[i];
            const alto = c.high, bajo = c.low, cierre = c.close;
            // Sombras largas arriba = resistencia tocada
            const sombraArr = c.high - Math.max(c.open, c.close);
            const sombraBaj = Math.min(c.open, c.close) - c.low;
            const cuerpo    = Math.abs(c.close - c.open) || 0.01;
            if (sombraArr > cuerpo * 1.5) {
                const existe = niveles.find(n => Math.abs(n.nivel - alto) < tolerance && n.tipo === 'resistencia');
                if (existe) { existe.toques++; }
                else niveles.push({ nivel: alto, tipo: 'resistencia', toques: 1, ultimoIdx: i, fuente: 'velas' });
            }
            if (sombraBaj > cuerpo * 1.5) {
                const existe = niveles.find(n => Math.abs(n.nivel - bajo) < tolerance && n.tipo === 'soporte');
                if (existe) { existe.toques++; }
                else niveles.push({ nivel: bajo, tipo: 'soporte', toques: 1, ultimoIdx: i, fuente: 'velas' });
            }
        }

        // ── 3. Líneas marcadas manualmente — siempre incluirlas ──
        horizontalLines.forEach(line => {
            const tipo = line.color === '#ff0000' ? 'resistencia'
                       : line.color === '#00cc66' ? 'soporte' : 'zona_cero';
            const existe = niveles.find(n => Math.abs(n.nivel - line.value) < tolerance && n.tipo === tipo);
            if (existe) { existe.toques += 3; existe.manual = true; }
            else niveles.push({ nivel: line.value, tipo, toques: 5, manual: true, fuente: 'manual' });
        });

        // Solo devolver niveles con al menos 2 toques (más relevantes primero)
        return niveles.filter(n => n.toques >= 2).sort((a, b) => b.toques - a.toques);
    }

    // ── Historial de avisos S/R para no repetir ───────────────────────────
    const _srAvisoCache = {};   // clave → { estado, ts }
    const SR_COOLDOWN   = 25000; // 25s entre avisos del mismo nivel
    const _srEtapa      = {};    // clave → 0 libre | 1 aviso 'se acerca' | 2 aviso 'toque' (hasta que el precio se aleje)

    function _puedeAvisarSR(clave, estado) {
        const prev = _srAvisoCache[clave];
        const ahora = Date.now();
        if (prev && prev.estado === estado && ahora - prev.ts < SR_COOLDOWN) return false;
        _srAvisoCache[clave] = { estado, ts: ahora };
        return true;
    }

    // ── Analizador principal — combina S/R auto + confirmación de IA ──────
    function evaluarVozSoporteResistencia() {
        if (data.length < 4) return;

        const precioActual   = data.at(-1);
        const precioAnterior = data.at(-2);
        const niveles        = detectarNivelesSRAutomaticos();
        if (niveles.length === 0) return;

        // Contexto de la Memoria IA — ¿el historial es más alcista o bajista?
        const statsIA   = calcularEstadisticasPatrones();
        const totalIA   = Object.values(statsIA).reduce((a, v) => a + v.total, 0);
        const upIA      = Object.values(statsIA).reduce((a, v) => a + v.up, 0);
        const pctAlcIA  = totalIA > 0 ? Math.round(upIA / totalIA * 100) : 50;
        const iaAlcista = pctAlcIA >= 55;
        const iaBajista = pctAlcIA <= 45;

        // Markov: próximo color
        const markov     = prediccionMarkov();
        const markovAlc  = markov && ['#6ceb52','#ed4ac7','#ffd700'].includes(markov.mejorColor) && markov.prob > 55;
        const markovBaj  = markov && ['#ba1428','#8b0000'].includes(markov.mejorColor) && markov.prob > 55;

        // Racha actual
        const { n: rachaN, dir: rachaDir } = calcRacha();

        niveles.slice(0, 6).forEach(n => {
            const margen = Math.abs(n.nivel) * 0.05 + 0.4;
            const clave  = `${n.tipo}_${n.nivel.toFixed(1)}`;
            const dist   = Math.abs(precioActual - n.nivel);
            const confianza = Math.min(n.toques * 15, 90); // % confianza por toques

            // ── 🔔 AVISOS PREVIOS: se acerca / toque → posible ruptura ──────────
            // Solo avisa cuando la memoria y el momentum indican que el nivel
            // PUEDE ROMPERSE, y una sola vez por acercamiento (se vuelve a armar
            // cuando el precio se aleja del nivel). Así no repite en cada toque.
            if (n.tipo === 'soporte' || n.tipo === 'resistencia') {
                const esRes   = n.tipo === 'resistencia';
                const dirRomp = esRes ? 'UP' : 'DOWN';           // dirección en que se rompería
                const signo   = esRes ? 1 : -1;
                const lado    = esRes ? precioActual <= n.nivel : precioActual >= n.nivel;

                // Re-armar cuando el precio se aleja del nivel
                if (dist > Math.max(margen * 3, 4)) _srEtapa[clave] = 0;

                if (lado && dist <= margen * 3 && (_srEtapa[clave] || 0) < 2) {
                    // — Evidencia a favor / en contra de la ruptura —
                    const favor = [], contra = [];
                    const nombreDir = esRes ? 'alcista' : 'bajista';
                    const net4 = precioActual - (data.at(-4) ?? precioActual);
                    const ult10 = memoriaVelas.slice(-10).map(firmaVela);
                    const pos10 = ult10.filter(c => ['#6ceb52','#ed4ac7','#ffd700'].includes(c)).length;
                    const neg10 = ult10.filter(c => ['#ba1428','#8b0000'].includes(c)).length;
                    const balFavor = esRes ? pos10 - neg10 : neg10 - pos10;

                    if (rachaDir === dirRomp && rachaN >= 2)   favor.push(`racha ${nombreDir} de ${rachaN}`);
                    else if (rachaDir && rachaDir !== dirRomp && rachaN >= 3) contra.push('racha contraria');
                    if (esRes ? iaAlcista : iaBajista)         favor.push('memoria ' + nombreDir);
                    else if (esRes ? iaBajista : iaAlcista)    contra.push('memoria contraria');
                    if (esRes ? markovAlc : markovBaj)         favor.push('Markov ' + nombreDir);
                    else if (esRes ? markovBaj : markovAlc)    contra.push('Markov contrario');
                    if (net4 * signo >= 2)                     favor.push('impulso hacia el nivel');
                    else if (net4 * signo <= -2)               contra.push('impulso en contra');
                    if (balFavor >= 2)                         favor.push(`${esRes ? 'más positivas' : 'más negativas'} en memoria`);
                    else if (balFavor <= -2)                   contra.push('memoria reciente en contra');
                    if (n.toques >= 3)                         favor.push(`nivel tocado ${n.toques} veces (se debilita)`);

                    const probable = favor.length >= 3 && favor.length > contra.length;
                    const rechazo  = contra.length >= 3 && contra.length > favor.length;

                    if (probable) {
                        const razon = favor.slice(0, 3).join(', ');
                        if (dist <= margen) {
                            // TOQUE
                            _srEtapa[clave] = 2;
                            hablar(`Toque en ${n.tipo} ${n.nivel.toFixed(1)}. Alta probabilidad de ruptura.`, true);
                            mostrarMensajeCentralRojo(`⚠️ Toque en ${n.tipo} ${n.nivel.toFixed(1)} — posible ruptura (${razon})`, 7000);
                            playTono(esRes ? 'alcista' : 'bajista'); vibrarSegun('alerta');
                        } else if ((_srEtapa[clave] || 0) < 1 && Math.abs(precioActual - n.nivel) < Math.abs(precioAnterior - n.nivel)) {
                            // SE ACERCA (aviso previo)
                            _srEtapa[clave] = 1;
                            hablar(`Precio se acerca a ${n.tipo} ${n.nivel.toFixed(1)}. Posible ruptura.`, true);
                            mostrarMensajeCentralRojo(`🔔 Se acerca a ${n.tipo} ${n.nivel.toFixed(1)} — posible ruptura (${razon})`, 6000);
                        }
                    }

                    else if (rechazo && dist <= margen && (_srEtapa[clave] || 0) < 2) {
                        // TOQUE con evidencia de que el nivel AGUANTA (rechazo / rebote)
                        _srEtapa[clave] = 2;
                        const razonC = contra.slice(0, 3).join(', ');
                        if (esRes) {
                            hablar(`Toque en resistencia ${n.nivel.toFixed(1)}. Probable rechazo. No operar al alza.`, true);
                            mostrarMensajeCentralRojo(`🛑 Toque en resistencia ${n.nivel.toFixed(1)} — probable rechazo, no operar al alza (${razonC})`, 7000);
                            playTono('bajista'); vibrarSegun('alerta');
                        } else {
                            hablar(`Toque en soporte ${n.nivel.toFixed(1)}. Probable rebote alcista. Esperar vela de confirmación.`, true);
                            mostrarMensajeCentralRojo(`✅ Toque en soporte ${n.nivel.toFixed(1)} — probable rebote alcista (${razonC})`, 7000);
                            playTono('alcista'); vibrarSegun('alerta');
                        }
                    }

                    // Dentro de la zona de toque se omiten los avisos genéricos repetitivos,
                    // pero se deja marcado el estado para que el "rebote confirmado" siga funcionando.
                    if (dist <= margen) {
                        _srAvisoCache[clave] = { estado: esRes ? 'cerca_abajo' : 'cerca_arriba', ts: Date.now() };
                        return;
                    }
                }
            }

            // ── SOPORTE ───────────────────────────────────────────────────
            if (n.tipo === 'soporte') {

                // Cruce hacia abajo: soporte roto → NO OPERAR al alza
                if (precioAnterior >= n.nivel && precioActual < n.nivel - margen * 0.3) {
                    if (_puedeAvisarSR(clave, 'roto_abajo')) {
                        const extras = iaBajista ? ' La memoria histórica confirma presión bajista.' : '';
                        hablar(`Atención. Soporte roto en nivel ${n.nivel.toFixed(1)}. No operar al alza.${extras}`, true);
                        playTono('bajista'); vibrarSegun('fuerte');
                    }
                    return;
                }

                // Precio toca soporte → aviso de entrada con intensidad según toques
                if (dist <= margen && precioActual >= n.nivel) {
                    if (_puedeAvisarSR(clave, 'cerca_arriba')) {

                        // ── Según cuántas veces fue tocado este soporte ──
                        if (n.toques >= 4) {
                            // 4+ toques = soporte muy fuerte → ENTRADA clara
                            if ((iaAlcista || markovAlc) && rachaDir !== 'DOWN') {
                                hablar(`¡Soporte muy fuerte en ${n.nivel.toFixed(1)}! Tocado ${n.toques} veces. La memoria confirma señal alcista. Puedes operar al alza ahora.`, true);
                                playTono('fuerte'); vibrarSegun('fuerte');
                            } else if (iaBajista) {
                                hablar(`Soporte fuerte en ${n.nivel.toFixed(1)}, ${n.toques} toques. Pero la memoria muestra presión bajista. Esperar confirmación antes de entrar.`);
                                playTono('neutro');
                            } else {
                                hablar(`Soporte fuerte en ${n.nivel.toFixed(1)}, tocado ${n.toques} veces. Zona de entrada al alza. Espera una vela alcista para confirmar.`);
                                playTono('alcista');
                            }

                        } else if (n.toques === 3) {
                            // 3 toques = soporte moderado → posible entrada
                            if (iaAlcista || markovAlc) {
                                hablar(`Soporte moderado en ${n.nivel.toFixed(1)}, ${n.toques} toques. La memoria apoya la entrada alcista. Buena oportunidad.`);
                                playTono('alcista');
                            } else {
                                hablar(`Soporte en ${n.nivel.toFixed(1)}, ${n.toques} toques históricos. Posible rebote. Confirmar con la siguiente vela antes de entrar.`);
                            }

                        } else {
                            // 2 toques = soporte débil → atención, no entrar aún
                            if ((iaAlcista || markovAlc) && rachaDir !== 'DOWN') {
                                hablar(`Soporte en ${n.nivel.toFixed(1)}, ${n.toques} toques. La memoria indica posible rebote alcista. Espera confirmación para entrar.`);
                            } else if (iaBajista || (rachaDir === 'DOWN' && rachaN >= 3)) {
                                hablar(`Soporte débil en ${n.nivel.toFixed(1)}, ${n.toques} toques. La memoria muestra presión bajista. No operar aún.`);
                            } else {
                                hablar(`Soporte en ${n.nivel.toFixed(1)}, ${n.toques} toques. Zona de atención. Esperar confirmación alcista antes de entrar.`);
                            }
                        }
                    }
                    return;
                }

                // Rebote confirmado: estaba cerca y ahora subió
                if (_srAvisoCache[clave]?.estado === 'cerca_arriba' && precioActual > n.nivel + margen) {
                    if (_puedeAvisarSR(clave, 'rebote')) {
                        const fuerza = n.toques >= 4 ? '¡Rebote fuerte confirmado!' : 'Rebote confirmado.';
                        hablar(`${fuerza} Desde soporte ${n.nivel.toFixed(1)}. Señal alcista activa. Puedes operar al alza.`);
                        playTono('fuerte'); vibrarSegun('fuerte');
                    }
                }
            }

            // ── RESISTENCIA ───────────────────────────────────────────────
            if (n.tipo === 'resistencia') {

                // Cruce hacia arriba: resistencia rota → posible entrada alcista fuerte
                if (precioAnterior <= n.nivel && precioActual > n.nivel + margen * 0.3) {
                    if (_puedeAvisarSR(clave, 'rota_arriba')) {
                        const extras = iaAlcista ? ' La memoria histórica apoya el movimiento alcista.' : '';
                        hablar(`Resistencia rota en ${n.nivel.toFixed(1)}.${extras} Posible entrada alcista fuerte.`, true);
                        playTono('fuerte'); vibrarSegun('fuerte');
                    }
                    return;
                }

                // Precio cerca de resistencia → aviso con intensidad según toques
                if (dist <= margen && precioActual <= n.nivel) {
                    if (_puedeAvisarSR(clave, 'cerca_abajo')) {

                        if (n.toques >= 4) {
                            // 4+ toques = resistencia muy fuerte → NO operar al alza
                            if (iaBajista || markovBaj || (rachaDir === 'UP' && rachaN >= 3)) {
                                hablar(`¡Resistencia muy fuerte en ${n.nivel.toFixed(1)}! Tocada ${n.toques} veces. La memoria confirma rechazo. No operar al alza. Posible entrada bajista.`, true);
                                playTono('bajista'); vibrarSegun('fuerte');
                            } else {
                                hablar(`Resistencia fuerte en ${n.nivel.toFixed(1)}, ${n.toques} toques. Zona de peligro alcista. No operar al alza hasta que la rompa.`);
                                playTono('bajista');
                            }

                        } else if (n.toques === 3) {
                            if (iaBajista || markovBaj) {
                                hablar(`Resistencia en ${n.nivel.toFixed(1)}, ${n.toques} toques. La memoria indica rechazo probable. No operar al alza ahora.`);
                                playTono('bajista');
                            } else if (iaAlcista && markovAlc) {
                                hablar(`Resistencia en ${n.nivel.toFixed(1)}, ${n.toques} toques. La memoria muestra impulso alcista. Vigilar si la rompe para entrar.`);
                            } else {
                                hablar(`Resistencia en ${n.nivel.toFixed(1)}, ${n.toques} toques. Esperar. No operar hasta confirmar dirección.`);
                            }

                        } else {
                            hablar(`Resistencia detectada en ${n.nivel.toFixed(1)}, ${n.toques} toques. Precaución. Esperar confirmación antes de operar.`);
                        }
                    }
                    return;
                }

                // Rebote bajista confirmado desde resistencia
                if (_srAvisoCache[clave]?.estado === 'cerca_abajo' && precioActual < n.nivel - margen) {
                    if (_puedeAvisarSR(clave, 'rebote_baj')) {
                        const fuerza = n.toques >= 4 ? '¡Rebote bajista fuerte confirmado!' : 'Rebote bajista confirmado.';
                        hablar(`${fuerza} Desde resistencia ${n.nivel.toFixed(1)}. No operar al alza.`);
                        playTono('bajista'); vibrarSegun('debil');
                    }
                }
            }

            // ── ZONA CERO ─────────────────────────────────────────────────
            if (n.tipo === 'zona_cero') {
                if (dist <= margen) {
                    if (_puedeAvisarSR(clave, 'zona_cero')) {
                        const dir = iaAlcista ? 'alcista. Puedes operar al alza.' : iaBajista ? 'bajista. Evitar entrada al alza.' : 'sin dirección clara. Esperar confirmación.';
                        hablar(`Precio en zona cero. La memoria histórica indica sesgo ${dir}`);
                    }
                }
            }
        });
    }

    drawChart();
    drawCandlestickChart();
    updateSignalMessage();

        // === Reloj (actualización de hora) ===
    setInterval(() => {
      document.getElementById('time').textContent = new Date().toLocaleTimeString('es-ES', { hour12: false });
    }, 1000);

    // === CONTADOR DE TENDENCIA GENERAL ===
    let buenas = 0, malas = 0;
    const relojContenedor = document.querySelector('.reloj-control'); // Contenedor del reloj

    function actualizarTendenciaGeneral() {
      if (!relojContenedor) return;
      const total = buenas + malas;

      // limpiar clases previas
      relojContenedor.classList.remove('tendencia-alcista', 'tendencia-bajista', 'tendencia-estable');

      if (total === 0) {
        relojContenedor.classList.add('tendencia-estable');
      } else if (buenas > malas) {
        relojContenedor.classList.add('tendencia-alcista');
      } else if (malas > buenas) {
        relojContenedor.classList.add('tendencia-bajista');
      } else {
        relojContenedor.classList.add('tendencia-estable');
      }
    }

    // Registrar resultados de velas buenas/malas
    function registrarResultado(esBuena) {
      if (esBuena) buenas++;
      else malas++;
      actualizarTendenciaGeneral();
    }

    // === Integrar el contador con las velas automáticas ===
    const oldAddCandleAuto = addCandleAuto;
    addCandleAuto = function(v, color) {
      oldAddCandleAuto(v, color);

      if (color.includes("6ceb52") || color.includes("ed4ac7") || color.includes("ffd700")) {
        registrarResultado(true); // Alcista
      } else if (color.includes("ba1428") || color.includes("8b0000")) {
        registrarResultado(false); // Bajista
      }
    };

    // Reiniciar tendencias al presionar botón Reset del panel de velas
    document.getElementById('btn4').addEventListener('click', () => {
      buenas = 0;
      malas = 0;
      actualizarTendenciaGeneral();
    });

    // ===================== 🧠 MEMORIA IA DEL MERCADO =====================
    // Memoria histórica de velas y patrones (ventana de 1 hora, con tope de
    // 500 velas / 1000 patrones). Persiste entre recargas usando localStorage,
    // y permite calcular cuántas veces apareció cada patrón y con qué
    // resultado (alcista/bajista) se resolvió la vela siguiente.

    const MEMORIA_CONFIG = {
        maxVelas: 500,
        maxPatrones: 1000,
        ventanaMs: 60 * 60 * 1000 // 1 hora
    };

    function cargarMemoria(clave) {
        try {
            const raw = localStorage.getItem(clave);
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    }

    let memoriaVelas = cargarMemoria('masaniello_memoriaVelas');
    let memoriaPatrones = cargarMemoria('masaniello_memoriaPatrones');
    let patronesPendientes = [];

    function guardarMemoria() {
        try {
            localStorage.setItem('masaniello_memoriaVelas', JSON.stringify(memoriaVelas));
            localStorage.setItem('masaniello_memoriaPatrones', JSON.stringify(memoriaPatrones));
        } catch (e) { console.warn('No se pudo guardar la Memoria IA:', e); }
    }

    function podarMemoria() {
        const corte = Date.now() - MEMORIA_CONFIG.ventanaMs;
        memoriaVelas = memoriaVelas.filter(v => v.t >= corte);
        memoriaPatrones = memoriaPatrones.filter(p => p.t >= corte);
        if (memoriaVelas.length > MEMORIA_CONFIG.maxVelas) memoriaVelas = memoriaVelas.slice(-MEMORIA_CONFIG.maxVelas);
        if (memoriaPatrones.length > MEMORIA_CONFIG.maxPatrones) memoriaPatrones = memoriaPatrones.slice(-MEMORIA_CONFIG.maxPatrones);
    }

    // Convierte una vela en una "firma" para poder comparar figuras del
    // gráfico entre sí. Usa el color real del botón cuando está disponible
    // (lo normal), y si la vela es de una sesión vieja sin color guardado,
    // recurre a dirección + tamaño de cuerpo como respaldo.
    function firmaVela(c) {
        if (c.color) return c.color;
        const dir = c.close > c.open ? 'U' : c.close < c.open ? 'D' : 'F';
        const tam = Math.round(bodySize(c) / 0.4);
        return dir + tam;
    }

    // Busca secuencias de N velas que se repiten dentro de la memoria.
    function detectarFigurasRepetidas(ventana = 3, minimo = 2) {
        const conteos = {};
        for (let i = 0; i <= memoriaVelas.length - ventana; i++) {
            const seq = memoriaVelas.slice(i, i + ventana).map(firmaVela).join('-');
            conteos[seq] = (conteos[seq] || 0) + 1;
        }
        return Object.entries(conteos)
            .filter(([, n]) => n >= minimo)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);
    }

    // Cuenta cuántas veces apareció cada patrón y con qué resultado
    // (dirección de la vela que vino justo después) se resolvió.
    function calcularEstadisticasPatrones() {
        const stats = {};
        memoriaPatrones.forEach(p => {
            if (!p.dir) return;
            if (!stats[p.nombre]) stats[p.nombre] = { total: 0, up: 0, down: 0 };
            stats[p.nombre].total++;
            if (p.dir === 'UP') stats[p.nombre].up++;
            else if (p.dir === 'DOWN') stats[p.nombre].down++;
        });
        return stats;
    }

    function nombreCortoPatron(texto) {
        const corte = texto.split('→')[0].trim();
        return corte.length > 38 ? corte.slice(0, 38) + '…' : corte;
    }

    // Nombres legibles para los colores de botón usados en las velas
    const NOMBRES_COLOR = {
        '#ba1428': '🔴 Roja débil',
        '#8b0000': '🍷 Roja vino',
        '#6ceb52': '🟩 Verde',
        '#ed4ac7': '🩷 Rosa',
        '#ffd700': '💛 Dorado'
    };

    // Convierte una firma de figura (ej: "#6ceb52-#ba1428-#ffd700") en una
    // hilera de puntitos con el color real de cada vela, para mostrarla en
    // el panel en vez del código abstracto.
    function renderizarSecuenciaFiguras(sig) {
        return sig.split('-').map(token => {
            if (token.startsWith('#')) {
                const titulo = NOMBRES_COLOR[token] || token;
                return `<span class="figura-dot" style="background:${token}" title="${titulo}"></span>`;
            }
            // Respaldo para velas viejas sin color guardado
            return `<span class="figura-dot figura-dot-na" title="Dato antiguo sin color">${token}</span>`;
        }).join('');
    }

    // Mira la figura de las últimas N velas y, entre todas las veces
    // anteriores que esa MISMA figura apareció en la memoria, qué color de
    // vela vino justo después con más frecuencia.
    function obtenerColorPredichoParaFigura(ventana = 3) {
        if (memoriaVelas.length < ventana + 1) return null;
        const actual = memoriaVelas.slice(-ventana).map(firmaVela).join('-');
        const colorCount = {};
        // recorremos sin incluir la ocurrencia actual (la última)
        for (let i = 0; i <= memoriaVelas.length - ventana - 1; i++) {
            const seq = memoriaVelas.slice(i, i + ventana).map(firmaVela).join('-');
            if (seq === actual) {
                const siguiente = memoriaVelas[i + ventana];
                if (siguiente && siguiente.color) {
                    colorCount[siguiente.color] = (colorCount[siguiente.color] || 0) + 1;
                }
            }
        }
        const entradas = Object.entries(colorCount).sort((a, b) => b[1] - a[1]);
        if (entradas.length === 0) return null;
        const [colorGanador, veces] = entradas[0];
        const total = entradas.reduce((acc, [, n]) => acc + n, 0);
        return { color: colorGanador, veces, total, prob: (veces / total) * 100, firma: actual };
    }

    // Muestra un aviso en pantalla, con el color sugerido, cuando la figura
    // actual ya se repitió antes en la memoria.
    function evaluarAvisoFiguraRepetida(ventana = 3, minimoRepeticiones = 2) {
        const aviso = document.getElementById('aviso-figura-repetida');
        if (!aviso) return;

        if (memoriaVelas.length < ventana + minimoRepeticiones) {
            aviso.classList.remove('visible');
            return;
        }

        const figurasRepetidas = detectarFigurasRepetidas(ventana, minimoRepeticiones);
        const actual = memoriaVelas.slice(-ventana).map(firmaVela).join('-');
        const coincide = figurasRepetidas.find(([sig]) => sig === actual);
        if (!coincide) {
            aviso.classList.remove('visible');
            return;
        }

        const prediccion = obtenerColorPredichoParaFigura(ventana);
        if (!prediccion) {
            aviso.classList.remove('visible');
            return;
        }

        const nombreColor = NOMBRES_COLOR[prediccion.color] || 'color indefinido';
        const confianza = Math.round((prediccion.veces / prediccion.total) * 100);

        aviso.textContent = `🔁 Figura de ${ventana} velas repetida ×${coincide[1]} — según la memoria, viene: ${nombreColor} (${confianza}% de las veces)`;
        aviso.style.background = prediccion.color + 'dd';
        aviso.style.boxShadow = `0 0 25px ${prediccion.color}`;
        aviso.style.color = (prediccion.color === '#ffd700') ? '#111' : '#fff';
        aviso.classList.add('visible');

        hablar(`Figura repetida. Posible color ${nombreColor.replace(/[🔴🍷🟩🩷💛]/g,'').trim()}. Confianza ${confianza} por ciento.`);
        playBeep(150, 700, 0.15);

        clearTimeout(aviso._timeout);
        aviso._timeout = setTimeout(() => aviso.classList.remove('visible'), 6000);
    }

    // Pinta una lista de figuras repetidas (con puntos de color) dentro del <ul> dado
    function renderizarListaFiguras(elementoUl, ventana, minimo = 2) {
        if (!elementoUl) return;
        elementoUl.innerHTML = '';
        const figuras = detectarFigurasRepetidas(ventana, minimo);
        if (figuras.length === 0) {
            elementoUl.innerHTML = '<li class="figura-vacia">Sin secuencias repetidas aún…</li>';
            return;
        }
        figuras.forEach(([sig, n]) => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="figura-secuencia">${renderizarSecuenciaFiguras(sig)}</span><span class="figura-veces">${n}×</span>`;
            elementoUl.appendChild(li);
        });
    }

    function actualizarPanelMemoriaIA() {
        const elVelas = document.getElementById('mem-candle-count');
        const elPatrones = document.getElementById('mem-pattern-count');
        const elProbUp = document.getElementById('mem-prob-up');
        const elProbDown = document.getElementById('mem-prob-down');
        if (!elVelas) return;

        elVelas.textContent = memoriaVelas.length;
        elPatrones.textContent = memoriaPatrones.length;

        const stats = calcularEstadisticasPatrones();
        let totalUp = 0, totalDown = 0, totalResueltos = 0;

        Object.entries(stats)
            .sort((a, b) => b[1].total - a[1].total)
            .forEach(([nombre, s]) => {
                totalUp += s.up; totalDown += s.down; totalResueltos += s.total;
            });

        if (elProbUp) elProbUp.textContent = totalResueltos ? Math.round((totalUp / totalResueltos) * 100) + '%' : '--%';
        if (elProbDown) elProbDown.textContent = totalResueltos ? Math.round((totalDown / totalResueltos) * 100) + '%' : '--%';

    }

    function registrarVelaEnMemoria(candle, color) {
        memoriaVelas.push({ open: candle.open, close: candle.close, high: candle.high, low: candle.low, color: color || null, t: Date.now() });
        podarMemoria();
        guardarMemoria();
    }

    // Resuelve los patrones detectados en la vela anterior usando la
    // dirección de la vela que acaba de cerrar, y los guarda en la memoria.
    function registrarPatronesEnMemoria(direccionResultante) {
        if (patronesPendientes.length > 0 && direccionResultante) {
            const t = Date.now();
            patronesPendientes.forEach(nombre => {
                memoriaPatrones.push({ nombre, dir: direccionResultante, t });
            });
        }
        podarMemoria();
        guardarMemoria();
        actualizarPanelMemoriaIA();
    }

    // === Conectar la Memoria IA al ciclo de velas ===
    const addCandleAntesDeMemoria = addCandleAuto;
    addCandleAuto = function(v, color) {
        addCandleAntesDeMemoria(v, color);

        const ultimaVela = candles[candles.length - 1];
        if (ultimaVela) {
            // 1) La vela recién cerrada resuelve los patrones pendientes de la vela anterior
            const dirResultante = direction(ultimaVela);
            registrarPatronesEnMemoria(dirResultante);
            // 2) Esa misma vela (con su color) se guarda en la memoria histórica
            registrarVelaEnMemoria(ultimaVela, color);
            // 3) Se detectan los patrones vigentes ahora, para resolverlos con la próxima vela
            try { patronesPendientes = checkPatterns(); } catch (e) { patronesPendientes = []; }
            // 4) Si la figura actual ya se repitió antes, avisar en pantalla con el color sugerido
            try {
                const act5 = memoriaVelas.slice(-5).map(firmaVela).join('-');
                const hay5 = memoriaVelas.length >= 7 && detectarFigurasRepetidas(5, 2).some(([sig]) => sig === act5);
                evaluarAvisoFiguraRepetida(hay5 ? 5 : 3);
            } catch (e) { console.warn('Error evaluando aviso de figura:', e); }
            // Voz inteligente — solo cuando hay algo relevante
            try { evaluarVozTendencia(); }                 catch (e) {}
            try { evaluarVozFigurasRepetidas(); }          catch (e) {}
            try { evaluarVozSoporteResistencia(); }        catch (e) {}
        }
    };

    document.getElementById('btn-reset-memoria')?.addEventListener('click', () => {
        memoriaVelas = [];
        memoriaPatrones = [];
        patronesPendientes = [];
        guardarMemoria();
        actualizarPanelMemoriaIA();
        document.getElementById('aviso-figura-repetida')?.classList.remove('visible');
    });

    // Pintar el panel con lo que ya hubiera guardado de sesiones anteriores
    podarMemoria();
    actualizarPanelMemoriaIA();

    // =====================================================================
    // 🚀 MÓDULO DE ALGORITMOS AVANZADOS
    // =====================================================================

    // ─── 1. SONIDOS DIFERENCIADOS POR TIPO DE SEÑAL ──────────────────────
    function playTono(tipo) {
        const map = {
            alcista: [600, 160, 0.15],
            bajista: [280, 160, 0.15],
            fuerte:  [900, 80,  0.2 ],
            racha:   [440, 420, 0.1 ],
            neutro:  [500, 100, 0.08],
        };
        const [freq, dur, vol] = map[tipo] || [500, 120, 0.1];
        playBeep(dur, freq, vol);
        if (tipo === 'fuerte') setTimeout(() => playBeep(80, 900, 0.2), 140);
    }

    // ─── 2. VIBRACIÓN EN MÓVIL ───────────────────────────────────────────
    function vibrarSegun(tipo) {
        if (!navigator.vibrate) return;
        const patrones = {
            debil:  [100],
            fuerte: [200, 100, 200],
            racha:  [400],
            alerta: [100, 50, 100, 50, 300],
        };
        navigator.vibrate(patrones[tipo] || [100]);
    }

    // ─── 3. NOTIFICACIONES DEL NAVEGADOR ─────────────────────────────────
    async function notificarSistema(titulo, cuerpo) {
        try {
            if (Notification.permission === 'default') await Notification.requestPermission();
            if (Notification.permission === 'granted') {
                new Notification(titulo, { body: cuerpo, silent: false });
            }
        } catch (e) { console.warn('Notif error:', e); }
    }

    // ─── 4. EMA (Media Exponencial Móvil) ────────────────────────────────
    function calcEma(arr, n) {
        if (arr.length < n) return [];
        const k = 2 / (n + 1);
        return arr.reduce((acc, v, i) => {
            acc.push(i === 0 ? v : v * k + acc[i - 1] * (1 - k));
            return acc;
        }, []);
    }

    function pattern_ema() {
        if (data.length < 13) return '';
        const ema5  = calcEma(data, 5);
        const ema12 = calcEma(data, 12);
        if (ema5.length < 2 || ema12.length < 2) return '';
        const cruce_alcista = ema5.at(-2) <= ema12.at(-2) && ema5.at(-1) > ema12.at(-1);
        const cruce_bajista = ema5.at(-2) >= ema12.at(-2) && ema5.at(-1) < ema12.at(-1);
        if (cruce_alcista) return '📈 Cruce EMA alcista (rápida cruza lenta hacia arriba)';
        if (cruce_bajista) return '📉 Cruce EMA bajista (rápida cruza lenta hacia abajo)';
        return '';
    }

    // ─── 5. RSI (7 velas) ────────────────────────────────────────────────
    function calcRsi(n = 7) {
        if (candles.length < n + 1) return 50;
        const slice = candles.slice(-(n + 1));
        let gains = 0, losses = 0;
        for (let i = 1; i < slice.length; i++) {
            const d = slice[i].close - slice[i - 1].close;
            if (d > 0) gains += d; else losses -= d;
        }
        const rs = gains / (losses || 0.001);
        return 100 - 100 / (1 + rs);
    }

    function pattern_rsi() {
        if (candles.length < 8) return '';
        const rsi = calcRsi(7);
        if (rsi < 25) return `⚡ RSI ${rsi.toFixed(0)} — Zona de sobreventa fuerte (posible rebote)`;
        if (rsi < 35) return `🟡 RSI ${rsi.toFixed(0)} — Sobreventa moderada`;
        if (rsi > 75) return `⚠️ RSI ${rsi.toFixed(0)} — Zona de sobrecompra fuerte (posible caída)`;
        if (rsi > 65) return `🟡 RSI ${rsi.toFixed(0)} — Sobrecompra moderada`;
        return '';
    }

    // ─── 6. BANDAS DE BOLLINGER ───────────────────────────────────────────
    function calcBollinger(n = 10, k = 2) {
        if (data.length < n) return null;
        const slice = data.slice(-n);
        const mean = slice.reduce((a, v) => a + v, 0) / n;
        const std  = Math.sqrt(slice.reduce((a, v) => a + (v - mean) ** 2, 0) / n);
        return { upper: mean + k * std, lower: mean - k * std, mean };
    }

    function pattern_bollinger() {
        if (data.length < 11) return '';
        const b = calcBollinger();
        if (!b) return '';
        const last = data.at(-1);
        const prev = data.at(-2);
        if (prev >= b.upper && last < b.upper) return '🔔 Bollinger: precio rompe banda superior hacia adentro → posible reversión bajista';
        if (prev <= b.lower && last > b.lower) return '🔔 Bollinger: precio rompe banda inferior hacia adentro → posible reversión alcista';
        if (last > b.upper) return '⬆️ Bollinger: precio por encima de banda superior';
        if (last < b.lower) return '⬇️ Bollinger: precio por debajo de banda inferior';
        return '';
    }

    // ─── 7. VELA ENVOLVENTE (ENGULFING) ──────────────────────────────────
    function pattern_engulfing() {
        if (candles.length < 2) return '';
        const c1 = candles.at(-2), c2 = candles.at(-1);
        const bullEngulf = direction(c1) === 'DOWN' && direction(c2) === 'UP'
            && c2.open <= c1.close && c2.close >= c1.open;
        const bearEngulf = direction(c1) === 'UP' && direction(c2) === 'DOWN'
            && c2.open >= c1.close && c2.close <= c1.open;
        if (bullEngulf) return '🕯️ Vela envolvente alcista — fuerte reversión al alza';
        if (bearEngulf) return '🕯️ Vela envolvente bajista — fuerte reversión a la baja';
        return '';
    }

    // ─── 8. DOJI (INDECISIÓN) ────────────────────────────────────────────
    function pattern_doji() {
        if (candles.length < 1) return '';
        const c = candles.at(-1);
        if (bodySize(c) < 0.15) {
            const v = data.at(-1);
            if (Math.abs(v) <= 1) return '⚪ Doji en zona 0 — indecisión máxima, esperar confirmación';
            return `⚪ Doji detectado — mercado indeciso en nivel ${v.toFixed(1)}`;
        }
        return '';
    }

    // ─── 9. DETECTOR DE RACHA ────────────────────────────────────────────
    function calcRacha() {
        if (candles.length < 2) return { n: 0, dir: null };
        const d = direction(candles.at(-1));
        let n = 1;
        for (let i = candles.length - 2; i >= 0; i--) {
            if (direction(candles[i]) === d) n++;
            else break;
        }
        return { n, dir: d };
    }

    function pattern_racha() {
        const { n, dir } = calcRacha();
        if (n < 3) return '';
        if (dir === 'UP')   return `🔥 Racha alcista de ${n} velas consecutivas — posible agotamiento`;
        if (dir === 'DOWN') return `🔥 Racha bajista de ${n} velas consecutivas — posible rebote`;
        return '';
    }

    // ─── 10. MACD SIMPLIFICADO ────────────────────────────────────────────
    function pattern_macd() {
        if (data.length < 27) return '';
        const e12 = calcEma(data, 12);
        const e26 = calcEma(data, 26);
        if (e12.length < 2 || e26.length < 2) return '';
        const m = e12.map((v, i) => v - e26[i]);
        const prev = m.at(-2), curr = m.at(-1);
        if (prev < 0 && curr >= 0) return '🟣 MACD: cruce alcista (línea cruza cero al alza)';
        if (prev > 0 && curr <= 0) return '🟣 MACD: cruce bajista (línea cruza cero a la baja)';
        return '';
    }

    // ─── 11. SCORE DE CONFIANZA (0–100) ──────────────────────────────────
    function calcScore(patrones, rsiVal, probHistorica) {
        let score = 0;
        score += Math.min(patrones.length * 15, 40);
        score += probHistorica > 60 ? 30 : probHistorica > 45 ? 15 : 0;
        if (rsiVal < 35 || rsiVal > 65) score += 30;
        else if (rsiVal < 45 || rsiVal > 55) score += 15;
        else score += 5;
        return Math.min(Math.round(score), 100);
    }

    // ─── 12. CADENA DE MARKOV (probabilidad por transición de color) ──────
    function calcMarkov() {
        const trans = {};
        for (let i = 0; i < memoriaVelas.length - 1; i++) {
            const de = memoriaVelas[i].color;
            const a  = memoriaVelas[i + 1].color;
            if (!de || !a) continue;
            if (!trans[de]) trans[de] = {};
            trans[de][a] = (trans[de][a] || 0) + 1;
        }
        return Object.fromEntries(
            Object.entries(trans).map(([de, dest]) => {
                const tot = Object.values(dest).reduce((s, v) => s + v, 0);
                return [de, Object.fromEntries(
                    Object.entries(dest).map(([a, n]) => [a, +(n / tot * 100).toFixed(1)])
                )];
            })
        );
    }

    function prediccionMarkov() {
        if (memoriaVelas.length < 5) return null;
        const colorActual = memoriaVelas.at(-1)?.color;
        if (!colorActual) return null;
        const markov = calcMarkov();
        const dest   = markov[colorActual];
        if (!dest) return null;
        const [mejorColor, prob] = Object.entries(dest).sort((a, b) => b[1] - a[1])[0];
        return { colorActual, mejorColor, prob };
    }

    // ─── 13. ESTADÍSTICAS POR VENTANA DE TIEMPO ──────────────────────────
    function statsVentana(ms) {
        const corte  = Date.now() - ms;
        const velas  = memoriaVelas.filter(v => v.t >= corte);
        const alc    = velas.filter(v => ['#6ceb52','#ed4ac7','#ffd700'].includes(v.color)).length;
        const baj    = velas.filter(v => ['#ba1428','#8b0000'].includes(v.color)).length;
        return { alcistas: alc, bajistas: baj, total: velas.length };
    }

    // ─── 14. REGRESIÓN LINEAL (línea de tendencia automática) ────────────
    function calcRegresion(arr) {
        if (arr.length < 2) return null;
        const n  = arr.length;
        const mx = arr.reduce((a, _, i) => a + i, 0) / n;
        const my = arr.reduce((a, v) => a + v, 0) / n;
        const m  = arr.reduce((a, v, i) => a + (i - mx) * (v - my), 0)
                 / arr.reduce((a, _, i) => a + (i - mx) ** 2, 0.001);
        const b  = my - m * mx;
        return { m, b };
    }

    // ─── 15. PANEL DE INDICADORES AVANZADOS ──────────────────────────────
    // Crear el panel en el DOM
    (function crearPanelIndicadores() {
        const panel = document.createElement('div');
        panel.id = 'panel-indicadores';
        panel.innerHTML = `
            <h3>📊 Indicadores en Tiempo Real</h3>
            <div class="ind-grid">
                <div class="ind-card" id="ind-rsi">
                    <span class="ind-label">RSI (7)</span>
                    <strong class="ind-valor" id="val-rsi">—</strong>
                    <span class="ind-sub" id="sub-rsi">Sin datos</span>
                </div>
                <div class="ind-card" id="ind-ema">
                    <span class="ind-label">EMA 5 / 12</span>
                    <strong class="ind-valor" id="val-ema">—</strong>
                    <span class="ind-sub" id="sub-ema">Sin datos</span>
                </div>
                <div class="ind-card" id="ind-boll">
                    <span class="ind-label">Bollinger</span>
                    <strong class="ind-valor" id="val-boll">—</strong>
                    <span class="ind-sub" id="sub-boll">Sin datos</span>
                </div>
                <div class="ind-card" id="ind-racha">
                    <span class="ind-label">Racha</span>
                    <strong class="ind-valor" id="val-racha">—</strong>
                    <span class="ind-sub" id="sub-racha">Sin datos</span>
                </div>
                <div class="ind-card" id="ind-score">
                    <span class="ind-label">Score Señal</span>
                    <strong class="ind-valor" id="val-score">—</strong>
                    <div class="score-bar-wrap"><div class="score-bar" id="score-bar"></div></div>
                </div>
                <div class="ind-card" id="ind-markov">
                    <span class="ind-label">Markov — próximo</span>
                    <strong class="ind-valor" id="val-markov">—</strong>
                    <span class="ind-sub" id="sub-markov">Sin historial</span>
                </div>
                <div class="ind-card ind-wide" id="ind-ventanas">
                    <span class="ind-label">Actividad por ventana</span>
                    <div class="ventana-row">
                        <span>15 min:</span>
                        <strong id="v15-alc" class="prob-up">0↑</strong>
                        <strong id="v15-baj" class="prob-down">0↓</strong>
                        <span style="margin-left:12px">1 hora:</span>
                        <strong id="v1h-alc" class="prob-up">0↑</strong>
                        <strong id="v1h-baj" class="prob-down">0↓</strong>
                    </div>
                </div>
                <div class="ind-card ind-wide" id="ind-macd">
                    <span class="ind-label">MACD (EMA12 − EMA26)</span>
                    <strong class="ind-valor" id="val-macd">—</strong>
                    <span class="ind-sub" id="sub-macd">Necesita 27 velas</span>
                </div>
            </div>`;

        // Insertar antes del panel de memoria IA
        const memPanel = document.getElementById('panel-memoria-ia');
        if (memPanel) memPanel.parentNode.insertBefore(panel, memPanel);
        else document.body.appendChild(panel);
    })();

    // Actualizar todos los indicadores del panel
    function actualizarIndicadores() {
        if (!document.getElementById('val-rsi')) return;

        // RSI
        const rsi = calcRsi(7);
        const elRsi = document.getElementById('val-rsi');
        const subRsi = document.getElementById('sub-rsi');
        const indRsi = document.getElementById('ind-rsi');
        elRsi.textContent = rsi.toFixed(0);
        indRsi.classList.remove('ind-up','ind-down','ind-warn');
        if (rsi < 30)      { subRsi.textContent='Sobreventa fuerte'; indRsi.classList.add('ind-up'); }
        else if (rsi < 40) { subRsi.textContent='Sobreventa'; indRsi.classList.add('ind-up'); }
        else if (rsi > 70) { subRsi.textContent='Sobrecompra fuerte'; indRsi.classList.add('ind-down'); }
        else if (rsi > 60) { subRsi.textContent='Sobrecompra'; indRsi.classList.add('ind-down'); }
        else               { subRsi.textContent='Zona neutral'; indRsi.classList.add('ind-warn'); }

        // EMA
        const elEma = document.getElementById('val-ema');
        const subEma = document.getElementById('sub-ema');
        const indEma = document.getElementById('ind-ema');
        indEma.classList.remove('ind-up','ind-down','ind-warn');
        if (data.length >= 13) {
            const ema5 = calcEma(data, 5), ema12 = calcEma(data, 12);
            const diff = (ema5.at(-1) - ema12.at(-1)).toFixed(2);
            elEma.textContent = (diff > 0 ? '+' : '') + diff;
            if (parseFloat(diff) > 0) { subEma.textContent='EMA5 > EMA12 (alcista)'; indEma.classList.add('ind-up'); }
            else { subEma.textContent='EMA5 < EMA12 (bajista)'; indEma.classList.add('ind-down'); }
        } else { elEma.textContent='—'; subEma.textContent='Necesita 13 pts'; indEma.classList.add('ind-warn'); }

        // Bollinger
        const elBoll = document.getElementById('val-boll');
        const subBoll = document.getElementById('sub-boll');
        const indBoll = document.getElementById('ind-boll');
        indBoll.classList.remove('ind-up','ind-down','ind-warn');
        const b = calcBollinger();
        if (b && data.length > 0) {
            const last = data.at(-1);
            const pos = ((last - b.lower) / (b.upper - b.lower) * 100).toFixed(0);
            elBoll.textContent = pos + '%';
            if (last > b.upper)      { subBoll.textContent='Por encima de banda sup.'; indBoll.classList.add('ind-down'); }
            else if (last < b.lower) { subBoll.textContent='Por debajo de banda inf.'; indBoll.classList.add('ind-up'); }
            else                     { subBoll.textContent=`Dentro de bandas (${pos}%)`; indBoll.classList.add('ind-warn'); }
        } else { elBoll.textContent='—'; subBoll.textContent='Necesita 10 pts'; indBoll.classList.add('ind-warn'); }

        // Racha
        const { n, dir } = calcRacha();
        const elRacha = document.getElementById('val-racha');
        const subRacha = document.getElementById('sub-racha');
        const indRacha = document.getElementById('ind-racha');
        indRacha.classList.remove('ind-up','ind-down','ind-warn');
        elRacha.textContent = n + 'x';
        if (dir === 'UP')   { subRacha.textContent=`${n} alcistas seguidas`; indRacha.classList.add(n>=3?'ind-down':'ind-up'); }
        else if (dir==='DOWN') { subRacha.textContent=`${n} bajistas seguidas`; indRacha.classList.add(n>=3?'ind-up':'ind-down'); }
        else               { subRacha.textContent='Estable'; indRacha.classList.add('ind-warn'); }

        // Score
        const patActivos = checkPatterns();
        const probIA = (() => {
            const s = calcularEstadisticasPatrones();
            const vals = Object.values(s);
            if (!vals.length) return 50;
            const tot = vals.reduce((a,v)=>a+v.total,0)||1;
            const up  = vals.reduce((a,v)=>a+v.up,0);
            return Math.round(up/tot*100);
        })();
        const score = calcScore(patActivos, rsi, probIA);
        document.getElementById('val-score').textContent = score + '/100';
        const bar = document.getElementById('score-bar');
        bar.style.width = score + '%';
        bar.style.background = score >= 70 ? '#00ff80' : score >= 45 ? '#ffd700' : '#ff5050';

        // Markov
        const pred = prediccionMarkov();
        const elMark = document.getElementById('val-markov');
        const subMark = document.getElementById('sub-markov');
        if (pred) {
            const nombre = NOMBRES_COLOR[pred.mejorColor] || pred.mejorColor;
            elMark.textContent = nombre;
            elMark.style.color = pred.mejorColor === '#ffd700' ? '#ffd700' : pred.mejorColor;
            subMark.textContent = `Probabilidad: ${pred.prob.toFixed(1)}%`;
        } else { elMark.textContent='—'; subMark.textContent='Sin historial'; }

        // Ventanas de tiempo
        const v15 = statsVentana(15 * 60 * 1000);
        const v1h = statsVentana(60 * 60 * 1000);
        document.getElementById('v15-alc').textContent = v15.alcistas + '↑';
        document.getElementById('v15-baj').textContent = v15.bajistas + '↓';
        document.getElementById('v1h-alc').textContent = v1h.alcistas + '↑';
        document.getElementById('v1h-baj').textContent = v1h.bajistas + '↓';

        // MACD
        const elMacd = document.getElementById('val-macd');
        const subMacd = document.getElementById('sub-macd');
        const indMacd = document.getElementById('ind-macd');
        indMacd.classList.remove('ind-up','ind-down','ind-warn');
        if (data.length >= 27) {
            const e12 = calcEma(data, 12), e26 = calcEma(data, 26);
            const linea = (e12.at(-1) - e26.at(-1)).toFixed(2);
            elMacd.textContent = (linea > 0 ? '+' : '') + linea;
            if (parseFloat(linea) > 0) { subMacd.textContent='Por encima de cero (alcista)'; indMacd.classList.add('ind-up'); }
            else                       { subMacd.textContent='Por debajo de cero (bajista)'; indMacd.classList.add('ind-down'); }
        } else { elMacd.textContent='—'; subMacd.textContent=`Necesita 27 pts (tienes ${data.length})`; indMacd.classList.add('ind-warn'); }
    }

    // ─── Añadir nuevos patrones al checkPatterns existente ───────────────
    const _checkPatternsOriginal = checkPatterns;
    // Sobreescribir checkPatterns para incluir los nuevos algoritmos
    checkPatterns = function () {
        const lista = _checkPatternsOriginal();
        for (const fn of [pattern_ema, pattern_rsi, pattern_bollinger,
                          pattern_engulfing, pattern_doji, pattern_racha, pattern_macd]) {
            try { const r = fn(); if (r) lista.push(r); } catch (e) { /* ignorar */ }
        }
        return lista;
    };

    // ─── Enganchar indicadores al ciclo de velas ─────────────────────────
    const _addCandleFinal = addCandleAuto;
    addCandleAuto = function (v, color) {
        _addCandleFinal(v, color);
        try {
            actualizarIndicadores();

            // Sonido según dirección dominante de la vela
            const tipo = ['#6ceb52','#ed4ac7','#ffd700'].includes(color) ? 'alcista' : 'bajista';
            const { n } = calcRacha();
            if (n >= 4) {
                playTono('racha');
                vibrarSegun('racha');
                hablar(`Alerta, racha de ${n} velas consecutivas. Posible cambio de tendencia.`);
            }

            // Notificación del sistema si el score es muy alto
            const patActivos = checkPatterns();
            const rsiAhora = calcRsi(7);
            const probGlobal = (() => {
                const s = calcularEstadisticasPatrones();
                const v2 = Object.values(s);
                if (!v2.length) return 50;
                const tot = v2.reduce((a,v)=>a+v.total,0)||1;
                return Math.round(v2.reduce((a,v)=>a+v.up,0)/tot*100);
            })();
            const scoreAhora = calcScore(patActivos, rsiAhora, probGlobal);
            if (scoreAhora >= 70 && patActivos.length > 0) {
                playTono('fuerte');
                vibrarSegun('fuerte');
                notificarSistema('🎯 Señal fuerte detectada',
                    `Score: ${scoreAhora}/100 — ${patActivos[0]}`);
            }
        } catch (e) { console.warn('Error en indicadores avanzados:', e); }
    };

    // Primer render inmediato con datos ya cargados
    actualizarIndicadores();

    // =====================================================================
    // 🔁 RASTREADOR DE CICLO DE VELAS
    // Permite marcar una vela clave y configurar cada cuántas velas se
    // espera que se repita. Avisa con voz cuando se acerca el momento.
    // =====================================================================

    let ciclosActivos = [];       // array de ciclos en curso
    let velasTotales  = candles.length; // contador global de velas

    // Colores y nombres cortos
    const CICLO_NOMBRES = {
        '#ed4ac7': 'Rosa',
        '#ffd700': 'Dorada',
        '#6ceb52': 'Verde',
        '#ba1428': 'Roja débil',
        '#8b0000': 'Roja vino',
        '#ffffff': 'Otra'
    };

    // ── Crear un ciclo nuevo ─────────────────────────────────────────────
    function crearCiclo(nombre, color, velasHasta, auto) {
        const id = Date.now() + Math.random();
        const ciclo = {
            id,
            auto: !!auto,
            nombre: nombre || CICLO_NOMBRES[color] || 'Vela',
            color,
            velasHasta: parseInt(velasHasta) || 25,
            velasDesde: velasTotales,   // vela en la que se marcó
            velasTranscurridas: 0,
            alertado50: false,
            alertado80: false,
            alertadoLlegada: false
        };
        ciclosActivos.push(ciclo);
        renderizarCiclos();
        if (!auto) hablar(`Ciclo marcado: ${ciclo.nombre}. Te avisaré en ${ciclo.velasHasta} velas.`, true);
        return ciclo;
    }

    // ── Análisis de memoria al cumplirse un conteo ────────────────────────
    // Cuenta velas positivas (verde, rosa, dorada) y negativas (rojas) de las
    // últimas N velas guardadas en la Memoria IA, donde N = duración del ciclo.
    const COLORES_POSITIVOS = ['#6ceb52', '#ed4ac7', '#ffd700'];
    const COLORES_NEGATIVOS = ['#ba1428', '#8b0000'];

    function balanceMemoria(n) {
        const ult = memoriaVelas.slice(-n).map(firmaVela);
        return {
            pos: ult.filter(c => COLORES_POSITIVOS.includes(c)).length,
            neg: ult.filter(c => COLORES_NEGATIVOS.includes(c)).length,
            total: ult.length
        };
    }

    function mostrarMensajeCentralRojo(texto, ms) {
        const msgDiv = document.getElementById('pattern-center-message');
        if (!msgDiv) return;
        msgDiv.textContent = texto;
        msgDiv.classList.add('visible');
        msgDiv.style.color = '#ff4d4d';
        msgDiv.style.textShadow = '0 0 15px #ff0000';
        msgDiv.style.boxShadow = '0 0 20px rgba(255,0,0,0.8)';
        msgDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        clearTimeout(msgDiv._alertTimeout);
        msgDiv._alertTimeout = setTimeout(() => {
            msgDiv.classList.remove('visible');
            msgDiv.textContent = '⚪ Sin patrón detectado...';
            msgDiv.style.color = '#00ffff';
            msgDiv.style.textShadow = '0 0 10px #00ffff';
            msgDiv.style.boxShadow = '0 0 10px rgba(0,255,255,0.4)';
        }, ms || 8000);
    }

    // ── Actualizar ciclos al llegar una nueva vela ────────────────────────
    function actualizarCiclos(sinIncremento) {
        // Contador propio: candles se recorta (máx. ~60), por eso no se usa candles.length
        if (!sinIncremento) velasTotales++;
        let algoCambio = false;

        ciclosActivos.forEach(c => {
            c.velasTranscurridas = velasTotales - c.velasDesde;
            const restantes = c.velasHasta - c.velasTranscurridas;
            const pct       = c.velasTranscurridas / c.velasHasta;

            // ── Aviso al 50% ──
            if (!c.alertado50 && pct >= 0.5) {
                c.alertado50 = true;
                hablar(`${c.nombre}: llevas ${c.velasTranscurridas} velas. Faltan ${restantes} para posible repetición.`);
                algoCambio = true;
            }

            // ── Aviso al 80% (pronto) ──
            if (!c.alertado80 && pct >= 0.8) {
                c.alertado80 = true;
                hablar(`Atención. ${c.nombre} puede repetirse en ${restantes} velas. Prepárate.`);
                playTono('neutro');
                algoCambio = true;
            }

            // ── Aviso de llegada exacta ──
            if (!c.alertadoLlegada && c.velasTranscurridas >= c.velasHasta) {
                c.alertadoLlegada = true;
                const bal = balanceMemoria(c.velasHasta);
                if (c.auto && bal.pos > bal.neg) {
                    // Más positivas que negativas en el ciclo → posible giro bajista
                    hablar(`${c.nombre} cumplió ${c.velasHasta} velas. Posible cambio de tendencia a bajista. No operar.`, true);
                    mostrarMensajeCentralRojo(`⛔ ${c.nombre}: ${bal.pos} positivas vs ${bal.neg} negativas — posible cambio a BAJISTA, no operar`, 9000);
                    playTono('bajista'); vibrarSegun('alerta');
                } else {
                    hablar(`¡Ahora! Posible repetición de ${c.nombre}. Se cumplen ${c.velasHasta} velas desde que la marcaste.`, true);
                    playTono('fuerte'); vibrarSegun('alerta');
                }
                algoCambio = true;
            }

            // ── Aviso de 1 vela antes (alerta inmediata) ──
            if (!c.alertadoPrevio && restantes === 1 && !c.alertadoLlegada) {
                c.alertadoPrevio = true;
                hablar(`¡Una vela más! ${c.nombre} podría repetirse en la próxima vela.`, true);
                playTono('alcista');
                algoCambio = true;
            }
        });

        // Los conteos automáticos de Rosa se quitan de la tabla en cuanto se cumplen
        // (después de haber lanzado su aviso de voz). Los manuales se quedan.
        ciclosActivos = ciclosActivos.filter(c => !(c.auto && c.alertadoLlegada));

        if (algoCambio || ciclosActivos.length > 0) renderizarCiclos();
    }

    // ── Renderizar la lista visual de ciclos ─────────────────────────────
    function renderizarCiclos() {
        const lista = document.getElementById('ciclo-lista');
        if (!lista) return;

        if (ciclosActivos.length === 0) {
            lista.innerHTML = '<p style="text-align:center;color:#555;font-size:12px;font-family:sans-serif;padding:8px">Sin ciclos activos. Marca una vela para comenzar.</p>';
            return;
        }

        lista.innerHTML = ciclosActivos.map(c => {
            const restantes = Math.max(0, c.velasHasta - c.velasTranscurridas);
            const pct       = Math.min(c.velasTranscurridas / c.velasHasta, 1);
            const pctPx     = Math.round(pct * 100);
            const barColor  = pct < 0.5 ? '#a855f7' : pct < 0.8 ? '#ffd700' : '#00ff80';
            const claseItem = c.alertadoLlegada ? 'alerta-ahora' : pct >= 0.8 ? 'alerta-pronto' : '';
            const estado    = c.alertadoLlegada ? '🟢 ¡Momento!' : pct >= 0.8 ? '⚡ Pronto' : `⏳ ${restantes}v restantes`;

            return `<div class="ciclo-item ${claseItem}" data-id="${c.id}">
                <div class="ciclo-dot" style="background:${c.color};color:${c.color}"></div>
                <div class="ciclo-info">
                    <div class="ciclo-nombre-txt">${c.nombre}</div>
                    <div class="ciclo-meta">Marcado en vela ${c.velasDesde} · cada ${c.velasHasta}v · ${estado}</div>
                </div>
                <div class="ciclo-barra-wrap">
                    <div class="ciclo-barra" style="width:${pctPx}%;background:${barColor}"></div>
                </div>
                <div class="ciclo-contador" style="color:${barColor}">${c.velasTranscurridas}/${c.velasHasta}</div>
                <button class="ciclo-btn-del" onclick="eliminarCiclo('${c.id}')">✕</button>
            </div>`;
        }).join('');
    }

    // Exponer globalmente para el onclick inline
    window.eliminarCiclo = function(id) {
        ciclosActivos = ciclosActivos.filter(c => String(c.id) !== String(id));
        renderizarCiclos();
    };

    // ── Botón Marcar ─────────────────────────────────────────────────────
    document.getElementById('ciclo-marcar')?.addEventListener('click', () => {
        const nombre = document.getElementById('ciclo-nombre').value.trim();
        const color  = document.getElementById('ciclo-color').value;
        const velas  = parseInt(document.getElementById('ciclo-velas').value) || 25;
        crearCiclo(nombre, color, velas);
        document.getElementById('ciclo-nombre').value = '';
    });

    // ── Presets de número de velas ────────────────────────────────────────
    document.querySelectorAll('.ciclo-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('ciclo-velas').value = btn.dataset.v;
            document.querySelectorAll('.ciclo-preset').forEach(b => b.classList.remove('activo'));
            btn.classList.add('activo');
        });
    });

    // ── Enganchar al ciclo de velas ───────────────────────────────────────
    const _addCandleConCiclo = addCandleAuto;
    addCandleAuto = function(v, color) {
        _addCandleConCiclo(v, color);
        try { actualizarCiclos(); } catch(e) { console.warn('Error ciclo velas:', e); }
    };

    // ── 🩷 ROSA: al pulsar +10 Rosa arranca solo el conteo de 25 velas ────
    // (se ejecuta DESPUÉS del listener original, cuando la vela rosa ya existe;
    //  esa vela es el punto 0 y cuentan las 25 siguientes)
    let _rosaSeq = 0;
    document.getElementById('btn9')?.addEventListener('click', () => {
        // Cada Rosa abre su PROPIO conteo de 25; los anteriores siguen corriendo
        _rosaSeq++;
        crearCiclo(`Rosa #${_rosaSeq}`, '#ed4ac7', 25, true);
    });

    // ── Undo / Reset mantienen el contador sincronizado ───────────────────
    document.getElementById('btn3')?.addEventListener('click', () => {
        velasTotales = Math.max(0, velasTotales - 1);
        // si se deshizo la vela rosa, se quita su ciclo automático
        ciclosActivos = ciclosActivos.filter(c => !(c.auto && c.velasDesde > velasTotales));
        actualizarCiclos(true);
    });
    document.getElementById('btn4')?.addEventListener('click', () => {
        velasTotales = 0;
        _rosaSeq = 0;
        ciclosActivos = [];
        renderizarCiclos();
    });

    renderizarCiclos();


    // =====================================================================
    // 🩷 AVISO DE POSIBLE ENTRADA ROSA (y Dorada) SEGÚN LA MEMORIA
    // Cruza 3 fuentes y avisa cuando coinciden al menos 2 puntos:
    //   1) Figura repetida: la misma secuencia de 3-5 velas ya ocurrió antes
    //      y después vino la vela clave.
    //   2) Intervalo típico: la vela clave suele salir cada ~N velas.
    //   3) Ciclo activo: el rastreador está a 2 velas o menos de cumplirse.
    // =====================================================================
    const CLAVES_AVISO = [
        { color: '#ed4ac7', nombre: 'ROSA',   emoji: '🩷', voz: 'rosa'   },
        { color: '#ffd700', nombre: 'DORADA', emoji: '💛', voz: 'dorada' }
    ];
    let _ultimoAvisoClave = '';

    // (1) ¿Qué pasó las veces anteriores que apareció esta misma figura?
    function analizarFiguraParaColor(color) {
        const n = memoriaVelas.length;
        for (const w of [5, 4, 3]) {
            if (n < w + 2) continue;
            const actual = memoriaVelas.slice(-w).map(firmaVela).join('-');
            let veces = 0, aciertos = 0;
            for (let i = 0; i <= n - w - 1; i++) {   // excluye la ocurrencia actual
                const seq = memoriaVelas.slice(i, i + w).map(firmaVela).join('-');
                if (seq === actual) {
                    veces++;
                    if (firmaVela(memoriaVelas[i + w]) === color) aciertos++;
                }
            }
            const prob = veces ? aciertos / veces : 0;
            const valida = (w >= 4)
                ? (veces >= 2 && aciertos >= 1 && prob >= 0.5)
                : (veces >= 3 && aciertos >= 2 && prob >= 0.4);
            if (valida) return { w, veces, aciertos, prob };
        }
        return null;
    }

    // (2) ¿Cada cuántas velas suele salir y cuántas van desde la última?
    function analizarIntervaloColor(color) {
        const idx = [];
        memoriaVelas.forEach((v, i) => { if (firmaVela(v) === color) idx.push(i); });
        if (idx.length < 3) return null;
        const gaps = [];
        for (let i = 1; i < idx.length; i++) gaps.push(idx[i] - idx[i - 1]);
        const orden = [...gaps].sort((a, b) => a - b);
        const tip = orden[Math.floor(orden.length / 2)];               // mediana
        const parecidos = gaps.filter(g => Math.abs(g - tip) <= 1).length;
        if (parecidos < 2) return null;                                  // intervalo poco constante
        const desde = memoriaVelas.length - 1 - idx[idx.length - 1];    // velas desde la última
        if (desde < 1) return null;
        if (Math.abs((desde + 1) - tip) > 1) return null;               // la próxima vela cae en la ventana típica
        return { tip, desde };
    }

    function evaluarAvisoClaves() {
        const box = document.getElementById('aviso-rosa-posible');
        if (!box) return;

        const avisos = [];
        CLAVES_AVISO.forEach(k => {
            const razones = [];
            let pts = 0;

            const f = analizarFiguraParaColor(k.color);
            if (f) {
                razones.push(`Figura de ${f.w} velas repetida ${f.veces}× → después vino ${k.nombre.toLowerCase()} ${f.aciertos} de ${f.veces} veces`);
                pts += f.prob >= 0.6 ? 2 : 1;
            }
            const iv = analizarIntervaloColor(k.color);
            if (iv) {
                razones.push(`Suele salir cada ~${iv.tip} velas y van ${iv.desde}`);
                pts += 1;
            }
            try {
                const cercanos = ciclosActivos
                    .filter(x => x.color === k.color)
                    .map(x => ({ c: x, rest: x.velasHasta - x.velasTranscurridas }))
                    .filter(x => x.rest <= 2 && x.rest >= -1)
                    .sort((a, b) => Math.abs(a.rest) - Math.abs(b.rest));
                if (cercanos.length) {
                    const { c, rest } = cercanos[0];
                    {
                        razones.push(`${c.nombre}: ${rest > 0 ? 'faltan ' + rest + ' velas' : 'cumplido'}`);
                        pts += 1;
                    }
                }
            } catch (e) {}

            if (pts >= 2) avisos.push({ k, razones, pts });
        });

        if (avisos.length === 0) {
            box.classList.remove('visible');
            _ultimoAvisoClave = '';
            return;
        }

        avisos.sort((a, b) => b.pts - a.pts);
        const principal = avisos[0];
        const nivel = p => p >= 3 ? 'ALTA' : 'MEDIA';

        box.innerHTML = avisos.map(a =>
            `<div class="arp-titulo">${a.k.emoji} POSIBLE ENTRADA ${a.k.nombre} — confianza ${nivel(a.pts)}</div>` +
            a.razones.map(r => `<div class="arp-razon">• ${r}</div>`).join('')
        ).join('');
        box.style.background  = principal.k.color + 'dd';
        box.style.boxShadow   = `0 0 25px ${principal.k.color}`;
        box.style.color       = principal.k.color === '#ffd700' ? '#111' : '#fff';
        box.classList.add('visible');

        // Voz y sonido solo cuando el aviso es nuevo (no en cada vela)
        const clave = avisos.map(a => a.k.nombre + a.pts).join('|');
        if (clave !== _ultimoAvisoClave) {
            _ultimoAvisoClave = clave;
            hablar(`Patrón repetido. Posible entrada ${principal.k.voz}. Confianza ${nivel(principal.pts).toLowerCase()}.`, principal.pts >= 3);
            try { playTono('alcista'); vibrarSegun('alerta'); } catch (e) {}
        }
    }

    (function crearAvisoRosa() {
        if (document.getElementById('aviso-rosa-posible')) return;
        const d = document.createElement('div');
        d.id = 'aviso-rosa-posible';
        document.body.appendChild(d);
    })();

    const _addCandleConClaves = addCandleAuto;
    addCandleAuto = function(v, color) {
        _addCandleConClaves(v, color);
        try { evaluarAvisoClaves(); } catch (e) { console.warn('Error aviso rosa:', e); }
    };

    ['btn-reset-memoria', 'btn4'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', () => {
            document.getElementById('aviso-rosa-posible')?.classList.remove('visible');
            _ultimoAvisoClave = '';
        });
    });

    // =====================================================================
    // 🎯 SISTEMA DE DECISIÓN: ¿OPERO O NO OPERO?
    // Analiza TODOS los indicadores y da una decisión clara con motivos
    // =====================================================================

    // ─── Motor de decisión ───────────────────────────────────────────────
    function evaluarDecision() {
        const razones  = [];   // { texto, tipo: 'favor'|'contra'|'neutro' }
        let ptsUp = 0, ptsDown = 0;

        // ── 1. RSI ──
        const rsi = calcRsi(7);
        if (rsi < 30)      { razones.push({ texto: `RSI ${rsi.toFixed(0)} — sobreventa fuerte → probable rebote alcista`, tipo: 'favor' }); ptsUp += 2; }
        else if (rsi < 40) { razones.push({ texto: `RSI ${rsi.toFixed(0)} — sobreventa leve`, tipo: 'favor' }); ptsUp += 1; }
        else if (rsi > 70) { razones.push({ texto: `RSI ${rsi.toFixed(0)} — sobrecompra fuerte → probable caída`, tipo: 'contra' }); ptsDown += 2; }
        else if (rsi > 60) { razones.push({ texto: `RSI ${rsi.toFixed(0)} — sobrecompra leve`, tipo: 'contra' }); ptsDown += 1; }
        else               { razones.push({ texto: `RSI ${rsi.toFixed(0)} — zona neutra, sin señal clara`, tipo: 'neutro' }); }

        // ── 2. EMA cruce ──
        if (data.length >= 13) {
            const ema5 = calcEma(data, 5), ema12 = calcEma(data, 12);
            const diff = ema5.at(-1) - ema12.at(-1);
            if (ema5.at(-2) <= ema12.at(-2) && ema5.at(-1) > ema12.at(-1)) {
                razones.push({ texto: 'EMA5 acaba de cruzar EMA12 hacia arriba → señal alcista', tipo: 'favor' }); ptsUp += 2;
            } else if (ema5.at(-2) >= ema12.at(-2) && ema5.at(-1) < ema12.at(-1)) {
                razones.push({ texto: 'EMA5 acaba de cruzar EMA12 hacia abajo → señal bajista', tipo: 'contra' }); ptsDown += 2;
            } else if (diff > 0) {
                razones.push({ texto: `EMA5 > EMA12 (diferencia +${diff.toFixed(2)}) — tendencia alcista sostenida`, tipo: 'favor' }); ptsUp += 1;
            } else {
                razones.push({ texto: `EMA5 < EMA12 (diferencia ${diff.toFixed(2)}) — tendencia bajista sostenida`, tipo: 'contra' }); ptsDown += 1;
            }
        } else {
            razones.push({ texto: `EMA: faltan datos (${data.length}/13)`, tipo: 'neutro' });
        }

        // ── 3. Bollinger ──
        const boll = calcBollinger();
        if (boll && data.length > 0) {
            const last = data.at(-1), prev = data.at(-2);
            if (prev >= boll.upper && last < boll.upper) { razones.push({ texto: 'Precio rebota desde banda superior de Bollinger → posible caída', tipo: 'contra' }); ptsDown += 2; }
            else if (prev <= boll.lower && last > boll.lower) { razones.push({ texto: 'Precio rebota desde banda inferior de Bollinger → posible alza', tipo: 'favor' }); ptsUp += 2; }
            else if (last > boll.upper) { razones.push({ texto: 'Precio fuera de banda superior → sobreextensión, precaución', tipo: 'contra' }); ptsDown += 1; }
            else if (last < boll.lower) { razones.push({ texto: 'Precio fuera de banda inferior → posible rebote', tipo: 'favor' }); ptsUp += 1; }
            else { razones.push({ texto: 'Precio dentro de bandas Bollinger — mercado en rango', tipo: 'neutro' }); }
        } else {
            razones.push({ texto: 'Bollinger: esperando más datos', tipo: 'neutro' });
        }

        // ── 4. MACD ──
        if (data.length >= 27) {
            const e12 = calcEma(data, 12), e26 = calcEma(data, 26);
            const m = e12.map((v, i) => v - e26[i]);
            const prev = m.at(-2), curr = m.at(-1);
            if (prev < 0 && curr >= 0) { razones.push({ texto: 'MACD cruza cero al alza — impulso alcista confirmado', tipo: 'favor' }); ptsUp += 2; }
            else if (prev > 0 && curr <= 0) { razones.push({ texto: 'MACD cruza cero a la baja — impulso bajista confirmado', tipo: 'contra' }); ptsDown += 2; }
            else if (curr > 0) { razones.push({ texto: 'MACD positivo — tendencia alcista activa', tipo: 'favor' }); ptsUp += 1; }
            else { razones.push({ texto: 'MACD negativo — tendencia bajista activa', tipo: 'contra' }); ptsDown += 1; }
        } else {
            razones.push({ texto: `MACD: necesita ${27 - data.length} puntos más`, tipo: 'neutro' });
        }

        // ── 5. Racha ──
        const { n: rachan, dir: rachaDir } = calcRacha();
        if (rachan >= 5) {
            const msg = rachaDir === 'UP'
                ? `Racha de ${rachan} alcistas seguidas — agotamiento probable, NO operar al alza`
                : `Racha de ${rachan} bajistas seguidas — rebote probable pero alto riesgo`;
            razones.push({ texto: msg, tipo: 'contra' }); ptsDown += 2;
        } else if (rachan >= 3) {
            const msg = rachaDir === 'UP'
                ? `Racha de ${rachan} alcistas — posible continuación o agotamiento pronto`
                : `Racha de ${rachan} bajistas — rebote posible, con cautela`;
            razones.push({ texto: msg, tipo: 'neutro' });
        }

        // ── 6. Doji ──
        if (candles.length > 0 && bodySize(candles.at(-1)) < 0.15) {
            razones.push({ texto: 'Última vela es Doji — mercado indeciso, esperar confirmación antes de entrar', tipo: 'contra' }); ptsDown += 1;
        }

        // ── 7. Engulfing ──
        if (candles.length >= 2) {
            const c1 = candles.at(-2), c2 = candles.at(-1);
            if (direction(c1)==='DOWN' && direction(c2)==='UP' && c2.open<=c1.close && c2.close>=c1.open) {
                razones.push({ texto: 'Vela envolvente alcista — fuerte señal de entrada al alza', tipo: 'favor' }); ptsUp += 3;
            } else if (direction(c1)==='UP' && direction(c2)==='DOWN' && c2.open>=c1.close && c2.close<=c1.open) {
                razones.push({ texto: 'Vela envolvente bajista — fuerte señal de entrada a la baja', tipo: 'contra' }); ptsDown += 3;
            }
        }

        // ── 8. Memoria IA — historial de patrones ──
        const statsIA = calcularEstadisticasPatrones();
        const totalIA = Object.values(statsIA).reduce((a, v) => a + v.total, 0);
        if (totalIA >= 5) {
            const upIA  = Object.values(statsIA).reduce((a, v) => a + v.up, 0);
            const pctUp = Math.round(upIA / totalIA * 100);
            if (pctUp >= 65)      { razones.push({ texto: `Memoria IA: ${pctUp}% de patrones históricos resolvieron al alza`, tipo: 'favor' }); ptsUp += 2; }
            else if (pctUp <= 35) { razones.push({ texto: `Memoria IA: solo ${pctUp}% resolvieron al alza — historial bajista`, tipo: 'contra' }); ptsDown += 2; }
            else                  { razones.push({ texto: `Memoria IA: ${pctUp}% alcista vs ${100-pctUp}% bajista — equilibrado`, tipo: 'neutro' }); }
        } else {
            razones.push({ texto: `Memoria IA: acumulando historial (${totalIA} patrones registrados)`, tipo: 'neutro' });
        }

        // ── 9. Markov — próximo color ──
        const markovPred = prediccionMarkov();
        if (markovPred && markovPred.prob > 50) {
            const esAlcista = ['#6ceb52','#ed4ac7','#ffd700'].includes(markovPred.mejorColor);
            const nombre = NOMBRES_COLOR[markovPred.mejorColor] || markovPred.mejorColor;
            const msg = `Markov predice próximo color: ${nombre} (${markovPred.prob.toFixed(0)}%)`;
            if (esAlcista) { razones.push({ texto: msg, tipo: 'favor' }); ptsUp += 1; }
            else           { razones.push({ texto: msg, tipo: 'contra' }); ptsDown += 1; }
        }

        // ── 10. Figuras repetidas en memoria ──
        const fig3 = detectarFigurasRepetidas(3, 2);
        const fig5 = detectarFigurasRepetidas(5, 2);
        if (fig3.length > 0 || fig5.length > 0) {
            const pred = obtenerColorPredichoParaFigura(3) || obtenerColorPredichoParaFigura(5);
            if (pred && pred.veces >= 2) {
                const confianza = Math.round(pred.veces / pred.total * 100);
                const esAlcista = ['#6ceb52','#ed4ac7','#ffd700'].includes(pred.color);
                const nombre = NOMBRES_COLOR[pred.color] || pred.color;
                const msg = `Figura repetida: históricamente viene ${nombre} (${confianza}% de veces)`;
                if (confianza >= 65) { razones.push({ texto: msg, tipo: esAlcista ? 'favor' : 'contra' }); esAlcista ? ptsUp += 2 : ptsDown += 2; }
                else { razones.push({ texto: msg + ' — confianza baja', tipo: 'neutro' }); }
            }
        }

        // ── 11. Ventana de 15 minutos ──
        const v15 = statsVentana(15 * 60 * 1000);
        if (v15.total >= 4) {
            const pct15 = Math.round(v15.alcistas / v15.total * 100);
            if (pct15 >= 70)      { razones.push({ texto: `Últimos 15min: ${pct15}% alcista — momentum al alza`, tipo: 'favor' }); ptsUp += 1; }
            else if (pct15 <= 30) { razones.push({ texto: `Últimos 15min: ${pct15}% alcista — momentum bajista`, tipo: 'contra' }); ptsDown += 1; }
        }

        // ── Calcular decisión final ──
        const total = ptsUp + ptsDown || 1;
        const pctUpFinal   = Math.round(ptsUp  / total * 100);
        const pctDownFinal = Math.round(ptsDown / total * 100);

        const favor  = razones.filter(r => r.tipo === 'favor').length;
        const contra = razones.filter(r => r.tipo === 'contra').length;
        const neutro = razones.filter(r => r.tipo === 'neutro').length;

        // Score ponderado
        const rsiVal     = rsi;
        const probGlobal = totalIA >= 5 ? Math.round(Object.values(statsIA).reduce((a,v)=>a+v.up,0) / totalIA * 100) : 50;
        const patActivos = checkPatterns();
        const score      = calcScore(patActivos, rsiVal, probGlobal);

        // Decisión
        let nivel, titulo, subtitulo, emoji;
        if (score >= 72 && favor >= contra + 2) {
            nivel = 'verde-fuerte'; emoji = '🟢'; titulo = '¡BUENA ENTRADA!';
            subtitulo = `${favor} indicadores a favor — Score ${score}/100 — Alta confianza`;
        } else if (score >= 55 && favor > contra) {
            nivel = 'verde'; emoji = '🟡'; titulo = 'ENTRADA MODERADA';
            subtitulo = `${favor} a favor vs ${contra} en contra — Score ${score}/100 — Opera con cautela`;
        } else if (score < 35 || contra >= favor + 3) {
            nivel = 'rojo'; emoji = '🔴'; titulo = 'NO OPERAR AHORA';
            subtitulo = `${contra} señales en contra — Score ${score}/100 — Esperar mejor momento`;
        } else if (Math.abs(favor - contra) <= 1) {
            nivel = 'amarillo'; emoji = '⚠️'; titulo = 'MERCADO INDECISO';
            subtitulo = `${favor} a favor / ${contra} en contra / ${neutro} neutros — Esperar confirmación`;
        } else {
            nivel = 'amarillo'; emoji = '🟡'; titulo = 'SEÑAL DÉBIL';
            subtitulo = `Score ${score}/100 — Condiciones mixtas, proceder con precaución`;
        }

        return { nivel, emoji, titulo, subtitulo, razones, favor, contra, neutro, score, pctUpFinal, pctDownFinal };
    }

    // ─── Renderizar resultado en el panel ────────────────────────────────
    function renderizarDecision() {
        // El cuadro visual se eliminó; se conservan solo las alertas de voz/sonido
        const d = evaluarDecision();

        // Sonido y vibración si hay entrada fuerte
        if (d.nivel === 'verde-fuerte') {
            playTono('fuerte'); vibrarSegun('fuerte');
            notificarSistema('🟢 ¡BUENA ENTRADA!', d.subtitulo);
            hablar(`¡Buena entrada! Score ${d.score} sobre cien. ${d.favor} señales a favor.`);
        } else if (d.nivel === 'rojo' && d.contra >= 5) {
            playTono('bajista'); vibrarSegun('debil');
            hablar(`No operar. ${d.contra} señales en contra.`);
        }
    }

    // ─── Enganchar al ciclo de velas ─────────────────────────────────────
    const _addCandleConDecision = addCandleAuto;
    addCandleAuto = function(v, color) {
        _addCandleConDecision(v, color);
        try { renderizarDecision(); } catch(e) { console.warn('Error en panel decisión:', e); }
    };

    // Render inicial
    setTimeout(renderizarDecision, 100);

    window.__hablar = hablar;   // lo usa analisis.js para los avisos de límites
    // =====================================================================
    // 💪 MÓDULO DE SEÑALES DE FUERZA — ALCISTAS Y BAJISTAS
    // 12 señales: 6 alcistas + 6 bajistas, con voz, vibración y panel visual
    // =====================================================================

    // Anti-repetición de señales de fuerza (independiente del cooldown de voz)
    const _fuerzaCache = {};
    const FUERZA_COOLDOWN = 30000; // 30s entre la misma señal

    function _puedeAvisarFuerza(clave) {
        const ahora = Date.now();
        if (_fuerzaCache[clave] && ahora - _fuerzaCache[clave] < FUERZA_COOLDOWN) return false;
        _fuerzaCache[clave] = ahora;
        return true;
    }

    // Contexto compartido — se calcula una vez por ciclo
    function _contextoIA() {
        const stats  = calcularEstadisticasPatrones();
        const total  = Object.values(stats).reduce((a,v) => a+v.total, 0);
        const up     = Object.values(stats).reduce((a,v) => a+v.up, 0);
        const pct    = total > 0 ? Math.round(up/total*100) : 50;
        return { iaAlc: pct >= 55, iaBaj: pct <= 45, pct, total };
    }

    // ── Mostrar señal de fuerza en pantalla ──────────────────────────────
    function mostrarSenalFuerza({ titulo, tipo, mensaje, pct, voz }) {
        const el = document.getElementById('panel-fuerza-activa');
        if (!el) return;
        const esAlc = tipo === 'alcista';
        el.className = `fuerza-${tipo}`;
        el.innerHTML = `
            <div class="fza-badge">${esAlc ? '🚀' : '🔻'} ${tipo.toUpperCase()}</div>
            <div class="fza-titulo">${titulo}</div>
            <div class="fza-msg">${mensaje}</div>
            <div class="fza-barra-wrap"><div class="fza-barra" style="width:${pct}%;background:${esAlc?'#00ff80':'#ff5050'}"></div></div>
            <div class="fza-pct">${pct}% confianza</div>`;
        el.classList.add('visible');
        clearTimeout(el._t);
        el._t = setTimeout(() => el.classList.remove('visible'), 9000);
        hablar(voz, false);
        playTono(esAlc ? 'fuerte' : 'bajista');
        vibrarSegun(pct >= 85 ? 'alerta' : 'fuerte');
    }

    // ════════════════════════════════════════════════════════════════════
    // SEÑALES ALCISTAS
    // ════════════════════════════════════════════════════════════════════

    // 1. CONFLUENCIA ALCISTA TRIPLE (RSI + EMA + MACD)
    function senalConfluenciaAlcista() {
        if (data.length < 27 || candles.length < 8) return;
        const rsi = calcRsi(7);
        if (rsi >= 45) return;
        const ema5 = calcEma(data,5), ema12 = calcEma(data,12);
        if (ema5.at(-1) <= ema12.at(-1)) return;
        const e12 = calcEma(data,12), e26 = calcEma(data,26);
        const macd = e12.at(-1) - e26.at(-1);
        if (macd <= 0) return;
        if (!_puedeAvisarFuerza('conf_alc')) return;
        mostrarSenalFuerza({
            titulo: 'Confluencia alcista triple',
            tipo: 'alcista',
            mensaje: `RSI ${rsi.toFixed(0)} (sobreventa) + EMA cruzada al alza + MACD positivo`,
            pct: 88,
            voz: `¡Confluencia alcista! R S I, E M A y M A C D confirman subida. Alta probabilidad alcista. Puedes operar.`
        });
    }

    // 2. REBOTE EN SOPORTE FUERTE CON MEMORIA IA
    function senalReboteSoporte() {
        if (data.length < 4) return;
        const ctx2 = _contextoIA();
        if (!ctx2.iaAlc || ctx2.total < 5) return;
        const niveles = detectarNivelesSRAutomaticos();
        const soportes = niveles.filter(n => n.tipo === 'soporte' && n.toques >= 3);
        if (soportes.length === 0) return;
        const precio = data.at(-1);
        const cercano = soportes.find(s => Math.abs(precio - s.nivel) <= Math.abs(s.nivel)*0.05+0.4);
        if (!cercano) return;
        if (!_puedeAvisarFuerza(`rebote_sop_${cercano.nivel.toFixed(1)}`)) return;
        mostrarSenalFuerza({
            titulo: 'Rebote en soporte con Memoria IA',
            tipo: 'alcista',
            mensaje: `Soporte ${cercano.nivel.toFixed(1)} tocado ${cercano.toques}× · IA ${ctx2.pct}% alcista`,
            pct: 82,
            voz: `Soporte fuerte en ${cercano.nivel.toFixed(1)}, tocado ${cercano.toques} veces. Memoria confirma alcista. Buena entrada al alza.`
        });
    }

    // 3. VELA ENVOLVENTE ALCISTA
    function senalEngulfingAlcista() {
        if (candles.length < 2) return;
        const c1 = candles.at(-2), c2 = candles.at(-1);
        if (direction(c1) !== 'DOWN' || direction(c2) !== 'UP') return;
        if (!(c2.open <= c1.close && c2.close >= c1.open)) return;
        if (!_puedeAvisarFuerza('engulf_alc')) return;
        const ctx2 = _contextoIA();
        mostrarSenalFuerza({
            titulo: 'Vela envolvente alcista',
            tipo: 'alcista',
            mensaje: `Compradores engullen la vela bajista anterior · IA ${ctx2.pct}% alcista`,
            pct: 76,
            voz: `Vela envolvente alcista. Compradores tomaron control total. Señal de entrada al alza.`
        });
    }

    // 4. PATRÓN REPETIDO CON CONFIANZA 65%+ (Memoria IA)
    function senalPatronRepetidoAlcista() {
        if (memoriaVelas.length < 8) return;
        const pred3 = obtenerColorPredichoParaFigura(3);
        const pred5 = obtenerColorPredichoParaFigura(5);
        const pred = (pred5 && pred5.prob >= 65) ? pred5 : (pred3 && pred3.prob >= 65) ? pred3 : null;
        if (!pred) return;
        const esAlc = ['#6ceb52','#ed4ac7','#ffd700'].includes(pred.color);
        if (!esAlc) return;
        const fig = detectarFigurasRepetidas(pred5 ? 5 : 3, 3);
        if (fig.length === 0) return;
        const veces = fig[0][1];
        if (veces < 3) return;
        const pct = Math.round(pred.veces / pred.total * 100);
        if (!_puedeAvisarFuerza(`patron_alc_${pred.color}`)) return;
        const nombre = (NOMBRES_COLOR[pred.color]||'').replace(/[🔴🍷🟩🩷💛]/g,'').trim();
        mostrarSenalFuerza({
            titulo: 'Patrón repetido alcista (Memoria IA)',
            tipo: 'alcista',
            mensaje: `Figura repetida ${veces}× · Próximo color ${nombre} con ${pct}% confianza`,
            pct,
            voz: `Patrón repetido de la memoria. Probable color ${nombre} con ${pct} por ciento de confianza. Posible entrada.`
        });
    }

    // 5. DIVERGENCIA ALCISTA RSI
    function senalDivergenciaAlcista() {
        if (data.length < 12 || candles.length < 12) return;
        // Buscar mínimos locales en precio y RSI en las últimas 12 velas
        let minPrecioIdx = 0, minPrecioVal = Infinity;
        let minRsiIdx = 0, minRsiVal = Infinity;
        for (let i = data.length - 12; i < data.length - 2; i++) {
            if (data[i] < minPrecioVal) { minPrecioVal = data[i]; minPrecioIdx = i; }
        }
        const rsiHist = [];
        for (let i = Math.max(0, data.length-20); i < data.length; i++) {
            const sl = candles.slice(Math.max(0,i-7), i+1);
            if (sl.length < 4) { rsiHist.push(50); continue; }
            let g=0,l=0;
            for (let j=1;j<sl.length;j++){const d=sl[j].close-sl[j-1].close; if(d>0)g+=d; else l-=d;}
            rsiHist.push(100-100/(1+(g/(l||0.001))));
        }
        const rsiActual = rsiHist.at(-1);
        const rsiAnterior = rsiHist.at(-4) || 50;
        const precioActual = data.at(-1);
        const precioAnterior = data.at(-4) || precioActual;
        // Divergencia: precio hace nuevo mínimo pero RSI no
        if (precioActual < precioAnterior && rsiActual > rsiAnterior && rsiActual < 50) {
            if (!_puedeAvisarFuerza('diverg_alc')) return;
            mostrarSenalFuerza({
                titulo: 'Divergencia alcista RSI',
                tipo: 'alcista',
                mensaje: `Precio baja → RSI sube · Impulso bajista agotado · RSI ${rsiActual.toFixed(0)}`,
                pct: 78,
                voz: `Divergencia alcista detectada. El precio baja pero el impulso sube. Señal de reversión al alza. Atención.`
            });
        }
    }

    // 6. MOMENTUM ACELERADO ALCISTA (3 velas alcistas con cuerpos crecientes)
    function senalMomentumAlcista() {
        if (candles.length < 4) return;
        const ult = candles.slice(-4);
        const dirs = ult.map(c => direction(c));
        if (!dirs.slice(1).every(d => d === 'UP')) return;
        const cuerpos = ult.slice(1).map(c => Math.abs(c.close - c.open));
        if (!(cuerpos[0] < cuerpos[1] && cuerpos[1] < cuerpos[2])) return;
        const { n: rachaN } = calcRacha();
        if (rachaN < 3) return;
        if (!_puedeAvisarFuerza('momentum_alc')) return;
        mostrarSenalFuerza({
            titulo: 'Momentum alcista acelerado',
            tipo: 'alcista',
            mensaje: `3 velas alcistas con fuerza creciente · Racha de ${rachaN} velas`,
            pct: 72,
            voz: `Momentum alcista acelerado. Tres velas verdes con fuerza creciente. Tendencia al alza activa.`
        });
    }

    // ════════════════════════════════════════════════════════════════════
    // SEÑALES BAJISTAS
    // ════════════════════════════════════════════════════════════════════

    // 7. CONFLUENCIA BAJISTA TRIPLE
    function senalConfluenciaBajista() {
        if (data.length < 27 || candles.length < 8) return;
        const rsi = calcRsi(7);
        if (rsi <= 55) return;
        const ema5 = calcEma(data,5), ema12 = calcEma(data,12);
        if (ema5.at(-1) >= ema12.at(-1)) return;
        const e12 = calcEma(data,12), e26 = calcEma(data,26);
        const macd = e12.at(-1) - e26.at(-1);
        if (macd >= 0) return;
        if (!_puedeAvisarFuerza('conf_baj')) return;
        mostrarSenalFuerza({
            titulo: 'Confluencia bajista triple',
            tipo: 'bajista',
            mensaje: `RSI ${rsi.toFixed(0)} (sobrecompra) + EMA cruzada a la baja + MACD negativo`,
            pct: 88,
            voz: `¡Confluencia bajista! R S I, E M A y M A C D confirman caída. No operar al alza. Alta probabilidad bajista.`
        });
    }

    // 8. REBOTE EN RESISTENCIA CON MEMORIA IA
    function senalReboteResistencia() {
        if (data.length < 4) return;
        const ctx2 = _contextoIA();
        if (!ctx2.iaBaj || ctx2.total < 5) return;
        const niveles = detectarNivelesSRAutomaticos();
        const resis = niveles.filter(n => n.tipo === 'resistencia' && n.toques >= 3);
        if (resis.length === 0) return;
        const precio = data.at(-1);
        const cercana = resis.find(r => Math.abs(precio - r.nivel) <= Math.abs(r.nivel)*0.05+0.4);
        if (!cercana) return;
        if (!_puedeAvisarFuerza(`rebote_res_${cercana.nivel.toFixed(1)}`)) return;
        mostrarSenalFuerza({
            titulo: 'Rebote en resistencia con Memoria IA',
            tipo: 'bajista',
            mensaje: `Resistencia ${cercana.nivel.toFixed(1)} tocada ${cercana.toques}× · IA ${ctx2.pct}% bajista`,
            pct: 83,
            voz: `Resistencia fuerte en ${cercana.nivel.toFixed(1)}, tocada ${cercana.toques} veces. Memoria confirma rechazo. No operar al alza.`
        });
    }

    // 9. VELA ENVOLVENTE BAJISTA
    function senalEngulfingBajista() {
        if (candles.length < 2) return;
        const c1 = candles.at(-2), c2 = candles.at(-1);
        if (direction(c1) !== 'UP' || direction(c2) !== 'DOWN') return;
        if (!(c2.open >= c1.close && c2.close <= c1.open)) return;
        if (!_puedeAvisarFuerza('engulf_baj')) return;
        const ctx2 = _contextoIA();
        mostrarSenalFuerza({
            titulo: 'Vela envolvente bajista',
            tipo: 'bajista',
            mensaje: `Vendedores engullen la vela alcista anterior · IA ${ctx2.pct}% bajista`,
            pct: 76,
            voz: `Vela envolvente bajista. Vendedores tomaron control total. No operar al alza. Señal de caída.`
        });
    }

    // 10. RACHA + AGOTAMIENTO CONFIRMADO
    function senalAgotamientoAlcista() {
        if (candles.length < 6) return;
        const { n: rachaN, dir: rachaDir } = calcRacha();
        if (rachaDir !== 'UP' || rachaN < 5) return;
        const rsi = calcRsi(7);
        if (rsi < 65) return;
        const niveles = detectarNivelesSRAutomaticos();
        const resis = niveles.filter(n => n.tipo === 'resistencia');
        const precio = data.at(-1);
        const enResis = resis.some(r => Math.abs(precio - r.nivel) <= Math.abs(r.nivel)*0.06+0.5);
        if (!_puedeAvisarFuerza('agotamiento_alc')) return;
        const extra = enResis ? ' y precio en resistencia' : '';
        mostrarSenalFuerza({
            titulo: 'Agotamiento alcista',
            tipo: 'bajista',
            mensaje: `Racha de ${rachaN} velas alcistas · RSI ${rsi.toFixed(0)}${extra}`,
            pct: 74,
            voz: `Alerta de agotamiento alcista. Racha de ${rachaN} velas con R S I alto${extra}. No operar al alza. Posible reversión.`
        });
    }

    // 11. DIVERGENCIA BAJISTA RSI
    function senalDivergenciaBajista() {
        if (data.length < 12 || candles.length < 12) return;
        const rsiActual = calcRsi(7);
        const rsiAnterior = (() => {
            const sl = candles.slice(-11, -4);
            if (sl.length < 4) return 50;
            let g=0,l=0;
            for(let i=1;i<sl.length;i++){const d=sl[i].close-sl[i-1].close;if(d>0)g+=d;else l-=d;}
            return 100-100/(1+(g/(l||0.001)));
        })();
        const precioActual = data.at(-1);
        const precioAnterior = data.at(-7) || precioActual;
        // Divergencia: precio hace nuevo máximo pero RSI no
        if (precioActual > precioAnterior && rsiActual < rsiAnterior && rsiActual > 50) {
            if (!_puedeAvisarFuerza('diverg_baj')) return;
            mostrarSenalFuerza({
                titulo: 'Divergencia bajista RSI',
                tipo: 'bajista',
                mensaje: `Precio sube → RSI baja · Impulso alcista agotado · RSI ${rsiActual.toFixed(0)}`,
                pct: 77,
                voz: `Divergencia bajista detectada. El precio sube pero el impulso baja. Señal de reversión. Precaución al alza.`
            });
        }
    }

    // 12. RUPTURA DE SOPORTE CONFIRMADA
    function senalRupturaSoporte() {
        if (data.length < 3) return;
        const precio = data.at(-1);
        const precioAnterior = data.at(-2);
        const niveles = detectarNivelesSRAutomaticos();
        const soportes = niveles.filter(n => n.tipo === 'soporte' && n.toques >= 3);
        const roto = soportes.find(s => precioAnterior >= s.nivel && precio < s.nivel - (Math.abs(s.nivel)*0.02+0.2));
        if (!roto) return;
        const cuerpoRuptura = candles.length > 0 ? Math.abs(candles.at(-1).close - candles.at(-1).open) : 0;
        const cuerpoMedio   = candles.length > 4 ? candles.slice(-5).reduce((a,c) => a+Math.abs(c.close-c.open), 0)/5 : 1;
        if (cuerpoRuptura < cuerpoMedio * 0.4) return; // cuerpo muy pequeño = no confirma
        if (!_puedeAvisarFuerza(`ruptura_sop_${roto.nivel.toFixed(1)}`)) return;
        mostrarSenalFuerza({
            titulo: '¡Ruptura de soporte!',
            tipo: 'bajista',
            mensaje: `Soporte ${roto.nivel.toFixed(1)} (${roto.toques} toques) roto con vela de fuerza`,
            pct: 85,
            voz: `¡Soporte roto en ${roto.nivel.toFixed(1)}! Señal bajista muy fuerte. No operar al alza. El soporte ahora es resistencia.`
        });
    }

    // ── Evaluar todas las señales de fuerza en cada nueva vela ───────────
    function evaluarSenalesFuerza() {
        try { senalConfluenciaAlcista(); }   catch(e) {}
        try { senalReboteSoporte(); }        catch(e) {}
        try { senalEngulfingAlcista(); }     catch(e) {}
        try { senalPatronRepetidoAlcista(); } catch(e) {}
        try { senalDivergenciaAlcista(); }   catch(e) {}
        try { senalMomentumAlcista(); }      catch(e) {}
        try { senalConfluenciaBajista(); }   catch(e) {}
        try { senalReboteResistencia(); }    catch(e) {}
        try { senalEngulfingBajista(); }     catch(e) {}
        try { senalAgotamientoAlcista(); }   catch(e) {}
        try { senalDivergenciaBajista(); }   catch(e) {}
        try { senalRupturaSoporte(); }       catch(e) {}
    }

    // ── Panel flotante de señal activa ────────────────────────────────────
    (function crearPanelFuerza() {
        const el = document.createElement('div');
        el.id = 'panel-fuerza-activa';
        document.body.appendChild(el);
    })();

    // ── Enganchar al ciclo de velas ───────────────────────────────────────
    const _addCandleConFuerza = addCandleAuto;
    addCandleAuto = function(v, color) {
        _addCandleConFuerza(v, color);
        try { evaluarSenalesFuerza(); } catch(e) { console.warn('Error señales fuerza:', e); }
    };

    evaluarSenalesFuerza(); // evaluación inicial



    // =====================================================================
    // 🩷 RADAR DE ENTRADAS CLAVE (ROSA / DORADA) SEGÚN LA MEMORIA
    // Compara las últimas velas con la memoria: si esa misma figura ya
    // ocurrió antes y después vino una Rosa (o Dorada), avisa por mensaje
    // y por voz. También avisa si ya va el tiempo típico entre rosas.
    // =====================================================================
    const RADAR_OBJETIVOS = [
        { color: '#ed4ac7', nombre: 'ROSA',   emoji: '🩷' },
        { color: '#ffd700', nombre: 'DORADA', emoji: '💛' }
    ];
    const RADAR_VENTANAS = [5, 4, 3];          // se prueba de la figura más larga a la más corta
    const RADAR_MIN_REP  = { 5: 2, 4: 2, 3: 3 }; // veces mínimas que debe haberse visto la figura
    const RADAR_PCT_MIN  = 50;                 // % mínimo de veces que después vino el color

    (function crearAvisoRadar() {
        const d = document.createElement('div');
        d.id = 'aviso-radar';
        document.body.appendChild(d);
    })();

    // ¿La figura actual ya se vio antes y qué vino después?
    function radarAnalizarPatron(obj) {
        const mem = memoriaVelas.map(firmaVela);
        for (const v of RADAR_VENTANAS) {
            if (mem.length < v + 2) continue;
            const actual = mem.slice(-v).join('-');
            let n = 0, k = 0;
            for (let i = 0; i <= mem.length - v - 1; i++) {
                if (mem.slice(i, i + v).join('-') === actual) {
                    n++;
                    if (mem[i + v] === obj.color) k++;
                }
            }
            const pct = n ? Math.round(k / n * 100) : 0;
            if (n >= RADAR_MIN_REP[v] && k > 0 && pct >= RADAR_PCT_MIN) return { ventana: v, n, k, pct };
        }
        return null;
    }

    // ¿Ya van las velas típicas entre una aparición y la siguiente?
    function radarAnalizarCiclo(obj) {
        const mem = memoriaVelas.map(firmaVela);
        const idx = [];
        mem.forEach((c, i) => { if (c === obj.color) idx.push(i); });
        if (idx.length < 2) return null;
        const gaps = idx.slice(1).map((x, j) => x - idx[j]);
        const prom = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
        const desde = mem.length - 1 - idx[idx.length - 1];
        if (prom < 5 || desde === 0) return null;
        if (Math.abs(desde - prom) <= 2) return { desde, prom };
        return null;
    }

    let _radarUltimaClave = '';

    function evaluarRadar() {
        const aviso = document.getElementById('aviso-radar');
        if (!aviso) return;
        if (memoriaVelas.length < 8) { aviso.classList.remove('visible'); return; }

        const hallazgos = [];
        RADAR_OBJETIVOS.forEach(obj => {
            const p = radarAnalizarPatron(obj);
            const c = radarAnalizarCiclo(obj);
            if (p || c) hallazgos.push({ obj, p, c });
        });

        if (hallazgos.length === 0) {
            aviso.classList.remove('visible');
            _radarUltimaClave = '';
            return;
        }

        // Primero los que tienen patrón repetido (y ambos motivos); luego Rosa antes que Dorada
        hallazgos.sort((a, b) => ((b.p ? 2 : 0) + (b.c ? 1 : 0)) - ((a.p ? 2 : 0) + (a.c ? 1 : 0)));
        const lineas = [];
        hallazgos.forEach(h => {
            if (h.p) lineas.push(`${h.obj.emoji} Patrón repetido de ${h.p.ventana} velas (visto ${h.p.n} veces): en ${h.p.k} de ${h.p.n} vino ${h.obj.nombre} (${h.p.pct}%) → posible entrada ${h.obj.nombre}`);
            if (h.c) lineas.push(`⏱ Van ${h.c.desde} velas desde la última ${h.obj.nombre.toLowerCase()}; suele repetirse cada ~${h.c.prom}`);
        });

        const principal = hallazgos[0];
        const fuerte = !!(principal.p && principal.c);
        aviso.innerHTML = lineas.join('<br>');
        aviso.style.background = principal.obj.color + 'dd';
        aviso.style.boxShadow = `0 0 25px ${principal.obj.color}`;
        aviso.style.color = principal.obj.color === '#ffd700' ? '#111' : '#fff';
        aviso.classList.add('visible');
        clearTimeout(aviso._timeout);
        aviso._timeout = setTimeout(() => aviso.classList.remove('visible'), 12000);

        const clave = lineas.join('|');
        if (clave !== _radarUltimaClave) {
            _radarUltimaClave = clave;
            const nombre = principal.obj.nombre.toLowerCase();
            let voz;
            if (principal.p) voz = `Patrón repetido. Posible entrada ${nombre}. En ${principal.p.k} de ${principal.p.n} veces vino ${nombre}.`;
            else             voz = `Van ${principal.c.desde} velas desde la última ${nombre}. Suele repetirse cada ${principal.c.prom}.`;
            hablar(voz, fuerte || !!principal.p);
            playTono(fuerte ? 'fuerte' : 'alcista');
            if (fuerte) vibrarSegun('alerta');
        }
    }

    const _addCandleConRadar = addCandleAuto;
    addCandleAuto = function(v, color) {
        _addCandleConRadar(v, color);
        try { evaluarRadar(); } catch (e) { console.warn('Error en radar rosa:', e); }
    };

}); // 👈 ESTA ES LA ÚLTIMA LÍNEA DEL ARCHIVO

 // DOMContentLoaded end






// Llama esta función cada vez que agregues una nueva vela (en addCandleAuto)

