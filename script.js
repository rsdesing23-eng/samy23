document.addEventListener('DOMContentLoaded', function() {
    // App 1
    const capitalInput = document.getElementById('capital');// se refiere al input de capital
    const generateBetBtn = document.getElementById('generate-bet');
    const winBetBtn = document.getElementById('win-bet');
    const loseBetBtn = document.getElementById('lose-bet');
    const resetBtn = document.getElementById('reset');
    const betAmountDisplay = document.getElementById('bet-amount');// se refiere a la cantidad de apuesta
    const sessionGoalDisplay = document.getElementById('session-goal');

    let capital = 0;
    let betAmount = 0;
    let currentBank = 0;
    let sessionGoal = 0;

    function updateDisplays() {
        betAmountDisplay.textContent = `${betAmount.toFixed(2)} / ${(betAmount * 2).toFixed(2)}`;
        sessionGoalDisplay.textContent = sessionGoal.toFixed(2);
    }

    function generateFirstBet() {
        capital = parseFloat(capitalInput.value);
        if (isNaN(capital) || capital <= 0) {
            alert('Por favor, ingresa un monto válido.');
            return;
        }
        sessionGoal = capital * 0.2;// objetivo de la sesión del 20% del capital
        betAmount = capital * 0.02;// apuesta inicial del 2% del capital
        currentBank = capital;
        updateDisplays();
    }

    function processWin() {
        currentBank += betAmount;// se refiere a sumar la cantidad ganada al banco actual
        betAmount *= 1.2;// se refiere a aumentar la apuesta en un 20%
        updateDisplays();
    }   

    function processLoss() {
        currentBank -= betAmount;
        betAmount *= 1.5;
        if (betAmount < capital * 0.01) {// apuesta mínima del 1% del capital
            betAmount = capital * 0.01;// se refiere a la apuesta mínima
        }
        updateDisplays();
    }

    function reset() {
        capitalInput.value = '';
        betAmountDisplay.textContent = '-';
        sessionGoalDisplay.textContent = '-';
        capital = 0;
        betAmount = 0;
        currentBank = 0;
        sessionGoal = 0;
    }

    generateBetBtn.addEventListener('click', generateFirstBet);// se refiere al botón de generar apuesta
    winBetBtn.addEventListener('click', processWin);
    loseBetBtn.addEventListener('click', processLoss);
    resetBtn.addEventListener('click', reset);

    // App 2
    const canvas = document.getElementById('chart');// se refiere al lienzo del gráfico
    const ctx = canvas.getContext('2d');// se refiere al contexto del lienzo

    const margin = 20;// se refiere al margen del gráfico
    canvas.width = 800;// se refiere al ancho del lienzo
    canvas.height = 600;// se refiere a la altura del lienzo
    const chartWidth = canvas.width - 2 * margin; // se refiere al ancho del gráfico
    const chartHeight = canvas.height - 2 * margin;

    let data = [];
    let accumulatedSum = 0;// se refiere a la suma acumulada de los datos
    let colors = [];

    let horizontalLines = [];// se refiere a las líneas horizontales del gráfico

    function drawChart() {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // se refiere a limpiar el lienzo

        const minY = Math.min(...data);// se refiere al valor mínimo de los datos
        const maxY = Math.max(...data);// se refiere al valor máximo de los datos
        const yRange = maxY - minY;

        data.forEach((point, index) => {
            const x = margin + (index / (data.length - 1)) * chartWidth; // se refiere a la posición horizontal del punto
            const y = margin + chartHeight - ((point - minY) / yRange) * chartHeight; // se refiere a la posición vertical del punto
            ctx.fillStyle = colors[index] || '#66a3ff'; // se refiere al color del punto

            ctx.shadowColor = colors[index] || '#66a3ff';// se refiere al color de la sombra del punto
            ctx.shadowBlur = 20; // se refiere al desenfoque de la sombra

            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);// se refiere a dibujar un círculo
            ctx.fill();

            ctx.shadowBlur = 0; // se resetea el desenfoque de la sombra
        });

        ctx.strokeStyle = '#fcfcfc';// se refiere al color de la línea del gráfico
        ctx.globalAlpha = 0.5; //se refiere a la opacidad de la línea
        ctx.lineWidth = 2;  //se refiere al grosor de la línea
        ctx.beginPath();// se refiere a iniciar un nuevo camino para dibujar la línea
        data.forEach((point, index) => {
            const x = margin + (index / (data.length - 1)) * chartWidth;
            const y = margin + chartHeight - ((point - minY) / yRange) * chartHeight;
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        ctx.globalAlpha = 1; //se resetea la opacidad

        horizontalLines.forEach(line => {
            ctx.strokeStyle = line.color;
            ctx.setLineDash([5, 5]);
            ctx.lineWidth = 2; // se refiere al grosor de la línea
            ctx.beginPath();
            ctx.moveTo(margin, line.y);
            ctx.lineTo(canvas.width - margin, line.y);// se refiere a dibujar la línea horizontal
            ctx.stroke();
        });
    }

    function addData(value, color = '#66a3ff') {// se refiere a añadir datos al gráfico
        if (data.length >= 100) {
            data.shift();
            colors.shift();
        }
        let newValue = value;// se refiere al nuevo valor que se va a añadir al gráfico
        if (data.length > 0) {
            newValue += data[data.length - 1];// se refiere a añadir el nuevo valor al último valor del gráfico
        }
        data.push(newValue);
        colors.push(color);// se refiere a añadir el color del nuevo valor al gráfico

        horizontalLines.forEach(line => {// se refiere a actualizar las líneas horizontales
            line.y = margin + chartHeight - ((line.value - Math.min(...data)) / (Math.max(...data) - Math.min(...data))) * chartHeight;
        });

        drawChart();
    }

    function addHorizontalLine(value, color) {
        const y = margin + chartHeight - ((value - Math.min(...data)) / (Math.max(...data) - Math.min(...data))) * chartHeight;
        horizontalLines.push({ value: value, y: y, color: color });
        drawChart();
    }

    function clearLastLine() {// se refiere a eliminar la última línea horizontal del gráfico
        if (horizontalLines.length > 0) {
            horizontalLines.pop();
            drawChart();
        }
    }

    function deleteLastData() {
        if (data.length > 0) {
            const lastData = data.pop();
            colors.pop();
            accumulatedSum -= lastData;
            drawChart();
        }
    }

    function getCurrentTime() {
        const now = new Date();
        now.setSeconds(now.getSeconds() - 10);
        return now.toLocaleTimeString();
    }

    document.getElementById('btn11').addEventListener('click', () => {
        const now = new Date();
        now.setSeconds(now.getSeconds() + 110);
        const nextEntryTime = new Date(now);
        document.getElementById('proxima-entrada2').textContent = nextEntryTime.toLocaleTimeString();
    });

    document.getElementById('btn8').addEventListener('click', () => {
        const now = new Date();
        now.setSeconds(now.getSeconds() + 110);
        const nextEntryTime = new Date(now);
        document.getElementById('proxima-entrada1').textContent = nextEntryTime.toLocaleTimeString();
    });

    document.getElementById('btn1').addEventListener('click', () => addData(-1 ,'#ba1428'));// se refiere a añadir datos negativos al gráfico
    document.getElementById('btn2').addEventListener('click', () => addData(1, '#6ceb52'));// se refiere a añadir datos positivos al gráfico
    document.getElementById('btn3').addEventListener('click', deleteLastData);// se refiere a eliminar el último dato del gráfico
    document.getElementById('btn4').addEventListener('click', () => {// se refiere a reiniciar el gráfico
        data = [];
        colors = [];
        accumulatedSum = 0;
        drawChart();
    });

    document.getElementById('btn5').addEventListener('click', () => {
        if (data.length > 0) {
            addHorizontalLine(data[data.length - 1], '#FF0000');
        }
    });

    document.getElementById('btn6').addEventListener('click', () => {
        if (data.length > 0) {
            addHorizontalLine(data[data.length - 1], '#00cc66');
        }
    });

    document.getElementById('btn12').addEventListener('click', () => {
        if (data.length > 0) {
            addHorizontalLine(data[data.length - 1], '#FFFF00');
        }
    });

    document.getElementById('btn7').addEventListener('click', clearLastLine);
    document.getElementById('btn9').addEventListener('click', () => addData(1, '#ed4ac7'));// se refiere a añadir datos de un color específico al gráfico
    document.getElementById('btn10').addEventListener('click', () => addData(1, '#ffd700'));// se refiere a añadir datos de otro color específico al gráfico

    setInterval(() => {
        document.getElementById('time').textContent = getCurrentTime();// se refiere a actualizar el tiempo actual en el gráfico
    }, 1000);

    drawChart();
});
