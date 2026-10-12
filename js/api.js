/* ==========================================================================
   DRONER - Comunicación con el backend
   --------------------------------------------------------------------------
   Define UNA función, pedirApi, que usan todos los demás scripts para hablar
   con el servidor. Tenerla en un solo lugar evita repetir en cada archivo
   cómo se arma un pedido y cómo se interpretan los errores.

   Tiene que cargarse ANTES que los scripts que la usan (por eso en los HTML
   es siempre la primera etiqueta <script>).
   ========================================================================== */

// Hace un pedido a la API y devuelve siempre un objeto con la misma forma:
//   ok      true si el servidor respondió que salió bien
//   estado  código HTTP de la respuesta (200, 401, 404...), o 0 si no hubo respuesta
//   datos   lo que devolvió el servidor ya convertido a objeto, o null
//   error   mensaje listo para mostrarle al usuario, o null si salió bien
// "async" permite usar await adentro: esperar una respuesta sin congelar la página.
async function pedirApi(metodo, ruta, datos) {
    // Opciones del pedido.
    const opciones = {
        // Verbo HTTP: GET (leer), POST (crear), PUT/PATCH (modificar), DELETE (borrar).
        method: metodo,
        // Cabeceras (información extra sobre el pedido); se completan abajo si hace falta.
        headers: {},
        // Manda la cookie de sesión solo a nuestro propio servidor.
        credentials: 'same-origin',
    };

    // Si hay datos para enviar...
    if (datos !== undefined) {
        // ...avisa que el cuerpo del pedido va en formato JSON...
        opciones.headers['Content-Type'] = 'application/json';
        // ...y convierte el objeto de JavaScript en texto JSON.
        opciones.body = JSON.stringify(datos);
    }

    // Variable donde se va a guardar la respuesta.
    let respuesta;
    try {
        // fetch hace el pedido; await espera a que llegue la respuesta.
        respuesta = await fetch(`/api${ruta}`, opciones);
    } catch {
        // fetch solo falla si NO hubo respuesta (servidor apagado, sin conexión...).
        return { ok: false, estado: 0, datos: null, error: 'No se pudo conectar con el servidor.' };
    }

    // Variable para el cuerpo de la respuesta.
    let cuerpo = null;
    try {
        // Intenta leerlo como JSON.
        cuerpo = await respuesta.json();
    } catch {
        // No era JSON: pasa con las respuestas vacías (204) o si el sitio se abrió sin el backend.
        cuerpo = null;
    }

    // Si salió bien, devuelve los datos sin error.
    if (respuesta.ok) {
        return { ok: true, estado: respuesta.status, datos: cuerpo, error: null };
    }

    // Si salió mal, usa el mensaje que mandó el servidor; si no mandó ninguno, uno genérico.
    const mensaje = cuerpo && cuerpo.error ? cuerpo.error : 'No se pudo conectar con el servidor.';
    return { ok: false, estado: respuesta.status, datos: cuerpo, error: mensaje };
}
