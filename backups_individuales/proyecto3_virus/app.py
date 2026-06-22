# -*- coding: utf-8 -*-
from flask import Flask, jsonify, request, render_template
import numpy as np

app = Flask(__name__)

# Resolvedor Numérico RK4 para Sistemas de EDOs acopladas (SIR)
def rk4_solve_sir(beta, gamma, N, S0, I0, R0, t_span):
    n = len(t_span)
    S = np.zeros(n)
    I = np.zeros(n)
    R = np.zeros(n)
    
    S[0] = S0
    I[0] = I0
    R[0] = R0
    
    # Sistema de EDOs:
    # dS/dt = - (beta * S * I) / N
    # dI/dt = (beta * S * I) / N - gamma * I
    # dR/dt = gamma * I
    def f(t, y):
        s_val, i_val, r_val = y
        # Evitar valores negativos
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
        
        # Guardar resultados limitándolos a valores lógicos
        S[i+1] = max(0.0, min(N, y_next[0]))
        I[i+1] = max(0.0, min(N, y_next[1]))
        R[i+1] = max(0.0, min(N, y_next[2]))
        
    return S, I, R

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/simulate', methods=['GET'])
def simulate():
    try:
        # Población total (N): computadoras en la red corporativa o global vulnerable
        N = float(request.args.get('N', 100000.0))
        # Pacientes cero infectados inicialmente: 1 computadora
        I0 = float(request.args.get('I0', 1.0))
        # Inicialmente inmunes/parcheadas
        R0 = float(request.args.get('R0', 0.0))
        # Susceptibles iniciales: S0 = N - I0 - R0
        S0 = N - I0 - R0
        
        # Parámetros epidemiológicos controlados por sliders
        # Tasa de contagio informática (beta): probabilidad de transmisión SMB por día
        beta = float(request.args.get('beta', 0.85))
        # Tasa de parcheo/inmunización (gamma): probabilidad de remediación/parcheo por día
        gamma = float(request.args.get('gamma', 0.15))
        
        t_max = float(request.args.get('t_max', 10.0)) # Simulación a 10 días
        steps = int(request.args.get('steps', 150))
        
        t_span = np.linspace(0, t_max, steps)
        
        # Resolver el sistema acoplado SIR
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

if __name__ == '__main__':
    # Ejecuta el servidor Flask en el puerto 5003 para el proyecto 3
    app.run(host='0.0.0.0', port=5003, debug=True)
