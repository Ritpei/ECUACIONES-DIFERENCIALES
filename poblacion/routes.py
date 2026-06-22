# -*- coding: utf-8 -*-
from flask import Blueprint, render_template, jsonify, request
import numpy as np

# Definición del Blueprint
poblacion_bp = Blueprint('poblacion', __name__,
                          template_folder='templates',
                          static_folder='static',
                          static_url_path='/static')

# Resolvedor Numérico Runge-Kutta de 4to Orden (RK4)
def rk4_solve(f, P0, t_span):
    n = len(t_span)
    P = np.zeros(n)
    P[0] = P0
    for i in range(n - 1):
        h = t_span[i+1] - t_span[i]
        t = t_span[i]
        curr_P = P[i]
        
        k1 = f(t, curr_P)
        k2 = f(t + h/2, curr_P + h*k1/2)
        k3 = f(t + h/2, curr_P + h*k2/2)
        k4 = f(t + h, curr_P + h*k3)
        
        next_P = curr_P + (h/6) * (k1 + 2*k2 + 2*k3 + k4)
        P[i+1] = max(0.0, next_P)
    return P

@poblacion_bp.route('/')
def index():
    return render_template('poblacion/index.html')

@poblacion_bp.route('/api/simulate', methods=['GET'])
def simulate():
    try:
        P0 = float(request.args.get('P0', 1.74))
        r = float(request.args.get('r', 0.035))
        K = float(request.args.get('K', 10.0))
        t_max = float(request.args.get('t_max', 100.0))
        steps = int(request.args.get('steps', 100))
        
        t_span = np.linspace(0, t_max, steps)
        f_logistic = lambda t, P: r * P * (1.0 - P / K)
        
        P_num = rk4_solve(f_logistic, P0, t_span)
        exp_rt = np.exp(r * t_span)
        P_exact = (K * P0 * exp_rt) / (K + P0 * (exp_rt - 1.0))
        
        years = (1950 + t_span).tolist()
        
        return jsonify({
            'success': True,
            'time': t_span.tolist(),
            'years': years,
            'pop_numerical': P_num.tolist(),
            'pop_analytical': P_exact.tolist(),
            'parameters': {
                'P0': P0,
                'r': r,
                'K': K
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
