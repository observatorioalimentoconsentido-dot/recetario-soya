// Inicio de sesión del administrador (login.html)
import { configurado, iniciarSesion, cerrarSesion, esAdmin, recuperarClave } from "./comunidad.js";

const $ = (id) => document.getElementById(id);
const mensaje = $("mensaje");

function mostrar(texto, tipo = "error") {
    mensaje.innerHTML = "";
    if (!texto) return;
    const div = document.createElement("div");
    div.className = `alerta alerta-${tipo}`;
    div.textContent = texto;
    mensaje.appendChild(div);
}

if (!configurado) {
    $("entrar").disabled = true;
    mostrar("Falta configurar Firebase (js/firebase-config.js).", "info");
} else if (await esAdmin()) {
    location.replace("agregar.html"); // ya tiene sesión
}

// Mostrar / ocultar la contraseña para comprobar que se escribió bien
$("ver-clave").addEventListener("click", () => {
    const visible = $("clave").type === "password";
    $("clave").type = visible ? "text" : "password";
    $("ver-clave").textContent = visible ? "Ocultar" : "Mostrar";
    $("ver-clave").setAttribute("aria-pressed", String(visible));
});

// Aviso si el bloqueo de mayúsculas está activado
$("clave").addEventListener("keyup", (e) => {
    $("aviso-mayus").hidden = !(e.getModifierState && e.getModifierState("CapsLock"));
});
$("clave").addEventListener("blur", () => { $("aviso-mayus").hidden = true; });

// Recuperar contraseña por correo
$("olvide").addEventListener("click", async () => {
    const correo = $("correo").value.trim();
    if (!correo) return mostrar("Escribe tu correo arriba y vuelve a pulsar \"¿Olvidaste tu contraseña?\".", "info");
    try {
        await recuperarClave(correo);
        mostrar("Si ese correo está registrado, te enviamos un enlace para cambiar la contraseña. Revisa también la carpeta de spam.", "ok");
    } catch (err) {
        console.error(err);
        mostrar("No se pudo enviar el correo. Revisa que esté bien escrito e inténtalo de nuevo.");
    }
});

$("login").addEventListener("submit", async (e) => {
    e.preventDefault();
    const boton = $("entrar");
    boton.disabled = true;
    mostrar("");
    try {
        await iniciarSesion($("correo").value.trim(), $("clave").value);
        if (!(await esAdmin())) {
            await cerrarSesion();
            mostrar("Esta cuenta no tiene permiso de administrador.");
            boton.disabled = false;
            return;
        }
        location.href = "agregar.html";
    } catch (err) {
        console.error(err);
        mostrar("Correo o contraseña incorrectos.");
        boton.disabled = false;
    }
});
