/* ==========================================================================
   DRONER - Servidor
   --------------------------------------------------------------------------
   Punto de entrada del backend. Se ejecuta con:  npm start

   Hace dos trabajos:
     1. Sirve el sitio (los HTML, CSS, JS e imágenes de la carpeta raíz).
     2. Atiende la API: todas las direcciones que empiezan con /api.

   El orden de las líneas IMPORTA: Express recorre lo que se registra con
   app.use / app.get de arriba hacia abajo y usa lo primero que coincida.
   ========================================================================== */

// Express: el framework que maneja los pedidos HTTP.
const express = require('express');
// Paquete que agrega manejo de sesiones (cookie + datos guardados en el servidor).
const session = require('express-session');
// Módulo de Node para armar rutas de carpetas.
const path = require('node:path');
// Módulo de criptografía de Node; acá se usa para generar el secreto de las sesiones.
const crypto = require('node:crypto');

// Acceso a los datos guardados.
const almacen = require('./servicios/almacen');
// Middlewares de permisos.
const { cargarUsuario, paginaRequiereSesion, paginaRequiereAdmin } = require('./middlewares/permisos');
// Grupos de rutas de la API.
const rutasAuth = require('./rutas/auth');
const rutasContenido = require('./rutas/contenido');
const rutasUsuarios = require('./rutas/usuarios');

// ------------------------------ Configuración ------------------------------

// Carpeta raíz del proyecto (un nivel arriba de backend/), donde están las páginas.
const RAIZ = path.join(__dirname, '..');
// Puerto donde escucha el servidor. Se puede cambiar con la variable de entorno PUERTO.
const PUERTO = process.env.PUERTO || 3000;
// Dirección donde escucha. 127.0.0.1 significa "solo esta computadora": nadie más en la
// red puede entrar. Es lo adecuado para un servidor de práctica.
const DIRECCION = process.env.DIRECCION || '127.0.0.1';
// Secreto con el que se firman las cookies de sesión para que no se puedan falsificar.
// Si no se define SESION_SECRETO se genera uno al azar en cada arranque (por eso, al
// reiniciar el servidor, todas las sesiones abiertas se cierran).
const SESION_SECRETO = process.env.SESION_SECRETO || crypto.randomBytes(32).toString('hex');

// Carpetas del sitio que el navegador puede pedir libremente.
const CARPETAS_PUBLICAS = ['css', 'js', 'assets', 'vendor'];
// Páginas que puede ver cualquier visitante.
const PAGINAS_PUBLICAS = ['index.html', 'mini2.html', 'iniciar-sesion.html', 'registrar.html'];

// Crea los archivos de datos a partir de la semilla si es la primera vez que se arranca.
almacen.inicializar();

// Crea la aplicación de Express.
const app = express();
// Quita la cabecera "X-Powered-By: Express" de las respuestas: no hace falta anunciar qué tecnología se usa.
app.disable('x-powered-by');

// ------------------------- Middlewares generales -------------------------

// Convierte el cuerpo de los pedidos JSON en un objeto disponible en req.body.
// El límite de 10kb rechaza pedidos demasiado grandes.
app.use(express.json({ limit: '10kb' }));

// Activa las sesiones.
app.use(session({
    // Nombre de la cookie que se guarda en el navegador.
    name: 'droner.sid',
    // Secreto para firmarla.
    secret: SESION_SECRETO,
    // No vuelve a guardar la sesión si no cambió nada.
    resave: false,
    // No crea sesiones (ni cookies) para visitantes que no iniciaron sesión.
    saveUninitialized: false,
    cookie: {
        // httpOnly: el JavaScript de la página NO puede leer la cookie. Si alguien lograra
        // inyectar un script en el sitio, no podría robar la sesión.
        httpOnly: true,
        // sameSite "lax": el navegador no manda la cookie en pedidos POST que vengan de
        // OTROS sitios. Evita que una página ajena haga acciones con la sesión del usuario.
        sameSite: 'lax',
        // secure: true exigiría HTTPS. En la computadora local se usa HTTP, por eso va en false.
        // En un sitio publicado tiene que ir en true.
        secure: false,
    },
}));

// En cada pedido, completa req.usuario con quien tenga la sesión iniciada (o null).
app.use(cargarUsuario);

// ---------------------------------- API ----------------------------------

// Enchufa los tres grupos de rutas bajo el prefijo /api.
app.use('/api', rutasAuth);
app.use('/api', rutasContenido);
app.use('/api', rutasUsuarios);

// Cualquier otra dirección que empiece con /api no existe: responde 404 en formato JSON.
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Esa ruta de la API no existe.' });
});

// ------------------------------ Sitio estático ------------------------------

// Publica SOLO las carpetas de la lista. No se publica la raíz entera a propósito:
// así es imposible pedir desde el navegador archivos como backend/datos/usuarios.json.
for (const carpeta of CARPETAS_PUBLICAS) {
    // express.static devuelve el archivo pedido si existe dentro de esa carpeta.
    app.use(`/${carpeta}`, express.static(path.join(RAIZ, carpeta)));
}

// La dirección "/" (sin nombre de archivo) muestra la página de inicio.
app.get('/', (req, res) => {
    res.sendFile(path.join(RAIZ, 'index.html'));
});

// Registra una ruta por cada página pública.
for (const pagina of PAGINAS_PUBLICAS) {
    app.get(`/${pagina}`, (req, res) => {
        res.sendFile(path.join(RAIZ, pagina));
    });
}

// "Mi cuenta": solo con sesión iniciada. Sin sesión, el middleware redirige al login.
app.get('/cuenta.html', paginaRequiereSesion, (req, res) => {
    res.sendFile(path.join(RAIZ, 'cuenta.html'));
});

// Panel de administración: solo para administradores.
app.get('/admin.html', paginaRequiereAdmin, (req, res) => {
    res.sendFile(path.join(RAIZ, 'admin.html'));
});

// ------------------------------- Errores -------------------------------

// Si ningún paso anterior respondió, la página no existe.
app.use((req, res) => {
    res.status(404).send('Página no encontrada.');
});

// Manejador general de errores. Express lo reconoce porque recibe CUATRO parámetros.
// Acá llega cualquier error que ocurra en las rutas.
app.use((error, req, res, next) => {
    // Caso particular: el navegador mandó un JSON mal escrito.
    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'El pedido no es un JSON válido.' });
    }
    // Caso particular: el pedido superó el límite de tamaño.
    if (error.type === 'entity.too.large') {
        return res.status(413).json({ error: 'El pedido es demasiado grande.' });
    }
    // Cualquier otro error: se anota el detalle en la consola del servidor...
    console.error(error);
    // ...y al navegador se le manda un mensaje genérico, sin detalles internos.
    res.status(500).json({ error: 'Ocurrió un error en el servidor.' });
});

// ------------------------------- Arranque -------------------------------

// Pone al servidor a escuchar pedidos.
app.listen(PUERTO, DIRECCION, () => {
    // Mensaje que se ve en la terminal cuando ya está listo.
    console.log(`Droner funcionando en http://localhost:${PUERTO}`);
});
