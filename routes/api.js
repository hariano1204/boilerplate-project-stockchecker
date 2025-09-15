'use strict';

const axios = require('axios');
const mongoose = require('mongoose');

// Esquema de acciones
const stockSchema = new mongoose.Schema({
  symbol: { type: String, required: true, uppercase: true, unique: true },
  ips: { type: [String], default: [] }
});
const Stock = mongoose.model('Stock', stockSchema);

// Obtener precio desde el proxy FCC
async function getStockPrice(symbol) {
  const url = `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol}/quote`;
  const res = await axios.get(url);
  return { symbol: res.data.symbol, price: Number(res.data.latestPrice) };
}

// Normalizar IP
function normalizeIp(req) {
  let ip =
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.ip ||
    req.socket?.remoteAddress;

  if (!ip) return 'unknown';
  if (ip.includes('::ffff:')) ip = ip.split('::ffff:')[1];
  if (ip === '::1') ip = '127.0.0.1';

  return ip.trim();
}

module.exports = function (app) {
  // Asegura que Express confíe en el proxy
  app.set('trust proxy', true);

  app.get('/api/stock-prices', async function (req, res) {
    try {
      let { stock, like } = req.query;

      const ip = normalizeIp(req);
      const likeFlag = like === 'true' || like === '1';

      if (!stock) return res.status(400).json({ error: 'Stock requerido' });

      // Caso: dos acciones
      if (Array.isArray(stock)) {
        const symbols = stock.map(s => s.toUpperCase()).slice(0, 2);
        const prices = await Promise.all(symbols.map(s => getStockPrice(s)));

        const docs = await Promise.all(
          symbols.map(async s => {
            let d = await Stock.findOne({ symbol: s });
            if (!d) d = new Stock({ symbol: s, ips: [] });
            if (likeFlag && ip !== 'unknown' && !d.ips.includes(ip)) {
              d.ips.push(ip);
              await d.save();
            }
            return { symbol: s, likes: d.ips.length || 0 };
          })
        );

        const stockData = symbols.map((s, i) => {
          const price = prices[i].price;
          const likesA = docs[0].likes;
          const likesB = docs[1].likes;
          const rel_likes =
            docs[i].symbol === docs[0].symbol
              ? likesA - likesB
              : likesB - likesA;

          return { stock: s, price, rel_likes };
        });

        return res.json({ stockData });
      }

      // Caso: una sola acción
      const symbol = stock.toUpperCase();
      const { price } = await getStockPrice(symbol);

      let doc = await Stock.findOne({ symbol });
      if (!doc) doc = new Stock({ symbol, ips: [] });
      if (likeFlag && ip !== 'unknown' && !doc.ips.includes(ip)) {
        doc.ips.push(ip);
        await doc.save();
      }

      return res.json({
        stockData: {
          stock: symbol,
          price,
          likes: doc.ips.length || 0
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  });
};
