/* ==========================================================================
   DRONER - Comportamiento de los formularios de login y registro
   --------------------------------------------------------------------------
   El sitio es estático: no hay un servidor que reciba los datos. Sin este
   archivo, al apretar "Iniciar sesión" o "Registrarme" el navegador intentaba
   enviar el formulario y simplemente recargaba la página.
   Este script frena ese envío y le avisa al usuario que la función todavía
   no está disponible.

   Se carga con el atributo "defer" desde iniciar-sesion.html y registrar.html,
   así que se ejecuta cuando el HTML ya terminó de leerse.
   ========================================================================== */

// Busca en la página todos los formularios que tengan la clase del formulario de login/registro.
// querySelectorAll devuelve una lista (puede tener 0, 1 o más elementos).
const formularios = document.querySelectorAll('.login__container--form');

// Recorre la lista y ejecuta la función una vez por cada formulario encontrado.
formularios.forEach((formulario) => {

    // Dentro de ESTE formulario, busca el párrafo reservado para mostrar mensajes.
    const mensaje = formulario.querySelector('.login__mensaje');

    // Se queda "escuchando" el evento submit, que se dispara cuando el usuario envía el formulario
    // (con el botón o con Enter) y el navegador ya validó los campos marcados como required.
    formulario.addEventListener('submit', (evento) => {

        // Cancela el comportamiento por defecto: enviar los datos y recargar la página.
        evento.preventDefault();

        // Escribe el aviso dentro del párrafo de mensajes.
        // Como ese párrafo tiene role="status", los lectores de pantalla también lo anuncian.
        mensaje.textContent = 'Esta función todavía no está disponible: el sitio aún no tiene servidor.';
    });
});
