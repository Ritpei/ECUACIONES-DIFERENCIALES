// Variables globales
let chart = null;
let simData = null;
let debounceTimeout = null;
let animationId = null;
let isPlaying = false;
let currentStep = 0;

// Elementos del DOM
const sliderTdesc = document.getElementById('slider-tdesc');
const sliderRefugio = document.getElementById('slider-refugio');

const valTdesc = document.getElementById('val-tdesc');
const valRefugio = document.getElementById('val-refugio');

const statHuman = document.getElementById('stat-human');
const statZombie = document.getElementById('stat-zombie');

const consoleItems = document.querySelectorAll('.console-item');

// Nuevos elementos para controles temporales y recuadros de paso seleccionado
const timelineSlider = document.getElementById('timeline-slider');
const currentSimTime = document.getElementById('current-sim-time');
const playBtn = document.getElementById('play-btn');
const currentHuman = document.getElementById('current-human');
const currentZombie = document.getElementById('current-zombie');

document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    setupSliders();
    triggerSimulation(); // Simulación inicial
    
    // Configurar controladores de reproducción y slider temporal
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

// Configuración de Sliders y Debounce
function setupSliders() {
    const updateLabels = () => {
        valTdesc.textContent = `Día ${sliderTdesc.value} (${(sliderTdesc.value / 365).toFixed(1)} años)`;
        valRefugio.textContent = parseInt(sliderRefugio.value).toLocaleString();
    };
    
    [sliderTdesc, sliderRefugio].forEach(slider => {
        slider.addEventListener('input', () => {
            updateLabels();
            
            // Aplicar Debounce para no saturar al servidor al arrastrar los sliders
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(triggerSimulation, 60);
        });
    });
    
    updateLabels();
}

// Enviar petición POST a la API de Flask
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
            
            // Actualizar panel de estadísticas finales
            statHuman.textContent = Math.round(data.final_s).toLocaleString();
            statZombie.textContent = Math.round(data.final_z).toLocaleString();
            
            // Renderizar / Actualizar gráfico
            updateChart();
            
            // Reajustar la línea de tiempo
            timelineSlider.max = data.time.length - 1;
            if (currentStep >= data.time.length) {
                currentStep = 0;
            }
            timelineSlider.value = currentStep;
            updateVisualsAtStep(currentStep);
            
            // Actualizar bitácora táctica del sidebar
            updateConsoleLogs(t_desc);
        } else {
            console.error("Error en la simulación:", data.error);
        }
    } catch (err) {
        console.error("Error de conexión con la API:", err);
    }
}

// Plugin de hitos para dibujar líneas verticales
const twdMilestonesPlugin = {
    id: 'twdMilestonesPlugin',
    afterDraw: (chartInstance) => {
        if (!simData) return;
        const { ctx, chartArea: { top, bottom, left, right }, scales: { x } } = chartInstance;
        
        const tDesc = simData.t_desc;
        const milestones = [
            { day: 150, label: 'Día 150: Caída de la Civilización', color: '#ef4444' },
            { day: tDesc, label: `Día ${Math.round(tDesc)}: CDC / Descubrimiento`, color: '#84cc16' },
            { day: 1277, label: 'Día 1277: Reinicio de Natalidad', color: '#d946ef' }
        ];
        
        ctx.save();
        milestones.forEach(m => {
            const xPos = x.getPixelForValue(m.day);
            if (xPos >= left && xPos <= right) {
                // Línea punteada vertical
                ctx.strokeStyle = m.color;
                ctx.lineWidth = 1.5;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(xPos, top);
                ctx.lineTo(xPos, bottom);
                ctx.stroke();
                
                // Texto de la etiqueta
                ctx.fillStyle = '#f8fafc';
                ctx.font = 'bold 9px Fira Code';
                ctx.setLineDash([]);
                
                let textY = top + 15;
                if (m.day === tDesc) textY = top + 35;
                else if (m.day === 1277) textY = top + 55;
                
                ctx.fillText(m.label, xPos + 5, textY);
            }
        });
        ctx.restore();
    }
};

// Registrar el plugin en Chart.js
Chart.register(twdMilestonesPlugin);

// Actualizar / Generar Gráfico Chart.js
function updateChart() {
    if (!simData) return;
    
    const ctx = document.getElementById('twdChart').getContext('2d');
    
    // Clampar los valores a mínimo 1.0 para evitar problemas matemáticos en escala logarítmica
    const sClamped = simData.s.map(val => Math.max(1.0, val));
    const zClamped = simData.z.map(val => Math.max(1.0, val));
    
    const chartData = {
        labels: simData.time,
        datasets: [
            {
                label: 'Sobrevivientes (Humanos)',
                data: sClamped,
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.05)',
                borderWidth: 2.5,
                pointRadius: 0,
                pointHoverRadius: 6,
                tension: 0.1,
                fill: false
            },
            {
                label: 'Caminantes (Zombies)',
                data: zClamped,
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                borderWidth: 2.5,
                pointRadius: 0,
                pointHoverRadius: 6,
                tension: 0.1,
                fill: false
            }
        ]
    };
    
    if (chart) {
        chart.data.datasets[0].data = sClamped;
        chart.data.datasets[1].data = zClamped;
        chart.update();
        return;
    }
    
    chart = new Chart(ctx, {
        type: 'line',
        data: chartData,
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
                    bodyFont: { family: 'Fira Code' },
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label.split(' ')[0]}: ${Math.round(context.raw).toLocaleString()} hab`;
                        },
                        title: function(context) {
                            return `Día: ${Math.round(context[0].label)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    min: 0,
                    max: 4562,
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: {
                        color: '#94a3b8',
                        font: { family: 'Fira Code' }
                    },
                    title: {
                        display: true,
                        text: 'Días desde el brote inicial (Año 2010)',
                        color: '#f8fafc',
                        font: { family: 'Outfit', size: 13 }
                    }
                },
                y: {
                    type: 'logarithmic',
                    min: 10,
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: {
                        color: '#94a3b8',
                        font: { family: 'Fira Code' },
                        callback: function(value, index, ticks) {
                            if (value >= 1e9) return (value / 1e9) + 'B';
                            if (value >= 1e6) return (value / 1e6) + 'M';
                            if (value >= 1e3) return (value / 1e3) + 'K';
                            return value;
                        }
                    },
                    title: {
                        display: true,
                        text: 'Población (Escala Logarítmica)',
                        color: '#f8fafc',
                        font: { family: 'Outfit', size: 13 }
                    }
                }
            }
        }
    });
}

// Actualizar textos reactivos en el log de operaciones
function updateConsoleLogs(t_desc) {
    consoleItems.forEach((item) => {
        if (item.id === 'console-discovery') {
            item.innerHTML = `<strong>Día ${Math.round(t_desc)}: CDC y Descubrimiento.</strong> La humanidad aprende a rematar el cerebro. Las muertes naturales reducen su tasa de reanimación del 100% al 5%.`;
        }
        item.classList.add('active');
    });
}

// Actualizar visualización en el paso temporal específico
function updateVisualsAtStep(step) {
    if (!simData) return;
    
    const day = simData.time[step];
    const sVal = simData.s[step];
    const zVal = simData.z[step];
    
    // Actualizar etiquetas de texto
    currentSimTime.textContent = `${Math.round(day)} días (${(day / 365).toFixed(1)} años)`;
    currentHuman.textContent = Math.round(sClampedValue(sVal)).toLocaleString();
    currentZombie.textContent = Math.round(zClampedValue(zVal)).toLocaleString();
    
    // Mover indicador en el gráfico de Chart.js
    if (chart) {
        chart.setActiveElements([
            { datasetIndex: 0, index: step },
            { datasetIndex: 1, index: step }
        ]);
        chart.update('none');
    }
}

// Clamper auxiliares para visualización
function sClampedValue(val) {
    return Math.max(0, val);
}
function zClampedValue(val) {
    return Math.max(0, val);
}

// Controlar reproducción de la animación
function togglePlayback() {
    if (isPlaying) {
        pausePlayback();
    } else {
        startPlayback();
    }
}

function startPlayback() {
    isPlaying = true;
    playBtn.innerHTML = '&#10074;&#10074;'; // Icono pausa
    
    const run = () => {
        if (!isPlaying) return;
        
        currentStep++;
        if (currentStep >= simData.time.length) {
            currentStep = 0;
        }
        
        timelineSlider.value = currentStep;
        updateVisualsAtStep(currentStep);
        
        animationId = setTimeout(run, 50); // 50ms por paso
    };
    
    run();
}

function pausePlayback() {
    isPlaying = false;
    playBtn.innerHTML = '&#9654;'; // Icono play
    if (animationId) {
        clearTimeout(animationId);
        animationId = null;
    }
}
