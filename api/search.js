export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { q = '' } = req.query;
  const query = (q || '').trim();
  if (!query) {
    return res.status(200).json({ status: 'success', query: '', results: [] });
  }

  try {
    const searchUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`;
    const response = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    if (!response.ok) {
      throw new Error(`Search API returned ${response.status}`);
    }

    const data = await response.json();
    const rawQuotes = data?.quotes || [];
    const results = [];
    const seen = new Set();

    for (const item of rawQuotes) {
      const sym = item.symbol || '';
      const exch = item.exchange || '';
      if (sym.endsWith('.NS') || sym.endsWith('.BO') || exch === 'NSI' || exch === 'BSE') {
        const cleanSym = sym.replace('.NS', '').replace('.BO', '');
        if (seen.has(cleanSym)) continue;
        seen.add(cleanSym);

        const name = item.longname || item.shortname || cleanSym;
        const exchange = (sym.endsWith('.BO') || exch === 'BSE') ? 'BSE' : 'NSE';

        let price = 0;
        let change = 0;
        let changePct = 0;
        try {
          const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=5m&range=1d`;
          const chartRes = await fetch(chartUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          if (chartRes.ok) {
            const chartData = await chartRes.json();
            const meta = chartData?.chart?.result?.[0]?.meta;
            if (meta) {
              price = meta.regularMarketPrice || 0;
              const prev = meta.chartPreviousClose || price;
              change = Math.round((price - prev) * 100) / 100;
              changePct = prev ? Math.round(((price - prev) / prev) * 10000) / 100 : 0;
            }
          }
        } catch (e) {}

        results.push({
          symbol: cleanSym,
          name: name,
          price: price,
          change: change,
          change_pct: changePct,
          exchange: exchange,
          source: 'Angel One / NSE Live'
        });
      }
    }

    return res.status(200).json({
      status: 'success',
      query: query,
      results: results
    });
  } catch (err) {
    return res.status(200).json({
      status: 'error',
      query: query,
      message: err.message,
      results: []
    });
  }
}