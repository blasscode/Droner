/* ==========================================================================
   DRONER - Página "Mi cuenta"
   --------------------------------------------------------------------------
   Se carga solo en cuenta.html. Pide al servidor los datos de quien tiene la
   sesión iniciada y los escribe en la página.

   Necesita que js/api.js y js/sesion.js se hayan cargado antes
   (de sesion.js usa la función cerrarSesion).
   ========================================================================== */

// Textos que se muestran para cada rol.
const NOMBRES_DE_ROL = {
    usuario: 'Usuario',
    admin: 'Administrador',
};

// Pide los datos de la cuenta y los muestra.
async function mostrarCuenta() {
    // Pregunta al servidor quién tiene la sesión iniciada.
    const respuesta = await pedirApi('GET', '/sesion');
    // Toma el usuario, o null si no hay sesión o falló el pedido.
    const usuario = respuesta.ok && respuesta.datos ? respuesta.datos.usuario : null;

    // Sin sesión no hay nada que mostrar: manda al login.
    // (El servidor ya impide abrir esta página sin sesión; esto cubre el caso de que venza mientras está abierta.)
    if (!usuario) {
        window.location.href = './iniciar-sesion.html';
        return;
    }

    // Escribe cada dato en el elemento marcado con el data-cuenta correspondiente.
    document.querySelector('[data-cuenta="nombre"]').textContent = usuario.nombre;
    document.querySelector('[data-cuenta="correo"]').textContent = usuario.correo;
    document.querySelector('[data-cuenta="rol"]').textContent = NOMBRES_DE_ROL[usuario.rol] || usuario.rol;
    // La fecha llega en formato ISO (2026-10-12T21:10:29.779Z); toLocaleDateString la pasa a día/mes/año.
    document.querySelector('[data-cuenta="creado"]').textContent = new Date(usuario.creado).toLocaleDateString('es-AR');

    // El enlace al panel arranca oculto en el HTML; se muestra solo a los administradores.
    if (usuario.rol === 'admin') {
        document.querySelector('[data-cuenta="enlace-admin"]').hidden = false;
    }
}

// Conecta el botón "Cerrar sesión" de la página con la función definida en sesion.js.
document.querySelector('[data-cuenta="salir"]').addEventListener('click', cerrarSesion);

// Ejecuta la carga apenas carga el script.
mostrarCuenta();
