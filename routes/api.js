'use strict';

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const router = express.Router();
const db = new Map(); // memoria

function anonIp(ip) {
  if (!ip) return 'unknown';
  const ipv4 = ip.match(/\d+\.\d+\.\d+\.\d+/)?.[0];
  const masked = ipv4 ? ipv4.split('.').slice(0, 3).concat('0').join('.') : ip;
  return crypto.createHash('sha256').update(masked).digest('hex');
}

async function getStockData(symbol) {
  const url = `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol}/quote`;
  const res = await axios.get(url);
  return { stock: res.data.symbol, price: Number(res.data.latestPrice) };
}

function likeStock(symbol, ipHash) {
  const key = symbol.toUpperCase();
  if (!db.has(key)) db.set(key, { likes: 0, ips: new Set() });
  const record = db.get(key);
  if (!record.ips.has(ipHash)) {
    record.ips.add(ipHash);
    record.likes++;
  }
  return record.likes;
}

function getLikes(symbol) {
  const record = db.get(symbol.toUpperCase());
  return record ? record.likes : 0;
}

router.get('/stock-prices', async (req, res) => {
  try {
    let { stock, like } = req.query;
    const likeFlag = String(like || '').toLowerCase() === 'true';
    const ipHash = likeFlag ? anonIp(req.ip || req.headers['x-forwarded-for']) : null;

    if (!stock) return res.json({ stockData: { error: 'missing stock' } });

    if (Array.isArray(stock) && stock.length === 2) {
      const [s1, s2] = stock.map(s => s.toUpperCase());
      const [d1, d2] = await Promise.all([getStockData(s1), getStockData(s2)]);
      if (likeFlag) {
        likeStock(s1, ipHash);
        likeStock(s2, ipHash);
      }
      const l1 = getLikes(s1);
      const l2 = getLikes(s2);
      return res.json({
        stockData: [
          { stock: d1.stock, price: d1.price, rel_likes: l1 - l2 },
          { stock: d2.stock, price: d2.price, rel_likes: l2 - l1 }
        ]
      });
    }

    const symbol = String(stock).toUpperCase();
    const data = await getStockData(symbol);
    if (likeFlag) likeStock(symbol, ipHash);
    const likes = getLikes(symbol);

    return res.json({ stockData: { stock: data.stock, price: data.price, likes } });
  } catch (err) {
    console.error('❌ Error en API:', err.message);
    return res.json({ stockData: { error: 'external source error' } });
  }
});

module.exports = router;
