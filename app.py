# -*- coding: utf-8 -*-
from flask import Flask, render_template

app = Flask(__name__)

# Registrar Blueprints de los 4 proyectos
from enfriamiento.routes import enfriamiento_bp
from poblacion.routes import poblacion_bp
from virus.routes import virus_bp
from zombies.routes import zombies_bp

app.register_blueprint(enfriamiento_bp, url_prefix='/enfriamiento')
app.register_blueprint(poblacion_bp, url_prefix='/poblacion')
app.register_blueprint(virus_bp, url_prefix='/virus')
app.register_blueprint(zombies_bp, url_prefix='/zombies')

# Ruta para el menú principal (Dashboard/Hub)
@app.route('/')
def home():
    return render_template('home.html')

if __name__ == '__main__':
    # El servidor central correrá en el puerto 8000 para evitar conflictos con AirPlay en macOS
    app.run(host='0.0.0.0', port=8000, debug=True)
