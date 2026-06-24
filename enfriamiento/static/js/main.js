/**
 * ==========================================================================
 * LÓGICA DE SIMULACIÓN Y VISUALIZACIÓN - ENFRIAMIENTO DE NEWTON
 * Gestiona consultas GET reactivas, renderizado de curvas suavizadas con gradientes,
 * y animación termoreactiva del termómetro y rebanada de pizza.
 * ==========================================================================
 */

// Variables globales de simulación y animación
let simData = null;       // Datos de series temporales devueltos por el API Flask
let chart = null;         // Instancia del gráfico Chart.js
let animationId = null;   // ID del timeout de reproducción animada
let isPlaying = false;    // Estado de la animación
let currentStep = 0;      // Paso seleccionado actual (0 a 179)

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

/**
 * Evento inicial: Enlace de escuchas y primera llamada
 */
document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    setupSliders();
    fetchSimulation();

    // Enlazar controles de reproducción y timeline
    playBtn.addEventListener('click', togglePlayback);
    timelineSlider.addEventListener('input', (e) => {
        pausePlayback();
        currentStep = parseInt(e.target.value);
        updateVisualsAtStep(currentStep);
    });
});

/**
 * Configurar selector de pestañas
 */
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

/**
 * Configurar Sliders reactivos
 */
function setupSliders() {
    const updateValues = () => {
        valT0.textContent = `${sliderT0.value}°C`;
        valTm.textContent = `${sliderTm.value}°C`;
        valK.textContent = parseFloat(sliderK.value).toFixed(2);
    };

    [sliderT0, sliderTm, sliderK].forEach(slider => {
        slider.addEventListener('input', () => {
            updateValues();
            fetchSimulation(); // Recalcular curvas en tiempo real en el servidor Python
        });
    });

    updateValues();
}

/**
 * Consultar al servidor Flask para resolver la EDO con RK4
 */
async function fetchSimulation() {
    const T0 = sliderT0.value;
    const Tm = sliderTm.value;
    const k = sliderK.value;

    try {
        const response = await fetch(`/enfriamiento/api/simulate?T0=${T0}&Tm=${Tm}&k=${k}&t_max=90&steps=180`);
        const data = await response.json();

        if (data.success) {
            simData = data;
            
            // Dibujar o actualizar gráfico
            updateChart();

            // Reajustar límites de la línea de tiempo temporal
            timelineSlider.max = data.time.length - 1;
            if (currentStep >= data.time.length) {
                currentStep = 0;
            }
            timelineSlider.value = currentStep;
            updateVisualsAtStep(currentStep);
        } else {
            console.error("Error devuelto en simulación térmica:", data.error);
        }
    } catch (err) {
        console.error("Error al conectar con la API de enfriamiento:", err);
    }
}

/**
 * Generar / Actualizar Gráfico de Chart.js
 * Crea gradientes de color térmicos personalizados y suaviza las líneas de integración.
 */
function updateChart() {
    if (!simData) return;

    const ctx = document.getElementById('coolingChart').getContext('2d');

    // TRUCO VISUAL: Creación de gradientes verticales para curvas térmicas
    const numericalGradient = ctx.createLinearGradient(0, 0, 0, 300);
    numericalGradient.addColorStop(0, 'rgba(249, 115, 22, 0.22)');
    numericalGradient.addColorStop(1, 'rgba(249, 115, 22, 0.00)');

    const analyticalGradient = ctx.createLinearGradient(0, 0, 0, 300);
    analyticalGradient.addColorStop(0, 'rgba(244, 63, 94, 0.15)');
    analyticalGradient.addColorStop(1, 'rgba(244, 63, 94, 0.00)');

    if (chart) {
        chart.data.labels = simData.time.map(t => t.toFixed(1));
        chart.data.datasets[0].data = simData.temp_numerical;
        chart.data.datasets[1].data = simData.temp_analytical;
        chart.data.datasets[0].backgroundColor = numericalGradient;
        chart.data.datasets[1].backgroundColor = analyticalGradient;
        chart.update();
        return;
    }

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: simData.time.map(t => t.toFixed(1)),
            datasets: [
                {
                    label: 'RK4 (Numérico Integrado)',
                    data: simData.temp_numerical,
                    borderColor: '#f97316',
                    backgroundColor: numericalGradient,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#f97316',
                    pointHoverBorderColor: '#ffffff',
                    tension: 0.4, // Curva suavizada premium
                    fill: true
                },
                {
                    label: 'Exacto (Solución Analítica)',
                    data: simData.temp_analytical,
                    borderColor: '#f43f5e',
                    backgroundColor: analyticalGradient,
                    borderDash: [5, 5],
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    tension: 0.4, // Curva suavizada premium
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#f8fafc',
                        font: { family: 'Outfit', size: 11, weight: '600' }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(18, 20, 32, 0.95)',
                    titleColor: '#f97316',
                    titleFont: { family: 'Space Grotesk', size: 12, weight: 'bold' },
                    bodyFont: { family: 'Outfit', size: 11 },
                    borderColor: 'rgba(249, 115, 22, 0.25)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label.split(' ')[0]}: ${context.raw.toFixed(2)} °C`;
                        },
                        title: function (context) {
                            return `TIEMPO: ${context[0].label} minutos`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: {
                        color: '#8b95a5',
                        font: { family: 'Fira Code', size: 10 },
                        maxTicksLimit: 12
                    },
                    title: {
                        display: true,
                        text: 'Tiempo transcurrido (minutos)',
                        color: '#8b95a5',
                        font: { family: 'Space Grotesk', size: 11, weight: 'bold' }
                    }
                },
                y: {
                    min: 0,
                    max: 300,
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: {
                        color: '#8b95a5',
                        font: { family: 'Fira Code', size: 10 }
                    },
                    title: {
                        display: true,
                        text: 'Temperatura (°C)',
                        color: '#8b95a5',
                        font: { family: 'Space Grotesk', size: 11, weight: 'bold' }
                    }
                }
            }
        }
    });
}

/**
 * TRUCO VISUAL: Interpolación HSL de color según la temperatura.
 * Retorna un color que va de azul hielo (frío, <20°C) a rojo fuego (caliente, >200°C).
 */
function getThermalColor(temp) {
    const minTemp = 10;
    const maxTemp = 220;
    let ratio = (temp - minTemp) / (maxTemp - minTemp);
    ratio = Math.max(0, Math.min(1, ratio)); // Clampar entre 0 y 1
    
    // En HSL: 210° es azul frío, 0° es rojo caliente
    const hue = 210 - (ratio * 210);
    return `hsl(${hue}, 85%, 50%)`;
}

/**
 * Actualizar visualizaciones físicas y termómetro en el paso actual
 */
function updateVisualsAtStep(step) {
    if (!simData) return;

    const time = simData.time[step];
    const temp = simData.temp_numerical[step];
    const T0 = simData.parameters.T0;
    const Tm = simData.parameters.Tm;

    // Actualizar recuadros informativos del HUD
    currentSimTime.textContent = `${time.toFixed(1)} min`;
    tempBadgeVal.textContent = `${temp.toFixed(1)}°C`;

    // Sincronizar rebanada de pizza (Queso/Salsa)
    // El factor de calor va de 0 (ambiente T_m) a 1 (inicial T_0)
    let heatFactor = 0;
    if (T0 > Tm) {
        heatFactor = Math.max(0, Math.min(1, (temp - Tm) / (T0 - Tm)));
    }
    pizzaContainer.style.setProperty('--pizza-heat', heatFactor);

    // TRUCO VISUAL: Actualizar el termómetro dinámico de laboratorio
    // El rango físico del termómetro es de 0°C a 300°C
    const thermPercent = Math.max(0, Math.min(100, (temp / 300) * 100));
    const thermColor = getThermalColor(temp);

    const visualizer = document.querySelector('.thermal-visualizer-container');
    visualizer.style.setProperty('--thermometer-height', `${thermPercent}%`);
    visualizer.style.setProperty('--thermometer-color', thermColor);

    // Sincronizar rellenos de progreso bajo los sliders de control
    const t0Percent = ((sliderT0.value - sliderT0.min) / (sliderT0.max - sliderT0.min)) * 100;
    const tmPercent = ((sliderTm.value - sliderTm.min) / (sliderTm.max - sliderTm.min)) * 100;
    const kPercent = ((sliderK.value - sliderK.min) / (sliderK.max - sliderK.min)) * 100;
    const timelinePercent = (step / (simData.time.length - 1)) * 100;

    document.querySelector('.fill-t0').style.width = `${t0Percent}%`;
    document.querySelector('.fill-tm').style.width = `${tmPercent}%`;
    document.querySelector('.fill-k').style.width = `${kPercent}%`;
    document.querySelector('.fill-timeline').style.width = `${timelinePercent}%`;

    // Sincronizar indicador interactivo flotante en el gráfico de Chart.js
    if (chart) {
        chart.setActiveElements([
            { datasetIndex: 0, index: step }
        ]);
        chart.update('none'); // Sin animación para fluidez instantánea
    }
}

/**
 * Controlar reproducción automática
 */
function togglePlayback() {
    if (isPlaying) {
        pausePlayback();
    } else {
        startPlayback();
    }
}

/**
 * Loop de reproducción
 */
function startPlayback() {
    isPlaying = true;
    playBtn.innerHTML = '<span class="play-icon">&#10074;&#10074;</span>'; // Icono de Pausa

    const run = () => {
        if (!isPlaying) return;

        currentStep++;
        if (currentStep >= simData.time.length) {
            currentStep = 0; // Bucle infinito
        }

        timelineSlider.value = currentStep;
        updateVisualsAtStep(currentStep);

        animationId = setTimeout(run, 50); // 50ms por paso de enfriamiento
    };

    run();
}

/**
 * Pausar animación de enfriamiento
 */
function pausePlayback() {
    isPlaying = false;
    playBtn.innerHTML = '<span class="play-icon">&#9654;</span>'; // Icono de Reproducir
    if (animationId) {
        clearTimeout(animationId);
        animationId = null;
    }
}
