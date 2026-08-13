document.addEventListener('DOMContentLoaded', function() {
    // ===================== LÓGICA DE APUESTAS =====================
    const capitalInput = document.getElementById('capital');
    const generateBetBtn = document.getElementById('generate-bet');
    const winBetBtn = document.getElementById('win-bet');
    const loseBetBtn = document.getElementById('lose-bet');
    const resetBtn = document.getElementById('reset');
    const betAmountDisplay = document.getElementById('bet-amount');
    const sessionGoalDisplay = document.getElementById('session-goal');

    let capital = 0, betAmount = 0, currentBank = 0, sessionGoal = 0;

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
    let data = [], colors = [], horizontalLines = [];
    const margin = 20, chartWidth = canvas.width - 2 * margin, chartHeight = canvas.height - 2 * margin;

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
        data.forEach((p, i) => {
            const x = margin + (i / (data.length - 1)) * chartWidth;
            const y = margin + chartHeight - ((p - minY) / yRange) * chartHeight;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Puntos
        data.forEach((p, i) => {
            const x = margin + (i / (data.length - 1)) * chartWidth;
            const y = margin + chartHeight - ((p - minY) / yRange) * chartHeight;
            const color = colors[i] || '#66a3ff';
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.shadowBlur = 0;
        });

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

    function addData(v, color = '#66a3ff') {
        if (data.length >= 100) { data.shift(); colors.shift(); }
        let newVal = data.length > 0 ? v + data[data.length - 1] : v;
        data.push(newVal);
        colors.push(color);
        drawChart();
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

    // ===================== GRAFICO 2 (VELAS) =====================
    const candleCanvas = document.getElementById('candlestick-chart');
    const candleCtx = candleCanvas.getContext('2d');
    const candleMargin = 20, candleWidth = 9;
    let candles = [];

    function drawCandlestickChart() {
        candleCtx.clearRect(0, 0, candleCanvas.width, candleCanvas.height);
        if (candles.length === 0) return;
        const allPrices = candles.flatMap(c => [c.open,c.close,c.high,c.low]);
        const minP = Math.min(...allPrices), maxP = Math.max(...allPrices), yRange = maxP - minP;
        candles.forEach((c,i) => {
            const x = candleMargin + i*(candleWidth+4);
            const scaleY = p => candleMargin + (maxP - p)/yRange*(candleCanvas.height-2*candleMargin);
            const yH=scaleY(c.high), yL=scaleY(c.low), yO=scaleY(c.open), yC=scaleY(c.close);
            const color = c.close>=c.open?'#00cc66':'#cc3333';
            candleCtx.strokeStyle=color; candleCtx.beginPath();
            candleCtx.moveTo(x+candleWidth/2,yH); candleCtx.lineTo(x+candleWidth/2,yL); candleCtx.stroke();
            candleCtx.fillStyle=color;
            candleCtx.fillRect(x,Math.min(yO,yC),candleWidth,Math.abs(yC-yO)||1);
        });
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
  document.getElementById('btn4').addEventListener('click', () => {
    data = [];
    colors = [];
    candles = [];
    horizontalLines = [];
    drawChart();
    drawCandlestickChart();

    // 🔁 Reinicia el contador de tendencia
    trendData = { bull: 0, bear: 0 };
    updateTrendCounter();

    // (opcional) feedback visual
    const trendBox = document.getElementById('trend-summary');
    if (trendBox) {
        trendBox.style.transition = 'background-color 0.5s';
        trendBox.style.backgroundColor = 'rgba(0,255,255,0.4)';
        setTimeout(() => trendBox.style.backgroundColor = 'rgba(0,0,0,0.6)', 1000);
    }

    console.log("✅ Gráficos y tendencia reiniciados.");
});

}

    // ===================== BOTONES =====================
    document.getElementById('btn1').addEventListener('click', ()=>addData(-1,'#ba1428'));
    document.getElementById('btn13').addEventListener('click', ()=>addData(-1,'#8b0000'));
    document.getElementById('btn2').addEventListener('click', ()=>addData(1,'#6ceb52'));
    document.getElementById('btn9').addEventListener('click', ()=>addData(1,'#ed4ac7'));
    document.getElementById('btn10').addEventListener('click', ()=>addData(1,'#ffd700'));
    document.getElementById('btn3').addEventListener('click', ()=>{data.pop();colors.pop();drawChart();candles.pop();drawCandlestickChart();});
    document.getElementById('btn4').addEventListener('click', ()=>{data=[];colors=[];candles=[];horizontalLines=[];drawChart();drawCandlestickChart();});
    document.getElementById('btn5').addEventListener('click', ()=>addHorizontalLine('#ff0000'));
    document.getElementById('btn6').addEventListener('click', ()=>addHorizontalLine('#00cc66'));
    document.getElementById('btn7').addEventListener('click', clearLastLine);
    document.getElementById('btn12').addEventListener('click', ()=>addHorizontalLine('#ffff00'));

 // === Gestión de Entradas A y B con alarma ===
function setEntrada(timerId, labelId) {
  const waitSeconds = 110; // ⏱ tiempo de espera
  const now = new Date();
  now.setSeconds(now.getSeconds() + waitSeconds);
  const horaObjetivo = now.toLocaleTimeString();

  const label = document.getElementById(labelId);
  label.textContent = horaObjetivo;
  label.dataset.targetTime = now.getTime();
  label.style.color = "#00ffff";
  label.style.textShadow = "0 0 10px #00ffff";

  // Eliminar aviso anterior si existía
  clearTimeout(label._timeout);
  clearInterval(label._interval);

  // Intervalo para comprobar cada segundo
  label._interval = setInterval(() => {
    const ahora = Date.now();
    const diff = label.dataset.targetTime - ahora;
    if (diff <= 0) {
      clearInterval(label._interval);
      triggerEntradaAlert(labelId);
    }
  }, 1000);
}

// === Alerta cuando llega la hora ===
function triggerEntradaAlert(labelId) {
  const label = document.getElementById(labelId);
  const container = label.parentElement;

  // 🔔 Sonido corto
  playBeep(200, 900, 0.2);

  // 💡 Parpadeo visual durante 5s
  let count = 0;
  const blink = setInterval(() => {
    container.classList.toggle("blink-alert");
    if (++count >= 10) {
      clearInterval(blink);
      container.classList.remove("blink-alert");
      label.style.color = "#ff0";
      label.textContent += " ⚠️";
        showCentralEntradaAlert(label.id);
    }
  }, 500);
}
// === Mostrar mensaje de alerta central al cumplirse la hora ===
function showCentralEntradaAlert(labelId) {
  let msgText = labelId === "proxima-entrada1"
    ? "⏰ Posible señal alta"
    : "⏰ Posible señal alta";

  const msgDiv = document.getElementById("pattern-center-message");
  if (!msgDiv) return;

  // Mostrar mensaje con animación
  msgDiv.textContent = msgText;
  msgDiv.classList.add("visible");
  msgDiv.style.color = "#ffff00";
  msgDiv.style.textShadow = "0 0 15px #ffff66";
  msgDiv.style.boxShadow = "0 0 20px rgba(255,255,0,0.8)";
  msgDiv.style.backgroundColor = "rgba(0, 0, 0, 0.6)";

  // Ocultar mensaje después de 5 segundos
  clearTimeout(msgDiv._alertTimeout);
  msgDiv._alertTimeout = setTimeout(() => {
    msgDiv.classList.remove("visible");
    msgDiv.textContent = "⚪ Sin patrón detectado...";
    msgDiv.style.color = "#00ffff";
    msgDiv.style.textShadow = "0 0 10px #00ffff";
    msgDiv.style.boxShadow = "0 0 10px rgba(0,255,255,0.4)";
  }, 5000);
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
    }

    function clearLastLine() {
        if (horizontalLines.length > 0) {
            horizontalLines.pop();
            drawChart();
        }
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
        return { color: colorGanador, veces, total, firma: actual };
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

        aviso.textContent = `🔁 Figura repetida ×${coincide[1]} — posible patrón: ${nombreColor} (${confianza}% de las veces)`;
        aviso.style.background = prediccion.color + 'dd';
        aviso.style.boxShadow = `0 0 25px ${prediccion.color}`;
        aviso.style.color = (prediccion.color === '#ffd700') ? '#111' : '#fff';
        aviso.classList.add('visible');

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
        const cuerpoTabla = document.getElementById('tabla-patrones-body');
        if (!elVelas || !cuerpoTabla) return;

        elVelas.textContent = memoriaVelas.length;
        elPatrones.textContent = memoriaPatrones.length;

        const stats = calcularEstadisticasPatrones();
        let totalUp = 0, totalDown = 0, totalResueltos = 0;
        cuerpoTabla.innerHTML = '';

        Object.entries(stats)
            .sort((a, b) => b[1].total - a[1].total)
            .forEach(([nombre, s]) => {
                totalUp += s.up; totalDown += s.down; totalResueltos += s.total;
                const pctUp = s.total ? Math.round((s.up / s.total) * 100) : 0;
                const pctDown = s.total ? Math.round((s.down / s.total) * 100) : 0;
                const fila = document.createElement('tr');
                fila.innerHTML = `<td>${nombreCortoPatron(nombre)}</td><td>${s.total}</td><td class="prob-up">${pctUp}%</td><td class="prob-down">${pctDown}%</td>`;
                cuerpoTabla.appendChild(fila);
            });

        if (elProbUp) elProbUp.textContent = totalResueltos ? Math.round((totalUp / totalResueltos) * 100) + '%' : '--%';
        if (elProbDown) elProbDown.textContent = totalResueltos ? Math.round((totalDown / totalResueltos) * 100) + '%' : '--%';

        // Secuencias de 3 colores y de 5 colores, cada una con su conteo de repeticiones
        renderizarListaFiguras(document.getElementById('lista-figuras-repetidas'), 3);
        renderizarListaFiguras(document.getElementById('lista-figuras-repetidas-5'), 5);
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
            try { evaluarAvisoFiguraRepetida(); } catch (e) { console.warn('Error evaluando aviso de figura:', e); }
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
            if (n >= 4) { playTono('racha'); vibrarSegun('racha'); }

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

}); // 👈 ESTA ES LA ÚLTIMA LÍNEA DEL ARCHIVO

 // DOMContentLoaded end






// Llama esta función cada vez que agregues una nueva vela (en addCandleAuto)

