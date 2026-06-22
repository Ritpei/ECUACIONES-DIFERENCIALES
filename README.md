# Simulaciones de Sistemas Dinámicos con Ecuaciones Diferenciales Ordinarias (EDO)

Este repositorio contiene 4 proyectos académicos independientes para modelar, simular y visualizar sistemas dinámicos con EDOs. Cada proyecto utiliza un backend en Python (Flask) para resolver numéricamente las ecuaciones y un frontend premium en HTML, CSS y JS con gráficos interactivos y explicaciones matemáticas en MathJax.

## Proyectos

1. **Proyecto 1: Enfriamiento de Alimentos** (Ley de Enfriamiento de Newton)
   - Simulación de una rebanada de pizza recién salida del horno que se enfría en una habitación.
   - Cuenta con una pizza animada por CSS cuyo color cambia de caliente (rojo/naranja) a frío (amarillo/marrón) en tiempo real.
   - Puerto de ejecución: `5001`

2. **Proyecto 2: Crecimiento Poblacional** (Modelo Logístico - Jalisco)
   - Simulación demográfica de la población del estado de Jalisco, México, entre los años 1950 y 2050.
   - Cuenta con un mapa interactivo (Leaflet.js) con un overlay que representa la densidad poblacional y reacciona cuando se aproxima a la capacidad de carga ($K$).
   - Puerto de ejecución: `5002`

3. **Proyecto 3: Propagación de Virus Informático** (Modelo Epidemiológico SIR - WannaCry)
   - Simulación de la propagación del malware WannaCry (2017) en una red empresarial o global.
   - Gráfico de storytelling con hitos históricos (lanzamiento de la infección, propagación masiva y el parche/Kill-Switch de MalwareTech).
   - Puerto de ejecución: `5003`

4. **Proyecto 4: Simulador de Brotes Zombies** (Modelos de Ciencia Ficción - SZR / Compartimentos Adaptados)
   - Simulación del apocalipsis zombie bajo tres presets icónicos:
     - **Wildfire (TWD)**: Infección latente universal. Reanimación al morir por cualquier causa.
     - **Solanum (WWZ)**: Transmisión rápida por mordedura. Compartimento de **Camuflaje (C)** para personas enfermas/vacunadas que los zombies ignoran. Evento dinámico de vacuna temporal.
     - **Rabia (28 Días Después)**: Infectados vivos rabiosos. Muerte natural por inanición tras ayuno biológico prolongado.
   - Interfaz temática de búnker de supervivencia.
   - Puerto de ejecución: `5004`

---

## Requisitos de Instalación

Es necesario tener instalado Python 3.8 o superior. Se recomienda utilizar un entorno virtual.

### 1. Crear y activar un entorno virtual (opcional pero recomendado):
```bash
python3 -m venv venv
source venv/bin/activate
```

### 2. Instalar dependencias:
```bash
pip install -r requirements.txt
```

---

## Ejecución de las Aplicaciones

Puedes ejecutar los 4 proyectos simultáneamente en terminales distintas:

### Proyecto 1: Enfriamiento de Alimentos
```bash
python proyecto1_enfriamiento/app.py
```
Acceso web: `http://localhost:5001`

### Proyecto 2: Crecimiento Poblacional
```bash
python proyecto2_crecimiento/app.py
```
Acceso web: `http://localhost:5002`

### Proyecto 3: Propagación de Virus Informático
```bash
python proyecto3_virus/app.py
```
Acceso web: `http://localhost:5003`

### Proyecto 4: Simulador de Brotes Zombies
```bash
python proyecto4_zombies/app.py
```
Acceso web: `http://localhost:5004`
