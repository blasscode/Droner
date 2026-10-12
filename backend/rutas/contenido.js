/* ==========================================================================
   DRONER - Rutas de contenido
   --------------------------------------------------------------------------
   Los textos del sitio que el administrador puede modificar desde el panel:

     GET /api/contenido   Devuelve los textos. Es pública: la usan las páginas
                          del sitio para mostrarlos a cualquier visitante.
     PUT /api/contenido   Modifica los textos. Solo administradores.
   ========================================================================== */

// Express: el framework que maneja los pedidos HTTP.
const express = require('express');
// Acceso a los datos guardados.
const almacen = require('../servicios/almacen');
// Middleware que bloquea a quien no sea administrador.
const { requiereAdmin } = require('../middlewares/permisos');

// Grupo de rutas de este archivo.
const router = express.Router();

// Lista cerrada de textos que se pueden editar, con el largo máximo de cada uno.
// Si llega una clave que no está acá, se ignora: así nadie puede guardar datos arbitrarios.
const CAMPOS_EDITABLES = {
    portadaTitulo: 120,
    portadaTexto: 1000,
    articuloTitulo: 120,
    articuloTexto: 1000,
};

// ------------------------------ GET /api/contenido ------------------------------
router.get('/contenido', (req, res) => {
    // Lee los textos del disco y los devuelve tal cual.
    res.json(almacen.leerContenido());
});

// ------------------------------ PUT /api/contenido ------------------------------
// requiereAdmin va antes de la función: si no es admin, la función ni se ejecuta.
router.put('/contenido', requiereAdmin, (req, res) => {
    // Datos que mandó el navegador.
    const cuerpo = req.body || {};
    // Textos actuales; sobre esta copia se aplican los cambios.
    const contenido = almacen.leerContenido();

    // Recorre uno por uno los campos permitidos.
    for (const [campo, largoMaximo] of Object.entries(CAMPOS_EDITABLES)) {
        // Si ese campo no vino en el pedido, lo deja como estaba y sigue con el próximo.
        if (cuerpo[campo] === undefined) {
            continue;
        }
        // Tiene que ser un texto.
        if (typeof cuerpo[campo] !== 'string') {
            return res.status(400).json({ error: `El campo ${campo} debe ser un texto.` });
        }
        // Le quita los espacios del principio y del final.
        const valor = cuerpo[campo].trim();
        // No puede quedar vacío ni pasarse del largo máximo.
        if (valor.length === 0 || valor.length > largoMaximo) {
            return res.status(400).json({ error: `El campo ${campo} debe tener entre 1 y ${largoMaximo} caracteres.` });
        }
        // Pasó las validaciones: aplica el cambio.
        contenido[campo] = valor;
    }

    // Guarda en disco recién después de validar TODOS los campos,
    // para no dejar guardada una mitad si alguno estaba mal.
    almacen.guardarContenido(contenido);
    // Devuelve cómo quedaron los textos.
    res.json(contenido);
});

// Exporta el grupo de rutas para enchufarlo en server.js.
module.exports = router;
