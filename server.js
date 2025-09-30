'use strict';

const express = require('express');
const helmet = require('helmet');
const path = require('path');
const cors = require('cors');

const apiRoutes = require('./routes/api.js'); // importa tu router

const app = express();

// ✅ CORS para que FCC pueda testear
app.use(cors({ origin: '*' }));

// ✅ Forzar CSP exacta para FCC
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self'"
  );
  next();
});

// Helmet (otras protecciones, sin CSP porque ya la forzamos arriba)
app.use(helmet({ contentSecurityPolicy: false }));

// Deshabilitar header X-Powered-By
app.disable('x-powered-by');

// Archivos estáticos
app.use('/public', express.static(path.join(process.cwd(), 'public')));

// Ruta raíz (sirve el index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'views', 'index.html'));
});

// ✅ Rutas API
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

module.exports = app; // necesario para FCC tests
