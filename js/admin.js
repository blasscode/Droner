/* ==========================================================================
   DRONER - Panel de administración
   --------------------------------------------------------------------------
   Se carga solo en admin.html. Maneja las dos secciones del panel:

     1. Textos del sitio: carga los textos actuales en el formulario y guarda
        los cambios.
     2. Usuarios: muestra la tabla de cuentas y permite cambiar el rol o
        eliminar una cuenta.

   IMPORTANTE: este archivo solo arma la pantalla. Los permisos los controla
   el servidor: si alguien que no es administrador llamara a estas rutas, la
   API le respondería con un error 401 o 403.

   Necesita que js/api.js se haya cargado antes.
   ========================================================================== */

// ------------------------- Elementos de la página -------------------------

// Formulario de textos y su párrafo de mensajes.
const formularioContenido = document.querySelector('[data-admin="formulario-contenido"]');
const mensajeContenido = document.querySelector('[data-admin="mensaje-contenido"]');
// Cuerpo de la tabla de usuarios y su párrafo de mensajes.
const cuerpoTabla = document.querySelector('[data-admin="tabla-usuarios"]');
const mensajeUsuarios = document.querySelector('[data-admin="mensaje-usuarios"]');

// Id del administrador que está usando el panel (se completa al iniciar).
let idPropio = null;

// --------------------------- 1. Textos del sitio ---------------------------

// Trae los textos guardados y los pone en los campos del formulario.
async function cargarContenido() {
    // Pide los textos al servidor.
    const respuesta = await pedirApi('GET', '/contenido');
    // Si falló, muestra el error y corta.
    if (!respuesta.ok) {
        mensajeContenido.textContent = respuesta.error;
        return;
    }
    // Recorre los textos recibidos: clave es el nombre ("portadaTitulo") y valor el texto.
    for (const [clave, valor] of Object.entries(respuesta.datos)) {
        // Busca en el formulario el campo cuyo atributo name coincide con la clave.
        const campo = formularioContenido.elements[clave];
        // Si existe, le carga el valor.
        if (campo) {
            campo.value = valor;
        }
    }
}

// Al enviar el formulario, guarda los textos.
formularioContenido.addEventListener('submit', async (evento) => {
    // Evita que el navegador recargue la página.
    evento.preventDefault();

    // Arma el objeto a enviar leyendo cada campo por su name.
    const datos = {
        portadaTitulo: formularioContenido.elements.portadaTitulo.value,
        portadaTexto: formularioContenido.elements.portadaTexto.value,
        articuloTitulo: formularioContenido.elements.articuloTitulo.value,
        articuloTexto: formularioContenido.elements.articuloTexto.value,
    };

    // Avisa que está trabajando.
    mensajeContenido.textContent = 'Guardando...';
    // Manda los cambios. PUT es el verbo para "reemplazar con esto".
    const respuesta = await pedirApi('PUT', '/contenido', datos);
    // Muestra el resultado: el error que mandó el servidor o la confirmación.
    mensajeContenido.textContent = respuesta.ok ? 'Cambios guardados. Ya se ven en el sitio.' : respuesta.error;
});

// ------------------------------- 2. Usuarios -------------------------------

// Crea una celda de tabla (<td>) con un texto adentro.
function crearCelda(texto) {
    const celda = document.createElement('td');
    // textContent: el nombre y el correo los escribió un usuario, así que se insertan como
    // texto plano para que nunca se interpreten como HTML.
    celda.textContent = texto;
    return celda;
}

// Crea la fila de la tabla correspondiente a un usuario.
function crearFila(usuario) {
    // true si esta fila es la del administrador que está mirando el panel.
    const esPropio = usuario.id === idPropio;
    // Crea la fila.
    const fila = document.createElement('tr');

    // Columnas de nombre y correo. A la cuenta propia se le agrega "(vos)".
    fila.append(crearCelda(esPropio ? `${usuario.nombre} (vos)` : usuario.nombre));
    fila.append(crearCelda(usuario.correo));

    // --- Columna de rol: una lista desplegable ---
    const celdaRol = document.createElement('td');
    const selector = document.createElement('select');
    // Clases de Bootstrap para que se vea como un campo de formulario chico.
    selector.className = 'form-select form-select-sm';
    // Nombre accesible para lectores de pantalla.
    selector.setAttribute('aria-label', `Rol de ${usuario.nombre}`);
    // Agrega las dos opciones posibles.
    for (const [valor, etiqueta] of [['usuario', 'Usuario'], ['admin', 'Administrador']]) {
        // new Option(texto visible, valor que se envía).
        selector.append(new Option(etiqueta, valor));
    }
    // Deja seleccionado el rol actual.
    selector.value = usuario.rol;
    // No se puede cambiar el rol propio (el servidor tampoco lo permite).
    selector.disabled = esPropio;
    // Cuando se elige otra opción, guarda el cambio.
    selector.addEventListener('change', () => cambiarRol(usuario, selector.value));
    celdaRol.append(selector);
    fila.append(celdaRol);

    // --- Columna de acciones: botón Eliminar ---
    const celdaAcciones = document.createElement('td');
    const botonEliminar = document.createElement('button');
    botonEliminar.type = 'button';
    // Clases de Bootstrap: botón chico con borde rojo.
    botonEliminar.className = 'btn btn-sm btn-outline-danger';
    botonEliminar.textContent = 'Eliminar';
    // No se puede eliminar la cuenta propia.
    botonEliminar.disabled = esPropio;
    // Al hacer clic, elimina la cuenta (previa confirmación).
    botonEliminar.addEventListener('click', () => eliminarUsuario(usuario));
    celdaAcciones.append(botonEliminar);
    fila.append(celdaAcciones);

    // Devuelve la fila completa.
    return fila;
}

// Trae la lista de usuarios y vuelve a dibujar la tabla entera.
async function cargarUsuarios() {
    // Pide la lista.
    const respuesta = await pedirApi('GET', '/usuarios');
    // Si falló, muestra el error y corta.
    if (!respuesta.ok) {
        mensajeUsuarios.textContent = respuesta.error;
        return;
    }
    // Vacía la tabla y agrega una fila por cada usuario.
    // "..." (spread) convierte la lista de filas en argumentos separados.
    cuerpoTabla.replaceChildren(...respuesta.datos.map(crearFila));
}

// Cambia el rol de un usuario.
async function cambiarRol(usuario, rolNuevo) {
    // PATCH es el verbo para "modificar una parte". El id va en la dirección.
    const respuesta = await pedirApi('PATCH', `/usuarios/${usuario.id}`, { rol: rolNuevo });
    // Muestra el resultado.
    mensajeUsuarios.textContent = respuesta.ok ? `Se actualizó el rol de ${usuario.nombre}.` : respuesta.error;
    // Vuelve a dibujar la tabla para reflejar lo que quedó guardado
    // (si falló, la lista desplegable vuelve al valor anterior).
    await cargarUsuarios();
}

// Elimina un usuario.
async function eliminarUsuario(usuario) {
    // Eliminar no se puede deshacer: pide confirmación. confirm devuelve true si se aceptó.
    if (!window.confirm(`¿Eliminar la cuenta de ${usuario.nombre} (${usuario.correo})? Esta acción no se puede deshacer.`)) {
        // Si canceló, no hace nada.
        return;
    }
    // Manda el pedido de borrado.
    const respuesta = await pedirApi('DELETE', `/usuarios/${usuario.id}`);
    // Muestra el resultado.
    mensajeUsuarios.textContent = respuesta.ok ? `Se eliminó la cuenta de ${usuario.nombre}.` : respuesta.error;
    // Vuelve a dibujar la tabla.
    await cargarUsuarios();
}

// --------------------------------- Inicio ---------------------------------

// Prepara el panel cuando carga la página.
async function iniciarPanel() {
    // Averigua quién está usando el panel.
    const respuesta = await pedirApi('GET', '/sesion');
    const usuario = respuesta.ok && respuesta.datos ? respuesta.datos.usuario : null;

    // Si no hay sesión o no es admin, lo saca del panel.
    // (El servidor ya impide abrir esta página; esto cubre el caso de que la sesión venza mientras está abierta.)
    if (!usuario || usuario.rol !== 'admin') {
        window.location.href = './iniciar-sesion.html';
        return;
    }

    // Guarda el id propio para marcar la fila "(vos)" y bloquear sus controles.
    idPropio = usuario.id;
    // Carga las dos secciones al mismo tiempo y espera a que terminen las dos.
    await Promise.all([cargarContenido(), cargarUsuarios()]);
}

// Ejecuta la preparación apenas carga el script.
iniciarPanel();
