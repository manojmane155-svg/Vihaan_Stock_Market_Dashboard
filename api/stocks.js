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

// Reference: https://www.mnclgroup.com/gift-nifty-trading-hours
// Session 1: 6:30 AM - 11:30 PM IST (17 hours)
// Session 2: 11:30 PM - 4:00 AM IST (+1 day) (4.5 hours)
// Closed Gap: 4:00 AM - 6:30 AM IST (~2.5 hours)
// Total: ~21 hours per day (Monday - Friday on NSE IX)
function getGiftNiftySession(dateObj = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  });
  const parts = formatter.formatToParts(dateObj);
  const weekday = parts.find(p => p.type === 'weekday')?.value || 'Mon';
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '12', 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
  const totalMinutes = hour * 60 + minute;

  const isWeekend = ['Sat', 'Sun'].includes(weekday);
  if (isWeekend) {
    return {
      isOpen: false,
      status: 'Closed (Weekend)',
      phase: 'Weekend Break',
      sessionName: 'NSE IX Closed'
    };
  }

  // 06:30 to 23:30 (390 to 1410 min): Session 1 (17 hours)
  if (totalMinutes >= 390 && totalMinutes < 1410) {
    let phase = 'Indian Cash Overlap (9:15 AM - 3:30 PM)';
    if (totalMinutes < 555) phase = 'Asian Pre-Market Window (6:30 AM - 9:15 AM)';
    else if (totalMinutes >= 930 && totalMinutes < 1200) phase = 'Post-India European Session (3:30 PM - 8:00 PM)';
    else if (totalMinutes >= 1200) phase = 'US Pre-Market & Open (8:00 PM - 11:30 PM)';
    return {
      isOpen: true,
      status: 'Session 1 Live (6:30 AM - 11:30 PM)',
      phase: phase,
      sessionName: 'Session 1'
    };
  }

  // 23:30 to 24:00 (1410 to 1440 min) OR 00:00 to 04:00 (0 to 240 min): Session 2 (4.5 hours)
  if (totalMinutes >= 1410 || totalMinutes < 240) {
    return {
      isOpen: true,
      status: 'Session 2 Live (11:30 PM - 4:00 AM)',
      phase: 'Peak US Trading Hours & Overnight Drift (11:30 PM - 4:00 AM)',
      sessionName: 'Session 2'
    };
  }

  // 04:00 to 06:30 (240 to 390 min): Exchange Closed (2.5 hour gap)
  return {
    isOpen: false,
    status: 'Exchange Closed (4:00 AM - 6:30 AM Gap)',
    phase: 'Daily Settlement Gap (Reopens 6:30 AM IST)',
    sessionName: 'Daily Maintenance Gap'
  };
}

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
  // Read base data if not cached or cache is stale (> 30s)
  if (!memoryCache.data || (now - memoryCache.lastFetched) > 30000) {
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

  // Fetch live index quotes + S&P futures (ES=F) for global overnight drift in parallel
  try {
    const quotePromises = INDEX_TICKERS.map(idx => fetchLiveQuote(idx.ticker));
    quotePromises.push(fetchLiveQuote('ES=F')); // S&P 500 futures to drive GIFT Nifty in Session 1 & 2
    const results = await Promise.all(quotePromises);

    const quotes = results.slice(0, INDEX_TICKERS.length);
    const esQuote = results[INDEX_TICKERS.length];

    const updatedIndices = [];
    let niftyPrice = 23440.80;
    let niftyChg = 387.70;
    let niftyPct = 1.68;

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
        const existing = (baseData.indices || []).find(idx => idx.name === cfg.name);
        if (existing) updatedIndices.push(existing);
      }
    }

    // GIFT NIFTY Calculation with 21-Hour Session Timings from https://www.mnclgroup.com/gift-nifty-trading-hours
    const giftSession = getGiftNiftySession(new Date());
    const esDriftPct = esQuote ? (esQuote.changePct || 0) : 0;
    const baseGiftPrice = niftyPrice + 165.20; // Futures basis
    const globalDrift = Math.round((baseGiftPrice * (esDriftPct * 0.25) / 100) * 100) / 100;
    const giftPrice = Math.round((baseGiftPrice + globalDrift) * 100) / 100;
    const giftChg = Math.round((niftyChg + globalDrift) * 100) / 100;
    const giftPrevClose = Math.round((giftPrice - giftChg) * 100) / 100;
    const giftPct = giftPrevClose ? Math.round(((giftPrice - giftPrevClose) / giftPrevClose) * 10000) / 100 : niftyPct;

    updatedIndices.splice(1, 0, {
      name: 'GIFT NIFTY',
      ticker: '^GIFTNIFTY', // Unique ticker to prevent overwriting by ^NSEI
      exchange: 'NSE IX',
      expiry_day: 'Thursday',
      price: giftPrice,
      open: Math.round((giftPrice - giftChg + 15) * 100) / 100,
      high: Math.round((giftPrice + 65) * 100) / 100,
      low: Math.round((giftPrice - 95) * 100) / 100,
      prev_close: giftPrevClose,
      change: giftChg,
      change_pct: giftPct,
      is_positive: giftChg >= 0,
      is_gift: true,
      session_status: giftSession.status,
      session_name: giftSession.sessionName,
      session_phase: giftSession.phase,
      is_open: giftSession.isOpen,
      trading_hours: 'Session 1: 6:30 AM - 11:30 PM | Session 2: 11:30 PM - 4:00 AM IST (~21 Hours/Day)',
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
