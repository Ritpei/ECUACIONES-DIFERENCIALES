# -*- coding: utf-8 -*-
from flask import Flask, jsonify, request, render_template
import numpy as np

app = Flask(__name__)

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

@app.route('/')
def index():
    # Renderiza la interfaz de simulación
    return render_template('index.html')

@app.route('/api/simulate', methods=['GET'])
def simulate():
    try:
        # Recuperar parámetros de la URL con valores por defecto razonables para la pizza
        T0 = float(request.args.get('T0', 200.0))    # Temperatura inicial de la pizza (°C)
        Tm = float(request.args.get('Tm', 20.0))     # Temperatura ambiente de la habitación (°C)
        k = float(request.args.get('k', 0.05))       # Constante de enfriamiento de la pizza (1/min)
        t_max = float(request.args.get('t_max', 90.0)) # Tiempo máximo de simulación (minutos)
        steps = int(request.args.get('steps', 100))   # Cantidad de pasos numéricos
        
        # Crear vector de tiempo
        t_span = np.linspace(0, t_max, steps)
        
        # Definir la EDO del Enfriamiento de Newton: dT/dt = -k * (T - Tm)
        f_cooling = lambda t, T: -k * (T - Tm)
        
        # Resolver numéricamente con RK4
        T_num = rk4_solve(f_cooling, T0, t_span)
        
        # Calcular solución analítica exacta: T(t) = Tm + (T0 - Tm) * e^(-k*t)
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

if __name__ == '__main__':
    # Ejecuta el servidor Flask en el puerto 5001 para el proyecto 1
    app.run(host='0.0.0.0', port=5001, debug=True)
