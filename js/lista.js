// Muestra las recetas guardadas en la base de datos (sección "Más recetas") en recetas.html
import { configurado, obtenerRecetas, ponerImagen } from "./comunidad.js";

const lista = document.getElementById("lista-comunidad");

function mensaje(texto, conBoton) {
    lista.innerHTML = "";
    const p = document.createElement("div");
    p.className = "estado";
    p.textContent = texto;
    if (conBoton) {
        const boton = document.createElement("a");
        boton.className = "boton";
        boton.href = "agregar.html";
        boton.textContent = "Proponer una receta";
        p.append(document.createElement("br"), boton);
    }
    lista.appendChild(p);
}

// Crea una tarjeta igual a las de la página principal.
// Se usa textContent (no innerHTML) para que nadie pueda meter código en una receta.
function crearTarjeta(receta, numero) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "tarjeta";

    const imagen = document.createElement("div");
    imagen.className = "tarjeta-imagen";
    ponerImagen(imagen, receta.miniatura || receta.imagen);
    const num = document.createElement("span");
    num.className = "tarjeta-numero";
    num.textContent = numero;
    imagen.appendChild(num);

    const cuerpo = document.createElement("div");
    cuerpo.className = "tarjeta-cuerpo";

    const titulo = document.createElement("h3");
    titulo.textContent = receta.nombre;

    const descripcion = document.createElement("p");
    descripcion.textContent = receta.descripcion || "";

    const datos = document.createElement("ul");
    datos.className = "datos";
    const li1 = document.createElement("li");
    li1.textContent = receta.coccion;
    const li2 = document.createElement("li");
    li2.textContent = `${receta.ingredientes.length} ingredientes`;
    datos.append(li1, li2);

    const enlace = document.createElement("a");
    enlace.className = "boton boton-azul";
    enlace.href = `receta.html?id=${encodeURIComponent(receta.id)}`;
    enlace.textContent = "Ver preparación";

    cuerpo.append(titulo, descripcion, datos, enlace);
    tarjeta.append(imagen, cuerpo);
    return tarjeta;
}

let cursor = null;
let contador = 3; // las 3 recetas fijas son la 1, 2 y 3
const masBoton = document.createElement("button");
masBoton.type = "button";
masBoton.className = "boton boton-azul";
masBoton.textContent = "Ver más recetas";
const masCaja = document.createElement("div");
masCaja.className = "estado";
masCaja.hidden = true;
masCaja.appendChild(masBoton);
lista.after(masCaja);

async function cargarPagina() {
    masBoton.disabled = true;
    const r = await obtenerRecetas(cursor);
    if (contador === 3 && r.recetas.length === 0) {
        mensaje("Por ahora no hay más recetas. ¡Puedes proponer la tuya!", true);
        return;
    }
    if (contador === 3) lista.innerHTML = "";
    r.recetas.forEach((receta) => lista.appendChild(crearTarjeta(receta, ++contador)));
    cursor = r.cursor;
    masCaja.hidden = !r.hayMas;
    masBoton.disabled = false;
}

masBoton.addEventListener("click", async () => {
    try { await cargarPagina(); } catch (e) {
        console.error(e);
        masBoton.disabled = false;
        masBoton.textContent = "No se pudo cargar. Intentar de nuevo";
    }
});

async function mostrar() {
    if (!configurado) {
        mensaje("Las recetas adicionales aún no están activadas (falta configurar Firebase).");
        return;
    }
    try {
        await cargarPagina();
    } catch (error) {
        console.error(error);
        mensaje("No se pudieron cargar las recetas. Intenta recargar la página.");
    }
}

mostrar();
