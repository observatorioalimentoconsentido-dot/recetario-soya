// Videos de YouTube (videos.html, página pública). Solo se guardan los enlaces; el video lo carga YouTube.
// Para agregar, editar o eliminar videos se usa el panel de administración (admin.html).
import { configurado, obtenerVideos } from "./comunidad.js";

const $ = (id) => document.getElementById(id);
const lista = $("lista-videos");
const PATRON_ID = /^[A-Za-z0-9_-]{11}$/;

function el(etiqueta, clase, texto) {
    const nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto !== undefined) nodo.textContent = texto;
    return nodo;
}

function crearTarjeta(v) {
    const tarjeta = el("article", "tarjeta");
    const caja = el("div", "video-caja");

    // Primero solo se muestra la miniatura (liviano). El video real se carga al pulsar.
    const miniatura = el("button", "video-miniatura");
    miniatura.type = "button";
    miniatura.setAttribute("aria-label", `Reproducir: ${v.titulo}`);
    miniatura.style.backgroundImage = `url("https://i.ytimg.com/vi/${v.ytId}/hqdefault.jpg")`;
    miniatura.addEventListener("click", () => {
        const marco = document.createElement("iframe");
        marco.src = `https://www.youtube-nocookie.com/embed/${v.ytId}?autoplay=1&rel=0`;
        marco.title = v.titulo;
        marco.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
        marco.allowFullscreen = true;
        marco.referrerPolicy = "strict-origin-when-cross-origin";
        caja.replaceChildren(marco);
    });
    caja.appendChild(miniatura);

    const cuerpo = el("div", "tarjeta-cuerpo");
    cuerpo.appendChild(el("h3", "", v.titulo));
    if (v.descripcion) cuerpo.appendChild(el("p", "", v.descripcion));

    tarjeta.append(caja, cuerpo);
    return tarjeta;
}

function revisarVacio() {
    if (!lista.querySelector(".tarjeta")) {
        lista.replaceChildren(el("p", "estado", "Por ahora no hay videos."));
    }
}

async function cargar() {
    if (!configurado) {
        lista.replaceChildren(el("p", "estado", "Los videos aún no están activados (falta configurar Firebase)."));
        return;
    }
    try {
        const videos = (await obtenerVideos()).filter((v) => PATRON_ID.test(String(v.ytId)));
        lista.replaceChildren(...videos.map(crearTarjeta));
        revisarVacio();
    } catch (e) {
        console.error(e);
        lista.replaceChildren(el("p", "estado", "No se pudieron cargar los videos. Recarga la página."));
    }
}

await cargar();
