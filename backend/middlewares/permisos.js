/* ==========================================================================
   DRONER - Permisos
   --------------------------------------------------------------------------
   Un "middleware" es una función que Express ejecuta ANTES de la función que
   responde un pedido. Recibe tres cosas:
     req   el pedido que llegó (request)
     res   la respuesta que se va a enviar (response)
     next  una función que, al llamarla, deja pasar al siguiente paso
   Si el middleware responde por su cuenta y no llama a next(), el pedido
   termina ahí. Así es como se bloquea el acceso.

   Acá está toda la lógica de "quién puede hacer qué". Es el lugar donde
   realmente se protege el sitio: ocultar un botón en el navegador no alcanza,
   porque cualquiera puede llamar a la API directamente.
   ========================================================================== */

// Acceso a los datos guardados.
const almacen = require('../servicios/almacen');

// Devuelve una copia del usuario SIN el hash de la contraseña.
// Es lo único que se le manda al navegador: el hash nunca sale del servidor.
function usuarioPublico(usuario) {
    return {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
        creado: usuario.creado,
    };
}

// Se ejecuta en TODOS los pedidos. Si hay una sesión iniciada, busca al usuario y lo deja en req.usuario.
function cargarUsuario(req, res, next) {
    // Por defecto, nadie inició sesión.
    req.usuario = null;
    // La sesión solo guarda el id del usuario (lo puso la ruta de login).
    if (req.session.usuarioId) {
        // Busca los datos ACTUALES de ese usuario. Se leen en cada pedido a propósito:
        // si un admin le cambia el rol o lo elimina, el cambio se aplica al instante.
        const usuario = almacen.leerUsuarios().find((u) => u.id === req.session.usuarioId);
        // Si lo encontró, lo guarda en el pedido; si fue eliminado, queda en null.
        req.usuario = usuario || null;
    }
    // Deja pasar al siguiente paso.
    next();
}

// Protege rutas de la API que necesitan sesión iniciada.
function requiereSesion(req, res, next) {
    // Si no hay usuario...
    if (!req.usuario) {
        // ...responde 401 (no autenticado) y corta acá.
        return res.status(401).json({ error: 'Tenés que iniciar sesión.' });
    }
    // Hay usuario: deja pasar.
    next();
}

// Protege rutas de la API que solo puede usar un administrador.
function requiereAdmin(req, res, next) {
    // Primero comprueba que haya sesión.
    if (!req.usuario) {
        return res.status(401).json({ error: 'Tenés que iniciar sesión.' });
    }
    // Después comprueba el rol.
    if (req.usuario.rol !== 'admin') {
        // 403 (prohibido): sabemos quién es, pero no tiene permiso.
        return res.status(403).json({ error: 'Esta acción es solo para administradores.' });
    }
    // Es admin: deja pasar.
    next();
}

// Protege PÁGINAS (no API) que necesitan sesión: en vez de un error, manda al login.
function paginaRequiereSesion(req, res, next) {
    // Sin sesión, redirige a la página de inicio de sesión.
    if (!req.usuario) {
        return res.redirect('/iniciar-sesion.html');
    }
    // Con sesión, deja pasar.
    next();
}

// Protege PÁGINAS que solo puede ver un administrador.
function paginaRequiereAdmin(req, res, next) {
    // Sin sesión, redirige al login.
    if (!req.usuario) {
        return res.redirect('/iniciar-sesion.html');
    }
    // Con sesión pero sin ser admin, lo manda a su propia cuenta.
    if (req.usuario.rol !== 'admin') {
        return res.redirect('/cuenta.html');
    }
    // Es admin: deja pasar.
    next();
}

// Funciones disponibles para el resto del backend.
module.exports = {
    usuarioPublico,
    cargarUsuario,
    requiereSesion,
    requiereAdmin,
    paginaRequiereSesion,
    paginaRequiereAdmin,
};
