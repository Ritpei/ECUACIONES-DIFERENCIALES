/**
 * ==========================================================================
 * LÓGICA TÁCTICA DE SIMULACIÓN Y VISUALIZACIÓN - APOCALIPSIS ZOMBIE (SZR)
 * Gestiona consultas POST asíncronas con debounce, escala logarítmica en Chart.js,
 * gradientes tácticos y sincronización de hitos variables en tiempo real.
 * ==========================================================================
 */

// Variables globales de simulación y animación
let chart = null;             // Instancia única del gráfico Chart.js
let simData = null;           // Almacena las series temporales devueltas por el Flask API
let debounceTimeout = null;   // Temporizador para mitigar peticiones duplicadas en arrastre (debounce)
let animationId = null;       // ID del timeout de reproducción animada
let isPlaying = false;        // Estado de reproducción activa
let currentStep = 0;          // Paso seleccionado actual (0 a t_span.length - 1)

// Elementos principales del DOM
const sliderTdesc = document.getElementById('slider-tdesc');
const sliderRefugio = document.getElementById('slider-refugio');
const valTdesc = document.getElementById('val-tdesc');
const valRefugio = document.getElementById('val-refugio');

// Contadores globales de proyección final
const statHuman = document.getElementById('stat-human');
const statZombie = document.getElementById('stat-zombie');

// Bitácora militar clasificada
const consoleItems = document.querySelectorAll('.console-item');

// Controles temporales y contadores del paso activo
const timelineSlider = document.getElementById('timeline-slider');
const currentSimTime = document.getElementById('current-sim-time');
const playBtn = document.getElementById('play-btn');
const currentHuman = document.getElementById('current-human');
const currentZombie = document.getElementById('current-zombie');

/**
 * Evento de inicio y configuración inicial del DOM
 */
document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    setupSliders();
    triggerSimulation(); // Lanzar simulación inicial con valores por defecto
    
    // Asignar controladores para la línea del tiempo y playback
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
 * Configurar Sliders con etiquetas interactivas y Debounce.
 * TRUCO VISUAL: El Debounce de 60ms evita saturar de peticiones HTTP POST al servidor Flask
 * mientras el usuario arrastra dinámicamente las barras de control táctico.
 */
function setupSliders() {
    const updateLabels = () => {
        valTdesc.textContent = `Día ${sliderTdesc.value} (${(sliderTdesc.value / 365).toFixed(1)} años)`;
        valRefugio.textContent = parseInt(sliderRefugio.value).toLocaleString();
    };
    
    [sliderTdesc, sliderRefugio].forEach(slider => {
        slider.addEventListener('input', () => {
            updateLabels();
            
            // Cancelar petición anterior si el usuario sigue moviendo la barra
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(triggerSimulation, 60);
        });
    });
    
    updateLabels();
}

/**
 * Realizar petición POST al API del backend
 * Envía las variables del modelo de contingencia en formato JSON.
 */
async function triggerSimulation() {
    const t_desc = parseFloat(sliderTdesc.value);
    const s_refugio = parseFloat(sliderRefugio.value);
    
    try {
        const response = await fetch('/zombies/api/simular', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                t_desc: t_desc,
                s_refugio: s_refugio
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            simData = data;
            
            // Actualizar HUD superior con datos de proyección finales (Día 4562 / Año 12.5)
            statHuman.textContent = Math.round(data.final_s).toLocaleString();
            statZombie.textContent = Math.round(data.final_z).toLocaleString();
            
            // Regenerar / actualizar gráfico
            updateChart();
            
            // Sincronizar límites de la barra del reproductor
            timelineSlider.max = data.time.length - 1;
            if (currentStep >= data.time.length) {
                currentStep = 0;
            }
            timelineSlider.value = currentStep;
            updateVisualsAtStep(currentStep);
            
            // Actualizar la bitácora militar de incidencias con el día dinámico de descubrimiento
            updateConsoleLogs(t_desc);
        } else {
            console.error("Error en simulación devuelto por el backend:", data.error);
        }
    } catch (err) {
        console.error("Error de conexión de red con el API SZR:", err);
    }
}

/**
 * TRUCO VISUAL: Plugin de hitos históricos variables en tiempo real.
 * Dibuja líneas tácticas punteadas en el eje X del Canvas.
 * Permite que la línea verde de "Descubrimiento del CDC" se mueva de forma fluida
 * en el gráfico a medida que el usuario ajusta el slider `t_desc`.
 */
const twdMilestonesPlugin = {
    id: 'twdMilestonesPlugin',
    afterDraw: (chartInstance) => {
        if (!simData) return;
        const { ctx, chartArea: { top, bottom, left, right }, scales: { x } } = chartInstance;
        
        const tDesc = simData.t_desc;
        const milestones = [
            { day: 150, label: 'Día 150: Caída de la Civilización', color: '#dc2626' },
            { day: tDesc, label: `Día ${Math.round(tDesc)}: Protocolo CDC`, color: '#84cc16' },
            { day: 1277, label: 'Día 1277: Reanudación Natalidad', color: '#ca8a04' }
        ];
        
        ctx.save();
        milestones.forEach((m, idx) => {
            const xPos = x.getPixelForValue(m.day);
            if (xPos >= left && xPos <= right) {
                // Dibujar línea punteada táctica
                ctx.strokeStyle = m.color;
                ctx.lineWidth = 1.2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(xPos, top);
                ctx.lineTo(xPos, bottom);
                ctx.stroke();
                
                // Dibujar etiqueta flotante
                ctx.fillStyle = '#f8fafc';
                ctx.font = 'bold 9px "Fira Code", monospace';
                ctx.setLineDash([]); // Quitar punteado para el texto
                
                // Desplazamiento vertical para evitar solapamientos
                let textY = top + 15;
                if (m.day === tDesc) textY = top + 32;
                else if (m.day === 1277) textY = top + 49;
                
                // Sombreado de fondo para legibilidad táctica
                const textWidth = ctx.measureText(m.label).width;
                ctx.fillStyle = 'rgba(7, 9, 7, 0.82)';
                ctx.fillRect(xPos + 5, textY - 9, textWidth + 8, 12);
                ctx.strokeStyle = 'rgba(132, 204, 22, 0.15)';
                ctx.strokeRect(xPos + 5, textY - 9, textWidth + 8, 12);
                
                // Dibujar el texto del hito en color correspondiente
                ctx.fillStyle = m.color;
                ctx.fillText(m.label, xPos + 9, textY);
            }
        });
        ctx.restore();
    }
};

// Registrar el plugin dinámico
Chart.register(twdMilestonesPlugin);

/**
 * Actualizar / Generar Gráfico Chart.js
 * Configura escala logarítmica para manejar la discrepancia masiva entre
 * la población inicial mundial (6.9 mil millones) y la población final o de zombis.
 */
function updateChart() {
    if (!simData) return;
    
    const ctx = document.getElementById('twdChart').getContext('2d');
    
    // TRUCO MATEMÁTICO: En escala logarítmica de Chart.js, los valores <= 0
    // colapsan la función. Clampar los valores a un mínimo de 1.0 evita errores de renderizado.
    const sClamped = simData.s.map(val => Math.max(1.0, val));
    const zClamped = simData.z.map(val => Math.max(1.0, val));
    
    // TRUCO VISUAL: Creación de gradientes verticales para curvas tácticas
    const humanGradient = ctx.createLinearGradient(0, 0, 0, 350);
    humanGradient.addColorStop(0, 'rgba(2, 132, 199, 0.22)');
    humanGradient.addColorStop(1, 'rgba(2, 132, 199, 0.00)');
    
    const zombieGradient = ctx.createLinearGradient(0, 0, 0, 350);
    zombieGradient.addColorStop(0, 'rgba(220, 38, 38, 0.26)');
    zombieGradient.addColorStop(1, 'rgba(220, 38, 38, 0.00)');
    
    const datasets = [
        {
            label: 'Sobrevivientes (Humanos Vivos)',
            data: sClamped,
            borderColor: '#0284c7',
            backgroundColor: humanGradient,
            borderWidth: 3,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#0284c7',
            pointHoverBorderColor: '#ffffff',
            tension: 0.4, // Curva suavizada premium
            fill: true
        },
        {
            label: 'Caminantes (Zombies Activos)',
            data: zClamped,
            borderColor: '#dc2626',
            backgroundColor: zombieGradient,
            borderWidth: 3,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#dc2626',
            pointHoverBorderColor: '#ffffff',
            tension: 0.4, // Curva suavizada premium
            fill: true
        }
    ];
    
    // Si el gráfico ya existe, actualizar de forma fluida
    if (chart) {
        chart.data.datasets[0].data = sClamped;
        chart.data.datasets[1].data = zClamped;
        chart.data.datasets[0].backgroundColor = humanGradient;
        chart.data.datasets[1].backgroundColor = zombieGradient;
        chart.update();
        return;
    }
    
    // Construir la instancia
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: simData.time,
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
                        font: { family: 'Oswald', size: 12, weight: '500' },
                        boxWidth: 12,
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(14, 20, 15, 0.96)',
                    titleColor: '#84cc16',
                    titleFont: { family: 'Oswald', size: 12, weight: 'bold' },
                    bodyFont: { family: 'Fira Code', size: 11 },
                    borderColor: 'rgba(132, 204, 22, 0.25)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    boxWidth: 8,
                    boxPadding: 4,
                    callbacks: {
                        label: function(context) {
                            const name = context.dataset.label.split(' ')[0];
                            const val = Math.round(context.raw);
                            return `${name}: ${val.toLocaleString()} hab`;
                        },
                        title: function(context) {
                            return `TIEMPO: ${Math.round(context[0].label)} días (${(context[0].label/365).toFixed(1)} años)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    min: 0,
                    max: 4562, // 12.5 años de simulación en total
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: {
                        color: '#788a78',
                        font: { family: 'Fira Code', size: 10 }
                    },
                    title: {
                        display: true,
                        text: 'Días Transcurridos desde el Brote (Año 2010)',
                        color: '#788a78',
                        font: { family: 'Oswald', size: 12, weight: '500' }
                    }
                },
                y: {
                    type: 'logarithmic', // Escala Logarítmica requerida
                    min: 10,
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: {
                        color: '#788a78',
                        font: { family: 'Fira Code', size: 10 },
                        callback: function(value) {
                            // Abreviaturas para legibilidad en escala logarítmica
                            if (value >= 1e9) return (value / 1e9) + 'B (Mil Millones)';
                            if (value >= 1e6) return (value / 1e6) + 'M (Millones)';
                            if (value >= 1e3) return (value / 1e3) + 'K';
                            return value;
                        }
                    },
                    title: {
                        display: true,
                        text: 'Fuerzas de Combate Poblacional',
                        color: '#788a78',
                        font: { family: 'Oswald', size: 12, weight: '500' }
                    }
                }
            }
        }
    });
}

/**
 * Actualizar textos dinámicos en la bitácora clasificada
 */
function updateConsoleLogs(t_desc) {
    consoleItems.forEach((item) => {
        if (item.id === 'console-discovery') {
            item.innerHTML = `<strong>DÍA ${Math.round(t_desc)} [DESCUBRIMIENTO]:</strong> El CDC establece el protocolo del tallo cerebral. Tasa de reanimación por causas naturales cae del 100% al 5%.`;
        }
        item.classList.add('active');
    });
}

/**
 * Actualizar indicadores visuales y barra de progreso del paso activo
 */
function updateVisualsAtStep(step) {
    if (!simData) return;
    
    const day = simData.time[step];
    const sVal = simData.s[step];
    const zVal = simData.z[step];
    
    // Actualizar recuadros informativos inferiores
    currentSimTime.textContent = `${Math.round(day)} días (${(day / 365).toFixed(1)} años)`;
    currentHuman.textContent = Math.round(Math.max(0, sVal)).toLocaleString();
    currentZombie.textContent = Math.round(Math.max(0, zVal)).toLocaleString();
    
    // Sincronizar las barras decorativas de progreso bajo los sliders
    const tdescPercent = ((sliderTdesc.value - sliderTdesc.min) / (sliderTdesc.max - sliderTdesc.min)) * 100;
    const refugioPercent = ((sliderRefugio.value - sliderRefugio.min) / (sliderRefugio.max - sliderRefugio.min)) * 100;
    const timelinePercent = (step / (simData.time.length - 1)) * 100;
    
    document.querySelector('.fill-tdesc').style.width = `${tdescPercent}%`;
    document.querySelector('.fill-refugio').style.width = `${refugioPercent}%`;
    document.querySelector('.fill-timeline').style.width = `${timelinePercent}%`;
    
    // Resaltar la bitácora activa basándonos en los umbrales de días
    consoleItems.forEach(item => {
        const threshold = parseFloat(item.getAttribute('data-threshold'));
        
        // Si el día simulado actual es superior al umbral de la bitácora, encender la alerta táctica
        if (day >= threshold) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Desplazar el punto activo sincronizado del gráfico
    if (chart) {
        chart.setActiveElements([
            { datasetIndex: 0, index: step },
            { datasetIndex: 1, index: step }
        ]);
        chart.update('none');
    }
}

/**
 * Iniciar/Pausar la reproducción del simulador militar
 */
function togglePlayback() {
    if (isPlaying) {
        pausePlayback();
    } else {
        startPlayback();
    }
}

/**
 * Loop de reproducción animada de 50ms por paso
 */
function startPlayback() {
    isPlaying = true;
    playBtn.innerHTML = '<span class="play-icon">&#10074;&#10074;</span>'; // Icono de Pausa
    
    const run = () => {
        if (!isPlaying) return;
        
        currentStep += 2; // Avanzar de dos en dos días para agilizar la reproducción de los 4562 pasos
        if (currentStep >= simData.time.length) {
            currentStep = 0; // Bucle
        }
        
        timelineSlider.value = currentStep;
        updateVisualsAtStep(currentStep);
        
        animationId = setTimeout(run, 40);
    };
    
    run();
}

/**
 * Pausar animación de reproducción
 */
function pausePlayback() {
    isPlaying = false;
    playBtn.innerHTML = '<span class="play-icon">&#9654;</span>'; // Icono de Play
    if (animationId) {
        clearTimeout(animationId);
        animationId = null;
    }
}
