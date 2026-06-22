// Variables globales
let simData = null;
let chart = null;
let animationId = null;
let isPlaying = false;
let currentStep = 0;

// Elementos del DOM
const sliderT0 = document.getElementById('slider-t0');
const sliderTm = document.getElementById('slider-tm');
const sliderK = document.getElementById('slider-k');

const valT0 = document.getElementById('val-t0');
const valTm = document.getElementById('val-tm');
const valK = document.getElementById('val-k');

const timelineSlider = document.getElementById('timeline-slider');
const currentSimTime = document.getElementById('current-sim-time');
const tempBadgeVal = document.getElementById('temp-badge-val');
const playBtn = document.getElementById('play-btn');
const pizzaContainer = document.querySelector('.pizza-container');

// Inicializar al cargar el documento
document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    setupSliders();
    runLocalSimulation();

    playBtn.addEventListener('click', togglePlayback);
    timelineSlider.addEventListener('input', (e) => {
        pausePlayback();
        currentStep = parseInt(e.target.value);
        updateVisualsAtStep(currentStep);
    });
});

// Configuración de pestañas
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

// Configuración de Sliders
function setupSliders() {
    const updateValues = () => {
        valT0.textContent = `${sliderT0.value}°C`;
        valTm.textContent = `${sliderTm.value}°C`;
        valK.textContent = sliderK.value;
    };

    [sliderT0, sliderTm, sliderK].forEach(slider => {
        slider.addEventListener('input', () => {
            updateValues();
            runLocalSimulation();
        });
    });

    updateValues();
}

// Resolvedor Numérico Runge-Kutta de 4to Orden (RK4) y Analítico local en JavaScript
function runLocalSimulation() {
    const T0 = parseFloat(sliderT0.value);
    const Tm = parseFloat(sliderTm.value);
    const k = parseFloat(sliderK.value);
    const t_max = 90.0;
    const steps = 180;

    // Generar t_span
    const time = [];
    const dt = t_max / (steps - 1);
    for (let i = 0; i < steps; i++) {
        time.push(i * dt);
    }

    // Ecuación diferencial: f(t, T) = -k * (T - Tm)
    const f = (t, T) => -k * (T - Tm);

    const temp_numerical = new Array(steps);
    temp_numerical[0] = T0;

    for (let i = 0; i < steps - 1; i++) {
        const t = time[i];
        const curr_T = temp_numerical[i];
        const h = dt;

        const k1 = f(t, curr_T);
        const k2 = f(t + h / 2, curr_T + (h * k1) / 2);
        const k3 = f(t + h / 2, curr_T + (h * k2) / 2);
        const k4 = f(t + h, curr_T + h * k3);

        temp_numerical[i + 1] = curr_T + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
    }

    // Solución analítica exacta
    const temp_analytical = time.map(t => Tm + (T0 - Tm) * Math.exp(-k * t));

    simData = {
        time: time,
        temp_numerical: temp_numerical,
        temp_analytical: temp_analytical,
        parameters: {
            T0: T0,
            Tm: Tm,
            k: k
        }
    };

    updateChart();

    // Reajustar la línea de tiempo
    timelineSlider.max = time.length - 1;
    if (currentStep >= time.length) {
        currentStep = 0;
    }
    timelineSlider.value = currentStep;
    updateVisualsAtStep(currentStep);
}

// Actualizar gráfico Chart.js
function updateChart() {
    if (!simData) return;

    const ctx = document.getElementById('coolingChart').getContext('2d');

    if (chart) {
        chart.data.labels = simData.time.map(t => t.toFixed(1));
        chart.data.datasets[0].data = simData.temp_numerical;
        chart.data.datasets[1].data = simData.temp_analytical;
        chart.update();
        return;
    }

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: simData.time.map(t => t.toFixed(1)),
            datasets: [
                {
                    label: 'RK4 (Numérico)',
                    data: simData.temp_numerical,
                    borderColor: '#f97316',
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    tension: 0.1
                },
                {
                    label: 'Exacto (Analítico)',
                    data: simData.temp_analytical,
                    borderColor: '#f43f5e',
                    borderDash: [5, 5],
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    fill: false,
                    tension: 0.1
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
                        font: { family: 'Outfit', size: 12 }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    titleFont: { family: 'Space Grotesk' },
                    bodyFont: { family: 'Outfit' },
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: ${context.raw.toFixed(2)} °C`;
                        },
                        title: function (context) {
                            return `Tiempo: ${context[0].label} min`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#94a3b8',
                        font: { family: 'Outfit' },
                        maxTicksLimit: 10
                    },
                    title: {
                        display: true,
                        text: 'Tiempo (minutos)',
                        color: '#f8fafc',
                        font: { family: 'Outfit', size: 13 }
                    }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#94a3b8',
                        font: { family: 'Outfit' }
                    },
                    title: {
                        display: true,
                        text: 'Temperatura (°C)',
                        color: '#f8fafc',
                        font: { family: 'Outfit', size: 13 }
                    }
                }
            }
        }
    });
}

// Actualizar visualizaciones en el paso temporal actual
function updateVisualsAtStep(step) {
    if (!simData) return;

    const time = simData.time[step];
    const temp = simData.temp_numerical[step];
    const T0 = simData.parameters.T0;
    const Tm = simData.parameters.Tm;

    // Actualizar textos
    currentSimTime.textContent = `${time.toFixed(1)} min`;
    tempBadgeVal.textContent = `${temp.toFixed(1)}°C`;

    // Calcular factor de calor (0 = T_m, 1 = T_0)
    let heatFactor = 0;
    if (T0 > Tm) {
        heatFactor = Math.max(0, Math.min(1, (temp - Tm) / (T0 - Tm)));
    }

    // Pasar factor a CSS para actualizar colores de queso/salsa e intensidad de vapor
    pizzaContainer.style.setProperty('--pizza-heat', heatFactor);

    // Mover cursor indicador en el gráfico si existe
    if (chart) {
        chart.setActiveElements([{
            datasetIndex: 0,
            index: step
        }]);
        chart.update('none'); // Sin animación para velocidad
    }
}

// Controlar reproducción
function togglePlayback() {
    if (isPlaying) {
        pausePlayback();
    } else {
        startPlayback();
    }
}

// Empezar reproducción
function startPlayback() {
    isPlaying = true;
    playBtn.innerHTML = '&#10074;&#10074;'; // Ícono de pausa

    const run = () => {
        if (!isPlaying) return;

        currentStep++;
        if (currentStep >= simData.time.length) {
            currentStep = 0;
        }

        timelineSlider.value = currentStep;
        updateVisualsAtStep(currentStep);

        animationId = setTimeout(run, 50); // Controla la velocidad de reproducción
    };

    run();
}

// Pausar reproducción
function pausePlayback() {
    isPlaying = false;
    playBtn.innerHTML = '&#9654;'; // Ícono de play
    if (animationId) {
        clearTimeout(animationId);
        animationId = null;
    }
}
