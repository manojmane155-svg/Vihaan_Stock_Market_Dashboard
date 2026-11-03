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
  if (clean === 'GIFT NIFTY' || clean === '^GIFTNIFTY' || clean === 'GIFT') return '^GIFTNIFTY';
  if (clean.startsWith('^')) return clean;
  if (clean.endsWith('.NS') || clean.endsWith('.BO')) return clean;
  return `${clean}.NS`;
}

async function fetchQuote(symbol) {
  const clean = (symbol || '').trim().toUpperCase();
  if (clean === 'GIFT NIFTY' || clean === '^GIFTNIFTY' || clean === 'GIFT') {
    const endpoints = [
      'https://scanner.tradingview.com/futures/scan',
      'https://scanner.tradingview.com/global/scan'
    ];
    const payload = JSON.stringify({
      symbols: { tickers: ['NSEIX:NIFTY1!'], query: { types: [] } },
      columns: ['close', 'change', 'change_abs', 'open', 'high', 'low', 'volume', 'description']
    });

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, {
          method: 'POST',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Content-Type': 'application/json'
          },
          body: payload
        });
        if (!res.ok) continue;
        const json = await res.json();
        const row = json?.data?.[0]?.d;
        if (!row || row[0] === null || row[0] === undefined) continue;

        const close = Math.round(Number(row[0]) * 100) / 100;
        const changePct = Math.round(Number(row[1]) * 100) / 100;
        const changeAbs = Math.round(Number(row[2]) * 100) / 100;
        const open = Math.round(Number(row[3]) * 100) / 100;
        const high = Math.round(Number(row[4]) * 100) / 100;
        const low = Math.round(Number(row[5]) * 100) / 100;
        const volume = Number(row[6]) || 0;
        const prevClose = Math.round((close - changeAbs) * 100) / 100;

        return {
          symbol: 'GIFT NIFTY',
          ticker: '^GIFTNIFTY',
          tv_symbol: 'NSEIX:NIFTY1!',
          price: close,
          prev_close: prevClose,
          change: changeAbs,
          change_pct: changePct,
          day_high: high,
          day_low: low,
          day_open: open,
          volume: volume,
          is_positive: changeAbs >= 0,
          is_gift: true,
          source: 'TradingView (NSEIX:NIFTY1!)',
          url: 'https://in.tradingview.com/symbols/NSEIX-NIFTY1!/'
        };
      } catch (err) {
        // try next endpoint
      }
    }
    return null;
  }

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

  // Cap to 60 symbols per request to ensure fast parallel execution
  const limitedSymbols = symList.slice(0, 60);
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
