// ============================================================
//  Control de imágenes (todo se hace en el navegador del usuario).
//
//  1) NSFWJS: detecta imágenes subidas de tono (desnudos, contenido sexual).
//     El modelo está guardado en la carpeta modelos/nsfw/.
//  2) MobileNet: reconoce qué hay en la foto. Solo se acepta si parece
//     comida, ingredientes o utensilios de cocina.
//
//  OJO: es una inteligencia artificial, no es perfecta. No sabe distinguir
//  "soya" de otras comidas; solo revisa que sea comida/cocina.
// ============================================================

const LIBRERIAS = [
    "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js",
    "https://cdn.jsdelivr.net/npm/nsfwjs@4.2.1/dist/browser/nsfwjs.min.js",
    "https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1/dist/mobilenet.min.js",
];

// Límites para considerar una imagen inapropiada (0 = nada, 1 = seguro).
const LIMITE_PORNO = 0.25;
const LIMITE_HENTAI = 0.25;
const LIMITE_SEXY = 0.4;

// Mínimo de "parecido a comida/cocina" para aceptar la foto.
const LIMITE_COMIDA = 0.15;

// Categorías de MobileNet que cuentan como comida, ingredientes o cocina.
const CATEGORIAS_COMIDA = new Set([
    // Comidas
    "guacamole", "consomme", "hot pot", "trifle", "ice cream", "ice lolly",
    "french loaf", "bagel", "pretzel", "cheeseburger", "hotdog", "mashed potato",
    "carbonara", "chocolate sauce", "dough", "meat loaf", "pizza", "potpie",
    "burrito", "espresso", "eggnog",
    // Verduras, frutas y granos
    "head cabbage", "broccoli", "cauliflower", "zucchini", "spaghetti squash",
    "acorn squash", "butternut squash", "cucumber", "artichoke", "bell pepper",
    "cardoon", "mushroom", "granny smith", "strawberry", "orange", "lemon", "fig",
    "pineapple", "banana", "jackfruit", "custard apple", "pomegranate", "corn",
    "ear", "acorn", "buckeye", "hip",
    // Utensilios y lugares de cocina
    "plate", "mixing bowl", "soup bowl", "frying pan", "wok", "dutch oven",
    "caldron", "crock pot", "waffle iron", "wooden spoon", "spatula", "ladle",
    "tray", "dining table", "bakery", "grocery store", "measuring cup",
    "rotisserie", "toaster", "stove", "cup", "coffee mug", "pitcher", "teapot",
    "saltshaker", "mortar", "strainer",
]);

let modelos = null;

function cargarScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = url;
        script.onload = resolve;
        script.onerror = () => reject(new Error("No se pudo cargar " + url));
        document.head.appendChild(script);
    });
}

/** Carga las librerías y los dos modelos (solo la primera vez). */
export async function cargarModelos() {
    if (modelos) return modelos;
    for (const url of LIBRERIAS) {
        await cargarScript(url); // en orden: tf primero
    }
    const [nsfw, objetos] = await Promise.all([
        window.nsfwjs.load("modelos/nsfw/"),
        window.mobilenet.load({ version: 2, alpha: 1.0 }),
    ]);
    modelos = { nsfw, objetos };
    return modelos;
}

function esComida(nombreCategoria) {
    // MobileNet da nombres como "frying pan, frypan, skillet"
    return nombreCategoria
        .toLowerCase()
        .split(",")
        .some((parte) => CATEGORIAS_COMIDA.has(parte.trim()));
}

/**
 * Revisa una imagen (img o canvas).
 * Devuelve { aceptada: true } o { aceptada: false, motivo: "..." }.
 */
export async function revisarImagen(imagen) {
    const { nsfw, objetos } = await cargarModelos();

    // 1) ¿Es subida de tono?
    const resultadoNsfw = await nsfw.classify(imagen);
    const prob = Object.fromEntries(resultadoNsfw.map((r) => [r.className, r.probability]));
    if ((prob.Porn || 0) > LIMITE_PORNO || (prob.Hentai || 0) > LIMITE_HENTAI || (prob.Sexy || 0) > LIMITE_SEXY) {
        return { aceptada: false, motivo: "La imagen parece tener contenido inapropiado." };
    }

    // 2) ¿Se ve como comida o cocina?
    const predicciones = await objetos.classify(imagen, 10);
    const parecidoComida = predicciones
        .filter((p) => esComida(p.className))
        .reduce((suma, p) => suma + p.probability, 0);
    if (parecidoComida < LIMITE_COMIDA) {
        return { aceptada: false, motivo: "La imagen no parece ser de comida o de una preparación." };
    }

    return { aceptada: true };
}
