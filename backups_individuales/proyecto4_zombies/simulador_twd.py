# /Users/alex/Proyectos/ESCUELA/Antigravity/proyecto4/simulador_twd.py
import numpy as np
import matplotlib.pyplot as plt
from scipy.integrate import odeint

def modelo_twd(y, t):
    S, Z = y
    
    # 1. Variables de tiempo basadas en tu Lore
    # Día 365: Se enteran de que todos están infectados (regla de destruir el cerebro)
    kappa = 1.0 if t < 365 else 0.05  # 5% de error humano al rematar a los muertos
    
    # Día 1277 (3.5 años): Empiezan a nacer niños nuevamente en las comunidades
    b = 0.0 if t < 1277 else (15 / 1000) / 365  # Tasa de natalidad baja
    
    # Mortalidad natural (enfermedad, edad, hambre)
    d = (10 / 1000) / 365 
    
    # 2. Factores de Infección y Combate adaptativo
    # La gente aprende a pelear y los zombies se vuelven más lentos
    if t < 150:    # Caos inicial
        beta = 0.3    # Alta tasa de mordidas
        alpha = 0.01  # Baja capacidad de matar zombies
    elif t < 365:  # Supervivencia nómada
        beta = 0.05
        alpha = 0.05
    else:          # Comunidades amuralladas
        beta = 0.005
        alpha = 0.2
        
    # 3. Putrefacción Zombie
    zeta = 1.0 / (5 * 365) # Un zombie promedio se pudre hasta la inmovilidad en 5 años
    
    # 4. EL FACTOR DE REFUGIO (Para evitar la extinción total)
    S_refugio = 70000  # Asumimos que ~70,000 humanos están intocables detrás de muros
    # Si la población se acerca al refugio, la tasa de ataques efectivos cae a casi cero.
    factor_aislamiento = max(0.0, (S - S_refugio) / S) if S > 0 else 0
    beta_efectiva = beta * factor_aislamiento
    
    # Modelo poblacional total (para cálculo de proporciones)
    N = S + Z if (S + Z) > 0 else 1
    
    # 5. Ecuaciones Diferenciales (EDO)
    dSdt = (b * S) - (d * S) - (beta_efectiva * S * Z / N)
    dZdt = (kappa * d * S) + (beta_efectiva * S * Z / N) - (alpha * S * Z / N) - (zeta * Z)
    
    return [dSdt, dZdt]

# Configuración Inicial
poblacion_2010 = 6.9e9  # 6.9 mil millones
zombies_paciente_0 = 100 # No se conoce la Zona 0, empieza pequeño
y0 = [poblacion_2010, zombies_paciente_0]

# Vector de tiempo: 12.5 años (4562 días)
dias_totales = 4562
t = np.linspace(0, dias_totales, dias_totales)

# Resolver las ecuaciones
solucion = odeint(modelo_twd, y0, t)
S_res = solucion[:, 0]
Z_res = solucion[:, 1]

# Imprimir los hitos
print("--- HITOS DE THE WALKING DEAD ---")
print(f"Población Mundial en 2010 (Día 0): {int(S_res[0]):,}")
print(f"Caída inicial (Día 150): Humanos: {int(S_res[150]):,} | Zombies: {int(Z_res[150]):,}")
print(f"CDC - Se descubre el secreto (Año 1): Humanos: {int(S_res[365]):,}")
print(f"Primeros nacimientos en refugios (Año 3.5): Humanos: {int(S_res[1277]):,}")
print(f"FINAL DE LA SERIE (12.5 Años): Humanos vivos: {int(S_res[-1]):,} | Zombies restantes: {int(Z_res[-1]):,}")

# --- Renderizado de Gráfico con Matplotlib ---
plt.figure(figsize=(10, 6))
plt.plot(t, S_res, label='Supervivientes (Humanos)', color='blue', linewidth=2)
plt.plot(t, Z_res, label='Caminantes (Zombies)', color='red', linewidth=2)

# Configuración visual (Escala logarítmica para poder ver a los humanos tras la caída)
plt.yscale('symlog')
plt.title('Modelo SIR adaptado - The Walking Dead (12.5 Años)', fontsize=14)
plt.xlabel('Días desde el brote inicial (2010)', fontsize=12)
plt.ylabel('Población (Escala Logarítmica)', fontsize=12)
plt.axvline(x=365, color='green', linestyle='--', label='Descubrimiento (Destruir cerebro)')
plt.axvline(x=1277, color='purple', linestyle='--', label='Reinicio de Natalidad')

plt.legend()
plt.grid(True, which="both", ls="--", alpha=0.5)
plt.tight_layout()
plt.savefig('grafico_twd.png')
print("\nGráfico guardado como 'grafico_twd.png'.")