'use strict';

const { Pool } = require('pg');
const axios = require('axios');
const helmet = require('helmet');
const crypto = require('crypto');
require('dotenv').config();

// Conexión a PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Crear tabla si no existe
async function createTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stocks (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(10) UNIQUE NOT NULL,
        ips JSONB DEFAULT '[]'::jsonb
      )
    `);
    console.log('✅ PostgreSQL conectado y tabla creada');
  } catch (err) {
    console.error('❌ Error de PostgreSQL:', err.message);
  }
}

createTable();

// Función para obtener precio
async function getStockPrice(symbol) {
  const url = `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol}/quote`;
  const res = await axios.get(url);
  return { symbol: res.data.symbol, price: Number(res.data.latestPrice) };
}

// Función para anonimizar IP
function hashIP(ip) {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

module.exports = function (app) {

  // Helmet CSP requerido por FreeCodeCamp
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
        },
      },
    })
  );

  // Ruta raíz
  app.get("/", (req, res) => {
    res.send("Stock Price Checker API activo 🚀");
  });

  // Endpoint principal
  app.get('/api/stock-prices', async (req, res) => {
    try {
      let { stock, like } = req.query;
      const rawIp = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
      const ip = hashIP(rawIp); // ✅ Anonimizar IP
      const likeFlag = (like === 'true' || like === '1');

      if (!stock) return res.status(400).json({ error: 'Stock requerido' });

      if (Array.isArray(stock)) {
        stock = stock.map(s => s.toUpperCase()).slice(0, 2);
        const prices = await Promise.all(stock.map(s => getStockPrice(s)));

        const docs = await Promise.all(prices.map(async p => {
          // Buscar o crear registro
          let result = await pool.query('SELECT * FROM stocks WHERE symbol = $1', [p.symbol]);
          let stockData;
          
          if (result.rows.length === 0) {
            // Crear nuevo registro
            const insertResult = await pool.query(
              'INSERT INTO stocks (symbol, ips) VALUES ($1, $2) RETURNING *',
              [p.symbol, JSON.stringify([])]
            );
            stockData = insertResult.rows[0];
          } else {
            stockData = result.rows[0];
          }
          
          // Manejar likes
          let ips = stockData.ips || [];
          if (likeFlag && ip && !ips.includes(ip)) {
            ips.push(ip);
            await pool.query('UPDATE stocks SET ips = $1::jsonb WHERE symbol = $2', [JSON.stringify(ips), p.symbol]);
          }
          
          return { symbol: p.symbol, price: p.price, likes: ips.length };
        }));

        const relLikes = [
          { stock: docs[0].symbol, price: docs[0].price, rel_likes: docs[0].likes - docs[1].likes },
          { stock: docs[1].symbol, price: docs[1].price, rel_likes: docs[1].likes - docs[0].likes }
        ];

        return res.json({ stockData: relLikes });
      } else {
        stock = stock.toUpperCase();
        const { symbol, price } = await getStockPrice(stock);

        // Buscar o crear registro
        let result = await pool.query('SELECT * FROM stocks WHERE symbol = $1', [symbol]);
        let stockData;
        
        if (result.rows.length === 0) {
          // Crear nuevo registro
          const insertResult = await pool.query(
            'INSERT INTO stocks (symbol, ips) VALUES ($1, $2) RETURNING *',
            [symbol, JSON.stringify([])]
          );
          stockData = insertResult.rows[0];
        } else {
          stockData = result.rows[0];
        }
        
        // Manejar likes
        let ips = stockData.ips || [];
        if (likeFlag && ip && !ips.includes(ip)) {
          ips.push(ip);
          await pool.query('UPDATE stocks SET ips = $1::jsonb WHERE symbol = $2', [JSON.stringify(ips), symbol]);
        }

        return res.json({ stockData: { stock: symbol, price, likes: ips.length } });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  });

};