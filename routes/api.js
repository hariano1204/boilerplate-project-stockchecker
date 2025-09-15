'use strict';

const axios = require('axios');
const mongoose = require('mongoose');

// Esquema de acciones
const stockSchema = new mongoose.Schema({
  symbol: { type: String, required: true, uppercase: true, unique: true },
  ips: { type: [String], default: [] }
});
const Stock = mongoose.model('Stock', stockSchema);

// Función para obtener precio desde el proxy FCC
async function getStockPrice(symbol) {
  const url = `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol}/quote`;
  const res = await axios.get(url);
  return { symbol: res.data.symbol, price: Number(res.data.latestPrice) };
}

// Normalizar IP para evitar duplicados
function getClientIp(req) {
  let ip =
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip;
  if (!ip) return 'unknown';
  return ip.replace('::ffff:', '').trim();
}

module.exports = function (app) {
  app.get('/api/stock-prices', async function (req, res) {
    try {
      let { stock, like } = req.query;
      const ip = getClientIp(req);
      const likeFlag = like === 'true' || like === '1';

      if (!stock) return res.status(400).json({ error: 'Stock requerido' });

      // Caso: dos acciones
      if (Array.isArray(stock)) {
        stock = stock.map(s => s.toUpperCase()).slice(0, 2);
        const prices = await Promise.all(stock.map(s => getStockPrice(s)));

        const docs = await Promise.all(
          prices.map(async p => {
            let d = await Stock.findOne({ symbol: p.symbol });
            if (!d) d = new Stock({ symbol: p.symbol });
            if (likeFlag && ip !== 'unknown' && !d.ips.includes(ip)) {
              d.ips.push(ip);
              await d.save();
            }
            return { symbol: p.symbol, price: p.price, likes: d.ips.length };
          })
        );

        const relLikes = [
          {
            stock: docs[0].symbol,
            price: docs[0].price,
            rel_likes: docs[0].likes - docs[1].likes
          },
          {
            stock: docs[1].symbol,
            price: docs[1].price,
            rel_likes: docs[1].likes - docs[0].likes
          }
        ];

        return res.json({ stockData: relLikes });
      }

      // Caso: una sola acción
      stock = stock.toUpperCase();
      const { symbol, price } = await getStockPrice(stock);

      let doc = await Stock.findOne({ symbol });
      if (!doc) doc = new Stock({ symbol });
      if (likeFlag && ip !== 'unknown' && !doc.ips.includes(ip)) {
        doc.ips.push(ip);
        await doc.save();
      }

      return res.json({
        stockData: { stock: symbol, price, likes: doc.ips.length }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  });
};
