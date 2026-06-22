// Variables de simulación y animación
let simData = null;
let chart = null;
let animationId = null;
let isPlaying = false;
let currentStep = 0;

// Elementos del DOM
const sliderBeta = document.getElementById('slider-beta');
const sliderGamma = document.getElementById('slider-gamma');

const valBeta = document.getElementById('val-beta');
const valGamma = document.getElementById('val-gamma');

const timelineSlider = document.getElementById('timeline-slider');
const currentSimDay = document.getElementById('current-sim-day');

// Paneles de métricas SIR
const valS = document.getElementById('val-s');
const valI = document.getElementById('val-i');
const valR = document.getElementById('val-r');

// Hitos Históricos (Eventos)
const eventItems = document.querySelectorAll('.event-item');

document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    setupSliders();
    runLocalSimulation();

    document.getElementById('play-btn').addEventListener('click', togglePlayback);
    timelineSlider.addEventListener('input', (e) => {
        pausePlayback();
        currentStep = parseInt(e.target.value);
        updateVisualsAtStep(currentStep);
    });
});

// Configurar Pestañas
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');

            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// Configurar Sliders
function setupSliders() {
    const updateValues = () => {
        valBeta.textContent = sliderBeta.value;
        valGamma.textContent = sliderGamma.value;
    };

    [sliderBeta, sliderGamma].forEach(slider => {
        slider.addEventListener('input', () => {
            updateValues();
            runLocalSimulation();
        });
    });

    updateValues();
}

// Ejecutar simulación local de modelo SIR (RK4)
function runLocalSimulation() {
    const N = 100000.0;
    const I0 = 1.0;
    const R0 = 0.0;
    const S0 = N - I0 - R0;

    const beta = parseFloat(sliderBeta.value);
    const gamma = parseFloat(sliderGamma.value);

    const t_max = 10.0;
    const steps = 150;

    const time = [];
    const dt = t_max / (steps - 1);
    for (let i = 0; i < steps; i++) {
        time.push(i * dt);
    }

    const susceptible = new Array(steps);
    const infected = new Array(steps);
    const recovered = new Array(steps);

    susceptible[0] = S0;
    infected[0] = I0;
    recovered[0] = R0;

    const f = (t, y) => {
        let s_val = Math.max(0.0, y[0]);
        let i_val = Math.max(0.0, y[1]);
        let r_val = Math.max(0.0, y[2]);

        const ds = - (beta * s_val * i_val) / N;
        const di = ((beta * s_val * i_val) / N) - (gamma * i_val);
        const dr = gamma * i_val;
        return [ds, di, dr];
    };

    for (let i = 0; i < steps - 1; i++) {
        const t = time[i];
        const h = dt;
        const y_curr = [susceptible[i], infected[i], recovered[i]];

        // RK4 steps
        const k1 = f(t, y_curr);
        
        const y_k2 = [
            y_curr[0] + h * k1[0] / 2,
            y_curr[1] + h * k1[1] / 2,
            y_curr[2] + h * k1[2] / 2
        ];
        const k2 = f(t + h / 2, y_k2);

        const y_k3 = [
            y_curr[0] + h * k2[0] / 2,
            y_curr[1] + h * k2[1] / 2,
            y_curr[2] + h * k2[2] / 2
        ];
        const k3 = f(t + h / 2, y_k3);

        const y_k4 = [
            y_curr[0] + h * k3[0],
            y_curr[1] + h * k3[1],
            y_curr[2] + h * k3[2]
        ];
        const k4 = f(t + h, y_k4);

        const s_next = y_curr[0] + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
        const i_next = y_curr[1] + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
        const r_next = y_curr[2] + (h / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);

        susceptible[i + 1] = Math.max(0.0, Math.min(N, s_next));
        infected[i + 1] = Math.max(0.0, Math.min(N, i_next));
        recovered[i + 1] = Math.max(0.0, Math.min(N, r_next));
    }

    simData = {
        time: time,
        susceptible: susceptible,
        infected: infected,
        recovered: recovered,
        parameters: {
            N: N,
            beta: beta,
            gamma: gamma
        }
    };

    updateChart();

    timelineSlider.max = time.length - 1;
    if (currentStep >= time.length) {
        currentStep = 0;
    }
    timelineSlider.value = currentStep;
    updateVisualsAtStep(currentStep);
}

// Plugin personalizado para Chart.js para dibujar líneas de hitos históricos (Storytelling)
const milestonesPlugin = {
    id: 'milestonesPlugin',
    afterDraw: (chart) => {
        const { ctx, chartArea: { top, bottom, left, right }, scales: { x } } = chart;

        // Hitos en días
        const milestones = [
            { day: 0, label: 'Día 0: Exploit', color: '#a855f7' },
            { day: 1, label: 'Día 1: Infección Masiva', color: '#ef4444' },
            { day: 2, label: 'Día 2: Kill-Switch / Parche', color: '#10b981' }
        ];

        ctx.save();
        milestones.forEach(m => {
            const xPos = x.getPixelForValue(m.day);
            if (xPos >= left && xPos <= right) {
                // Línea vertical punteada
                ctx.strokeStyle = m.color;
                ctx.lineWidth = 1.5;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(xPos, top);
                ctx.lineTo(xPos, bottom);
                ctx.stroke();

                // Texto de la etiqueta
                ctx.fillStyle = '#f8fafc';
                ctx.font = 'bold 9px Fira Code';
                ctx.setLineDash([]); // Quitar punteado para el texto
                ctx.fillText(m.label, xPos + 5, top + 15 + (m.day * 15)); // Desplazar Y un poco para evitar solapes
            }
        });
        ctx.restore();
    }
};

// Registrar plugin en Chart.js
Chart.register(milestonesPlugin);

// Renderizar Gráfico SIR de tres curvas
function updateChart() {
    if (!simData) return;

    const ctx = document.getElementById('sirChart').getContext('2d');

    // Mapear los datos a objetos {x, y} para que la escala lineal funcione correctamente
    const sData = simData.time.map((t, idx) => ({ x: t, y: simData.susceptible[idx] }));
    const iData = simData.time.map((t, idx) => ({ x: t, y: simData.infected[idx] }));
    const rData = simData.time.map((t, idx) => ({ x: t, y: simData.recovered[idx] }));

    if (chart) {
        chart.data.datasets[0].data = sData;
        chart.data.datasets[1].data = iData;
        chart.data.datasets[2].data = rData;
        chart.update();
        return;
    }

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'S (Susceptibles - Vulnerables)',
                    data: sData,
                    borderColor: '#06b6d4',
                    backgroundColor: 'rgba(6, 182, 212, 0.05)',
                    borderWidth: 2.5,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    tension: 0.1,
                    fill: false
                },
                {
                    label: 'I (Infectados - WannaCry Activo)',
                    data: iData,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.05)',
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    tension: 0.1,
                    fill: false
                },
                {
                    label: 'R (Recuperados - Parcheados)',
                    data: rData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.05)',
                    borderWidth: 2.5,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    tension: 0.1,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#f8fafc',
                        font: { family: 'Outfit', size: 11 }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    titleFont: { family: 'Space Grotesk' },
                    bodyFont: { family: 'Fira Code' },
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label.split(' ')[0]}: ${Math.round(context.raw.y).toLocaleString()} equipos`;
                        },
                        title: function (context) {
                            return `Día: ${parseFloat(context[0].raw.x).toFixed(1)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear', // Para que el plugin dibuje correctamente en escala continua de días
                    min: 0,
                    max: 10,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#94a3b8',
                        font: { family: 'Fira Code' }
                    },
                    title: {
                        display: true,
                        text: 'Días Transcurridos',
                        color: '#f8fafc',
                        font: { family: 'Outfit' }
                    }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#94a3b8',
                        font: { family: 'Fira Code' }
                    },
                    title: {
                        display: true,
                        text: 'Cantidad de Computadoras',
                        color: '#f8fafc',
                        font: { family: 'Outfit' }
                    }
                }
            }
        }
    });
}

// Actualizar visualizaciones e hitos interactivos en cada paso
function updateVisualsAtStep(step) {
    if (!simData) return;

    const day = simData.time[step];
    const sVal = Math.round(simData.susceptible[step]);
    const iVal = Math.round(simData.infected[step]);
    const rVal = Math.round(simData.recovered[step]);

    // Actualizar Textos
    currentSimDay.textContent = `${day.toFixed(1)} días`;
    valS.textContent = sVal.toLocaleString();
    valI.textContent = iVal.toLocaleString();
    valR.textContent = rVal.toLocaleString();

    // Storytelling: Resaltar hitos históricos del malware basados en el día simulado
    eventItems.forEach(item => {
        const startDay = parseFloat(item.getAttribute('data-start'));
        const endDay = parseFloat(item.getAttribute('data-end'));

        if (day >= startDay && day < endDay) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Sincronizar indicador de gráfico
    if (chart) {
        chart.setActiveElements([
            { datasetIndex: 0, index: step },
            { datasetIndex: 1, index: step },
            { datasetIndex: 2, index: step }
        ]);
        chart.update('none');
    }
}

// Reproducción automática de la simulación
function togglePlayback() {
    const playBtn = document.getElementById('play-btn');
    if (isPlaying) {
        pausePlayback();
        playBtn.innerHTML = '&#9654;';
    } else {
        startPlayback();
        playBtn.innerHTML = '&#10074;&#10074;';
    }
}

function startPlayback() {
    isPlaying = true;

    const run = () => {
        if (!isPlaying) return;

        currentStep++;
        if (currentStep >= simData.time.length) {
            currentStep = 0;
        }

        timelineSlider.value = currentStep;
        updateVisualsAtStep(currentStep);

        animationId = setTimeout(run, 60);
    };

    run();
}

// Pausar reproducción
function pausePlayback() {
    isPlaying = false;
    if (animationId) {
        clearTimeout(animationId);
        animationId = null;
    }
}
