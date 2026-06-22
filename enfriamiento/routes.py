# -*- coding: utf-8 -*-
from flask import Blueprint, render_template, jsonify, request
import numpy as np

# Definición del Blueprint
enfriamiento_bp = Blueprint('enfriamiento', __name__,
                            template_folder='templates',
                            static_folder='static',
                            static_url_path='/static')

# Resolvedor Numérico Runge-Kutta de 4to Orden (RK4)
def rk4_solve(f, T0, t_span):
    n = len(t_span)
    T = np.zeros(n)
    T[0] = T0
    for i in range(n - 1):
        h = t_span[i+1] - t_span[i]
        t = t_span[i]
        curr_T = T[i]
        
        k1 = f(t, curr_T)
        k2 = f(t + h/2, curr_T + h*k1/2)
        k3 = f(t + h/2, curr_T + h*k2/2)
        k4 = f(t + h, curr_T + h*k3)
        
        T[i+1] = curr_T + (h/6) * (k1 + 2*k2 + 2*k3 + k4)
    return T

@enfriamiento_bp.route('/')
def index():
    return render_template('enfriamiento/index.html')

@enfriamiento_bp.route('/api/simulate', methods=['GET'])
def simulate():
    try:
        T0 = float(request.args.get('T0', 200.0))
        Tm = float(request.args.get('Tm', 20.0))
        k = float(request.args.get('k', 0.05))
        t_max = float(request.args.get('t_max', 90.0))
        steps = int(request.args.get('steps', 100))
        
        t_span = np.linspace(0, t_max, steps)
        f_cooling = lambda t, T: -k * (T - Tm)
        
        T_num = rk4_solve(f_cooling, T0, t_span)
        T_exact = Tm + (T0 - Tm) * np.exp(-k * t_span)
        
        return jsonify({
            'success': True,
            'time': t_span.tolist(),
            'temp_numerical': T_num.tolist(),
            'temp_analytical': T_exact.tolist(),
            'parameters': {
                'T0': T0,
                'Tm': Tm,
                'k': k
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
