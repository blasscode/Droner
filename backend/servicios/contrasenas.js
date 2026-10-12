/* ==========================================================================
   DRONER - Contraseñas
   --------------------------------------------------------------------------
   Una contraseña NUNCA se guarda tal cual la escribe el usuario. Se guarda su
   "hash": el resultado de pasarla por una función matemática de una sola vía.
   A partir del hash no se puede volver a la contraseña, pero sí se puede
   comprobar si una contraseña escrita produce ese mismo hash.

   Se usa scrypt, un algoritmo pensado para contraseñas que viene incluido en
   Node (no hace falta instalar nada). Es lento a propósito: eso vuelve
   impracticable probar millones de contraseñas si alguien roba el archivo.
   ========================================================================== */

// Módulo de criptografía de Node.
const crypto = require('node:crypto');

// Cantidad de bytes del hash resultante.
const LARGO_HASH = 64;

// Recibe una contraseña y devuelve el texto que se guarda en usuarios.json.
function crearHash(contrasena) {
    // La "sal" es un valor al azar distinto para cada cuenta. Gracias a ella, dos usuarios
    // con la misma contraseña terminan con hashes diferentes.
    const sal = crypto.randomBytes(16).toString('hex');
    // Calcula el hash combinando la contraseña con la sal.
    const hash = crypto.scryptSync(contrasena, sal, LARGO_HASH).toString('hex');
    // Guarda las dos cosas juntas, separadas por ":" porque la sal hace falta para verificar.
    return `${sal}:${hash}`;
}

// Comprueba si una contraseña escrita coincide con un hash guardado. Devuelve true o false.
function verificar(contrasena, guardado) {
    // Separa el texto guardado en sus dos partes.
    const [sal, hashGuardado] = guardado.split(':');
    // Convierte el hash guardado de texto hexadecimal a bytes.
    const bytesGuardados = Buffer.from(hashGuardado, 'hex');
    // Calcula el hash de la contraseña escrita usando la MISMA sal.
    const bytesCalculados = crypto.scryptSync(contrasena, sal, LARGO_HASH);
    // Si los largos no coinciden, el dato guardado está dañado: no puede ser igual.
    if (bytesGuardados.length !== bytesCalculados.length) {
        return false;
    }
    // timingSafeEqual compara tardando siempre lo mismo. Una comparación común corta en la
    // primera diferencia, y midiendo ese tiempo se podría ir adivinando el hash de a poco.
    return crypto.timingSafeEqual(bytesGuardados, bytesCalculados);
}

// Funciones disponibles para el resto del backend.
module.exports = { crearHash, verificar };
