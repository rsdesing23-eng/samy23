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
        if (data.length === 0) return;

        const minY = Math.min(...data);
        const maxY = Math.max(...data);
        const yRange = maxY - minY || 1;

        // Línea principal
        ctx.beginPath();
        ctx.strokeStyle = '#fcfcfc';// color blanco
        ctx.globalAlpha = 0.5;// transparencia
        ctx.lineWidth = 2;// grosor

        data.forEach((p, i) => {
            const x = margin + (i / (data.length - 1)) * chartWidth;// Evita división por cero
            const y = margin + chartHeight - ((p - minY) / yRange) * chartHeight;// Escala y
            if (i === 0) ctx.moveTo(x, y);// Mueve al primer punto
            else ctx.lineTo(x, y);// Dibuja línea hasta el siguiente punto
        });
        ctx.stroke();// Dibuja la línea
        ctx.globalAlpha = 1;// restaura opacidad

        // Puntos
        data.forEach((p, i) => {
            const x = margin + (i / (data.length - 1)) * chartWidth;// Evita división por cero
            const y = margin + chartHeight - ((p - minY) / yRange) * chartHeight;// Escala y
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

    // ===================== GRAFICO 2 (VELAS) =====================
    const candleCanvas = document.getElementById('candlestick-chart');
    const candleCtx = candleCanvas.getContext('2d');
    const candleMargin = 20, candleWidth = 9;// ancho de cada vela
    let candles = [];// {open, close, high, low}

    function drawCandlestickChart() {
        candleCtx.clearRect(0, 0, candleCanvas.width, candleCanvas.height);
        if (candles.length === 0) return;
        const allPrices = candles.flatMap(c => [c.open,c.close,c.high,c.low]);// todos los precios
        const minP = Math.min(...allPrices), maxP = Math.max(...allPrices), yRange = maxP - minP;
        candles.forEach((c,i) => {
            const x = candleMargin + i*(candleWidth+4);
            const scaleY = p => candleMargin + (maxP - p)/yRange*(candleCanvas.height-2*candleMargin);// función para escalar y
            const yH=scaleY(c.high), yL=scaleY(c.low), yO=scaleY(c.open), yC=scaleY(c.close);
            const color = c.close>=c.open?'#00cc66':'#cc3333';
            candleCtx.strokeStyle=color; candleCtx.beginPath();
            candleCtx.moveTo(x+candleWidth/2,yH); candleCtx.lineTo(x+candleWidth/2,yL); candleCtx.stroke();// mecha
            candleCtx.fillStyle=color;// cuerpo
            candleCtx.fillRect(x,Math.min(yO,yC),candleWidth,Math.abs(yC-yO)||1);// evita cuerpo de 0px
        });
    }

    function addCandle(open, close, high, low) {// agrega una vela
        candles.push({open,close,high,low});// agrega la vela
        if(candles.length>60) candles.shift();// mantiene máximo 100 velas
        drawCandlestickChart();
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

    // ===================== BOTONES =====================
    document.getElementById('btn1').addEventListener('click', ()=>addData(-1,'#ba1428')); // roja
    document.getElementById('btn13').addEventListener('click', ()=>addData(-1,'#8b0000')); // Roja grande
    document.getElementById('btn2').addEventListener('click', ()=>addData(1,'#6ceb52')); // verde
    document.getElementById('btn9').addEventListener('click', ()=>addData(1,'#ed4ac7')); // rosa
    document.getElementById('btn10').addEventListener('click', ()=>addData(1,'#ffd700')); // dorada
    document.getElementById('btn3').addEventListener('click', ()=>{data.pop();colors.pop();drawChart();candles.pop();drawCandlestickChart();});
    document.getElementById('btn4').addEventListener('click', ()=>{data=[];colors=[];candles=[];horizontalLines=[];drawChart();drawCandlestickChart();});
    document.getElementById('btn5').addEventListener('click', ()=>addHorizontalLine('#ff0000')); // resistencia
    document.getElementById('btn6').addEventListener('click', ()=>addHorizontalLine('#00cc66')); // soporte
    document.getElementById('btn7').addEventListener('click', clearLastLine); // borrar última línea
    document.getElementById('btn12').addEventListener('click', ()=>addHorizontalLine('#ffff00')); // zona cero

    document.getElementById('btn8').addEventListener('click', () => {
        const now = new Date();
        now.setSeconds(now.getSeconds() + 110);
        document.getElementById('proxima-entrada1').textContent = now.toLocaleTimeString();
    });
    document.getElementById('btn11').addEventListener('click', () => {
        const now = new Date();
        now.setSeconds(now.getSeconds() + 110);
        document.getElementById('proxima-entrada2').textContent = now.toLocaleTimeString();
    });

    // Reloj en vivo
    setInterval(()=>{document.getElementById('time').textContent=new Date().toLocaleTimeString();},1000);

    drawChart(); 
    drawCandlestickChart();
});
