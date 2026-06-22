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

// Elementos para controles temporales y recuadros de paso seleccionado
const timelineSlider = document.getElementById('timeline-slider');
const currentSimTime = document.getElementById('current-sim-time');
const playBtn = document.getElementById('play-btn');
const currentHuman = document.getElementById('current-human');
const currentZombie = document.getElementById('current-zombie');

document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    setupSliders();
    runLocalSimulation(); // Simulación inicial
    
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
            
            // Aplicar Debounce para no saturar cálculos
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(runLocalSimulation, 60);
        });
    });
    
    updateLabels();
}

// Ejecutar Simulación SZR de The Walking Dead localmente (RK4)
function runLocalSimulation() {
    const t_desc = parseFloat(sliderTdesc.value);
    const s_refugio = parseFloat(sliderRefugio.value);
    
    const S0 = 6900000000.0;
    const Z0 = 100.0;
    const dias_totales = 4562;
    const steps = dias_totales;
    
    const time = [];
    for (let i = 0; i < steps; i++) {
        time.push(i);
    }
    
    const s_res = new Array(steps);
    const z_res = new Array(steps);
    
    s_res[0] = S0;
    z_res[0] = Z0;
    
    const f = (t, y) => {
        const S_curr = y[0];
        const Z_curr = y[1];
        
        // kappa
        const kappa = t < t_desc ? 1.0 : 0.05;
        
        // b
        const b = t < 1277 ? 0.0 : (15.0 / 1000.0) / 365.0;
        
        // d
        const d = (10.0 / 1000.0) / 365.0;
        
        // beta and alpha
        let beta, alpha;
        if (t < 150) {
            beta = 0.3;
            alpha = 0.01;
        } else if (t < t_desc) {
            beta = 0.05;
            alpha = 0.05;
        } else {
            beta = 0.005;
            alpha = 0.2;
        }
        
        // zeta
        const zeta = 1.0 / (5.0 * 365.0);
        
        // refuge isolation factor
        const factor_aislamiento = S_curr > 0 ? Math.max(0.0, (S_curr - s_refugio) / S_curr) : 0.0;
        const beta_efectiva = beta * factor_aislamiento;
        
        const N = (S_curr + Z_curr) > 0 ? (S_curr + Z_curr) : 1.0;
        
        const dSdt = (b * S_curr) - (d * S_curr) - (beta_efectiva * S_curr * Z_curr / N);
        const dZdt = (kappa * d * S_curr) + (beta_efectiva * S_curr * Z_curr / N) - (alpha * S_curr * Z_curr / N) - (zeta * Z_curr);
        
        return [dSdt, dZdt];
    };
    
    for (let i = 0; i < steps - 1; i++) {
        const t = time[i];
        const h = 1.0; // paso de 1 día
        const y_curr = [s_res[i], z_res[i]];
        
        const k1 = f(t, y_curr);
        
        const y_k2 = [
            y_curr[0] + h * k1[0] / 2,
            y_curr[1] + h * k1[1] / 2
        ];
        const k2 = f(t + h / 2, y_k2);
        
        const y_k3 = [
            y_curr[0] + h * k2[0] / 2,
            y_curr[1] + h * k2[1] / 2
        ];
        const k3 = f(t + h / 2, y_k3);
        
        const y_k4 = [
            y_curr[0] + h * k3[0],
            y_curr[1] + h * k3[1]
        ];
        const k4 = f(t + h, y_k4);
        
        const S_next = y_curr[0] + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
        const Z_next = y_curr[1] + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
        
        s_res[i + 1] = Math.max(0.0, S_next);
        z_res[i + 1] = Math.max(0.0, Z_next);
    }
    
    simData = {
        success: true,
        time: time,
        s: s_res,
        z: z_res,
        final_s: s_res[steps - 1],
        final_z: z_res[steps - 1],
        t_desc: t_desc,
        s_refugio: s_refugio
    };
    
    // Actualizar panel de estadísticas finales
    statHuman.textContent = Math.round(simData.final_s).toLocaleString();
    statZombie.textContent = Math.round(simData.final_z).toLocaleString();
    
    // Renderizar / Actualizar gráfico
    updateChart();
    
    // Reajustar la línea de tiempo
    timelineSlider.max = time.length - 1;
    if (currentStep >= time.length) {
        currentStep = 0;
    }
    timelineSlider.value = currentStep;
    updateVisualsAtStep(currentStep);
    
    // Actualizar bitácora táctica del sidebar
    updateConsoleLogs(t_desc);
}

// Plugin de hitos para dibujar líneas verticales en Chart.js
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
        
        currentStep += 5; // Aumentar en 5 días por paso para que la reproducción de 4562 días sea más fluida y rápida
        if (currentStep >= simData.time.length) {
            currentStep = 0;
        }
        
        timelineSlider.value = currentStep;
        updateVisualsAtStep(currentStep);
        
        animationId = setTimeout(run, 30); // 30ms por paso
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
