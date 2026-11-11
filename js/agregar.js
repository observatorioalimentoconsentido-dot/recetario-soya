// ============================================================
//  Formulario para agregar recetas (agregar.html)
//  Etapa 1: nombre + ingredientes  ->  Etapa 2: pasos  ->  Etapa 3: imagen y publicar
// ============================================================
import {
    configurado, guardarReceta, guardarPropuesta, esAdmin, cerrarSesion,
    obtenerReceta, obtenerImagenReceta, obtenerPendiente, actualizarReceta, publicarDesdePropuesta, imagenSegura,
} from "./comunidad.js";
import { revisarImagen } from "./moderacion.js";

const MAX_INGREDIENTES = 40;
const MAX_PASOS = 30;
const LADO_MAXIMO_IMAGEN = 640;  // px: se achica la foto para que pese poco
const PESO_MAXIMO_IMAGEN = 150000; // caracteres en base64 (~110 KB)

const datos = {
    ingredientes: [],
    pasos: [],
    imagen: null, // imagen aprobada (JPEG en base64) o null
    miniatura: null, // versión diminuta de la imagen, para las listas
};

const $ = (id) => document.getElementById(id);
const mensaje = $("mensaje");

function mostrarMensaje(texto, tipo = "error", contenedor = mensaje) {
    contenedor.innerHTML = "";
    if (!texto) return;
    const div = document.createElement("div");
    div.className = `alerta alerta-${tipo}`;
    div.textContent = texto;
    contenedor.appendChild(div);
}

// ---------- Solo texto: sin símbolos raros, código, emojis ni enlaces ----------
// Letras (con tildes y ñ), números, espacios y signos básicos.
const CARACTERES_PERMITIDOS = /^[\p{L}\p{N}\s.,;:¡!¿?()\-–—\/%°+&'"“”‘’…]+$/u;
const PARECE_ENLACE = /(https?:\/\/|www\.|\b[\w-]+\.(com|co|net|org|io|ly|me|xyz|info|ru|cn)\b)/i;

function errorTexto(valor, campo) {
    if (!valor) return null;
    if (!CARACTERES_PERMITIDOS.test(valor)) {
        return `${campo}: solo se permiten letras, números y signos básicos (. , ; : ¡ ! ¿ ? ( ) - / % °). Quita los símbolos o emojis.`;
    }
    if (PARECE_ENLACE.test(valor)) return `${campo}: no se permiten enlaces ni direcciones web.`;
    return null;
}

// ---------- Límite de envíos (por navegador) para evitar spam ----------
const ESPERA_ENTRE_ENVIOS = 2 * 60 * 1000; // 2 minutos entre una propuesta y otra
const MAX_ENVIOS_POR_HORA = 3;
const HORA = 60 * 60 * 1000;

function enviosRecientes() {
    try {
        return JSON.parse(localStorage.getItem("propuestas") || "[]")
            .filter((t) => Number.isFinite(t) && Date.now() - t < HORA);
    } catch { return []; }
}

function registrarEnvio() {
    try { localStorage.setItem("propuestas", JSON.stringify([...enviosRecientes(), Date.now()])); } catch { /* sin almacenamiento */ }
}

function errorLimite() {
    const envios = enviosRecientes();
    if (envios.length >= MAX_ENVIOS_POR_HORA) return "Ya enviaste varias propuestas en la última hora. Intenta de nuevo más tarde.";
    if (envios.length && Date.now() - Math.max(...envios) < ESPERA_ENTRE_ENVIOS) {
        return "Ya enviaste una propuesta hace poco. Espera unos minutos para enviar otra.";
    }
    return null;
}

// ---------- Etapas ----------
function irA(numero) {
    document.querySelectorAll(".etapa").forEach((etapa) => {
        etapa.hidden = etapa.dataset.etapa !== String(numero);
    });
    document.querySelectorAll("[data-indicador]").forEach((li) => {
        const n = Number(li.dataset.indicador);
        li.className = n === numero ? "actual" : n < numero ? "hecho" : "";
    });
    mostrarMensaje("");
    $("formulario").scrollIntoView({ behavior: "smooth", block: "start" });
}

function validarEtapa1() {
    if ($("nombre").value.trim().length < 3) return "Escribe el nombre de la receta (mínimo 3 letras).";
    if (!$("descripcion").value.trim()) return "Escribe una descripción corta.";
    if (!$("coccion").value.trim()) return "Escribe la cocción (Ej: Horno 180 °C).";
    if (!$("tiempo").value.trim()) return "Escribe el tiempo (Ej: 1 h 30 min aprox.).";
    if (datos.ingredientes.length === 0) return "Agrega al menos un ingrediente.";
    return errorTexto($("nombre").value.trim(), "Nombre") || errorTexto($("descripcion").value.trim(), "Descripción")
        || errorTexto($("coccion").value.trim(), "Cocción") || errorTexto($("tiempo").value.trim(), "Tiempo");
}

function validarEtapa2() {
    if (datos.pasos.length === 0) return "Agrega al menos un paso de preparación.";
    return errorTexto($("nota").value.trim(), "Nota");
}

document.querySelectorAll("[data-ir]").forEach((boton) => {
    boton.addEventListener("click", () => {
        const destino = Number(boton.dataset.ir);
        const actual = Number(document.querySelector(".etapa:not([hidden])").dataset.etapa);
        if (destino > actual) {
            const error = validarEtapa1() || (destino === 3 ? validarEtapa2() : null);
            if (error) return mostrarMensaje(error);
        }
        irA(destino);
    });
});

// ---------- Ingredientes (se ven en la caja de la derecha) ----------
function botonQuitar(alQuitar) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "quitar";
    boton.textContent = "✕";
    boton.title = "Quitar";
    boton.addEventListener("click", alQuitar);
    return boton;
}

function dibujarIngredientes() {
    const lista = $("lista-ingredientes");
    lista.innerHTML = "";
    if (datos.ingredientes.length === 0) {
        const li = document.createElement("li");
        li.className = "vacio";
        li.textContent = "Aún no has agregado ingredientes.";
        lista.appendChild(li);
        return;
    }
    datos.ingredientes.forEach((texto, i) => {
        const li = document.createElement("li");
        li.className = "con-quitar";
        const span = document.createElement("span");
        span.textContent = texto;
        li.append(span, botonQuitar(() => {
            datos.ingredientes.splice(i, 1);
            dibujarIngredientes();
        }));
        lista.appendChild(li);
    });
}

function agregarIngrediente() {
    const campo = $("ingrediente");
    const texto = campo.value.trim();
    if (!texto) return;
    const errorIngrediente = errorTexto(texto, "Ingrediente");
    if (errorIngrediente) return mostrarMensaje(errorIngrediente);
    if (datos.ingredientes.length >= MAX_INGREDIENTES) {
        return mostrarMensaje(`Máximo ${MAX_INGREDIENTES} ingredientes.`);
    }
    datos.ingredientes.push(texto);
    campo.value = "";
    campo.focus();
    mostrarMensaje("");
    dibujarIngredientes();
}

$("agregar-ingrediente").addEventListener("click", agregarIngrediente);
$("ingrediente").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault(); // que Enter agregue el ingrediente en vez de enviar el formulario
        agregarIngrediente();
    }
});

// ---------- Pasos ----------
function dibujarPasos() {
    const lista = $("lista-pasos");
    lista.innerHTML = "";
    datos.pasos.forEach((texto, i) => {
        const li = document.createElement("li");
        const numero = document.createElement("span");
        numero.className = "paso";
        numero.textContent = i + 1;
        const p = document.createElement("p");
        p.textContent = texto;
        li.append(numero, p, botonQuitar(() => {
            datos.pasos.splice(i, 1);
            dibujarPasos();
        }));
        lista.appendChild(li);
    });
}

$("agregar-paso").addEventListener("click", () => {
    const campo = $("paso");
    const texto = campo.value.trim();
    if (!texto) return;
    const errorPaso = errorTexto(texto, "Paso");
    if (errorPaso) return mostrarMensaje(errorPaso);
    if (datos.pasos.length >= MAX_PASOS) return mostrarMensaje(`Máximo ${MAX_PASOS} pasos.`);
    datos.pasos.push(texto);
    campo.value = "";
    campo.focus();
    mostrarMensaje("");
    dibujarPasos();
});

// Evita que Enter en los campos de texto envíe el formulario antes de tiempo
["nombre", "descripcion", "coccion", "tiempo"].forEach((id) => {
    $(id).addEventListener("keydown", (e) => {
        if (e.key === "Enter") e.preventDefault();
    });
});

// ---------- Imagen ----------
const estadoImagen = $("estado-imagen");
const vistaPrevia = $("vista-previa");
let revisionActual = 0; // por si el usuario cambia de foto mientras se revisa otra

function quitarImagen() {
    datos.imagen = null;
    datos.miniatura = null;
    $("archivo").value = "";
    vistaPrevia.hidden = true;
    vistaPrevia.removeAttribute("src");
}

$("quiere-imagen").addEventListener("change", (e) => {
    $("zona-imagen").hidden = !e.target.checked;
    if (!e.target.checked) {
        quitarImagen();
        mostrarMensaje("", "info", estadoImagen);
    }
});

function cargarComoImagen(archivo) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(archivo);
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("No se pudo leer la imagen."));
        img.src = url;
    });
}

// Achica la imagen y la dibuja en un canvas
function achicar(img, ladoMaximo) {
    const escala = Math.min(1, ladoMaximo / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * escala);
    canvas.height = Math.round(img.height * escala);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff"; // fondo blanco por si la imagen es PNG transparente
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
}

function aJpeg(canvas) {
    let calidad = 0.75;
    let resultado = canvas.toDataURL("image/jpeg", calidad);
    while (resultado.length > PESO_MAXIMO_IMAGEN && calidad > 0.3) {
        calidad -= 0.1;
        resultado = canvas.toDataURL("image/jpeg", calidad);
    }
    return resultado.length <= PESO_MAXIMO_IMAGEN ? resultado : null;
}

// Miniatura diminuta (unos 10 KB) para las listas: la foto grande se pide solo al abrir la receta.
function aMiniatura(canvas) {
    const m = achicar(canvas, 320);
    let calidad = 0.6;
    let r = m.toDataURL("image/jpeg", calidad);
    while (r.length > 25000 && calidad > 0.2) { calidad -= 0.1; r = m.toDataURL("image/jpeg", calidad); }
    return r.length <= 40000 ? r : null;
}

function cargarDesdeTexto(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("No se pudo leer la imagen."));
        img.src = dataUrl;
    });
}

$("archivo").addEventListener("change", async (e) => {
    const archivo = e.target.files[0];
    datos.imagen = null;
    if (!archivo) return;

    if (!archivo.type.startsWith("image/")) {
        quitarImagen();
        return mostrarMensaje("El archivo debe ser una imagen.", "error", estadoImagen);
    }
    if (archivo.size > 10 * 1024 * 1024) {
        quitarImagen();
        return mostrarMensaje("La imagen es muy pesada (máximo 10 MB).", "error", estadoImagen);
    }

    const miRevision = ++revisionActual;
    $("publicar").disabled = true;
    mostrarMensaje("Revisando la imagen... la primera vez puede tardar unos segundos.", "info", estadoImagen);

    try {
        const img = await cargarComoImagen(archivo);
        const canvas = achicar(img, LADO_MAXIMO_IMAGEN);
        vistaPrevia.src = canvas.toDataURL("image/jpeg", 0.8);
        vistaPrevia.hidden = false;

        const resultado = await revisarImagen(canvas);
        if (miRevision !== revisionActual) return; // ya eligió otra foto

        if (!resultado.aceptada) {
            quitarImagen();
            mostrarMensaje(`Imagen rechazada: ${resultado.motivo} Elige otra foto.`, "error", estadoImagen);
            return;
        }

        const jpeg = aJpeg(canvas);
        if (!jpeg) {
            quitarImagen();
            mostrarMensaje("No se pudo reducir el tamaño de la imagen. Prueba con otra.", "error", estadoImagen);
            return;
        }
        datos.imagen = jpeg;
        datos.miniatura = aMiniatura(canvas);
        mostrarMensaje("Imagen aprobada ✔", "ok", estadoImagen);
    } catch (error) {
        console.error(error);
        if (miRevision !== revisionActual) return;
        quitarImagen();
        mostrarMensaje(
            "No se pudo revisar la imagen (revisa tu conexión a internet). Puedes intentarlo de nuevo o publicar sin imagen.",
            "error",
            estadoImagen,
        );
    } finally {
        if (miRevision === revisionActual) $("publicar").disabled = !configurado;
    }
});

// ---------- Publicar (administrador) o enviar propuesta (visitante) ----------
let modoAdmin = false;
let etiquetaBoton = "Publicar receta";
let idEditar = null;     // receta publicada que se está editando
let idPropuesta = null;  // propuesta pendiente que se está revisando
let autorOriginal = null; // autor que venía en la receta o propuesta

function gracias() {
    $("contenedor-form").hidden = true;
    $("aviso-visitante").hidden = true;
    $("gracias").hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
}

$("formulario").addEventListener("submit", async (e) => {
    e.preventDefault();

    const error = validarEtapa1() || validarEtapa2();
    if (error) return mostrarMensaje(error);

    if (modoAdmin && $("quiere-imagen").checked && !datos.imagen) {
        return mostrarMensaje("Elige una imagen aprobada o desmarca la opción \"Quiero agregar una imagen\".");
    }

    if (!modoAdmin) {
        if ($("web").value) return gracias(); // campo trampa: un robot lo llenó, se ignora en silencio
        const eAutor = errorTexto($("autor").value.trim(), "Nombre");
        if (eAutor) return mostrarMensaje(eAutor);
        const eLimite = errorLimite();
        if (eLimite) return mostrarMensaje(eLimite);
    }

    const boton = $("publicar");
    const textoBoton = modoAdmin ? etiquetaBoton : "Enviar propuesta";
    boton.disabled = true;
    boton.textContent = modoAdmin ? "Guardando..." : "Enviando...";

    const receta = {
        nombre: $("nombre").value.trim(),
        descripcion: $("descripcion").value.trim(),
        coccion: $("coccion").value.trim(),
        tiempo: $("tiempo").value.trim(),
        nota: $("nota").value.trim(),
        ingredientes: datos.ingredientes,
        preparacion: datos.pasos,
    };

    try {
        if (modoAdmin) {
            if (datos.imagen && !datos.miniatura) {
                // receta antigua con imagen pero sin miniatura: se crea ahora
                datos.miniatura = aMiniatura(await cargarDesdeTexto(datos.imagen));
            }
            const completa = { ...receta, autor: autorOriginal, imagen: datos.imagen, miniatura: datos.miniatura };
            let id;
            if (idEditar) {
                await actualizarReceta(idEditar, completa);
                id = idEditar;
            } else if (idPropuesta) {
                id = await publicarDesdePropuesta(idPropuesta, completa);
            } else {
                id = await guardarReceta(completa);
            }
            location.href = `receta.html?id=${encodeURIComponent(id)}`;
        } else {
            await guardarPropuesta({ ...receta, autor: $("autor").value.trim() });
            registrarEnvio();
            gracias();
        }
    } catch (err) {
        console.error(err);
        const sinPermiso = err && (err.code === "permission-denied" || err.code === "unauthenticated");
        mostrarMensaje(sinPermiso && modoAdmin
            ? "Tu sesión no tiene permiso o expiró. Vuelve a iniciar sesión."
            : "No se pudo enviar la receta. Revisa tu conexión e inténtalo de nuevo.");
        boton.disabled = false;
        boton.textContent = textoBoton;
    }
});

// ---------- Inicio: administrador o visitante ----------
if (!configurado) {
    $("publicar").disabled = true;
    mostrarMensaje("Aviso: todavía falta configurar Firebase (js/firebase-config.js), por eso aún no se puede enviar.", "info");
}
modoAdmin = await esAdmin();
if (modoAdmin) {
    $("barra-admin").hidden = false;
} else {
    // Visitante: sin imagen, con nombre opcional y el envío va a revisión
    $("bloque-imagen").hidden = true;
    $("bloque-autor").hidden = false;
    $("aviso-visitante").hidden = false;
    $("titulo-agregar").innerHTML = "Comparte tu <span>receta</span>";
    document.querySelector('[data-indicador="3"]').textContent = "3. Enviar";
    $("publicar").textContent = "Enviar propuesta";
}

// Administrador: editar una receta publicada (?editar=ID) o revisar una propuesta (?propuesta=ID)
async function cargarParaRevisar() {
    const parametros = new URLSearchParams(location.search);
    idEditar = parametros.get("editar");
    idPropuesta = idEditar ? null : parametros.get("propuesta");
    if (!idEditar && !idPropuesta) return;

    let origen = null;
    try {
        origen = idEditar ? await obtenerReceta(idEditar) : await obtenerPendiente(idPropuesta);
    } catch (e) {
        console.error(e);
    }
    if (!origen) {
        idEditar = idPropuesta = null;
        $("publicar").disabled = true;
        return mostrarMensaje("No se encontró esa receta o propuesta. Vuelve al panel e inténtalo de nuevo.");
    }

    $("nombre").value = origen.nombre || "";
    $("descripcion").value = origen.descripcion || "";
    $("coccion").value = origen.coccion || "";
    $("tiempo").value = origen.tiempo || "";
    $("nota").value = origen.nota || "";
    datos.ingredientes = [...(origen.ingredientes || [])];
    datos.pasos = [...(origen.preparacion || [])];
    dibujarIngredientes();
    dibujarPasos();
    autorOriginal = origen.autor || null;

    // La foto grande vive aparte (imagenes/<id>); las recetas antiguas la traen dentro.
    let imagenActual = null;
    if (idEditar) {
        imagenActual = imagenSegura(origen.imagen);
        if (!imagenActual && origen.miniatura) {
            try { imagenActual = await obtenerImagenReceta(idEditar); } catch (e) { console.error(e); }
        }
    }
    if (imagenActual) {
        datos.imagen = imagenActual;
        datos.miniatura = imagenSegura(origen.miniatura);
        $("quiere-imagen").checked = true;
        $("zona-imagen").hidden = false;
        vistaPrevia.src = imagenActual;
        vistaPrevia.hidden = false;
        mostrarMensaje("Esta es la imagen actual. Elige otra para cambiarla, o desmarca la casilla para quitarla.", "info", estadoImagen);
    }

    if (idEditar) {
        $("titulo-agregar").innerHTML = "Editar <span>receta</span>";
        etiquetaBoton = "Guardar cambios";
    } else {
        $("titulo-agregar").innerHTML = "Revisar <span>propuesta</span>";
        etiquetaBoton = "Publicar receta";
        mostrarMensaje(`Propuesta${autorOriginal ? " de " + autorOriginal : ""}: corrige lo que haga falta y publícala. Puedes agregar una imagen.`, "info");
    }
    $("publicar").textContent = etiquetaBoton;
}

if (modoAdmin) await cargarParaRevisar();
$("zona-admin").hidden = false;

$("salir").addEventListener("click", async () => {
    await cerrarSesion();
    location.href = "login.html";
});
