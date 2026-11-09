// Solicitudes de visitantes (solicitudes.html): el administrador las aprueba o las rechaza.
import {
    configurado, esAdmin, obtenerPendientes, aprobarPendiente, rechazarPendiente, cerrarSesion,
} from "./comunidad.js";

const lista = document.getElementById("lista");
const mensaje = document.getElementById("mensaje");

function aviso(texto, tipo = "error") {
    mensaje.innerHTML = "";
    if (!texto) return;
    const div = document.createElement("div");
    div.className = `alerta alerta-${tipo}`;
    div.textContent = texto;
    mensaje.appendChild(div);
}

function el(etiqueta, clase, texto) {
    const nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto !== undefined) nodo.textContent = texto; // textContent: nadie puede meter código en una receta
    return nodo;
}

function crearSolicitud(p) {
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

    const botones = el("div", "botones-etapa");
    const rechazar = el("button", "boton boton-secundario", "Rechazar");
    rechazar.type = "button";
    const aprobar = el("button", "boton boton-azul", "Aprobar y publicar");
    aprobar.type = "button";
    botones.append(rechazar, aprobar);
    tarjeta.appendChild(botones);

    const bloquear = (si) => { rechazar.disabled = si; aprobar.disabled = si; };

    aprobar.addEventListener("click", async () => {
        bloquear(true);
        try {
            await aprobarPendiente(p);
            aviso(`"${p.nombre}" fue aprobada y ya aparece en Más recetas.`, "ok");
            tarjeta.remove();
            revisarVacio();
        } catch (e) {
            console.error(e);
            aviso("No se pudo aprobar. Revisa tu sesión y tu conexión.");
            bloquear(false);
        }
    });

    rechazar.addEventListener("click", async () => {
        if (!confirm(`¿Rechazar y borrar la propuesta "${p.nombre}"? No se puede deshacer.`)) return;
        bloquear(true);
        try {
            await rechazarPendiente(p.id);
            aviso(`"${p.nombre}" fue rechazada y borrada.`, "info");
            tarjeta.remove();
            revisarVacio();
        } catch (e) {
            console.error(e);
            aviso("No se pudo rechazar. Revisa tu sesión y tu conexión.");
            bloquear(false);
        }
    });

    return tarjeta;
}

function revisarVacio() {
    if (!lista.querySelector(".solicitud")) {
        lista.innerHTML = "";
        lista.appendChild(el("p", "estado", "No hay solicitudes pendientes."));
    }
}

async function mostrar() {
    try {
        const pendientes = await obtenerPendientes();
        lista.innerHTML = "";
        pendientes.forEach((p) => lista.appendChild(crearSolicitud(p)));
        revisarVacio();
    } catch (e) {
        console.error(e);
        lista.innerHTML = "";
        lista.appendChild(el("p", "estado", "No se pudieron cargar las solicitudes. Recarga la página."));
    }
}

if (!configurado || !(await esAdmin())) {
    location.replace("login.html");
} else {
    document.getElementById("zona").hidden = false;
    document.getElementById("salir").addEventListener("click", async () => {
        await cerrarSesion();
        location.href = "login.html";
    });
    await mostrar();
}
