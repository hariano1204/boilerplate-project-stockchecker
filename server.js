'use strict';

const express = require('express');
const helmet = require('helmet');
const path = require('path');
const cors = require('cors');

const apiRoutes = require('./routes/api.js');

const app = express();

// CORS (necesario para FCC tests)
app.use(cors({ origin: '*' }));

// ✅ Forzar CSP exacta para FreeCodeCamp
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self'"
  );
  next();
});

// Helmet (solo otras protecciones, sin CSP)
app.use(helmet({ contentSecurityPolicy: false }));

// Deshabilitar X-Powered-By
app.disable('x-powered-by');

// Archivos estáticos
app.use('/public', express.static(path.join(process.cwd(), 'public')));

// Ruta raíz (sirve index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'views', 'index.html'));
});

// Rutas API
app.use('/api', apiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).type('text').send('Not Found');
});

// Arranque del servidor
const port = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`🚀 Servidor escuchando en puerto ${port}`);
  });
}

module.exports = app; // necesario para que funcionen los tests

