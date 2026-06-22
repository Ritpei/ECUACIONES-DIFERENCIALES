# -*- coding: utf-8 -*-
from flask import Flask, jsonify, request, render_template
import numpy as np

app = Flask(__name__)

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
        
        # Evitar valores negativos por inestabilidad numérica extrema
        next_P = curr_P + (h/6) * (k1 + 2*k2 + 2*k3 + k4)
        P[i+1] = max(0.0, next_P)
    return P

@app.route('/')
def index():
    # Renderiza la interfaz principal
    return render_template('index.html')

@app.route('/api/simulate', methods=['GET'])
def simulate():
    try:
        # Recuperar parámetros con valores realistas para Jalisco, México (1950 - 2050)
        # Población inicial en 1950: ~1.74 millones
        P0 = float(request.args.get('P0', 1.74))
        # Tasa de crecimiento intrínseca (r): ~3.5% = 0.035
        r = float(request.args.get('r', 0.035))
        # Capacidad de carga (K): ~10.0 millones (límite demográfico teórico para el estado)
        K = float(request.args.get('K', 10.0))
        t_max = float(request.args.get('t_max', 100.0)) # Años transcurridos (1950 a 2050)
        steps = int(request.args.get('steps', 100))
        
        # Vector de tiempo
        t_span = np.linspace(0, t_max, steps)
        
        # Ecuación Logística: dP/dt = r * P * (1 - P / K)
        f_logistic = lambda t, P: r * P * (1.0 - P / K)
        
        # Solución numérica RK4
        P_num = rk4_solve(f_logistic, P0, t_span)
        
        # Solución analítica exacta: P(t) = (K * P0 * e^(r*t)) / (K + P0 * (e^(r*t) - 1))
        # Para evitar desbordamientos numéricos si r*t es muy grande:
        exp_rt = np.exp(r * t_span)
        P_exact = (K * P0 * exp_rt) / (K + P0 * (exp_rt - 1.0))
        
        # Mapeo de tiempo a años calendario (1950 + t)
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

if __name__ == '__main__':
    # Ejecuta el servidor Flask en el puerto 5002 para el proyecto 2
    app.run(host='0.0.0.0', port=5002, debug=True)
