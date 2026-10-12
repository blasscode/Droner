/* ==========================================================================
   DRONER - Rutas de autenticación
   --------------------------------------------------------------------------
   Todo lo relacionado con entrar y salir del sitio:

     POST /api/registro   Crea una cuenta nueva (siempre con rol "usuario")
     POST /api/login      Inicia sesión
     POST /api/logout     Cierra la sesión
     GET  /api/sesion     Informa quién tiene la sesión iniciada (o nadie)

   Cómo funciona una sesión: cuando el login es correcto, el servidor guarda
   en su memoria "la sesión X pertenece al usuario Y" y le manda al navegador
   una cookie con el identificador X. El navegador reenvía esa cookie sola en
   cada pedido, y así el servidor sabe quién es sin volver a pedir la clave.
   ========================================================================== */

// Express: el framework que maneja los pedidos HTTP.
const express = require('express');
// Módulo de criptografía de Node; acá se usa para generar identificadores únicos.
const crypto = require('node:crypto');
// Acceso a los datos guardados.
const almacen = require('../servicios/almacen');
// Funciones para crear y verificar hashes de contraseñas.
const { crearHash, verificar } = require('../servicios/contrasenas');
// Función que quita el hash antes de mandar un usuario al navegador.
const { usuarioPublico } = require('../middlewares/permisos');

// Un Router es un grupo de rutas que después se "enchufa" en el servidor (ver server.js).
const router = express.Router();

// Expresión regular para comprobar que un texto tiene forma de correo: algo@algo.algo, sin espacios.
const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Largo mínimo de contraseña que se acepta al registrarse.
const MINIMO_CONTRASENA = 8;
// Largo máximo: evita que alguien mande textos enormes para tener ocupado al servidor calculando hashes.
const MAXIMO_CONTRASENA = 200;
// Treinta días expresados en milisegundos (duración de la sesión con "Recuérdame").
const TREINTA_DIAS = 30 * 24 * 60 * 60 * 1000;
// Hash de relleno que se usa cuando el correo no existe (se explica en la ruta de login).
const HASH_DE_RELLENO = crearHash('contraseña-que-nadie-usa');

// Devuelve el valor si es un texto (sin espacios sobrantes), o un texto vacío si es otra cosa.
// Sirve para no confiar en lo que manda el navegador: podría llegar un número, una lista, nada...
function texto(valor) {
    return typeof valor === 'string' ? valor.trim() : '';
}

// Marca la sesión actual como perteneciente a un usuario. Devuelve una promesa para poder usar await.
function iniciarSesion(req, usuario, recordarme) {
    return new Promise((resolver, rechazar) => {
        // regenerate descarta la sesión anterior y crea una con un identificador nuevo.
        // Cambiar el identificador justo al iniciar sesión impide que alguien que conocía
        // el anterior quede adentro de la cuenta (ataque de "fijación de sesión").
        req.session.regenerate((error) => {
            // Si falló, avisa el error a quien llamó.
            if (error) {
                return rechazar(error);
            }
            // Guarda en la sesión SOLO el id: el resto de los datos se lee en cada pedido.
            req.session.usuarioId = usuario.id;
            // Con "Recuérdame" tildado, la cookie dura 30 días.
            // Sin tildar no tiene vencimiento y se borra al cerrar el navegador.
            if (recordarme) {
                req.session.cookie.maxAge = TREINTA_DIAS;
            }
            // Listo.
            resolver();
        });
    });
}

// ----------------------------- POST /api/registro -----------------------------
// "async" permite usar await adentro de la función.
router.post('/registro', async (req, res) => {
    // req.body es el JSON que mandó el navegador; si no mandó nada se usa un objeto vacío.
    const cuerpo = req.body || {};
    // Toma cada dato y lo limpia.
    const nombre = texto(cuerpo.nombre);
    // El correo se pasa a minúsculas para que "Ana@Mail.com" y "ana@mail.com" sean la misma cuenta.
    const correo = texto(cuerpo.correo).toLowerCase();
    // La contraseña NO se recorta: los espacios pueden ser parte de ella.
    const contrasena = typeof cuerpo.contrasena === 'string' ? cuerpo.contrasena : '';

    // Validaciones. Se repiten acá aunque el formulario ya las haga: lo que valida el
    // navegador se puede saltear, lo que valida el servidor no.
    if (nombre.length < 2 || nombre.length > 60) {
        // 400 = el pedido tiene datos incorrectos.
        return res.status(400).json({ error: 'El nombre debe tener entre 2 y 60 caracteres.' });
    }
    if (!FORMATO_CORREO.test(correo) || correo.length > 120) {
        return res.status(400).json({ error: 'El correo no es válido.' });
    }
    if (contrasena.length < MINIMO_CONTRASENA || contrasena.length > MAXIMO_CONTRASENA) {
        return res.status(400).json({ error: `La contraseña debe tener al menos ${MINIMO_CONTRASENA} caracteres.` });
    }

    // Trae los usuarios que ya existen.
    const usuarios = almacen.leerUsuarios();
    // Si alguno ya usa ese correo, no se puede registrar de nuevo.
    if (usuarios.some((u) => u.correo === correo)) {
        // 409 = conflicto con algo que ya existe.
        return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
    }

    // Arma el usuario nuevo.
    const usuario = {
        // Identificador único generado al azar.
        id: crypto.randomUUID(),
        nombre,
        correo,
        // Se guarda el hash, nunca la contraseña.
        contrasenaHash: crearHash(contrasena),
        // El rol se fija ACÁ y siempre es "usuario". No se lee del pedido: si se leyera,
        // cualquiera podría registrarse mandando rol "admin".
        rol: 'usuario',
        // Fecha y hora de creación.
        creado: new Date().toISOString(),
    };
    // Lo agrega a la lista...
    usuarios.push(usuario);
    // ...y guarda la lista en disco.
    almacen.guardarUsuarios(usuarios);

    // Deja la sesión iniciada para que no tenga que loguearse apenas se registra.
    await iniciarSesion(req, usuario, false);
    // 201 = se creó algo nuevo. Devuelve el usuario sin el hash.
    res.status(201).json({ usuario: usuarioPublico(usuario) });
});

// ------------------------------- POST /api/login -------------------------------
router.post('/login', async (req, res) => {
    // Datos que mandó el navegador.
    const cuerpo = req.body || {};
    const correo = texto(cuerpo.correo).toLowerCase();
    const contrasena = typeof cuerpo.contrasena === 'string' ? cuerpo.contrasena : '';
    // "Recuérdame" solo vale si llegó exactamente el valor true.
    const recordarme = cuerpo.recordarme === true;

    // Busca la cuenta por correo (puede no existir).
    const usuario = almacen.leerUsuarios().find((u) => u.correo === correo);
    // Verifica la contraseña. Si el correo no existe se verifica igual contra un hash de relleno:
    // así el servidor tarda lo mismo en los dos casos y no delata, por el tiempo de respuesta,
    // qué correos están registrados.
    const coincide = contrasena.length <= MAXIMO_CONTRASENA
        && verificar(contrasena, usuario ? usuario.contrasenaHash : HASH_DE_RELLENO);

    // Si el correo no existe o la contraseña no coincide...
    if (!usuario || !coincide) {
        // ...responde 401 con un mensaje que NO aclara cuál de las dos cosas falló,
        // para no darle pistas a quien esté probando correos.
        return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    // Datos correctos: inicia la sesión.
    await iniciarSesion(req, usuario, recordarme);
    // Devuelve el usuario sin el hash.
    res.json({ usuario: usuarioPublico(usuario) });
});

// ------------------------------ POST /api/logout ------------------------------
router.post('/logout', (req, res, next) => {
    // destroy borra la sesión de la memoria del servidor.
    req.session.destroy((error) => {
        // Si falló, le pasa el error al manejador general (ver server.js).
        if (error) {
            return next(error);
        }
        // Le pide al navegador que borre la cookie de sesión.
        res.clearCookie('droner.sid');
        // 204 = salió bien y no hay nada para devolver.
        res.status(204).end();
    });
});

// ------------------------------- GET /api/sesion -------------------------------
router.get('/sesion', (req, res) => {
    // req.usuario lo completó el middleware cargarUsuario (ver permisos.js).
    // Devuelve el usuario sin el hash, o null si nadie inició sesión.
    res.json({ usuario: req.usuario ? usuarioPublico(req.usuario) : null });
});

// Exporta el grupo de rutas para enchufarlo en server.js.
module.exports = router;
