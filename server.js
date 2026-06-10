const express    = require('express');
const bodyParser = require('body-parser');
const path       = require('path');

const rutaLogin      = require('./routes/login');
const rutaClientes   = require('./routes/clientes');
const rutaMembresias = require('./routes/membresias');
const rutaPagos      = require('./routes/pagos');

const app = express();

// ── Middlewares ──────────────────────────────────────────────
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ── Archivos estáticos (HTML, CSS, JS del frontend) ─────────
app.use(express.static(path.join(__dirname, 'public')));

// ── Ruta raíz → login ────────────────────────────────────────
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ── Rutas de la API ──────────────────────────────────────────
app.use('/api', rutaLogin);
app.use('/api', rutaClientes);
app.use('/api', rutaMembresias);
app.use('/api', rutaPagos);

// ── Arranque ─────────────────────────────────────────────────
const PUERTO = 3000;
app.listen(PUERTO, () => {
    console.log(`Servidor corriendo en http://localhost:${PUERTO}`);
});