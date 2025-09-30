'use strict';

const express = require('express');
const helmet = require('helmet');
const path = require('path');
const cors = require('cors');

const apiRoutes = require('./routes/api.js'); // Aquí conectas tus endpoints reales

const app = express();

// CORS habilitado para que FCC pueda hacer las pruebas
app.use(cors({ origin: '*' }));

// Helmet CSP (seguridad mínima requerida por FCC)
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"]
      }
    }
  })
);


// Deshabilitar X-Powered-By
app.disable('x-powered-by');

// Archivos estáticos
app.use('/public', express.static(path.join(process.cwd(), 'public')));

// Ruta raíz (sirve el index.html de la carpeta views)
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

module.exports = app; // Necesario para los tests
