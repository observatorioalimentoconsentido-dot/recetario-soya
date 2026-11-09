"""Genera la versión estática de la página (para GitHub Pages).

Usa plantilla.html y las RECETAS de conexionFask.py, y crea:
  index.html, pan-de-soya.html, mantecada-de-soya.html, arepas-de-soya.html

Ejecútalo de nuevo cada vez que cambies la plantilla o las recetas:
    python generar_estatico.py
"""
import os
from jinja2 import Environment, FileSystemLoader

from conexionFask import RECETAS, CARPETA


def url_for(endpoint, **valores):
    if endpoint == "inicio":
        return "index.html"
    if endpoint == "ver_receta":
        return f"{valores['id_receta']}.html"
    if endpoint == "todas":
        return "recetas.html"
    if endpoint == "agregar":
        return "agregar.html"
    raise ValueError(f"Ruta desconocida: {endpoint}")


env = Environment(loader=FileSystemLoader(CARPETA), autoescape=True)
env.globals["url_for"] = url_for
plantilla = env.get_template("plantilla.html")


def guardar(nombre, receta):
    html = plantilla.render(recetas=RECETAS, receta=receta)
    # Ruta relativa para que funcione en usuario.github.io/repositorio/
    html = html.replace('href="/pagina.css"', 'href="pagina.css"')
    with open(os.path.join(CARPETA, nombre), "w", encoding="utf-8", newline="\n") as f:
        f.write(html)
    print("Generado:", nombre)


guardar("index.html", None)
for r in RECETAS:
    guardar(f"{r['id']}.html", r)
