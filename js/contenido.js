/* ==========================================================================
   DRONER - Textos editables
   --------------------------------------------------------------------------
   Se carga en las páginas que muestran textos que el administrador puede
   modificar desde el panel (inicio y artículo del blog).

   Cada elemento editable tiene en el HTML un atributo data-contenido con el
   nombre del texto que le corresponde, por ejemplo:
       <h1 data-contenido="portadaTitulo">Tu blog para empezar a volar</h1>
   Este script pide los textos guardados al servidor y los escribe en esos
   elementos. Si el servidor no responde, queda el texto que ya trae el HTML.

   Necesita que js/api.js se haya cargado antes.
   ========================================================================== */

// Pide los textos y los coloca en la página.
async function cargarContenidoEditable() {
    // Busca todos los elementos marcados con data-contenido.
    const elementos = document.querySelectorAll('[data-contenido]');
    // Si la página no tiene ninguno, no hace el pedido.
    if (elementos.length === 0) {
        return;
    }

    // Pide los textos al servidor.
    const respuesta = await pedirApi('GET', '/contenido');
    // Si falló, deja los textos por defecto del HTML.
    if (!respuesta.ok || !respuesta.datos) {
        return;
    }

    // Recorre cada elemento editable.
    elementos.forEach((elemento) => {
        // dataset.contenido es el valor del atributo data-contenido; con él busca el texto que le toca.
        const valor = respuesta.datos[elemento.dataset.contenido];
        // Solo lo reemplaza si el servidor mandó un texto para ese nombre.
        if (typeof valor === 'string') {
            // textContent lo escribe como texto plano. Es clave acá: aunque un administrador
            // guardara algo como "<script>", se mostraría como letras y no se ejecutaría.
            elemento.textContent = valor;
        }
    });
}

// Ejecuta la carga apenas carga el script.
cargarContenidoEditable();
