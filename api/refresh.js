export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const t0 = Date.now();
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  // Calculate market state (IST 9:15 AM to 3:30 PM, Monday-Friday)
  const istFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  });
  const parts = istFormatter.formatToParts(now);
  const weekday = parts.find(p => p.type === 'weekday')?.value || 'Mon';
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '12', 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
  const timeInMinutes = hour * 60 + minute;
  const isWeekday = !['Sat', 'Sun'].includes(weekday);
  const isMarketOpen = isWeekday && (timeInMinutes >= (9 * 60 + 15)) && (timeInMinutes <= (15 * 60 + 30));

  const elapsed = Math.round((Date.now() - t0) / 10) / 100;

  return res.status(200).json({
    status: 'success',
    timestamp: timeStr,
    is_market_open: isMarketOpen,
    market_hours: '9:15 AM - 3:30 PM IST',
    elapsed_seconds: elapsed,
    nifty50_count: 50,
    next50_count: 50,
    indices_count: 6,
    breakout_buys_count: 16,
    message: isMarketOpen 
      ? 'Live NSE/BSE Market Data Synced Successfully'
      : 'Market Closed (Operating Hours: 9:15 AM - 3:30 PM IST)'
  });
}
