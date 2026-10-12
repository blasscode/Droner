/* ==========================================================================
   DRONER - Sesión en el menú
   --------------------------------------------------------------------------
   Se carga en todas las páginas. Le pregunta al servidor si hay una sesión
   iniciada y, si la hay, cambia la opción "Ingresar" del menú por el nombre
   del usuario con las opciones "Mi cuenta", "Panel de administración" (solo
   para administradores) y "Cerrar sesión".

   Si no hay sesión, o si el sitio se abrió sin el backend, no toca nada y el
   menú queda como está escrito en el HTML.

   Necesita que js/api.js se haya cargado antes.
   ========================================================================== */

// Cierra la sesión en el servidor y vuelve a la página de inicio.
// La usan el menú (este archivo) y el botón de la página "Mi cuenta".
async function cerrarSesion() {
    // Le pide al servidor que borre la sesión.
    await pedirApi('POST', '/logout');
    // Redirige al inicio (se haya podido cerrar o no, para no dejar al usuario trabado).
    window.location.href = './index.html';
}

// Crea un <li> con un enlace adentro, con el mismo aspecto que los del menú.
function crearOpcionDeMenu(textoVisible, destino) {
    // Crea los dos elementos.
    const item = document.createElement('li');
    const enlace = document.createElement('a');
    // Clase que le da el estilo de enlace de menú.
    enlace.className = 'menu__link';
    // Página a la que lleva.
    enlace.href = destino;
    // textContent escribe texto plano: aunque el texto tuviera etiquetas HTML, no se ejecutarían.
    enlace.textContent = textoVisible;
    // Si el enlace apunta a la página en la que ya estamos, lo marca como página actual.
    if (window.location.pathname.endsWith(destino.replace('./', '/'))) {
        enlace.setAttribute('aria-current', 'page');
    }
    // Mete el enlace dentro del <li> y lo devuelve.
    item.append(enlace);
    return item;
}

// Consulta la sesión y actualiza el menú.
async function actualizarMenuSegunSesion() {
    // Busca el ítem del menú marcado con data-menu-sesion.
    const item = document.querySelector('[data-menu-sesion]');
    // Si la página no tiene ese ítem, no hay nada que hacer.
    if (!item) {
        return;
    }

    // Pregunta al servidor quién tiene la sesión iniciada.
    const respuesta = await pedirApi('GET', '/sesion');
    // Si el pedido salió bien toma el usuario; en cualquier otro caso, null.
    const usuario = respuesta.ok && respuesta.datos ? respuesta.datos.usuario : null;
    // Sin usuario, el menú queda con "Ingresar".
    if (!usuario) {
        return;
    }

    // Busca dentro del ítem el texto del botón y la lista del submenú.
    const textoDelBoton = item.querySelector('[data-menu-sesion-texto]');
    const submenu = item.querySelector('.submenu');

    // Toma solo la primera palabra del nombre y, como mucho, 15 letras, para que entre en el menú.
    const nombreCorto = usuario.nombre.split(' ')[0].slice(0, 15);
    // Reemplaza "Ingresar" por el saludo.
    textoDelBoton.textContent = `Hola, ${nombreCorto}`;

    // Vacía el submenú (saca "Ya tengo cuenta" y "Soy nuevo").
    submenu.replaceChildren();
    // Agrega el enlace a la cuenta.
    submenu.append(crearOpcionDeMenu('Mi cuenta', './cuenta.html'));
    // Solo si es administrador, agrega el enlace al panel.
    // Esto es una comodidad visual: quien protege de verdad el panel es el servidor.
    if (usuario.rol === 'admin') {
        submenu.append(crearOpcionDeMenu('Panel de administración', './admin.html'));
    }

    // Arma la opción "Cerrar sesión". Es un <button> porque ejecuta una acción, no lleva a una página.
    const itemSalir = document.createElement('li');
    const botonSalir = document.createElement('button');
    botonSalir.type = 'button';
    botonSalir.className = 'menu__link';
    botonSalir.textContent = 'Cerrar sesión';
    // Al hacer clic, cierra la sesión.
    botonSalir.addEventListener('click', cerrarSesion);
    // Lo agrega al final del submenú.
    itemSalir.append(botonSalir);
    submenu.append(itemSalir);
}

// Ejecuta la actualización apenas carga el script.
actualizarMenuSegunSesion();
