export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { symbol = 'NIFTY', range = '1d' } = req.query;
  const cleanSym = (symbol || '').trim().toUpperCase();

  let validRange = '1d';
  let validInterval = '5m';
  const r = (range || '1d').toLowerCase();
  if (r === '1d') { validRange = '1d'; validInterval = '5m'; }
  else if (r === '5d') { validRange = '5d'; validInterval = '15m'; }
  else if (r === '1m' || r === '1mo') { validRange = '1mo'; validInterval = '1d'; }
  else if (r === '6m' || r === '6mo') { validRange = '6mo'; validInterval = '1d'; }
  else if (r === 'ytd') { validRange = 'ytd'; validInterval = '1d'; }
  else if (r === '1y') { validRange = '1y'; validInterval = '1d'; }
  else if (r === 'max') { validRange = 'max'; validInterval = '1wk'; }

  let ticker = ${cleanSym}.NS;
  if (cleanSym === 'NIFTY' || cleanSym === 'NIFTY 50' || cleanSym === '^NSEI') ticker = '^NSEI';
  else if (cleanSym === 'BANK NIFTY' || cleanSym === '^NSEBANK') ticker = '^NSEBANK';
  else if (cleanSym === 'SENSEX' || cleanSym === '^BSESN') ticker = '^BSESN';
  else if (cleanSym.startsWith('^')) ticker = cleanSym;

  const url = https://query1.finance.yahoo.com/v8/finance/chart/?interval=&range=;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(Yahoo returned );
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error('No chart data found');

    const meta = result.meta || {};
    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const opens = quotes.open || [];
    const highs = quotes.high || [];
    const lows = quotes.low || [];
    const closes = quotes.close || [];
    const volumes = quotes.volume || [];

    const candles = [];
    for (let i = 0; i < timestamps.length; i++) {
      const o = opens[i];
      const h = highs[i];
      const l = lows[i];
      const c = closes[i];
      if (o !== null && h !== null && l !== null && c !== null && !isNaN(o) && !isNaN(c)) {
        candles.push({
          timestamp: timestamps[i],
          open: Math.round(o * 100) / 100,
          high: Math.round(h * 100) / 100,
          low: Math.round(l * 100) / 100,
          close: Math.round(c * 100) / 100,
          volume: volumes[i] || 0
        });
      }
    }

    const price = meta.regularMarketPrice || (candles.length > 0 ? candles[candles.length - 1].close : 0);
    const prevClose = meta.chartPreviousClose || price;
    const change = Math.round((price - prevClose) * 100) / 100;
    const changePct = prevClose ? Math.round(((price - prevClose) / prevClose) * 10000) / 100 : 0;

    return res.status(200).json({
      status: 'success',
      symbol: cleanSym,
      ticker: ticker,
      price: price,
      prev_close: prevClose,
      change: change,
      change_pct: changePct,
      candles: candles,
      last_updated: new Date().toISOString()
    });
  } catch (err) {
    return res.status(200).json({
      status: 'fallback',
      symbol: cleanSym,
      message: err.message,
      candles: []
    });
  }
}