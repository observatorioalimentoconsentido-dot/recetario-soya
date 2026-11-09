// Videos de YouTube (videos.html). Solo se guardan los enlaces; el video lo carga YouTube.
import {
    configurado, esAdmin, obtenerVideos, guardarVideo, eliminarVideo, extraerIdYoutube, cerrarSesion,
} from "./comunidad.js";

const $ = (id) => document.getElementById(id);
const lista = $("lista-videos");
const PATRON_ID = /^[A-Za-z0-9_-]{11}$/;
let admin = false;

function aviso(texto, tipo = "error") {
    const caja = $("mensaje");
    caja.innerHTML = "";
    if (!texto) return;
    const div = document.createElement("div");
    div.className = `alerta alerta-${tipo}`;
    div.textContent = texto;
    caja.appendChild(div);
}

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

    if (admin) {
        const borrar = el("button", "boton boton-secundario", "Eliminar video");
        borrar.type = "button";
        borrar.addEventListener("click", async () => {
            if (!confirm(`¿Eliminar el video "${v.titulo}"? No se puede deshacer.`)) return;
            borrar.disabled = true;
            try {
                await eliminarVideo(v.id);
                tarjeta.remove();
                revisarVacio();
            } catch (e) {
                console.error(e);
                aviso("No se pudo eliminar el video.");
                borrar.disabled = false;
            }
        });
        cuerpo.appendChild(borrar);
    }

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

admin = await esAdmin();
if (admin) {
    $("zona-admin-videos").hidden = false;
    $("salir").addEventListener("click", async () => {
        await cerrarSesion();
        location.href = "login.html";
    });
}

$("form-video").addEventListener("submit", async (e) => {
    e.preventDefault();
    const titulo = $("titulo").value.trim();
    const ytId = extraerIdYoutube($("enlace").value);
    if (titulo.length < 3) return aviso("Escribe un título (mínimo 3 letras).");
    if (!ytId) return aviso("Pega un enlace válido de YouTube (youtube.com/watch?v=... o youtu.be/...).");
    $("guardar").disabled = true;
    try {
        await guardarVideo({ titulo, ytId, descripcion: $("descripcion").value.trim() });
        $("form-video").reset();
        aviso("Video agregado.", "ok");
        await cargar();
    } catch (err) {
        console.error(err);
        aviso("No se pudo guardar. Revisa tu sesión y tu conexión.");
    }
    $("guardar").disabled = false;
});

await cargar();
