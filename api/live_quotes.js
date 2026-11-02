const TICKER_OVERRIDES = {
  'TATAMOTORS': 'TMPV.NS',
  'LTIM': 'LTM.NS',
  'ZOMATO': 'ETERNAL.NS',
  'ICICIPRU': 'ICICIPRULI.NS',
  'M&M': 'M%26M.NS',
  'BAJAJ-AUTO': 'BAJAJ-AUTO.NS',
  'NIFTY': '^NSEI',
  'NIFTY 50': '^NSEI',
  'BANK NIFTY': '^NSEBANK',
  'SENSEX': '^BSESN',
  'NIFTY IT': '^CNXIT',
  'INDIA VIX': '^INDIAVIX'
};

function resolveTicker(sym) {
  const clean = (sym || '').trim().toUpperCase();
  if (TICKER_OVERRIDES[clean]) return TICKER_OVERRIDES[clean];
  if (clean.startsWith('^')) return clean;
  if (clean.endsWith('.NS') || clean.endsWith('.BO')) return clean;
  return `${clean}.NS`;
}

async function fetchQuote(symbol) {
  const ticker = resolveTicker(symbol);
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=5m&range=1d`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta || {};
    const price = meta.regularMarketPrice || 0;
    const prevClose = meta.chartPreviousClose || price;
    const change = Math.round((price - prevClose) * 100) / 100;
    const changePct = prevClose ? Math.round(((price - prevClose) / prevClose) * 10000) / 100 : 0;
    const high = meta.regularMarketDayHigh || price;
    const low = meta.regularMarketDayLow || price;
    const open = meta.regularMarketOpen || price;
    const volume = meta.regularMarketVolume || 0;

    return {
      symbol: symbol.toUpperCase(),
      ticker: ticker,
      price: price,
      prev_close: prevClose,
      change: change,
      change_pct: changePct,
      day_high: high,
      day_low: low,
      day_open: open,
      volume: volume,
      is_positive: change >= 0
    };
  } catch (e) {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { symbols = '' } = req.query;
  const symList = symbols.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

  if (symList.length === 0) {
    return res.status(200).json({ status: 'success', quotes: {} });
  }

  // Cap to 25 symbols per request to ensure sub-second response time
  const limitedSymbols = symList.slice(0, 25);
  const results = {};

  try {
    const promises = limitedSymbols.map(sym => fetchQuote(sym));
    const quotes = await Promise.all(promises);

    for (let i = 0; i < limitedSymbols.length; i++) {
      const q = quotes[i];
      if (q && q.price > 0) {
        results[limitedSymbols[i]] = q;
      }
    }
  } catch (err) {
    console.error('Error fetching live quotes:', err);
  }

  const now = new Date();
  const istTimeStr = now.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return res.status(200).json({
    status: 'success',
    timestamp: istTimeStr,
    count: Object.keys(results).length,
    quotes: results
  });
}
