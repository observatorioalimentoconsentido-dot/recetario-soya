import os
from flask import Flask, render_template, send_from_directory, abort

CARPETA = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__, template_folder=CARPETA)

RECETAS = [
    {
        "id": "pan-de-soya",
        "nombre": "Pan de soya",
        "descripcion": "Bolitas de pan horneadas, rellenas de queso y bocadillo.",
        "coccion": "Horno 180 °C",
        "tiempo": "1 h 30 min aprox.",
        "ingredientes": [
            "2 tazas de soya.",
            "1 taza de harina de trigo o harina panificable.",
            "2 cucharadas de azúcar.",
            "1 cucharadita de sal.",
            "½ taza de margarina o mantequilla.",
            "Queso al gusto.",
            "Bocadillo al gusto.",
        ],
        "preparacion": [
            "Lave y enjuague la soya para hidratarla y facilitar su crecimiento. Posteriormente, retire las cascaritas para evitar que aporten un sabor amargo.",
            "Muela la soya hasta obtener una masa fina y mézclela con la harina.",
            "En un recipiente aparte, mezcle el azúcar, la sal y la margarina. Incorpore esta preparación a la masa de soya y mezcle hasta obtener una consistencia uniforme.",
            "Forme pequeñas bolitas con la masa y rellénelas con queso y bocadillo.",
            "Coloque las bolitas en un molde previamente engrasado y hornee a 180 °C durante aproximadamente 1 hora y 30 minutos, o hasta que estén doradas y bien cocidas.",
        ],
        "nota": "El tiempo y la temperatura son aproximados y dependen del tamaño del molde. Verifique la cocción antes de retirar del horno.",
    },
    {
        "id": "mantecada-de-soya",
        "nombre": "Mantecada de soya",
        "descripcion": "Un ponqué suave y esponjoso preparado con soya licuada.",
        "coccion": "Horno 180 °C",
        "tiempo": "2 h aprox. + 30 min de reposo",
        "ingredientes": [
            "1 taza de soya hidratada.",
            "7 huevos.",
            "1 taza de azúcar.",
            "½ taza de margarina o mantequilla.",
            "1 pizca de sal.",
        ],
        "preparacion": [
            "Hidrate la soya en agua y retire las cascaritas. Posteriormente, licúela hasta obtener una mezcla fina.",
            "En un recipiente amplio, bata los 7 huevos hasta conseguir una consistencia espumosa.",
            "Agregue poco a poco la margarina, el azúcar y la sal, mientras continúa batiendo.",
            "Incorpore la soya licuada y mezcle hasta obtener una preparación homogénea y espesa.",
            "Engrase un molde con margarina para evitar que la mezcla se pegue y vierta la preparación.",
            "Hornee a 180 °C durante aproximadamente 2 horas, verificando la cocción con un palillo.",
            "Retire del horno y deje enfriar durante unos 30 minutos antes de cortar y servir.",
        ],
        "nota": "El tiempo y la temperatura son aproximados y dependen del tamaño del molde. Verifique la cocción con un palillo antes de retirar del horno.",
    },
    {
        "id": "arepas-de-soya",
        "nombre": "Arepas de soya",
        "descripcion": "Arepas doradas a la plancha, con queso y un toque dulce opcional.",
        "coccion": "Sartén o plancha",
        "tiempo": "Hasta dorar por ambos lados",
        "ingredientes": [
            "2 tazas de masa de soya cocida.",
            "1 taza de harina de pan o Promasa.",
            "1 taza de queso (opcional).",
            "2 cucharadas de margarina derretida.",
            "1 huevo.",
            "6 cucharadas de azúcar o miel (opcional).",
            "Sal al gusto.",
        ],
        "preparacion": [
            "Mezcle todos los ingredientes y amase hasta obtener una masa uniforme.",
            "Si la masa no está lo suficientemente suave, agregue agua poco a poco hasta conseguir la textura deseada.",
            "Divida la masa en porciones y forme las arepas con las manos.",
            "Coloque las arepas en una sartén o plancha caliente y áselas por ambos lados hasta que estén doradas y bien cocidas.",
            "Retire del fuego y sirva calientes.",
        ],
        "nota": None,
    },
]


def buscar_receta(id_receta):
    for receta in RECETAS:
        if receta["id"] == id_receta:
            return receta
    return None


@app.route("/")
def inicio():
    return render_template("plantilla.html", recetas=RECETAS, receta=None)


@app.route("/receta/<id_receta>")
def ver_receta(id_receta):
    receta = buscar_receta(id_receta)
    if receta is None:
        abort(404)
    return render_template("plantilla.html", recetas=RECETAS, receta=receta)


@app.route("/pagina.css")
def estilos():
    return send_from_directory(CARPETA, "pagina.css")


@app.route("/imagenes/<archivo>")
def imagenes(archivo):
    return send_from_directory(os.path.join(CARPETA, "imagenes"), archivo)


# Páginas de la comunidad (son HTML estáticos con JavaScript + Firebase)
@app.route("/recetas.html")
def todas():
    return send_from_directory(CARPETA, "recetas.html")


@app.route("/agregar.html")
def agregar():
    return send_from_directory(CARPETA, "agregar.html")


@app.route("/<nombre>.html")
def pagina_html(nombre):
    return send_from_directory(CARPETA, f"{nombre}.html")


@app.route("/js/<archivo>")
def scripts(archivo):
    return send_from_directory(os.path.join(CARPETA, "js"), archivo)


@app.route("/modelos/nsfw/<archivo>")
def modelo_nsfw(archivo):
    return send_from_directory(os.path.join(CARPETA, "modelos", "nsfw"), archivo)


if __name__ == "__main__":
    app.run(debug=True)
