/* ==========================================================================
   DRONER - Rutas de administración de usuarios
   --------------------------------------------------------------------------
   Todas son exclusivas del administrador:

     GET    /api/usuarios       Lista todas las cuentas
     PATCH  /api/usuarios/:id   Cambia el rol de una cuenta
     DELETE /api/usuarios/:id   Elimina una cuenta

   ":id" es un parámetro: en /api/usuarios/abc123, req.params.id vale "abc123".
   ========================================================================== */

// Express: el framework que maneja los pedidos HTTP.
const express = require('express');
// Acceso a los datos guardados.
const almacen = require('../servicios/almacen');
// Middleware de permisos y función que quita el hash de un usuario.
const { requiereAdmin, usuarioPublico } = require('../middlewares/permisos');

// Grupo de rutas de este archivo.
const router = express.Router();

// Únicos valores de rol que existen en el sitio.
const ROLES_VALIDOS = ['usuario', 'admin'];

// Aplica requiereAdmin a TODAS las rutas que empiecen con /usuarios, de una sola vez.
router.use('/usuarios', requiereAdmin);

// ------------------------------- GET /api/usuarios -------------------------------
router.get('/usuarios', (req, res) => {
    // Lee todos los usuarios y le quita el hash a cada uno antes de mandarlos.
    res.json(almacen.leerUsuarios().map(usuarioPublico));
});

// ---------------------------- PATCH /api/usuarios/:id ----------------------------
router.patch('/usuarios/:id', (req, res) => {
    // Rol nuevo que pidió el administrador.
    const rol = (req.body || {}).rol;
    // Tiene que ser uno de los roles que existen.
    if (!ROLES_VALIDOS.includes(rol)) {
        return res.status(400).json({ error: 'El rol debe ser "usuario" o "admin".' });
    }
    // Un admin no puede cambiarse el rol a sí mismo. Como quien hace el cambio siempre
    // sigue siendo admin, esto garantiza que el sitio nunca se quede sin administradores.
    if (req.params.id === req.usuario.id) {
        return res.status(400).json({ error: 'No podés cambiar tu propio rol.' });
    }

    // Trae la lista y busca la cuenta a modificar.
    const usuarios = almacen.leerUsuarios();
    const usuario = usuarios.find((u) => u.id === req.params.id);
    // Si no existe, responde 404 (no encontrado).
    if (!usuario) {
        return res.status(404).json({ error: 'No existe ese usuario.' });
    }

    // Aplica el cambio...
    usuario.rol = rol;
    // ...y guarda la lista.
    almacen.guardarUsuarios(usuarios);
    // Devuelve la cuenta actualizada, sin el hash.
    res.json(usuarioPublico(usuario));
});

// --------------------------- DELETE /api/usuarios/:id ---------------------------
router.delete('/usuarios/:id', (req, res) => {
    // Un admin no puede eliminarse a sí mismo (misma razón que arriba).
    if (req.params.id === req.usuario.id) {
        return res.status(400).json({ error: 'No podés eliminar tu propia cuenta.' });
    }

    // Trae la lista actual.
    const usuarios = almacen.leerUsuarios();
    // Arma una lista nueva con todos MENOS el que se quiere eliminar.
    const restantes = usuarios.filter((u) => u.id !== req.params.id);
    // Si las dos listas miden lo mismo, ese id no existía.
    if (restantes.length === usuarios.length) {
        return res.status(404).json({ error: 'No existe ese usuario.' });
    }

    // Guarda la lista sin el usuario eliminado.
    almacen.guardarUsuarios(restantes);
    // 204 = salió bien y no hay nada para devolver.
    res.status(204).end();
});

// Exporta el grupo de rutas para enchufarlo en server.js.
module.exports = router;
