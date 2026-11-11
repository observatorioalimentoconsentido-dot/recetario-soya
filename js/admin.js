// Panel de administración (admin.html): CRUD de recetas y videos + revisión de propuestas.
import {
    configurado, esAdmin, cerrarSesion,
    obtenerRecetas, eliminarReceta,
    obtenerVideos, guardarVideo, actualizarVideo, eliminarVideo, extraerIdYoutube,
    obtenerPendientes, aprobarPendiente, rechazarPendiente,
    obtenerVideosPendientes, aprobarVideoPendiente, rechazarVideoPendiente,
} from "./comunidad.js";

const $ = (id) => document.getElementById(id);
const PATRON_ID = /^[A-Za-z0-9_-]{11}$/;

// ---------- ayudas ----------
function el(etiqueta, clase, texto) {
    const nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto !== undefined) nodo.textContent = texto; // textContent: nadie puede meter código
    return nodo;
}

function aviso(texto, tipo = "error", destino = "mensaje") {
    const caja = $(destino);
    caja.innerHTML = "";
    if (!texto) return;
    const div = el("div", `alerta alerta-${tipo}`, texto);
    caja.appendChild(div);
}

function fechaTexto(f) {
    const d = f && f.toDate ? f.toDate() : new Date(f);
    return isNaN(d) ? "" : d.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

function vacio(contenedor, texto) {
    if (!contenedor.querySelector(".fila-admin, .solicitud")) {
        contenedor.replaceChildren(el("p", "estado", texto));
    }
}

function boton(texto, clase, accion) {
    const b = el("button", `boton boton-chico ${clase}`, texto);
    b.type = "button";
    b.addEventListener("click", accion);
    return b;
}

function enlace(texto, clase, href) {
    const a = el("a", `boton boton-chico ${clase}`, texto);
    a.href = href;
    return a;
}

// ---------- pestañas ----------
function mostrarPestana(nombre) {
    if (!["recetas", "videos", "solicitudes"].includes(nombre)) nombre = "recetas";
    document.querySelectorAll("[data-pestana]").forEach((b) => b.classList.toggle("activa", b.dataset.pestana === nombre));
    document.querySelectorAll("[data-panel]").forEach((p) => { p.hidden = p.dataset.panel !== nombre; });
    aviso("");
    history.replaceState(null, "", `#${nombre}`);
}
document.querySelectorAll("[data-pestana]").forEach((b) => b.addEventListener("click", () => mostrarPestana(b.dataset.pestana)));

// ---------- RECETAS ----------
const listaRecetas = $("lista-recetas");

function filaReceta(r) {
    const fila = el("div", "fila-admin");
    const info = el("div", "fila-info");
    info.append(el("strong", "", r.nombre), el("small", "", `${fechaTexto(r.fecha)} · ${r.autor ? "De " + r.autor : "Administrador"}${r.imagen ? " · con imagen" : ""}`));
    const acciones = el("div", "fila-botones");
    acciones.append(
        enlace("Ver", "boton-secundario", `receta.html?id=${encodeURIComponent(r.id)}`),
        enlace("Editar", "boton-azul", `agregar.html?editar=${encodeURIComponent(r.id)}`),
        boton("Eliminar", "boton-peligro", async () => {
            if (!confirm(`¿Eliminar la receta "${r.nombre}"? No se puede deshacer.`)) return;
            try {
                await eliminarReceta(r.id);
                fila.remove();
                vacio(listaRecetas, "Por ahora no hay recetas.");
                aviso(`"${r.nombre}" fue eliminada.`, "info");
            } catch (e) {
                console.error(e);
                aviso("No se pudo eliminar la receta.");
            }
        }),
    );
    fila.append(info, acciones);
    return fila;
}

async function cargarRecetas() {
    try {
        const recetas = await obtenerRecetas();
        listaRecetas.replaceChildren(...recetas.map(filaReceta));
        vacio(listaRecetas, "Por ahora no hay recetas. Pulsa \"+ Nueva receta\" para agregar la primera.");
    } catch (e) {
        console.error(e);
        listaRecetas.replaceChildren(el("p", "estado", "No se pudieron cargar las recetas. Recarga la página."));
    }
}

// ---------- VIDEOS ----------
const listaVideos = $("lista-videos");
let videoEditando = null;

function salirDeEdicion() {
    videoEditando = null;
    $("form-video").reset();
    $("titulo-form-video").textContent = "Agregar un video";
    $("guardar-video").textContent = "Agregar video";
    $("cancelar-video").hidden = true;
}

function filaVideo(v) {
    const fila = el("div", "fila-admin");
    const info = el("div", "fila-info");
    const miniatura = el("img", "fila-miniatura");
    miniatura.src = `https://i.ytimg.com/vi/${v.ytId}/default.jpg`;
    miniatura.alt = "";
    miniatura.loading = "lazy";
    const textos = el("div");
    textos.style.display = "flex";
    textos.style.flexDirection = "column";
    textos.style.gap = "2px";
    const ver = el("a", "", "Ver en YouTube");
    ver.href = `https://www.youtube.com/watch?v=${v.ytId}`;
    ver.target = "_blank";
    ver.rel = "noopener noreferrer";
    textos.append(el("strong", "", v.titulo), el("small", "", fechaTexto(v.fecha)), ver);
    info.append(miniatura, textos);
    info.style.display = "flex";
    info.style.gap = "12px";
    info.style.alignItems = "center";
    const acciones = el("div", "fila-botones");
    acciones.append(
        boton("Editar", "boton-azul", () => {
            videoEditando = v;
            $("titulo").value = v.titulo;
            $("enlace").value = `https://www.youtube.com/watch?v=${v.ytId}`;
            $("descripcion").value = v.descripcion || "";
            $("titulo-form-video").textContent = "Editar video";
            $("guardar-video").textContent = "Guardar cambios";
            $("cancelar-video").hidden = false;
            aviso("", "info", "mensaje-video");
            $("form-video").scrollIntoView({ behavior: "smooth", block: "start" });
        }),
        boton("Eliminar", "boton-peligro", async () => {
            if (!confirm(`¿Eliminar el video "${v.titulo}"? No se puede deshacer.`)) return;
            try {
                await eliminarVideo(v.id);
                if (videoEditando && videoEditando.id === v.id) salirDeEdicion();
                fila.remove();
                vacio(listaVideos, "Por ahora no hay videos.");
                aviso(`"${v.titulo}" fue eliminado.`, "info");
            } catch (e) {
                console.error(e);
                aviso("No se pudo eliminar el video.");
            }
        }),
    );
    fila.append(info, acciones);
    return fila;
}

async function cargarVideos() {
    try {
        const videos = (await obtenerVideos()).filter((v) => PATRON_ID.test(String(v.ytId)));
        listaVideos.replaceChildren(...videos.map(filaVideo));
        vacio(listaVideos, "Por ahora no hay videos.");
    } catch (e) {
        console.error(e);
        listaVideos.replaceChildren(el("p", "estado", "No se pudieron cargar los videos. Recarga la página."));
    }
}

$("cancelar-video").addEventListener("click", () => { salirDeEdicion(); aviso("", "info", "mensaje-video"); });

$("form-video").addEventListener("submit", async (e) => {
    e.preventDefault();
    const titulo = $("titulo").value.trim();
    const ytId = extraerIdYoutube($("enlace").value);
    if (titulo.length < 3) return aviso("Escribe un título (mínimo 3 letras).", "error", "mensaje-video");
    if (!ytId) return aviso("Pega un enlace válido de YouTube (youtube.com/watch?v=... o youtu.be/...).", "error", "mensaje-video");
    const datos = { titulo, ytId, descripcion: $("descripcion").value.trim() };
    $("guardar-video").disabled = true;
    try {
        if (videoEditando) await actualizarVideo(videoEditando.id, datos);
        else await guardarVideo(datos);
        const edito = !!videoEditando;
        salirDeEdicion();
        aviso(edito ? "Cambios guardados." : "Video agregado.", "ok", "mensaje-video");
        await cargarVideos();
    } catch (err) {
        console.error(err);
        aviso("No se pudo guardar. Revisa tu sesión y tu conexión.", "error", "mensaje-video");
    }
    $("guardar-video").disabled = false;
});

// ---------- SOLICITUDES ----------
const listaSolicitudes = $("lista-solicitudes");

function actualizarContador() {
    const n = document.querySelectorAll("#lista-solicitudes .solicitud, #lista-solicitudes-video .solicitud").length;
    $("cont-solicitudes").textContent = String(n);
    $("cont-solicitudes").hidden = n === 0;
}

function tarjetaSolicitud(p) {
    const tarjeta = el("article", "formulario solicitud");
    tarjeta.style.marginBottom = "24px";
    tarjeta.append(el("h3", "", p.nombre), el("p", "", p.descripcion));
    const datos = el("ul", "datos");
    datos.append(el("li", "", p.coccion), el("li", "", p.tiempo));
    if (p.autor) datos.append(el("li", "", `De: ${p.autor}`));
    tarjeta.appendChild(datos);
    tarjeta.appendChild(el("h4", "", "Ingredientes"));
    const ul = el("ul", "solicitud-lista");
    p.ingredientes.forEach((t) => ul.appendChild(el("li", "", t)));
    tarjeta.appendChild(ul);
    tarjeta.appendChild(el("h4", "", "Preparación"));
    const ol = el("ol", "solicitud-lista");
    p.preparacion.forEach((t) => ol.appendChild(el("li", "", t)));
    tarjeta.appendChild(ol);
    if (p.nota) tarjeta.appendChild(el("p", "nota", `Nota: ${p.nota}`));

    const botones = el("div", "fila-botones");
    botones.style.marginTop = "18px";
    botones.style.justifyContent = "flex-end";
    const todos = [];
    const bloquear = (si) => todos.forEach((b) => { b.disabled = si; });

    const rechazar = boton("Rechazar", "boton-peligro", async () => {
        if (!confirm(`¿Rechazar y borrar la propuesta "${p.nombre}"? No se puede deshacer.`)) return;
        bloquear(true);
        try {
            await rechazarPendiente(p.id);
            tarjeta.remove();
            vacio(listaSolicitudes, "No hay solicitudes pendientes.");
            actualizarContador();
            aviso(`"${p.nombre}" fue rechazada y borrada.`, "info");
        } catch (e) {
            console.error(e);
            aviso("No se pudo rechazar. Revisa tu sesión y tu conexión.");
            bloquear(false);
        }
    });
    const revisar = enlace("Revisar y editar", "boton-secundario", `agregar.html?propuesta=${encodeURIComponent(p.id)}`);
    const aprobar = boton("Aprobar y publicar", "boton-azul", async () => {
        bloquear(true);
        try {
            await aprobarPendiente(p);
            tarjeta.remove();
            vacio(listaSolicitudes, "No hay solicitudes pendientes.");
            actualizarContador();
            aviso(`"${p.nombre}" fue aprobada y ya aparece en Más recetas.`, "ok");
            await cargarRecetas();
        } catch (e) {
            console.error(e);
            aviso("No se pudo aprobar. Revisa tu sesión y tu conexión.");
            bloquear(false);
        }
    });
    todos.push(rechazar, aprobar);
    botones.append(rechazar, revisar, aprobar);
    tarjeta.appendChild(botones);
    return tarjeta;
}

async function cargarSolicitudes() {
    try {
        const pendientes = await obtenerPendientes();
        listaSolicitudes.replaceChildren(...pendientes.map(tarjetaSolicitud));
        vacio(listaSolicitudes, "No hay solicitudes pendientes.");
        actualizarContador();
    } catch (e) {
        console.error(e);
        listaSolicitudes.replaceChildren(el("p", "estado", "No se pudieron cargar las solicitudes. Recarga la página."));
    }
}

// ---------- videos propuestos ----------
const listaSolVideos = $("lista-solicitudes-video");

function tarjetaSolicitudVideo(v) {
    const tarjeta = el("article", "formulario solicitud");
    tarjeta.style.marginBottom = "24px";
    const fila = el("div", "solicitud-video");
    const mini = el("div", "video-mini");
    mini.style.backgroundImage = `url("https://i.ytimg.com/vi/${v.ytId}/mqdefault.jpg")`;
    const info = el("div");
    info.append(el("h3", "", v.titulo));
    if (v.descripcion) info.append(el("p", "", v.descripcion));
    if (v.autor) info.append(el("p", "", `De: ${v.autor}`));
    const ver = el("a", "", "Ver en YouTube (se abre en otra pestaña)");
    ver.href = `https://www.youtube.com/watch?v=${v.ytId}`;
    ver.target = "_blank";
    ver.rel = "noopener noreferrer";
    info.append(ver);
    fila.append(mini, info);
    tarjeta.appendChild(fila);

    const botones = el("div", "fila-botones");
    botones.style.marginTop = "18px";
    botones.style.justifyContent = "flex-end";
    const todos = [];
    const bloquear = (si) => todos.forEach((b) => { b.disabled = si; });
    const terminar = (texto, tipo) => {
        tarjeta.remove();
        vacio(listaSolVideos, "No hay videos pendientes.");
        actualizarContador();
        aviso(texto, tipo);
    };
    const rechazar = boton("Rechazar", "boton-peligro", async () => {
        if (!confirm(`¿Rechazar y borrar la propuesta "${v.titulo}"? No se puede deshacer.`)) return;
        bloquear(true);
        try { await rechazarVideoPendiente(v.id); terminar(`"${v.titulo}" fue rechazado y borrado.`, "info"); }
        catch (e) { console.error(e); aviso("No se pudo rechazar. Revisa tu sesión y tu conexión."); bloquear(false); }
    });
    const aprobar = boton("Aprobar y publicar", "boton-azul", async () => {
        bloquear(true);
        try {
            await aprobarVideoPendiente(v);
            terminar(`"${v.titulo}" fue aprobado y ya aparece en Videos.`, "ok");
            await cargarVideos();
        } catch (e) { console.error(e); aviso("No se pudo aprobar. Revisa tu sesión y tu conexión."); bloquear(false); }
    });
    todos.push(rechazar, aprobar);
    botones.append(rechazar, aprobar);
    tarjeta.appendChild(botones);
    return tarjeta;
}

async function cargarSolicitudesVideo() {
    try {
        const lista = (await obtenerVideosPendientes()).filter((v) => PATRON_ID.test(String(v.ytId)));
        listaSolVideos.replaceChildren(...lista.map(tarjetaSolicitudVideo));
        vacio(listaSolVideos, "No hay videos pendientes.");
        actualizarContador();
    } catch (e) {
        console.error(e);
        listaSolVideos.replaceChildren(el("p", "estado", "No se pudieron cargar los videos propuestos. Recarga la página."));
    }
}

// ---------- inicio ----------
if (!configurado || !(await esAdmin())) {
    location.replace("login.html");
} else {
    $("panel").hidden = false;
    $("salir").addEventListener("click", async () => {
        await cerrarSesion();
        location.href = "login.html";
    });
    mostrarPestana(location.hash.slice(1));
    await Promise.all([cargarRecetas(), cargarVideos(), cargarSolicitudes(), cargarSolicitudesVideo()]);
}
