'use strict';

const axios = require('axios');
const mongoose = require('mongoose');

// Modelo para stocks
const stockSchema = new mongoose.Schema({
  symbol: { type: String, required: true, uppercase: true, unique: true },
  ips: { type: [String], default: [] }
});
const Stock = mongoose.model('Stock', stockSchema);

// Función para obtener precio desde FCC proxy
async function getStockPrice(symbol) {
  const url = `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol}/quote`;
  const res = await axios.get(url);
  return { symbol: res.data.symbol, price: Number(res.data.latestPrice) };
}

module.exports = function (app) {

  app.get('/api/stock-prices', async (req, res) => {
    try {
      let { stock, like } = req.query;
      const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
      const likeFlag = (like === 'true' || like === '1');

      if (!stock) return res.status(400).json({ error: 'Stock requerido' });

      // Caso: múltiples acciones
      if (Array.isArray(stock)) {
        stock = stock.map(s => s.toUpperCase()).slice(0, 2);

        const prices = await Promise.all(stock.map(s => getStockPrice(s)));

        const docs = await Promise.all(prices.map(async p => {
          let d = await Stock.findOne({ symbol: p.symbol });
          if (!d) d = new Stock({ symbol: p.symbol });
          if (likeFlag && ip && !d.ips.includes(ip)) {
            d.ips.push(ip);
            await d.save();
          }
          return { stock: p.symbol, price: p.price, likes: d.ips.length };
        }));

        const relLikes = [
          { stock: docs[0].stock, price: docs[0].price, rel_likes: docs[0].likes - docs[1].likes },
          { stock: docs[1].stock, price: docs[1].price, rel_likes: docs[1].likes - docs[0].likes }
        ];

        return res.json({ stockData: relLikes });
      }

      // Caso: acción única
      stock = stock.toUpperCase();
      const { symbol, price } = await getStockPrice(stock);

      let doc = await Stock.findOne({ symbol });
      if (!doc) doc = new Stock({ symbol });
      if (likeFlag && ip && !doc.ips.includes(ip)) {
        doc.ips.push(ip);
        await doc.save();
      }

      return res.json({
        stockData: { stock: symbol, price, likes: doc.ips.length }
      });

    } catch (err) {
      console.error(err.message);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  });
};
