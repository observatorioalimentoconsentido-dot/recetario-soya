// Videos de YouTube (videos.html, página pública). Solo se guardan los enlaces; el video lo carga YouTube.
// Para agregar, editar o eliminar videos se usa el panel de administración (admin.html).
import { configurado, obtenerVideos, guardarPropuestaVideo, extraerIdYoutube } from "./comunidad.js";

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


// ---------- Proponer un video (queda pendiente hasta que el administrador lo apruebe) ----------
const ESPERA = 2 * 60 * 1000;
const HORA = 60 * 60 * 1000;
const MAX_POR_HORA = 3;
const CLAVE = "propuestasVideo";
const HAY_ENLACE = /(https?:|www\.|\.com\b|\.co\b|\.net\b|\.org\b|@)/i;
const TEXTO_OK = /^[\p{L}\p{N} .,;:¡!¿?()\-'"\/&%+]+$/u;

function envios() {
    try {
        return JSON.parse(localStorage.getItem(CLAVE) || "[]").filter((t) => Number.isFinite(t) && Date.now() - t < HORA);
    } catch { return []; }
}

function errorLimite() {
    const e = envios();
    if (e.length >= MAX_POR_HORA) return "Ya enviaste varias propuestas en la última hora. Intenta de nuevo más tarde.";
    if (e.length && Date.now() - Math.max(...e) < ESPERA) return "Ya enviaste una propuesta hace poco. Espera unos minutos para enviar otra.";
    return null;
}

function errorTexto(valor, etiqueta) {
    if (!valor) return null;
    if (HAY_ENLACE.test(valor)) return `${etiqueta}: no se permiten enlaces ni correos, solo texto.`;
    if (!TEXTO_OK.test(valor)) return `${etiqueta}: usa solo letras, números y signos de puntuación normales.`;
    return null;
}

function mensaje(texto, tipo = "error") {
    const caja = $("mensaje-proponer");
    caja.replaceChildren();
    if (texto) caja.appendChild(el("div", `alerta alerta-${tipo}`, texto));
}

const formulario = $("form-proponer");
$("abrir-proponer").addEventListener("click", () => {
    formulario.hidden = false;
    $("abrir-proponer").hidden = true;
    $("p-titulo").focus();
});
$("cancelar-proponer").addEventListener("click", () => {
    formulario.hidden = true;
    $("abrir-proponer").hidden = false;
    mensaje("");
});

formulario.addEventListener("submit", async (e) => {
    e.preventDefault();
    if ($("p-web").value) return mensaje("Gracias, tu propuesta fue enviada.", "ok"); // robot: se ignora en silencio
    if (!configurado) return mensaje("Los videos aún no están activados.");
    const titulo = $("p-titulo").value.trim();
    const descripcion = $("p-descripcion").value.trim();
    const autor = $("p-autor").value.trim();
    const ytId = extraerIdYoutube($("p-enlace").value);
    if (titulo.length < 3) return mensaje("Escribe un título (mínimo 3 letras).");
    if (!ytId) return mensaje("Pega un enlace válido de YouTube (youtube.com/watch?v=... o youtu.be/...).");
    const err = errorTexto(titulo, "Título") || errorTexto(descripcion, "Descripción") || errorTexto(autor, "Nombre");
    if (err) return mensaje(err);
    const limite = errorLimite();
    if (limite) return mensaje(limite);

    $("enviar-proponer").disabled = true;
    try {
        await guardarPropuestaVideo({ titulo, ytId, descripcion, autor });
        try { localStorage.setItem(CLAVE, JSON.stringify([...envios(), Date.now()])); } catch { /* sin almacenamiento */ }
        formulario.reset();
        mensaje("¡Gracias! Tu video fue enviado y se publicará cuando el administrador lo apruebe.", "ok");
    } catch (e2) {
        console.error(e2);
        mensaje("No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.");
    }
    $("enviar-proponer").disabled = false;
});
