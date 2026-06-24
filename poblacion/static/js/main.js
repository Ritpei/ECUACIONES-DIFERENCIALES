/**
 * ==========================================================================
 * LÓGICA DE CONTROL Y VISUALIZACIÓN DEMOGRÁFICA - CRECIMIENTO DE VERHULST
 * Controla la actualización dinámica del mapa Leaflet (círculo de densidad),
 * la integración opcional de Google Maps y las gráficas avanzadas en Chart.js.
 * ==========================================================================
 */

// Variables globales de simulación y gráficos
let simData = null;       // Datos estructurados devueltos por el API poblacional de Flask
let chart = null;         // Instancia única del gráfico Chart.js
let animationId = null;   // ID del temporizador para la animación
let isPlaying = false;    // Estado de la reproducción
let currentStep = 0;      // Paso seleccionado actual (0 a 149)

// Variables de Mapas (Leaflet y Google Maps)
let mapType = 'leaflet';  // Tipo de mapa activo: 'leaflet' o 'google'
let leafletMap = null;
let leafletCircle = null;
let googleMap = null;
let googleCircle = null;
const mapCenter = [20.6597, -103.3496]; // Centro de Jalisco (Guadalajara)

// Elementos del DOM
const sliderP0 = document.getElementById('slider-p0');
const sliderR = document.getElementById('slider-r');
const sliderK = document.getElementById('slider-k');

const valP0 = document.getElementById('val-p0');
const valR = document.getElementById('val-r');
const valK = document.getElementById('val-k');

const timelineSlider = document.getElementById('timeline-slider');
const currentSimYear = document.getElementById('current-sim-year');
const metricYear = document.getElementById('metric-year');
const metricPop = document.getElementById('metric-pop');
const metricKPercent = document.getElementById('metric-k-percent');
const progressBarFill = document.getElementById('progress-bar-fill');
const playBtn = document.getElementById('play-btn');

/**
 * Evento de inicio del DOM: Carga componentes iniciales
 */
document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    setupSliders();
    initLeafletMap();
    fetchSimulation();

    // Sincronizar eventos de botones y timeline
    playBtn.addEventListener('click', togglePlayback);
    timelineSlider.addEventListener('input', (e) => {
        pausePlayback();
        currentStep = parseInt(e.target.value);
        updateVisualsAtStep(currentStep);
    });

    // Configurar carga opcional de Google Maps API si el usuario ingresa clave
    const loadGmapsBtn = document.getElementById('load-gmaps-btn');
    const gmapsKeyInput = document.getElementById('gmaps-key');
    if (loadGmapsBtn) {
        loadGmapsBtn.addEventListener('click', () => {
            const key = gmapsKeyInput.value.trim();
            if (key) {
                loadGoogleMapsAPI(key);
            } else {
                alert("Por favor ingresa una API Key válida.");
            }
        });
    }
});

/**
 * Inicializar Mapa de Leaflet con mosaicos oscuros estilo gubernamental
 */
function initLeafletMap() {
    leafletMap = L.map('map').setView(mapCenter, 8);

    // TRUCO VISUAL: Cargar mosaicos oscuros de CartoDB (Dark Matter) sin etiquetas intrusivas
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(leafletMap);

    // Crear círculo indicador de densidad poblacional inicial
    leafletCircle = L.circle(mapCenter, {
        color: '#0d9488',
        fillColor: '#0d9488',
        fillOpacity: 0.28,
        weight: 1.5,
        radius: 15000 // Radio inicial en metros (se actualiza dinámicamente)
    }).addTo(leafletMap);

    leafletCircle.bindPopup("<b>Estado de Jalisco</b><br>Monitoreo demográfico territorial.");
}

/**
 * Cargar dinámicamente el SDK de Google Maps si el usuario introduce una clave
 */
function loadGoogleMapsAPI(key) {
    if (window.google && window.google.maps) {
        initGoogleMap();
        return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=initGoogleMap`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
}

/**
 * Inicialización del callback de Google Maps
 */
window.initGoogleMap = function () {
    mapType = 'google';

    // Desmontar mapa Leaflet anterior para liberar memoria
    if (leafletMap) {
        leafletMap.remove();
        leafletMap = null;
    }

    // Crear instancia de Google Map con estilos oscuros
    const mapElement = document.getElementById('map');
    googleMap = new google.maps.Map(mapElement, {
        center: { lat: mapCenter[0], lng: mapCenter[1] },
        zoom: 8,
        styles: [
            { "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
            { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
            { "elementType": "labels.text.fill", "stylers": [{ "color": "#94a3b8" }] },
            { "elementType": "labels.text.stroke", "stylers": [{ "color": "#0f172a" }] },
            { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#334155" }] },
            { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#090e1a" }] }
        ]
    });

    googleCircle = new google.maps.Circle({
        strokeColor: '#0d9488',
        strokeOpacity: 0.8,
        strokeWeight: 1.5,
        fillColor: '#0d9488',
        fillOpacity: 0.28,
        map: googleMap,
        center: { lat: mapCenter[0], lng: mapCenter[1] },
        radius: 15000
    });

    // Ocultar el formulario flotante una vez cargado Google Maps
    const keyPanel = document.querySelector('.gmaps-overlay-panel');
    if (keyPanel) keyPanel.style.display = 'none';

    updateVisualsAtStep(currentStep);
};

/**
 * Configurar Pestañas del Dashboard
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

            // Corrección de redibujo para Leaflet al cambiar de pestaña oculta
            if (tabId === 'simulacion' && mapType === 'leaflet' && leafletMap) {
                setTimeout(() => leafletMap.invalidateSize(), 120);
            }
        });
    });
}

/**
 * Configurar Sliders con etiquetas de valor instantáneo
 */
function setupSliders() {
    const updateValues = () => {
        valP0.textContent = `${parseFloat(sliderP0.value).toFixed(2)} M`;
        valR.textContent = `${(parseFloat(sliderR.value) * 100).toFixed(1)}%`;
        valK.textContent = `${parseFloat(sliderK.value).toFixed(1)} M`;
    };

    [sliderP0, sliderR, sliderK].forEach(slider => {
        slider.addEventListener('input', () => {
            updateValues();
            fetchSimulation(); // Recalcular variables demográficas inmediatamente
        });
    });

    updateValues();
}

/**
 * Consultar al backend de Flask la resolución analítica/numérica
 */
async function fetchSimulation() {
    const P0 = sliderP0.value;
    const r = sliderR.value;
    const K = sliderK.value;

    try {
        const response = await fetch(`/poblacion/api/simulate?P0=${P0}&r=${r}&K=${K}&t_max=100&steps=150`);
        const data = await response.json();

        if (data.success) {
            simData = data;
            
            // Dibujar o refrescar gráfica
            updateChart();

            // Reajustar timeline
            timelineSlider.max = data.time.length - 1;
            if (currentStep >= data.time.length) {
                currentStep = 0;
            }
            timelineSlider.value = currentStep;
            updateVisualsAtStep(currentStep);
        } else {
            console.error("Error en la proyección demográfica:", data.error);
        }
    } catch (err) {
        console.error("Error de red con EDO demográfica:", err);
    }
}

/**
 * Renderizar Gráfico de Población en Jalisco
 * Configura gradientes lineales y curvas suaves.
 */
function updateChart() {
    if (!simData) return;

    const ctx = document.getElementById('populationChart').getContext('2d');

    // TRUCO VISUAL: Creación de gradientes de color para las áreas demográficas
    const numericalGradient = ctx.createLinearGradient(0, 0, 0, 280);
    numericalGradient.addColorStop(0, 'rgba(13, 148, 136, 0.22)');
    numericalGradient.addColorStop(1, 'rgba(13, 148, 136, 0.00)');

    const analyticalGradient = ctx.createLinearGradient(0, 0, 0, 280);
    analyticalGradient.addColorStop(0, 'rgba(37, 99, 235, 0.15)');
    analyticalGradient.addColorStop(1, 'rgba(37, 99, 235, 0.00)');

    if (chart) {
        chart.data.labels = simData.years.map(y => Math.round(y));
        chart.data.datasets[0].data = simData.pop_numerical;
        chart.data.datasets[1].data = simData.pop_analytical;
        chart.data.datasets[0].backgroundColor = numericalGradient;
        chart.data.datasets[1].backgroundColor = analyticalGradient;
        chart.update();
        return;
    }

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: simData.years.map(y => Math.round(y)),
            datasets: [
                {
                    label: 'RK4 (Integración Numérica)',
                    data: simData.pop_numerical,
                    borderColor: '#0d9488',
                    backgroundColor: numericalGradient,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#0d9488',
                    pointHoverBorderColor: '#ffffff',
                    tension: 0.4, // Curva suavizada premium
                    fill: true
                },
                {
                    label: 'Exacto (Función Logística)',
                    data: simData.pop_analytical,
                    borderColor: '#2563eb',
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
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#0d9488',
                    titleFont: { family: 'Space Grotesk', size: 12, weight: 'bold' },
                    bodyFont: { family: 'Outfit', size: 11 },
                    borderColor: 'rgba(13, 148, 136, 0.25)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label.split(' ')[0]}: ${context.raw.toFixed(4)} millones`;
                        },
                        title: function (context) {
                            return `AÑO: ${context[0].label}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: {
                        color: '#94a3b8',
                        font: { family: 'Fira Code', size: 10 },
                        maxTicksLimit: 12
                    },
                    title: {
                        display: true,
                        text: 'Año Transcurrido',
                        color: '#94a3b8',
                        font: { family: 'Space Grotesk', size: 11, weight: 'bold' }
                    }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: {
                        color: '#94a3b8',
                        font: { family: 'Fira Code', size: 10 }
                    },
                    title: {
                        display: true,
                        text: 'Población (Millones de hab.)',
                        color: '#94a3b8',
                        font: { family: 'Space Grotesk', size: 11, weight: 'bold' }
                    }
                }
            }
        }
    });
}

/**
 * Actualizar mapa de Leaflet, barras e indicadores de métricas
 */
function updateVisualsAtStep(step) {
    if (!simData) return;

    const year = Math.round(simData.years[step]);
    const pop = simData.pop_numerical[step];
    const K = simData.parameters.K;

    // Calcular porcentaje de capacidad ocupada
    const percentK = (pop / K) * 100;

    // Actualizar campos de texto
    currentSimYear.textContent = year;
    metricYear.textContent = year;
    metricPop.textContent = `${pop.toFixed(3)} M`;
    metricKPercent.textContent = `${percentK.toFixed(1)}%`;

    // Sincronizar la barra de progreso de capacidad de carga
    progressBarFill.style.width = `${Math.min(100, percentK)}%`;

    // TRUCO VISUAL: Alerta por saturación demográfica (K >= 95.0%)
    // Si la población alcanza el 95% de la capacidad territorial, la barra y el círculo de mapa brillan en rojo.
    const isSaturated = percentK >= 95.0;
    if (isSaturated) {
        progressBarFill.style.background = 'linear-gradient(to right, #ef4444, #b91c1c)';
        progressBarFill.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.6)';
    } else {
        progressBarFill.style.background = 'linear-gradient(to right, var(--blue-gov), var(--teal-gov))';
        progressBarFill.style.boxShadow = '0 0 8px var(--teal-glow)';
    }

    // TRUCO VISUAL: Radio del mapa Leaflet dinámico
    // El radio crece proporcionalmente desde 15km (población inicial baja) hasta 75km (población saturada)
    const baseRadius = 15000;
    const finalRadius = baseRadius + (pop / K) * 60000;
    const color = isSaturated ? '#ef4444' : '#0d9488';

    if (mapType === 'leaflet' && leafletCircle) {
        leafletCircle.setRadius(finalRadius);
        leafletCircle.setStyle({
            color: color,
            fillColor: color
        });
        leafletCircle.setPopupContent(`<b>Año: ${year}</b><br>Población: ${pop.toFixed(3)} M<br>Ocupación: ${percentK.toFixed(1)}%`);
    } else if (mapType === 'google' && googleCircle) {
        googleCircle.setRadius(finalRadius);
        googleCircle.setOptions({
            strokeColor: color,
            fillColor: color
        });
    }

    // Sincronizar rellenos físicos bajo los sliders
    const p0Percent = ((sliderP0.value - sliderP0.min) / (sliderP0.max - sliderP0.min)) * 100;
    const rPercent = ((sliderR.value - sliderR.min) / (sliderR.max - sliderR.min)) * 100;
    const kPercent = ((sliderK.value - sliderK.min) / (sliderK.max - sliderK.min)) * 100;
    const timelinePercent = (step / (simData.time.length - 1)) * 100;

    document.querySelector('.fill-p0').style.width = `${p0Percent}%`;
    document.querySelector('.fill-r').style.width = `${rPercent}%`;
    document.querySelector('.fill-k').style.width = `${kPercent}%`;
    document.querySelector('.fill-timeline').style.width = `${timelinePercent}%`;

    // Sincronizar indicador interactivo de gráfico
    if (chart) {
        chart.setActiveElements([
            { datasetIndex: 0, index: step }
        ]);
        chart.update('none');
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
    playBtn.innerHTML = '<span class="play-icon">&#10074;&#10074;</span>'; // Pausa

    const run = () => {
        if (!isPlaying) return;

        currentStep++;
        if (currentStep >= simData.time.length) {
            currentStep = 0; // Bucle
        }

        timelineSlider.value = currentStep;
        updateVisualsAtStep(currentStep);

        animationId = setTimeout(run, 60); // 60ms por año demográfico
    };

    run();
}

/**
 * Pausa
 */
function pausePlayback() {
    isPlaying = false;
    playBtn.innerHTML = '<span class="play-icon">&#9654;</span>'; // Play
    if (animationId) {
        clearTimeout(animationId);
        animationId = null;
    }
}
