// ============================================================
//  Conexión con Firebase (base de datos Firestore + login).
//  Lo usan recetas.html, receta.html, agregar.html y login.html.
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getFirestore, collection, addDoc, getDocs, getDoc, deleteDoc, updateDoc, doc, writeBatch,
    query, orderBy, limit, startAfter, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
    getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";
// Se lee así (y no con un import con nombre) para que el sitio no se dañe si el archivo de configuración no tiene esta línea.
import * as ajustes from "./firebase-config.js";

export const configurado = !firebaseConfig.apiKey.startsWith("PEGA_AQUI");

let db = null;
let auth = null;
if (configurado) {
    const app = initializeApp(firebaseConfig);
    // Protección contra robots (Firebase App Check + reCAPTCHA Enterprise). Solo se activa si en firebase-config.js
    // existe la línea:  export const appCheckSiteKey = "TU_CLAVE_DE_SITIO";
    const claveAppCheck = ajustes.appCheckSiteKey || "";
    if (claveAppCheck) {
        const { initializeAppCheck, ReCaptchaEnterpriseProvider } =
            await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js");
        initializeAppCheck(app, {
            provider: new ReCaptchaEnterpriseProvider(claveAppCheck),
            isTokenAutoRefreshEnabled: true,
        });
    }
    db = getFirestore(app);
    auth = getAuth(app);
}

function revisar() {
    if (!configurado) throw new Error("Firebase no está configurado (revisa js/firebase-config.js).");
}

// Solo se aceptan imágenes JPEG en base64 (así nadie puede meter código raro en el estilo).
const PATRON_IMAGEN = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;
const PATRON_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function imagenSegura(imagen) {
    return typeof imagen === "string" && PATRON_IMAGEN.test(imagen) ? imagen : null;
}

/** Recetas por páginas, de la más nueva a la más vieja. Cada receta trae solo la miniatura (liviana).
 *  Devuelve { recetas, cursor, hayMas }. Para la página siguiente, pasar el cursor anterior. */
export async function obtenerRecetas(cursor = null, tamano = 12) {
    revisar();
    const partes = [orderBy("fecha", "desc")];
    if (cursor) partes.push(startAfter(cursor));
    partes.push(limit(tamano + 1)); // una de más, solo para saber si hay otra página
    const resultado = await getDocs(query(collection(db, "recetas"), ...partes));
    const docs = resultado.docs;
    const hayMas = docs.length > tamano;
    const pagina = hayMas ? docs.slice(0, tamano) : docs;
    return {
        recetas: pagina.map((d) => ({ id: d.id, ...d.data() })),
        cursor: pagina.length ? pagina[pagina.length - 1] : null,
        hayMas,
    };
}

/** Foto grande de una receta (guardada aparte, en la colección "imagenes"), o null. */
export async function obtenerImagenReceta(id) {
    revisar();
    if (!/^[A-Za-z0-9]{1,40}$/.test(id)) return null;
    const d = await getDoc(doc(db, "imagenes", id));
    return d.exists() ? imagenSegura(d.data().datos) : null;
}

/** Una receta por su id, o null si no existe. */
export async function obtenerReceta(id) {
    revisar();
    if (!/^[A-Za-z0-9]{1,40}$/.test(id)) return null;
    const documento = await getDoc(doc(db, "recetas", id));
    return documento.exists() ? { id: documento.id, ...documento.data() } : null;
}

/** Guarda una receta nueva (solo funciona si hay un administrador con sesión). Devuelve su id. */
export async function guardarReceta(r) {
    revisar();
    const lote = writeBatch(db);
    const nueva = doc(collection(db, "recetas"));
    lote.set(nueva, camposReceta(r, true));
    if (r.imagen) lote.set(doc(db, "imagenes", nueva.id), { datos: r.imagen });
    await lote.commit();
    return nueva.id;
}

// La receta guarda solo una miniatura (liviana, para las listas). La foto grande va aparte en "imagenes/<id>".
function camposReceta(r, conFecha) {
    const c = {
        nombre: r.nombre,
        descripcion: r.descripcion,
        coccion: r.coccion,
        tiempo: r.tiempo,
        ingredientes: r.ingredientes,
        preparacion: r.preparacion,
        nota: r.nota || null,
        autor: r.autor || null,
        imagen: null,
        miniatura: r.imagen ? (r.miniatura || null) : null,
    };
    if (conFecha) c.fecha = serverTimestamp();
    return c;
}

// ---------- Propuestas de visitantes (quedan pendientes hasta que el administrador las apruebe) ----------
/** Cualquier visitante puede enviar una propuesta. NO se publica: queda en "pendientes". */
export async function guardarPropuesta(p) {
    revisar();
    await addDoc(collection(db, "pendientes"), {
        nombre: p.nombre,
        descripcion: p.descripcion,
        coccion: p.coccion,
        tiempo: p.tiempo,
        ingredientes: p.ingredientes,
        preparacion: p.preparacion,
        nota: p.nota || null,
        autor: p.autor || null,
        fecha: serverTimestamp(),
    });
}

/** Solo el administrador puede leerlas. De la más antigua a la más nueva. */
export async function obtenerPendientes() {
    revisar();
    const consulta = query(collection(db, "pendientes"), orderBy("fecha", "asc"), limit(100));
    const resultado = await getDocs(consulta);
    return resultado.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Publica la propuesta como receta y la saca de pendientes (las dos cosas juntas, o ninguna). */
export async function aprobarPendiente(p) {
    revisar();
    const lote = writeBatch(db);
    lote.set(doc(collection(db, "recetas")), {
        nombre: p.nombre,
        descripcion: p.descripcion,
        coccion: p.coccion,
        tiempo: p.tiempo,
        ingredientes: p.ingredientes,
        preparacion: p.preparacion,
        nota: p.nota || null,
        autor: p.autor || null,
        imagen: null,
        fecha: serverTimestamp(),
    });
    lote.delete(doc(db, "pendientes", p.id));
    await lote.commit();
}

export async function rechazarPendiente(id) {
    revisar();
    await deleteDoc(doc(db, "pendientes", id));
}

/** Edita una receta ya publicada (solo administrador). No cambia la fecha original. */
export async function actualizarReceta(id, r) {
    revisar();
    const lote = writeBatch(db);
    lote.update(doc(db, "recetas", id), camposReceta(r, false));
    if (r.imagen) lote.set(doc(db, "imagenes", id), { datos: r.imagen });
    else lote.delete(doc(db, "imagenes", id));
    await lote.commit();
}

/** Una propuesta pendiente por su id (solo administrador), o null. */
export async function obtenerPendiente(id) {
    revisar();
    if (!/^[A-Za-z0-9]{1,40}$/.test(id)) return null;
    const documento = await getDoc(doc(db, "pendientes", id));
    return documento.exists() ? { id: documento.id, ...documento.data() } : null;
}

/** Publica una propuesta ya revisada/corregida por el administrador y la saca de pendientes. Devuelve el id nuevo. */
export async function publicarDesdePropuesta(idPendiente, r) {
    revisar();
    const lote = writeBatch(db);
    const nueva = doc(collection(db, "recetas"));
    lote.set(nueva, camposReceta(r, true));
    if (r.imagen) lote.set(doc(db, "imagenes", nueva.id), { datos: r.imagen });
    lote.delete(doc(db, "pendientes", idPendiente));
    await lote.commit();
    return nueva.id;
}

export async function eliminarReceta(id) {
    revisar();
    const lote = writeBatch(db);
    lote.delete(doc(db, "recetas", id));
    lote.delete(doc(db, "imagenes", id));
    await lote.commit();
}

// ---------- Login ----------
export async function iniciarSesion(correo, clave) {
    revisar();
    await signInWithEmailAndPassword(auth, correo, clave);
}

/** Envía al correo un enlace para cambiar la contraseña. */
export async function recuperarClave(correo) {
    revisar();
    await sendPasswordResetEmail(auth, correo);
}

export async function cerrarSesion() {
    if (configurado) await signOut(auth);
}

// Espera a que Firebase termine de revisar si ya había una sesión guardada.
function usuarioActual() {
    return new Promise((resolve) => {
        let quitar = null;
        quitar = onAuthStateChanged(auth, (usuario) => {
            if (quitar) quitar();
            resolve(usuario);
        });
    });
}

/** true solo si hay sesión iniciada Y existe el documento admins/<uid>. */
export async function esAdmin() {
    if (!configurado) return false;
    const usuario = await usuarioActual();
    if (!usuario) return false;
    try {
        return (await getDoc(doc(db, "admins", usuario.uid))).exists();
    } catch {
        return false;
    }
}

// ---------- Videos de YouTube (solo se guarda el código del video, nunca el video) ----------
/** Saca el código de 11 letras de un enlace de YouTube, o null si no es un enlace válido. */
export function extraerIdYoutube(texto) {
    const t = String(texto).trim();
    let m = t.match(/^https?:\/\/(?:www\.|m\.)?youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})(?:[&?#/].*)?$/i);
    if (!m) m = t.match(/^https?:\/\/youtu\.be\/([A-Za-z0-9_-]{11})(?:[?#/].*)?$/i);
    return m ? m[1] : null;
}

export async function obtenerVideos() {
    revisar();
    const consulta = query(collection(db, "videos"), orderBy("fecha", "desc"), limit(100));
    const resultado = await getDocs(consulta);
    return resultado.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function guardarVideo(v) {
    revisar();
    await addDoc(collection(db, "videos"), {
        titulo: v.titulo,
        ytId: v.ytId,
        descripcion: v.descripcion || null,
        fecha: serverTimestamp(),
    });
}

export async function actualizarVideo(id, v) {
    revisar();
    await updateDoc(doc(db, "videos", id), {
        titulo: v.titulo,
        ytId: v.ytId,
        descripcion: v.descripcion || null,
    });
}

export async function eliminarVideo(id) {
    revisar();
    await deleteDoc(doc(db, "videos", id));
}

// ---------- Propuestas de video de visitantes (el administrador las aprueba) ----------
export async function guardarPropuestaVideo(v) {
    revisar();
    await addDoc(collection(db, "videosPendientes"), {
        titulo: v.titulo,
        ytId: v.ytId,
        descripcion: v.descripcion || null,
        autor: v.autor || null,
        fecha: serverTimestamp(),
    });
}

/** Solo el administrador puede leerlas. De la más antigua a la más nueva. */
export async function obtenerVideosPendientes() {
    revisar();
    const consulta = query(collection(db, "videosPendientes"), orderBy("fecha", "asc"), limit(100));
    const resultado = await getDocs(consulta);
    return resultado.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Publica la propuesta como video y la saca de pendientes (las dos cosas juntas, o ninguna). */
export async function aprobarVideoPendiente(v) {
    revisar();
    const lote = writeBatch(db);
    lote.set(doc(collection(db, "videos")), {
        titulo: v.titulo,
        ytId: v.ytId,
        descripcion: v.descripcion || null,
        fecha: serverTimestamp(),
    });
    lote.delete(doc(db, "videosPendientes", v.id));
    await lote.commit();
}

export async function rechazarVideoPendiente(id) {
    revisar();
    await deleteDoc(doc(db, "videosPendientes", id));
}

/** Pone la imagen de la receta como fondo de un elemento (o deja el degradado si no tiene). */
export function ponerImagen(elemento, imagen) { // acepta la miniatura o la imagen completa
    const segura = imagenSegura(imagen);
    elemento.classList.add("img-comunidad");
    if (segura) {
        elemento.style.backgroundImage = `url("${segura}"), linear-gradient(135deg, var(--amarillo), var(--azul))`;
    }
}
