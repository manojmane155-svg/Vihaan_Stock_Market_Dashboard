import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

syms = [
    'HDFCBANK.NS', 'RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'BAJAJFINSV.NS',
    'NESTLEIND.NS', 'DMART.NS', 'ICICIPRULI.NS', 'TMCV.NS', 'LTM.NS',
    'ETERNAL.NS', 'SBIN.NS', 'ITC.NS', 'KOTAKBANK.NS', 'LT.NS'
]

url = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=' + ','.join(syms)
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})

try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode())
        results = data.get('quoteResponse', {}).get('result', [])
        print(f"Bulk quote success! Received {len(results)} of {len(syms)} stocks:\n")
        for item in results:
            sym = item.get('symbol')
            p = item.get('regularMarketPrice')
            chg = item.get('regularMarketChangePercent', 0)
            h52 = item.get('fiftyTwoWeekHigh')
            l52 = item.get('fiftyTwoWeekLow')
            pe = item.get('trailingPE')
            print(f"  {sym:15} | Price: ₹{p} | Chg: {chg:.2f}% | 52H: ₹{h52} | 52L: ₹{l52} | PE: {pe}")
except Exception as e:
    print("Bulk quote error:", e)
