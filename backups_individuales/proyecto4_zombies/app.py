# -*- coding: utf-8 -*-
from flask import Flask, jsonify, request, render_template
import numpy as np
from scipy.integrate import odeint

app = Flask(__name__)

# Función del modelo EDO para The Walking Dead
def modelo_twd(y, t, t_desc, s_refugio):
    S, Z = y
    
    # 1. Variables temporales basadas en el lore
    # Día t_desc: Se descubre la necesidad de destruir el cerebro
    kappa = 1.0 if t < t_desc else 0.05  # 5% de error humano al rematar a los muertos después de enterarse
    
    # Día 1277 (3.5 años): Empiezan a nacer niños nuevamente en los refugios amurallados
    b = 0.0 if t < 1277 else (15.0 / 1000.0) / 365.0  # Tasa de natalidad baja
    
    # Mortalidad natural diaria (edad, enfermedades previas, hambruna leve)
    d = (10.0 / 1000.0) / 365.0 
    
    # 2. Factores de Infección y Combate adaptativos
    # Los humanos aprenden tácticas de defensa y los zombies se vuelven más lentos
    if t < 150:        # Caos inicial
        beta = 0.3
        alpha = 0.01
    elif t < t_desc:   # Supervivencia nómada
        beta = 0.05
        alpha = 0.05
    else:              # Comunidades organizadas y amuralladas
        beta = 0.005
        alpha = 0.2
        
    # 3. Decaimiento Zombie (Putrefacción)
    # Un zombie promedio se deteriora por completo en 5 años
    zeta = 1.0 / (5.0 * 365.0)
    
    # 4. Factor de Refugio (Aislamiento demográfico)
    # Si la población humana se aproxima a la capacidad del refugio, la tasa de contagio cae drásticamente
    factor_aislamiento = max(0.0, (S - s_refugio) / S) if S > 0 else 0.0
    beta_efectiva = beta * factor_aislamiento
    
    # Población total activa
    N = S + Z if (S + Z) > 0 else 1.0
    
    # 5. Sistema de EDOs
    dSdt = (b * S) - (d * S) - (beta_efectiva * S * Z / N)
    dZdt = (kappa * d * S) + (beta_efectiva * S * Z / N) - (alpha * S * Z / N) - (zeta * Z)
    
    return [dSdt, dZdt]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/simular', methods=['POST'])
def simular():
    try:
        # Recuperar datos del JSON enviado por el frontend
        data = request.get_json() or {}
        
        t_desc = float(data.get('t_desc', 365.0))         # Día de descubrimiento (por defecto Año 1)
        s_refugio = float(data.get('s_refugio', 70000.0)) # Capacidad del refugio (por defecto 70,000)
        
        # Población inicial (2010): 6,900 millones de humanos y 100 zombies
        S0 = 6900000000.0
        Z0 = 100.0
        y0 = [S0, Z0]
        
        # Vector de tiempo: 12.5 años (4562 días)
        dias_totales = 4562
        t_span = np.linspace(0, dias_totales, dias_totales)
        
        # Resolver el sistema acoplado de EDOs usando scipy.integrate.odeint
        sol = odeint(modelo_twd, y0, t_span, args=(t_desc, s_refugio))
        
        S_res = sol[:, 0]
        Z_res = sol[:, 1]
        
        # Formatear la respuesta JSON
        return jsonify({
            'success': True,
            'time': t_span.tolist(),
            's': S_res.tolist(),
            'z': Z_res.tolist(),
            'final_s': float(S_res[-1]),
            'final_z': float(Z_res[-1]),
            't_desc': t_desc,
            's_refugio': s_refugio
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

if __name__ == '__main__':
    # Ejecutar en el puerto 5005 para no interferir con las otras aplicaciones
    app.run(host='0.0.0.0', port=5005, debug=True)
