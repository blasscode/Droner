/* ==========================================================================
   DRONER - Formularios de inicio de sesión y de registro
   --------------------------------------------------------------------------
   Se carga en iniciar-sesion.html y registrar.html. Toma lo que el usuario
   escribió, lo manda al backend y, según la respuesta, lo redirige o le
   muestra el error.

   El formulario indica cuál de los dos es con el atributo data-formulario:
       data-formulario="login"      ->  POST /api/login
       data-formulario="registro"   ->  POST /api/registro

   Necesita que js/api.js se haya cargado antes.
   ========================================================================== */

// Busca en la página el formulario marcado con data-formulario.
const formulario = document.querySelector('[data-formulario]');

// Solo sigue si la página tiene ese formulario.
if (formulario) {
    // Párrafo reservado para mostrar mensajes.
    const mensaje = formulario.querySelector('.login__mensaje');
    // Botón de envío.
    const boton = formulario.querySelector('button[type="submit"]');
    // Tipo de formulario: "login" o "registro".
    const tipo = formulario.dataset.formulario;

    // Escucha el evento submit, que se dispara cuando el usuario envía el formulario
    // (con el botón o con Enter) y el navegador ya validó los campos marcados como required.
    formulario.addEventListener('submit', async (evento) => {
        // Cancela el envío tradicional (que recargaría la página): lo hacemos nosotros con fetch.
        evento.preventDefault();

        // Datos comunes a los dos formularios. formulario.elements permite acceder a cada
        // campo por su atributo name.
        const datos = {
            correo: formulario.elements.correo.value,
            contrasena: formulario.elements.contrasena.value,
        };
        // El de registro además tiene nombre.
        if (tipo === 'registro') {
            datos.nombre = formulario.elements.nombre.value;
        }
        // El de login además tiene la casilla "Recuérdame" (checked vale true o false).
        if (tipo === 'login') {
            datos.recordarme = formulario.elements.recordarme.checked;
        }

        // Deshabilita el botón mientras se espera la respuesta, para evitar envíos dobles.
        boton.disabled = true;
        // Borra cualquier mensaje anterior.
        mensaje.textContent = '';

        // Manda los datos a la ruta que corresponde y espera la respuesta.
        const respuesta = await pedirApi('POST', tipo === 'registro' ? '/registro' : '/login', datos);

        // Si salió mal...
        if (!respuesta.ok) {
            // ...muestra el error (como el párrafo tiene role="status", los lectores de pantalla lo anuncian)...
            mensaje.textContent = respuesta.error;
            // ...vuelve a habilitar el botón para que pueda reintentar...
            boton.disabled = false;
            // ...y corta acá.
            return;
        }

        // Salió bien: la sesión ya quedó iniciada. Redirige según el rol que informó el servidor.
        const esAdmin = respuesta.datos.usuario.rol === 'admin';
        window.location.href = esAdmin ? './admin.html' : './cuenta.html';
    });
}
