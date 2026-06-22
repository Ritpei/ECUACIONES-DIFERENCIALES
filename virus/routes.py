# -*- coding: utf-8 -*-
from flask import Blueprint, render_template, jsonify, request
import numpy as np

# Definición del Blueprint
virus_bp = Blueprint('virus', __name__,
                      template_folder='templates',
                      static_folder='static',
                      static_url_path='/static')

# Resolvedor Numérico RK4 para Sistemas de EDOs acopladas (SIR)
def rk4_solve_sir(beta, gamma, N, S0, I0, R0, t_span):
    n = len(t_span)
    S = np.zeros(n)
    I = np.zeros(n)
    R = np.zeros(n)
    
    S[0] = S0
    I[0] = I0
    R[0] = R0
    
    def f(t, y):
        s_val, i_val, r_val = y
        s_val = max(0.0, s_val)
        i_val = max(0.0, i_val)
        r_val = max(0.0, r_val)
        
        ds = - (beta * s_val * i_val) / N
        di = ((beta * s_val * i_val) / N) - (gamma * i_val)
        dr = gamma * i_val
        return np.array([ds, di, dr])

    for i in range(n - 1):
        h = t_span[i+1] - t_span[i]
        t = t_span[i]
        y_curr = np.array([S[i], I[i], R[i]])
        
        k1 = f(t, y_curr)
        k2 = f(t + h/2, y_curr + h*k1/2)
        k3 = f(t + h/2, y_curr + h*k2/2)
        k4 = f(t + h, y_curr + h*k3)
        
        y_next = y_curr + (h/6) * (k1 + 2*k2 + 2*k3 + k4)
        
        S[i+1] = max(0.0, min(N, y_next[0]))
        I[i+1] = max(0.0, min(N, y_next[1]))
        R[i+1] = max(0.0, min(N, y_next[2]))
        
    return S, I, R

@virus_bp.route('/')
def index():
    return render_template('virus/index.html')

@virus_bp.route('/api/simulate', methods=['GET'])
def simulate():
    try:
        N = float(request.args.get('N', 100000.0))
        I0 = float(request.args.get('I0', 1.0))
        R0 = float(request.args.get('R0', 0.0))
        S0 = N - I0 - R0
        
        beta = float(request.args.get('beta', 0.85))
        gamma = float(request.args.get('gamma', 0.15))
        
        t_max = float(request.args.get('t_max', 10.0))
        steps = int(request.args.get('steps', 150))
        
        t_span = np.linspace(0, t_max, steps)
        S, I, R = rk4_solve_sir(beta, gamma, N, S0, I0, R0, t_span)
        
        return jsonify({
            'success': True,
            'time': t_span.tolist(),
            'susceptible': S.tolist(),
            'infected': I.tolist(),
            'recovered': R.tolist(),
            'parameters': {
                'N': N,
                'beta': beta,
                'gamma': gamma
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
