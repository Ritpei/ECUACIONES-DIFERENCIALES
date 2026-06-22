// Variables globales de simulación y gráficos
let simData = null;
let chart = null;
let animationId = null;
let isPlaying = false;
let currentStep = 0;

// Variables de Mapas (Leaflet y Google Maps)
let mapType = 'leaflet'; // 'leaflet' o 'google'
let leafletMap = null;
let leafletCircle = null;
let googleMap = null;
let googleCircle = null;
const mapCenter = [20.6597, -103.3496]; // Jalisco (Guadalajara)

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

document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    setupSliders();
    initLeafletMap();
    fetchSimulation();

    playBtn.addEventListener('click', togglePlayback);
    timelineSlider.addEventListener('input', (e) => {
        pausePlayback();
        currentStep = parseInt(e.target.value);
        updateVisualsAtStep(currentStep);
    });

    // Configurar carga opcional de Google Maps API
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

// Inicializar Mapa Leaflet (Dark Mode por defecto)
function initLeafletMap() {
    leafletMap = L.map('map').setView(mapCenter, 8);

    // Usar mosaicos oscuros de CartoDB
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(leafletMap);

    // Crear círculo para representar la población
    leafletCircle = L.circle(mapCenter, {
        color: '#0d9488',
        fillColor: '#0d9488',
        fillOpacity: 0.35,
        radius: 10000 // Se actualizará en la simulación
    }).addTo(leafletMap);

    // Vincular popup
    leafletCircle.bindPopup("<b>Región Jalisco</b><br>Monitoreo de densidad poblacional.");
}

// Cargar dinámicamente Google Maps API si el usuario proporciona clave
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

// Inicializar Google Map
window.initGoogleMap = function () {
    mapType = 'google';

    // Destruir mapa Leaflet si existe
    if (leafletMap) {
        leafletMap.remove();
        leafletMap = null;
    }

    // Crear Google Map con estilo oscuro
    const mapElement = document.getElementById('map');
    googleMap = new google.maps.Map(mapElement, {
        center: { lat: mapCenter[0], lng: mapCenter[1] },
        zoom: 8,
        styles: [
            { "elementType": "geometry", "stylers": [{ "color": "#212121" }] },
            { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
            { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
            { "elementType": "labels.text.stroke", "stylers": [{ "color": "#212121" }] },
            { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#757575" }] },
            { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
        ]
    });

    googleCircle = new google.maps.Circle({
        strokeColor: '#0d9488',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#0d9488',
        fillOpacity: 0.35,
        map: googleMap,
        center: { lat: mapCenter[0], lng: mapCenter[1] },
        radius: 10000 // En metros
    });

    // Ocultar formulario de API Key
    const keyPanel = document.querySelector('.gmaps-overlay-panel');
    if (keyPanel) keyPanel.style.display = 'none';

    updateVisualsAtStep(currentStep);
};

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

            // Recargar mapa Leaflet para arreglar fallas de renderizado en pestañas ocultas
            if (tabId === 'simulacion' && mapType === 'leaflet' && leafletMap) {
                setTimeout(() => leafletMap.invalidateSize(), 100);
            }
        });
    });
}

// Configurar Sliders
function setupSliders() {
    const updateValues = () => {
        valP0.textContent = `${sliderP0.value} M`;
        valR.textContent = `${(sliderR.value * 100).toFixed(1)}%`;
        valK.textContent = `${sliderK.value} M`;
    };

    [sliderP0, sliderR, sliderK].forEach(slider => {
        slider.addEventListener('input', () => {
            updateValues();
            fetchSimulation();
        });
    });

    updateValues();
}

// Solicitar Simulación a Flask
async function fetchSimulation() {
    const P0 = sliderP0.value;
    const r = sliderR.value;
    const K = sliderK.value;

    try {
        const response = await fetch(`/poblacion/api/simulate?P0=${P0}&r=${r}&K=${K}&t_max=100&steps=150`);
        const data = await response.json();

        if (data.success) {
            simData = data;
            updateChart();

            timelineSlider.max = data.time.length - 1;
            if (currentStep >= data.time.length) {
                currentStep = 0;
            }
            timelineSlider.value = currentStep;
            updateVisualsAtStep(currentStep);
        } else {
            console.error("Error simulando:", data.error);
        }
    } catch (err) {
        console.error("Error de red:", err);
    }
}

// Renderizar Gráfico
function updateChart() {
    if (!simData) return;

    const ctx = document.getElementById('populationChart').getContext('2d');

    if (chart) {
        chart.data.labels = simData.years.map(y => Math.round(y));
        chart.data.datasets[0].data = simData.pop_numerical;
        chart.data.datasets[1].data = simData.pop_analytical;
        chart.update();
        return;
    }

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: simData.years.map(y => Math.round(y)),
            datasets: [
                {
                    label: 'RK4 (Numérico)',
                    data: simData.pop_numerical,
                    borderColor: '#0d9488',
                    backgroundColor: 'rgba(13, 148, 136, 0.1)',
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    tension: 0.1
                },
                {
                    label: 'Exacto (Analítico)',
                    data: simData.pop_analytical,
                    borderColor: '#0ea5e9',
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
                        font: { family: 'Outfit' }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    titleFont: { family: 'Space Grotesk' },
                    bodyFont: { family: 'Outfit' },
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: ${context.raw.toFixed(3)} Millones`;
                        },
                        title: function (context) {
                            return `Año: ${context[0].label}`;
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
                        text: 'Año',
                        color: '#f8fafc',
                        font: { family: 'Outfit' }
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
                        text: 'Población (Millones)',
                        color: '#f8fafc',
                        font: { family: 'Outfit' }
                    }
                }
            }
        }
    });
}

// Actualizar Mapa e Indicadores en cada paso temporal
function updateVisualsAtStep(step) {
    if (!simData) return;

    const year = Math.round(simData.years[step]);
    const pop = simData.pop_numerical[step];
    const K = simData.parameters.K;

    // Calcular porcentaje de capacidad de carga K
    const percentK = (pop / K) * 100;

    // Actualizar Textos y Métricas
    currentSimYear.textContent = year;
    metricYear.textContent = year;
    metricPop.textContent = `${pop.toFixed(3)} M`;
    metricKPercent.textContent = `${percentK.toFixed(1)}%`;

    // Actualizar Barra de Progreso
    progressBarFill.style.width = `${Math.min(100, percentK)}%`;

    // Cambiar color a rojo si está saturando la capacidad de carga (>= 95%)
    const isSaturated = percentK >= 95.0;
    if (isSaturated) {
        progressBarFill.classList.add('saturated');
    } else {
        progressBarFill.classList.remove('saturated');
    }

    // Calcular radio de círculo proporcional al tamaño de población
    // Jalisco real tiene ~80,000 km2. Ajustemos el radio visual en metros
    // Población de 1.7M a 10M -> Radio de 15km a 75km (15,000m a 75,000m)
    const baseRadius = 15000;
    const finalRadius = baseRadius + (pop / K) * 60000;
    const color = isSaturated ? '#e11d48' : '#0d9488';

    // Actualizar superposición en el mapa
    if (mapType === 'leaflet' && leafletCircle) {
        leafletCircle.setRadius(finalRadius);
        leafletCircle.setStyle({
            color: color,
            fillColor: color
        });
        leafletCircle.setPopupContent(`<b>Año: ${year}</b><br>Población: ${pop.toFixed(3)} M<br>Capacidad: ${percentK.toFixed(1)}%`);
    } else if (mapType === 'google' && googleCircle) {
        googleCircle.setRadius(finalRadius);
        googleCircle.setOptions({
            strokeColor: color,
            fillColor: color
        });
    }

    // Sincronizar indicador de gráfico
    if (chart) {
        chart.setActiveElements([{
            datasetIndex: 0,
            index: step
        }]);
        chart.update('none');
    }
}

// Reproducción automática de la línea de tiempo
function togglePlayback() {
    if (isPlaying) {
        pausePlayback();
    } else {
        startPlayback();
    }
}

function startPlayback() {
    isPlaying = true;
    playBtn.innerHTML = '&#10074;&#10074;';

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

function pausePlayback() {
    isPlaying = false;
    playBtn.innerHTML = '&#9654;';
    if (animationId) {
        clearTimeout(animationId);
        animationId = null;
    }
}
