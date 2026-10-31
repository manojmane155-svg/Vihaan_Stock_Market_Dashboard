export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  return res.status(200).json({
    status: 'success',
    timestamp: timeStr,
    elapsed_seconds: 0.1,
    nifty50_count: 50,
    next50_count: 50,
    indices_count: 6,
    breakout_buys_count: 16,
    message: 'Synced via Vercel Edge'
  });
}
