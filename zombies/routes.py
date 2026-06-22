# -*- coding: utf-8 -*-
from flask import Blueprint, render_template, jsonify, request
import numpy as np
from scipy.integrate import odeint

# Definición del Blueprint
zombies_bp = Blueprint('zombies', __name__,
                        template_folder='templates',
                        static_folder='static',
                        static_url_path='/static')

# Función del modelo EDO para The Walking Dead
def modelo_twd(y, t, t_desc, s_refugio):
    S, Z = y
    
    # Día t_desc: Se descubre la necesidad de destruir el cerebro
    kappa = 1.0 if t < t_desc else 0.05
    
    # Día 1277 (3.5 años): Reanudación de la natalidad
    b = 0.0 if t < 1277 else (15.0 / 1000.0) / 365.0
    
    # Mortalidad natural diaria
    d = (10.0 / 1000.0) / 365.0 
    
    # Factores adaptativos
    if t < 150:        # Caos inicial
        beta = 0.3
        alpha = 0.01
    elif t < t_desc:   # Supervivencia nómada
        beta = 0.05
        alpha = 0.05
    else:              # Asentamientos estables amurallados
        beta = 0.005
        alpha = 0.2
        
    # Decaimiento / descomposición zombie
    zeta = 1.0 / (5.0 * 365.0)
    
    # Factor de Refugio
    factor_aislamiento = max(0.0, (S - s_refugio) / S) if S > 0 else 0.0
    beta_efectiva = beta * factor_aislamiento
    
    N = S + Z if (S + Z) > 0 else 1.0
    
    dSdt = (b * S) - (d * S) - (beta_efectiva * S * Z / N)
    dZdt = (kappa * d * S) + (beta_efectiva * S * Z / N) - (alpha * S * Z / N) - (zeta * Z)
    
    return [dSdt, dZdt]

@zombies_bp.route('/')
def index():
    return render_template('zombies/index.html')

@zombies_bp.route('/api/simular', methods=['POST'])
def simular():
    try:
        data = request.get_json() or {}
        t_desc = float(data.get('t_desc', 365.0))
        s_refugio = float(data.get('s_refugio', 70000.0))
        
        S0 = 6900000000.0
        Z0 = 100.0
        y0 = [S0, Z0]
        
        dias_totales = 4562
        t_span = np.linspace(0, dias_totales, dias_totales)
        
        # Resolver con scipy.integrate.odeint
        sol = odeint(modelo_twd, y0, t_span, args=(t_desc, s_refugio))
        
        S_res = sol[:, 0]
        Z_res = sol[:, 1]
        
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
