'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

const fccTestingRoutes = require('./routes/fcctesting.js');
const apiRoutes = require('./routes/api.js');
const runner = require('./test-runner');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Helmet CSP (prueba #2)
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
    },
  })
);

// Servir archivos estáticos y vista inicial
app.use('/public', express.static(process.cwd() + '/public'));
app.route('/').get((req, res) => {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Rutas FCC
fccTestingRoutes(app);

// Rutas API
apiRoutes(app);

// 404 handler
app.use((req, res) => res.status(404).type('text').send('Not Found'));

// Conectar a MongoDB
const MONGODB_URI = process.env.DB;
mongoose
  .connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB conectado'))
  .catch((err) => console.error('❌ Error MongoDB:', err.message));

// Servidor
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Servidor escuchando en puerto ${port}`);
  if (process.env.NODE_ENV === 'test') {
    console.log('Running Tests...');
    setTimeout(() => {
      try {
        runner.run();
      } catch (e) {
        console.error('Tests invalidos:', e);
      }
    }, 3500);
  }
});

module.exports = app;
