// Muestra una receta de la base de datos en receta.html?id=...
import { configurado, obtenerReceta, ponerImagen, esAdmin, eliminarReceta } from "./comunidad.js";

const id = new URLSearchParams(location.search).get("id");
const nombre = document.getElementById("nombre");
const descripcion = document.getElementById("descripcion");

function error(texto) {
    nombre.textContent = "Receta no disponible";
    descripcion.textContent = texto;
    document.getElementById("detalle").style.display = "none";
}

async function mostrar() {
    if (!configurado) return error("Falta configurar Firebase.");
    if (!id) return error("No se indicó qué receta mostrar.");

    try {
        const receta = await obtenerReceta(id);
        if (!receta) return error("Esta receta no existe o fue eliminada.");

        document.title = `${receta.nombre} | Recetario de Soya - UNIMINUTO`;
        nombre.textContent = receta.nombre;
        descripcion.textContent = receta.descripcion || "";
        document.getElementById("dato-coccion").textContent = receta.coccion;
        document.getElementById("dato-tiempo").textContent = receta.tiempo;
        if (receta.autor) {
            const dato = document.getElementById("dato-autor");
            dato.textContent = `Receta de ${receta.autor}`;
            dato.hidden = false;
        }
        if (receta.nota) {
            document.getElementById("nota-texto").textContent = receta.nota;
            document.getElementById("nota").hidden = false;
        }
        ponerImagen(document.getElementById("portada"), receta.imagen);

        const ingredientes = document.getElementById("ingredientes");
        receta.ingredientes.forEach((texto) => {
            const li = document.createElement("li");
            li.textContent = texto;
            ingredientes.appendChild(li);
        });

        const pasos = document.getElementById("pasos");
        receta.preparacion.forEach((texto, i) => {
            const li = document.createElement("li");
            const numero = document.createElement("span");
            numero.className = "paso";
            numero.textContent = i + 1;
            const p = document.createElement("p");
            p.textContent = texto;
            li.append(numero, p);
            pasos.appendChild(li);
        });
        if (await esAdmin()) {
            const boton = document.getElementById("eliminar");
            boton.hidden = false;
            boton.addEventListener("click", async () => {
                if (!confirm("¿Seguro que quieres eliminar esta receta? No se puede deshacer.")) return;
                try {
                    await eliminarReceta(receta.id);
                    location.href = "recetas.html";
                } catch (err) {
                    console.error(err);
                    alert("No se pudo eliminar la receta.");
                }
            });
        }
    } catch (e) {
        console.error(e);
        error("No se pudo cargar la receta. Intenta recargar la página.");
    }
}

mostrar();
