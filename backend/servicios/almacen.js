/* ==========================================================================
   DRONER - Almacén de datos
   --------------------------------------------------------------------------
   Hace de "base de datos" del proyecto. En lugar de un motor real (MySQL,
   PostgreSQL...) guarda todo en archivos JSON dentro de backend/datos/:

     semilla.json    Datos iniciales. Se sube al repositorio y NO se modifica.
     usuarios.json   Cuentas registradas. Lo crea este archivo en el primer arranque.
     contenido.json  Textos editables del sitio. Ídem.

   Es el ÚNICO archivo que lee y escribe en disco: el resto del backend le
   pide los datos a través de las funciones que se exportan al final.
   ========================================================================== */

// Módulo de Node para trabajar con archivos (file system).
const fs = require('node:fs');
// Módulo de Node para armar rutas de carpetas que funcionen en cualquier sistema operativo.
const path = require('node:path');
// Módulo de criptografía de Node; acá se usa para generar identificadores únicos.
const crypto = require('node:crypto');
// Funciones propias para generar el hash de una contraseña.
const { crearHash } = require('./contrasenas');

// Ruta absoluta a la carpeta backend/datos (__dirname es la carpeta de ESTE archivo).
const CARPETA_DATOS = path.join(__dirname, '..', 'datos');
// Ruta del archivo con los datos iniciales.
const ARCHIVO_SEMILLA = path.join(CARPETA_DATOS, 'semilla.json');
// Ruta del archivo donde se guardan las cuentas.
const ARCHIVO_USUARIOS = path.join(CARPETA_DATOS, 'usuarios.json');
// Ruta del archivo donde se guardan los textos editables.
const ARCHIVO_CONTENIDO = path.join(CARPETA_DATOS, 'contenido.json');

// Lee un archivo JSON y devuelve su contenido ya convertido a objeto de JavaScript.
function leerJson(ruta) {
    // readFileSync lee el archivo completo como texto; JSON.parse lo convierte en objeto.
    return JSON.parse(fs.readFileSync(ruta, 'utf-8'));
}

// Guarda un objeto de JavaScript en un archivo JSON.
function guardarJson(ruta, datos) {
    // Nombre de un archivo temporal ubicado al lado del definitivo.
    const temporal = `${ruta}.tmp`;
    // Escribe primero en el temporal; el 2 de JSON.stringify indenta el texto para que se pueda leer.
    fs.writeFileSync(temporal, JSON.stringify(datos, null, 2), 'utf-8');
    // Recién cuando terminó de escribirse, reemplaza al archivo definitivo.
    // Así, si el programa se corta a mitad de la escritura, el archivo bueno no queda arruinado.
    fs.renameSync(temporal, ruta);
}

// Crea usuarios.json y contenido.json a partir de la semilla si todavía no existen.
// Se llama una sola vez, cuando arranca el servidor.
function inicializar() {
    // Lee los datos iniciales.
    const semilla = leerJson(ARCHIVO_SEMILLA);

    // Si todavía no existe el archivo de usuarios...
    if (!fs.existsSync(ARCHIVO_USUARIOS)) {
        // ...transforma cada cuenta de la semilla en un usuario listo para guardar.
        const usuarios = semilla.usuarios.map((cuenta) => ({
            // Identificador único generado al azar.
            id: crypto.randomUUID(),
            // Nombre para mostrar.
            nombre: cuenta.nombre,
            // Correo, en minúsculas para poder compararlo sin importar cómo se escriba.
            correo: cuenta.correo.toLowerCase(),
            // Se guarda el HASH de la contraseña, nunca la contraseña en texto plano.
            contrasenaHash: crearHash(cuenta.contrasena),
            // Rol de la cuenta: "admin" o "usuario".
            rol: cuenta.rol,
            // Fecha y hora de creación en formato estándar (ISO 8601).
            creado: new Date().toISOString(),
        }));
        // Escribe el archivo.
        guardarJson(ARCHIVO_USUARIOS, usuarios);
    }

    // Si todavía no existe el archivo de contenido...
    if (!fs.existsSync(ARCHIVO_CONTENIDO)) {
        // ...lo crea con los textos iniciales de la semilla.
        guardarJson(ARCHIVO_CONTENIDO, semilla.contenido);
    }
}

// Devuelve la lista completa de usuarios.
function leerUsuarios() {
    return leerJson(ARCHIVO_USUARIOS);
}

// Reemplaza la lista completa de usuarios por la que se recibe.
function guardarUsuarios(usuarios) {
    guardarJson(ARCHIVO_USUARIOS, usuarios);
}

// Devuelve el objeto con los textos editables del sitio.
function leerContenido() {
    return leerJson(ARCHIVO_CONTENIDO);
}

// Reemplaza los textos editables del sitio por los que se reciben.
function guardarContenido(contenido) {
    guardarJson(ARCHIVO_CONTENIDO, contenido);
}

// Lo que se exporta acá es lo que otros archivos pueden usar al hacer require('./almacen').
module.exports = {
    inicializar,
    leerUsuarios,
    guardarUsuarios,
    leerContenido,
    guardarContenido,
};
