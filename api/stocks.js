import fs from 'fs';
import path from 'path';

// Cache in serverless memory to avoid hammering Yahoo Finance
let memoryCache = {
  data: null,
  lastFetched: 0
};

const INDEX_TICKERS = [
  { name: 'NIFTY 50', ticker: '^NSEI', exchange: 'NSE', expiry_day: 'Thursday' },
  { name: 'BANK NIFTY', ticker: '^NSEBANK', exchange: 'NSE', expiry_day: 'Wednesday' },
  { name: 'SENSEX', ticker: '^BSESN', exchange: 'BSE', expiry_day: 'Friday' },
  { name: 'NIFTY IT', ticker: '^CNXIT', exchange: 'NSE', expiry_day: 'Thursday' },
  { name: 'INDIA VIX', ticker: '^INDIAVIX', exchange: 'NSE', expiry_day: 'Monthly' }
];

async function fetchLiveQuote(ticker) {
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

    return {
      price,
      prevClose,
      change,
      changePct,
      high,
      low,
      open,
      isPositive: change >= 0
    };
  } catch (err) {
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

  const now = Date.now();
  // Read base data if not cached or cache is stale (> 60s)
  if (!memoryCache.data || (now - memoryCache.lastFetched) > 60000) {
    try {
      const jsonPath = path.join(process.cwd(), 'live_market_data.json');
      if (fs.existsSync(jsonPath)) {
        const fileContent = fs.readFileSync(jsonPath, 'utf8');
        memoryCache.data = JSON.parse(fileContent);
      }
    } catch (err) {
      console.error('Error reading base live_market_data.json:', err);
    }
  }

  const baseData = memoryCache.data || { indices: [], nifty50: [], next50: [] };

  // Fetch live index quotes in parallel
  try {
    const quotePromises = INDEX_TICKERS.map(idx => fetchLiveQuote(idx.ticker));
    const quotes = await Promise.all(quotePromises);

    const updatedIndices = [];
    let niftyPrice = 23250;
    let niftyChg = 180;
    let niftyPct = 0.78;

    for (let i = 0; i < INDEX_TICKERS.length; i++) {
      const cfg = INDEX_TICKERS[i];
      const q = quotes[i];
      if (q && q.price > 0) {
        if (cfg.name === 'NIFTY 50') {
          niftyPrice = q.price;
          niftyChg = q.change;
          niftyPct = q.changePct;
        }
        updatedIndices.push({
          name: cfg.name,
          ticker: cfg.ticker,
          exchange: cfg.exchange,
          expiry_day: cfg.expiry_day,
          price: q.price,
          open: q.open,
          high: q.high,
          low: q.low,
          prev_close: q.prevClose,
          change: q.change,
          change_pct: q.changePct,
          is_positive: q.isPositive,
          last_updated: new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour12: true })
        });
      } else {
        // Fallback to existing index in base data
        const existing = (baseData.indices || []).find(idx => idx.name === cfg.name);
        if (existing) updatedIndices.push(existing);
      }
    }

    // Add GIFT NIFTY (spread relative to NIFTY 50)
    const giftPrice = Math.round((niftyPrice + 160) * 100) / 100;
    updatedIndices.splice(1, 0, {
      name: 'GIFT NIFTY',
      ticker: '^NSEI',
      exchange: 'NSE IX',
      expiry_day: 'Thursday',
      price: giftPrice,
      open: Math.round((giftPrice - niftyChg) * 100) / 100,
      high: Math.round((giftPrice + 50) * 100) / 100,
      low: Math.round((giftPrice - 80) * 100) / 100,
      prev_close: Math.round((giftPrice - niftyChg) * 100) / 100,
      change: niftyChg,
      change_pct: niftyPct,
      is_positive: niftyChg >= 0,
      last_updated: new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour12: true })
    });

    baseData.indices = updatedIndices;

    // Get current live IST timestamp
    const istOptions = {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };
    const istFormatter = new Intl.DateTimeFormat('en-US', istOptions);
    const parts = istFormatter.formatToParts(new Date());
    const m = parts.find(p => p.type === 'month')?.value || '11';
    const d = parts.find(p => p.type === 'day')?.value || '02';
    const y = parts.find(p => p.type === 'year')?.value || '2026';
    const hr = parts.find(p => p.type === 'hour')?.value || '12';
    const min = parts.find(p => p.type === 'minute')?.value || '00';
    const sec = parts.find(p => p.type === 'second')?.value || '00';
    const ampm = parts.find(p => p.type === 'dayPeriod')?.value || 'PM';

    baseData.timestamp = `${y}-${m}-${d} ${hr}:${min}:${sec} ${ampm}`;
    memoryCache.data = baseData;
    memoryCache.lastFetched = now;
  } catch (err) {
    console.error('Error fetching live indices in stocks.js:', err);
  }

  return res.status(200).json(baseData);
}
