/**
 * ==========================================================================
 * LÓGICA DE CONTROL Y VISUALIZACIÓN DE DATOS - SIMULADOR WANNA-CRY (SIR)
 * Implementa renderizado de gráficos avanzados con gradientes dinámicos,
 * reproducción de simulación y sincronización interactiva de hitos.
 * ==========================================================================
 */

// Variables globales de simulación y animación
let simData = null;       // Contenedor para los arreglos de datos devueltos por el API Flask
let chart = null;         // Instancia del gráfico Chart.js
let animationId = null;   // ID de temporizador para la reproducción de animación
let isPlaying = false;    // Estado de la animación
let currentStep = 0;      // Paso actual de la línea de tiempo (0 a 149)

// Elementos del DOM
const sliderBeta = document.getElementById('slider-beta');
const sliderGamma = document.getElementById('slider-gamma');
const valBeta = document.getElementById('val-beta');
const valGamma = document.getElementById('val-gamma');

const timelineSlider = document.getElementById('timeline-slider');
const currentSimDay = document.getElementById('current-sim-day');
const playBtn = document.getElementById('play-btn');

// Cajas de visualización numérica SIR
const valS = document.getElementById('val-s');
const valI = document.getElementById('val-i');
const valR = document.getElementById('val-r');

// Lista de hitos históricos del panel izquierdo
const eventItems = document.querySelectorAll('.event-item');

/**
 * Evento de inicio: Carga inicial y configuraciones
 */
document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    setupSliders();
    fetchSimulation();

    // Sincronizar botones e interacciones
    playBtn.addEventListener('click', togglePlayback);
    timelineSlider.addEventListener('input', (e) => {
        pausePlayback();
        currentStep = parseInt(e.target.value);
        updateVisualsAtStep(currentStep);
    });
});

/**
 * Configurar Pestañas de Navegación
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
 * Configurar Sliders interactivos con recuadros numéricos reactivos
 */
function setupSliders() {
    const updateValues = () => {
        valBeta.textContent = parseFloat(sliderBeta.value).toFixed(2);
        valGamma.textContent = parseFloat(sliderGamma.value).toFixed(2);
    };

    [sliderBeta, sliderGamma].forEach(slider => {
        slider.addEventListener('input', () => {
            updateValues();
            fetchSimulation(); // Recalcular la simulación en tiempo real al arrastrar
        });
    });

    updateValues();
}

/**
 * Obtener simulación desde el backend de Flask
 * Realiza una consulta GET con los parámetros beta y gamma actuales
 */
async function fetchSimulation() {
    const beta = sliderBeta.value;
    const gamma = sliderGamma.value;

    try {
        // Consultar el endpoint del Blueprint /virus/api/simulate
        const response = await fetch(`/virus/api/simulate?beta=${beta}&gamma=${gamma}&t_max=10&steps=150`);
        const data = await response.json();

        if (data.success) {
            simData = data;
            
            // Renderizar o actualizar gráfico de Chart.js
            updateChart();

            // Reajustar límites de la línea de tiempo temporal
            timelineSlider.max = data.time.length - 1;
            if (currentStep >= data.time.length) {
                currentStep = 0;
            }
            timelineSlider.value = currentStep;
            
            // Sincronizar todos los indicadores visuales y numéricos
            updateVisualsAtStep(currentStep);
        } else {
            console.error("Error devuelto por el motor EDO del backend:", data.error);
        }
    } catch (err) {
        console.error("Error de red en simulación:", err);
    }
}

/**
 * TRUCO VISUAL: Plugin de Canvas personalizado para Chart.js.
 * Dibuja líneas verticales punteadas de hito (milestones) y sus etiquetas.
 * Permite integrar la historia (data storytelling) directamente en el lienzo del gráfico.
 */
const milestonesPlugin = {
    id: 'milestonesPlugin',
    afterDraw: (chartInstance) => {
        const { ctx, chartArea: { top, bottom, left, right }, scales: { x } } = chartInstance;

        // Lista de hitos históricos geolocalizados en el eje de tiempo (días)
        const milestones = [
            { day: 0.0, label: 'Día 0: EternalBlue Exploit', color: '#ff0055' },
            { day: 1.0, label: 'Día 1: Brote Mundial (Worm)', color: '#a855f7' },
            { day: 2.0, label: 'Día 2: Registro Kill-Switch', color: '#00ff66' }
        ];

        ctx.save();
        milestones.forEach((m, idx) => {
            const xPos = x.getPixelForValue(m.day);
            if (xPos >= left && xPos <= right) {
                // Dibujar línea punteada
                ctx.strokeStyle = m.color;
                ctx.lineWidth = 1.2;
                ctx.setLineDash([6, 4]);
                ctx.beginPath();
                ctx.moveTo(xPos, top);
                ctx.lineTo(xPos, bottom);
                ctx.stroke();

                // Dibujar etiqueta flotante
                ctx.fillStyle = '#f8fafc';
                ctx.font = 'bold 9px "Fira Code", monospace';
                ctx.setLineDash([]); // Quitar punteado para el texto
                
                // Desplazamiento Y dinámico para evitar solapamiento de etiquetas
                const textY = top + 15 + (idx * 16); 
                
                // Fondo semi-transparente detrás de la etiqueta para legibilidad
                const textWidth = ctx.measureText(m.label).width;
                ctx.fillStyle = 'rgba(4, 5, 8, 0.75)';
                ctx.fillRect(xPos + 5, textY - 9, textWidth + 8, 12);
                
                // Contorno del fondo de etiqueta
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                ctx.strokeRect(xPos + 5, textY - 9, textWidth + 8, 12);

                // Escribir el texto del hito
                ctx.fillStyle = m.color;
                ctx.fillText(m.label, xPos + 9, textY);
            }
        });
        ctx.restore();
    }
};

// Registrar plugin de hitos históricos
Chart.register(milestonesPlugin);

/**
 * Generar / Actualizar Gráfico Chart.js
 * Crea gradientes de color de relleno e implementa curvas suavizadas de alta gama.
 */
function updateChart() {
    if (!simData) return;

    const ctx = document.getElementById('sirChart').getContext('2d');

    // TRUCO VISUAL: Creación de gradientes lineales verticales en el Canvas de Chart.js
    // Estos se usan para llenar el fondo debajo de cada curva (S, I, R) de forma semi-translúcida.
    const sGradient = ctx.createLinearGradient(0, 0, 0, 300);
    sGradient.addColorStop(0, 'rgba(0, 240, 255, 0.22)');
    sGradient.addColorStop(1, 'rgba(0, 240, 255, 0.00)');

    const iGradient = ctx.createLinearGradient(0, 0, 0, 300);
    iGradient.addColorStop(0, 'rgba(255, 0, 85, 0.26)');
    iGradient.addColorStop(1, 'rgba(255, 0, 85, 0.00)');

    const rGradient = ctx.createLinearGradient(0, 0, 0, 300);
    rGradient.addColorStop(0, 'rgba(0, 255, 102, 0.22)');
    rGradient.addColorStop(1, 'rgba(0, 255, 102, 0.00)');

    // Datos estructurados para Chart.js
    const datasets = [
        {
            label: 'S (Susceptibles - Vulnerables)',
            data: simData.susceptible,
            borderColor: '#00f0ff',
            backgroundColor: sGradient,
            borderWidth: 3,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#00f0ff',
            pointHoverBorderColor: '#ffffff',
            tension: 0.4, // Curva suavizada premium
            fill: true    // Habilitar relleno de gradiente
        },
        {
            label: 'I (Infectados - WannaCry Activo)',
            data: simData.infected,
            borderColor: '#ff0055',
            backgroundColor: iGradient,
            borderWidth: 3.5,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#ff0055',
            pointHoverBorderColor: '#ffffff',
            tension: 0.4, // Curva suavizada premium
            fill: true    // Habilitar relleno de gradiente
        },
        {
            label: 'R (Parcheados / Recuperados)',
            data: simData.recovered,
            borderColor: '#00ff66',
            backgroundColor: rGradient,
            borderWidth: 3,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#00ff66',
            pointHoverBorderColor: '#ffffff',
            tension: 0.4, // Curva suavizada premium
            fill: true    // Habilitar relleno de gradiente
        }
    ];

    // Si el gráfico ya existe, actualizar únicamente los conjuntos de datos para rendimiento fluido
    if (chart) {
        chart.data.labels = simData.time.map(t => t.toFixed(2));
        chart.data.datasets[0].data = simData.susceptible;
        chart.data.datasets[1].data = simData.infected;
        chart.data.datasets[2].data = simData.recovered;
        chart.data.datasets[0].backgroundColor = sGradient;
        chart.data.datasets[1].backgroundColor = iGradient;
        chart.data.datasets[2].backgroundColor = rGradient;
        chart.update();
        return;
    }

    // Configuración completa de la instancia del gráfico
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: simData.time.map(t => t.toFixed(2)),
            datasets: datasets
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
                    position: 'top',
                    labels: {
                        color: '#f8fafc',
                        font: { family: 'Outfit', size: 11, weight: '600' },
                        boxWidth: 12,
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(11, 14, 23, 0.95)',
                    titleColor: '#00f0ff',
                    titleFont: { family: 'Space Grotesk', size: 12, weight: 'bold' },
                    bodyFont: { family: 'Fira Code', size: 11 },
                    borderColor: 'rgba(0, 240, 255, 0.25)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    boxWidth: 8,
                    boxPadding: 4,
                    callbacks: {
                        label: function (context) {
                            const name = context.dataset.label.split(' ')[0];
                            const val = Math.round(context.raw);
                            return `${name}: ${val.toLocaleString()} computadoras`;
                        },
                        title: function (context) {
                            return `TIEMPO: ${parseFloat(context[0].label).toFixed(2)} días`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    min: 0,
                    max: 10,
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: {
                        color: '#64748b',
                        font: { family: 'Fira Code', size: 10 }
                    },
                    title: {
                        display: true,
                        text: 'Días Transcurridos',
                        color: '#94a3b8',
                        font: { family: 'Outfit', size: 11, weight: 'bold' }
                    }
                },
                y: {
                    min: 0,
                    max: 100000,
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: {
                        color: '#64748b',
                        font: { family: 'Fira Code', size: 10 },
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    },
                    title: {
                        display: true,
                        text: 'Dispositivos de Subred',
                        color: '#94a3b8',
                        font: { family: 'Outfit', size: 11, weight: 'bold' }
                    }
                }
            }
        }
    });
}

/**
 * Sincronizar todos los indicadores interactivos y de Storytelling
 * Se ejecuta al mover el control de reproducción o el slider de tiempo
 */
function updateVisualsAtStep(step) {
    if (!simData) return;

    const day = simData.time[step];
    const sVal = Math.round(simData.susceptible[step]);
    const iVal = Math.round(simData.infected[step]);
    const rVal = Math.round(simData.recovered[step]);

    // Actualizar recuadros numéricos del HUD
    currentSimDay.textContent = `${day.toFixed(2)} días`;
    valS.textContent = sVal.toLocaleString();
    valI.textContent = iVal.toLocaleString();
    valR.textContent = rVal.toLocaleString();

    // Sincronizar las franjas de progreso bajo los sliders de forma visual
    // (Ajustar anchos de relleno)
    const betaPercent = ((sliderBeta.value - sliderBeta.min) / (sliderBeta.max - sliderBeta.min)) * 100;
    const gammaPercent = ((sliderGamma.value - sliderGamma.min) / (sliderGamma.max - sliderGamma.min)) * 100;
    const timelinePercent = (step / (simData.time.length - 1)) * 100;

    document.querySelector('.fill-beta').style.width = `${betaPercent}%`;
    document.querySelector('.fill-gamma').style.width = `${gammaPercent}%`;
    document.querySelector('.fill-timeline').style.width = `${timelinePercent}%`;

    // Resaltar la bitácora de eventos del panel izquierdo si el paso actual cae en su rango de tiempo
    eventItems.forEach(item => {
        const startDay = parseFloat(item.getAttribute('data-start'));
        const endDay = parseFloat(item.getAttribute('data-end'));

        if (day >= startDay && day < endDay) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Mover la barra vertical/punto activo flotante en el gráfico de Chart.js
    if (chart) {
        chart.setActiveElements([
            { datasetIndex: 0, index: step },
            { datasetIndex: 1, index: step },
            { datasetIndex: 2, index: step }
        ]);
        chart.update('none'); // Actualización fluida sin disparar layouts
    }
}

/**
 * Iniciar/Pausar reproducción automática de la simulación
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

        // Controlar la velocidad del temporizador (aproximadamente 60 FPS)
        animationId = setTimeout(run, 60);
    };

    run();
}

/**
 * Detener temporizadores de animación
 */
function pausePlayback() {
    isPlaying = false;
    playBtn.innerHTML = '<span class="play-icon">&#9654;</span>'; // Icono de Reproducción
    if (animationId) {
        clearTimeout(animationId);
        animationId = null;
    }
}
