const TV_SYMBOL_MAP = {
  'NIFTY': 'NSE:NIFTY',
  'NIFTY 50': 'NSE:NIFTY',
  '^NSEI': 'NSE:NIFTY',
  'BANK NIFTY': 'NSE:BANKNIFTY',
  '^NSEBANK': 'NSE:BANKNIFTY',
  'SENSEX': 'BSE:SENSEX',
  '^BSESN': 'BSE:SENSEX',
  'NIFTY IT': 'NSE:CNXIT',
  '^CNXIT': 'NSE:CNXIT',
  'INDIA VIX': 'NSE:INDIAVIX',
  '^INDIAVIX': 'NSE:INDIAVIX',
  'M&M': 'BSE:M_M',
  'BAJAJ-AUTO': 'NSE:BAJAJ_AUTO',
  'TATAMOTORS': 'NSE:TMPV',
  'LTIM': 'NSE:LTM',
  'ZOMATO': 'NSE:ETERNAL'
};

const YAHOO_OVERRIDE_MAP = {
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

function toTvTicker(sym) {
  const clean = (sym || '').trim().toUpperCase();
  if (TV_SYMBOL_MAP[clean]) return TV_SYMBOL_MAP[clean];
  if (clean === 'GIFT NIFTY' || clean === '^GIFTNIFTY' || clean === 'GIFT') return 'NSEIX:NIFTY1!';
  if (clean.startsWith('^') || clean.includes(':')) return null;
  return NSE:;
}

function toYahooTicker(sym) {
  const clean = (sym || '').trim().toUpperCase();
  if (YAHOO_OVERRIDE_MAP[clean]) return YAHOO_OVERRIDE_MAP[clean];
  if (clean.startsWith('^') || clean.endsWith('.NS') || clean.endsWith('.BO')) return clean;
  return ${clean}.NS;
}

// 1. Fetch GIFT NIFTY directly from TradingView Futures Scanner
async function fetchGiftNifty() {
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
        company_name: 'GIFT Nifty 50 Index Futures',
        source: 'TradingView (NSEIX:NIFTY1!)',
        url: 'https://in.tradingview.com/symbols/NSEIX-NIFTY1!/'
      };
    } catch (e) {
      // try next
    }
  }
  return null;
}

// 2. Fetch Single Quote Fallback from Yahoo Finance
async function fetchYahooFallback(symbol) {
  const ticker = toYahooTicker(symbol);
  try {
    const url = https://query1.finance.yahoo.com/v8/finance/chart/?interval=5m&range=1d;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
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

  // Up to 120 symbols per request
  const targetSymbols = symList.slice(0, 120);
  const results = {};
  const needsGift = targetSymbols.some(s => s === 'GIFT NIFTY' || s === '^GIFTNIFTY' || s === 'GIFT');

  // Build TradingView Tickers
  const tvMap = {};
  targetSymbols.forEach(sym => {
    if (sym === 'GIFT NIFTY' || sym === '^GIFTNIFTY' || sym === 'GIFT') return;
    const tvTicker = toTvTicker(sym);
    if (tvTicker) {
      tvMap[tvTicker] = sym;
    }
  });

  const tvTickers = Object.keys(tvMap);
  const tasks = [];

  // Parallel 1: TradingView India Scanner Batch
  if (tvTickers.length > 0) {
    tasks.push(
      fetch('https://scanner.tradingview.com/india/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        body: JSON.stringify({
          symbols: { tickers: tvTickers, query: { types: [] } },
          columns: ['close', 'change', 'change_abs', 'open', 'high', 'low', 'volume', 'description']
        })
      })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        const rows = json?.data || [];
        rows.forEach(item => {
          const originalSym = tvMap[item.s];
          const d = item.d;
          if (originalSym && d && d[0] !== null && d[0] !== undefined) {
            const close = Math.round(Number(d[0]) * 100) / 100;
            const changePct = Math.round(Number(d[1]) * 100) / 100;
            const changeAbs = Math.round(Number(d[2]) * 100) / 100;
            const open = d[3] !== null ? Math.round(Number(d[3]) * 100) / 100 : close;
            const high = d[4] !== null ? Math.round(Number(d[4]) * 100) / 100 : close;
            const low = d[5] !== null ? Math.round(Number(d[5]) * 100) / 100 : close;
            const volume = Number(d[6]) || 0;
            const prevClose = Math.round((close - changeAbs) * 100) / 100;
            const desc = d[7] || '';

            results[originalSym] = {
              symbol: originalSym,
              ticker: item.s,
              price: close,
              prev_close: prevClose,
              change: changeAbs,
              change_pct: changePct,
              day_high: high,
              day_low: low,
              day_open: open,
              volume: volume,
              company_name: desc,
              is_positive: changeAbs >= 0,
              source: 'TradingView Real-Time'
            };
          }
        });
      })
      .catch(e => console.warn('[TVIndiaScan] Error:', e.message))
    );
  }

  // Parallel 2: GIFT NIFTY
  if (needsGift) {
    tasks.push(
      fetchGiftNifty().then(q => {
        if (q) {
          results['GIFT NIFTY'] = q;
          results['^GIFTNIFTY'] = q;
        }
      })
    );
  }

  await Promise.all(tasks);

  // Missing symbols fallback to Yahoo Finance
  const missing = targetSymbols.filter(s => !results[s] && s !== '^GIFTNIFTY');
  if (missing.length > 0 && missing.length <= 15) {
    const fallbackTasks = missing.map(s => fetchYahooFallback(s));
    const fbResults = await Promise.all(fallbackTasks);
    fbResults.forEach(q => {
      if (q && q.price > 0) results[q.symbol] = q;
    });
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
